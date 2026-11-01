// Fila de eventos para o n8n.
// Uso: node scripts/eventos-fila.js status            contagem por status e erros mais comuns
//      node scripts/eventos-fila.js reenfileirar      volta os eventos 'falhou' para 'pendente' (zera tentativas)
import 'dotenv/config';
import { pool, q } from '../db/database.js';
import { initializeDatabase } from '../db/init.js';

const [, , comando] = process.argv;
await initializeDatabase(pool);
if (comando === 'status') {
  console.table(await q('SELECT status, COUNT(*) AS total, MIN(criado_em) AS mais_antigo FROM integracao_eventos GROUP BY status'));
  console.table(await q("SELECT ultimo_erro, COUNT(*) AS total FROM integracao_eventos WHERE ultimo_erro IS NOT NULL GROUP BY ultimo_erro"));
} else if (comando === 'reenfileirar') {
  const [r] = await pool.query("UPDATE integracao_eventos SET status = 'pendente', tentativas = 0, disponivel_em = UTC_TIMESTAMP(), bloqueado_ate = NULL WHERE status = 'falhou'");
  console.log(`${r.affectedRows} evento(s) reenfileirado(s).`);
} else {
  console.error('Uso: node scripts/eventos-fila.js <status|reenfileirar>');
  process.exitCode = 1;
}
await pool.end();
