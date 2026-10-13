// Cadastro de eventos e patrocínios (enquanto não existe tela administrativa).
// Uso: node scripts/evento.js <criar|publicar|cancelar|listar|relatorio> [opções]
//   criar --slug show-praca --nome "Show na Praça" --tipo evento|patrocinio --inicio "2026-11-01 08:00" --fim "2026-11-30 23:59"
//         --tags eu-001,eu-002 [--patrocinador "Café X"] [--descricao "..."] [--publicar]
// Datas em hora local da Bahia (APP_TZ); o banco guarda UTC.
import 'dotenv/config';
import { pool, q } from '../db/database.js';
import { initializeDatabase } from '../db/init.js';
import { instanteLocal } from '../time.js';
import { MAX_PONTOS_PATROCINIO, MIN_PONTOS_PATROCINIO, TIPOS, conflitosDeJanela, relatorioAgregado } from '../eventos.js';

const FUSO = process.env.APP_TZ || 'America/Bahia';
const [, , comando, ...resto] = process.argv;

function opcoes(lista) {
  const o = { _: [] };
  for (let i = 0; i < lista.length; i += 1) {
    if (lista[i].startsWith('--')) {
      const chave = lista[i].slice(2);
      const proximo = lista[i + 1];
      if (proximo === undefined || proximo.startsWith('--')) o[chave] = true; else { o[chave] = proximo; i += 1; }
    } else o._.push(lista[i]);
  }
  return o;
}
const falha = (msg) => { throw Object.assign(new Error(msg), { esperado: true }); };
const quando = (d) => (d ? new Date(d).toLocaleString('pt-BR', { timeZone: FUSO }) : '-');

async function validarConflitos(tagIds, inicio, fim, ignorarId = 0) {
  const conflitos = await conflitosDeJanela(tagIds, inicio, fim, ignorarId);
  if (conflitos.length) falha(`Já existe outro card nesses pontos e período: ${conflitos.map((c) => `${c.slug} (${c.codigo})`).join(', ')}. Cada ponto só pode ter um card por vez.`);
}

async function criar(o) {
  const slug = String(o.slug || '');
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(slug)) falha('--slug obrigatório: 3 a 80 caracteres, minúsculas, números e hífen.');
  const nome = String(o.nome || '').trim();
  if (nome.length < 3 || nome.length > 160) falha('--nome obrigatório (3 a 160 caracteres).');
  const tipo = String(o.tipo || 'evento');
  if (!TIPOS.includes(tipo)) falha(`--tipo deve ser ${TIPOS.join(' ou ')}.`);
  const inicio = instanteLocal(o.inicio, FUSO);
  const fim = instanteLocal(o.fim, FUSO);
  if (!inicio || !fim) falha('--inicio e --fim no formato "AAAA-MM-DD HH:MM" (hora de Bahia).');
  if (fim <= inicio) falha('--fim precisa ser depois de --inicio.');
  const codigos = String(o.tags || '').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
  if (new Set(codigos).size !== codigos.length) falha('--tags tem código repetido.');
  if (!codigos.length) falha('--tags obrigatório (códigos separados por vírgula).');
  if (tipo === 'patrocinio') {
    if (codigos.length < MIN_PONTOS_PATROCINIO || codigos.length > MAX_PONTOS_PATROCINIO) falha(`Patrocínio compra de ${MIN_PONTOS_PATROCINIO} a ${MAX_PONTOS_PATROCINIO} pontos (recebeu ${codigos.length}).`);
    if (!String(o.patrocinador || '').trim()) falha('Patrocínio exige --patrocinador (o card diz "Patrocinado por ...").');
  } else if (o.patrocinador) falha('--patrocinador só vale para --tipo patrocinio.');
  const tags = await q(`SELECT t.id, t.codigo, t.status, r.status AS rota_status FROM tags t JOIN rotas r ON r.id = t.rota_id WHERE t.codigo IN (${codigos.map(() => '?').join(', ')})`, codigos);
  const faltando = codigos.filter((c) => !tags.some((t) => t.codigo === c));
  if (faltando.length) falha(`Tag inexistente: ${faltando.join(', ')}.`);
  const fechadas = tags.filter((t) => t.status !== 'publicado' || t.rota_status !== 'publicado').map((t) => t.codigo);
  if (fechadas.length) falha(`Ponto ainda não publicado (não recebe carimbo): ${fechadas.join(', ')}.`);
  await validarConflitos(tags.map((t) => t.id), inicio, fim);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let patrocinadorId = null;
    if (tipo === 'patrocinio') {
      const nomePatro = String(o.patrocinador).trim().slice(0, 120);
      await connection.query('INSERT IGNORE INTO patrocinadores (nome) VALUES (?)', [nomePatro]);
      [[{ id: patrocinadorId }]] = await connection.query('SELECT id FROM patrocinadores WHERE nome = ?', [nomePatro]);
    }
    const [r] = await connection.query(
      'INSERT INTO eventos (slug, nome, tipo, descricao, patrocinador_id, inicio_em, fim_em, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [slug, nome, tipo, o.descricao ? String(o.descricao).slice(0, 400) : null, patrocinadorId, inicio, fim, o.publicar ? 'publicado' : 'rascunho'],
    );
    for (const t of tags) await connection.query('INSERT INTO evento_tags (evento_id, tag_id) VALUES (?, ?)', [r.insertId, t.id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') falha(`Já existe um card com o slug "${slug}".`);
    throw error;
  } finally { connection.release(); }
  console.log(`Card "${slug}" criado como ${o.publicar ? 'publicado' : 'rascunho'}: ${quando(inicio)} até ${quando(fim)} (${codigos.length} pontos).`);
}

async function mudarStatus(slug, status) {
  const [card] = await q('SELECT * FROM eventos WHERE slug = ?', [slug]);
  if (!card) falha(`Card "${slug}" não existe.`);
  if (status === 'publicado') {
    const ligadas = await q('SELECT tag_id FROM evento_tags WHERE evento_id = ?', [card.id]);
    await validarConflitos(ligadas.map((t) => t.tag_id), card.inicio_em, card.fim_em, card.id);
  }
  await q('UPDATE eventos SET status = ? WHERE id = ?', [status, card.id]);
  console.log(`Card "${slug}" agora está ${status}. Carimbos já dados continuam guardados.`);
}

async function listar() {
  const linhas = await q(`SELECT e.slug, e.tipo, e.status, e.inicio_em, e.fim_em, p.nome AS patrocinador,
    (SELECT COUNT(*) FROM evento_tags WHERE evento_id = e.id) AS pontos, (SELECT COUNT(*) FROM carimbos WHERE evento_id = e.id) AS carimbos
    FROM eventos e LEFT JOIN patrocinadores p ON p.id = e.patrocinador_id ORDER BY e.inicio_em DESC`);
  if (!linhas.length) return console.log('Nenhum card cadastrado.');
  for (const l of linhas) console.log(`${l.slug} · ${l.tipo}${l.patrocinador ? ` (${l.patrocinador})` : ''} · ${l.status} · ${quando(l.inicio_em)} → ${quando(l.fim_em)} · ${l.pontos} pontos · ${l.carimbos} carimbos`);
}

try {
  await initializeDatabase(pool);
  const o = opcoes(resto);
  if (comando === 'criar') await criar(o);
  else if (comando === 'publicar') await mudarStatus(o._[0], 'publicado');
  else if (comando === 'cancelar') await mudarStatus(o._[0], 'cancelado');
  else if (comando === 'listar') await listar();
  else if (comando === 'relatorio') {
    const r = await relatorioAgregado(o._[0], FUSO);
    if (!r) falha(`Card "${o._[0]}" não existe.`);
    console.log(JSON.stringify(r, null, 2));
  } else console.log('Comandos: criar, publicar, cancelar, listar, relatorio <slug>. Veja o topo de scripts/evento.js.');
} catch (error) {
  if (error.esperado) { console.error(`Erro: ${error.message}`); process.exitCode = 1; } else throw error;
} finally { await pool.end(); }
