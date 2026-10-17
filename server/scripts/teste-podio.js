// Dados FICTÍCIOS só para testar o pódio e o ranking. Nada disso faz parte do app publicado.
// Uso:
//   node scripts/teste-podio.js criar [email-da-sua-conta]   cria 2 participantes de teste (Ana e Beto) com carimbos;
//                                                            com o e-mail, a sua conta também ganha 2 carimbos de teste
//   node scripts/teste-podio.js limpar                       apaga tudo que este script criou
//   node scripts/teste-podio.js status                       mostra o que existe agora
// Os carimbos de teste ficam marcados (carimbos.especial = 'teste-podio') e as contas usam o domínio @teste.invalid.
import 'dotenv/config';
import crypto from 'node:crypto';
import { pool, q } from '../db/database.js';
import { initializeDatabase } from '../db/init.js';
import { hashPassword, makeSalt, normalizeEmail } from '../security.js';

const [, , comando, emailBruto] = process.argv;
const MARCA = 'teste-podio';
const DOMINIO = '@teste.invalid';
const PARTICIPANTES = [
  { email: `ana${DOMINIO}`, nome: 'Ana (teste)', apelido: 'Ana (teste)', carimbos: 3, minutosAtras: 90 },
  { email: `beto${DOMINIO}`, nome: 'Beto (teste)', apelido: 'Beto (teste)', carimbos: 2, minutosAtras: 30 },
];
const falha = (msg) => { throw Object.assign(new Error(msg), { esperado: true }); };

async function tagsDisponiveis() {
  const tags = await q(`SELECT t.id, t.codigo FROM tags t JOIN rotas r ON r.id = t.rota_id
    WHERE t.status <> 'arquivado' AND r.status <> 'arquivado' ORDER BY (t.status = 'publicado') DESC, t.codigo`);
  if (tags.length < 3) falha('O banco precisa ter ao menos 3 pontos cadastrados.');
  return tags;
}

async function carimbar(usuarioId, tags, quantidade, minutosAtras) {
  const ja = new Set((await q('SELECT tag_id FROM carimbos WHERE usuario_id = ?', [usuarioId])).map((r) => r.tag_id));
  const livres = tags.filter((t) => !ja.has(t.id)).slice(0, quantidade);
  let n = 0;
  for (const tag of livres) {
    const instante = new Date(Date.now() - (minutosAtras - n) * 60 * 1000);
    await q('INSERT INTO carimbos (usuario_id, tag_id, criado_em, seed, especial) VALUES (?, ?, ?, ?, ?)', [usuarioId, tag.id, instante, crypto.randomInt(1, 2 ** 30), MARCA]);
    n += 1;
  }
  return livres.map((t) => t.codigo);
}

async function limpar() {
  const apagados = await q('DELETE FROM carimbos WHERE especial = ?', [MARCA]);
  const contas = await q('SELECT usuario_id FROM contas WHERE email LIKE ?', [`%${DOMINIO}`]);
  for (const { usuario_id: id } of contas) {
    await q('DELETE FROM carimbos WHERE usuario_id = ?', [id]);
    await q('DELETE FROM usuarios WHERE id = ?', [id]); // contas e recompensas saem em cascata
  }
  console.log(`Removido: ${contas.length} conta(s) de teste e os carimbos marcados como teste${apagados?.affectedRows != null ? ` (${apagados.affectedRows})` : ''}.`);
}

async function criar() {
  await limpar();
  const tags = await tagsDisponiveis();
  for (const p of PARTICIPANTES) {
    const salt = makeSalt();
    const hash = hashPassword(crypto.randomBytes(24).toString('hex'), salt); // senha aleatória: ninguém consegue entrar nessas contas
    const usuario = await q('INSERT INTO usuarios (apelido, token) VALUES (?, NULL)', [p.nome.slice(0, 30)]);
    await q('INSERT INTO contas (usuario_id, nome, email, senha_hash, senha_salt, placar_opt_in, placar_apelido) VALUES (?, ?, ?, ?, ?, TRUE, ?)',
      [usuario.insertId, p.nome, p.email, hash, salt, p.apelido]);
    const codigos = await carimbar(usuario.insertId, tags, p.carimbos, p.minutosAtras);
    console.log(`${p.apelido}: ${codigos.length} carimbos (${codigos.join(', ')})`);
  }
  const email = emailBruto ? normalizeEmail(emailBruto) : null;
  if (email) {
    const [conta] = await q('SELECT usuario_id FROM contas WHERE email = ?', [email]);
    if (!conta) falha(`Não existe conta com o e-mail ${email}. Crie a conta no app primeiro.`);
    const codigos = await carimbar(conta.usuario_id, tags, 2, 10);
    console.log(`${email}: ${codigos.length} carimbo(s) de teste (${codigos.join(', ')}).`);
    console.log('Para aparecer no pódio, ative "Quero participar do pódio público" na tela Pódio.');
  }
  console.log('Pronto. Para apagar tudo depois: node scripts/teste-podio.js limpar');
}

async function status() {
  const contas = await q('SELECT email FROM contas WHERE email LIKE ?', [`%${DOMINIO}`]);
  const [{ n }] = await q('SELECT COUNT(*) AS n FROM carimbos WHERE especial = ?', [MARCA]);
  console.log(`${contas.length} conta(s) de teste, ${n} carimbo(s) marcados como teste.`);
}

try {
  await initializeDatabase(pool);
  if (comando === 'criar') await criar();
  else if (comando === 'limpar') await limpar();
  else if (comando === 'status') await status();
  else console.log('Comandos: criar [email], limpar, status.');
} catch (error) {
  if (error.esperado) { console.error(`Erro: ${error.message}`); process.exitCode = 1; } else throw error;
} finally { await pool.end(); }
