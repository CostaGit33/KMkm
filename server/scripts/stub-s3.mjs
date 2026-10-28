// S3 de mentira (estilo caminho, /bucket/chave) para testar o armazenamento R2 sem internet nem credenciais reais.
// Confere a forma da assinatura AWS4 do R2 (região "auto", serviço "s3") e o ID da chave. Guarda tudo em memória.
//   node server/scripts/stub-s3.mjs [porta=9111] [bucket=mais1km-media] [accessKeyId=AKIDTESTE]
// GET /__lista devolve as chaves guardadas (só para os testes).
import http from 'node:http';

const porta = Number(process.argv[2] || 9111);
const bucket = process.argv[3] || 'mais1km-media';
const accessKeyId = process.argv[4] || 'AKIDTESTE';
const objetos = new Map();

http.createServer(async (req, res) => {
  if (req.url === '/__lista') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify([...objetos.keys()].sort())); }
  const partes = [];
  for await (const parte of req) partes.push(parte);
  const corpo = Buffer.concat(partes);
  const escopo = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/auto\/s3\/aws4_request, SignedHeaders=[^,]+, Signature=[0-9a-f]{64}$/.exec(String(req.headers.authorization || ''));
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
}).listen(porta, '127.0.0.1', () => console.log(`S3 de teste em http://127.0.0.1:${porta} (bucket ${bucket})`));
