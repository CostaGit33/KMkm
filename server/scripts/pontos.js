// Publicação dos pontos de Eunápolis (enquanto não existe tela administrativa).
// Uso: node scripts/pontos.js <listar|publicar|despublicar> [codigo ...] [--forcar]
// Publicar exige responsável, autorização e vistoria registrados no ponto (admin → editar ponto). --forcar ignora
// essa exigência e fica registrado na auditoria. EXIGIR_AUTORIZACAO=false desliga a exigência.
// Um ponto só recebe carimbo (e só entra em card de evento ou patrocínio) depois de publicado.
// Publique somente após validar o local em campo: coordenada, acesso, segurança e autorização de quem cuida do espaço.
import 'dotenv/config';
import { pool, q } from '../db/database.js';
import { initializeDatabase } from '../db/init.js';

const [, , comando, ...argumentos] = process.argv;
const forcar = argumentos.includes('--forcar');
const codigos = argumentos.filter((a) => !a.startsWith('--'));
const falha = (msg) => { throw Object.assign(new Error(msg), { esperado: true }); };

async function listar() {
  const linhas = await q(`SELECT t.codigo, t.ordem, t.nome, t.status, t.responsavel_nome, t.autorizado_em, t.vistoriado_em, t.chave_versao, r.nome AS rota FROM tags t JOIN rotas r ON r.id = t.rota_id
    WHERE r.status <> 'arquivado' ORDER BY r.id, t.ordem`);
  if (!linhas.length) return console.log('Nenhum ponto cadastrado.');
  for (const l of linhas) {
    const docs = l.responsavel_nome && l.autorizado_em && l.vistoriado_em ? 'doc ok' : 'sem doc';
    console.log(`${l.codigo} · ${String(l.ordem).padStart(2, '0')} · ${l.nome} · ${l.status} · ${docs} · ${Number(l.chave_versao) > 0 ? 'com chave' : 'link aberto'} · ${l.rota}`);
  }
}

async function mudar(status) {
  const lista = codigos.map((c) => c.trim().toLowerCase()).filter(Boolean);
  if (!lista.length) falha('Informe ao menos um código de ponto (ex.: eu-001).');
  const achados = await q(`SELECT t.codigo, t.responsavel_nome, t.autorizado_em, t.vistoriado_em FROM tags t JOIN rotas r ON r.id = t.rota_id WHERE r.status <> 'arquivado' AND t.codigo IN (${lista.map(() => '?').join(',')})`, lista);
  const faltando = lista.filter((c) => !achados.some((a) => a.codigo === c));
  if (faltando.length) falha(`Ponto inexistente ou arquivado: ${faltando.join(', ')}.`);
  let forcados = [];
  if (status === 'publicado' && process.env.EXIGIR_AUTORIZACAO !== 'false') {
    const semDocumentacao = achados.filter((a) => !a.responsavel_nome || !a.autorizado_em || !a.vistoriado_em);
    if (semDocumentacao.length && !forcar) falha(`Faltam responsável, autorização ou vistoria em: ${semDocumentacao.map((a) => a.codigo).join(', ')}. Preencha no /admin (editar ponto) ou use --forcar.`);
    forcados = semDocumentacao.map((a) => a.codigo);
  }
  await q(`UPDATE tags SET status = ? WHERE codigo IN (${lista.map(() => '?').join(',')})`, [status, ...lista]);
  if (forcados.length) await q('INSERT INTO auditoria_admin (conta_id, quem, acao, alvo, detalhe) VALUES (NULL, ?, ?, ?, ?)', ['console', 'ponto.publicado_sem_documentacao', forcados.join(',').slice(0, 160), 'via scripts/pontos.js --forcar']);
  console.log(`${lista.length} ponto(s) agora ${status}: ${lista.join(', ')}.`);
  if (forcados.length) console.log(`Atenção: publicados sem documentação completa (forçado): ${forcados.join(', ')}.`);
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
