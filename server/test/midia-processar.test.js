import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { ImagemInvalida, LIMITES, processarImagem } from '../midia/processar.js';

const cor = { r: 120, g: 160, b: 90 };
const base = (largura, altura) => sharp({ create: { width: largura, height: altura, channels: 3, background: cor } });
const falha = async (buffer, codigo, limites) => {
  await assert.rejects(() => processarImagem(buffer, limites), (erro) => erro instanceof ImagemInvalida && erro.codigo === codigo, `esperava ${codigo}`);
};

test('foto do celular: GPS e EXIF somem das cópias, a orientação é aplicada e o original não muda', async () => {
  // 3000x2000 gravada "deitada" com orientação EXIF 6 (girar 90°) e coordenadas GPS no arquivo.
  const original = await base(3000, 2000).jpeg()
    .withExif({ IFD0: { Copyright: 'teste' }, IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '16/1 22/1 30/1', GPSLongitudeRef: 'W', GPSLongitude: '39/1 35/1 0/1' } })
    .withMetadata({ orientation: 6 }).toBuffer();
  const antes = await sharp(original).metadata();
  assert.ok(antes.exif, 'a foto de teste precisa ter EXIF para o teste valer');
  const copiaDoOriginal = Buffer.from(original);

  const r = await processarImagem(original);
  assert.ok(original.equals(copiaDoOriginal), 'o buffer recebido não pode ser alterado');
  assert.equal(r.sha256, crypto.createHash('sha256').update(original).digest('hex'));
  assert.equal(r.bytes, original.length);
  assert.equal(r.mime, 'image/jpeg');
  assert.equal(r.ext, 'jpg');
  assert.deepEqual([r.largura, r.altura], [2000, 3000], 'dimensões de exibição já com a orientação');

  for (const [nome, copia, lado] of [['grande', r.grande, 1400], ['miniatura', r.miniatura, 320]]) {
    const meta = await sharp(copia.buffer).metadata();
    assert.equal(meta.format, 'webp', nome);
    assert.equal(meta.exif, undefined, `${nome} não pode carregar EXIF/GPS`);
    assert.equal(meta.xmp, undefined, `${nome} não pode carregar XMP`);
    assert.equal(Math.max(meta.width, meta.height), lado, `${nome}: lado maior`);
    assert.ok(meta.height > meta.width, `${nome}: ficou em pé (orientação aplicada)`);
    assert.deepEqual([copia.largura, copia.altura], [meta.width, meta.height]);
  }
  assert.ok(r.miniatura.buffer.length < r.grande.buffer.length);
});

test('imagem pequena não é ampliada e PNG com transparência continua com transparência', async () => {
  const png = await sharp({ create: { width: 800, height: 600, channels: 4, background: { ...cor, alpha: 0.5 } } }).png().toBuffer();
  const r = await processarImagem(png);
  assert.equal(r.mime, 'image/png');
  assert.deepEqual([r.grande.largura, r.grande.altura], [800, 600]);
  assert.deepEqual([r.miniatura.largura, r.miniatura.altura], [320, 240]);
  assert.equal((await sharp(r.grande.buffer).metadata()).hasAlpha, true);
});

test('aceita WebP', async () => {
  const webp = await base(900, 900).webp().toBuffer();
  const r = await processarImagem(webp);
  assert.equal(r.formato, 'webp');
  assert.equal(r.ext, 'webp');
});

test('recusa o que não é foto utilizável', async () => {
  await falha(Buffer.from('isto não é uma imagem'), 'imagem_invalida');
  await falha(Buffer.alloc(0), 'imagem_vazia');
  await falha(Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n'), 'imagem_invalida');
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><script>alert(1)</script><rect width="800" height="800"/></svg>');
  await falha(svg, 'formato_nao_aceito');
  const gif = await base(800, 600).gif().toBuffer();
  await falha(gif, 'formato_nao_aceito');
  const tiff = await base(800, 600).tiff().toBuffer();
  await falha(tiff, 'formato_nao_aceito');
  const quadro = (fundo) => sharp({ create: { width: 500, height: 500, channels: 3, background: fundo } }).png().toBuffer();
  const animada = await sharp([await quadro('#ff0000'), await quadro('#0000ff')], { join: { animated: true } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  await falha(animada, 'imagem_animada');
  await falha(await base(100, 100).jpeg().toBuffer(), 'imagem_pequena');
  const truncada = (await base(2000, 1500).jpeg().toBuffer()).subarray(0, 400);
  await falha(truncada, 'imagem_invalida');
});

test('respeita os limites de tamanho do arquivo e de pixels', async () => {
  const jpeg = await base(2000, 1000).jpeg().toBuffer();
  await falha(jpeg, 'imagem_grande_demais', { ...LIMITES, maxBytes: 1000 });
  await falha(jpeg, 'imagem_grande_demais', { ...LIMITES, maxPixels: 1_000_000 });
  assert.ok((await processarImagem(jpeg)).grande.buffer.length > 0);
});
