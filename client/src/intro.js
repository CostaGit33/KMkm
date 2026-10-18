// +1 KM · Abertura "A Descoberta" e cadastro em etapas.
// 1) Viagem em velocidade-luz  2) Globo até Eunápolis  3) Mapa com rota e carimbos
// 4) Selo +1 KM  5) Cadastro em 4 etapas com passaporte ao vivo  6) Emissão  7) Transição em íris.
import { validarNome, validarEmail, validarSenha, iniciais } from "./auth.js";

const TAU = Math.PI * 2;
const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const lerp = (a, b, k) => a + (b - a) * k;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mulberry = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ------------------------------ Som (só depois de um toque) ------------------------------ */
let ac = null;
function audio() {
  if (reduce) return null;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch { return null; }
  return ac;
}
function tone(freq, dur = 0.12, { type = "sine", vol = 0.05, to = 0, delay = 0 } = {}) {
  const c = audio(); if (!c || c.state !== "running") return;
  const t0 = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.03);
}
function whoosh(dur = 0.9, from = 300, to = 3200, vol = 0.07) {
  const c = audio(); if (!c || c.state !== "running") return;
  const n = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t0 = c.currentTime;
  s.buffer = n; f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(c.destination); s.start(t0);
}
const sfx = {
  tap: () => tone(740, 0.07, { type: "triangle", vol: 0.035 }),
  next: () => { tone(520, 0.09, { type: "triangle", vol: 0.04 }); tone(780, 0.12, { type: "triangle", vol: 0.04, delay: 0.07 }); },
  err: () => tone(190, 0.18, { type: "sawtooth", vol: 0.035, to: 120 }),
  thump: () => { tone(110, 0.35, { type: "sine", vol: 0.16, to: 38 }); whoosh(0.5, 2200, 200, 0.05); },
  ok: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { type: "sine", vol: 0.05, delay: i * 0.09 })),
  warp: () => whoosh(1.2, 200, 4200, 0.09),
};

/* ------------------------------ Mapa de dados ------------------------------ */
const PIN = { lat: -16.3766, lon: -39.5864 }; // Eunápolis, BA
const ROUTE = [[-0.52, 0.06], [-0.18, 0.2], [0.34, 0.3], [0.12, 0.47], [0.5, 0.6], [-0.2, 0.76]];
const CAPTIONS = [
  { t0: 0.35, t1: 2.55, k: "SINAL DETECTADO", h: "Algo está esperando por você." },
  { t0: 2.85, t1: 5.2, k: "COORDENADAS CONFIRMADAS", h: "COSTA DO DESCOBRIMENTO · BA" },
  { t0: 5.85, t1: 8.2, k: "CADA KM CONTA", h: "Cada lugar vira um carimbo." },
];
const FINALE_AT = 8.55;

function catmull(pts, n = 140) {
  const out = [];
  const P = (i) => pts[clamp(i, 0, pts.length - 1)];
  for (let s = 0; s < pts.length - 1; s++) {
    const steps = Math.ceil(n / (pts.length - 1));
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t, p0 = P(s - 1), p1 = P(s), p2 = P(s + 1), p3 = P(s + 2);
      out.push([0, 1].map((a) => 0.5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/* ------------------------------ Motor de canvas ------------------------------ */
function engine(canvas) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2); w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px"; canvas.style.height = h + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const R = mulberry(77);
  const stars = Array.from({ length: 420 }, () => ({ x: R() * 2 - 1, y: R() * 2 - 1, z: R() * 0.98 + 0.02, hot: R() < 0.16 }));
  const dots = Array.from({ length: 760 }, () => ({ lat: Math.asin(R() * 2 - 1), lon: R() * TAU - Math.PI, s: R() }));
  const cluster = Array.from({ length: 70 }, () => ({ lat: (PIN.lat + (R() - 0.5) * 12) * Math.PI / 180, lon: (PIN.lon + (R() - 0.5) * 12) * Math.PI / 180, s: R() }));
  const blocks = Array.from({ length: 34 }, () => ({ u: R() * 2.4 - 1.2, d: 0.04 + R() * 0.9, hgt: 0.02 + R() * 0.07, bw: 0.04 + R() * 0.06 })).sort((a, b) => b.d - a.d);
  const route = catmull(ROUTE);
  const hits = ROUTE.map(() => -1);
  let reached = 0;

  function warpSpeed(t) {
    if (t < 1.9) return 0.12 + 1.15 * Math.pow(t / 1.9, 2);
    if (t < 3.0) return lerp(1.27, 0.035, easeOut((t - 1.9) / 1.1));
    return 0.035;
  }
  function drawStars(t, dt, alpha) {
    const cx = w / 2, cy = h * 0.46, k = Math.min(w, h) * 0.62, v = warpSpeed(t);
    ctx.lineCap = "round";
    for (const s of stars) {
      const pz = s.z + v * dt * 1.0;
      s.z -= v * dt;
      if (s.z <= 0.015) { s.z = 1; s.x = R() * 2 - 1; s.y = R() * 2 - 1; continue; }
      const x = cx + (s.x / s.z) * k, y = cy + (s.y / s.z) * k, px = cx + (s.x / pz) * k, py = cy + (s.y / pz) * k;
      if (x < -50 || x > w + 50 || y < -50 || y > h + 50) { s.z = 1; s.x = R() * 2 - 1; s.y = R() * 2 - 1; continue; }
      const a = clamp((1 - s.z) * 1.4) * alpha;
      ctx.strokeStyle = s.hot ? `rgba(255,120,104,${a})` : `rgba(160, 204, 255,${a})`;
      ctx.lineWidth = clamp(0.5 + (1 - s.z) * 1.7, 0.5, 2.3);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
    }
  }

  function proj(lat, lon, lon0, th, Rr, cx, cy) {
    const l = lon - lon0, cl = Math.cos(lat);
    const x = cl * Math.sin(l), y = Math.sin(lat), z = cl * Math.cos(l);
    const y2 = y * Math.cos(th) - z * Math.sin(th), z2 = y * Math.sin(th) + z * Math.cos(th);
    return [cx + Rr * x, cy - Rr * y2, z2];
  }
  function drawGlobe(t, alpha) {
    const cx = w / 2, cy = h * 0.4, R0 = Math.min(w * 0.4, h * 0.27);
    const appear = easeOut((t - 2.45) / 0.9);
    const spin = easeOut((t - 2.45) / 2.6);
    const lon0 = lerp(PIN.lon * Math.PI / 180 - 2.3, PIN.lon * Math.PI / 180, spin);
    const th = lerp(0.35, PIN.lat * Math.PI / 180, ease((t - 3.0) / 2.0));
    const zoom = ease((t - 5.0) / 1.5);
    const Rr = R0 * (0.6 + 0.4 * appear) * (1 + 15 * zoom * zoom);
    const a = alpha * appear * (1 - clamp((t - 5.9) / 0.6));
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(cx, cy, Rr * 0.92, cx, cy, Rr * 1.28);
    g.addColorStop(0, "rgba(56, 149, 255,.38)"); g.addColorStop(1, "rgba(56, 149, 255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, Rr * 1.28, 0, TAU); ctx.fill();
    const body = ctx.createRadialGradient(cx - Rr * 0.3, cy - Rr * 0.35, Rr * 0.1, cx, cy, Rr);
    body.addColorStop(0, "#323538"); body.addColorStop(0.7, "#1b1c1e"); body.addColorStop(1, "#0e0f10");
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, Rr, 0, TAU); ctx.fill();
    ctx.lineWidth = 1;
    // linhas de grade (paralelos e meridianos)
    const line = (pts, front, back) => {
      ctx.beginPath(); let pen = false;
      for (const [x, y, z] of pts) { if (z > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false; }
      ctx.strokeStyle = front; ctx.stroke(); void back;
    };
    for (let la = -80; la <= 80; la += 20) {
      const pts = []; for (let lo = -180; lo <= 180; lo += 6) pts.push(proj(la * Math.PI / 180, lo * Math.PI / 180, lon0, th, Rr, cx, cy));
      line(pts, la === 0 ? "rgba(255,120,104,.75)" : "rgba(56, 149, 255,.38)");
    }
    for (let lo = -180; lo < 180; lo += 20) {
      const pts = []; for (let la = -90; la <= 90; la += 6) pts.push(proj(la * Math.PI / 180, lo * Math.PI / 180, lon0, th, Rr, cx, cy));
      line(pts, "rgba(56, 149, 255,.3)");
    }
    // pontos de dados + cluster do destino
    for (const d of dots) { const [x, y, z] = proj(d.lat, d.lon, lon0, th, Rr, cx, cy); if (z > 0.02) { ctx.fillStyle = `rgba(150, 199, 255,${0.16 + d.s * 0.45 * z})`; ctx.fillRect(x, y, 1.5, 1.5); } }
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    for (const d of cluster) { const [x, y, z] = proj(d.lat, d.lon, lon0, th, Rr, cx, cy); if (z > 0.02) { ctx.fillStyle = `rgba(255,120,104,${0.45 + 0.5 * pulse * d.s})`; ctx.fillRect(x - 1, y - 1, 2.6, 2.6); } }
    // alfinete em Eunápolis
    const [px, py, pz] = proj(PIN.lat * Math.PI / 180, PIN.lon * Math.PI / 180, lon0, th, Rr, cx, cy);
    if (pz > 0.05 && t > 3.4) {
      const pa = clamp((t - 3.4) / 0.5) * clamp(1 - zoom * 1.3);
      ctx.globalAlpha = a * pa;
      for (let i = 0; i < 3; i++) { const p = ((t * 0.9 + i / 3) % 1); ctx.strokeStyle = `rgba(255,77,63,${(1 - p) * 0.9})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(px, py, 4 + p * 36, (4 + p * 36) * 0.9, 0, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = "#ff4d3f"; ctx.shadowColor = "#ff4d3f"; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      const lx = px + (px > cx ? -1 : 1) * Math.min(w, h) * 0.2, ly = py - Math.min(w, h) * 0.2;
      ctx.strokeStyle = "rgba(56, 149, 255,.9)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(lx, ly); ctx.lineTo(lx + (lx > px ? 70 : -70), ly); ctx.stroke();
      ctx.fillStyle = "#f2f2f3"; ctx.font = "700 12px Rajdhani, sans-serif"; ctx.textAlign = lx > px ? "left" : "right";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
      ctx.fillText("COSTA DO DESCOBRIMENTO · BA", lx + (lx > px ? 4 : -4), ly - 6);
      ctx.fillStyle = "rgba(56, 149, 255,.9)"; ctx.font = "600 10px Rajdhani, sans-serif"; ctx.fillText("PONTO ZERO", lx + (lx > px ? 4 : -4), ly + 13);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    }
    ctx.restore();
  }

  const proj2 = (u, d) => { const s = Math.pow(1 - d, 1.7), yh = h * 0.34, yb = h * 1.04; return [w / 2 + u * w * 0.75 * s, yh + (yb - yh) * s, s]; };
  function drawPlane(t, alpha, calm) {
    if (alpha <= 0.01) return;
    const yh = h * 0.34, yb = h * 1.04;
    ctx.save(); ctx.globalAlpha = alpha;
    const sky = ctx.createLinearGradient(0, yh - h * 0.18, 0, yh + h * 0.12);
    sky.addColorStop(0, "rgba(56, 149, 255,0)"); sky.addColorStop(0.55, "rgba(56, 149, 255,.2)"); sky.addColorStop(1, "rgba(255,77,63,.07)");
    ctx.fillStyle = sky; ctx.fillRect(0, yh - h * 0.18, w, h * 0.3);
    ctx.lineWidth = 1;
    const off = (t * (calm ? 0.04 : 0.16)) % 1, N = 18;
    for (let k = 0; k < N; k++) {
      const d = 1 - (k + off) / N, s = Math.pow(1 - d, 1.7), y = yh + (yb - yh) * s;
      ctx.strokeStyle = `rgba(56, 149, 255,${0.07 + 0.3 * s})`; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let u = -4; u <= 4; u += 0.25) { const [x] = proj2(u, 0); ctx.strokeStyle = "rgba(56, 149, 255,.2)"; ctx.beginPath(); ctx.moveTo(w / 2, yh); ctx.lineTo(x, yb); ctx.stroke(); }
    // quarteirões em relevo
    for (const b of blocks) {
      const [x, y, s] = proj2(b.u, b.d), bw = b.bw * w * 0.75 * s, bh = b.hgt * h * 3.2 * s;
      ctx.fillStyle = "rgba(32, 34, 36,.55)"; ctx.fillRect(x - bw / 2, y - bh, bw, bh);
      ctx.strokeStyle = `rgba(56, 149, 255,${0.2 + 0.4 * s})`; ctx.strokeRect(x - bw / 2, y - bh, bw, bh);
      ctx.fillStyle = `rgba(56, 149, 255,${0.08 + 0.12 * s})`; ctx.fillRect(x - bw / 2, y - bh, bw, 2);
    }
    // rota
    const p = calm ? 1 : clamp((t - 6.15) / 2.1);
    const upto = Math.floor(p * (route.length - 1));
    if (upto > 1) {
      const pts = route.slice(0, upto + 1).map(([u, d]) => proj2(u, d));
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(255,77,63,${calm ? 0.35 : 0.28})`; ctx.lineWidth = 14; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.strokeStyle = calm ? "rgba(255,120,104,.7)" : "#ff6f62"; ctx.shadowColor = "#ff4d3f"; ctx.shadowBlur = 14; ctx.lineWidth = 3.2; ctx.stroke(); ctx.shadowBlur = 0;
      ctx.setLineDash([2, 7]); ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
      if (!calm) { const [hx, hy] = pts[pts.length - 1]; ctx.fillStyle = "#fff"; ctx.shadowColor = "#3895ff"; ctx.shadowBlur = 22; ctx.beginPath(); ctx.arc(hx, hy, 5.5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; }
    }
    // marcos
    ROUTE.forEach(([u, d], i) => {
      const at = (i / (ROUTE.length - 1));
      if (p + 0.0001 < at) return;
      if (hits[i] < 0) { hits[i] = t; reached = Math.max(reached, i + 1); if (!calm) sfx.tap(); }
      const [x, y, s] = proj2(u, d), age = t - hits[i], sc = 0.55 + 0.9 * s;
      for (let r = 0; r < 2; r++) { const q = clamp((age - r * 0.25) / 1.1); if (q > 0 && q < 1 && !calm) { ctx.strokeStyle = `rgba(56, 149, 255,${(1 - q) * 0.9})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, (6 + q * 54) * sc, (6 + q * 54) * sc * 0.38, 0, 0, TAU); ctx.stroke(); } }
      const rise = calm ? 1 : easeOut(age / 0.45), top = y - 38 * sc * rise;
      ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, top); ctx.stroke();
      ctx.save(); ctx.translate(x, top); ctx.rotate(Math.PI / 4); const q = 8 * sc;
      ctx.fillStyle = i === ROUTE.length - 1 ? "#ff4d3f" : "#1c1c1e"; ctx.strokeStyle = i === ROUTE.length - 1 ? "#ffd0ca" : "#3895ff"; ctx.lineWidth = 2; ctx.shadowColor = i === ROUTE.length - 1 ? "#ff4d3f" : "#3895ff"; ctx.shadowBlur = 12;
      ctx.fillRect(-q, -q, 2 * q, 2 * q); ctx.strokeRect(-q, -q, 2 * q, 2 * q); ctx.restore(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff"; ctx.font = `700 ${Math.round(9 + 3 * sc)}px Orbitron, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(i + 1), x, top + 0.5);
    });
    ctx.restore();
  }
  function drawVignette() {
    const g = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.75);
    g.addColorStop(0, "rgba(0, 0, 0,0)"); g.addColorStop(1, "rgba(0, 0, 0,.82)"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  return {
    resize, reached: () => reached,
    frame(t, dt, mode) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, w, h);
      if (mode === "cine") {
        const calmStars = clamp(1 - (t - 3.2) / 1.6) * 0.6 + 0.4;
        drawStars(t, dt, t < 5.9 ? 1 : 0.5 * calmStars + 0.2);
        drawGlobe(t, 1);
        drawPlane(t, ease((t - 5.8) / 0.9), false);
      } else {
        drawPlane(t, 0.55, true);
        drawStars(t, dt, 0.5);
      }
      drawVignette();
    },
  };
}

/* ------------------------------ Passaporte ao vivo ------------------------------ */
function passportHtml() {
  return `<div class="wz-card" aria-hidden="true"><div class="pp-holo"></div>
    <div class="pp-head"><img src="/icons/stamp.svg" alt="" width="30" height="30" /><div><b>PASSAPORTE +1 KM</b><small>+1 KM · BR</small></div><i class="pp-chip"></i></div>
    <div class="pp-body"><div class="pp-avatar" data-pp="ini">?</div>
      <div class="pp-lines"><label>EXPLORADOR</label><strong data-pp="nome" class="pp-empty">— — — — —</strong>
      <label>CANAL</label><span data-pp="email" class="pp-empty">— — — — — — —</span></div></div>
    <div class="pp-foot"><div><label>CIDADE</label><b>Eunápolis</b></div><div><label>CHAVE</label><b data-pp="key">· · · · · ·</b></div><div class="pp-bars" data-pp="bars"></div></div>
    <div class="pp-approved">APROVADO</div></div>`;
}

const STEPS = [
  { key: "nome", kicker: "ETAPA 01 · IDENTIDADE", q: "Como devemos te chamar, explorador?", ph: "Seu nome", type: "text", ac: "name", hint: "Aparece no seu passaporte e nos certificados.", check: validarNome, attrs: 'maxlength="36" autocapitalize="words"' },
  { key: "email", kicker: "ETAPA 02 · CANAL", q: "Qual e-mail abre o seu acesso?", ph: "voce@exemplo.com", type: "email", ac: "email", hint: "Fica salvo só neste aparelho.", check: validarEmail, attrs: 'inputmode="email" autocapitalize="none" spellcheck="false" maxlength="120"' },
  { key: "senha", kicker: "ETAPA 03 · CHAVE", q: "Crie a sua chave de acesso.", ph: "Mínimo de 6 caracteres", type: "password", ac: "new-password", hint: "Use letras, números e um símbolo para uma chave blindada.", check: validarSenha, meter: true, attrs: 'maxlength="100"' },
  { key: "confirma", kicker: "ETAPA 04 · CONFIRMAÇÃO", q: "Digite a chave mais uma vez.", ph: "Repita a senha", type: "password", ac: "new-password", hint: "Quase lá. Falta só selar o seu passaporte.", live: true, attrs: 'maxlength="100"' },
];
const strength = (s) => {
  let p = 0; if (s.length >= 6) p++; if (s.length >= 10) p++; if (/[a-z]/.test(s) && /[A-Z]/.test(s)) p++; if (/\d/.test(s) && /[^A-Za-z0-9]/.test(s)) p++;
  return Math.min(4, s.length < 6 ? Math.min(p, 1) : p);
};
const LABELS = ["MUITO CURTA", "FRACA", "BOA", "FORTE", "BLINDADA"];

/* ------------------------------ Orquestração ------------------------------ */
export function startIntro({ mode = "full", onCreate, onEnter, onFinish } = {}) {
  document.getElementById("intro")?.remove();
  const el = document.createElement("div");
  el.id = "intro"; el.className = "intro"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Bem-vindo ao +1 KM");
  el.innerHTML = `<canvas class="in-canvas" aria-hidden="true"></canvas><div class="in-flash"></div>
    <button class="in-skip" type="button">PULAR <span>▸▸</span></button>
    <div class="in-hud" aria-hidden="true"><span>+1 KM // ENLACE ATIVO</span><span class="in-clock">00:00</span></div>
    <div class="in-cap" aria-live="polite"><small></small><h2></h2></div>
    <div class="in-counter" aria-hidden="true"><b>0</b><span>CARIMBOS</span></div>
    <section class="in-final">
      <div class="in-rings"><i></i><i></i><i></i></div>
      <img class="in-logo" src="/icons/stamp.svg" alt="" width="132" height="132" />
      <h1 class="in-title"><span>+1</span> <span>KM</span></h1>
      <p class="in-sub">Descubra a cidade.<br />Colecione cada quilômetro.</p>
      <button class="primary-button in-cta" type="button">${mode === "login" ? "ENTRAR" : "COMEÇAR A DESCOBRIR"} <span aria-hidden="true">→</span></button>
      <small class="in-legal">${mode === "login" ? "Sua caderneta está guardada neste aparelho." : "Seu passaporte fica salvo neste aparelho."}</small>
    </section>
    <section class="wz" hidden></section><section class="iris-ring" aria-hidden="true"></section>`;
  document.body.append(el);
  document.body.classList.add("intro-open");
  document.querySelector(".app-shell")?.setAttribute("inert", "");
  document.getElementById("bottom-nav")?.setAttribute("inert", "");

  const $ = (s) => el.querySelector(s);
  const canvas = $(".in-canvas"), eng = engine(canvas);
  const capEl = $(".in-cap"), capK = $(".in-cap small"), capH = $(".in-cap h2"), counter = $(".in-counter b"), clock = $(".in-clock");
  const data = { nome: "", email: "", senha: "", confirma: "" };
  let t = mode === "login" || reduce ? FINALE_AT : 0, last = performance.now(), raf = 0, stage = mode === "login" || reduce ? "finale" : "cine", capIdx = -1, countShown = 0, dead = false;

  const resize = () => eng.resize();
  window.addEventListener("resize", resize);

  function showFinale() {
    if (stage === "finale" && el.classList.contains("is-finale")) return;
    stage = "finale";
    el.classList.add("is-finale"); el.classList.remove("has-cap");
    $(".in-skip").hidden = true;
    if (!reduce) { el.classList.add("do-flash"); sfx.thump(); navigator.vibrate?.([20, 40, 30]); }
    setTimeout(() => $(".in-cta")?.focus({ preventScroll: true }), 1200);
  }
  if (stage === "finale") { $(".in-skip").hidden = true; el.classList.add("is-finale", "is-instant"); }

  function loop(now) {
    if (dead) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (stage === "cine") {
      t += dt;
      const idx = CAPTIONS.findIndex((c) => t >= c.t0 && t < c.t1);
      if (idx !== capIdx) {
        capIdx = idx;
        if (idx >= 0) { capK.textContent = ""; capH.textContent = CAPTIONS[idx].h; capEl.classList.remove("on"); void capEl.offsetWidth; capEl.classList.add("on"); el.classList.add("has-cap"); }
        else { capEl.classList.remove("on"); }
      }
      if (idx >= 0) { const c = CAPTIONS[idx], n = Math.floor((t - c.t0) * 38); capK.textContent = c.k.slice(0, n) + (n < c.k.length ? "▌" : ""); }
      if (t > 1.9 && t < 2.1 && !el._w) { el._w = 1; sfx.warp(); }
      const rc = eng.reached(); if (rc !== countShown) { countShown = rc; counter.textContent = String(rc); counter.parentElement.classList.remove("bump"); void counter.offsetWidth; counter.parentElement.classList.add("bump"); }
      el.classList.toggle("show-counter", t > 6 && t < FINALE_AT);
      if (t >= FINALE_AT) showFinale();
    } else t += dt;
    clock.textContent = `00:${String(Math.min(59, Math.floor(t))).padStart(2, "0")}`;
    eng.frame(t, dt, stage === "cine" ? "cine" : "calm");
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  $(".in-skip").addEventListener("click", () => { audio(); sfx.tap(); t = FINALE_AT; showFinale(); });
  el.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && stage === "cine") { t = FINALE_AT; showFinale(); } });

  /* --- do final ao cadastro --- */
  $(".in-cta").addEventListener("click", () => {
    audio(); sfx.next();
    if (mode === "login") { leave(() => onEnter?.(), { quick: true }); return; }
    el.classList.add("to-wizard");
    setTimeout(() => { $(".in-final").hidden = true; startWizard(0); }, 520);
  });

  /* --- cadastro em etapas --- */
  const wz = $(".wz");
  let step = 0, pointerTilt = null;
  function startWizard(from) {
    wz.hidden = false; el.classList.add("in-wizard");
    wz.innerHTML = `<header class="wz-top"><button class="wz-back" type="button" aria-label="Voltar">‹</button><div class="wz-steps" role="progressbar" aria-valuemin="1" aria-valuemax="4">${STEPS.map(() => "<i></i>").join("")}</div><span class="wz-count">01/04</span></header>
      ${passportHtml()}<form class="wz-form" novalidate></form>`;
    wz.addEventListener("pointermove", (ev) => { const c = wz.querySelector(".wz-card"); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty("--rx", `${((ev.clientY - r.top) / r.height - 0.5) * -10}deg`); c.style.setProperty("--ry", `${((ev.clientX - r.left) / r.width - 0.5) * 14}deg`); });
    wz.querySelector(".wz-back").addEventListener("click", () => { if (step === 0) return; sfx.tap(); go(step - 1, -1); });
    wz.querySelector(".wz-form").addEventListener("submit", onSubmit);
    wz.querySelector(".wz-form").addEventListener("input", onInput);
    wz.querySelector(".wz-form").addEventListener("click", (ev) => {
      const b = ev.target.closest(".wz-eye"); if (!b) return;
      const inp = wz.querySelector(".wz-input"); const show = inp.type === "password"; inp.type = show ? "text" : "password"; b.setAttribute("aria-pressed", String(show)); b.textContent = show ? "OCULTAR" : "VER"; inp.focus();
    });
    paintStep(from, 1, true); updateCard();
  }
  function paintStep(i, dir = 1, first = false) {
    step = i; const s = STEPS[i], form = wz.querySelector(".wz-form");
    wz.querySelector(".wz-count").textContent = `0${i + 1}/04`;
    wz.querySelector(".wz-steps").setAttribute("aria-valuenow", String(i + 1));
    wz.querySelectorAll(".wz-steps i").forEach((n, k) => { n.className = k < i ? "done" : k === i ? "now" : ""; });
    wz.querySelector(".wz-back").style.visibility = i === 0 ? "hidden" : "visible";
    form.innerHTML = `<p class="wz-kicker">// ${s.kicker}</p><h2 class="wz-q">${esc(s.q)}</h2>
      <label class="wz-field"><span class="sr-only">${esc(s.q)}</span><input class="wz-input" name="${s.key}" type="${s.type}" placeholder="${esc(s.ph)}" autocomplete="${s.ac}" ${s.attrs || ""} value="${esc(data[s.key] || "")}" ${s.type === "password" ? "" : ""}/>${s.type === "password" ? '<button class="wz-eye" type="button" aria-pressed="false">VER</button>' : ""}<i class="wz-line"></i></label>
      ${s.meter ? `<div class="wz-meter" aria-hidden="true"><i></i><i></i><i></i><i></i><b>—</b></div>` : ""}
      <p class="wz-hint" role="status" aria-live="polite">${esc(s.hint)}</p>
      <button class="primary-button wz-next" type="submit">${i === 3 ? "SELAR MEU PASSAPORTE" : "CONTINUAR"} <span aria-hidden="true">→</span></button>`;
    form.className = `wz-form ${dir > 0 ? "in-right" : "in-left"}`;
    void form.offsetWidth; form.classList.add("is-in");
    const inp = form.querySelector(".wz-input");
    if (!first || true) setTimeout(() => inp?.focus({ preventScroll: true }), 80);
    if (s.meter || s.live) onInput();
  }
  function go(to, dir) {
    const form = wz.querySelector(".wz-form"); form.classList.remove("is-in"); form.classList.add(dir > 0 ? "out-left" : "out-right");
    setTimeout(() => { form.classList.remove("out-left", "out-right"); paintStep(to, dir); updateCard(); }, 230);
  }
  function onInput() {
    const s = STEPS[step], inp = wz.querySelector(".wz-input"); if (!inp) return;
    data[s.key] = inp.value; wz.querySelector(".wz-field")?.classList.remove("bad");
    const hint = wz.querySelector(".wz-hint"); hint.classList.remove("err", "ok");
    if (s.meter) {
      const sc = strength(inp.value), m = wz.querySelector(".wz-meter");
      m.dataset.s = String(inp.value ? sc : 0); m.querySelector("b").textContent = inp.value ? LABELS[sc] : "—";
    }
    if (s.live) {
      if (inp.value && inp.value === data.senha) { hint.textContent = "As chaves coincidem. Passaporte pronto para ser selado."; hint.classList.add("ok"); }
      else if (inp.value) { hint.textContent = "Ainda não coincide com a chave anterior."; }
      else hint.textContent = s.hint;
    }
    updateCard();
  }
  function updateCard() {
    const q = (n) => wz.querySelector(`[data-pp="${n}"]`); if (!q("nome")) return;
    const nome = (data.nome || "").trim(), email = (data.email || "").trim();
    q("nome").textContent = nome ? nome.toUpperCase() : "— — — — —"; q("nome").classList.toggle("pp-empty", !nome);
    q("email").textContent = email || "— — — — — — —"; q("email").classList.toggle("pp-empty", !email);
    q("ini").textContent = nome ? iniciais(nome) : "?"; q("ini").classList.toggle("on", !!nome);
    q("key").textContent = data.senha ? "●".repeat(Math.min(8, data.senha.length)) : "· · · · · ·";
    const r = mulberry(hash(nome + "|" + email + "|" + (data.senha || "").length)); q("bars").innerHTML = Array.from({ length: 26 }, () => `<i style="height:${30 + Math.floor(r() * 70)}%;opacity:${nome ? 0.4 + r() * 0.6 : 0.18}"></i>`).join("");
  }
  async function onSubmit(ev) {
    ev.preventDefault(); audio();
    const s = STEPS[step], inp = wz.querySelector(".wz-input"), hint = wz.querySelector(".wz-hint"), field = wz.querySelector(".wz-field");
    data[s.key] = inp.value;
    let erro = s.check ? s.check(data[s.key]) : null;
    if (!erro && s.key === "confirma" && data.confirma !== data.senha) erro = "As senhas não são iguais.";
    if (erro) { hint.textContent = erro; hint.classList.add("err"); hint.classList.remove("ok"); field.classList.remove("bad"); void field.offsetWidth; field.classList.add("bad"); sfx.err(); navigator.vibrate?.(40); inp.focus(); return; }
    if (s.key === "nome") data.nome = data.nome.trim();
    if (s.key === "email") data.email = data.email.trim().toLowerCase();
    sfx.next();
    wz.querySelector(".wz-card").classList.remove("pulse"); void wz.querySelector(".wz-card").offsetWidth; wz.querySelector(".wz-card").classList.add("pulse");
    if (step < STEPS.length - 1) go(step + 1, 1); else issue();
  }

  /* --- emissão do passaporte --- */
  function issue() {
    wz.classList.add("is-issuing");
    const form = wz.querySelector(".wz-form"); form.classList.remove("is-in"); form.classList.add("out-left");
    const box = document.createElement("div"); box.className = "iss";
    box.innerHTML = `<div class="iss-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fg" pathLength="100"/></svg><b>0%</b></div><ul class="iss-log" aria-live="polite"></ul>`;
    wz.append(box);
    const logs = ["Verificando identidade do explorador", "Selando a chave neste aparelho (SHA-256)", "Mapeando os pontos da cidade", "Gravando o carimbo zero da sua caderneta"];
    const ul = box.querySelector(".iss-log"), fg = box.querySelector(".fg"), pct = box.querySelector(".iss-ring b");
    const DUR = reduce ? 600 : 3900, t0 = performance.now(); let shown = 0, done = false;
    const tick = (now) => {
      if (dead) return; const p = clamp((now - t0) / DUR), e = ease(p);
      fg.style.strokeDashoffset = String(100 - e * 100); pct.textContent = `${Math.round(e * 100)}%`;
      while (shown < logs.length && p >= shown / logs.length - 0.001) { const li = document.createElement("li"); li.textContent = logs[shown]; ul.append(li); requestAnimationFrame(() => li.classList.add("on")); if (shown) { ul.children[shown - 1].classList.add("ok"); sfx.tap(); } shown++; }
      if (p < 1) requestAnimationFrame(tick); else if (!done) { done = true; ul.lastChild?.classList.add("ok"); approve(); }
    };
    setTimeout(() => requestAnimationFrame(tick), reduce ? 0 : 450);
  }
  function approve() {
    const card = wz.querySelector(".wz-card"); wz.classList.add("is-approved"); card.classList.add("approved");
    el.classList.add("do-flash2"); sfx.thump(); setTimeout(sfx.ok, 260); navigator.vibrate?.([30, 60, 40]);
    setTimeout(() => leave(async () => { await onCreate?.({ nome: data.nome, email: data.email, senha: data.senha }); }), reduce ? 400 : 1750);
  }

  /* --- transição em íris --- */
  async function leave(before, { quick = false } = {}) {
    if (dead) return;
    el.classList.add("is-leaving"); if (quick) el.classList.add("quick");
    if (!reduce) { whoosh(0.9, 400, 5000, 0.08); }
    await new Promise((r) => setTimeout(r, quick ? 80 : 520));
    try { await before?.(); } catch (e) { console.error(e); }
    el.classList.add("iris-open");
    await new Promise((r) => setTimeout(r, reduce ? 50 : quick ? 500 : 1250));
    destroy(); onFinish?.();
  }
  function destroy() {
    dead = true; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); el.remove();
    document.body.classList.remove("intro-open");
    document.querySelector(".app-shell")?.removeAttribute("inert");
    document.getElementById("bottom-nav")?.removeAttribute("inert");
  }
  return { destroy };
}
