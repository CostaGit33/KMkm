// Administração do +1 KM (V8.4): pontos, rotas de carimbo, circuitos, eventos/patrocínios e usuários.
// Tudo sob /api/admin e somente para contas com papel 'admin' (promova pelo console: node scripts/admin.js promover <email>).
// Regra de ouro: o que já tem carimbo de alguém nunca é apagado. Para tirar do ar, arquive ou despublique.
import express from 'express';
import crypto from 'node:crypto';
import { pool, q } from './db/database.js';
import { instanteLocal } from './time.js';
import { CATEGORIAS_CARTA, RARIDADES, atribuirCriaturas } from './criaturas.js';
import { segredoDasChaves, urlDoPonto } from './tag-acesso.js';
import { relatorioPiloto } from './relatorio.js';
import { FalhaMidia, capasPorPonto } from './midia/servico.js';
import { rotasAdminMidia } from './midia/rotas-admin.js';
import { MAX_PONTOS_PATROCINIO, MIN_PONTOS_PATROCINIO, TIPOS, conflitosDeJanela, relatorioAgregado } from './eventos.js';

const FUSO = process.env.APP_TZ || 'America/Bahia';
export const CATEGORIAS = ['historia', 'praias', 'natureza', 'caminhos', 'cultura', 'sabores'];
const STATUS_PONTO = ['publicado', 'pendente', 'arquivado'];
const STATUS_ROTA = ['publicado', 'editorial', 'arquivado'];
const CORES_CIRCUITO = ['green', 'ochre', 'blue', 'red'];
const TIPOS_ROTA = ['cidade', 'caminhada', 'pedal', 'corrida'];

class Falha extends Error {
  constructor(status, erro, extra = {}) { super(erro); this.status = status; this.erro = erro; this.extra = extra; }
}
const falha = (status, erro, extra) => { throw new Falha(status, erro, extra); };

const texto = (v, max) => String(v ?? '').trim().slice(0, max);
const opcional = (v, max) => { const t = texto(v, max); return t || null; };
const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
const REGEX_CODIGO = /^[a-z0-9][a-z0-9-]{2,79}$/;
// Publicar exige responsável, autorização e vistoria registrados (ou confirmação explícita, que fica na auditoria).
// Desligue só com EXIGIR_AUTORIZACAO=false (por exemplo, em ambiente de testes).
const EXIGIR_AUTORIZACAO = process.env.EXIGIR_AUTORIZACAO !== 'false';

function dataOpcional(valor) {
  const t = texto(valor, 10);
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || Number.isNaN(Date.parse(`${t}T00:00:00Z`))) falha(400, 'data_invalida');
  return t;
}
function raioOpcional(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return null;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 0 || n > 5000) falha(400, 'raio_invalido', { maximo: 5000 });
  return n;
}
// O que falta para um ponto poder ser publicado com segurança operacional.
export function pendenciasDePublicacao(ponto) {
  const faltas = [];
  if (!ponto.responsavel_nome) faltas.push('responsável');
  if (!ponto.autorizado_em) faltas.push('autorização');
  if (!ponto.vistoriado_em) faltas.push('vistoria');
  return faltas;
}

function coordenadas(body) {
  const vazio = (v) => v === undefined || v === null || String(v).trim() === '';
  if (vazio(body.lat) && vazio(body.lng)) return { lat: null, lng: null };
  // Só um dos dois preenchido é erro (sem isso, "" virava 0 e o ponto caía no Golfo da Guiné).
  if (vazio(body.lat) !== vazio(body.lng)) falha(400, 'coordenadas_invalidas');
  const lat = Number(String(body.lat).replace(',', '.'));
  const lng = Number(String(body.lng).replace(',', '.'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) falha(400, 'coordenadas_invalidas');
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

function dadosDoPonto(body) {
  const nome = texto(body.nome, 160);
  if (nome.length < 2) falha(400, 'nome_invalido');
  const categorias = [...new Set((Array.isArray(body.categorias) ? body.categorias : []).filter((c) => CATEGORIAS.includes(c)))];
  if (!categorias.length) falha(400, 'categoria_obrigatoria');
  const forma = body.forma === 'r' ? 'r' : 'c';
  const { lat, lng } = coordenadas(body);
  return {
    nome,
    categorias: categorias.join(','),
    forma,
    parceiro: body.parceiro ? 1 : 0,
    oculto: body.oculto ? 1 : 0,
    icone: [...texto(body.icone, 8)].slice(0, 2).join('') || '✳',
    endereco: opcional(body.endereco, 200),
    nota: opcional(body.nota, 400),
    fonte_mapa: opcional(body.fonte_mapa, 80),
    criatura: opcional(body.criatura, 60),
    raridade: RARIDADES.includes(body.raridade) ? body.raridade : null,
    categoria_carta: CATEGORIAS_CARTA.includes(body.categoria_carta) ? body.categoria_carta : null,
    frase: opcional(body.frase, 160),
    historia: opcional(body.historia, 400),
    arte: /^[\w.-]{1,80}$/.test(String(body.arte || '').trim()) ? String(body.arte).trim() : null,
    responsavel_nome: opcional(body.responsavel_nome, 120),
    responsavel_contato: opcional(body.responsavel_contato, 120),
    autorizado_em: dataOpcional(body.autorizado_em),
    vistoriado_em: dataOpcional(body.vistoriado_em),
    raio_m: raioOpcional(body.raio_m),
    lat,
    lng,
  };
}

async function tx(fn) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function registrar(req, acao, alvo, detalhe) {
  try {
    await q('INSERT INTO auditoria_admin (conta_id, quem, acao, alvo, detalhe) VALUES (?, ?, ?, ?, ?)',
      [req.conta.id, req.conta.email, acao, alvo ? String(alvo).slice(0, 160) : null, detalhe ? String(detalhe).slice(0, 400) : null]);
  } catch (error) { console.error('Falha ao registrar ação do admin:', error.message); }
}

async function renumerar(conn, rotaId) {
  const [tags] = await conn.query('SELECT id FROM tags WHERE rota_id = ? ORDER BY ordem, id', [rotaId]);
  for (let i = 0; i < tags.length; i += 1) await conn.query('UPDATE tags SET ordem = ? WHERE id = ?', [i + 1, tags[i].id]);
}

// Eventos ainda relevantes (não cancelados e não encerrados) que usam estes pontos.
async function eventosAbertosDoPonto(tagId) {
  return q(`SELECT e.slug FROM eventos e JOIN evento_tags et ON et.evento_id = e.id
    WHERE et.tag_id = ? AND e.status <> 'cancelado' AND e.fim_em > UTC_TIMESTAMP()`, [tagId]);
}

async function validarEvento(body, { ignorarId = 0, soTexto = false } = {}) {
  const nome = texto(body.nome, 160);
  if (nome.length < 3) falha(400, 'nome_invalido');
  const descricao = opcional(body.descricao, 400);
  if (soTexto) return { nome, descricao };
  const slug = texto(body.slug || slugify(nome), 80);
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(slug)) falha(400, 'slug_invalido');
  const tipo = String(body.tipo || 'evento');
  if (!TIPOS.includes(tipo)) falha(400, 'tipo_invalido');
  const inicio = instanteLocal(body.inicio, FUSO);
  const fim = instanteLocal(body.fim, FUSO);
  if (!inicio || !fim) falha(400, 'datas_invalidas');
  if (fim <= inicio) falha(400, 'fim_antes_do_inicio');
  const codigos = [...new Set((Array.isArray(body.codigos) ? body.codigos : []).map((c) => String(c).trim().toLowerCase()).filter(Boolean))];
  if (!codigos.length) falha(400, 'pontos_obrigatorios');
  const tiragemBruta = body.tiragem === undefined || body.tiragem === null || String(body.tiragem).trim() === '' ? null : Number(body.tiragem);
  if (tiragemBruta !== null && (!Number.isInteger(tiragemBruta) || tiragemBruta < 1 || tiragemBruta > 100000)) falha(400, 'tiragem_invalida', { minimo: 1, maximo: 100000 });
  const patrocinador = texto(body.patrocinador, 120);
  if (tipo === 'patrocinio') {
    if (codigos.length < MIN_PONTOS_PATROCINIO || codigos.length > MAX_PONTOS_PATROCINIO) falha(400, 'pontos_patrocinio_fora_da_faixa', { minimo: MIN_PONTOS_PATROCINIO, maximo: MAX_PONTOS_PATROCINIO, recebidos: codigos.length });
    if (!patrocinador) falha(400, 'patrocinador_obrigatorio');
  } else if (patrocinador) falha(400, 'patrocinador_so_em_patrocinio');
  const tags = await q(`SELECT t.id, t.codigo, t.status, r.status AS rota_status FROM tags t JOIN rotas r ON r.id = t.rota_id WHERE t.codigo IN (${codigos.map(() => '?').join(',')})`, codigos);
  const faltando = codigos.filter((c) => !tags.some((t) => t.codigo === c));
  if (faltando.length) falha(400, 'ponto_inexistente', { codigos: faltando });
  const fechados = tags.filter((t) => t.status !== 'publicado' || t.rota_status !== 'publicado').map((t) => t.codigo);
  if (body.publicar && fechados.length) falha(409, 'ponto_nao_publicado', { codigos: fechados });
  const conflitos = await conflitosDeJanela(tags.map((t) => t.id), inicio, fim, ignorarId);
  if (conflitos.length) falha(409, 'conflito_de_janela', { conflitos: conflitos.map((c) => `${c.slug} (${c.codigo})`) });
  return { slug, nome, tipo, descricao, patrocinador, inicio, fim, tags, codigos, tiragem: tiragemBruta };
}

async function gravarPatrocinador(conn, nome) {
  await conn.query('INSERT IGNORE INTO patrocinadores (nome) VALUES (?)', [nome]);
  const [[{ id }]] = await conn.query('SELECT id FROM patrocinadores WHERE nome = ?', [nome]);
  return id;
}

// Catálogo público: o app usa isto no lugar do catálogo fixo do front-end (pontos e circuitos publicados no admin).
export async function catalogoPublico() {
  const pontos = await q(`SELECT t.id, t.codigo, t.nome, t.status, t.lat, t.lng, t.endereco, t.nota, t.categorias, t.icone, t.fonte_mapa, t.oculto
    FROM tags t JOIN rotas r ON r.id = t.rota_id WHERE t.status <> 'arquivado' AND r.status <> 'arquivado' ORDER BY t.codigo`);
  const circuitos = await q("SELECT id, slug, nome, subtitulo, icone, cor FROM circuitos WHERE status = 'publicado' ORDER BY ordem, id");
  const capas = await capasPorPonto();
  const ligacoes = circuitos.length ? await q(`SELECT cp.circuito_id, t.codigo FROM circuito_pontos cp JOIN tags t ON t.id = cp.tag_id
    WHERE t.status <> 'arquivado' AND cp.circuito_id IN (${circuitos.map(() => '?').join(',')}) ORDER BY cp.circuito_id, cp.ordem`, circuitos.map((c) => c.id)) : [];
  return {
    pontos: pontos.map((p) => ({
      codigo: p.codigo, nome: p.nome, status: p.status,
      lat: p.lat == null ? null : Number(p.lat), lng: p.lng == null ? null : Number(p.lng),
      endereco: p.endereco, nota: p.nota, categorias: String(p.categorias || '').split(',').filter(Boolean),
      icone: p.icone, fonte_mapa: p.fonte_mapa, oculto: Boolean(p.oculto),
      capa: capas.get(p.id)?.capa ?? null, fotos: capas.get(p.id)?.fotos ?? 0,
    })),
    circuitos: circuitos.map((c) => ({
      slug: c.slug, nome: c.nome, subtitulo: c.subtitulo, icone: c.icone, cor: c.cor,
      codigos: ligacoes.filter((l) => l.circuito_id === c.id).map((l) => l.codigo),
    })),
  };
}

// Gate de publicação. Devolve true quando foi liberado "à força" (fica registrado na auditoria).
function exigirPublicacaoSegura(ponto, corpo, codigo) {
  if (!EXIGIR_AUTORIZACAO) return false;
  const faltas = pendenciasDePublicacao(ponto);
  if (!faltas.length) return false;
  if (corpo?.forcar === true) return true;
  falha(409, 'autorizacao_pendente', { codigos: [codigo], faltando: faltas });
}

export function adminRouter({ limit, wrap }) {
  const router = express.Router();
  const h = (fn) => wrap(async (req, res, next) => {
    try { await fn(req, res, next); } catch (error) {
      if (error instanceof Falha || error instanceof FalhaMidia) return res.status(error.status).json({ erro: error.erro, ...error.extra });
      throw error;
    }
  });
  router.use(limit({ windowMs: 60 * 1000, max: 240, name: 'admin' }));
  router.use((req, res, next) => {
    if (!req.conta) return res.status(401).json({ erro: 'sessao_conta_necessaria' });
    if (req.conta.papel !== 'admin') return res.status(403).json({ erro: 'sem_permissao' });
    next();
  });

  rotasAdminMidia(router, { h, registrar, texto, opcional, limit });

  router.get('/eu', (req, res) => res.json({ admin: true, nome: req.conta.nome, email: req.conta.email, conta_id: req.conta.id }));

  // Tudo que as telas de catálogo precisam, numa chamada só.
  router.get('/dados', h(async (_req, res) => {
    const rotas = await q(`SELECT r.id, r.nome, r.tipo, r.cor, r.km, r.status, r.subtitulo, (SELECT COUNT(*) FROM tags t WHERE t.rota_id = r.id) AS pontos FROM rotas r ORDER BY r.id`);
    const pontos = await q(`SELECT t.id, t.codigo, t.nome, t.status, t.ordem, t.forma, t.parceiro, t.oculto, t.lat, t.lng, t.endereco, t.nota, t.categorias, t.icone, t.fonte_mapa, t.criatura, t.raridade, t.categoria_carta, t.frase, t.historia, t.arte, t.carta,
      t.chave_versao, t.raio_m, t.responsavel_nome, t.responsavel_contato, DATE_FORMAT(t.autorizado_em, '%Y-%m-%d') AS autorizado_em, DATE_FORMAT(t.vistoriado_em, '%Y-%m-%d') AS vistoriado_em,
      t.rota_id, (SELECT COUNT(*) FROM carimbos c WHERE c.tag_id = t.id) AS carimbos, (SELECT COUNT(*) FROM evento_tags et WHERE et.tag_id = t.id) AS eventos,
      (SELECT COUNT(*) FROM ponto_imagens pi WHERE pi.tag_id = t.id AND pi.status <> 'arquivado') AS fotos, (SELECT COUNT(*) FROM ponto_imagens pi WHERE pi.tag_id = t.id AND pi.status = 'aprovado') AS fotos_aprovadas
      FROM tags t ORDER BY t.rota_id, t.ordem, t.id`);
    const circuitos = await q('SELECT id, slug, nome, subtitulo, icone, cor, ordem, status FROM circuitos ORDER BY ordem, id');
    const ligacoes = await q('SELECT cp.circuito_id, t.codigo FROM circuito_pontos cp JOIN tags t ON t.id = cp.tag_id ORDER BY cp.circuito_id, cp.ordem');
    const eventos = await q(`SELECT e.id, e.slug, e.nome, e.tipo, e.descricao, e.status, e.inicio_em, e.fim_em, e.tiragem, e.emitidos, p.nome AS patrocinador,
      (SELECT COUNT(*) FROM carimbos c WHERE c.evento_id = e.id) AS carimbos FROM eventos e LEFT JOIN patrocinadores p ON p.id = e.patrocinador_id ORDER BY e.inicio_em DESC, e.id DESC`);
    const ev = await q('SELECT et.evento_id, t.codigo FROM evento_tags et JOIN tags t ON t.id = et.tag_id ORDER BY t.ordem');
    const patrocinadores = await q('SELECT p.id, p.nome, (SELECT COUNT(*) FROM eventos e WHERE e.patrocinador_id = p.id) AS eventos FROM patrocinadores p ORDER BY p.nome');
    res.json({
      fuso: FUSO,
      exigir_autorizacao: EXIGIR_AUTORIZACAO,
      chaves: { segredo_configurado: Boolean(segredoDasChaves()), url_publica_configurada: Boolean(process.env.APP_PUBLIC_URL) },
      categorias: CATEGORIAS,
      limites_patrocinio: { minimo: MIN_PONTOS_PATROCINIO, maximo: MAX_PONTOS_PATROCINIO },
      rotas: rotas.map((r) => ({ ...r, km: r.km == null ? null : Number(r.km), pontos: Number(r.pontos) })),
      pontos: pontos.map((p) => ({
        ...p, lat: p.lat == null ? null : Number(p.lat), lng: p.lng == null ? null : Number(p.lng), parceiro: Boolean(p.parceiro), oculto: Boolean(p.oculto),
        categorias: String(p.categorias || '').split(',').filter(Boolean), carimbos: Number(p.carimbos), eventos: Number(p.eventos), fotos: Number(p.fotos), fotos_aprovadas: Number(p.fotos_aprovadas),
      })),
      circuitos: circuitos.map((c) => ({ ...c, codigos: ligacoes.filter((l) => l.circuito_id === c.id).map((l) => l.codigo) })),
      eventos: eventos.map((e) => ({ ...e, tiragem: e.tiragem == null ? null : Number(e.tiragem), emitidos: Number(e.emitidos), carimbos: Number(e.carimbos), codigos: ev.filter((x) => x.evento_id === e.id).map((x) => x.codigo) })),
      patrocinadores: patrocinadores.map((p) => ({ ...p, eventos: Number(p.eventos) })),
    });
  }));

  // ---------- Pontos ----------
  router.post('/pontos', h(async (req, res) => {
    const codigo = texto(req.body.codigo, 80).toLowerCase();
    if (!REGEX_CODIGO.test(codigo)) falha(400, 'codigo_invalido');
    const dados = dadosDoPonto(req.body);
    const rotaId = Number(req.body.rota_id);
    const [rota] = await q('SELECT id, status FROM rotas WHERE id = ?', [rotaId]);
    if (!rota || rota.status === 'arquivado') falha(400, 'rota_invalida');
    const status = STATUS_PONTO.includes(req.body.status) ? req.body.status : 'pendente';
    if (status === 'publicado') exigirPublicacaoSegura(dados, req.body, codigo);
    try {
      await tx(async (c) => {
        const [[{ prox }]] = await c.query('SELECT COALESCE(MAX(ordem), 0) + 1 AS prox FROM tags WHERE rota_id = ?', [rotaId]);
        await c.query(`INSERT INTO tags (codigo, rota_id, ordem, nome, forma, parceiro, status, lat, lng, endereco, nota, categorias, icone, fonte_mapa, oculto, criatura, raridade, categoria_carta, frase, historia, arte, responsavel_nome, responsavel_contato, autorizado_em, vistoriado_em, raio_m)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [codigo, rotaId, prox, dados.nome, dados.forma, dados.parceiro, status, dados.lat, dados.lng, dados.endereco, dados.nota, dados.categorias, dados.icone, dados.fonte_mapa, dados.oculto, dados.criatura, dados.raridade, dados.categoria_carta, dados.frase, dados.historia, dados.arte, dados.responsavel_nome, dados.responsavel_contato, dados.autorizado_em, dados.vistoriado_em, dados.raio_m]);
      });
      await atribuirCriaturas();
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') falha(409, 'codigo_ja_existe');
      throw error;
    }
    await registrar(req, 'ponto.criar', codigo, dados.nome);
    res.status(201).json({ codigo });
  }));

  router.put('/pontos/:codigo', h(async (req, res) => {
    const [tag] = await q('SELECT * FROM tags WHERE codigo = ?', [req.params.codigo]);
    if (!tag) falha(404, 'ponto_inexistente');
    const dados = dadosDoPonto(req.body);
    const rotaId = req.body.rota_id === undefined ? tag.rota_id : Number(req.body.rota_id);
    if (rotaId !== tag.rota_id) {
      const [rota] = await q('SELECT id, status FROM rotas WHERE id = ?', [rotaId]);
      if (!rota || rota.status === 'arquivado') falha(400, 'rota_invalida');
    }
    await tx(async (c) => {
      let ordem = tag.ordem;
      if (rotaId !== tag.rota_id) {
        const [[{ prox }]] = await c.query('SELECT COALESCE(MAX(ordem), 0) + 1 AS prox FROM tags WHERE rota_id = ?', [rotaId]);
        ordem = prox;
      }
      await c.query(`UPDATE tags SET nome = ?, forma = ?, parceiro = ?, oculto = ?, lat = ?, lng = ?, endereco = ?, nota = ?, categorias = ?, icone = ?, fonte_mapa = ?, rota_id = ?, ordem = ?, criatura = COALESCE(?, criatura), raridade = COALESCE(?, raridade), categoria_carta = COALESCE(?, categoria_carta), frase = ?, historia = ?, arte = ?, responsavel_nome = ?, responsavel_contato = ?, autorizado_em = ?, vistoriado_em = ?, raio_m = ? WHERE id = ?`,
        [dados.nome, dados.forma, dados.parceiro, dados.oculto, dados.lat, dados.lng, dados.endereco, dados.nota, dados.categorias, dados.icone, dados.fonte_mapa, rotaId, ordem, dados.criatura, dados.raridade, dados.categoria_carta, dados.frase, dados.historia, dados.arte, dados.responsavel_nome, dados.responsavel_contato, dados.autorizado_em, dados.vistoriado_em, dados.raio_m, tag.id]);
      if (rotaId !== tag.rota_id) await renumerar(c, tag.rota_id);
    });
    await registrar(req, 'ponto.editar', tag.codigo, dados.nome);
    res.json({ ok: true });
  }));

  router.post('/pontos/:codigo/status', h(async (req, res) => {
    const status = String(req.body.status || '');
    if (!STATUS_PONTO.includes(status)) falha(400, 'status_invalido');
    const [tag] = await q('SELECT * FROM tags WHERE codigo = ?', [req.params.codigo]);
    if (!tag) falha(404, 'ponto_inexistente');
    if (status === 'arquivado') {
      const abertos = await eventosAbertosDoPonto(tag.id);
      if (abertos.length) falha(409, 'ponto_em_evento', { eventos: abertos.map((e) => e.slug) });
    }
    let forcado = false;
    if (status === 'publicado' && tag.status !== 'publicado') forcado = exigirPublicacaoSegura(tag, req.body, tag.codigo);
    await q('UPDATE tags SET status = ? WHERE id = ?', [status, tag.id]);
    await registrar(req, forcado ? 'ponto.publicado_sem_documentacao' : `ponto.${status}`, tag.codigo, forcado ? `${tag.nome} · faltava: ${pendenciasDePublicacao(tag).join(', ')}` : tag.nome);
    res.json({ ok: true });
  }));

  router.delete('/pontos/:codigo', h(async (req, res) => {
    const [tag] = await q('SELECT * FROM tags WHERE codigo = ?', [req.params.codigo]);
    if (!tag) falha(404, 'ponto_inexistente');
    const [{ n: carimbos }] = await q('SELECT COUNT(*) AS n FROM carimbos WHERE tag_id = ?', [tag.id]);
    if (Number(carimbos)) falha(409, 'tem_carimbos', { carimbos: Number(carimbos) });
    const [{ n: eventos }] = await q('SELECT COUNT(*) AS n FROM evento_tags WHERE tag_id = ?', [tag.id]);
    if (Number(eventos)) falha(409, 'em_eventos', { eventos: Number(eventos) });
    const [{ n: fotos }] = await q('SELECT COUNT(*) AS n FROM ponto_imagens WHERE tag_id = ?', [tag.id]);
    if (Number(fotos)) falha(409, 'tem_fotos', { fotos: Number(fotos) });
    await tx(async (c) => {
      await c.query('DELETE FROM tags WHERE id = ?', [tag.id]);
      await renumerar(c, tag.rota_id);
    });
    await registrar(req, 'ponto.excluir', tag.codigo, tag.nome);
    res.json({ ok: true });
  }));

  // ---------- Rotas de carimbo (regra do certificado: completar todos os pontos da rota) ----------
  const dadosDaRota = (body) => {
    const nome = texto(body.nome, 160);
    if (nome.length < 3) falha(400, 'nome_invalido');
    const tipo = TIPOS_ROTA.includes(body.tipo) ? body.tipo : 'cidade';
    const cor = texto(body.cor, 20) || 'folha';
    const kmBruto = body.km === '' || body.km == null ? null : Number(String(body.km).replace(',', '.'));
    if (kmBruto != null && (!Number.isFinite(kmBruto) || kmBruto < 0 || kmBruto > 999)) falha(400, 'km_invalido');
    const status = STATUS_ROTA.includes(body.status) ? body.status : 'publicado';
    return { nome, tipo, cor, km: kmBruto, status, subtitulo: opcional(body.subtitulo, 200) };
  };
  router.post('/rotas', h(async (req, res) => {
    const d = dadosDaRota(req.body);
    try {
      const [r] = await pool.query("INSERT INTO rotas (nome, tipo, cor, km, cidade_id, status, subtitulo) VALUES (?, ?, ?, ?, 'eunapolis', ?, ?)", [d.nome, d.tipo, d.cor, d.km, d.status, d.subtitulo]);
      await registrar(req, 'rota.criar', d.nome);
      res.status(201).json({ id: r.insertId });
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') falha(409, 'nome_ja_existe');
      throw error;
    }
  }));
  router.put('/rotas/:id', h(async (req, res) => {
    const [rota] = await q('SELECT id FROM rotas WHERE id = ?', [Number(req.params.id)]);
    if (!rota) falha(404, 'rota_inexistente');
    const d = dadosDaRota(req.body);
    try {
      await q('UPDATE rotas SET nome = ?, tipo = ?, cor = ?, km = ?, status = ?, subtitulo = ? WHERE id = ?', [d.nome, d.tipo, d.cor, d.km, d.status, d.subtitulo, rota.id]);
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') falha(409, 'nome_ja_existe');
      throw error;
    }
    await registrar(req, 'rota.editar', d.nome, `status ${d.status}`);
    res.json({ ok: true });
  }));
  router.delete('/rotas/:id', h(async (req, res) => {
    const [rota] = await q('SELECT id, nome FROM rotas WHERE id = ?', [Number(req.params.id)]);
    if (!rota) falha(404, 'rota_inexistente');
    const [{ n }] = await q('SELECT COUNT(*) AS n FROM tags WHERE rota_id = ?', [rota.id]);
    if (Number(n)) falha(409, 'rota_com_pontos', { pontos: Number(n) });
    await q('DELETE FROM rotas WHERE id = ?', [rota.id]);
    await registrar(req, 'rota.excluir', rota.nome);
    res.json({ ok: true });
  }));
  // Define a ordem dos pontos dentro de uma rota (a ordem numera os carimbos). A lista precisa ter exatamente os mesmos pontos.
  router.put('/rotas/:id/ordem', h(async (req, res) => {
    const rotaId = Number(req.params.id);
    const codigos = (Array.isArray(req.body.codigos) ? req.body.codigos : []).map((c) => String(c).toLowerCase());
    const atuais = await q('SELECT id, codigo FROM tags WHERE rota_id = ?', [rotaId]);
    if (!atuais.length || atuais.length !== codigos.length || new Set(codigos).size !== codigos.length || !codigos.every((c) => atuais.some((t) => t.codigo === c))) falha(400, 'ordem_invalida');
    await tx(async (c) => {
      for (let i = 0; i < codigos.length; i += 1) await c.query('UPDATE tags SET ordem = ? WHERE codigo = ? AND rota_id = ?', [i + 1, codigos[i], rotaId]);
    });
    await registrar(req, 'rota.ordem', String(rotaId), codigos.join(','));
    res.json({ ok: true });
  }));

  // ---------- Circuitos (o que aparece em "Rotas" no app; um ponto pode estar em vários) ----------
  const dadosDoCircuito = (body) => {
    const nome = texto(body.nome, 160);
    if (nome.length < 3) falha(400, 'nome_invalido');
    return {
      nome, subtitulo: opcional(body.subtitulo, 200), icone: [...texto(body.icone, 8)].slice(0, 2).join('') || '✳',
      cor: CORES_CIRCUITO.includes(body.cor) ? body.cor : 'ochre', status: body.status === 'rascunho' ? 'rascunho' : 'publicado',
    };
  };
  router.post('/circuitos', h(async (req, res) => {
    const d = dadosDoCircuito(req.body);
    let slug = slugify(d.nome) || 'circuito';
    if ((await q('SELECT 1 FROM circuitos WHERE slug = ?', [slug])).length) slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    const [{ prox }] = await q('SELECT COALESCE(MAX(ordem), 0) + 1 AS prox FROM circuitos');
    const [r] = await pool.query('INSERT INTO circuitos (slug, nome, subtitulo, icone, cor, ordem, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [slug, d.nome, d.subtitulo, d.icone, d.cor, prox, d.status]);
    await registrar(req, 'circuito.criar', slug, d.nome);
    res.status(201).json({ id: r.insertId, slug });
  }));
  router.put('/circuitos/ordem', h(async (req, res) => {
    const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).map(Number);
    const atuais = await q('SELECT id FROM circuitos');
    if (atuais.length !== ids.length || new Set(ids).size !== ids.length || !ids.every((i) => atuais.some((c) => c.id === i))) falha(400, 'ordem_invalida');
    await tx(async (c) => { for (let i = 0; i < ids.length; i += 1) await c.query('UPDATE circuitos SET ordem = ? WHERE id = ?', [i + 1, ids[i]]); });
    await registrar(req, 'circuito.ordem', null, ids.join(','));
    res.json({ ok: true });
  }));
  router.put('/circuitos/:id', h(async (req, res) => {
    const [c] = await q('SELECT id FROM circuitos WHERE id = ?', [Number(req.params.id)]);
    if (!c) falha(404, 'circuito_inexistente');
    const d = dadosDoCircuito(req.body);
    await q('UPDATE circuitos SET nome = ?, subtitulo = ?, icone = ?, cor = ?, status = ? WHERE id = ?', [d.nome, d.subtitulo, d.icone, d.cor, d.status, c.id]);
    await registrar(req, 'circuito.editar', String(c.id), d.nome);
    res.json({ ok: true });
  }));
  router.put('/circuitos/:id/pontos', h(async (req, res) => {
    const [c] = await q('SELECT id, nome FROM circuitos WHERE id = ?', [Number(req.params.id)]);
    if (!c) falha(404, 'circuito_inexistente');
    const codigos = [...new Set((Array.isArray(req.body.codigos) ? req.body.codigos : []).map((x) => String(x).toLowerCase()))];
    const tags = codigos.length ? await q(`SELECT id, codigo FROM tags WHERE codigo IN (${codigos.map(() => '?').join(',')})`, codigos) : [];
    const faltando = codigos.filter((x) => !tags.some((t) => t.codigo === x));
    if (faltando.length) falha(400, 'ponto_inexistente', { codigos: faltando });
    await tx(async (conn) => {
      await conn.query('DELETE FROM circuito_pontos WHERE circuito_id = ?', [c.id]);
      for (let i = 0; i < codigos.length; i += 1) await conn.query('INSERT INTO circuito_pontos (circuito_id, tag_id, ordem) VALUES (?, ?, ?)', [c.id, tags.find((t) => t.codigo === codigos[i]).id, i + 1]);
    });
    await registrar(req, 'circuito.pontos', c.nome, codigos.join(','));
    res.json({ ok: true });
  }));
  router.delete('/circuitos/:id', h(async (req, res) => {
    const [c] = await q('SELECT id, nome FROM circuitos WHERE id = ?', [Number(req.params.id)]);
    if (!c) falha(404, 'circuito_inexistente');
    await q('DELETE FROM circuitos WHERE id = ?', [c.id]);
    await registrar(req, 'circuito.excluir', c.nome);
    res.json({ ok: true });
  }));

  // ---------- Eventos e patrocínios ----------
  router.post('/eventos', h(async (req, res) => {
    const v = await validarEvento(req.body);
    try {
      await tx(async (c) => {
        const patrocinadorId = v.tipo === 'patrocinio' ? await gravarPatrocinador(c, v.patrocinador) : null;
        const [r] = await c.query('INSERT INTO eventos (slug, nome, tipo, descricao, patrocinador_id, inicio_em, fim_em, tiragem, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [v.slug, v.nome, v.tipo, v.descricao, patrocinadorId, v.inicio, v.fim, v.tiragem, req.body.publicar ? 'publicado' : 'rascunho']);
        for (const t of v.tags) await c.query('INSERT INTO evento_tags (evento_id, tag_id) VALUES (?, ?)', [r.insertId, t.id]);
      });
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') falha(409, 'slug_ja_existe');
      throw error;
    }
    await registrar(req, 'evento.criar', v.slug, `${v.tipo}${v.patrocinador ? ` · ${v.patrocinador}` : ''}`);
    res.status(201).json({ slug: v.slug });
  }));
  router.put('/eventos/:slug', h(async (req, res) => {
    const [ev] = await q('SELECT * FROM eventos WHERE slug = ?', [req.params.slug]);
    if (!ev) falha(404, 'evento_inexistente');
    const [{ n }] = await q('SELECT COUNT(*) AS n FROM carimbos WHERE evento_id = ?', [ev.id]);
    if (Number(n) > 0) {
      // Com carimbos dados, janela, pontos, tipo e patrocinador ficam travados: mudar isso falsificaria o relatório.
      const v = await validarEvento(req.body, { soTexto: true });
      await q('UPDATE eventos SET nome = ?, descricao = ? WHERE id = ?', [v.nome, v.descricao, ev.id]);
      await registrar(req, 'evento.editar_texto', ev.slug, v.nome);
      return res.json({ ok: true, parcial: true });
    }
    const v = await validarEvento({ ...req.body, slug: ev.slug, publicar: ev.status === 'publicado' }, { ignorarId: ev.id });
    await tx(async (c) => {
      const patrocinadorId = v.tipo === 'patrocinio' ? await gravarPatrocinador(c, v.patrocinador) : null;
      await c.query('UPDATE eventos SET nome = ?, tipo = ?, descricao = ?, patrocinador_id = ?, inicio_em = ?, fim_em = ?, tiragem = ? WHERE id = ?', [v.nome, v.tipo, v.descricao, patrocinadorId, v.inicio, v.fim, v.tiragem, ev.id]);
      await c.query('DELETE FROM evento_tags WHERE evento_id = ?', [ev.id]);
      for (const t of v.tags) await c.query('INSERT INTO evento_tags (evento_id, tag_id) VALUES (?, ?)', [ev.id, t.id]);
    });
    await registrar(req, 'evento.editar', ev.slug, v.nome);
    res.json({ ok: true });
  }));
  router.post('/eventos/:slug/status', h(async (req, res) => {
    const status = String(req.body.status || '');
    if (!['publicado', 'cancelado', 'rascunho'].includes(status)) falha(400, 'status_invalido');
    const [ev] = await q('SELECT * FROM eventos WHERE slug = ?', [req.params.slug]);
    if (!ev) falha(404, 'evento_inexistente');
    const ligados = await q('SELECT t.id, t.codigo, t.status, r.status AS rota_status FROM evento_tags et JOIN tags t ON t.id = et.tag_id JOIN rotas r ON r.id = t.rota_id WHERE et.evento_id = ?', [ev.id]);
    if (status === 'publicado') {
      const fechados = ligados.filter((t) => t.status !== 'publicado' || t.rota_status !== 'publicado').map((t) => t.codigo);
      if (fechados.length) falha(409, 'ponto_nao_publicado', { codigos: fechados });
      const conflitos = await conflitosDeJanela(ligados.map((t) => t.id), ev.inicio_em, ev.fim_em, ev.id);
      if (conflitos.length) falha(409, 'conflito_de_janela', { conflitos: conflitos.map((c) => `${c.slug} (${c.codigo})`) });
    }
    if (status === 'rascunho') {
      const [{ n }] = await q('SELECT COUNT(*) AS n FROM carimbos WHERE evento_id = ?', [ev.id]);
      if (Number(n)) falha(409, 'tem_carimbos', { carimbos: Number(n) });
    }
    await q('UPDATE eventos SET status = ? WHERE id = ?', [status, ev.id]);
    await registrar(req, `evento.${status}`, ev.slug);
    res.json({ ok: true });
  }));
  router.delete('/eventos/:slug', h(async (req, res) => {
    const [ev] = await q('SELECT * FROM eventos WHERE slug = ?', [req.params.slug]);
    if (!ev) falha(404, 'evento_inexistente');
    const [{ n }] = await q('SELECT COUNT(*) AS n FROM carimbos WHERE evento_id = ?', [ev.id]);
    if (Number(n)) falha(409, 'tem_carimbos', { carimbos: Number(n) });
    await q('DELETE FROM eventos WHERE id = ?', [ev.id]);
    await registrar(req, 'evento.excluir', ev.slug);
    res.json({ ok: true });
  }));
  router.get('/eventos/:slug/relatorio', h(async (req, res) => {
    const r = await relatorioAgregado(req.params.slug, FUSO);
    if (!r) falha(404, 'evento_inexistente');
    res.json(r);
  }));
  router.delete('/patrocinadores/:id', h(async (req, res) => {
    const [p] = await q('SELECT id, nome FROM patrocinadores WHERE id = ?', [Number(req.params.id)]);
    if (!p) falha(404, 'patrocinador_inexistente');
    const [{ n }] = await q('SELECT COUNT(*) AS n FROM eventos WHERE patrocinador_id = ?', [p.id]);
    if (Number(n)) falha(409, 'patrocinador_em_uso', { eventos: Number(n) });
    await q('DELETE FROM patrocinadores WHERE id = ?', [p.id]);
    await registrar(req, 'patrocinador.excluir', p.nome);
    res.json({ ok: true });
  }));

  // ---------- Usuários ----------
  router.get('/usuarios', h(async (req, res) => {
    const busca = texto(req.query.q, 80).replace(/[\\%_]/g, (m) => `\\${m}`);
    const pagina = Math.max(0, Number(req.query.pagina) || 0);
    const like = `%${busca}%`;
    const filtro = busca ? 'WHERE u.apelido LIKE ? OR c.email LIKE ? OR c.nome LIKE ?' : '';
    const params = busca ? [like, like, like] : [];
    const [{ total }] = await q(`SELECT COUNT(*) AS total FROM usuarios u LEFT JOIN contas c ON c.usuario_id = u.id ${filtro}`, params);
    const linhas = await q(`SELECT u.id AS usuario_id, u.apelido, u.criado_em, c.id AS conta_id, c.nome, c.email, c.papel,
      (SELECT COUNT(*) FROM carimbos x WHERE x.usuario_id = u.id) AS carimbos
      FROM usuarios u LEFT JOIN contas c ON c.usuario_id = u.id ${filtro} ORDER BY u.id DESC LIMIT 50 OFFSET ?`, [...params, pagina * 50]);
    res.json({ total: Number(total), pagina, por_pagina: 50, usuarios: linhas.map((l) => ({ ...l, carimbos: Number(l.carimbos), papel: l.papel || (l.conta_id ? 'usuario' : 'sem_conta') })) });
  }));
  router.get('/usuarios/:id/carimbos', h(async (req, res) => {
    const linhas = await q(`SELECT t.codigo, t.nome, c.criado_em, c.especial, e.slug AS evento FROM carimbos c JOIN tags t ON t.id = c.tag_id
      LEFT JOIN eventos e ON e.id = c.evento_id WHERE c.usuario_id = ? ORDER BY c.id DESC LIMIT 200`, [Number(req.params.id)]);
    res.json({ carimbos: linhas });
  }));
  router.put('/usuarios/:id/papel', h(async (req, res) => {
    const papel = req.body.papel === 'admin' ? 'admin' : 'usuario';
    const [conta] = await q('SELECT c.id, c.email, c.papel FROM contas c WHERE c.usuario_id = ?', [Number(req.params.id)]);
    if (!conta) falha(404, 'conta_inexistente');
    if (conta.id === req.conta.id) falha(409, 'nao_altere_o_proprio_papel');
    await q('UPDATE contas SET papel = ? WHERE id = ?', [papel, conta.id]);
    // Sessões abertas continuam válidas, mas o papel é lido a cada requisição; nada mais a invalidar.
    await registrar(req, `usuario.papel_${papel}`, conta.email);
    res.json({ ok: true });
  }));
  router.delete('/usuarios/:id', h(async (req, res) => {
    const usuarioId = Number(req.params.id);
    const [u] = await q('SELECT u.id, u.apelido, c.id AS conta_id, c.email, c.papel FROM usuarios u LEFT JOIN contas c ON c.usuario_id = u.id WHERE u.id = ?', [usuarioId]);
    if (!u) falha(404, 'usuario_inexistente');
    if (u.conta_id === req.conta.id) falha(409, 'nao_exclua_a_si_mesmo');
    if (u.papel === 'admin') falha(409, 'rebaixe_o_admin_antes');
    await tx(async (c) => {
      await c.query('DELETE FROM carimbos WHERE usuario_id = ?', [usuarioId]);
      if (u.conta_id) {
        await c.query('DELETE FROM sessoes WHERE conta_id = ?', [u.conta_id]);
        await c.query('DELETE FROM contas WHERE id = ?', [u.conta_id]);
      }
      await c.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
    });
    await registrar(req, 'usuario.excluir', u.email || u.apelido);
    res.json({ ok: true });
  }));

  // ---------- Chaves dos links das tags (veja tag-acesso.js para o que elas garantem) ----------
  const urlBase = () => String(process.env.APP_PUBLIC_URL || '').replace(/\/+$/, '');
  router.post('/pontos/:codigo/chave', h(async (req, res) => {
    const segredo = segredoDasChaves();
    if (!segredo) falha(409, 'sem_segredo_de_chaves');
    const [tag] = await q('SELECT * FROM tags WHERE codigo = ?', [req.params.codigo]);
    if (!tag) falha(404, 'ponto_inexistente');
    const acao = String(req.body.acao || '');
    if (!['ativar', 'girar', 'desativar'].includes(acao)) falha(400, 'acao_invalida');
    const versao = acao === 'desativar' ? 0 : acao === 'girar' ? Number(tag.chave_versao) + 1 : Math.max(1, Number(tag.chave_versao));
    await q('UPDATE tags SET chave_versao = ? WHERE id = ?', [versao, tag.id]);
    await registrar(req, `ponto.chave_${acao}`, tag.codigo, `versão ${versao}`);
    res.json({ versao, url: versao > 0 ? urlDoPonto(urlBase(), { codigo: tag.codigo, chave_versao: versao }, segredo) : null, regravar_tag: acao === 'girar' });
  }));
  router.post('/chaves/ativar-todos', h(async (req, res) => {
    if (!segredoDasChaves()) falha(409, 'sem_segredo_de_chaves');
    const [r] = await pool.query("UPDATE tags SET chave_versao = 1 WHERE chave_versao = 0 AND status <> 'arquivado'");
    await registrar(req, 'ponto.chave_ativar_todos', null, `${r.affectedRows} ponto(s)`);
    res.json({ ativados: r.affectedRows });
  }));
  // CSV com o link de cada ponto, para gravar nas tags NFC / gerar os QR. Guarde com cuidado: contém as chaves.
  router.get('/pontos-urls.csv', h(async (req, res) => {
    const segredo = segredoDasChaves();
    if (!urlBase()) falha(409, 'sem_url_publica');
    const tags = await q("SELECT codigo, nome, status, chave_versao FROM tags WHERE status <> 'arquivado' ORDER BY rota_id, ordem, id");
    const seguro = (v) => { const t = String(v ?? '').replace(/[\r\n]+/g, ' '); return `"${(/^[=+\-@\t]/.test(t) ? `'${t}` : t).replace(/"/g, '""')}"`; };
    const linhas = ['codigo,nome,status,chave,url', ...tags.map((t) => [t.codigo, t.nome, t.status, Number(t.chave_versao) > 0 && segredo ? `v${t.chave_versao}` : 'sem chave', urlDoPonto(urlBase(), t, segredo)].map(seguro).join(','))];
    await registrar(req, 'ponto.exportar_urls', null, `${tags.length} ponto(s)`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', 'attachment; filename="mais1km-urls-das-tags.csv"');
    res.type('text/csv').send(`\uFEFF${linhas.join('\n')}\n`);
  }));

  // ---------- Relatório do piloto ----------
  router.get('/relatorio-piloto', h(async (req, res) => {
    try {
      res.json(await relatorioPiloto({ dias: Number(req.query.dias) || 14 }));
    } catch (error) {
      if (error?.status === 400) falha(400, error.message);
      throw error;
    }
  }));

  router.get('/auditoria', h(async (_req, res) => {
    res.json({ registros: await q('SELECT id, quem, acao, alvo, detalhe, criado_em FROM auditoria_admin ORDER BY id DESC LIMIT 200') });
  }));
  return router;
}
