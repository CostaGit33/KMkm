// Eventos e patrocínios: cards com janela de datas sobre as tags da rota.
// Regras: a rota nunca depende de card; o card só recebe carimbo dentro da janela (UTC no banco);
// um toque gera o carimbo da rota e, se houver um card ativo no ponto, o carimbo do card.
import { q } from './db/database.js';

export const TIPOS = ['evento', 'patrocinio'];
export const MIN_PONTOS_PATROCINIO = 6;
export const MAX_PONTOS_PATROCINIO = 8;
// Relatório para patrocinador: contagem menor que isso aparece como "<5" (evita reidentificar pessoas).
export const MIN_RELATORIO = Number(process.env.RELATORIO_MIN || 5);

export function estadoDoCard(card, agora = new Date()) {
  const inicio = new Date(card.inicio_em);
  const fim = new Date(card.fim_em);
  if (card.status === 'cancelado') return 'cancelado';
  if (agora < inicio) return 'em_breve';
  if (agora >= fim) return 'encerrado';
  return 'ao_vivo';
}

// Card ativo agora neste ponto (no máximo um: a regra de criação impede sobreposição).
export async function cartaoAtivoNoPonto(conn, tagId) {
  const [rows] = await conn.query(
    `SELECT e.*, p.nome AS patrocinador
     FROM eventos e JOIN evento_tags et ON et.evento_id = e.id
     LEFT JOIN patrocinadores p ON p.id = e.patrocinador_id
     WHERE et.tag_id = ? AND e.status = 'publicado'
       AND e.inicio_em <= UTC_TIMESTAMP() AND e.fim_em > UTC_TIMESTAMP()
     ORDER BY e.id LIMIT 1`,
    [tagId],
  );
  return rows[0] || null;
}

// Já existe outro card (ativo ou futuro, não cancelado) nesses pontos dentro da janela?
export async function conflitosDeJanela(tagIds, inicio, fim, ignorarId = 0) {
  if (!tagIds.length) return [];
  return q(
    `SELECT DISTINCT e.slug, e.nome, t.codigo
     FROM eventos e JOIN evento_tags et ON et.evento_id = e.id JOIN tags t ON t.id = et.tag_id
     WHERE et.tag_id IN (${tagIds.map(() => '?').join(', ')})
       AND e.status <> 'cancelado' AND e.id <> ?
       AND e.inicio_em < ? AND e.fim_em > ?`,
    [...tagIds, ignorarId, fim, inicio],
  );
}

// Cards da caderneta da pessoa: publicados; os encerrados só aparecem se ela tem carimbo neles.
export async function cartoesDaCaderneta(usuarioId) {
  const cards = await q(
    `SELECT e.id, e.slug, e.nome, e.tipo, e.descricao, e.inicio_em, e.fim_em, e.status, p.nome AS patrocinador
     FROM eventos e LEFT JOIN patrocinadores p ON p.id = e.patrocinador_id
     WHERE e.status = 'publicado' ORDER BY e.inicio_em DESC, e.id DESC`,
  );
  if (!cards.length) return [];
  const ids = cards.map((c) => c.id);
  const marks = ids.map(() => '?').join(', ');
  const pontos = await q(
    `SELECT et.evento_id, t.codigo, t.nome AS tag_nome, t.ordem, t.forma, t.parceiro, r.cor,
            c.id AS carimbo_id, c.criado_em, c.seed
     FROM evento_tags et JOIN tags t ON t.id = et.tag_id JOIN rotas r ON r.id = t.rota_id
     LEFT JOIN carimbos c ON c.tag_id = t.id AND c.evento_id = et.evento_id AND c.usuario_id = ?
     WHERE et.evento_id IN (${marks}) ORDER BY et.evento_id, t.ordem`,
    [usuarioId, ...ids],
  );
  const agora = new Date();
  const saida = [];
  for (const card of cards) {
    const lista = pontos.filter((p) => p.evento_id === card.id).map((p) => ({
      codigo: p.codigo,
      tag_nome: p.tag_nome,
      ordem: p.ordem,
      carimbo: p.carimbo_id ? {
        id: p.carimbo_id, criado_em: p.criado_em, seed: p.seed, tag_nome: p.tag_nome, ordem: p.ordem,
        forma: p.forma, parceiro: Boolean(p.parceiro), cor: p.cor,
      } : null,
    }));
    const feitos = lista.filter((p) => p.carimbo).length;
    const estado = estadoDoCard(card, agora);
    if (estado === 'encerrado' && !feitos) continue;
    saida.push({
      slug: card.slug,
      nome: card.nome,
      tipo: card.tipo,
      descricao: card.descricao,
      // Publicidade identificada de forma clara: o texto vem pronto do servidor.
      patrocinado_por: card.tipo === 'patrocinio' && card.patrocinador ? card.patrocinador : null,
      inicio_em: card.inicio_em,
      fim_em: card.fim_em,
      estado,
      feitos,
      total: lista.length,
      pontos: lista,
    });
  }
  return saida;
}

const limitar = (n) => (n > 0 && n < MIN_RELATORIO ? `<${MIN_RELATORIO}` : n);

// Relatório agregado: sem nome, apelido, e-mail ou id de pessoa. Contagens pequenas são ocultadas.
export async function relatorioAgregado(slug, fuso = 'America/Bahia') {
  const [card] = await q(
    `SELECT e.id, e.slug, e.nome, e.tipo, e.inicio_em, e.fim_em, e.status, p.nome AS patrocinador
     FROM eventos e LEFT JOIN patrocinadores p ON p.id = e.patrocinador_id WHERE e.slug = ?`,
    [slug],
  );
  if (!card) return null;
  const [tot] = await q('SELECT COUNT(*) AS carimbos, COUNT(DISTINCT usuario_id) AS pessoas FROM carimbos WHERE evento_id = ?', [card.id]);
  const porPonto = await q(
    `SELECT t.codigo, t.nome, COUNT(c.id) AS carimbos
     FROM evento_tags et JOIN tags t ON t.id = et.tag_id
     LEFT JOIN carimbos c ON c.tag_id = et.tag_id AND c.evento_id = et.evento_id
     WHERE et.evento_id = ? GROUP BY t.id, t.codigo, t.nome, t.ordem ORDER BY t.ordem`,
    [card.id],
  );
  // Dia local da Bahia: o banco guarda UTC, então o agrupamento é feito aqui.
  const horarios = await q('SELECT criado_em FROM carimbos WHERE evento_id = ?', [card.id]);
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' });
  const dias = {};
  for (const { criado_em: quando } of horarios) { const dia = fmt.format(new Date(quando)); dias[dia] = (dias[dia] || 0) + 1; }
  const [completos] = await q(
    `SELECT COUNT(*) AS n FROM (
       SELECT c.usuario_id FROM carimbos c WHERE c.evento_id = ?
       GROUP BY c.usuario_id HAVING COUNT(DISTINCT c.tag_id) = (SELECT COUNT(*) FROM evento_tags WHERE evento_id = ?)
     ) x`,
    [card.id, card.id],
  );
  return {
    evento: { slug: card.slug, nome: card.nome, tipo: card.tipo, patrocinador: card.patrocinador, inicio_em: card.inicio_em, fim_em: card.fim_em, status: card.status },
    minimo_para_exibir: MIN_RELATORIO,
    carimbos: limitar(Number(tot.carimbos)),
    pessoas: limitar(Number(tot.pessoas)),
    colecao_completa: limitar(Number(completos.n)),
    por_ponto: porPonto.map((p) => ({ codigo: p.codigo, nome: p.nome, carimbos: limitar(Number(p.carimbos)) })),
    por_dia: Object.keys(dias).sort().map((dia) => ({ dia, carimbos: limitar(dias[dia]) })),
  };
}
