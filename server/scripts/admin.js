// Promove ou rebaixa contas de administrador (a página /admin só abre para quem tem papel 'admin').
// Uso: node scripts/admin.js <listar|promover|rebaixar> [email]
// A conta precisa existir: crie-a antes pelo próprio app (Perfil → criar conta) e depois promova.
import 'dotenv/config';
import { pool, q } from '../db/database.js';
import { initializeDatabase } from '../db/init.js';
import { normalizeEmail } from '../security.js';

const [, , comando, emailBruto] = process.argv;
const falha = (msg) => { throw Object.assign(new Error(msg), { esperado: true }); };

async function mudar(papel) {
  const email = normalizeEmail(emailBruto);
  if (!email) falha('Informe o e-mail da conta. Ex.: node server/scripts/admin.js promover voce@exemplo.com');
  const [conta] = await q('SELECT id, email, papel FROM contas WHERE email = ?', [email]);
  if (!conta) falha(`Não existe conta com o e-mail ${email}. Crie a conta no app primeiro.`);
  if (papel === 'usuario') {
    const [{ n }] = await q("SELECT COUNT(*) AS n FROM contas WHERE papel = 'admin' AND id <> ?", [conta.id]);
    if (conta.papel === 'admin' && Number(n) === 0) console.log('Atenção: este era o único administrador; agora ninguém abre a página /admin até promover outra conta.');
  }
  await q('UPDATE contas SET papel = ? WHERE id = ?', [papel, conta.id]);
  await q('INSERT INTO auditoria_admin (conta_id, quem, acao, alvo, detalhe) VALUES (NULL, ?, ?, ?, ?)', ['console', `usuario.papel_${papel}`, email, 'via scripts/admin.js']);
  console.log(`${email} agora é ${papel === 'admin' ? 'ADMINISTRADOR' : 'usuário comum'}.`);
}

try {
  await initializeDatabase(pool);
  if (comando === 'promover') await mudar('admin');
  else if (comando === 'rebaixar') await mudar('usuario');
  else if (comando === 'listar') {
    const admins = await q("SELECT email, nome, criado_em FROM contas WHERE papel = 'admin' ORDER BY id");
    if (!admins.length) console.log('Nenhum administrador. Use: promover <email>.');
    for (const a of admins) console.log(`${a.email} · ${a.nome}`);
  } else console.log('Comandos: listar, promover <email>, rebaixar <email>.');
} catch (error) {
  if (error.esperado) { console.error(`Erro: ${error.message}`); process.exitCode = 1; } else throw error;
} finally { await pool.end(); }
