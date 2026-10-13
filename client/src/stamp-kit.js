// Família de carimbos da Caderneta: 8 modelos, 5 tintas, textura de tinta, pressão e animação do toque.
import { POINTS, getCategory } from "./data.js";

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cut = (s, n) => { const t = String(s).toUpperCase(); return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t; };
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// Número aleatório repetível: o mesmo ponto + a mesma data geram sempre o mesmo carimbo
const rng = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
let uid = 0;

// 3 níveis de pressão x 4 desenhos de falha de tinta
export function installInk() {
  if (document.getElementById("ink-defs")) return;
  let d = "";
  for (let p = 1; p <= 3; p++) for (let s = 0; s < 4; s++) {
    const T = [3.7, 3.0, 2.4][p - 1], D = [1.9, 1.5, 1.1][p - 1];
    d += `<filter id="ink${p}${s}" color-interpolation-filters="sRGB" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="${s + 3}" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="${D}" result="d"/><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${s * 7 + 11}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 12 0 0 0 -${T}" result="h"/><feComposite in="d" in2="h" operator="in"/></filter>`;
  }
  d += `<linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38e1ff"/><stop offset=".35" stop-color="#a78bff"/><stop offset=".7" stop-color="#ff4d3f"/><stop offset="1" stop-color="#ffc53d"/></linearGradient>`;
  document.body.insertAdjacentHTML("afterbegin", `<svg id="ink-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${d}</defs></svg>`);
}

// Qual modelo cada ponto recebe (a numeração continua a mesma de antes)
//   misterioso -> losango | início/chegada da coleção -> anel duplo | sabores -> oval de parada | demais -> círculo e retângulo alternados
export function modelFor(point, ordinal, role = "") {
  if (point.hidden) return "d";
  if (role === "inicio" || role === "chegada") return "i";
  if (point.categoryIds?.includes("sabores")) return "o";
  return Number(ordinal) % 2 ? "c" : "r";
}

// Selinho "+1" no canto do carimbo (só nos carimbos grandes: tela do toque e ficha do ponto)
const BADGE = `<g class="stamp-plus"><circle cx="111" cy="9" r="13" stroke-width="2.5" style="fill:var(--card)"/><text x="111" y="13.5" font-size="12" text-anchor="middle">+1</text></g>`;

const T = (y, z, txt) => `<text x="60" y="${y}" font-size="${z}" text-anchor="middle">${txt ?? ""}</text>`;

// ---- V6 · ornamentos de precisão (tiques, órbitas, nós, colchetes e selo digital) ----
const rad = (d) => (d * Math.PI) / 180;
const f1 = (n) => Number(n.toFixed(2));
// Anel de tiques: um traço curto a cada `step` graus, mais longo a cada `major` graus
function ticks(r1, r2, rMajor, step, major, sw = 0.8) {
  let d = "";
  for (let a = 0; a < 360; a += step) {
    const r = a % major === 0 ? rMajor : r1;
    d += `M${f1(60 + r * Math.cos(rad(a)))},${f1(60 + r * Math.sin(rad(a)))}L${f1(60 + r2 * Math.cos(rad(a)))},${f1(60 + r2 * Math.sin(rad(a)))}`;
  }
  return `<path d="${d}" stroke-width="${sw}" stroke-linecap="round" opacity=".85"/>`;
}
const node = (x, y, r = 2.3) => `<circle cx="${x}" cy="${y}" r="${r}" stroke-width="1.2" style="fill:var(--card)"/><circle cx="${x}" cy="${y}" r="${f1(r / 2.6)}" stroke="none" fill="currentColor"/>`;
const rule = (x1, x2, y) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke-width=".8" stroke-linecap="round"/>`;
const brackets = (x, y, w, h, l = 9) => `<path d="M${x},${y + l}V${y}H${x + l}M${x + w - l},${y}H${x + w}V${y + l}M${x + w},${y + h - l}V${y + h}H${x + w - l}M${x + l},${y + h}H${x}V${y + h - l}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
// Selo digital: matriz 5x4 simétrica, única por ponto (nasce do código do ponto, não muda)
function glyph(seed, x, y, c = 2.2) {
  const r = rng(hash("glyph" + seed)); let d = "";
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) if (r() > 0.42) {
    d += `M${f1(x + i * c)},${f1(y + j * c)}h${c}v${c}h-${c}z`;
    if (i < 2) d += `M${f1(x + (4 - i) * c)},${f1(y + j * c)}h${c}v${c}h-${c}z`;
  }
  return `<path d="${d || `M${x},${y}h${c}v${c}h-${c}z`}" fill="currentColor" stroke-width="0" opacity=".9"/>`;
}
function shape(k, o, id) {
  const holo = k === "i" || k === "d" ? "url(#holo)" : "currentColor";
  if (k === "c" || k === "i") {
    return `<circle cx="60" cy="60" r="58.7" stroke-width=".6" stroke-dasharray="1.2 2.6" opacity=".8"/>` +
      `<circle cx="60" cy="60" r="56" stroke-width="${k === "i" ? 5 : 3}" stroke="${holo}"/><circle cx="60" cy="60" r="40" stroke-width="1.5"/>` +
      ticks(35, 38.6, 33, 7.5, 30) +
      (k === "i" ? `<circle cx="60" cy="60" r="44.5" stroke-width=".7" stroke-dasharray="2 2.4" stroke="url(#holo)"/>` : "") +
      node(4, 60) + node(116, 60) +
      `<path id="${id}a" d="M13,60A47,47 0 0,1 107,60" stroke="none"/><path id="${id}b" d="M9,60A51,51 0 0,0 111,60" stroke="none"/>` +
      `<text font-size="${o.za || 9}" letter-spacing="1" text-anchor="middle"><textPath href="#${id}a" startOffset="50%">${o.a}</textPath></text>` +
      `<text font-size="8" letter-spacing="1" text-anchor="middle"><textPath href="#${id}b" startOffset="50%">${o.b}</textPath></text>` +
      rule(26, 39, 44.5) + rule(81, 94, 44.5) +
      T(47, 8, o.s) + T(76, o.z || 30, o.n) + T(91, 9, o.m);
  }
  if (k === "r") return `<rect x="3" y="9" width="114" height="102" rx="16" stroke-width=".6" stroke-dasharray="1.2 2.6" opacity=".8"/>` +
    `<rect x="6" y="12" width="108" height="96" rx="14" stroke-width="3"/><rect x="14" y="20" width="92" height="80" rx="9" stroke-width="1.5"/>` +
    brackets(18, 24, 84, 72, 8) + rule(34, 86, 47.5) +
    `<path d="M30,26H90" stroke-width="1" stroke-dasharray="1 2.4" stroke-linecap="round"/>` +
    glyph(o.seed, 19, 82, 2.6) + `<g transform="translate(120 0) scale(-1 1)">${glyph(o.seed, 19, 82, 2.6)}</g>` +
    node(6, 60, 2.2) + node(114, 60, 2.2) +
    `${T(42, o.a.length <= 12 ? 9 : 7, o.a)}${T(80, 36, o.n)}${T(95, 10, o.m)}`;
  if (k === "o") return `<ellipse cx="60" cy="60" rx="58.7" ry="40.7" stroke-width=".6" stroke-dasharray="1.2 2.6" opacity=".8"/>` +
    `<ellipse cx="60" cy="60" rx="56" ry="38" stroke-width="3"/><ellipse cx="60" cy="60" rx="48" ry="30" stroke-width="1.5"/>` +
    node(4, 60, 2.2) + node(116, 60, 2.2) + rule(22, 38, 45) + rule(82, 98, 45) +
    `${T(48, 9, "PARADA")}${T(69, 9.5, o.a)}${T(84, 8, o.m)}`;
  if (k === "d") return `<polygon points="60,0 120,60 60,120 0,60" stroke-width=".6" stroke-dasharray="1.2 2.6" opacity=".8"/>` +
    `<polygon points="60,4 116,60 60,116 4,60" stroke-width="3" stroke="${holo}"/><polygon points="60,16 104,60 60,104 16,60" stroke-width="1.5"/>` +
    `<polygon points="60,26 94,60 60,94 26,60" stroke-width=".8" stroke-dasharray="2 2.4"/>` +
    node(60, 4, 2.4) + node(116, 60, 2.4) + node(60, 116, 2.4) + node(4, 60, 2.4) +
    `<circle cx="60" cy="72" r="17" stroke-width=".8" stroke-dasharray="1.2 2.4"/>` +
    `${T(48, 8.5, "MISTÉRIO")}${T(84, 34, "?")}`;
  if (k === "t") return `<polygon points="36,2 84,2 118,36 118,84 84,118 36,118 2,84 2,36" stroke-width=".6" stroke-dasharray="1.2 2.6" opacity=".8"/>` +
    `<polygon points="36,5 84,5 115,36 115,84 84,115 36,115 5,84 5,36" stroke-width="3"/><polygon points="40,15 80,15 105,40 105,80 80,105 40,105 15,80 15,40" stroke-width="1.5"/>` +
    node(36, 5, 2) + node(84, 5, 2) + node(115, 36, 2) + node(115, 84, 2) + node(84, 115, 2) + node(36, 115, 2) + node(5, 84, 2) + node(5, 36, 2) +
    rule(30, 44, 29) + rule(76, 90, 29) + `${T(40, 10, "TURMA")}${T(80, 32, o.n)}${T(96, 9, o.m)}`;
  if (k === "h") return `<polygon points="60,2 111,30 111,90 60,118 9,90 9,30" stroke-width=".6" stroke-dasharray="1.2 2.6" opacity=".8"/>` +
    `<polygon points="60,5 108,32 108,88 60,115 12,88 12,32" stroke-width="3"/><polygon points="60,15 99,37 99,83 60,105 21,83 21,37" stroke-width="1.5"/>` +
    node(60, 5, 2.2) + node(108, 32, 2.2) + node(108, 88, 2.2) + node(60, 115, 2.2) + node(12, 88, 2.2) + node(12, 32, 2.2) +
    `${T(38, 9, "GUARDIÃO")}<g stroke-width="2.5"><ellipse cx="49" cy="64" rx="5" ry="12" transform="rotate(-35 49 64)"/><ellipse cx="71" cy="64" rx="5" ry="12" transform="rotate(35 71 64)"/></g>${T(92, 9, o.m)}`;
  return `<path d="M10,22H110a6 6 0 0 1 6 6V51a9 9 0 0 0 0 18V92a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V69a9 9 0 0 0 0-18V28a6 6 0 0 1 6-6Z" stroke-width="3"/>` +
    `<path d="M14,29H106" stroke-width="1.6" stroke-dasharray=".1 3.2" stroke-linecap="round"/><path d="M14,91.5H106" stroke-width="1.6" stroke-dasharray=".1 3.2" stroke-linecap="round"/>` +
    `<line x1="22" y1="55" x2="98" y2="55" stroke-width="1" stroke-dasharray="2 3"/>` +
    glyph(o.seed, 12, 33, 1.7) + `<g transform="translate(120 0) scale(-1 1)">${glyph(o.seed, 12, 33, 1.7)}</g>` +
    `${T(45, 10, o.a)}${T(80, 24, o.n)}${T(92, 7, o.m)}`;
}
export function stampHtml(point, ordinal, { state, entry, role = "", size, plus = false } = {}) {
  const e = entry || state?.history?.find((h) => h.pointId === point.id && h.kind === "point") || null;
  const d = e?.at ? new Date(e.at) : new Date();
  const hm = d.toTimeString().slice(0, 5);
  const dt = `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
  const n = String(ordinal).padStart(2, "0");
  const k = modelFor(point, ordinal, role);
  const cor = getCategory(point.categoryIds?.[0])?.color || "blue";
  const r = rng(hash(point.id + (e?.at || "")));
  const rot = (r() * 20 - 10).toFixed(1), p = 1 + Math.floor(r() * 3), s = Math.floor(r() * 4);
  const dx = (r() * 4 - 2).toFixed(1), dy = (r() * 4 - 2).toFixed(1);
  const o = { seed: point.id, a: esc(cut(point.name, k === "r" ? 16 : k === "o" ? 13 : 24)), b: esc(dt), s: "PONTO", n: esc(n), z: 28, m: esc(hm) };
  o.za = o.a.length <= 15 ? 9 : o.a.length <= 19 ? 8 : 7; // nome longo = letra menor, para caber no arco
  if (k === "i") { o.s = role === "chegada" ? "CHEGADA" : "INÍCIO"; o.m = "★"; }
  if (k === "o") o.m = esc(`${hm} · ${dt.slice(0, 6)}`);
  const id = `st${++uid}`;
  return `<span class="stamp-wrap" data-stamp="${esc(point.id)}"${size ? ` style="width:${size}px;flex:0 0 ${size}px"` : ""}>` +
    `<svg class="stamp-svg" viewBox="0 0 120 120" fill="none" stroke="currentColor" role="img" aria-label="Carimbo ${esc(point.name)}, número ${n}${plus ? ", mais um carimbo" : ""}" ` +
    `style="color:var(--${cor});filter:url(#ink${p}${s});transform:translate(${dx}px,${dy}px) rotate(${rot}deg)">${shape(k, o, id)}${plus ? BADGE : ""}</svg></span>`;
}

// O toque: o carimbo desce, bate na página, a tinta fresca seca; vibração curta no Android
export function playStampMoment(point, state) {
  document.querySelector(".stamp-moment")?.remove();
  const el = document.createElement("div");
  el.className = "stamp-moment";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "Carimbo conquistado");
  el.innerHTML = `<div class="stamp-moment-card"><div class="stamp-moment-page">${stampHtml(point, POINTS.indexOf(point) + 1, { state, size: 220, plus: true })}</div><h2>Carimbado!</h2><p>${esc(point.name)}</p><button class="primary-button button-full" type="button">Continuar</button></div>`;
  document.body.append(el);
  const key = (ev) => { if (ev.key === "Escape") close(); };
  const close = () => { el.classList.add("is-leaving"); window.removeEventListener("keydown", key); setTimeout(() => el.remove(), 200); };
  el.addEventListener("click", (ev) => { if (ev.target === el || ev.target.closest("button")) close(); });
  window.addEventListener("keydown", key);
  el.querySelector("button").focus();
  navigator.vibrate?.(15);
  setTimeout(() => navigator.vibrate?.(35), 130);
}
