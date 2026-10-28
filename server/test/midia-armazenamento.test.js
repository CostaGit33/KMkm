import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { criarArmazenamento, criarLocal, criarR2, validarChave } from '../midia/armazenamento.js';

const lerTudo = async (stream) => { const partes = []; for await (const parte of stream) partes.push(Buffer.from(parte)); return Buffer.concat(partes); };

test('chaves: só o formato gerado pelo servidor é aceito', () => {
  for (const boa of ['originais/12/abc123.jpg', 'publico/3/ffee-1400.webp', '_verificacao/ab12.txt']) assert.equal(validarChave(boa), boa);
  for (const ruim of ['', '../fora.jpg', 'a/../b', '/abs', 'a//b', 'Maiuscula.jpg', 'pasta/', 'com espaço.jpg', 'a\\b', 'x'.repeat(300), null, undefined, 5]) {
    assert.throws(() => validarChave(ruim), /chave_invalida/, String(ruim));
  }
});

test('local: grava, lê, regrava e remove; chave inexistente devolve null', async () => {
  const pasta = await mkdtemp(path.join(os.tmpdir(), 'mais1km-teste-'));
  try {
    const a = criarLocal(pasta);
    assert.equal(a.tipo, 'local');
    await a.gravar('originais/1/a.jpg', Buffer.from('um'));
    await a.gravar('originais/1/a.jpg', Buffer.from('dois'));
    const lido = await a.ler('originais/1/a.jpg');
    assert.equal(lido.tamanho, 4);
    assert.equal((await lerTudo(lido.stream)).toString(), 'dois');
    assert.equal(await a.ler('originais/1/nao-existe.jpg'), null);
    await a.remover('originais/1/a.jpg');
    await a.remover('originais/1/a.jpg'); // remover de novo não dá erro
    assert.equal(await a.ler('originais/1/a.jpg'), null);
    await assert.rejects(() => a.gravar('../fora.txt', Buffer.from('x')), /chave_invalida/);
    assert.deepEqual({ ok: (await a.verificar()).ok, tipo: (await a.verificar()).tipo }, { ok: true, tipo: 'local' });
  } finally { await rm(pasta, { recursive: true, force: true }); }
});

test('escolha do destino pelo ambiente', async () => {
  const completo = { R2_BUCKET: 'b', R2_ACCESS_KEY_ID: 'k', R2_SECRET_ACCESS_KEY: 's', R2_ACCOUNT_ID: 'abc123' };
  const r2 = criarArmazenamento(completo);
  assert.equal(r2.tipo, 'r2');
  assert.equal(r2.descricao, 'abc123.r2.cloudflarestorage.com/b');
  assert.equal(criarArmazenamento({ ...completo, R2_ACCOUNT_ID: '', R2_ENDPOINT: 'https://exemplo.r2.cloudflarestorage.com/' }).descricao, 'exemplo.r2.cloudflarestorage.com/b');

  // configuração pela metade nunca cai no disco em silêncio
  const parcial = criarArmazenamento({ R2_BUCKET: 'b', MEDIA_DIR: '/tmp/x', NODE_ENV: 'production' });
  assert.equal(parcial.tipo, 'r2-incompleto');
  assert.match(parcial.descricao, /R2_ACCESS_KEY_ID.*R2_SECRET_ACCESS_KEY.*R2_ACCOUNT_ID ou R2_ENDPOINT/);
  await assert.rejects(() => parcial.gravar('a/b.jpg', Buffer.from('x')), /midia_sem_armazenamento/);
  assert.equal(await parcial.ler('a/b.jpg'), null);
  assert.equal(criarArmazenamento({ ...completo, R2_ENDPOINT: 'isto não é url' }).tipo, 'r2-incompleto');

  assert.equal(criarArmazenamento({ MEDIA_DIR: '/dados/midia', NODE_ENV: 'production' }).tipo, 'local');
  const semNada = criarArmazenamento({ NODE_ENV: 'production' });
  assert.equal(semNada.tipo, 'desligado');
  await assert.rejects(() => semNada.gravar('a/b.jpg', Buffer.from('x')), /midia_sem_armazenamento/);
  assert.equal((await semNada.verificar()).ok, false);
  assert.equal(criarArmazenamento({}).tipo, 'local'); // desenvolvimento e testes
});

// Servidor S3 de mentira (estilo caminho: /bucket/chave) que confere a assinatura AWS4 do R2: região "auto", serviço "s3".
function servidorS3({ bucket, accessKeyId }) {
  const objetos = new Map();
  const pedidos = [];
  const servidor = http.createServer(async (req, res) => {
    const partes = [];
    for await (const parte of req) partes.push(parte);
    const corpo = Buffer.concat(partes);
    const auth = String(req.headers.authorization || '');
    pedidos.push({ metodo: req.method, url: req.url, auth, data: req.headers['x-amz-date'], hash: req.headers['x-amz-content-sha256'], tipo: req.headers['content-type'] });
    const escopo = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/auto\/s3\/aws4_request, SignedHeaders=[^,]+, Signature=[0-9a-f]{64}$/.exec(auth);
    if (!escopo || escopo[1] !== accessKeyId) { res.writeHead(403, { 'Content-Type': 'application/xml' }); return res.end('<Error><Code>SignatureDoesNotMatch</Code></Error>'); }
    const prefixo = `/${bucket}/`;
    if (!req.url.startsWith(prefixo)) { res.writeHead(404); return res.end('<Error><Code>NoSuchBucket</Code></Error>'); }
    const chave = decodeURIComponent(req.url.slice(prefixo.length).split('?')[0]);
    if (req.method === 'PUT') { objetos.set(chave, { corpo, tipo: req.headers['content-type'] }); res.writeHead(200, { ETag: '"x"' }); return res.end(); }
    if (req.method === 'GET') {
      const o = objetos.get(chave);
      if (!o) { res.writeHead(404, { 'Content-Type': 'application/xml' }); return res.end('<Error><Code>NoSuchKey</Code></Error>'); }
      res.writeHead(200, { 'Content-Type': o.tipo, 'Content-Length': o.corpo.length });
      return res.end(o.corpo);
    }
    if (req.method === 'DELETE') { objetos.delete(chave); res.writeHead(204); return res.end(); }
    res.writeHead(405); return res.end();
  });
  return new Promise((resolve) => servidor.listen(0, '127.0.0.1', () => resolve({ servidor, objetos, pedidos, endpoint: `http://127.0.0.1:${servidor.address().port}` })));
}

test('r2: grava, lê, remove e verifica contra um S3 de teste, com assinatura AWS4 (auto/s3)', async () => {
  const s3 = await servidorS3({ bucket: 'mais1km-media', accessKeyId: 'AKIDTESTE' });
  try {
    const a = criarR2({ endpoint: s3.endpoint, bucket: 'mais1km-media', accessKeyId: 'AKIDTESTE', secretAccessKey: 'segredo-de-teste' });
    const bytes = Buffer.from(Array.from({ length: 5000 }, (_, i) => i % 251));
    await a.gravar('publico/7/abc-1400.webp', bytes, 'image/webp');
    assert.ok(s3.objetos.get('publico/7/abc-1400.webp').corpo.equals(bytes));
    assert.equal(s3.objetos.get('publico/7/abc-1400.webp').tipo, 'image/webp');
    assert.ok(s3.pedidos[0].hash, 'o pedido leva x-amz-content-sha256 (o corpo vai por HTTPS, com payload não assinado)');

    const lido = await a.ler('publico/7/abc-1400.webp');
    assert.equal(lido.tamanho, 5000);
    assert.ok((await lerTudo(lido.stream)).equals(bytes));
    assert.equal(await a.ler('publico/7/nao-existe.webp'), null);

    await a.remover('publico/7/abc-1400.webp');
    assert.equal(s3.objetos.size, 0);
    await a.remover('publico/7/abc-1400.webp'); // já apagado: tudo bem

    const v = await a.verificar();
    assert.equal(v.ok, true);
    assert.equal(s3.objetos.size, 0, 'a verificação não deixa lixo no bucket');
  } finally { s3.servidor.close(); }
});

test('r2: credencial errada vira erro claro, sem vazar segredo', async () => {
  const s3 = await servidorS3({ bucket: 'mais1km-media', accessKeyId: 'AKIDTESTE' });
  try {
    const a = criarR2({ endpoint: s3.endpoint, bucket: 'mais1km-media', accessKeyId: 'OUTRA', secretAccessKey: 'segredo-de-teste' });
    await assert.rejects(() => a.gravar('a/b.jpg', Buffer.from('x'), 'image/jpeg'), (e) => e.message === 'r2_gravar_403' && e.status === 403);
    const v = await a.verificar();
    assert.deepEqual({ ok: v.ok, tipo: v.tipo, erro: v.erro }, { ok: false, tipo: 'r2', erro: 'r2_gravar_403' });
    assert.ok(!JSON.stringify(v).includes('segredo-de-teste'));
  } finally { s3.servidor.close(); }
});
