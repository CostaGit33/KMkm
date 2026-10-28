// Tratamento de cada foto enviada. Regras (docs/midia.md):
//  - o ORIGINAL é guardado byte a byte, sem filtro, reconstrução, colorização ou correção automática (é a referência do acervo);
//  - as cópias públicas (grande e miniatura) só mudam de tamanho e de formato (WebP) e giram conforme a orientação da câmera;
//  - nenhum metadado entra nas cópias públicas (EXIF, GPS, XMP, perfil): o sharp só os mantém quando pedido, e aqui nunca é pedido.
import crypto from 'node:crypto';
import sharp from 'sharp';

sharp.cache({ memory: 64, files: 0, items: 16 });
sharp.concurrency(2);

export const LIMITES = {
  maxBytes: Math.max(1, Number(process.env.MIDIA_MAX_MB) || 15) * 1024 * 1024,
  maxPixels: 80_000_000,
  minLado: 400,
  ladoGrande: 1400,
  ladoMiniatura: 320,
  qualidadeGrande: 82,
  qualidadeMiniatura: 78,
};
const FORMATOS = { jpeg: { mime: 'image/jpeg', ext: 'jpg' }, png: { mime: 'image/png', ext: 'png' }, webp: { mime: 'image/webp', ext: 'webp' } };

export class ImagemInvalida extends Error {
  constructor(codigo, extra = {}) { super(codigo); this.codigo = codigo; this.extra = extra; }
}

// Formatos que reconhecemos e recusamos sem sequer abrir (SVG pode carregar script e referências externas).
function formatoRecusado(buffer) {
  const inicio = buffer.subarray(0, 512).toString('latin1').trimStart().toLowerCase();
  if (inicio.startsWith('<svg') || inicio.startsWith('<?xml') || inicio.startsWith('<!doctype svg')) return true;
  if (inicio.startsWith('gif8')) return true;
  const m = buffer.subarray(0, 4).toString('latin1');
  return m === 'II*\0' || m === 'MM\0*';
}

const abrir = (buffer) => sharp(buffer, { limitInputPixels: false });
async function derivar(buffer, lado, qualidade, maxPixels) {
  const { data, info } = await sharp(buffer, { limitInputPixels: maxPixels }).rotate()
    .resize({ width: lado, height: lado, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: qualidade, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, largura: info.width, altura: info.height };
}

export async function processarImagem(buffer, limites = LIMITES) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new ImagemInvalida('imagem_vazia');
  if (buffer.length > limites.maxBytes) throw new ImagemInvalida('imagem_grande_demais', { maximo_mb: Math.round(limites.maxBytes / 1048576) });
  if (formatoRecusado(buffer)) throw new ImagemInvalida('formato_nao_aceito');
  let meta;
  try { meta = await abrir(buffer).metadata(); } catch { throw new ImagemInvalida('imagem_invalida'); }
  const formato = FORMATOS[meta.format];
  if (!formato) throw new ImagemInvalida('formato_nao_aceito');
  if ((meta.pages || 1) > 1) throw new ImagemInvalida('imagem_animada');
  if (!meta.width || !meta.height) throw new ImagemInvalida('imagem_invalida');
  if (meta.width * meta.height > limites.maxPixels) throw new ImagemInvalida('imagem_grande_demais', { maximo_mp: Math.round(limites.maxPixels / 1e6) });
  const girada = (meta.orientation || 1) >= 5;
  const largura = girada ? meta.height : meta.width;
  const altura = girada ? meta.width : meta.height;
  if (Math.max(largura, altura) < limites.minLado) throw new ImagemInvalida('imagem_pequena', { minimo: limites.minLado });
  try {
    // failOn padrão do sharp ('warning'): arquivo truncado ou corrompido é recusado, em vez de virar uma foto cinza pela metade.
    const grande = await derivar(buffer, limites.ladoGrande, limites.qualidadeGrande, limites.maxPixels);
    const miniatura = await derivar(buffer, limites.ladoMiniatura, limites.qualidadeMiniatura, limites.maxPixels);
    return {
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      formato: meta.format, mime: formato.mime, ext: formato.ext, bytes: buffer.length,
      largura, altura, grande, miniatura,
    };
  } catch { throw new ImagemInvalida('imagem_invalida'); }
}
