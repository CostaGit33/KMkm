// Relatório do piloto no terminal.
// Uso: node scripts/relatorio-piloto.js [--dias 14] [--json]
// Mostra o funil (primeiro carimbo, segundo ponto, retorno em 7 dias, conclusão da rota), a prontidão dos pontos
// e os sinais de decisão da documentação (gatilhos de parada). O mesmo relatório está na aba "Piloto" do /admin.
import 'dotenv/config';
import { pool } from '../db/database.js';
import { initializeDatabase } from '../db/init.js';
import { relatorioEmTexto, relatorioPiloto } from '../relatorio.js';

const args = process.argv.slice(2);
const i = args.indexOf('--dias');
const dias = i >= 0 ? Number(args[i + 1]) || 14 : 14;

try {
  await initializeDatabase(pool);
  const r = await relatorioPiloto({ dias });
  console.log(args.includes('--json') ? JSON.stringify(r, null, 2) : relatorioEmTexto(r));
} finally { await pool.end(); }
