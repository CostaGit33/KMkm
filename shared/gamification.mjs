export const XP_REWARDS = Object.freeze({
  FIRST_VERIFIED_POINT: 10,
  FIRST_CIRCUIT_COMPLETION: 20,
  SEASON_POINT: 10,
});

// Escala compatível com o catálogo atual: 14 pontos (10 XP cada) e 4 circuitos (20 XP cada) = 220 XP no máximo.
export const GAMIFICATION_LEVELS = Object.freeze([
  { level: 1, name: "Primeiro passo", minXP: 0, icon: "✦" },
  { level: 2, name: "Viajante", minXP: 30, icon: "➜" },
  { level: 3, name: "Descobridor", minXP: 70, icon: "⌖" },
  { level: 4, name: "Caminhante", minXP: 120, icon: "⌁" },
  { level: 5, name: "Cartógrafo", minXP: 170, icon: "▧" },
  { level: 6, name: "Guardião de Eunápolis", minXP: 220, icon: "✹" },
]);

const nonNegativeInteger = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

/** XP permanente: primeiro carimbo registrado para cada ponto/tag + primeira conclusão de cada circuito. */
export function calculateLifetimeXP({ uniquePoints = 0, completedCircuits = 0 } = {}) {
  const points = nonNegativeInteger(uniquePoints);
  const circuits = nonNegativeInteger(completedCircuits);
  return points * XP_REWARDS.FIRST_VERIFIED_POINT + circuits * XP_REWARDS.FIRST_CIRCUIT_COMPLETION;
}

/** XP sazonal: um crédito por ponto distinto carimbado durante a temporada. */
export function calculateSeasonXP(uniquePoints = 0) {
  return nonNegativeInteger(uniquePoints) * XP_REWARDS.SEASON_POINT;
}

export function getLevelForXP(value, levels = GAMIFICATION_LEVELS) {
  const xp = nonNegativeInteger(value);
  const safeLevels = [...levels].sort((a, b) => a.minXP - b.minXP);
  if (!safeLevels.length) throw new TypeError("A escala de níveis não pode estar vazia.");

  let index = 0;
  for (let i = 1; i < safeLevels.length; i += 1) {
    if (xp < safeLevels[i].minXP) break;
    index = i;
  }
  const current = safeLevels[index];
  const next = safeLevels[index + 1] || null;
  const progressXP = next ? Math.min(xp, next.minXP) - current.minXP : 0;
  const rangeXP = next ? next.minXP - current.minXP : 0;

  return {
    xp,
    current,
    next,
    progressXP: Math.max(0, progressXP),
    rangeXP,
    percent: rangeXP ? Math.min(100, Math.round((progressXP / rangeXP) * 100)) : 100,
    isAtTop: !next,
  };
}

/**
 * Ordena por XP e atribui posições. Desempate: quem chegou primeiro à pontuação (reachedAt, ISO ou Date) fica na frente,
 * depois o apelido. Com `sharedTies: true` (padrão, comportamento antigo) empates de XP dividem a mesma posição;
 * com `sharedTies: false` cada pessoa tem uma posição única, na ordem do desempate.
 * Não inclui identidade interna por conta própria.
 */
export function rankPodiumRows(entries = [], { sharedTies = true } = {}) {
  const time = (value) => {
    const ms = value instanceof Date ? value.getTime() : Date.parse(value);
    return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
  };
  const sorted = entries.map((entry) => {
    const uniquePoints = nonNegativeInteger(entry.uniquePoints);
    return {
      ...entry,
      uniquePoints,
      seasonXP: nonNegativeInteger(entry.seasonXP ?? calculateSeasonXP(uniquePoints)),
    };
  }).sort((a, b) => b.seasonXP - a.seasonXP
    || (sharedTies ? 0 : time(a.reachedAt) - time(b.reachedAt))
    || String(a.alias || "").localeCompare(String(b.alias || ""), "pt-BR"));

  let previousXP = null;
  let rank = 0;
  return sorted.map((entry, index) => {
    if (!sharedTies) rank = index + 1;
    else if (entry.seasonXP !== previousXP) rank = index + 1;
    previousXP = entry.seasonXP;
    return { ...entry, rank };
  });
}
