// Galeria de fotos dos pontos: junta o tratamento da imagem, o armazenamento de objetos e a tabela ponto_imagens.
import { pool, q } from '../db/database.js';
import { ImagemInvalida, processarImagem } from './processar.js';

export const TIPOS_REGISTRO = ['historica', 'atual', 'restauracao', 'outra'];
export const STATUS_IMAGEM = ['pendente', 'aprovado', 'arquivado'];

export class FalhaMidia extends Error {
  constructor(status, erro, extra = {}) { super(erro); this.status = status; this.erro = erro; this.extra = extra; }
}
const falha = (status, erro, extra) => { throw new FalhaMidia(status, erro, extra); };

const STATUS_HTTP_DA_IMAGEM = { imagem_grande_demais: 413, formato_nao_aceito: 415 };

// ---------- chaves e endereços ----------
// O hash de 16 caracteres no endereço público torna a URL imutável (cache de 1 ano) e impede "adivinhar" outra versão.
export const hashCurto = (sha256) => String(sha256).slice(0, 16);
export function chavesDaImagem(tagId, sha256, ext) {
  const h = hashCurto(sha256);
  return { original: `originais/${tagId}/${sha256}.${ext}`, grande: `publico/${tagId}/${h}-1400.webp`, miniatura: `publico/${tagId}/${h}-320.webp` };
}
export const urlPublica = (imagem, variante) => `/midia/${imagem.id}.${hashCurto(imagem.sha256)}.${variante}.webp`;
export const REGEX_ARQUIVO_PUBLICO = /^(\d{1,9})\.([0-9a-f]{16})\.(g|m)\.webp$/;

// ---------- formato de resposta ----------
const publica = (r) => ({
  id: r.id, titulo: r.titulo, legenda: r.legenda, periodo_historico: r.periodo_historico, tipo_registro: r.tipo_registro,
  autor: r.autor, fonte: r.fonte, derivada: r.derivada_de != null, largura: Number(r.largura), altura: Number(r.altura),
  url: urlPublica(r, 'g'), miniatura_url: urlPublica(r, 'm'),
});
const admin = (r) => ({
  ...publica(r), status: r.status, ordem: r.ordem, derivada_de: r.derivada_de, sha256: r.sha256, mime_original: r.mime_original,
  bytes_original: Number(r.bytes_original), criado_em: r.criado_em, atualizado_em: r.atualizado_em, original_url: `/api/admin/imagens/${r.id}/original`,
});

// ---------- consultas ----------
export async function imagensDoPonto(tagId) {
  return (await q('SELECT * FROM ponto_imagens WHERE tag_id = ? ORDER BY ordem, id', [tagId])).map(admin);
}
export async function imagensPublicasDoPonto(tagId) {
  return (await q("SELECT * FROM ponto_imagens WHERE tag_id = ? AND status = 'aprovado' ORDER BY ordem, id", [tagId])).map(publica);
}
export async function imagemPorId(id) {
  const [r] = await q('SELECT * FROM ponto_imagens WHERE id = ?', [id]);
  return r || null;
}
// Capa (miniatura da primeira foto aprovada) e quantidade por ponto, para o catálogo público.
export async function capasPorPonto() {
  const linhas = await q("SELECT id, tag_id, sha256 FROM ponto_imagens WHERE status = 'aprovado' ORDER BY tag_id, ordem, id");
  const mapa = new Map();
  for (const l of linhas) {
    const atual = mapa.get(l.tag_id);
    if (atual) atual.fotos += 1; else mapa.set(l.tag_id, { capa: urlPublica(l, 'm'), fotos: 1 });
  }
  return mapa;
}

// ---------- gravação ----------
export function dadosDaImagem(origem, { texto, opcional }) {
  const tipo = origem.tipo_registro === undefined || origem.tipo_registro === '' ? 'atual' : String(origem.tipo_registro);
  if (!TIPOS_REGISTRO.includes(tipo)) falha(400, 'tipo_registro_invalido');
  return {
    titulo: opcional(origem.titulo, 120),
    legenda: opcional(origem.legenda, 400),
    periodo_historico: opcional(origem.periodo_historico, 60),
    tipo_registro: tipo,
    autor: opcional(origem.autor, 120),
    fonte: opcional(origem.fonte, 200),
  };
}

function exigirArmazenamento(armazenamento) {
  if (armazenamento.tipo === 'desligado' || armazenamento.tipo === 'r2-incompleto') falha(503, 'midia_sem_armazenamento', { motivo: armazenamento.descricao });
}

async function apagarObjetos(armazenamento, chaves) {
  const erros = [];
  for (const chave of chaves) {
    try { await armazenamento.remover(chave); } catch (erro) { erros.push(`${chave}: ${erro.message}`); }
  }
  return erros;
}

export async function enviarImagem({ armazenamento, tag, buffer, dados }) {
  exigirArmazenamento(armazenamento);
  let proc;
  try { proc = await processarImagem(buffer); } catch (erro) {
    if (erro instanceof ImagemInvalida) falha(STATUS_HTTP_DA_IMAGEM[erro.codigo] || 400, erro.codigo, erro.extra);
    throw erro;
  }
  const [repetida] = await q('SELECT id, status FROM ponto_imagens WHERE tag_id = ? AND sha256 = ?', [tag.id, proc.sha256]);
  if (repetida) falha(409, 'imagem_ja_enviada', { id: repetida.id, status: repetida.status });

  const k = chavesDaImagem(tag.id, proc.sha256, proc.ext);
  try {
    // O original vai primeiro e sem nenhuma alteração: é a referência do acervo.
    await armazenamento.gravar(k.original, buffer, proc.mime);
    await armazenamento.gravar(k.grande, proc.grande.buffer, 'image/webp');
    await armazenamento.gravar(k.miniatura, proc.miniatura.buffer, 'image/webp');
  } catch (erro) {
    await apagarObjetos(armazenamento, [k.original, k.grande, k.miniatura]);
    console.error(JSON.stringify({ type: 'midia_erro', etapa: 'gravar', erro: erro.message }));
    falha(502, 'midia_falha_armazenamento');
  }
  const [{ prox }] = await q('SELECT COALESCE(MAX(ordem), 0) + 1 AS prox FROM ponto_imagens WHERE tag_id = ?', [tag.id]);
  let id;
  try {
    const [r] = await pool.query(
      `INSERT INTO ponto_imagens (tag_id, arquivo_original, arquivo_otimizado, miniatura, sha256, mime_original, bytes_original, largura, altura,
        titulo, legenda, periodo_historico, tipo_registro, autor, fonte, status, ordem)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?)`,
      [tag.id, k.original, k.grande, k.miniatura, proc.sha256, proc.mime, proc.bytes, proc.largura, proc.altura,
        dados.titulo, dados.legenda, dados.periodo_historico, dados.tipo_registro, dados.autor, dados.fonte, prox]);
    id = r.insertId;
  } catch (erro) {
    // Se já existe uma linha com esta mesma foto, os objetos pertencem a ela e não podem ser apagados.
    const [existe] = await q('SELECT id FROM ponto_imagens WHERE tag_id = ? AND sha256 = ?', [tag.id, proc.sha256]);
    if (!existe) await apagarObjetos(armazenamento, [k.original, k.grande, k.miniatura]);
    if (erro?.code === 'ER_DUP_ENTRY') falha(409, 'imagem_ja_enviada', { id: existe?.id });
    throw erro;
  }
  return admin(await imagemPorId(id));
}

export async function atualizarImagem(imagem, dados, derivadaDe) {
  let derivada = imagem.derivada_de;
  if (derivadaDe !== undefined) {
    if (derivadaDe === null || derivadaDe === '') derivada = null;
    else {
      const alvo = await imagemPorId(Number(derivadaDe));
      if (!alvo || alvo.tag_id !== imagem.tag_id || alvo.id === imagem.id) falha(400, 'derivada_invalida');
      derivada = alvo.id;
    }
  }
  if (dados.tipo_registro !== 'restauracao') derivada = null;
  await q(`UPDATE ponto_imagens SET titulo = ?, legenda = ?, periodo_historico = ?, tipo_registro = ?, autor = ?, fonte = ?, derivada_de = ? WHERE id = ?`,
    [dados.titulo, dados.legenda, dados.periodo_historico, dados.tipo_registro, dados.autor, dados.fonte, derivada, imagem.id]);
  return admin(await imagemPorId(imagem.id));
}

// Fotos históricas e restauradas precisam de crédito (autor ou fonte) antes de ir ao ar; "forcar" libera e fica na auditoria.
export function pendenciasDeAprovacao(imagem) {
  const faltas = [];
  if (['historica', 'restauracao'].includes(imagem.tipo_registro) && !imagem.autor && !imagem.fonte) faltas.push('autor ou fonte');
  return faltas;
}

export async function mudarStatus(imagem, status, { forcar = false } = {}) {
  if (!STATUS_IMAGEM.includes(status)) falha(400, 'status_invalido');
  let forcado = false;
  if (status === 'aprovado' && imagem.status !== 'aprovado') {
    const faltas = pendenciasDeAprovacao(imagem);
    if (faltas.length) {
      if (!forcar) falha(409, 'credito_pendente', { faltando: faltas });
      forcado = true;
    }
  }
  await q('UPDATE ponto_imagens SET status = ? WHERE id = ?', [status, imagem.id]);
  return { forcado, imagem: admin(await imagemPorId(imagem.id)) };
}

export async function reordenar(tagId, ids) {
  const atuais = await q('SELECT id FROM ponto_imagens WHERE tag_id = ?', [tagId]);
  if (!atuais.length || atuais.length !== ids.length || new Set(ids).size !== ids.length || !ids.every((i) => atuais.some((a) => a.id === i))) falha(400, 'ordem_invalida');
  for (let i = 0; i < ids.length; i += 1) await q('UPDATE ponto_imagens SET ordem = ? WHERE id = ? AND tag_id = ?', [i + 1, ids[i], tagId]);
}

// Exclusão definitiva: só de foto que não está no ar, e os arquivos saem PRIMEIRO. Se o armazenamento falhar, a linha fica
// (a administração tenta de novo), para nunca sobrar no bucket um original com GPS de uma foto que "já foi excluída".
export async function excluirImagem({ armazenamento, imagem }) {
  if (imagem.status === 'aprovado') falha(409, 'foto_aprovada');
  exigirArmazenamento(armazenamento);
  const erros = await apagarObjetos(armazenamento, [imagem.arquivo_original, imagem.arquivo_otimizado, imagem.miniatura]);
  if (erros.length) {
    console.error(JSON.stringify({ type: 'midia_erro', etapa: 'excluir', imagem: imagem.id, erros }));
    falha(502, 'midia_falha_armazenamento');
  }
  await q('DELETE FROM ponto_imagens WHERE id = ?', [imagem.id]);
}

// Arquivo público (somente foto aprovada de ponto que não está arquivado). Devolve null para tudo o que não deve aparecer.
export async function abrirArquivoPublico({ armazenamento, arquivo }) {
  const m = REGEX_ARQUIVO_PUBLICO.exec(String(arquivo || ''));
  if (!m) return null;
  const [r] = await q(`SELECT i.* FROM ponto_imagens i JOIN tags t ON t.id = i.tag_id JOIN rotas ro ON ro.id = t.rota_id
    WHERE i.id = ? AND i.status = 'aprovado' AND t.status <> 'arquivado' AND ro.status <> 'arquivado'`, [Number(m[1])]);
  if (!r || hashCurto(r.sha256) !== m[2]) return null;
  return armazenamento.ler(m[3] === 'g' ? r.arquivo_otimizado : r.miniatura);
}

export async function abrirOriginal({ armazenamento, imagem }) {
  const lido = await armazenamento.ler(imagem.arquivo_original);
  return lido ? { ...lido, mime: imagem.mime_original } : null;
}
