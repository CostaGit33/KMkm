// Teste ponta a ponta da recuperação de senha, só em ambiente local ou de homologação (cria e apaga contas @teste.invalid).
//   RESEND_API_KEY=re_test RESEND_FROM="Teste <t@example.com>" APP_PUBLIC_URL=https://app.test \
//     node --import ./server/scripts/stub-resend.mjs server/index.js
//   BASE_URL=http://localhost:3000 [MYSQL_CMD="mysql -h127.0.0.1 -uu -pp banco"] node server/scripts/e2e-recuperacao.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = process.env.RESEND_STUB_OUT || path.join(os.tmpdir(), 'resend-stub.jsonl');
let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'OK  ' : 'FALHOU'} ${msg}`); if (!cond) falhas++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ipSeq = 10;
const novoIp = () => `10.9.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;

async function api(path, { method = 'GET', body, cookie, ip } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...(ip ? { 'x-forwarded-for': ip } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  let json = null; try { json = JSON.parse(texto); } catch {}
  return { status: res.status, json, headers: res.headers, cookie: (res.headers.get('set-cookie') || '').split(';')[0] };
}
const emails = () => (fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const tokenDe = (mail) => decodeURIComponent(mail.body.text.match(/\?redefinir=([^\s]+)/)[1]);

fs.rmSync(OUT, { force: true });
const ts = Date.now();
const emailA = `rec-a-${ts}@teste.invalid`;
const emailB = `rec-b-${ts}@teste.invalid`;
const senhaAntiga = 'Senha-Antiga-111';
const senhaNova = 'Senha-Nova-222222';

// Conta A
const criar = await api('/api/conta/criar', { method: 'POST', body: { nome: 'Pessoa A', email: emailA, senha: senhaAntiga }, ip: novoIp() });
ok(criar.status === 201, `criar conta A (${criar.status})`);
const cookieAntigo = criar.cookie;
ok((await api('/api/conta/sessao', { cookie: cookieAntigo })).status === 200, 'sessão antiga válida antes da redefinição');

// Pedidos: e-mail inexistente x existente devem ser indistinguíveis
const ipPedido = novoIp();
const rInexistente = await api('/api/conta/recuperar-senha', { method: 'POST', body: { email: `nao-existe-${ts}@teste.invalid` }, ip: ipPedido });
const rInvalido = await api('/api/conta/recuperar-senha', { method: 'POST', body: { email: 'isso-nao-e-email' }, ip: ipPedido });
const rExistente = await api('/api/conta/recuperar-senha', { method: 'POST', body: { email: emailA }, ip: ipPedido });
ok(rInexistente.status === 200 && rInvalido.status === 200 && rExistente.status === 200, `status 200 nos três casos (${rInexistente.status}/${rInvalido.status}/${rExistente.status})`);
ok(JSON.stringify(rInexistente.json) === JSON.stringify(rExistente.json) && JSON.stringify(rInvalido.json) === JSON.stringify(rExistente.json), 'corpo idêntico (não revela se a conta existe)');
await sleep(800);
let mails = emails();
ok(mails.length === 1 && mails[0].body.to[0] === emailA, `exatamente 1 e-mail, para a conta existente (${mails.length})`);
ok(mails[0].auth === 'Bearer re_test' && mails[0].body.from.includes('t@example.com'), 'usa RESEND_API_KEY e RESEND_FROM');
ok(/https:\/\/app\.test\/\?redefinir=/.test(mails[0].body.text), 'link com APP_PUBLIC_URL e ?redefinir=');
const token1 = tokenDe(mails[0]);
ok(token1.length >= 40, `token longo (${token1.length} caracteres)`);

// Token não pode estar guardado em claro
const hashHex = crypto.createHash('sha256').update(token1).digest('hex').toUpperCase();
const noBanco = (sql) => execSync(`${process.env.MYSQL_CMD} -N -e "${sql}"`).toString().trim();
if (process.env.MYSQL_CMD) ok(noBanco(`SELECT COUNT(*) FROM recuperacao_senha_tokens WHERE token_hash = UNHEX('${hashHex}') AND usado_em IS NULL`) === '1', 'banco guarda só o SHA-256 do token (e está aberto)');
if (process.env.MYSQL_CMD) ok(noBanco(`SELECT COUNT(*) FROM recuperacao_senha_tokens t JOIN contas c ON c.id=t.conta_id WHERE c.email='${emailA}'`) === '1', 'uma linha de token para a conta A');

// Redefinição: token errado, senha curta (não consome), válido, reuso
ok((await api('/api/conta/redefinir-senha', { method: 'POST', body: { token: 'x'.repeat(43), senha: senhaNova }, ip: novoIp() })).status === 400, 'token desconhecido -> 400');
const curta = await api('/api/conta/redefinir-senha', { method: 'POST', body: { token: token1, senha: '1234567' }, ip: novoIp() });
ok(curta.status === 400, 'senha curta -> 400');
const redef = await api('/api/conta/redefinir-senha', { method: 'POST', body: { token: token1, senha: senhaNova }, ip: novoIp() });
ok(redef.status === 200 && redef.json?.ok === true, `redefinição ok (${redef.status})`);
ok(redef.json?.email === emailA, 'resposta devolve o e-mail da conta (o app usa para preencher o login)');
ok((await api('/api/conta/sessao', { cookie: cookieAntigo })).status === 401, 'sessão antiga encerrada');
ok((await api('/api/conta/entrar', { method: 'POST', body: { email: emailA, senha: senhaAntiga }, ip: novoIp() })).status === 401, 'senha antiga não entra mais');
const entrou = await api('/api/conta/entrar', { method: 'POST', body: { email: emailA, senha: senhaNova }, ip: novoIp() });
ok(entrou.status === 200, 'senha nova entra');
ok((await api('/api/conta/redefinir-senha', { method: 'POST', body: { token: token1, senha: 'Outra-Senha-333333' }, ip: novoIp() })).status === 400, 'token reutilizado -> 400');
ok((await api('/api/conta/sessao', { cookie: entrou.cookie })).status === 200, 'nova sessão funciona');

// Limite por conta: 3 e-mails por hora, mesmo vindo de IPs diferentes
await api('/api/conta/criar', { method: 'POST', body: { nome: 'Pessoa B', email: emailB, senha: senhaAntiga }, ip: novoIp() });
const antes = emails().length;
for (let i = 0; i < 5; i++) { const r = await api('/api/conta/recuperar-senha', { method: 'POST', body: { email: emailB }, ip: novoIp() }); if (r.status !== 200) ok(false, `pedido ${i} status ${r.status}`); }
await sleep(800);
const paraB = emails().filter((m) => m.body.to[0] === emailB).length;
ok(paraB === 3, `limite por conta: 5 pedidos geraram ${paraB} e-mails (esperado 3)`);

// Só o último token vale: pedidos novos invalidam os anteriores
const mailsB = emails().filter((m) => m.body.to[0] === emailB);
const tPrimeiro = tokenDe(mailsB[0]); const tUltimo = tokenDe(mailsB[2]);
ok((await api('/api/conta/redefinir-senha', { method: 'POST', body: { token: tPrimeiro, senha: senhaNova }, ip: novoIp() })).status === 400, 'token de um pedido anterior foi invalidado pelo mais novo');
ok((await api('/api/conta/redefinir-senha', { method: 'POST', body: { token: tUltimo, senha: senhaNova }, ip: novoIp() })).status === 200, 'o token mais recente vale');

// Limite por IP: 5 pedidos por 15 min
const ipFixo = novoIp(); let codigos = [];
for (let i = 0; i < 7; i++) codigos.push((await api('/api/conta/recuperar-senha', { method: 'POST', body: { email: `x${i}-${ts}@teste.invalid` }, ip: ipFixo })).status);
ok(codigos.slice(0, 5).every((c) => c === 200) && codigos.slice(5).every((c) => c === 429), `limite por IP: ${codigos.join(',')}`);
const lim = await api('/api/conta/recuperar-senha', { method: 'POST', body: { email: 'a@b.co' }, ip: ipFixo });
ok(lim.headers.get('retry-after') > 0, 'Retry-After presente no 429');
// o limite de pedidos não bloqueia a redefinição (contadores separados)
ok((await api('/api/conta/redefinir-senha', { method: 'POST', body: { token: 'y'.repeat(43), senha: senhaNova }, ip: ipFixo })).status === 400, 'IP bloqueado em pedidos ainda consegue tentar redefinir (400, não 429)');

// limpeza
for (const [email, senha] of [[emailA, senhaNova], [emailB, senhaNova]]) {
  const l = await api('/api/conta/entrar', { method: 'POST', body: { email, senha }, ip: novoIp() });
  if (l.status === 200) await api('/api/eu', { method: 'DELETE', cookie: l.cookie, ip: novoIp() });
}
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO OK');
process.exit(falhas ? 1 : 0);
