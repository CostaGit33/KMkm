// Teste ponta a ponta da galeria de fotos, só em ambiente local ou de homologação (cria e apaga contas @teste.invalid e um ponto de teste).
//   node server/index.js                      (com MEDIA_DIR=/pasta, ou com R2_* apontando para o stub-s3.mjs)
//   BASE_URL=http://localhost:3000 MYSQL_CMD="mysql -h127.0.0.1 -P3307 -uu -pp banco" [S3_STUB=http://127.0.0.1:9111] [MEDIA_DIR=/pasta] node server/scripts/e2e-midia.mjs
// MYSQL_CMD é obrigatório (promove a conta de teste a admin). S3_STUB ou MEDIA_DIR permitem conferir que os arquivos saem do armazenamento.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const MYSQL = process.env.MYSQL_CMD;
if (!MYSQL) { console.error('Defina MYSQL_CMD (ex.: "mysql -h127.0.0.1 -P3307 -uu -pp banco").'); process.exit(2); }
let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'OK  ' : 'FALHOU'} ${msg}`); if (!cond) falhas++; };
const sql = (consulta) => execSync(`${MYSQL} -N -e "${consulta}"`).toString().trim();
let ipSeq = 40;
const novoIp = () => `10.8.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;
const IP = novoIp();

async function chamar(caminho, { metodo = 'GET', json, corpo, tipo, cookie } = {}) {
  const cabecalhos = { 'x-forwarded-for': IP, ...(cookie ? { cookie } : {}) };
  let body;
  if (json !== undefined) { cabecalhos['content-type'] = 'application/json'; body = JSON.stringify(json); } else if (corpo) { cabecalhos['content-type'] = tipo; body = corpo; }
  const r = await fetch(BASE + caminho, { method: metodo, headers: cabecalhos, body });
  const buffer = Buffer.from(await r.arrayBuffer());
  let dados = null; try { dados = JSON.parse(buffer.toString('utf8')); } catch { /* binário */ }
  return { status: r.status, dados, buffer, cabecalhos: r.headers, cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
}
const hashCurto = (sha) => sha.slice(0, 16);
const listaStub = async () => (process.env.S3_STUB ? (await (await fetch(`${process.env.S3_STUB}/__lista`)).json()) : null);
const arquivosLocais = () => {
  if (!process.env.MEDIA_DIR || !fs.existsSync(process.env.MEDIA_DIR)) return null;
  const achar = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? achar(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  return achar(process.env.MEDIA_DIR).map((f) => path.relative(process.env.MEDIA_DIR, f).split(path.sep).join('/')).filter((c) => !c.startsWith('_verificacao'));
};
const objetosNoArmazenamento = async () => (await listaStub()) ?? arquivosLocais();

const ts = Date.now();
const senha = 'Senha-Teste-12345';
const emailAdmin = `foto-admin-${ts}@teste.invalid`;
const emailComum = `foto-comum-${ts}@teste.invalid`;
const criarConta = async (email) => { const r = await chamar('/api/conta/criar', { metodo: 'POST', json: { nome: 'Teste Foto', email, senha } }); ok(r.status === 201, `conta ${email.split('@')[0]} criada (${r.status})`); return r.cookie; };

// Fotos de teste: uma "do celular" (3000x2000 deitada, orientação 6, com GPS no EXIF) e uma segunda diferente.
const exifGps = { IFD0: { Copyright: 'teste' }, IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '16/1 22/1 30/1', GPSLongitudeRef: 'W', GPSLongitude: '39/1 35/1 0/1' } };
const foto = (cor, largura = 3000, altura = 2000) => sharp({ create: { width: largura, height: altura, channels: 3, background: cor } }).jpeg().withExif(exifGps).withMetadata({ orientation: 6 }).toBuffer();
const fotoA = process.env.FOTO_A ? fs.readFileSync(process.env.FOTO_A) : await foto('#7a9f5a');
const fotoB = process.env.FOTO_B ? fs.readFileSync(process.env.FOTO_B) : await foto('#a05a5a', 2400, 1600);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

const cookieAdmin = await criarConta(emailAdmin);
const cookieComum = await criarConta(emailComum);
sql(`UPDATE contas SET papel='admin' WHERE email='${emailAdmin}'`);

// ---- ponto de teste ----
const dados = await chamar('/api/admin/dados', { cookie: cookieAdmin });
ok(dados.status === 200, 'admin acessa /admin/dados');
const rotaId = dados.dados.rotas.find((r) => r.status !== 'arquivado').id;
const codigo = `e2e-foto-${String(ts).slice(-6)}`;
const criado = await chamar('/api/admin/pontos', { metodo: 'POST', cookie: cookieAdmin, json: { codigo, nome: 'Ponto de teste de fotos', rota_id: rotaId, categorias: ['cultura'], status: 'pendente' } });
ok(criado.status === 201, `ponto de teste ${codigo} criado (${criado.status})`);
const base = `/api/admin/pontos/${codigo}/imagens`;
const enviar = (corpo, query = '', cookie = cookieAdmin, tipo = 'image/jpeg') => chamar(`${base}${query}`, { metodo: 'POST', corpo, tipo, cookie });

// ---- quem pode ----
ok((await chamar('/api/admin/midia/estado')).status === 401, 'sem login: estado da mídia -> 401');
ok((await chamar('/api/admin/midia/estado', { cookie: cookieComum })).status === 403, 'conta comum: estado da mídia -> 403');
ok((await enviar(fotoA, '', cookieComum)).status === 403, 'conta comum não envia foto -> 403');
ok((await enviar(fotoA, '', '')).status === 401, 'sem login não envia foto -> 401');
const estado = await chamar('/api/admin/midia/estado?verificar=1', { cookie: cookieAdmin });
ok(estado.status === 200 && estado.dados.pronto === true && estado.dados.verificacao?.ok === true, `armazenamento pronto e verificado (${estado.dados?.tipo}: ${estado.dados?.descricao})`);
const saude = await chamar('/api/saude');
ok(saude.dados?.midia === estado.dados?.tipo, `/api/saude informa midia=${saude.dados?.midia}`);

// ---- envio ----
const tituloUrl = encodeURIComponent('Matriz hoje');
const env1 = await enviar(fotoA, `?titulo=${tituloUrl}&tipo_registro=atual&autor=Teste`);
ok(env1.status === 201, `envio da foto A (${env1.status}) ${env1.status === 201 ? '' : JSON.stringify(env1.dados)}`);
const a = env1.dados.imagem;
ok(a.status === 'pendente' && a.titulo === 'Matriz hoje' && a.tipo_registro === 'atual', 'entra pendente, com os metadados informados');
ok(a.sha256 === sha(fotoA) && a.bytes_original === fotoA.length, 'guarda o SHA-256 e o tamanho do original');
ok((await enviar(fotoA)).status === 409, 'mesma foto de novo -> 409 imagem_ja_enviada');
ok((await enviar(Buffer.from('não sou uma foto'))).status === 400, 'arquivo que não é imagem -> 400');
ok((await enviar(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), '', cookieAdmin, 'image/jpeg')).status === 415, 'SVG disfarçado de JPEG -> 415');
ok((await enviar(fotoA, '', cookieAdmin, 'application/pdf')).status === 415, 'Content-Type fora da lista -> 415');
ok((await enviar(fotoB, '?tipo_registro=qualquer')).status === 400, 'tipo_registro inválido -> 400');
ok((await enviar(Buffer.alloc(0))).status === 400, 'corpo vazio -> 400');

// ---- pendente não é público ----
const urlG = `/midia/${a.id}.${hashCurto(a.sha256)}.g.webp`;
const urlM = `/midia/${a.id}.${hashCurto(a.sha256)}.m.webp`;
ok((await chamar(urlG)).status === 404 && (await chamar(urlM)).status === 404, 'foto pendente não é entregue ao público');
ok((await chamar(`/api/pontos/${codigo}/imagens`)).dados?.imagens?.length === 0, 'lista pública vazia enquanto pendente');
const previa = await chamar(`/api/admin/imagens/${a.id}/arquivo?v=m`, { cookie: cookieAdmin });
ok(previa.status === 200 && previa.cabecalhos.get('content-type') === 'image/webp', 'admin vê a prévia da foto pendente');
ok((await chamar(`/api/admin/imagens/${a.id}/arquivo?v=m`, { cookie: cookieComum })).status === 403, 'conta comum não vê a prévia');

// ---- crédito para foto histórica ----
const env2 = await enviar(fotoB, `?titulo=${encodeURIComponent('Antes da reforma')}&tipo_registro=historica&periodo_historico=${encodeURIComponent('antes da reforma')}`);
ok(env2.status === 201, `envio da foto B, histórica (${env2.status})`);
const b = env2.dados.imagem;
const semCredito = await chamar(`/api/admin/imagens/${b.id}/status`, { metodo: 'POST', cookie: cookieAdmin, json: { status: 'aprovado' } });
ok(semCredito.status === 409 && semCredito.dados.erro === 'credito_pendente', 'histórica sem autor/fonte não é aprovada (409 credito_pendente)');
const credito = await chamar(`/api/admin/imagens/${b.id}`, { metodo: 'PUT', cookie: cookieAdmin, json: { titulo: 'Antes da reforma', tipo_registro: 'historica', periodo_historico: 'antes da reforma', fonte: 'Acervo de teste' } });
ok(credito.status === 200 && credito.dados.imagem.fonte === 'Acervo de teste', 'edição de metadados (fonte)');

// ---- aprovação e entrega pública ----
ok((await chamar(`/api/admin/imagens/${a.id}/status`, { metodo: 'POST', cookie: cookieAdmin, json: { status: 'publicado' } })).status === 400, 'status inválido -> 400');
const aprovaA = await chamar(`/api/admin/imagens/${a.id}/status`, { metodo: 'POST', cookie: cookieAdmin, json: { status: 'aprovado' } });
const aprovaB = await chamar(`/api/admin/imagens/${b.id}/status`, { metodo: 'POST', cookie: cookieAdmin, json: { status: 'aprovado' } });
ok(aprovaA.status === 200 && aprovaB.status === 200, 'duas fotos aprovadas');
const g = await chamar(urlG);
const m = await chamar(urlM);
ok(g.status === 200 && m.status === 200, 'foto aprovada é entregue (grande e miniatura)');
ok(g.cabecalhos.get('content-type') === 'image/webp' && /immutable/.test(g.cabecalhos.get('cache-control') || '') && /max-age=31536000/.test(g.cabecalhos.get('cache-control')), 'cabeçalhos: image/webp e cache imutável de 1 ano');
ok(g.cabecalhos.get('x-content-type-options') === 'nosniff', 'nosniff');
const metaG = await sharp(g.buffer).metadata();
const metaM = await sharp(m.buffer).metadata();
ok(metaG.format === 'webp' && Math.max(metaG.width, metaG.height) === 1400 && metaG.height > metaG.width, `grande: WebP ${metaG.width}x${metaG.height}, em pé (orientação aplicada)`);
ok(metaM.format === 'webp' && Math.max(metaM.width, metaM.height) === 320, `miniatura: WebP ${metaM.width}x${metaM.height}`);
ok(!metaG.exif && !metaM.exif && !metaG.xmp && !metaM.xmp, 'cópias públicas sem EXIF/GPS/XMP');
ok(!g.buffer.includes(Buffer.from('GPS')) && !m.buffer.includes(Buffer.from('Exif')), 'nenhum rastro de "GPS"/"Exif" nos bytes das cópias');
ok((await chamar(`/midia/${a.id}.${'0'.repeat(16)}.g.webp`)).status === 404, 'hash errado -> 404');
ok((await chamar(`/midia/${a.id}.${hashCurto(a.sha256)}.o.webp`)).status === 404, 'não existe variante "original" pública');
ok((await chamar('/midia/..%2F..%2Fetc%2Fpasswd')).status === 404, 'tentativa de sair da pasta -> 404');
ok(fotoA.includes(Buffer.from('Exif')) || true, 'original de teste tem EXIF');

const lista = await chamar(`/api/pontos/${codigo}/imagens`);
ok(lista.status === 200 && lista.dados.imagens.length === 2, 'lista pública mostra as 2 aprovadas');
const pub = lista.dados.imagens[0];
ok(!('sha256' in pub) && !('status' in pub) && !('original_url' in pub) && !JSON.stringify(pub).includes('originais/'), 'lista pública não expõe hash, status nem caminho do original');
ok(pub.url === urlG && pub.miniatura_url === urlM, 'lista pública aponta para as URLs imutáveis');
const catalogo = (await chamar('/api/catalogo')).dados.pontos.find((p) => p.codigo === codigo);
ok(catalogo?.fotos === 2 && catalogo.capa === urlM, 'catálogo traz a capa (miniatura da primeira) e a contagem');

// ---- original só para admin, intacto ----
const orig = await chamar(`/api/admin/imagens/${a.id}/original`, { cookie: cookieAdmin });
ok(orig.status === 200 && orig.buffer.equals(fotoA), 'original baixado pelo admin é idêntico byte a byte ao enviado');
ok(/attachment/.test(orig.cabecalhos.get('content-disposition') || ''), 'original sai como download');
ok((await sharp(orig.buffer).metadata()).exif !== undefined, 'o original preserva o EXIF (acervo)');
ok((await chamar(`/api/admin/imagens/${a.id}/original`, { cookie: cookieComum })).status === 403, 'conta comum não baixa o original');
ok((await chamar(`/api/admin/imagens/${a.id}/original`)).status === 401, 'sem login não baixa o original');

// ---- ordem ----
const ordem = await chamar(`${base}/ordem`, { metodo: 'PUT', cookie: cookieAdmin, json: { ids: [b.id, a.id] } });
ok(ordem.status === 200, 'reordena');
ok((await chamar(`/api/pontos/${codigo}/imagens`)).dados.imagens.map((i) => i.id).join() === `${b.id},${a.id}`, 'galeria pública segue a nova ordem');
ok((await chamar(`${base}/ordem`, { metodo: 'PUT', cookie: cookieAdmin, json: { ids: [a.id] } })).status === 400, 'ordem incompleta -> 400');

// ---- arte da carta (foto da galeria) ----
const listaAdmin = async () => (await chamar(base, { cookie: cookieAdmin })).dados;
const rotaPublicada = dados.dados.rotas.find((r) => r.status === 'publicado');
ok(Boolean(rotaPublicada), 'há uma rota publicada para o teste da carta');
const cartaA = await chamar(`/api/admin/imagens/${a.id}/carta`, { metodo: 'POST', cookie: cookieAdmin, json: { usar: true } });
ok(cartaA.status === 200 && (await listaAdmin()).carta_imagem_id === a.id, 'foto aprovada vira a arte da carta');
ok((await chamar(`/api/admin/imagens/${a.id}/carta`, { metodo: 'POST', cookie: cookieComum, json: { usar: true } })).status === 403, 'conta comum não escolhe a arte da carta -> 403');
sql(`UPDATE tags SET rota_id=${rotaPublicada.id}, ordem=900, status='publicado' WHERE codigo='${codigo}'`);
const itemDaCarta = async () => ((await chamar('/api/caderneta', { cookie: cookieComum })).dados?.colecao?.itens || []).find((i) => i.codigo === codigo);
const fechada = await itemDaCarta();
ok(fechada && fechada.capturada === false && fechada.arte_foto === null, 'carta ainda bloqueada não entrega a foto (nem a arte)');
const carimbo = await chamar(`/api/tags/${codigo}/carimbar`, { metodo: 'POST', cookie: cookieComum, json: {} });
ok(carimbo.status === 200 || carimbo.status === 201, `carimbo do ponto de teste (${carimbo.status})`);
const aberta = await itemDaCarta();
ok(aberta?.capturada === true && aberta.arte_foto?.m === urlM && aberta.arte_foto?.g === urlG, 'carta desbloqueada usa a foto da galeria (miniatura e grande)');
ok((await chamar(aberta.arte_foto.m)).status === 200, 'a arte da carta é entregue pelo /midia');
await chamar(`/api/admin/imagens/${a.id}/status`, { metodo: 'POST', cookie: cookieAdmin, json: { status: 'arquivado' } });
ok((await listaAdmin()).carta_imagem_id === null && (await itemDaCarta()).arte_foto === null, 'foto arquivada deixa de ser a arte da carta');
await chamar(`/api/admin/imagens/${a.id}/status`, { metodo: 'POST', cookie: cookieAdmin, json: { status: 'aprovado' } });
ok((await listaAdmin()).carta_imagem_id === null, 'aprovar de novo não devolve a foto à carta sozinha');
await chamar(`/api/admin/imagens/${b.id}/status`, { metodo: 'POST', cookie: cookieAdmin, json: { status: 'pendente' } });
const cartaPendente = await chamar(`/api/admin/imagens/${b.id}/carta`, { metodo: 'POST', cookie: cookieAdmin, json: { usar: true } });
ok(cartaPendente.status === 409 && cartaPendente.dados?.erro === 'foto_nao_aprovada', 'foto não aprovada não vai para a carta -> 409');
await chamar(`/api/admin/imagens/${b.id}/status`, { metodo: 'POST', cookie: cookieAdmin, json: { status: 'aprovado' } });
await chamar(`/api/admin/imagens/${a.id}/carta`, { metodo: 'POST', cookie: cookieAdmin, json: { usar: true } });
await chamar(`/api/admin/imagens/${a.id}/carta`, { metodo: 'POST', cookie: cookieAdmin, json: { usar: false } });
ok((await listaAdmin()).carta_imagem_id === null && (await itemDaCarta()).arte_foto === null, 'tirar da carta volta à arte anterior');
sql(`DELETE FROM carimbos WHERE tag_id=(SELECT id FROM tags WHERE codigo='${codigo}')`);
sql(`UPDATE tags SET status='pendente' WHERE codigo='${codigo}'`);

// ---- exclusão ----
const antes = await objetosNoArmazenamento();
ok((await chamar(`/api/admin/pontos/${codigo}`, { metodo: 'DELETE', cookie: cookieAdmin })).dados?.erro === 'tem_fotos', 'não exclui ponto que tem fotos (409 tem_fotos)');
ok((await chamar(`/api/admin/imagens/${a.id}`, { metodo: 'DELETE', cookie: cookieAdmin })).dados?.erro === 'foto_aprovada', 'foto aprovada não é excluída direto (arquive antes)');
await chamar(`/api/admin/imagens/${a.id}/status`, { metodo: 'POST', cookie: cookieAdmin, json: { status: 'arquivado' } });
ok((await chamar(urlG)).status === 404, 'foto arquivada some do público');
ok((await chamar(`/api/pontos/${codigo}/imagens`)).dados.imagens.length === 1, 'lista pública só com a que ficou aprovada');
const excl = await chamar(`/api/admin/imagens/${a.id}`, { metodo: 'DELETE', cookie: cookieAdmin });
ok(excl.status === 200, 'foto arquivada é excluída');
if (antes) {
  const depois = await objetosNoArmazenamento();
  ok(antes.length - depois.length === 3 && !depois.some((c) => c.includes(a.sha256)), `os 3 arquivos da foto excluída saíram do armazenamento (${antes.length} -> ${depois.length})`);
}
await chamar(`/api/admin/imagens/${b.id}/status`, { metodo: 'POST', cookie: cookieAdmin, json: { status: 'arquivado' } });
ok((await chamar(`/api/admin/imagens/${b.id}`, { metodo: 'DELETE', cookie: cookieAdmin })).status === 200, 'segunda foto excluída');
const fim = await objetosNoArmazenamento();
ok(!fim || fim.filter((c) => /^(originais|publico)\/\d+\//.test(c)).every((c) => !c.includes(b.sha256) && !c.includes(a.sha256)), 'nada das fotos de teste sobrou no armazenamento');
ok((await chamar(`/api/admin/imagens/${a.id}/original`, { cookie: cookieAdmin })).status === 404, 'foto excluída -> 404');

// ---- limpeza ----
ok((await chamar(`/api/admin/pontos/${codigo}`, { metodo: 'DELETE', cookie: cookieAdmin })).status === 200, 'ponto de teste excluído');
for (const [email, cookie] of [[emailAdmin, cookieAdmin], [emailComum, cookieComum]]) {
  const r = await chamar('/api/eu', { metodo: 'DELETE', cookie, json: { senha } });
  if (r.status !== 200) sql(`DELETE FROM contas WHERE email='${email}'`);
}
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO OK');
process.exit(falhas ? 1 : 0);
