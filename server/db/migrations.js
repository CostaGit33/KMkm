import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { q } from './database.js';
import { atribuirCriaturas } from '../criaturas.js';

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

// Administração (V8.4): papel da conta, dados de catálogo nos pontos, circuitos editoriais e registro de ações.
async function ensureAdminSchema() {
  await ensureColumn('contas', 'papel', "VARCHAR(16) NOT NULL DEFAULT 'usuario'");
  await ensureColumn('tags', 'lat', 'DECIMAL(9,6) NULL');
  await ensureColumn('tags', 'lng', 'DECIMAL(9,6) NULL');
  await ensureColumn('tags', 'endereco', 'VARCHAR(200) NULL');
  await ensureColumn('tags', 'nota', 'VARCHAR(400) NULL');
  await ensureColumn('tags', 'categorias', 'VARCHAR(120) NULL');
  await ensureColumn('tags', 'icone', 'VARCHAR(8) NULL');
  await ensureColumn('tags', 'fonte_mapa', 'VARCHAR(80) NULL');
  await ensureColumn('tags', 'oculto', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await ensureColumn('rotas', 'subtitulo', 'VARCHAR(200) NULL');
  await q(`CREATE TABLE IF NOT EXISTS circuitos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(64) NOT NULL UNIQUE,
    nome VARCHAR(160) NOT NULL,
    subtitulo VARCHAR(200) NULL,
    icone VARCHAR(8) NULL,
    cor VARCHAR(20) NOT NULL DEFAULT 'ochre',
    ordem INT NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'publicado'
  )`);
  await q(`CREATE TABLE IF NOT EXISTS circuito_pontos (
    circuito_id INT NOT NULL,
    tag_id INT NOT NULL,
    ordem INT NOT NULL DEFAULT 0,
    PRIMARY KEY (circuito_id, tag_id),
    CONSTRAINT circuito_pontos_circuito_fk FOREIGN KEY (circuito_id) REFERENCES circuitos(id) ON DELETE CASCADE,
    CONSTRAINT circuito_pontos_tag_fk FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )`);
  await q(`CREATE TABLE IF NOT EXISTS auditoria_admin (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    conta_id INT NULL,
    quem VARCHAR(160) NOT NULL,
    acao VARCHAR(60) NOT NULL,
    alvo VARCHAR(160) NULL,
    detalhe VARCHAR(400) NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
}
export async function migracaoAplicada(versao) {
  const [linha] = await q('SELECT version FROM schema_migrations WHERE version = ?', [versao]);
  return Boolean(linha);
}
// Importa uma única vez o catálogo que antes vivia só no front-end (18 pontos e 4 circuitos), para o admin poder
// editar, reordenar e remover tudo. Não sobrescreve nada que já tenha sido preenchido; depois disso o banco manda.
export async function importarCatalogoInicial() {
  const versao = '004_admin_catalogo';
  if (await migracaoAplicada(versao)) return;
  const catalogo = JSON.parse(readFileSync(fileURLToPath(new URL('./catalogo-inicial.json', import.meta.url)), 'utf8'));
  await q("INSERT IGNORE INTO rotas (nome, tipo, cor, km, cidade_id, status, subtitulo) VALUES ('Eunápolis · Catálogo editorial', 'cidade', 'ocre', NULL, 'eunapolis', 'editorial', 'Pontos ainda sem tag física publicada')");
  const [editorial] = await q("SELECT id FROM rotas WHERE nome = 'Eunápolis · Catálogo editorial'");
  const [{ prox }] = await q('SELECT COALESCE(MAX(ordem), 0) AS prox FROM tags WHERE rota_id = ?', [editorial.id]);
  let ordem = Number(prox);
  for (const p of catalogo.pontos) {
    const categorias = p.categorias.join(',');
    const [existente] = await q('SELECT id FROM tags WHERE codigo = ?', [p.codigo]);
    if (existente) {
      await q(`UPDATE tags SET lat = COALESCE(lat, ?), lng = COALESCE(lng, ?), endereco = COALESCE(endereco, ?), nota = COALESCE(nota, ?),
        categorias = COALESCE(categorias, ?), icone = COALESCE(icone, ?), fonte_mapa = COALESCE(fonte_mapa, ?), oculto = ? WHERE id = ?`,
      [p.lat, p.lng, p.endereco, p.nota, categorias, p.icone, p.fonte_mapa, p.oculto ? 1 : 0, existente.id]);
    } else {
      ordem += 1;
      await q(`INSERT INTO tags (codigo, rota_id, ordem, nome, forma, parceiro, status, lat, lng, endereco, nota, categorias, icone, fonte_mapa, oculto)
        VALUES (?, ?, ?, ?, 'c', FALSE, 'pendente', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.codigo, editorial.id, ordem, p.nome, p.lat, p.lng, p.endereco, p.nota, categorias, p.icone, p.fonte_mapa, p.oculto ? 1 : 0]);
    }
  }
  for (const c of catalogo.circuitos) {
    await q('INSERT IGNORE INTO circuitos (slug, nome, subtitulo, icone, cor, ordem, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [c.slug, c.nome, c.subtitulo, c.icone, c.cor, c.ordem, 'publicado']);
    const [circ] = await q('SELECT id FROM circuitos WHERE slug = ?', [c.slug]);
    let n = 0;
    for (const codigo of c.pontos) {
      const [tag] = await q('SELECT id FROM tags WHERE codigo = ?', [codigo]);
      if (!tag) continue;
      n += 1;
      await q('INSERT IGNORE INTO circuito_pontos (circuito_id, tag_id, ordem) VALUES (?, ?, ?)', [circ.id, tag.id, n]);
    }
  }
  await q('INSERT INTO schema_migrations (version) VALUES (?)', [versao]);
}
// Remove a turma de demonstração (código PEDAL) das versões antigas, se ninguém a estiver usando. Roda uma única vez.
async function ensureSemDemonstracao() {
  const versao = '005_sem_demonstracao';
  const [already] = await q('SELECT version FROM schema_migrations WHERE version = ?', [versao]);
  if (already) return;
  await q("DELETE FROM turmas WHERE codigo_convite = 'PEDAL' AND nome = 'Pedal da Madrugada' AND id NOT IN (SELECT turma_id FROM usuarios WHERE turma_id IS NOT NULL)");
  await q('INSERT INTO schema_migrations (version) VALUES (?)', [versao]);
}
// Catálogo limpo para publicação: arquiva os pontos-rascunho (EU-017 a EU-020, se não tiverem carimbo) e troca os textos
// internos de validação pelos textos finais. Só mexe em notas que ainda estão exatamente como foram importadas,
// então edições feitas na administração nunca são sobrescritas. Roda uma única vez.
const NOTAS_LIMPAS = {
  'eu-001': ['Uso cívico confirmado pela Prefeitura; coordenada conferida no OpenStreetMap, operação deve ser validada localmente.', 'Praça de uso cívico em Eunápolis.'],
  'eu-002': ['Espaço central requalificado; coordenada conferida no OpenStreetMap, operação deve ser validada localmente.', 'Espaço central requalificado.'],
  'eu-004': ['Praça pública com intervenções recentes; coordenada conferida no OpenStreetMap, operação deve ser validada localmente.', 'Praça pública com intervenções recentes.'],
  'eu-005': ['Espaço de bairro em intervenção municipal; endereço e operação ainda pendentes.', 'Espaço de bairro em intervenção municipal.'],
  'eu-007': ['Praça inaugurada com pista de caminhada de 160 m; validar condição atual.', 'Praça inaugurada com pista de caminhada de 160 m.'],
  'eu-008': ['Pista de caminhada documentada em restauração, sem quilometragem oficial publicada.', 'Pista de caminhada junto à lagoa e à Academia da Saúde do Dinah Borges.'],
  'eu-009': ['Feira do Bueiro tradicional; reforma e horário atual precisam de confirmação.', 'Mercado municipal que abriga a tradicional Feira do Bueiro.'],
  'eu-010': ['Localização secundária por diretório; validar calendário e funcionamento.', 'Feira livre de Eunápolis.'],
  'eu-011': ['Ponto de cultura com oficinas e vivências; contato prévio recomendado.', 'Ponto de cultura com oficinas e vivências.'],
  'eu-013': ['Cerca de 6 km demarcados em via de tráfego misto; endpoints e segurança pendentes.', 'Cerca de 6 km demarcados em via de tráfego misto.'],
  'eu-014': ['Percurso eventual de 2026; não é circuito cotidiano.', 'Percurso de prova do Circuito Sesc de Corridas.'],
};
async function ensureCatalogoLimpo() {
  const versao = '006_catalogo_limpo';
  const [already] = await q('SELECT version FROM schema_migrations WHERE version = ?', [versao]);
  if (already) return;
  await q("UPDATE tags SET status = 'arquivado' WHERE codigo IN ('eu-017','eu-018','eu-019','eu-020') AND status <> 'arquivado' AND id NOT IN (SELECT tag_id FROM carimbos)");
  for (const [codigo, [antiga, nova]] of Object.entries(NOTAS_LIMPAS)) await q('UPDATE tags SET nota = ? WHERE codigo = ? AND nota = ?', [nova, codigo, antiga]);
  await q("UPDATE tags SET fonte_mapa = 'Google Maps' WHERE fonte_mapa = 'Google Maps · a validar em campo'");
  await q('INSERT INTO schema_migrations (version) VALUES (?)', [versao]);
}
async function ensureGamificationSchema() {
  await ensureColumn('contas', 'placar_opt_in', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await ensureColumn('contas', 'placar_apelido', 'VARCHAR(30) NULL');
  await q(`CREATE TABLE IF NOT EXISTS gamificacao_recompensas (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    chave VARCHAR(120) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    referencia VARCHAR(80) NOT NULL,
    xp INT UNSIGNED NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_gamificacao_usuario_chave (usuario_id, chave),
    KEY idx_gamificacao_usuario_tipo (usuario_id, tipo),
    CONSTRAINT gamificacao_recompensas_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  )`);
  if (!(await hasIndex('carimbos', 'idx_carimbos_gamificacao_data'))) {
    await q('CREATE INDEX idx_carimbos_gamificacao_data ON carimbos (criado_em, usuario_id, tag_id)');
  }
}
// Coleção de cartas (personagem, categoria e raridade por ponto) e edição numerada (tiragem e números emitidos por card).
// O número guarda a pessoa com SET NULL: excluir a conta anonimiza a linha, mas o número nunca é reemitido.
async function ensureColecaoEdicaoSchema() {
  await ensureColumn('tags', 'criatura', 'VARCHAR(60) NULL');
  await ensureColumn('tags', 'raridade', 'VARCHAR(12) NULL');
  await ensureColumn('tags', 'categoria_carta', 'VARCHAR(12) NULL');
  await ensureColumn('tags', 'frase', 'VARCHAR(160) NULL');
  await ensureColumn('tags', 'historia', 'VARCHAR(400) NULL');
  await ensureColumn('tags', 'arte', 'VARCHAR(80) NULL');
  await ensureColumn('tags', 'carta', 'INT NULL');
  await ensureColumn('eventos', 'tiragem', 'INT UNSIGNED NULL');
  await ensureColumn('eventos', 'emitidos', 'INT UNSIGNED NOT NULL DEFAULT 0');
  await q(`CREATE TABLE IF NOT EXISTS edicao_numeros (
    evento_id INT NOT NULL,
    numero INT UNSIGNED NOT NULL,
    usuario_id INT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (evento_id, numero),
    UNIQUE KEY uq_edicao_evento_usuario (evento_id, usuario_id),
    CONSTRAINT edicao_numeros_evento_fk FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
    CONSTRAINT edicao_numeros_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
  )`);
  await atribuirCriaturas();
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
  await ensureAdminSchema();
  await ensureSemDemonstracao();
  await ensureCatalogoLimpo();
  await ensureGamificationSchema();
  await ensureColecaoEdicaoSchema();
}
