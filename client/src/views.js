import { CITY, CATEGORIES, POINTS, ROUTES, COLLECTIONS, EUNAPOLIS_DESTINATION, getCategory, getPoint } from "./data.js";
import { stampHtml } from "./stamp-kit.js";
import { iniciais } from "./auth.js";
import { secaoColecao, cartaHtml } from "./cartas.js";

const NAV_ITEMS = [
  { id: "home", label: "Caderneta", icon: "▤" },
  { id: "map", label: "Mapa", icon: "⌖" },
  { id: "routes", label: "Rotas", icon: "⌁" },
  { id: "collection", label: "Coleção", icon: "✳" },
  { id: "podium", label: "Pódio", icon: "✦" },
];

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function progressFor(state, ids = null) {
  const isCity = ids === null;
  const uniqueIds = isCity ? POINTS.map((point) => point.id) : [...new Set(ids)];
  const servidor = Array.isArray(colecaoServidor?.itens) ? new Set(colecaoServidor.itens.filter((item) => item.capturada).map((item) => getPoint(item.codigo)?.id).filter(Boolean)) : null;
  const count = uniqueIds.filter((id) => (servidor ? servidor.has(id) : state.conquered.includes(id))).length;
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

function getVisibleName(state, point) {
  return pointStatus(state, point) === "mystery" ? "Ponto misterioso" : point.name;
}

function formatDate(value, options = { day: "2-digit", month: "short", year: "numeric" }) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Agora há pouco";
  return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

function progressBar(progress, color = "red", label = "Progresso") {
  return `<div class="progress-track" role="progressbar" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="${progress.total}" aria-valuenow="${progress.count}"><div class="progress-fill ${color}" style="width:${progress.percent}%"></div></div>`;
}

function navLinks(activeView, menuOpen = false) {
  const itens = NAV_ITEMS.map((item) => `
    <button class="nav-link" type="button" data-action="switch-view" data-view="${item.id}" aria-current="${activeView === item.id ? "page" : "false"}">
      <span class="nav-icon" aria-hidden="true">${item.icon}</span><span class="nav-label">${item.label}</span>
    </button>`).join("");
  const mais = `
    <button class="nav-link nav-more" type="button" data-action="toggle-menu" aria-controls="app-side-menu" aria-expanded="${menuOpen}" aria-haspopup="dialog" aria-label="Mais opções">
      <span class="nav-icon" aria-hidden="true">☰</span><span class="nav-label">Mais</span>
    </button>`;
  return itens + mais;
}

function drawerLink(label, description, icon, { action = "switch-view", view = "", id = "", active = false, className = "" } = {}) {
  const attributes = [`data-action="${action}"`];
  if (view) attributes.push(`data-view="${view}"`);
  if (id) attributes.push(`data-id="${escapeHtml(id)}"`);
  return `<button class="drawer-link ${className}" type="button" ${attributes.join(" ")} aria-current="${active ? "page" : "false"}">
    <span class="drawer-icon" aria-hidden="true">${escapeHtml(icon)}</span><span class="drawer-link-copy"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></span><span class="drawer-link-arrow" aria-hidden="true">›</span>
  </button>`;
}

function renderSideDrawer(state, activeView, activeRouteId, open) {
  const destinationLink = drawerLink("Guia de Eunápolis", "Dados e referências", "⌖", {
    view: EUNAPOLIS_DESTINATION.id, active: activeView === EUNAPOLIS_DESTINATION.id,
  });
  const personal = [
    drawerLink("Certificados", `${certificateRoutes(state).length} rotas concluídas`, "🎖", { action: "open-certificates", active: activeView === "certificates" }),
    drawerLink("Perfil", "Dados, progresso e conta", "◉", { view: "profile", active: activeView === "profile" }),
  ].join("");
  const openClass = open ? "is-open" : "";
  return `<div class="drawer-backdrop ${openClass}" data-action="close-menu" aria-hidden="true"></div>
    <aside class="side-drawer ${openClass}" id="app-side-menu" role="dialog" aria-modal="${open ? "true" : "false"}" aria-labelledby="side-drawer-title" aria-hidden="${open ? "false" : "true"}" ${open ? "" : "inert"}>
      <header class="drawer-header"><div class="drawer-brand"><img src="/icons/stamp.svg" alt="" width="38" height="38" /><span><small>+1 KM · ${escapeHtml(CITY.name)}</small><strong id="side-drawer-title">Mais opções</strong></span></div><button class="icon-button drawer-close" type="button" data-action="close-menu" aria-label="Fechar menu"><span aria-hidden="true">×</span></button></header>
      <nav class="drawer-navigation" aria-label="Todos os acessos do aplicativo">
        ${destinationLink}${personal}
      </nav>
      <footer class="drawer-footer"><button id="drawer-theme-button" class="drawer-link drawer-utility" type="button" data-action="toggle-theme"><span class="drawer-icon" aria-hidden="true">${state.theme === "dark" ? "☼" : "☾"}</span><span class="drawer-link-copy"><strong>${state.theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}</strong><small>Aparência do aplicativo</small></span><span class="drawer-link-arrow" aria-hidden="true">›</span></button>
        ${appInstalado() ? "" : `<button class="drawer-link drawer-utility" type="button" data-action="install-app"><span class="drawer-icon" aria-hidden="true">⇩</span><span class="drawer-link-copy"><strong>Instalar aplicativo</strong><small>Adicionar à tela inicial</small></span><span class="drawer-link-arrow" aria-hidden="true">›</span></button>`}
      </footer>
    </aside>`;
}

// Dentro do app instalado (tela inicial ou Google Play) não há o que instalar.
const appInstalado = () => {
  try { return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || document.referrer.startsWith("android-app://"); } catch { return false; }
};

export function renderChrome(state, activeView, activeRouteId = "", menuOpen = false) {
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", state.theme === "dark" ? "#0b1a14" : "#f3ead7");
  const logo = `<img class="brand-mark" src="/icons/stamp.svg" alt="" width="42" height="42" />`;
  document.getElementById("topbar").innerHTML = `
    <a class="brand" href="#" data-action="switch-view" data-view="home" aria-label="+1 KM, início">
      ${logo}<span class="brand-copy"><span class="brand-name">+1 KM</span><span class="brand-city">${CITY.name}</span></span>
    </a>`;
  document.getElementById("drawer-root").innerHTML = renderSideDrawer(state, activeView, activeRouteId, menuOpen);
  document.getElementById("side-rail").innerHTML = navLinks(activeView, menuOpen);
  document.getElementById("bottom-nav").innerHTML = navLinks(activeView, menuOpen);
}

function pageHead(kicker, title, subtitle = "") {
  return `<header class="page-head"><div><p class="page-kicker">${escapeHtml(kicker)}</p><h1 class="page-title">${escapeHtml(title)}</h1>${subtitle ? `<p class="page-subtitle">${escapeHtml(subtitle)}</p>` : ""}</div></header>`;
}

function categoryCard(state, category) {
  const categoryPoints = POINTS.filter((point) => point.categoryIds.includes(category.id));
  const progress = progressFor(state, categoryPoints.map((point) => point.id));
  return `<article class="category-card"><div class="category-heading"><span class="category-symbol ${category.color}" aria-hidden="true">${category.icon}</span><span class="category-name">${escapeHtml(category.name)}</span><strong class="category-count">${progress.count}/${progress.total}</strong></div>${progressBar(progress, category.color, `Progresso em ${category.name}`)}</article>`;
}

function routeCard(state, route) {
  const progress = routeProgress(state, route);
  const complete = progress.percent === 100;
  const inProgress = progress.count > 0 && !complete;
  const missingPoints = route.pointIds.map(getPoint).filter((point) => point && pointStatus(state, point) !== "conquered");
  const missingPreview = missingPoints.slice(0, 2).map((point) => getVisibleName(state, point));
  const statusLabel = complete ? "Concluída" : inProgress ? "Em andamento" : "Não iniciada";
  const pendingText = missingPoints.length
    ? `Falta: ${missingPreview.map(escapeHtml).join(" · ")}${missingPoints.length > missingPreview.length ? ` · +${missingPoints.length - missingPreview.length}` : ""}`
    : "Todos os pontos carimbados";
  return `<article class="route-card ${inProgress ? "is-in-progress" : ""} ${complete ? "is-complete" : ""}" data-route-state="${complete ? "complete" : inProgress ? "progress" : "new"}">
    <div class="route-card-top"><span class="route-icon ${route.color}" aria-hidden="true">${route.icon}</span><div class="route-info"><h3 class="route-name">${escapeHtml(route.name)}</h3><p class="route-subtitle">${escapeHtml(route.subtitle)}</p></div><span class="route-count">${progress.count}/${progress.total}</span></div>
    <div class="route-state-row"><span class="route-state-pill ${complete ? "complete" : inProgress ? "progress" : "new"}">${statusLabel}</span><span class="route-state-detail">${complete ? "Certificado liberado" : `${progress.total - progress.count} ${progress.total - progress.count === 1 ? "ponto restante" : "pontos restantes"}`}</span></div>
    ${progressBar(progress, route.color, `Progresso da rota ${route.name}`)}
    ${!complete ? `<p class="route-pending">${pendingText}</p>` : ""}
    <div class="route-card-foot"><span>${complete ? "Rota concluída" : inProgress ? "Continue de onde parou" : "Pronta para começar"}</span><button class="route-card-button" type="button" data-action="open-route" data-id="${route.id}">${complete ? "Rever rota →" : inProgress ? "Continuar →" : "Ver rota →"}</button></div>
  </article>`;
}

function stamp(point, ordinal, date = "", ctx = {}) {
  return stampHtml(point, ordinal, ctx) + (date ? `<span class="stamp-date">${escapeHtml(date)}</span>` : "");
}

function historyRows(state, count = 4) {
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
let cartoes = [];
export function setEventos(lista) { cartoes = Array.isArray(lista) ? lista : []; }
// Coleção de cartas da conta (vem do servidor): personagens desbloqueados e cartas ainda bloqueadas.
let colecaoServidor = null;
export function setColecao(colecao) { colecaoServidor = colecao && Array.isArray(colecao.itens) ? colecao : null; }
function renderColecao(state) {
  if (!(state.account && state.session)) return "";
  return secaoColecao(colecaoServidor);
}
const ESTADO_CARD = { ao_vivo: ["Ao vivo", "conquered"], em_breve: ["Em breve", "mystery"], encerrado: ["Coleção encerrada", "discovered"] };
function janelaDoCard(card) {
  const f = (v) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Bahia" }).format(new Date(v));
  return `${f(card.inicio_em)} a ${f(new Date(new Date(card.fim_em).getTime() - 1000))}`;
}
function renderCartoes(state) {
  // Cards são da conta no servidor: não aparecem para quem saiu (aparelho compartilhado).
  if (!cartoes.length || !(state.account && state.session)) return "";
  const itens = cartoes.map((card) => {
    const [rotulo, classe] = ESTADO_CARD[card.estado] || ESTADO_CARD.encerrado;
    const progress = { count: card.feitos, total: card.total, percent: card.total ? Math.round((card.feitos / card.total) * 100) : 0 };
    const origem = card.patrocinado_por ? `Patrocinado por ${escapeHtml(card.patrocinado_por)}` : (card.tipo === "evento" ? "Evento" : "Campanha");
    const pontos = card.pontos.map((p) => `<li class="evento-ponto ${p.carimbo ? "feito" : ""}"><span aria-hidden="true">${p.carimbo ? "✓" : "○"}</span>${escapeHtml(p.tag_nome)}<span class="sr-only">${p.carimbo ? " carimbado" : " pendente"}</span></li>`).join("");
    const edicao = card.edicao ? `<p class="evento-edicao"><strong>${card.edicao.numero ? `Seu carimbo nº ${card.edicao.numero}/${card.edicao.tiragem}` : card.edicao.emitidos >= card.edicao.tiragem ? "Edição esgotada" : `Edição numerada · ${card.edicao.tiragem - card.edicao.emitidos} de ${card.edicao.tiragem} disponíveis`}</strong></p>` : "";
    const nota = card.estado === "encerrado" ? "A coleção terminou. Os carimbos que você fez ficam guardados." : card.estado === "em_breve" ? "Os pontos continuam valendo para a rota normal. O carimbo do card começa na data." : "Encoste nos pontos dentro do período: o mesmo toque vale para a rota e para este card.";
    return `<article class="route-card evento-card ${card.estado}"><div class="route-card-top"><div class="route-info"><p class="evento-origem">${origem}</p><h3 class="route-name">${escapeHtml(card.nome)}</h3><p class="route-subtitle">${janelaDoCard(card)}</p></div><span class="status-pill ${classe}">${rotulo}</span></div>${card.descricao ? `<p class="evento-desc">${escapeHtml(card.descricao)}</p>` : ""}${edicao}${progressBar(progress, "red", `Carimbos do card ${card.nome}`)}<div class="route-card-foot"><span>${card.feitos}/${card.total} pontos do card</span></div><ul class="evento-pontos">${pontos}</ul><p class="evento-nota">${nota}</p></article>`;
  }).join("");
  return `<section aria-labelledby="eventos-title"><div class="section-heading"><div><h2 id="eventos-title">Eventos e patrocínios</h2><p>Cards com data. Não mudam sua rota nem seus certificados.</p></div></div><div class="evento-lista">${itens}</div></section>`;
}

// Cartas conquistadas em miniatura e mapa reduzido. A carta é a única coleção do usuário.
function homeCards(state) {
  const cards = Array.isArray(colecaoServidor?.itens) ? colecaoServidor.itens.filter((item) => item.capturada) : POINTS.filter((point) => state.conquered.includes(point.id)).map((point) => ({ codigo: point.id, ponto: point.name, carta: POINTS.indexOf(point) + 1, categoria: "cultura", raridade: "comum", capturada: true, criatura: point.name }));
  if (!cards.length) return `<div class="home-empty-state"><p class="home-empty">Sua coleção está começando. Visite um ponto publicado e encoste na tag NFC para desbloquear sua primeira carta.</p><button class="outline-button" type="button" data-action="switch-view" data-view="map">Encontrar um ponto →</button></div>`;
  return `<div class="home-stamps home-cards" role="list" aria-label="Cartas conquistadas">${cards.map((item) => { const point = getPoint(item.codigo); return `<button class="home-stamp home-card" role="listitem" type="button" data-action="open-point" data-id="${point?.id || item.codigo}" aria-label="Abrir carta de ${escapeHtml(item.ponto)}" title="${escapeHtml(item.ponto)}">${cartaHtml(item, { size: 96 })}</button>`; }).join("")}</div>`;
}

function collectionSpotlight(state, city) {
  if (!(state.account && state.session)) return "";
  const restante = Math.max(0, city.total - city.count);
  return `<section class="collection-spotlight" aria-labelledby="collection-spotlight-title"><div><p class="eyebrow">Coleção em andamento</p><h2 id="collection-spotlight-title">${city.count === 0 ? "Sua primeira carta começa na rua" : restante ? `Faltam ${restante} cartas para completar a cidade` : "Coleção de Eunápolis completa"}</h2><p>${city.count === 0 ? "Aproxime-se de uma tag publicada para desbloquear uma carta única." : "Cada visita confirmada revela uma carta; não há uma segunda coleção de carimbos."}</p></div><button class="spotlight-action" type="button" data-action="switch-view" data-view="collection">Ver coleção <span aria-hidden="true">→</span></button></section>`;
}

function miniMap(state) {
  const placed = POINTS.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  if (!placed.length) return "";
  const lats = placed.map((point) => point.lat);
  const lngs = placed.map((point) => point.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const cosLat = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  // Quadro 16:9 com margem; a longitude é corrigida pela latitude para a cidade não ficar esticada.
  const W = 320, H = 180, pad = 26;
  const spanX = Math.max((maxLng - minLng) * cosLat, 0.0004);
  const spanY = Math.max(maxLat - minLat, 0.0004);
  const scale = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
  const offX = (W - spanX * scale) / 2, offY = (H - spanY * scale) / 2;
  const dots = placed.map((point) => {
    const left = ((offX + (point.lng - minLng) * cosLat * scale) / W) * 100;
    const top = ((offY + (maxLat - point.lat) * scale) / H) * 100;
    const status = pointStatus(state, point);
    const name = getVisibleName(state, point);
    return `<button class="mini-dot ${status}" type="button" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%" data-action="open-point" data-id="${point.id}" aria-label="${escapeHtml(name)} · ${status === "conquered" ? "conquistado" : status === "mystery" ? "mistério" : "disponível"}" title="${escapeHtml(name)}">${status === "conquered" ? "✓" : status === "mystery" ? "?" : ""}</button>`;
  }).join("");
  const semCoordenada = POINTS.length - placed.length;
  return `<div class="mini-map-wrap"><div class="mini-map" role="group" aria-label="Mapa reduzido de ${escapeHtml(CITY.name)}">${dots}</div>
    <div class="mini-map-foot"><span class="mini-legend"><i class="mini-dot-key conquered"></i>conquistado <i class="mini-dot-key available"></i>disponível <i class="mini-dot-key mystery"></i>mistério</span><button class="route-card-button" type="button" data-action="switch-view" data-view="map">⌖ Mapa completo</button></div>
    ${semCoordenada ? `<p class="small muted mini-map-note">${semCoordenada} ${semCoordenada === 1 ? "ponto ainda sem coordenada" : "pontos ainda sem coordenada"}; ${semCoordenada === 1 ? "aparece" : "aparecem"} só na lista.</p>` : ""}</div>`;
}

function renderHome(state) {
  const city = progressFor(state);
  const categoryTotals = CATEGORIES.map((category) => categoryCard(state, category)).join("");
  return `${pageHead("Caderneta", CITY.name)}
    <section class="hero-card" aria-labelledby="hero-title">
      <div class="hero-copy"><span class="hero-overline">${CITY.name}</span><h2 class="hero-title" id="hero-title">Sua cidade.<br />Sua coleção.</h2><div class="hero-foot"><span class="season-tag">${city.count}/${city.total} cartas</span></div></div>
      <div class="hero-stamp" aria-label="${city.count} de ${city.total} pontos conquistados"><span><small>${escapeHtml(CITY.name)}</small><strong>${String(city.count).padStart(2, "0")}<span style="font-size:.48em">/${city.total}</span></strong><span class="stamp-divider"></span><small>conquistados</small></span></div>
    </section>
    <section class="home-actions" aria-label="Ações principais">
      <button class="home-action-primary" type="button" data-action="switch-view" data-view="map"><span class="home-action-icon" aria-hidden="true">⌖</span><span><strong>Encontrar próximo ponto</strong><small>Explore o mapa e descubra onde ir</small></span><span class="home-action-arrow" aria-hidden="true">→</span></button>
      <button class="home-action-secondary" type="button" data-action="switch-view" data-view="collection"><span aria-hidden="true">✳</span><span><strong>Minha coleção</strong><small>Veja as cartas que você conquistou</small></span><span aria-hidden="true">→</span></button>
      <p class="home-action-hint">Ao chegar a um ponto publicado, aproxime o celular da tag NFC. Um carimbo válido desbloqueia a carta.</p>
    </section>
    ${collectionSpotlight(state, city)}
    <section><div class="section-heading"><div><h2>Progresso da cidade</h2><p>${city.count}/${city.total} pontos</p></div></div>
      <article class="card home-city-card"><h3 class="home-sub">Cartas conquistadas <span>${city.count}</span></h3>${homeCards(state)}<h3 class="home-sub">Mapa rápido</h3>${miniMap(state)}</article>
      <div class="category-grid">${categoryTotals}</div>
      <article class="card home-progress-card"><div class="progress-meta"><span>Progresso de ${escapeHtml(CITY.name)}</span><strong>${city.percent}%</strong></div>${progressBar(city, "red", `Pontos conquistados em ${CITY.name}`)}<p class="progress-guidance" role="status">${city.percent === 100 ? `Você conquistou todos os ${city.total} pontos desta edição.` : city.count === 0 ? `Sua primeira conquista começa em um ponto publicado. ${city.total} pontos disponíveis nesta edição.` : `Você já conquistou ${city.count} de ${city.total} pontos. Faltam ${city.total - city.count} para completar a cidade.`}</p><button class="route-card-button" type="button" data-action="switch-view" data-view="map">Continuar explorando →</button></article>
    </section>
    ${renderCartoes(state)}`;
}

export function getFilteredPoints(state, { categoryId = "all", pointFilter = "all", search = "" } = {}) {
  const query = search.trim().toLocaleLowerCase("pt-BR");
  return POINTS.filter((point) => {
    const status = pointStatus(state, point);
    if (categoryId !== "all" && !point.categoryIds.includes(categoryId)) return false;
    if (pointFilter === "conquered" && status !== "conquered") return false;
    if (pointFilter === "discovered" && !["discovered", "conquered"].includes(status)) return false;
    if (pointFilter === "available" && status !== "available") return false;
    if (pointFilter === "mystery" && status !== "mystery") return false;
    if (query && !getVisibleName(state, point).toLocaleLowerCase("pt-BR").includes(query) && !point.id.toLowerCase().includes(query)) return false;
    return true;
  });
}

function pointRow(state, point, ordinal) {
  const status = pointStatus(state, point);
  const statusLabel = { conquered: "conquistado", discovered: "descoberto", available: "disponível", mystery: "mistério" }[status];
  const categoryNames = point.categoryIds.map((id) => getCategory(id)?.name).filter(Boolean).join(" · ");
  const mapStatus = Number.isFinite(point.lat) && Number.isFinite(point.lng) ? "coordenada no mapa" : "sem coordenada";
  return `<button class="point-row" type="button" data-action="open-point" data-id="${point.id}" aria-label="Abrir ${escapeHtml(getVisibleName(state, point))}, ${statusLabel}"><span class="point-number">${String(ordinal).padStart(2, "0")}</span><span class="point-main"><span class="point-name">${escapeHtml(getVisibleName(state, point))}</span><span class="point-meta">${escapeHtml(categoryNames)} · ${point.id} · ${mapStatus}</span></span><span class="status-pill ${status}">${statusLabel}</span></button>`;
}

function mapCanvas(state, filters) {
  const points = getFilteredPoints(state, { ...filters, search: "" });
  const mapped = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  return `<div class="map-stage"><div class="real-map" id="real-map" role="application" aria-label="Mapa de ${escapeHtml(CITY.name)} com ${mapped.length} pontos localizados"></div><div class="map-hud" id="map-hud"></div><div class="map-ui" id="map-ui"></div></div>`;
}
// Página do mapa: só o mapa, em tela cheia; rota, ponto selecionado e atalhos aparecem sobre ele.
function renderMap(state, filters) {
  return `<h1 class="sr-only">Mapa de ${escapeHtml(CITY.name)}</h1>${mapCanvas(state, filters)}`;
}

function renderRoutes(state) {
  const rank = (route) => {
    const progress = routeProgress(state, route);
    if (progress.percent > 0 && progress.percent < 100) return 0;
    if (progress.percent === 100) return 1;
    return 2;
  };
  const routes = ROUTES.map((route, index) => ({ route, index }))
    .sort((a, b) => rank(a.route) - rank(b.route) || a.index - b.index)
    .map(({ route }) => route);
  const inProgress = routes.filter((route) => {
    const percent = routeProgress(state, route).percent;
    return percent > 0 && percent < 100;
  }).length;
  return `${pageHead("Rotas", CITY.name, inProgress ? `${inProgress} ${inProgress === 1 ? "rota em andamento" : "rotas em andamento"} · suas rotas ativas aparecem primeiro.` : "Escolha uma rota e acompanhe os pontos que faltam até a conquista.")}
    <div class="route-list">${routes.map((route) => routeCard(state, route)).join("")}</div>
    `;
}

function renderRouteDetail(state, routeId) {
  const route = ROUTES.find((item) => item.id === routeId);
  if (!route) return renderRoutes(state);
  const progress = routeProgress(state, route);
  const points = route.pointIds.map(getPoint).filter(Boolean);
  return `${pageHead("Rota", route.name, route.subtitle)}
    <article class="card" style="border-top:5px solid var(--${route.color === "ochre" ? "ochre" : route.color})"><div class="card-heading"><div><span class="eyebrow">${CITY.name}</span>${route.note ? `<p class="small muted" style="margin:6px 0 0">${escapeHtml(route.note)}</p>` : ""}</div><span class="route-icon ${route.color}" aria-hidden="true">${route.icon}</span></div><div class="progress-meta"><span>${progress.count}/${progress.total} pontos</span><strong>${progress.percent}%</strong></div>${progressBar(progress, route.color, `Progresso da ${route.name}`)}<div class="route-card-foot"><span>${progress.percent === 100 ? "Concluída · certificado liberado" : `${progress.total - progress.count} restantes`}</span><button class="route-card-button" type="button" data-action="switch-view" data-view="routes">← Rotas</button></div></article>
    <div class="section-heading"><div><h2>Pontos da rota</h2><p>${progress.count}/${progress.total} carimbados</p></div></div><div class="point-list">${points.map((point) => pointRow(state, point, POINTS.indexOf(point) + 1)).join("")}</div>
    ${progress.percent === 100 ? `<div class="button-row" style="margin-top:15px"><button class="primary-button" type="button" data-action="open-certificate" data-id="${route.id}">🎖 Abrir certificado</button></div>` : ""}`;
}

function renderPoint(state, pointId) {
  const point = getPoint(pointId);
  if (!point) return `${pageHead("Caderneta", "Ponto não encontrado")}<button class="outline-button" data-action="switch-view" data-view="map">Voltar ao mapa</button>`;
  const status = pointStatus(state, point);
  const number = POINTS.indexOf(point) + 1;
  const categoryTags = point.categoryIds.map((id) => `<span class="tag">${escapeHtml(getCategory(id)?.name || id)}</span>`).join("");
  const stateLabel = { conquered: "Conquistado", discovered: "Descoberto", available: "Disponível", mystery: "Mistério" }[status];
  const action = status === "mystery"
    ? `<button class="primary-button button-full" type="button" data-action="reveal-point" data-id="${point.id}">✦ Revelar esta página</button>`
    : status === "conquered"
      ? `<button class="outline-button button-full" type="button" disabled>✓ Este ponto já está na caderneta</button>`
      : `<p class="small muted" style="margin:14px 0 0;text-align:center">Para carimbar, aproxime o celular da tag NFC deste ponto.</p>`;
  const history = [...state.history].reverse().find((entry) => entry.pointId === point.id);
  return `${pageHead(`Ponto ${point.id}`, getVisibleName(state, point), CITY.name)}
    <article class="card point-detail-card"><div class="detail-topline"><button class="text-link" type="button" data-action="go-back">← Voltar</button><span class="status-pill ${status}">${stateLabel}</span></div><div class="detail-topline"><div><span class="eyebrow">${CITY.name} · ponto ${String(number).padStart(2, "0")}</span><h1 class="detail-title" style="margin-top:6px">${escapeHtml(getVisibleName(state, point))}</h1></div><span class="detail-seal" aria-hidden="true">${pointStatus(state, point) === "mystery" ? "?" : String(number).padStart(2, "0")}</span></div>
      <p class="detail-description">${escapeHtml(status === "mystery" ? "Uma página ainda escondida na cidade. Revele para descobrir o que ela guarda." : point.note)}</p><div class="tag-list">${categoryTags}<span class="tag">${point.id}</span></div>${action}
      ${history ? `<div class="detail-stamp">${stamp(point, number, "", { state, entry: history, plus: true })}</div>` : ""}
      ${history ? `<p class="small muted" style="margin:11px 0 0;text-align:center">Carimbado em ${formatDate(history.at)} · salvo nesta caderneta</p>` : ""}
    </article>`;
}

function renderCollection(state) {
  const city = progressFor(state);
  const earnedBadges = [
    { title: "Primeira carta", note: "Desbloqueie sua primeira carta", earned: city.count >= 1, icon: "✦" },
    { title: "Explorador", note: "Conquiste 5 pontos da cidade", earned: city.count >= 5, icon: "⌖" },
    { title: "Uma rota inteira", note: "Complete uma rota temática", earned: certificateRoutes(state).length >= 1, icon: "⌁" },
    { title: `${CITY.name} completa`, note: "Conquiste todos os pontos desta edição", earned: city.percent === 100, icon: "★" },
  ];
  return `${pageHead("Coleção", "Carimbos", CITY.name)}
    <div class="stats-strip"><div class="stat-card"><span class="stat-value">${city.count}</span><span class="stat-label">cartas conquistadas</span></div><div class="stat-card"><span class="stat-value">${certificateRoutes(state).length}</span><span class="stat-label">rotas na coleção</span></div><div class="stat-card"><span class="stat-value">${city.percent}%</span><span class="stat-label">da cidade</span></div></div>
    ${renderColecao(state)}
    <div class="collection-grid">${COLLECTIONS.map((collection) => {
      const progress = progressFor(state, collection.pointIds);
      const tiles = collection.pointIds.slice(0, 12).map((id, index) => {
        const point = getPoint(id);
        const earned = pointStatus(state, point) === "conquered";
        return `<button class="stamp-slot ${earned ? "is-earned" : ""}" type="button" ${earned ? `data-action="open-point" data-id="${id}"` : `data-action="open-point" data-id="${id}"`} aria-label="${earned ? `Abrir carimbo de ${escapeHtml(point.name)}` : `Abrir ponto ${escapeHtml(getVisibleName(state, point))}`}" title="${escapeHtml(getVisibleName(state, point))}">${earned ? stamp(point, index + 1, "", { state, role: index === 0 ? "inicio" : index === collection.pointIds.length - 1 ? "chegada" : "" }) : `<span class="stamp-placeholder">·</span>`}</button>`;
      }).join("");
      return `<article class="card collection-card"><div class="collection-banner"><span class="route-icon ${collection.color}" aria-hidden="true">${collection.icon}</span><div class="collection-banner-copy"><h3>${escapeHtml(collection.name)}</h3><p>${escapeHtml(collection.subtitle)}</p></div><strong class="route-count">${progress.count}/${progress.total}</strong></div><div class="collection-content"><div class="stamp-grid">${tiles}</div><div style="margin-top:12px">${progressBar(progress, collection.color, `Progresso da coleção ${collection.name}`)}</div><div class="progress-meta"><span>Sem prazo para completar</span><strong>${progress.percent}%</strong></div></div></article>`;
    }).join("")}</div>
    <div class="section-heading"><div><h2>Conquistas especiais</h2><p>As pequenas marcas também contam.</p></div></div><div class="achievement-list">${earnedBadges.map((badge) => `<div class="achievement ${badge.earned ? "" : "locked"}"><span class="achievement-seal" aria-hidden="true">${badge.earned ? badge.icon : "·"}</span><span class="achievement-copy"><strong class="achievement-title">${escapeHtml(badge.title)}</strong><small>${badge.earned ? "Guardada na sua coleção" : escapeHtml(badge.note)}</small></span><span class="status-pill ${badge.earned ? "conquered" : ""}">${badge.earned ? "Conquistada" : "Em aberto"}</span></div>`).join("")}</div>
    <div class="section-heading"><div><h2>Histórico</h2><p>Últimos carimbos</p></div></div><article class="card">${historyRows(state, 5)}</article>`;
}

function renderCertificates(state, requestedRouteId = "") {
  const earned = certificateRoutes(state);
  const route = earned.find((item) => item.id === requestedRouteId) || earned[0];
  if (!route) {
    const progress = progressFor(state, ROUTES[0].pointIds);
    return `${pageHead("Uma lembrança para levar", "Certificados", "Cada certificado aparece quando seus carimbos completam uma rota.")}
      <div class="locked-certificate"><div class="lock" aria-hidden="true">▧</div><h2 class="card-title" style="margin:8px 0">Ainda falta uma página</h2><p class="small muted">Conquiste todos os pontos de uma rota para liberar seu primeiro certificado. Sem prazo.</p><div style="max-width:360px;margin:13px auto"><div class="progress-meta"><span>${escapeHtml(ROUTES[0].name)}</span><strong>${progress.count}/${progress.total}</strong></div>${progressBar(progress, "ochre", "Progresso até o primeiro certificado")}</div><button class="primary-button" type="button" data-action="open-route" data-id="${ROUTES[0].id}">Continuar esta rota</button></div>`;
  }
  const progress = routeProgress(state, route);
  const date = formatDate(state.history.at(-1)?.at || new Date().toISOString(), { day: "2-digit", month: "long", year: "numeric" });
  const stampRow = route.pointIds.slice(0, 6).map((id, index) => `<span class="certificate-stamp-cell" title="${escapeHtml(getPoint(id)?.name || id)}">${stamp(getPoint(id), index + 1, "", { state, role: index === 0 ? "inicio" : index === route.pointIds.length - 1 ? "chegada" : "" })}</span>`).join("");
  const isCityComplete = progressFor(state).percent === 100;
  return `${pageHead("Memória em papel", "Certificados", "Uma rota concluída merece sua própria página.")}
    <article class="certificate" aria-label="Certificado digital de conclusão da ${escapeHtml(route.name)}">
      <div class="certificate-stars">✦ · ✦ · ✦</div><p class="eyebrow" style="margin:12px 0 0">+1 KM · ${escapeHtml(CITY.name)}</p><h2 class="certificate-title">Certificado<br />de rota</h2><p class="small">Atesta que</p><p class="certificate-name">${escapeHtml(state.user.name)}</p><p>completou todos os ${progress.total} pontos da<br /><strong>${escapeHtml(route.name)}</strong></p><div class="certificate-stamp-row">${stampRow}</div><p class="small muted">Guardado em ${date} · caderneta nº ${escapeHtml(state.user.number)}</p><div class="certificate-seal">ROTA<br />CONQUISTADA</div><p class="eyebrow">Cada ponto, uma história guardada.</p>
    </article><div class="button-row no-print" style="justify-content:center;margin:20px 0"><button class="primary-button" type="button" data-action="share-certificate" data-id="${route.id}">↗ Compartilhar</button><button class="outline-button" type="button" data-action="print-certificate">▤ Imprimir</button></div>
    ${isCityComplete ? `<article class="card" style="margin-top:20px;text-align:center"><span class="eyebrow">Conquista especial</span><h3 class="card-title" style="margin:7px 0">${escapeHtml(CITY.name)} completa · ${CITY.totalPoints}/${CITY.totalPoints}</h3><p class="small muted">Você encontrou todos os pontos desta edição.</p></article>` : ""}
    <div class="section-heading"><div><h2>Rotas carimbadas</h2><p>Certificados liberados nesta caderneta.</p></div></div><div class="certificate-list">${earned.map((completeRoute) => `<button class="point-row" type="button" data-action="open-certificate" data-id="${completeRoute.id}"><span class="route-icon ${completeRoute.color}" aria-hidden="true">🎖</span><span class="point-main"><span class="point-name">${escapeHtml(completeRoute.name)}</span><span class="point-meta">Certificado · ${routeProgress(state, completeRoute).total} pontos</span></span><span class="status-pill conquered">Concluída</span></button>`).join("")}</div>`;
}

export function renderView(state, view, selectedPointId, selectedRouteId, filters) {
  switch (view) {
    case "podium": return '<div id="gamification-podium-root"></div>';
    case "map": return renderMap(state, filters);
    case "routes": return renderRoutes(state);
    case "eunapolis": return renderEunapolis();
    case "route": return renderRouteDetail(state, selectedRouteId);
    case "collection": return renderCollection(state);
    case "certificates": return renderCertificates(state, selectedRouteId);
    case "point": return renderPoint(state, selectedPointId);
    default: return renderHome(state);
  }
}

export function renderProfile(state, mensagem = null) {
  const conta = state.account;
  const city = progressFor(state);
  const rotas = certificateRoutes(state).length;
  const desde = conta.criadoEm ? formatDate(conta.criadoEm, { day: "2-digit", month: "long", year: "numeric" }) : "";
  const aviso = mensagem?.texto ? `<p class="auth-error${mensagem.ok ? " ok" : ""}" role="status">${escapeHtml(mensagem.texto)}</p>` : "";
  return `${pageHead("Sua conta", "Meu perfil", "Tudo o que fica guardado neste aparelho.")}
    <article class="card profile-card">
      <div class="profile-avatar" aria-hidden="true">${escapeHtml(iniciais(conta.nome))}</div>
      <div>
        <h2 class="card-title">${escapeHtml(conta.nome)}</h2>
        <p class="small muted">${escapeHtml(conta.email)}</p>
        ${desde ? `<p class="small muted">Caderneta desde ${escapeHtml(desde)}</p>` : ""}
      </div>
    </article>
    <div class="stats-strip" aria-label="Resumo da conta">
      <div class="stat-card"><span class="stat-value">${city.count}<span style="font-size:.65em">/${city.total}</span></span><span class="stat-label">pontos da cidade</span></div>
      <div class="stat-card"><span class="stat-value">${rotas}</span><span class="stat-label">rotas concluídas</span></div>
      <div class="stat-card"><span class="stat-value">${state.history.length}</span><span class="stat-label">carimbos guardados</span></div>
    </div>
    ${aviso}
    <article class="card">
      <h2 class="card-title">Dados da conta</h2>
      <form class="form-stack" data-form="perfil-dados" novalidate>
        <label class="field"><span>Nome</span><input name="nome" type="text" maxlength="36" autocomplete="name" value="${escapeHtml(conta.nome)}" required /></label>
        <label class="field"><span>E-mail</span><input name="email" type="email" inputmode="email" autocapitalize="none" autocomplete="email" value="${escapeHtml(conta.email)}" required /></label>
        <button class="primary-button button-full" type="submit">Salvar dados</button>
      </form>
    </article>
    <article class="card">
      <h2 class="card-title">Trocar senha</h2>
      <form class="form-stack" data-form="perfil-senha" novalidate>
        <label class="field"><span>Senha atual</span><input name="atual" type="password" autocomplete="current-password" required /></label>
        <label class="field"><span>Nova senha</span><input name="nova" type="password" autocomplete="new-password" minlength="8" required /></label>
        <label class="field"><span>Repita a nova senha</span><input name="confirma" type="password" autocomplete="new-password" required /></label>
        <button class="outline-button button-full" type="submit">Trocar senha</button>
      </form>
    </article>
    <article class="card">
      <h2 class="card-title">Sessão</h2>
      <p class="small muted">Sair mantém a conta e os carimbos neste aparelho.</p>
      <button class="outline-button button-full" type="button" data-action="logout">Sair da conta</button>
    </article>
    <article class="card danger-zone">
      <h2 class="card-title">Excluir conta</h2>
      <p class="small muted">Apaga a conta e todos os carimbos deste aparelho. Não tem como desfazer.</p>
      <button class="danger-button button-full" type="button" data-action="delete-account">Excluir conta e dados</button>
    </article>
    <p class="small muted legal-links"><a href="/privacidade">Política de Privacidade</a> · <a href="/excluir-conta">Como excluir a conta</a></p>`;
}


function renderEunapolis() {
  const guide = EUNAPOLIS_DESTINATION;
  const facts = guide.facts.map((fact) => `<div class="destination-fact"><span>${escapeHtml(fact.label)}</span><strong>${escapeHtml(fact.value)}</strong><small>${escapeHtml(fact.detail)}</small></div>`).join("");
  const source = guide.sources[0];
  return `${pageHead("Destino · Eunápolis, Bahia", guide.name, "Um pouco da história e dos números da cidade.")}
    <div class="destination-return-row no-print"><button class="text-link" type="button" data-action="switch-view" data-view="routes">← Voltar às rotas</button></div>
    <article class="card destination-hero">
      <div class="destination-hero-top"><span class="destination-stamp" aria-hidden="true">EU</span><div class="destination-hero-copy"><span class="eyebrow">${escapeHtml(guide.region)}</span><h2>Uma cidade que nasceu do caminho</h2><p>${escapeHtml(guide.summary)}</p></div></div>
      <div class="destination-facts">${facts}</div>
      <p class="destination-credit">População informada como resultado do Censo 2022; os demais dados vêm da página municipal de Eunápolis.</p>
    </article>
    ${source ? `<section class="destination-sources" aria-label="Fonte dos dados"><p class="eyebrow">Fonte dos dados</p><div class="destination-source-list"><a class="destination-source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)} <span aria-hidden="true">↗</span></a></div></section>` : ""}`;
}
