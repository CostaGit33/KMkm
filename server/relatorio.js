// Relatório do piloto: transforma o banco nas métricas que a documentação define como critério de decisão
// (docs/riscos-piloto-eunapolis.md). Fica separado em duas partes:
//  - consultas SQL (lerDados), que dependem do banco;
//  - cálculo (calcularFunil, avaliarSinais), puro e testado sem banco.
// Contas de administração, contas @teste.invalid e carimbos do teste de pódio ficam de fora.
import { q } from './db/database.js';
import { avaliarSinais, calcularFunil } from './relatorio-calculo.js';

export { avaliarSinais, calcularFunil, pct, relatorioEmTexto } from './relatorio-calculo.js';

const FILTRO_PESSOA = `(c.papel IS NULL OR c.papel <> 'admin') AND (c.email IS NULL OR c.email NOT LIKE '%@teste.invalid')`;
const FILTRO_CARIMBO = `x.evento_id IS NULL AND (x.especial IS NULL OR x.especial <> 'teste-podio')`;
const DIA_MS = 86400000;

async function lerDados({ de, ate }) {
  const [{ n: contasCriadas }] = await q(
    `SELECT COUNT(*) AS n FROM usuarios u LEFT JOIN contas c ON c.usuario_id = u.id WHERE u.criado_em BETWEEN ? AND ? AND ${FILTRO_PESSOA}`, [de, ate]);
  const pessoas = await q(
    `SELECT x.usuario_id, MIN(x.criado_em) AS primeiro, COUNT(DISTINCT x.tag_id) AS pontos
     FROM carimbos x JOIN usuarios u ON u.id = x.usuario_id LEFT JOIN contas c ON c.usuario_id = u.id
     WHERE ${FILTRO_CARIMBO} AND ${FILTRO_PESSOA}
     GROUP BY x.usuario_id HAVING MIN(x.criado_em) BETWEEN ? AND ?`, [de, ate]);
  const diasRows = pessoas.length ? await q(
    `SELECT DISTINCT x.usuario_id, DATE(x.criado_em) AS dia FROM carimbos x WHERE ${FILTRO_CARIMBO} AND x.usuario_id IN (${pessoas.map(() => '?').join(',')})`,
    pessoas.map((p) => p.usuario_id)) : [];
  for (const p of pessoas) p.dias = diasRows.filter((d) => d.usuario_id === p.usuario_id).map((d) => d.dia);
  const rotas = await q(
    `SELECT r.id, r.nome, COUNT(t.id) AS total FROM rotas r JOIN tags t ON t.rota_id = r.id AND t.status = 'publicado' WHERE r.status = 'publicado' GROUP BY r.id, r.nome`);
  const feitosPorRota = await q(
    `SELECT t.rota_id, x.usuario_id, COUNT(DISTINCT x.tag_id) AS feitos FROM carimbos x JOIN tags t ON t.id = x.tag_id WHERE ${FILTRO_CARIMBO} GROUP BY t.rota_id, x.usuario_id`);
  const pontos = await q(
    `SELECT t.codigo, t.nome, t.status, COUNT(x.id) AS carimbos, COUNT(DISTINCT x.usuario_id) AS pessoas, MAX(x.criado_em) AS ultimo
     FROM tags t LEFT JOIN carimbos x ON x.tag_id = t.id AND ${FILTRO_CARIMBO}
     WHERE t.status <> 'arquivado' GROUP BY t.id, t.codigo, t.nome, t.status, t.ordem ORDER BY t.ordem, t.id`);
  const suspeitos = await q(`SELECT x.suspeito AS motivo, COUNT(*) AS n FROM carimbos x WHERE x.suspeito IS NOT NULL AND ${FILTRO_CARIMBO} GROUP BY x.suspeito`);
  const [prontidao] = await q(
    `SELECT SUM(autorizado_em IS NULL) AS sem_autorizacao, SUM(vistoriado_em IS NULL) AS sem_vistoria, SUM(chave_versao = 0) AS sem_chave,
            SUM(lat IS NULL) AS sem_coordenada, COUNT(*) AS publicados
     FROM tags WHERE status = 'publicado'`);
  return { contasCriadas, pessoas, rotas, feitosPorRota, pontos, suspeitos, prontidao };
}

export async function relatorioPiloto({ dias = 14, de = null, ate = null, agora = new Date() } = {}) {
  const fim = ate ? new Date(ate) : agora;
  const inicio = de ? new Date(de) : new Date(fim.getTime() - Math.max(1, Math.min(Number(dias) || 14, 365)) * DIA_MS);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) throw Object.assign(new Error('periodo_invalido'), { status: 400 });
  const dados = await lerDados({ de: inicio, ate: fim });
  const funil = calcularFunil({ ...dados, agora });
  const prontidao = Object.fromEntries(Object.entries(dados.prontidao || {}).map(([k, v]) => [k, Number(v) || 0]));
  const suspeitos = dados.suspeitos.map((s) => ({ motivo: s.motivo, n: Number(s.n) }));
  return {
    periodo: { de: inicio.toISOString(), ate: fim.toISOString() },
    observacao: 'Coorte: pessoas cujo primeiro carimbo caiu no período. Dias contados na data do banco. Admins, contas @teste.invalid e carimbos do teste de pódio ficam de fora.',
    funil,
    prontidao,
    pontos: dados.pontos.map((p) => ({ ...p, carimbos: Number(p.carimbos), pessoas: Number(p.pessoas) })),
    pontos_sem_visita: dados.pontos.filter((p) => p.status === 'publicado' && Number(p.carimbos) === 0).map((p) => p.codigo),
    suspeitos,
    sinais: avaliarSinais({ funil, prontidao, suspeitos }),
  };
}

