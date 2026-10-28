// Rotas públicas das fotos: só o que foi aprovado e só as cópias para exibição (nunca o original).
import { pipeline } from 'node:stream';
import { armazenamentoDeMidia } from './estado.js';
import { abrirArquivoPublico, imagensPublicasDoPonto } from './servico.js';
import { q } from '../db/database.js';

export function rotasPublicasMidia(app, { limit, wrap }) {
  // O endereço leva o id e 16 caracteres do hash do arquivo: nunca muda de conteúdo, então o cache pode ser de um ano.
  app.get('/midia/:arquivo', limit({ windowMs: 60 * 1000, max: 600, name: 'midia' }), wrap(async (req, res) => {
    const lido = await abrirArquivoPublico({ armazenamento: armazenamentoDeMidia(), arquivo: req.params.arquivo });
    if (!lido) return res.status(404).type('text/plain').send('Não encontrado');
    res.setHeader('Content-Type', 'image/webp');
    if (lido.tamanho) res.setHeader('Content-Length', String(lido.tamanho));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    pipeline(lido.stream, res, () => { /* cliente desistiu no meio */ });
  }));

  app.get('/api/pontos/:codigo/imagens', limit({ windowMs: 60 * 1000, max: 120, name: 'midia-lista' }), wrap(async (req, res) => {
    const [tag] = await q(`SELECT t.id FROM tags t JOIN rotas r ON r.id = t.rota_id WHERE t.codigo = ? AND t.status <> 'arquivado' AND r.status <> 'arquivado'`, [String(req.params.codigo || '').toLowerCase()]);
    if (!tag) return res.status(404).json({ erro: 'ponto_inexistente' });
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ imagens: await imagensPublicasDoPonto(tag.id) });
  }));
}
