import { CITY, POINTS, ROUTES, getPoint } from "../data.js";
import { stampHtml } from "../stamp-kit.js";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function progressFor(state, ids = null) {
  const isCity = ids === null;

  // Para a cidade, o catálogo publicado do servidor é a fonte de verdade.
  // POINTS é apenas o subconjunto de pontos que esta versão do frontend conhece;
  // usá-lo para contar conquistas escondia cartas válidas existentes no backend.
  if (isCity && colecaoServidor) {
    const total = Number.isFinite(Number(colecaoServidor.total))
      ? Math.max(0, Number(colecaoServidor.total))
      : (Array.isArray(colecaoServidor.itens) ? colecaoServidor.itens.length : 0);
    const count = Number.isFinite(Number(colecaoServidor.capturadas))
      ? Math.max(0, Math.min(total, Number(colecaoServidor.capturadas)))
      : (Array.isArray(colecaoServidor.itens) ? colecaoServidor.itens.filter((item) => item?.capturada === true).length : 0);
    return { count, total, percent: total ? Math.min(100, Math.round((count / total) * 100)) : 0 };
  }

  const uniqueIds = isCity ? POINTS.map((point) => point.id) : [...new Set(ids)];
  // Os códigos vêm do banco e podem ter diferenças de caixa/espaços entre ambientes.
  // Comparar códigos normalizados evita que um carimbo válido deixe de contar no circuito.
  const normalizarCodigo = (value) => String(value ?? "").trim().toUpperCase();
  const codigosCapturados = Array.isArray(colecaoServidor?.itens)
    ? new Set(colecaoServidor.itens
      .filter((item) => item?.capturada === true)
      .map((item) => normalizarCodigo(item.codigo)))
    : null;
  // Os IDs dos circuitos são códigos de ponto. Compare diretamente com os códigos
  // devolvidos pela API; não dependa do catálogo estático POINTS para reconhecer
  // um carimbo válido (o catálogo local pode estar atrás do catálogo do servidor).
  const conquistados = codigosCapturados
    ? codigosCapturados
    : new Set((state.conquered || []).map(normalizarCodigo));
  const count = uniqueIds.filter((id) => conquistados.has(normalizarCodigo(id))).length;
  const total = isCity ? CITY.totalPoints : uniqueIds.length;
  return { count, total, percent: total ? Math.min(100, Math.round((count / total) * 100)) : 0 };
}

export function routeProgress(state, route) {
  return progressFor(state, route.pointIds);
}

export function certificateRoutes(state) {
  return ROUTES.filter((route) => routeProgress(state, route).percent === 100);
}

export function pointStatus(state, point) {
  const servidor = colecaoServidor?.itens?.find((item) => getPoint(item.codigo)?.id === point.id);
  if (servidor ? servidor.capturada : state.conquered.includes(point.id)) return "conquered";
  if (point.hidden && !state.discovered.includes(point.id)) return "mystery";
  if (state.discovered.includes(point.id)) return "discovered";
  return "available";
}

export function getVisibleName(state, point) {
  return pointStatus(state, point) === "mystery" ? "Ponto misterioso" : point.name;
}

export function formatDate(value, options = { day: "2-digit", month: "short", year: "numeric" }) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Agora há pouco";
  return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

export function progressBar(progress, color = "red", label = "Progresso") {
  return `<div class="progress-track" role="progressbar" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="${progress.total}" aria-valuenow="${progress.count}"><div class="progress-fill ${color}" style="width:${progress.percent}%"></div></div>`;
}

export function pageHead(kicker, title, subtitle = "") {
  return `<header class="page-head"><div><p class="page-kicker">${escapeHtml(kicker)}</p><h1 class="page-title">${escapeHtml(title)}</h1>${subtitle ? `<p class="page-subtitle">${escapeHtml(subtitle)}</p>` : ""}</div></header>`;
}

export function stamp(point, ordinal, date = "", ctx = {}) {
  return stampHtml(point, ordinal, ctx) + (date ? `<span class="stamp-date">${escapeHtml(date)}</span>` : "");
}

export function historyRows(state, count = 4) {
  const rows = (Array.isArray(colecaoServidor?.itens)
    ? colecaoServidor.itens.filter((item) => item.capturada && item.capturada_em).map((item) => ({ pointId: getPoint(item.codigo)?.id, at: item.capturada_em })).filter((item) => item.pointId).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    : [...state.history].reverse()).slice(0, count);
  if (!rows.length) return `<div class="empty-state"><strong>Uma página em branco</strong>Sua primeira carta começa com uma descoberta.</div>`;
  return rows.map((entry) => {
    const point = getPoint(entry.pointId);
    if (!point) return "";
    return `<div class="history-row"><span class="history-stamp" aria-hidden="true">${point.id.slice(-2)}</span><span class="history-copy"><strong>${escapeHtml(point.name)}</strong><small>Carta conquistada em ${formatDate(entry.at)}</small></span><span class="status-pill conquered">Na coleção</span></div>`;
  }).join("");
}

// Cards de eventos e patrocínios (vêm do servidor; não alteram a caderneta local nem o certificado das rotas).
export let cartoes = [];
export function setEventos(lista) { cartoes = Array.isArray(lista) ? lista : []; }
// Coleção de cartas da conta (vem do servidor): personagens desbloqueados e cartas ainda bloqueadas.
export let colecaoServidor = null;
export function setColecao(colecao) {
  colecaoServidor = colecao && Array.isArray(colecao.itens) ? colecao : null;
  // Uma única fonte para o total: o que o servidor diz que existe como carta publicada (Caderneta, Coleção e certificados mostram o mesmo número).
  if (colecaoServidor && Number.isFinite(colecaoServidor.total) && colecaoServidor.total > 0) CITY.totalPoints = colecaoServidor.total;
}
