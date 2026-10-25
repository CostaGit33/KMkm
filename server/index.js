import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pool, q } from './db/database.js';
import { initializeDatabase } from './db/init.js';
import { inicioDoDiaLocal } from './time.js';
import { adminRouter, catalogoPublico } from './admin.js';
import { gamificacaoRouter } from './gamificacao.js';
import { cartaoAtivoNoPonto, cartoesDaCaderneta, emitirNumero, estadoDoCard } from './eventos.js';
import { albumDaPessoa } from './criaturas.js';
import { descarregarMonitoramento, iniciarMonitoramento, registrarErro } from './monitoramento.js';
import { clearSessionCookie, hashPassword, hashSessionToken, makeSalt, makeSessionToken, MAX_SESSOES_POR_CONTA, normalizeEmail, SESSION_COOKIE, sessionExpiry, setSessionCookie, validEmail, verificacaoFalsa, verifyPassword } from './security.js';
import { montarCsp } from './csp.js';
import { avaliarDeslocamento, avaliarLocalizacao, avaliarRitmo, chaveConfere, segredoDasChaves } from './tag-acesso.js';
import { recuperacaoSenhaRouter } from './recuperacao-senha.js';

const JANELA_REPETIDO_MIN = 30;
const JANELA_TURMA_MIN = 4;
const MIN_TURMA = 3;
const rateBuckets = new Map();

const app = express();
app.set('trust proxy', 1);
app.use((req, res, next) => {
  const requestId = String(req.headers['x-request-id'] || '').match(/^[a-zA-Z0-9._-]{8,100}$/)?.[0] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (req.path.startsWith('/api/')) console.log(JSON.stringify({ type: 'http_request', request_id: requestId, method: req.method, path: req.path, status: res.statusCode, duration_ms: Math.round(durationMs) }));
  });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.headers['x-forwarded-proto'] === 'https') res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('Content-Security-Policy', montarCsp({ legado: process.env.CSP_LEGADO === 'true', https: req.headers['x-forwarded-proto'] === 'https', frameAncestors: process.env.FRAME_ANCESTORS }));
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});
app.use(express.json());
// Proteção contra CSRF: pedidos que alteram dados só valem vindos do próprio site. Bloqueia quando o navegador
// declara origem de outro site (Sec-Fetch-Site) ou quando o cabeçalho Origin não é o host do app nem está em
// ORIGENS_PERMITIDAS (lista separada por vírgula, ex.: https://app.exemplo.com). Clientes que usam o cabeçalho
// Authorization (scripts, testes) não enviam cookie de sessão e seguem liberados.
const ORIGENS_PERMITIDAS = String(process.env.ORIGENS_PERMITIDAS || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
function origemPermitida(req) {
  const origem = String(req.headers.origin || '').toLowerCase();
  if (!origem || origem === 'null') return origem !== 'null';
  if (ORIGENS_PERMITIDAS.includes(origem)) return true;
  try {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
    return new URL(origem).host === host;
  } catch { return false; }
}
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (req.headers.authorization) return next();
  if (req.headers['sec-fetch-site'] === 'cross-site' || !origemPermitida(req)) return res.status(403).json({ erro: 'origem_nao_permitida' });
  next();
});

const wrap = (f) => (req, res, next) => Promise.resolve(f(req, res, next)).catch(next);

app.use('/api/conta', recuperacaoSenhaRouter);

app.get('/api/config-mapa', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ googleMapsKey: process.env.GOOGLE_MAPS_API_KEY || null, googleMapId: process.env.GOOGLE_MAP_ID || null });
});
app.get('/api/map-tiles/:z/:x/:y.png', limit({ windowMs: 60 * 1000, max: 120, name: 'map-tile' }), wrap(async (req, res) => {
  const z = Number(req.params.z);
  const x = Number(req.params.x);
  const y = Number(req.params.y);
  const max = 2 ** z;
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y) || z < 0 || z > 19 || x < 0 || y < 0 || x >= max || y >= max) {
    return res.status(400).json({ erro: 'tile_invalido' });
  }
  const upstream = await fetch(`https://tile.openstreetmap.de/${z}/${x}/${y}.png`, {
    headers: { 'user-agent': 'mais1km-map/1.0 (+1KM city map)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!upstream.ok) return res.status(upstream.status).end();
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(Buffer.from(await upstream.arrayBuffer()));
}));

function readCookie(req, name) {
  const source = String(req.headers.cookie || '');
  const item = source.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}

// `chave` (opcional) devolve um identificador extra (ex.: e-mail) para limitar também por alvo, não só por IP.
function limit({ windowMs, max, name, chave }) {
  return (req, res, next) => {
    const now = Date.now();
    const alvo = chave ? String(chave(req) || '') : '';
    const identity = `${name}:${alvo ? `k:${alvo}` : `ip:${req.ip || 'unknown'}`}`;
    const prior = rateBuckets.get(identity);
    const bucket = !prior || prior.expiresAt <= now ? { count: 0, expiresAt: now + windowMs } : prior;
    bucket.count += 1;
    rateBuckets.set(identity, bucket);
    if (rateBuckets.size > 4000) {
      for (const [key, value] of rateBuckets) if (value.expiresAt <= now) rateBuckets.delete(key);
    }
    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.expiresAt - now) / 1000)));
      return res.status(429).json({ erro: 'muitas_tentativas' });
    }
    next();
  };
}

const auth = wrap(async (req, res, next) => {
  const cookieToken = readCookie(req, SESSION_COOKIE);
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const sessionToken = cookieToken || bearer;
  const [sessao] = sessionToken ? await q(`SELECT s.id AS sessao_id, c.id AS conta_id, c.email, c.nome, c.papel, u.*
    FROM sessoes s JOIN contas c ON c.id = s.conta_id JOIN usuarios u ON u.id = c.usuario_id
    WHERE s.token_hash = ? AND s.expira_em > UTC_TIMESTAMP()`, [hashSessionToken(sessionToken)]) : [];
  if (sessao) {
    req.u = sessao;
    req.conta = { id: sessao.conta_id, email: sessao.email, nome: sessao.nome, papel: sessao.papel, sessaoId: sessao.sessao_id };
    return next();
  }
  const [usuario] = sessionToken ? await q('SELECT * FROM usuarios WHERE token = ?', [sessionToken]) : [];
  if (!usuario) return res.status(401).json({ erro: 'nao_autenticado' });
  req.u = usuario;
  next();
});

app.post('/api/conta/criar', limit({ windowMs: 10 * 60 * 1000, max: 8, name: 'conta-criar' }), wrap(async (req, res) => {
  const nome = String(req.body.nome || '').trim().slice(0, 80);
  const email = normalizeEmail(req.body.email);
  const senha = String(req.body.senha || '');
  if (nome.length < 2 || !validEmail(email) || senha.length < 8 || senha.length > 128) return res.status(400).json({ erro: 'dados_conta_invalidos' });
  if (senha.toLowerCase() === email) return res.status(400).json({ erro: 'senha_igual_ao_email' });
  const salt = makeSalt();
  const hash = hashPassword(senha, salt);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [usuarioResult] = await connection.query('INSERT INTO usuarios (apelido, token) VALUES (?, NULL)', [nome.slice(0, 30)]);
    const [contaResult] = await connection.query('INSERT INTO contas (usuario_id, nome, email, senha_hash, senha_salt) VALUES (?, ?, ?, ?, ?)', [usuarioResult.insertId, nome, email, hash, salt]);
    const token = makeSessionToken();
    await connection.query('INSERT INTO sessoes (conta_id, token_hash, expira_em) VALUES (?, ?, ?)', [contaResult.insertId, hashSessionToken(token), sessionExpiry()]);
    await connection.commit();
    setSessionCookie(res, token);
    return res.status(201).json({ usuario: { id: usuarioResult.insertId, conta_id: contaResult.insertId, nome, email } });
  } catch (error) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'email_ja_cadastrado' });
    throw error;
  } finally { connection.release(); }
}));

// Mantém só as sessões mais recentes da conta (as mais antigas saem), para uma conta esquecida em muitos
// aparelhos não acumular sessões válidas para sempre.
async function limitarSessoes(contaId) {
  await q('DELETE FROM sessoes WHERE conta_id = ? AND expira_em <= UTC_TIMESTAMP()', [contaId]);
  await q('DELETE FROM sessoes WHERE conta_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM sessoes WHERE conta_id = ? ORDER BY id DESC LIMIT ?) recentes)', [contaId, contaId, MAX_SESSOES_POR_CONTA]);
}

const emailDoCorpo = (req) => normalizeEmail(req.body?.email);
app.post('/api/conta/entrar',
  limit({ windowMs: 10 * 60 * 1000, max: 12, name: 'conta-entrar' }),
  limit({ windowMs: 15 * 60 * 1000, max: 8, name: 'conta-entrar-email', chave: emailDoCorpo }),
  wrap(async (req, res) => {
    const email = emailDoCorpo(req);
    const senha = String(req.body.senha || '').slice(0, 256);
    const [conta] = validEmail(email) ? await q('SELECT c.*, u.id AS usuario_id, u.apelido FROM contas c JOIN usuarios u ON u.id = c.usuario_id WHERE c.email = ?', [email]) : [];
    const confere = conta ? verifyPassword(senha, Buffer.from(conta.senha_hash), Buffer.from(conta.senha_salt)) : verificacaoFalsa(senha);
    if (!conta || !confere) return res.status(401).json({ erro: 'credenciais_invalidas' });
    const token = makeSessionToken();
    await q('INSERT INTO sessoes (conta_id, token_hash, expira_em) VALUES (?, ?, ?)', [conta.id, hashSessionToken(token), sessionExpiry()]);
    await limitarSessoes(conta.id);
    setSessionCookie(res, token);
    res.json({ usuario: { id: conta.usuario_id, conta_id: conta.id, nome: conta.nome, email: conta.email } });
  }));

app.get('/api/conta/sessao', auth, (req, res) => {
  if (!req.conta) return res.status(401).json({ erro: 'sessao_conta_necessaria' });
  res.json({ usuario: { id: req.u.id, conta_id: req.conta.id, nome: req.conta.nome, email: req.conta.email, admin: req.conta.papel === 'admin' } });
});

// Trocar e-mail ou senha exige a senha atual: uma sessão roubada (aparelho emprestado, cookie vazado) não basta
// para assumir a conta. Depois da troca, as outras sessões são encerradas e só a atual continua.
app.put('/api/conta', limit({ windowMs: 10 * 60 * 1000, max: 12, name: 'conta-editar' }), auth, wrap(async (req, res) => {
  if (!req.conta) return res.status(401).json({ erro: 'sessao_conta_necessaria' });
  const nome = String(req.body.nome || '').trim().slice(0, 80);
  const email = normalizeEmail(req.body.email);
  if (nome.length < 2 || !validEmail(email)) return res.status(400).json({ erro: 'dados_conta_invalidos' });
  const [conta] = await q('SELECT * FROM contas WHERE id = ?', [req.conta.id]);
  if (!conta) return res.status(404).json({ erro: 'conta_inexistente' });
  const senhaNova = String(req.body.senhaNova || '');
  const trocaEmail = email !== conta.email;
  if (trocaEmail || senhaNova) {
    const senhaAtual = String(req.body.senhaAtual || '').slice(0, 256);
    if (!senhaAtual || !verifyPassword(senhaAtual, Buffer.from(conta.senha_hash), Buffer.from(conta.senha_salt))) return res.status(403).json({ erro: 'senha_atual_invalida' });
  }
  let sql = 'UPDATE contas SET nome = ?, email = ?';
  const params = [nome, email];
  if (senhaNova) {
    if (senhaNova.length < 8 || senhaNova.length > 128) return res.status(400).json({ erro: 'dados_conta_invalidos' });
    if (senhaNova.toLowerCase() === email) return res.status(400).json({ erro: 'senha_igual_ao_email' });
    const salt = makeSalt();
    sql += ', senha_hash = ?, senha_salt = ?';
    params.push(hashPassword(senhaNova, salt), salt);
  }
  params.push(req.conta.id);
  try {
    await q(`${sql} WHERE id = ?`, params);
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'email_ja_cadastrado' });
    throw error;
  }
  if (trocaEmail || senhaNova) await q('DELETE FROM sessoes WHERE conta_id = ? AND id <> ?', [req.conta.id, req.conta.sessaoId ?? 0]);
  res.json({ usuario: { id: req.u.id, conta_id: req.conta.id, nome, email } });
}));

app.post('/api/conta/sair', auth, wrap(async (req, res) => {
  if (req.conta) {
    if (req.body?.todos === true || !req.conta.sessaoId) await q('DELETE FROM sessoes WHERE conta_id = ?', [req.conta.id]);
    else await q('DELETE FROM sessoes WHERE id = ?', [req.conta.sessaoId]);
  }
  clearSessionCookie(res);
  res.json({ ok: true });
}));

app.post('/api/entrar', limit({ windowMs: 10 * 60 * 1000, max: 12, name: 'entrar' }), wrap(async (req, res) => {
  const apelido = String(req.body.apelido || '').trim().slice(0, 30);
  if (apelido.length < 2) return res.status(400).json({ erro: 'apelido_curto' });

  let turma = null;
  if (req.body.turma) {
    [turma] = await q(
      'SELECT id FROM turmas WHERE codigo_convite = UPPER(?)',
      [String(req.body.turma).trim()],
    );
  }

  const token = crypto.randomBytes(24).toString('hex');
  const [result] = await pool.query(
    'INSERT INTO usuarios (apelido, token, turma_id) VALUES (?, ?, ?)',
    [apelido, token, turma?.id ?? null],
  );
  const [usuario] = await q(
    'SELECT id, apelido, turma_id FROM usuarios WHERE id = ?',
    [result.insertId],
  );
  setSessionCookie(res, token);
  res.json({ token, usuario });
}));

app.post('/api/sair', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/sessao', auth, (req, res) => {
  res.json({ usuario: { id: req.u.id, apelido: req.u.apelido, turma_id: req.u.turma_id } });
});

const tagInfo = async (codigo) => (await q(
  `SELECT t.*, r.nome AS rota_nome, r.cor, r.cidade_id, r.status AS rota_status,
          (SELECT COUNT(*) FROM tags WHERE rota_id = t.rota_id) AS total
   FROM tags t JOIN rotas r ON r.id = t.rota_id WHERE t.codigo = ?`,
  [codigo],
))[0];

const guardiao = async (tagId) => (await q(
  `SELECT u.apelido, COUNT(*) AS passagens, MIN(c.criado_em) AS primeira_passagem
   FROM carimbos c JOIN usuarios u ON u.id = c.usuario_id
   WHERE c.tag_id = ? AND c.evento_id IS NULL AND c.criado_em > NOW() - INTERVAL 90 DAY
   GROUP BY u.id, u.apelido ORDER BY passagens DESC, primeira_passagem ASC LIMIT 1`,
  [tagId],
))[0] ?? null;

const SEGREDO_CHAVES = segredoDasChaves();
const RAIO_PADRAO_M = Number(process.env.GEOFENCE_RAIO_PADRAO_M || 0);

// Confere a chave do link da tag (?k=) e, se o ponto exigir, a localização. Devolve null quando liberado
// ou { status, corpo } com o motivo. As camadas e seus limites estão explicados em tag-acesso.js.
function conferirAcessoAoPonto(tag, entrada) {
  if (!chaveConfere(entrada?.chave, tag, SEGREDO_CHAVES)) return { status: 403, corpo: { erro: 'chave_invalida' } };
  const loc = avaliarLocalizacao(tag, entrada?.pos, RAIO_PADRAO_M);
  if (!loc.ok) return { status: 409, corpo: { erro: loc.motivo, raio: loc.raio, ...(loc.distancia != null ? { distancia: loc.distancia } : {}) } };
  return null;
}

app.post('/api/tags/:codigo/carimbar', limit({ windowMs: 60 * 1000, max: 30, name: 'carimbar' }), auth, wrap(async (req, res) => {
  const tag = await tagInfo(req.params.codigo);
  if (!tag) return res.status(404).json({ erro: 'tag_inexistente' });
  if (tag.status !== 'publicado' || tag.rota_status !== 'publicado') return res.status(409).json({ erro: 'ponto_nao_publicado' });
  const bloqueio = conferirAcessoAoPonto(tag, req.body || {});
  if (bloqueio) return res.status(bloqueio.status).json(bloqueio.corpo);
  const usuario = req.u;
  // Ritmo: carimbos novos nos últimos 10 minutos (toques repetidos no mesmo ponto não criam linha nova).
  const [{ recentes }] = await q('SELECT COUNT(*) AS recentes FROM carimbos WHERE usuario_id = ? AND evento_id IS NULL AND criado_em > NOW() - INTERVAL 10 MINUTE', [usuario.id]);
  const ritmo = avaliarRitmo(recentes);
  if (ritmo.bloquear) return res.status(429).json({ erro: 'muitos_carimbos' });

  const connection = await pool.getConnection();
  let carimbo;
  let repetido = false;
  let card = null;
  let cardCarimbo = null;
  let cardRepetido = false;
  let edicao = null;
  try {
    await connection.beginTransaction();
    await connection.query('SELECT id FROM usuarios WHERE id = ? FOR UPDATE', [usuario.id]);
    const [recent] = await connection.query(
      `SELECT * FROM carimbos
       WHERE usuario_id = ? AND tag_id = ? AND evento_id IS NULL
         AND criado_em > NOW() - INTERVAL ${JANELA_REPETIDO_MIN} MINUTE
       ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [usuario.id, tag.id],
    );
    carimbo = recent[0];
    repetido = Boolean(carimbo);
    if (!carimbo) {
      // Suspeita (não bloqueia): deslocamento impossível desde o último carimbo ou ritmo alto demais.
      const [anteriores] = await connection.query(
        `SELECT t.lat, t.lng, TIMESTAMPDIFF(SECOND, c.criado_em, NOW()) AS segundos
         FROM carimbos c JOIN tags t ON t.id = c.tag_id
         WHERE c.usuario_id = ? AND c.evento_id IS NULL AND c.tag_id <> ? AND t.lat IS NOT NULL AND t.lng IS NOT NULL
         ORDER BY c.id DESC LIMIT 1`,
        [usuario.id, tag.id],
      );
      const suspeito = avaliarDeslocamento(anteriores[0], tag) || ritmo.suspeito || null;
      if (suspeito) console.warn(JSON.stringify({ type: 'carimbo_suspeito', request_id: req.requestId, usuario_id: usuario.id, ponto: tag.codigo, motivo: suspeito }));
      const [result] = await connection.query(
        'INSERT INTO carimbos (usuario_id, tag_id, seed, suspeito) VALUES (?, ?, ?, ?)',
        [usuario.id, tag.id, crypto.randomInt(2 ** 31), suspeito],
      );
      const [created] = await connection.query('SELECT * FROM carimbos WHERE id = ?', [result.insertId]);
      carimbo = created[0];
    }
    card = await cartaoAtivoNoPonto(connection, tag.id);
    if (card) {
      try {
        const [res2] = await connection.query(
          'INSERT INTO carimbos (usuario_id, tag_id, seed, evento_id) VALUES (?, ?, ?, ?)',
          [usuario.id, tag.id, crypto.randomInt(2 ** 31), card.id],
        );
        const [created2] = await connection.query('SELECT * FROM carimbos WHERE id = ?', [res2.insertId]);
        cardCarimbo = created2[0];
      } catch (error) {
        if (error?.code !== 'ER_DUP_ENTRY') throw error;
        const [old] = await connection.query('SELECT * FROM carimbos WHERE usuario_id = ? AND tag_id = ? AND evento_id = ?', [usuario.id, tag.id, card.id]);
        cardCarimbo = old[0];
        cardRepetido = true;
      }
      edicao = await emitirNumero(connection, card, usuario.id);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }

  let turma = null;
  if (usuario.turma_id) {
    const presentes = await q(
      `SELECT DISTINCT c.usuario_id
       FROM carimbos c JOIN usuarios x ON x.id = c.usuario_id
       WHERE x.turma_id = ? AND c.tag_id = ? AND c.evento_id IS NULL
         AND c.criado_em > NOW() - INTERVAL ${JANELA_TURMA_MIN} MINUTE`,
      [usuario.turma_id, tag.id],
    );
    const formou = presentes.length >= MIN_TURMA;
    if (formou) {
      const ids = presentes.map((item) => item.usuario_id);
      const marks = ids.map(() => '?').join(', ');
      await pool.query(
        `UPDATE carimbos SET especial = 'turma'
         WHERE tag_id = ? AND evento_id IS NULL AND criado_em > NOW() - INTERVAL ${JANELA_TURMA_MIN} MINUTE
           AND usuario_id IN (${marks})`,
        [tag.id, ...ids],
      );
      carimbo.especial = 'turma';
    }
    turma = {
      presentes: presentes.length,
      necessarios: MIN_TURMA,
      formou,
    };
  }

  const [{ feitos }] = await q(
    `SELECT COUNT(DISTINCT c.tag_id) AS feitos
     FROM carimbos c JOIN tags x ON x.id = c.tag_id
     WHERE c.usuario_id = ? AND x.rota_id = ? AND c.evento_id IS NULL`,
    [usuario.id, tag.rota_id],
  );
  const [{ passagens }] = await q('SELECT COUNT(*) AS passagens FROM carimbos WHERE usuario_id = ? AND tag_id = ? AND evento_id IS NULL', [usuario.id, tag.id]);
  const album = await albumDaPessoa(usuario.id);
  const carta = album.itens.find((i) => i.codigo === tag.codigo);
  const criatura = {
    nome: tag.criatura,
    raridade: tag.raridade || 'comum',
    nova: !repetido && Number(passagens) === 1,
    capturadas: album.capturadas,
    total: album.total,
    carta,
  };
  const [{ hoje }] = await q(
    `SELECT COUNT(*) AS hoje FROM carimbos
     WHERE tag_id = ? AND evento_id IS NULL AND criado_em >= ?`,
    [tag.id, inicioDoDiaLocal()],
  );

  res.json({
    carimbo: {
      ...carimbo,
      tag_nome: tag.nome,
      ordem: tag.ordem,
      forma: tag.forma,
      parceiro: Boolean(tag.parceiro),
      cor: tag.cor,
    },
    rota: { nome: tag.rota_nome, total: Number(tag.total), feitos: Number(feitos) },
    repetido,
    evento: card ? {
      slug: card.slug,
      nome: card.nome,
      tipo: card.tipo,
      patrocinado_por: card.tipo === 'patrocinio' && card.patrocinador ? card.patrocinador : null,
      fim_em: card.fim_em,
      repetido: cardRepetido,
      edicao,
      carimbo: {
        ...cardCarimbo,
        tag_nome: tag.nome,
        ordem: tag.ordem,
        forma: tag.forma,
        parceiro: Boolean(tag.parceiro),
        cor: tag.cor,
      },
    } : null,
    criatura,
    hoje: Number(hoje),
    turma,
    guardiao: await guardiao(tag.id),
    certificado: Number(feitos) >= Number(tag.total),
  });
}));

app.post('/api/eventos/:slug/carimbar', limit({ windowMs: 60 * 1000, max: 30, name: 'carimbar-evento' }), auth, wrap(async (req, res) => {
  const [card] = await q(
    `SELECT e.*, p.nome AS patrocinador FROM eventos e LEFT JOIN patrocinadores p ON p.id = e.patrocinador_id
     WHERE e.slug = ? AND e.status = 'publicado'`,
    [req.params.slug],
  );
  if (!card) return res.status(404).json({ erro: 'evento_inexistente' });
  const estado = estadoDoCard(card);
  if (estado !== 'ao_vivo') return res.status(409).json({ erro: estado === 'em_breve' ? 'evento_nao_comecou' : 'fora_da_janela' });
  const tag = await tagInfo(String(req.body?.codigo || ''));
  if (!tag) return res.status(404).json({ erro: 'tag_inexistente' });
  if (tag.status !== 'publicado' || tag.rota_status !== 'publicado') return res.status(409).json({ erro: 'ponto_nao_publicado' });
  const bloqueioEvento = conferirAcessoAoPonto(tag, req.body || {});
  if (bloqueioEvento) return res.status(bloqueioEvento.status).json(bloqueioEvento.corpo);
  const [liga] = await q('SELECT 1 FROM evento_tags WHERE evento_id = ? AND tag_id = ?', [card.id, tag.id]);
  if (!liga) return res.status(409).json({ erro: 'ponto_fora_do_evento' });
  let repetido = false;
  let edicao = null;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT id FROM usuarios WHERE id = ? FOR UPDATE', [req.u.id]);
    try {
      await connection.query('INSERT INTO carimbos (usuario_id, tag_id, seed, evento_id) VALUES (?, ?, ?, ?)', [req.u.id, tag.id, crypto.randomInt(2 ** 31), card.id]);
    } catch (error) {
      if (error?.code !== 'ER_DUP_ENTRY') throw error;
      repetido = true;
    }
    edicao = await emitirNumero(connection, card, req.u.id);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
  const [carimbo] = await q('SELECT * FROM carimbos WHERE usuario_id = ? AND tag_id = ? AND evento_id = ?', [req.u.id, tag.id, card.id]);
  res.json({ repetido, evento: { slug: card.slug, nome: card.nome, tipo: card.tipo, patrocinado_por: card.tipo === 'patrocinio' ? card.patrocinador : null, edicao }, carimbo: { ...carimbo, tag_nome: tag.nome, ordem: tag.ordem, forma: tag.forma, parceiro: Boolean(tag.parceiro), cor: tag.cor } });
}));

app.get('/api/caderneta', auth, wrap(async (req, res) => {
  const rows = await q(
    `SELECT r.id AS rota_id, r.nome AS rota_nome, r.cor, r.km, r.cidade_id, r.status AS rota_status,
            t.codigo, t.status AS tag_status, t.nome AS tag_nome, t.ordem, t.forma, t.parceiro,
            c.id AS carimbo_id, c.criado_em, c.seed, c.especial
     FROM rotas r JOIN tags t ON t.rota_id = r.id
     LEFT JOIN (
       SELECT c1.*
       FROM carimbos c1
       JOIN (
         SELECT tag_id, MAX(id) AS id
         FROM carimbos WHERE usuario_id = ? AND evento_id IS NULL GROUP BY tag_id
       ) latest ON latest.id = c1.id
     ) c ON c.tag_id = t.id
     WHERE r.status <> 'arquivado'
     ORDER BY r.id, t.ordem`,
    [req.u.id],
  );

  const rotas = {};
  for (const item of rows) {
    const rota = (rotas[item.rota_id] ??= {
      id: item.rota_id,
      nome: item.rota_nome,
      cor: item.cor,
      km: item.km == null ? null : Number(item.km),
      cidade_id: item.cidade_id,
      status: item.rota_status,
      pontos: [],
    });
    rota.pontos.push({
      codigo: item.codigo,
      status: item.tag_status,
      ordem: item.ordem,
      tag_nome: item.tag_nome,
      carimbo: item.carimbo_id ? {
        id: item.carimbo_id,
        criado_em: item.criado_em,
        seed: item.seed,
        especial: item.especial,
        tag_nome: item.tag_nome,
        ordem: item.ordem,
        forma: item.forma,
        parceiro: Boolean(item.parceiro),
        cor: item.cor,
      } : null,
    });
  }

  res.json({
    usuario: { apelido: req.u.apelido },
    eventos: await cartoesDaCaderneta(req.u.id),
    colecao: await albumDaPessoa(req.u.id),
    rotas: Object.values(rotas).map((rota) => ({
      ...rota,
      completa: rota.pontos.every((ponto) => ponto.carimbo),
    })),
  });
}));

app.delete('/api/eu', limit({ windowMs: 10 * 60 * 1000, max: 8, name: 'excluir' }), auth, wrap(async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM carimbos WHERE usuario_id = ?', [req.u.id]);
    if (req.conta) {
      await connection.query('DELETE FROM sessoes WHERE conta_id = ?', [req.conta.id]);
      await connection.query('DELETE FROM contas WHERE id = ?', [req.conta.id]);
    }
    await connection.query('DELETE FROM usuarios WHERE id = ?', [req.u.id]);
    await connection.commit();
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}));

app.get('/api/catalogo', wrap(async (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.json(await catalogoPublico());
}));

app.use('/api/gamificacao', gamificacaoRouter({ auth, limit, wrap }));
app.use('/api/admin', auth, adminRouter({ limit, wrap }));

app.get('/api/saude', wrap(async (_req, res) => {
  await q('SELECT 1 AS ok');
  res.json({ ok: true, banco: 'ok', versao: process.env.RELEASE_VERSION || 'desconhecida', chaves: SEGREDO_CHAVES ? 'configuradas' : 'sem_segredo' });
}));

const dirPaginas = path.join(path.dirname(fileURLToPath(import.meta.url)), 'paginas');
const DATA_POLITICA = '25 de outubro de 2026';
const TEXTO_MONITORAMENTO = '<p>Para diagnosticar falhas técnicas, o servidor envia ao Sentry (região da União Europeia) a mensagem e a pilha de execução do erro, a versão do aplicativo, o nome do host e a URL completa da rota.</p>';

function paginaPublica(arquivo) {
  return (_req, res) => {
    const contato = process.env.CONTATO_EMAIL || 'o contato informado na ficha do app na loja (defina CONTATO_EMAIL no servidor)';
    const monitoramento = process.env.SENTRY_DSN ? TEXTO_MONITORAMENTO : '';
    const html = fs.readFileSync(path.join(dirPaginas, arquivo), 'utf8')
      .replaceAll('{{CONTATO}}', contato.replace(/[<>&]/g, ''))
      .replaceAll('{{DATA}}', DATA_POLITICA)
      .replaceAll('{{MONITORAMENTO}}', monitoramento);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(html);
  };
}

app.get(['/privacidade', '/privacidade/'], paginaPublica('privacidade.html'));
app.get(['/termos-de-uso', '/termos-de-uso/'], paginaPublica('termos-de-uso.html'));
app.get(['/cookies', '/cookies/'], paginaPublica('cookies.html'));
app.get(['/excluir-conta', '/excluir-conta/'], paginaPublica('excluir-conta.html'));
app.get(['/como-funciona', '/como-funciona/'], paginaPublica('como-funciona.html'));
app.get(['/parceiros', '/parceiros/'], paginaPublica('parceiros.html'));

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(['/admin', '/admin/'], (_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    return res.sendFile(path.join(dist, 'admin.html'), (err) => { if (err) next(err); });
  });
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ erro: 'rota_api_inexistente' });
    return res.sendFile(path.join(dist, 'index.html'), (err) => { if (err) next(err); });
  });
}

app.use((error, req, res, _next) => {
  const statusCliente = Number(error?.status ?? error?.statusCode);
  if (Number.isInteger(statusCliente) && statusCliente >= 400 && statusCliente < 500) {
    return res.status(statusCliente).json({ erro: statusCliente === 413 ? 'corpo_grande_demais' : 'requisicao_invalida', request_id: req.requestId });
  }
  console.error(JSON.stringify({ type: 'http_error', request_id: req.requestId, method: req.method, path: req.path, error: error?.message || String(error) }));
  registrarErro(error, { requestId: req.requestId, method: req.method, path: req.path });
  res.status(500).json({ erro: 'interno', request_id: req.requestId });
});

const port = Number(process.env.PORT || 3000);

await iniciarMonitoramento();

try {
  await initializeDatabase(pool);
  if (!SEGREDO_CHAVES) {
    const [{ n }] = await q('SELECT COUNT(*) AS n FROM tags WHERE chave_versao > 0');
    if (Number(n) > 0) console.error(JSON.stringify({ type: 'config', alerta: 'tags_com_chave_sem_TAG_KEY_SECRET', tags: Number(n), efeito: 'as chaves NAO estao sendo exigidas' }));
  }
  app.listen(port, '0.0.0.0', () => console.log(`Caderneta no ar na porta ${port}`));
} catch (error) {
  console.error('Não foi possível inicializar o banco:', error);
  registrarErro(error);
  await descarregarMonitoramento();
  await pool.end();
  process.exitCode = 1;
}
