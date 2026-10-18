// Arte das criaturas da Pokédex de Eunápolis: SVG gerado do nome (sempre o mesmo desenho para a mesma criatura).
// Sem imagens externas e sem personagens de terceiros: formas simples combinadas por sorteio repetível.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export const RARIDADE = {
  comum: { rotulo: 'Comum', estrelas: 1 },
  raro: { rotulo: 'Rara', estrelas: 2 },
  epico: { rotulo: 'Épica', estrelas: 3 },
  lendario: { rotulo: 'Lendária', estrelas: 4 },
};
export const rotuloRaridade = (r) => (RARIDADE[r] || RARIDADE.comum).rotulo;
export const estrelas = (r) => '★'.repeat((RARIDADE[r] || RARIDADE.comum).estrelas);

// Criatura capturada (colorida) ou silhueta (ainda não capturada).
export function criaturaSvg(nome, { raridade = 'comum', silhueta = false, size = 96 } = {}) {
  const r = rng(hash(nome || '?'));
  const matiz = Math.floor(r() * 360);
  const corpo = silhueta ? 'var(--card-strong, #2a2a2c)' : `hsl(${matiz} 48% 52%)`;
  const claro = silhueta ? 'var(--card-strong, #2a2a2c)' : `hsl(${(matiz + 24) % 360} 55% 78%)`;
  const escuro = silhueta ? 'var(--card-strong, #2a2a2c)' : `hsl(${matiz} 45% 28%)`;
  const orelha = Math.floor(r() * 3);
  const cauda = Math.floor(r() * 3);
  const bico = Math.floor(r() * 3);
  const manchas = Math.floor(r() * 4);
  const rx = 30 + r() * 8;
  const ry = 26 + r() * 8;
  let g = '';
  // cauda
  g += cauda === 0 ? `<path d="M${50 + rx - 4},64 q26,-6 20,-34 q-16,10 -20,28z" fill="${corpo}"/>`
    : cauda === 1 ? `<circle cx="${50 + rx + 4}" cy="62" r="11" fill="${corpo}"/>`
    : `<path d="M${50 + rx - 6},66 l24,10 l-6,-16z" fill="${corpo}"/>`;
  // orelhas / crista
  g += orelha === 0 ? `<path d="M30,34 l-6,-20 l18,12z M70,34 l6,-20 l-18,12z" fill="${corpo}"/>`
    : orelha === 1 ? `<circle cx="32" cy="28" r="9" fill="${corpo}"/><circle cx="68" cy="28" r="9" fill="${corpo}"/>`
    : `<path d="M42,26 l8,-18 l8,18z M30,32 l4,-14 l8,12z M58,30 l8,-12 l4,14z" fill="${escuro}"/>`;
  // corpo e cabeça
  g += `<ellipse cx="50" cy="66" rx="${rx}" ry="${ry}" fill="${corpo}"/>`;
  g += `<ellipse cx="50" cy="72" rx="${rx * 0.62}" ry="${ry * 0.62}" fill="${claro}"/>`;
  g += `<circle cx="50" cy="42" r="24" fill="${corpo}"/>`;
  for (let i = 0; i < manchas; i += 1) g += `<circle cx="${28 + r() * 44}" cy="${58 + r() * 24}" r="${2.5 + r() * 3.5}" fill="${escuro}" opacity=".55"/>`;
  if (!silhueta) {
    g += `<circle cx="41" cy="40" r="5.5" fill="#fff"/><circle cx="59" cy="40" r="5.5" fill="#fff"/><circle cx="42" cy="41" r="2.8" fill="#111"/><circle cx="58" cy="41" r="2.8" fill="#111"/>`;
    g += bico === 0 ? `<path d="M44,50 l6,8 l6,-8z" fill="#f2b441"/>`
      : bico === 1 ? `<ellipse cx="50" cy="52" rx="6" ry="4" fill="${escuro}"/>`
      : `<path d="M45,51 q5,6 10,0" stroke="${escuro}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  } else {
    g += `<text x="50" y="52" font-size="26" font-weight="700" text-anchor="middle" fill="var(--muted, #8a8a90)">?</text>`;
  }
  const aura = !silhueta && raridade !== 'comum'
    ? `<circle cx="50" cy="52" r="47" fill="none" stroke="${raridade === 'raro' ? '#6bb6ff' : raridade === 'epico' ? '#b48cff' : '#ffc53d'}" stroke-width="${raridade === 'lendario' ? 3 : 2}" stroke-dasharray="${raridade === 'lendario' ? '' : '4 5'}" opacity=".85"/>`
    : '';
  return `<svg class="criatura-svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${silhueta ? 'Criatura ainda não capturada' : esc(nome)}">${aura}${g}</svg>`;
}
