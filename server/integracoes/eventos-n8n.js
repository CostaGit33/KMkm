import crypto from 'node:crypto';
import { pool } from '../db/database.js';

const INTERVALO_MS = 5000;
const LOTE = 10;
const MAX_TENTATIVAS = 12;
let timer = null;
let executando = false;

export function webhookConfigurado(env = process.env) {
  const destino = String(env.N8N_EVENTS_WEBHOOK_URL || '').trim();
  const segredo = String(env.N8N_EVENTS_SECRET || '');
  if (segredo.length < 32) return false;
  try {
    return new URL(destino).protocol === 'https:';
  } catch {
    return false;
  }
}

export function atrasoRetry(tentativa) {
  const n = Math.max(1, Math.min(12, Number(tentativa) || 1));
  return Math.min(3600, 5 * (2 ** (n - 1)));
}

// Insere na mesma transação da operação de negócio: se a gravação do evento falhar, a operação também
// é revertida. Isso evita perder notificações entre o commit do carimbo/cadastro e a publicação no n8n.
export async function registrarEventoNaTransacao(connection, tipo, dados = {}) {
  if (!/^[a-z0-9_.-]{3,80}$/.test(String(tipo))) throw new Error('tipo_evento_invalido');
  const payload = JSON.stringify(dados);
  if (Buffer.byteLength(payload, 'utf8') > 8192) throw new Error('payload_grande');
  const eventoId = crypto.randomUUID();
  await connection.query(
    'INSERT INTO integracao_eventos (evento_id, tipo, payload) VALUES (?, ?, ?)',
    [eventoId, tipo, payload],
  );
  return eventoId;
}

// Para testes operacionais manuais fora de uma transação de negócio.
export async function registrarEvento(tipo, dados = {}) {
  try {
    return await registrarEventoNaTransacao(pool, tipo, dados);
  } catch (error) {
    console.error(JSON.stringify({
      type: 'integration_event_enqueue_failed',
      event_type: String(tipo).slice(0, 80),
      error: error?.message === 'payload_grande' ? 'payload_grande' : 'falha_ao_gravar_outbox',
    }));
    return null;
  }
}

async function reivindicarLote() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, evento_id, tipo, payload, tentativas
       FROM integracao_eventos
       WHERE (status = 'pendente' AND disponivel_em <= UTC_TIMESTAMP())
          OR (status = 'processando' AND bloqueado_ate <= UTC_TIMESTAMP())
       ORDER BY id ASC
       LIMIT ?
       FOR UPDATE`,
      [LOTE],
    );
    for (const row of rows) {
      await connection.query(
        `UPDATE integracao_eventos
         SET status = 'processando', tentativas = tentativas + 1,
             bloqueado_ate = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 60 SECOND)
         WHERE id = ?`,
        [row.id],
      );
      row.tentativas = Number(row.tentativas) + 1;
    }
    await connection.commit();
    return rows;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function concluir(row) {
  await pool.query(
    `UPDATE integracao_eventos
     SET status = 'enviado', enviado_em = UTC_TIMESTAMP(),
         bloqueado_ate = NULL, ultimo_erro = NULL
     WHERE id = ?`,
    [row.id],
  );
}

async function reagendar(row, motivo) {
  const esgotado = Number(row.tentativas) >= MAX_TENTATIVAS;
  const espera = atrasoRetry(row.tentativas);
  await pool.query(
    `UPDATE integracao_eventos
     SET status = ?, disponivel_em = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND),
         bloqueado_ate = NULL, ultimo_erro = ?
     WHERE id = ?`,
    [esgotado ? 'falhou' : 'pendente', espera, motivo, row.id],
  );
  if (esgotado) {
    console.error(JSON.stringify({
      type: 'integration_event_dead',
      event_id: row.evento_id,
      event_type: row.tipo,
      attempts: row.tentativas,
      reason: motivo,
    }));
  }
}

async function entregar(row, env) {
  let payload;
  try {
    payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  } catch {
    await reagendar(row, 'payload_invalido');
    return;
  }
  const envelope = {
    id: row.evento_id,
    type: row.tipo,
    occurred_at: new Date().toISOString(),
    source: 'mais1km-api',
    data: payload || {},
  };
  try {
    const response = await fetch(String(env.N8N_EVENTS_WEBHOOK_URL).trim(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Mais1km-Secret': String(env.N8N_EVENTS_SECRET),
        'X-Event-Id': row.evento_id,
      },
      body: JSON.stringify(envelope),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      await reagendar(row, `http_${response.status}`);
      return;
    }
    await concluir(row);
  } catch (error) {
    const motivo = error?.name === 'TimeoutError' ? 'timeout' : 'falha_de_conexao';
    await reagendar(row, motivo);
  }
}

async function processarFila(env) {
  if (executando || !webhookConfigurado(env)) return;
  executando = true;
  try {
    const lote = await reivindicarLote();
    for (const row of lote) await entregar(row, env);
  } catch (error) {
    console.error(JSON.stringify({
      type: 'integration_event_worker_failed',
      error: error?.message || 'falha_worker',
    }));
  } finally {
    executando = false;
  }
}

export function iniciarEntregaEventos(env = process.env) {
  if (!webhookConfigurado(env)) {
    if (env.N8N_EVENTS_WEBHOOK_URL || env.N8N_EVENTS_SECRET) {
      console.error(JSON.stringify({
        type: 'integration_event_worker',
        status: 'configuracao_invalida',
        required: ['N8N_EVENTS_WEBHOOK_URL=https://...', 'N8N_EVENTS_SECRET com pelo menos 32 caracteres'],
      }));
    }
    return false;
  }
  if (timer) return true;
  console.log(JSON.stringify({ type: 'integration_event_worker', status: 'ligado' }));
  void processarFila(env);
  timer = setInterval(() => { void processarFila(env); }, INTERVALO_MS);
  timer.unref?.();
  return true;
}
