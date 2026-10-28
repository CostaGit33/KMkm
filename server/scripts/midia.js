// Fotos dos pontos pelo console do servidor (sem depender do /admin): conferir o armazenamento, listar e importar.
// Uso:
//   node scripts/midia.js verificar                      testa gravar/ler/apagar no armazenamento (R2 ou disco)
//   node scripts/midia.js listar [codigo]                fotos de um ponto (ou contagem por ponto)
//   node scripts/midia.js importar <codigo> <arquivo> [--tipo=atual|historica|restauracao|outra] [--titulo=..] [--legenda=..]
//                                [--periodo=..] [--autor=..] [--fonte=..] [--aprovar]
// A foto importada entra "pendente" (como no /admin); --aprovar publica na hora, com as mesmas regras de crédito
// (histórica ou restaurada exige --autor ou --fonte). O original é guardado intacto; a cópia pública sai sem EXIF/GPS.
import 'dotenv/config';
import fs from 'node:fs';
import { pool, q } from '../db/database.js';
import { initializeDatabase } from '../db/init.js';
import { armazenamentoDeMidia } from '../midia/estado.js';
import * as servico from '../midia/servico.js';

const [, , comando, ...resto] = process.argv;
const opcoes = Object.fromEntries(resto.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true]; }));
const posicionais = resto.filter((a) => !a.startsWith('--'));
const falha = (msg) => { throw Object.assign(new Error(msg), { esperado: true }); };
const texto = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

async function tagPorCodigo(codigo) {
  const [tag] = await q('SELECT id, codigo, nome FROM tags WHERE codigo = ?', [String(codigo || '').toLowerCase()]);
  if (!tag) falha(`Ponto inexistente: ${codigo}. Veja os códigos em: node scripts/pontos.js listar`);
  return tag;
}

async function verificar() {
  const a = armazenamentoDeMidia();
  console.log(`Armazenamento: ${a.tipo} (${a.descricao})`);
  if (a.tipo === 'desligado' || a.tipo === 'r2-incompleto') falha(`Sem armazenamento utilizável: ${a.descricao}. Defina R2_ACCOUNT_ID (ou R2_ENDPOINT), R2_BUCKET, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY, ou MEDIA_DIR para disco.`);
  const v = await a.verificar();
  if (!v.ok) falha(`Falhou o teste de gravar/ler/apagar: ${v.erro}. Confira as credenciais e se o token do R2 tem permissão de leitura e gravação neste bucket.`);
  console.log('OK: gravou, leu e apagou um objeto de teste.');
  if (a.tipo === 'local' && !process.env.MEDIA_DIR) console.log('ATENÇÃO: sem MEDIA_DIR as fotos ficam em pasta temporária e somem no próximo deploy.');
}

async function listar() {
  if (posicionais[0]) {
    const tag = await tagPorCodigo(posicionais[0]);
    const fotos = await servico.imagensDoPonto(tag.id);
    console.log(`${tag.codigo} · ${tag.nome}: ${fotos.length} foto(s)`);
    for (const f of fotos) console.log(`#${f.id} · ${f.status} · ${f.tipo_registro}${f.periodo_historico ? ` (${f.periodo_historico})` : ''} · ${f.largura}×${f.altura} · ${f.titulo || '(sem título)'} · ${[f.autor, f.fonte].filter(Boolean).join(' / ') || 'sem crédito'}`);
    return;
  }
  const linhas = await q(`SELECT t.codigo, t.nome, COUNT(i.id) AS total, SUM(i.status = 'aprovado') AS aprovadas FROM tags t JOIN ponto_imagens i ON i.tag_id = t.id GROUP BY t.id ORDER BY t.codigo`);
  if (!linhas.length) return console.log('Nenhuma foto cadastrada.');
  for (const l of linhas) console.log(`${l.codigo} · ${l.nome}: ${l.total} foto(s), ${Number(l.aprovadas)} no app`);
}

async function importar() {
  const [codigo, arquivo] = posicionais;
  if (!codigo || !arquivo) falha('Uso: node scripts/midia.js importar <codigo> <arquivo> [--tipo=...] [--autor=...] [--fonte=...] [--aprovar]');
  if (!fs.existsSync(arquivo)) falha(`Arquivo não encontrado: ${arquivo}`);
  const tag = await tagPorCodigo(codigo);
  const dados = servico.dadosDaImagem({ tipo_registro: opcoes.tipo, titulo: opcoes.titulo, legenda: opcoes.legenda, periodo_historico: opcoes.periodo, autor: opcoes.autor, fonte: opcoes.fonte }, { texto, opcional: texto });
  const imagem = await servico.enviarImagem({ armazenamento: armazenamentoDeMidia(), tag, buffer: fs.readFileSync(arquivo), dados });
  await q('INSERT INTO auditoria_admin (conta_id, quem, acao, alvo, detalhe) VALUES (NULL, ?, ?, ?, ?)', ['console', 'foto.enviar', tag.codigo, `#${imagem.id} ${imagem.tipo_registro} · ${imagem.sha256.slice(0, 12)} · via scripts/midia.js`]);
  console.log(`Foto #${imagem.id} enviada ao ponto ${tag.codigo} (${imagem.largura}×${imagem.altura}), aguardando aprovação.`);
  if (opcoes.aprovar) {
    const { imagem: aprovada } = await servico.mudarStatus(await servico.imagemPorId(imagem.id), 'aprovado', { forcar: false });
    await q('INSERT INTO auditoria_admin (conta_id, quem, acao, alvo, detalhe) VALUES (NULL, ?, ?, ?, ?)', ['console', 'foto.aprovado', `#${imagem.id}`, 'via scripts/midia.js --aprovar']);
    console.log(`Foto #${aprovada.id} aprovada: já aparece no app.`);
  }
}

try {
  if (!['verificar', 'listar', 'importar'].includes(comando)) falha('Comandos: verificar | listar [codigo] | importar <codigo> <arquivo> [opções]. Veja o topo de scripts/midia.js.');
  await initializeDatabase();
  if (comando === 'verificar') await verificar();
  else if (comando === 'listar') await listar();
  else await importar();
} catch (erro) {
  console.error(erro.esperado ? erro.message : erro.erro ? `Recusado: ${erro.erro}${erro.extra && Object.keys(erro.extra).length ? ` ${JSON.stringify(erro.extra)}` : ''}` : erro);
  process.exitCode = 1;
} finally { await pool.end(); }
