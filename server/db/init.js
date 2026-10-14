import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pool } from './database.js';
import { importarCatalogoInicial, migracaoAplicada, runMigrations } from './migrations.js';

const dir = fileURLToPath(new URL('.', import.meta.url));

const statements = (file) => readFileSync(dir + file, 'utf8')
  .split(';')
  .map((sql) => sql.trim())
  .filter(Boolean);

export async function initializeDatabase(connection = pool) {
  for (const sql of statements('schema.sql')) await connection.query(sql);
  await runMigrations();
  // Depois da importação do catálogo (004) o banco é a fonte da verdade: os seeds não rodam mais, para não
  // recriar pontos ou rotas que a administração renomeou, arquivou ou excluiu.
  if (!(await migracaoAplicada('004_admin_catalogo'))) {
    for (const file of ['seed.sql', 'seed-eunapolis.sql']) {
      for (const sql of statements(file)) await connection.query(sql);
    }
    await importarCatalogoInicial();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await initializeDatabase();
    console.log('Banco pronto: tabelas criadas e rota de exemplo carregada.');
  } finally {
    await pool.end();
  }
}
