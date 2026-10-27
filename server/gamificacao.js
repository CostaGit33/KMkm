import express from 'express';
import { q } from './db/database.js';
import { instanteLocal } from './time.js';
import { calculateLifetimeXP, calculateSeasonXP, getLevelForXP, rankPodiumRows, XP_REWARDS } from '../shared/gamification.mjs';

const FUSO = process.env.APP_TZ || 'America/Bahia';
const PONTOS_MEDALHAS = [1, 5, 10];

const LIMITE_PADRAO = 10;
const LIMITE_MAXIMO = 25;

// Só o nome e o ícone do nível são públicos; o ranking geral mostra o nível de cada participante.
function nivelPublico(xp) {
  if (xp === null) return null;
  const { current } = getLevelForXP(xp);
  return { level: current.level, name: current.name, icon: current.icon };
}

// Participantes do pódio público (opt-in) com XP e desempate: quem chegou primeiro à pontuação fica na frente.
// janela = intervalo do mês; sem janela é o ranking geral (XP permanente = pontos + bônus de circuitos já concedidos).
async function classificar(janela, geral) {
  const filtro = janela ? 'WHERE criado_em >= ? AND criado_em < ?' : '';
  const rows = await q(`
    SELECT a.usuario_id, a.placar_apelido AS alias, COUNT(*) AS unique_points,
      MAX(f.first_at) AS reached_at, COALESCE(MAX(r.xp), 0) AS bonus_xp
    FROM contas a
    JOIN (SELECT usuario_id, tag_id, MIN(criado_em) AS first_at FROM carimbos WHERE evento_id IS NULL ${janela ? 'AND criado_em >= ? AND criado_em < ?' : ''} GROUP BY usuario_id, tag_id) f
      ON f.usuario_id = a.usuario_id
    LEFT JOIN (SELECT usuario_id, SUM(xp) AS xp FROM gamificacao_recompensas WHERE tipo = 'rota' GROUP BY usuario_id) r
      ON r.usuario_id = a.usuario_id
    WHERE a.placar_opt_in = TRUE AND a.placar_apelido IS NOT NULL AND a.placar_apelido <> ''
    GROUP BY a.usuario_id, a.placar_apelido
  `, janela ? [janela.start, janela.end] : []);
  return rankPodiumRows(rows.map((row) => {
    const uniquePoints = Number(row.unique_points);
    return {
      usuarioId: Number(row.usuario_id),
      alias: row.alias,
      uniquePoints,
      reachedAt: row.reached_at,
      seasonXP: geral ? calculateLifetimeXP({ uniquePoints }) + Number(row.bonus_xp || 0) : calculateSeasonXP(uniquePoints),
    };
  }), { sharedTies: false });
}

function accountOnly(req, res, next) {
  if (!req.conta || !req.u?.id) return res.status(401).json({ erro: 'sessao_conta_necessaria' });
  next();
}

function mesAtual(agora = new Date()) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO, year: 'numeric', month: '2-digit',
  }).formatToParts(agora).map((parte) => [parte.type, parte.value]));
  const year = Number(partes.year);
  const month = Number(partes.month);
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const start = instanteLocal(`${year}-${String(month).padStart(2, '0')}-01 00:00`, FUSO);
  const end = instanteLocal(`${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}-01 00:00`, FUSO);
  return {
    key: `${year}-${String(month).padStart(2, '0')}`,
    label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: FUSO }).format(agora),
    start,
    end,
  };
}

async function concederCircuitosConcluidos(usuarioId) {
  const completos = await q(`
    SELECT ci.slug, ci.nome
    FROM circuitos ci
    JOIN circuito_pontos cp ON cp.circuito_id = ci.id
    JOIN tags t ON t.id = cp.tag_id
    JOIN rotas r ON r.id = t.rota_id
    LEFT JOIN carimbos c ON c.tag_id = t.id AND c.usuario_id = ? AND c.evento_id IS NULL
    WHERE ci.status = 'publicado' AND t.status = 'publicado' AND r.status = 'publicado'
    GROUP BY ci.id, ci.slug, ci.nome
    HAVING COUNT(DISTINCT cp.tag_id) > 0
      AND COUNT(DISTINCT cp.tag_id) = COUNT(DISTINCT c.tag_id)
  `, [usuarioId]);

  for (const circuito of completos) {
    await q(`INSERT IGNORE INTO gamificacao_recompensas (usuario_id, chave, tipo, referencia, xp)
      VALUES (?, ?, 'rota', ?, ?)`, [usuarioId, `rota:${circuito.slug}`, circuito.slug, XP_REWARDS.FIRST_CIRCUIT_COMPLETION]);
  }
}

function medalhasPara({ carimbos, rotas }) {
  const milestones = PONTOS_MEDALHAS.map((target) => ({
    id: target === 1 ? 'primeiro-carimbo' : `descobertas-${target}`,
    name: target === 1 ? 'Primeiro carimbo' : `${target} descobertas`,
    description: target === 1 ? 'Valide sua primeira visita com um carimbo.' : `Carimbe ${target} pontos diferentes da cidade.`,
    icon: target === 1 ? '✦' : '⌖',
    metric: 'points',
    target,
  }));
  milestones.push(
    { id: 'primeira-rota', name: 'Primeira rota', description: 'Complete todos os pontos de um circuito publicado.', icon: '➜', metric: 'routes', target: 1 },
    { id: 'tres-rotas', name: 'Três caminhos', description: 'Complete três circuitos publicados.', icon: '⌁', metric: 'routes', target: 3 },
  );

  return milestones.map((medal) => {
    const list = medal.metric === 'points' ? carimbos : rotas;
    const current = list.length;
    const earned = current >= medal.target;
    const earnedAt = earned ? list[medal.target - 1]?.earned_at || null : null;
    return {
      id: medal.id,
      name: medal.name,
      description: medal.description,
      icon: medal.icon,
      earned,
      earnedAt,
      progress: { current: Math.min(current, medal.target), target: medal.target },
    };
  });
}

export function gamificacaoRouter({ auth, limit, wrap }) {
  const router = express.Router();
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.use(limit({ windowMs: 60 * 1000, max: 90, name: 'gamificacao' }));
  router.use(auth);
  router.use(accountOnly);

  router.get('/me', wrap(async (req, res) => {
    const usuarioId = req.u.id;
    // Recompensas de circuitos são gravadas uma única vez: edições futuras do catálogo não apagam XP conquistado.
    await concederCircuitosConcluidos(usuarioId);
    const carimbos = await q(`SELECT tag_id, MIN(criado_em) AS earned_at
      FROM carimbos WHERE usuario_id = ? AND evento_id IS NULL GROUP BY tag_id ORDER BY earned_at, tag_id`, [usuarioId]);
    const rotas = await q(`SELECT referencia, criado_em AS earned_at, xp
      FROM gamificacao_recompensas WHERE usuario_id = ? AND tipo = 'rota' ORDER BY criado_em, chave`, [usuarioId]);
    const [conta] = await q('SELECT placar_opt_in, placar_apelido FROM contas WHERE id = ? AND usuario_id = ?', [req.conta.id, usuarioId]);

    const uniquePoints = carimbos.length;
    const routeBonusXP = rotas.reduce((sum, row) => sum + Number(row.xp || 0), 0);
    const pointsXP = calculateLifetimeXP({ uniquePoints });
    const totalXP = pointsXP + routeBonusXP;
    const medals = medalhasPara({ carimbos, rotas });
    res.json({
      xp: {
        total: totalXP,
        byPoints: pointsXP,
        byRoutes: routeBonusXP,
        uniquePoints,
        completedRoutes: rotas.length,
        level: getLevelForXP(totalXP),
      },
      medals,
      participation: { optedIn: Boolean(conta?.placar_opt_in), alias: conta?.placar_apelido || '' },
    });
  }));

  router.get('/podio', wrap(async (req, res) => {
    const geral = req.query.periodo === 'geral';
    const limite = Math.min(LIMITE_MAXIMO, Math.max(3, Number.parseInt(req.query.limite, 10) || LIMITE_PADRAO));
    const mes = mesAtual();
    const janela = geral ? null : mes;
    const ranked = await classificar(janela, geral);
    const [conta] = await q('SELECT placar_opt_in, placar_apelido FROM contas WHERE id = ? AND usuario_id = ?', [req.conta.id, req.u.id]);
    const optedIn = Boolean(conta?.placar_opt_in);

    // Pontuação própria, mesmo para quem não participa do pódio público.
    if (geral) await concederCircuitosConcluidos(req.u.id);
    const [proprio] = await q(`SELECT COUNT(DISTINCT tag_id) AS unique_points FROM carimbos
      WHERE usuario_id = ? AND evento_id IS NULL${janela ? ' AND criado_em >= ? AND criado_em < ?' : ''}`,
    janela ? [req.u.id, janela.start, janela.end] : [req.u.id]);
    const [bonus] = geral
      ? await q("SELECT COALESCE(SUM(xp), 0) AS xp FROM gamificacao_recompensas WHERE usuario_id = ? AND tipo = 'rota'", [req.u.id])
      : [{ xp: 0 }];
    const uniquePoints = Number(proprio?.unique_points || 0);
    const myXP = geral ? calculateLifetimeXP({ uniquePoints }) + Number(bonus?.xp || 0) : calculateSeasonXP(uniquePoints);
    const mine = optedIn ? ranked.find((row) => row.usuarioId === Number(req.u.id)) : null;

    let toNext = null;
    if (mine && mine.rank > 1) {
      const above = ranked[mine.rank - 2];
      const diff = Math.max(0, above.seasonXP - mine.seasonXP);
      toNext = { rank: above.rank, xp: diff, points: geral ? null : Math.floor(diff / XP_REWARDS.SEASON_POINT) + 1 };
    }

    const publico = (row) => ({
      rank: row.rank, alias: row.alias, uniquePoints: row.uniquePoints, xp: row.seasonXP, seasonXP: row.seasonXP,
      level: nivelPublico(geral ? row.seasonXP : null), isMe: row.usuarioId === Number(req.u.id),
    });
    const board = ranked.slice(0, limite).map(publico);

    let previous = null;
    if (!geral) {
      const anterior = mesAtual(new Date(mes.start.getTime() - 24 * 60 * 60 * 1000));
      const antes = (await classificar(anterior, false)).slice(0, 3);
      if (antes.length) previous = { key: anterior.key, label: anterior.label, leaders: antes.map(({ rank, alias, seasonXP }) => ({ rank, alias, xp: seasonXP })) };
    }

    res.json({
      scope: geral ? 'geral' : 'mes',
      period: geral
        ? { key: 'geral', label: 'Geral', start: null, end: null }
        : { key: mes.key, label: mes.label, start: mes.start.toISOString(), end: mes.end.toISOString() },
      participants: ranked.length,
      xpPerPoint: XP_REWARDS.SEASON_POINT,
      board,
      leaders: board.slice(0, 3),
      me: {
        optedIn,
        alias: conta?.placar_apelido || '',
        uniquePoints,
        xp: myXP,
        seasonXP: myXP,
        rank: mine?.rank ?? null,
        // Posição que a pessoa teria ao participar (empates ficam atrás de quem chegou primeiro).
        wouldRank: !optedIn && myXP > 0 ? ranked.filter((row) => row.seasonXP >= myXP).length + 1 : null,
        toNext,
      },
      previous,
    });
  }));

  router.put('/participacao', wrap(async (req, res) => {
    if (typeof req.body?.optIn !== 'boolean') return res.status(400).json({ erro: 'participacao_invalida' });
    if (!req.body.optIn) {
      await q('UPDATE contas SET placar_opt_in = FALSE, placar_apelido = NULL WHERE id = ? AND usuario_id = ?', [req.conta.id, req.u.id]);
      return res.json({ optedIn: false, alias: '' });
    }

    const alias = String(req.body.alias || '').normalize('NFC').replace(/[\u0000-\u001F\u007F]/g, '').trim().replace(/\s+/g, ' ');
    if (alias.length < 2 || alias.length > 30 || alias.includes('@')) return res.status(400).json({ erro: 'apelido_publico_invalido' });
    await q('UPDATE contas SET placar_opt_in = TRUE, placar_apelido = ? WHERE id = ? AND usuario_id = ?', [alias, req.conta.id, req.u.id]);
    res.json({ optedIn: true, alias });
  }));

  return router;
}
