// Publicação dos pontos de Eunápolis (enquanto não existe tela administrativa).
// Uso: node scripts/pontos.js <listar|publicar|despublicar> [codigo ...]
// Um ponto só recebe carimbo (e só entra em card de evento ou patrocínio) depois de publicado.
// Publique somente após validar o local em campo: coordenada, acesso, segurança e autorização de quem cuida do espaço.
import 'dotenv/config';
import { pool, q } from '../db/database.js';
import { initializeDatabase } from '../db/init.js';

const [, , comando, ...codigos] = process.argv;
const falha = (msg) => { throw Object.assign(new Error(msg), { esperado: true }); };

async function listar() {
  const linhas = await q(`SELECT t.codigo, t.ordem, t.nome, t.status, r.nome AS rota FROM tags t JOIN rotas r ON r.id = t.rota_id
    WHERE r.status <> 'arquivado' ORDER BY r.id, t.ordem`);
  if (!linhas.length) return console.log('Nenhum ponto cadastrado.');
  for (const l of linhas) console.log(`${l.codigo} · ${String(l.ordem).padStart(2, '0')} · ${l.nome} · ${l.status} · ${l.rota}`);
}

async function mudar(status) {
  const lista = codigos.map((c) => c.trim().toLowerCase()).filter(Boolean);
  if (!lista.length) falha('Informe ao menos um código de ponto (ex.: eu-001).');
  const achados = await q(`SELECT t.codigo FROM tags t JOIN rotas r ON r.id = t.rota_id WHERE r.status <> 'arquivado' AND t.codigo IN (${lista.map(() => '?').join(',')})`, lista);
  const faltando = lista.filter((c) => !achados.some((a) => a.codigo === c));
  if (faltando.length) falha(`Ponto inexistente ou arquivado: ${faltando.join(', ')}.`);
  await q(`UPDATE tags SET status = ? WHERE codigo IN (${lista.map(() => '?').join(',')})`, [status, ...lista]);
  console.log(`${lista.length} ponto(s) agora ${status}: ${lista.join(', ')}.`);
}

try {
  await initializeDatabase(pool);
  if (comando === 'listar') await listar();
  else if (comando === 'publicar') await mudar('publicado');
  else if (comando === 'despublicar') await mudar('pendente');
  else console.log('Comandos: listar, publicar <codigo ...>, despublicar <codigo ...>.');
} catch (error) {
  if (error.esperado) { console.error(`Erro: ${error.message}`); process.exitCode = 1; } else throw error;
} finally { await pool.end(); }
