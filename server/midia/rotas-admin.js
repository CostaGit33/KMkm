// Rotas de administração das fotos dos pontos (sob /api/admin, só para papel 'admin').
// Envio: corpo = o arquivo da foto (image/jpeg, image/png ou image/webp), metadados na query. Toda foto entra "pendente".
import express from 'express';
import { pipeline } from 'node:stream';
import { q } from '../db/database.js';
import { LIMITES } from './processar.js';
import { armazenamentoDeMidia } from './estado.js';
import * as servico from './servico.js';

const falha = (status, erro, extra) => { throw new servico.FalhaMidia(status, erro, extra); };
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

function entregar(res, lido, { tipo, nome, anexo = false }) {
  res.setHeader('Content-Type', tipo || lido.contentType || 'application/octet-stream');
  if (lido.tamanho) res.setHeader('Content-Length', String(lido.tamanho));
  res.setHeader('Cache-Control', 'private, no-store');
  if (anexo) res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
  pipeline(lido.stream, res, () => { /* cliente desistiu no meio: nada a fazer */ });
}

export function rotasAdminMidia(router, { h, registrar, texto, opcional, limit }) {
  const corpoFoto = express.raw({ type: TIPOS_ACEITOS, limit: LIMITES.maxBytes + 4096 });
  const tagPorCodigo = async (codigo) => {
    const [tag] = await q('SELECT id, codigo, nome, status FROM tags WHERE codigo = ?', [String(codigo || '').toLowerCase()]);
    if (!tag) falha(404, 'ponto_inexistente');
    return tag;
  };
  const imagemOuErro = async (id) => {
    const imagem = Number.isInteger(Number(id)) ? await servico.imagemPorId(Number(id)) : null;
    if (!imagem) falha(404, 'foto_inexistente');
    return imagem;
  };

  // Situação do armazenamento (sem tocar nele; ?verificar=1 faz o teste de gravar, ler e apagar).
  router.get('/midia/estado', h(async (req, res) => {
    const a = armazenamentoDeMidia();
    const base = { tipo: a.tipo, descricao: a.descricao, pronto: a.tipo === 'r2' || a.tipo === 'local', limite_mb: Math.round(LIMITES.maxBytes / 1048576), duravel: a.tipo === 'r2' || (a.tipo === 'local' && Boolean(process.env.MEDIA_DIR)) };
    if (req.query.verificar === '1') {
      const v = await a.verificar();
      await registrar(req, 'foto.verificar_armazenamento', a.tipo, v.ok ? 'ok' : v.erro);
      return res.json({ ...base, verificacao: { ok: v.ok, erro: v.erro || null } });
    }
    res.json(base);
  }));

  router.get('/pontos/:codigo/imagens', h(async (req, res) => {
    const tag = await tagPorCodigo(req.params.codigo);
    res.json({ ponto: { codigo: tag.codigo, nome: tag.nome }, armazenamento: { tipo: armazenamentoDeMidia().tipo, pronto: ['r2', 'local'].includes(armazenamentoDeMidia().tipo) }, carta_imagem_id: await servico.arteDaCartaDoPonto(tag.id), carta_imagem_id: await servico.arteDaCartaDoPonto(tag.id), imagens: await servico.imagensDoPonto(tag.id) });
  }));

  router.post('/pontos/:codigo/imagens', limit({ windowMs: 10 * 60 * 1000, max: 40, name: 'midia-envio', chave: (req) => req.conta?.id }), corpoFoto, h(async (req, res) => {
    const tag = await tagPorCodigo(req.params.codigo);
    if (!Buffer.isBuffer(req.body)) falha(415, 'formato_nao_aceito', { aceitos: TIPOS_ACEITOS });
    const dados = servico.dadosDaImagem(req.query, { texto, opcional });
    const imagem = await servico.enviarImagem({ armazenamento: armazenamentoDeMidia(), tag, buffer: req.body, dados });
    await registrar(req, 'foto.enviar', tag.codigo, `#${imagem.id} ${imagem.tipo_registro} · ${imagem.sha256.slice(0, 12)}`);
    res.status(201).json({ imagem });
  }));

  router.put('/pontos/:codigo/imagens/ordem', h(async (req, res) => {
    const tag = await tagPorCodigo(req.params.codigo);
    const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).map(Number);
    await servico.reordenar(tag.id, ids);
    await registrar(req, 'foto.ordem', tag.codigo, ids.join(','));
    res.json({ ok: true });
  }));

  router.put('/imagens/:id', h(async (req, res) => {
    const imagem = await imagemOuErro(req.params.id);
    const dados = servico.dadosDaImagem(req.body, { texto, opcional });
    const atualizada = await servico.atualizarImagem(imagem, dados, req.body.derivada_de);
    await registrar(req, 'foto.editar', `#${imagem.id}`, atualizada.titulo || atualizada.tipo_registro);
    res.json({ imagem: atualizada });
  }));

  router.post('/imagens/:id/status', h(async (req, res) => {
    const imagem = await imagemOuErro(req.params.id);
    const { forcado, imagem: atualizada } = await servico.mudarStatus(imagem, String(req.body.status || ''), { forcar: req.body.forcar === true });
    await registrar(req, forcado ? 'foto.aprovada_sem_credito' : `foto.${atualizada.status}`, `#${imagem.id}`, forcado ? `faltava: ${servico.pendenciasDeAprovacao(imagem).join(', ')}` : atualizada.titulo || atualizada.tipo_registro);
    res.json({ imagem: atualizada });
  }));

  // Usar (ou deixar de usar) a foto aprovada como arte da carta do ponto.
  router.post('/imagens/:id/carta', h(async (req, res) => {
    const imagem = await imagemOuErro(req.params.id);
    const usar = req.body.usar !== false;
    await servico.definirArteDaCarta(imagem, usar);
    await registrar(req, usar ? 'foto.carta' : 'foto.carta_removida', `#${imagem.id}`, imagem.titulo || imagem.tipo_registro);
    res.json({ ok: true, carta_imagem_id: usar ? imagem.id : null });
  }));

  router.delete('/imagens/:id', h(async (req, res) => {
    const imagem = await imagemOuErro(req.params.id);
    await servico.excluirImagem({ armazenamento: armazenamentoDeMidia(), imagem });
    await registrar(req, 'foto.excluir', `#${imagem.id}`, imagem.sha256.slice(0, 12));
    res.json({ ok: true });
  }));

  // O original (com o EXIF que a câmera gravou) só sai para administradores, como download.
  router.get('/imagens/:id/original', h(async (req, res) => {
    const imagem = await imagemOuErro(req.params.id);
    const lido = await servico.abrirOriginal({ armazenamento: armazenamentoDeMidia(), imagem });
    if (!lido) falha(404, 'arquivo_ausente');
    const ext = imagem.arquivo_original.split('.').pop();
    entregar(res, lido, { tipo: lido.mime, nome: `foto-${imagem.id}-original.${ext}`, anexo: true });
  }));

  // Pré-visualização para o painel (v=g grande, v=m miniatura), inclusive de foto ainda pendente.
  router.get('/imagens/:id/arquivo', h(async (req, res) => {
    const imagem = await imagemOuErro(req.params.id);
    const lido = await armazenamentoDeMidia().ler(req.query.v === 'g' ? imagem.arquivo_otimizado : imagem.miniatura);
    if (!lido) falha(404, 'arquivo_ausente');
    entregar(res, lido, { tipo: 'image/webp' });
  }));
}
