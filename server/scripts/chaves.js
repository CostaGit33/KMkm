// Chaves dos links das tags (o ?k= que impede adivinhar códigos). Requer TAG_KEY_SECRET (32+ caracteres).
// Uso: node scripts/chaves.js <ativar-todos|ativar|girar|desativar|urls> [codigo ...]
//   ativar-todos  liga a chave em todos os pontos que ainda têm link aberto
//   girar         invalida o link antigo do ponto (use se o QR/tag vazou ou foi trocado); regrave a tag
//   urls          imprime codigo;url de cada ponto (precisa de APP_PUBLIC_URL) para gravar nas tags NFC
// Depois de ativar ou girar, os links antigos deixam de funcionar: regrave/reimprima as tags afetadas.
import 'dotenv/config';
import { pool, q } from '../db/database.js';
import { initializeDatabase } from '../db/init.js';
import { segredoDasChaves, urlDoPonto } from '../tag-acesso.js';

const [, , comando, ...codigosBrutos] = process.argv;
const codigos = codigosBrutos.map((c) => c.trim().toLowerCase()).filter(Boolean);
const falha = (msg) => { throw Object.assign(new Error(msg), { esperado: true }); };

async function alvo() {
  if (!codigos.length) falha('Informe ao menos um código de ponto.');
  const tags = await q(`SELECT codigo, chave_versao FROM tags WHERE codigo IN (${codigos.map(() => '?').join(',')})`, codigos);
  const faltando = codigos.filter((c) => !tags.some((t) => t.codigo === c));
  if (faltando.length) falha(`Ponto inexistente: ${faltando.join(', ')}.`);
  return tags;
}
async function auditar(acao, detalhe) {
  await q('INSERT INTO auditoria_admin (conta_id, quem, acao, alvo, detalhe) VALUES (NULL, ?, ?, ?, ?)', ['console', acao, null, String(detalhe).slice(0, 400)]);
}

try {
  await initializeDatabase(pool);
  const segredo = segredoDasChaves();
  if (comando && comando !== 'urls' && !segredo) falha('Defina TAG_KEY_SECRET (32+ caracteres aleatórios) no ambiente antes de ativar chaves.');
  if (comando === 'ativar-todos') {
    const [r] = await pool.query("UPDATE tags SET chave_versao = 1 WHERE chave_versao = 0 AND status <> 'arquivado'");
    await auditar('ponto.chave_ativar_todos', `${r.affectedRows} ponto(s) via scripts/chaves.js`);
    console.log(`${r.affectedRows} ponto(s) agora exigem chave. Gere os links com: node scripts/chaves.js urls`);
  } else if (comando === 'ativar' || comando === 'girar' || comando === 'desativar') {
    const tags = await alvo();
    for (const t of tags) {
      const versao = comando === 'desativar' ? 0 : comando === 'girar' ? Number(t.chave_versao) + 1 : Math.max(1, Number(t.chave_versao));
      await q('UPDATE tags SET chave_versao = ? WHERE codigo = ?', [versao, t.codigo]);
    }
    await auditar(`ponto.chave_${comando}`, `${tags.map((t) => t.codigo).join(',')} via scripts/chaves.js`);
    console.log(`${tags.length} ponto(s): chave ${comando === 'desativar' ? 'desligada' : comando === 'girar' ? 'girada (regrave as tags)' : 'ativada'}.`);
  } else if (comando === 'urls') {
    const base = String(process.env.APP_PUBLIC_URL || '').replace(/\/+$/, '');
    if (!base) falha('Defina APP_PUBLIC_URL (ex.: https://tag.seudominio.com) para montar os links.');
    const tags = await q("SELECT codigo, nome, chave_versao FROM tags WHERE status <> 'arquivado' ORDER BY rota_id, ordem, id");
    for (const t of tags) console.log(`${t.codigo};${urlDoPonto(base, t, segredo)}`);
  } else {
    console.log('Comandos: ativar-todos, ativar <codigo ...>, girar <codigo ...>, desativar <codigo ...>, urls.');
  }
} catch (error) {
  if (error.esperado) { console.error(`Erro: ${error.message}`); process.exitCode = 1; } else throw error;
} finally { await pool.end(); }
