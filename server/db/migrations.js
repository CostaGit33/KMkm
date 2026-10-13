import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { q } from './database.js';

const dir = fileURLToPath(new URL('./migrations/', import.meta.url));
const databaseName = new URL(process.env.DATABASE_URL || 'mysql://caderneta:caderneta@127.0.0.1:3306/caderneta').pathname.slice(1);

async function ensureMigrationsTable() {
  await q(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(120) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
}
async function hasColumn(table, column) {
  const rows = await q('SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1', [databaseName, table, column]);
  return rows.length > 0;
}
async function hasIndex(table, index) {
  const rows = await q('SELECT 1 FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ? LIMIT 1', [databaseName, table, index]);
  return rows.length > 0;
}
async function hasConstraint(table, name) {
  const rows = await q('SELECT 1 FROM information_schema.table_constraints WHERE table_schema = ? AND table_name = ? AND constraint_name = ? LIMIT 1', [databaseName, table, name]);
  return rows.length > 0;
}
async function ensureColumn(table, column, definition) {
  if (!(await hasColumn(table, column))) await q(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
async function ensureOperationalSchema() {
  await ensureColumn('usuarios', 'token', 'VARCHAR(128) NULL');
  await q('ALTER TABLE usuarios MODIFY token VARCHAR(128) NULL');
  await ensureColumn('rotas', 'cidade_id', "VARCHAR(64) NOT NULL DEFAULT 'eunapolis'");
  await ensureColumn('rotas', 'status', "VARCHAR(24) NOT NULL DEFAULT 'publicado'");
  await ensureColumn('tags', 'status', "VARCHAR(24) NOT NULL DEFAULT 'publicado'");
  if (!(await hasIndex('carimbos', 'idx_carimbos_usuario_tag_data'))) await q('CREATE INDEX idx_carimbos_usuario_tag_data ON carimbos (usuario_id, tag_id, criado_em)');
  if (!(await hasIndex('carimbos', 'idx_carimbos_tag_data'))) await q('CREATE INDEX idx_carimbos_tag_data ON carimbos (tag_id, criado_em)');
  if (!(await hasIndex('sessoes', 'idx_sessoes_expira'))) await q('CREATE INDEX idx_sessoes_expira ON sessoes (expira_em)');
}
// Eventos e patrocínios: carimbo de evento é uma linha em carimbos com evento_id (NULL = carimbo da rota).
async function ensureEventosSchema() {
  await ensureColumn('carimbos', 'evento_id', 'INT NULL');
  if (!(await hasConstraint('carimbos', 'carimbos_evento_fk'))) await q('ALTER TABLE carimbos ADD CONSTRAINT carimbos_evento_fk FOREIGN KEY (evento_id) REFERENCES eventos(id)');
  // Um carimbo de evento por pessoa, ponto e evento (NULL não conflita: carimbos da rota seguem livres).
  if (!(await hasIndex('carimbos', 'uq_carimbos_evento'))) await q('CREATE UNIQUE INDEX uq_carimbos_evento ON carimbos (usuario_id, tag_id, evento_id)');
  if (!(await hasIndex('carimbos', 'idx_carimbos_evento_data'))) await q('CREATE INDEX idx_carimbos_evento_data ON carimbos (evento_id, criado_em)');
  if (!(await hasIndex('eventos', 'idx_eventos_janela'))) await q('CREATE INDEX idx_eventos_janela ON eventos (status, inicio_em, fim_em)');
}
// Projeto somente Eunápolis: rotas e pontos de outras cidades (ou de demonstração) são arquivados, nunca apagados,
// para preservar os carimbos já gravados. Cards ligados a pontos arquivados são cancelados. Roda uma única vez.
async function ensureSomenteEunapolis() {
  const versao = '003_somente_eunapolis';
  const [already] = await q('SELECT version FROM schema_migrations WHERE version = ?', [versao]);
  if (already) return;
  await q("ALTER TABLE rotas ALTER COLUMN cidade_id SET DEFAULT 'eunapolis'");
  await q("UPDATE rotas SET status = 'arquivado' WHERE cidade_id <> 'eunapolis'");
  await q("UPDATE tags SET status = 'arquivado' WHERE rota_id IN (SELECT id FROM rotas WHERE status = 'arquivado')");
  await q("UPDATE eventos SET status = 'cancelado' WHERE id IN (SELECT et.evento_id FROM evento_tags et JOIN tags t ON t.id = et.tag_id WHERE t.status = 'arquivado')");
  await q("UPDATE rotas SET nome = 'Eunápolis · Piloto' WHERE nome = 'Eunápolis · Piloto 5 pontos' AND cidade_id = 'eunapolis'");
  // A rota de Eunápolis nasceu 'editorial' na V7; os pontos continuam 'pendente' até serem publicados em campo.
  await q("UPDATE rotas SET status = 'publicado' WHERE cidade_id = 'eunapolis' AND status = 'editorial'");
  // A rota piloto da V7 tinha 5 pontos (eu-011 em 5º): renumera para a ordem dos 8 pontos atuais.
  await q("UPDATE tags SET ordem = FIELD(codigo, 'eu-001', 'eu-002', 'eu-003', 'eu-004', 'eu-007', 'eu-008', 'eu-009', 'eu-011') WHERE codigo IN ('eu-001', 'eu-002', 'eu-003', 'eu-004', 'eu-007', 'eu-008', 'eu-009', 'eu-011')");
  await q('INSERT INTO schema_migrations (version) VALUES (?)', [versao]);
}
export async function runMigrations() {
  await ensureMigrationsTable();
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()) {
    const [already] = await q('SELECT version FROM schema_migrations WHERE version = ?', [file]);
    if (!already) {
      const sql = readFileSync(dir + file, 'utf8');
      for (const statement of sql.split(';').map((item) => item.trim()).filter(Boolean)) await q(statement);
      await q('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
    }
  }
  await ensureOperationalSchema();
  await ensureEventosSchema();
  await ensureSomenteEunapolis();
}
