import { CITY, CATEGORIES, JOURNEY_DAYS, JOURNEY_STAGES, POINTS, ROUTES, COLLECTIONS, EUNAPOLIS_DESTINATION, getCategory, getPoint } from "./data.js";
import { journeyClock } from "./journey.js";
import { stampHtml } from "./stamp-kit.js";
import { iniciais } from "./auth.js";

const NAV_ITEMS = [
  { id: "home", label: "Caderneta", icon: "▤" },
  { id: "map", label: "Mapa", icon: "⌖" },
  { id: "journey", label: "Jornada", icon: "➜" },
  { id: "routes", label: "Rotas", icon: "⌁" },
  { id: "collection", label: "Coleção", icon: "✳" },
];

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function progressFor(state, ids = null) {
  const isCity = ids === null;
  const uniqueIds = isCity ? POINTS.map((point) => point.id) : [...new Set(ids)];
  const count = uniqueIds.filter((id) => state.conquered.includes(id)).length;
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
  if (state.conquered.includes(point.id)) return "conquered";
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

function navLinks(activeView, className = "") {
  return NAV_ITEMS.map((item) => `
    <button class="nav-link ${className}" type="button" data-action="switch-view" data-view="${item.id}" aria-current="${activeView === item.id ? "page" : "false"}">
      <span class="nav-icon" aria-hidden="true">${item.icon}</span><span class="nav-label">${item.label}</span>
    </button>`).join("");
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
  const explore = [
    drawerLink("Caderneta", "Resumo da cidade", "▤", { view: "home", active: activeView === "home" }),
    drawerLink("Mapa", "Pontos da cidade", "⌖", { view: "map", active: activeView === "map" || activeView === "point" }),
    drawerLink("Jornada", "Ciclo atual", "➜", { view: "journey", active: activeView === "journey" }),
    drawerLink("Rotas", "Rotas disponíveis", "⌁", { view: "routes", active: activeView === "routes" }),
  ].join("");
  const destinationLink = drawerLink("Guia de Eunápolis", "Dados e referências", "⌖", {
    view: EUNAPOLIS_DESTINATION.id, active: activeView === EUNAPOLIS_DESTINATION.id, className: "drawer-route-link",
  });
  const personal = [
    drawerLink("Coleção", "Carimbos e conquistas guardadas", "✳", { view: "collection", active: activeView === "collection" }),
    drawerLink("Certificados", `${certificateRoutes(state).length} rotas concluídas`, "🎖", { action: "open-certificates", active: activeView === "certificates" }),
    drawerLink("Perfil", "Dados, progresso e conta", "◉", { view: "profile", active: activeView === "profile" }),
  ].join("");
  const openClass = open ? "is-open" : "";
  return `<div class="drawer-backdrop ${openClass}" data-action="close-menu" aria-hidden="true"></div>
    <aside class="side-drawer ${openClass}" id="app-side-menu" role="dialog" aria-modal="${open ? "true" : "false"}" aria-labelledby="side-drawer-title" aria-hidden="${open ? "false" : "true"}" ${open ? "" : "inert"}>
      <header class="drawer-header"><div class="drawer-brand"><img src="/icons/stamp.svg" alt="" width="38" height="38" /><span><small>+1 KM · ${escapeHtml(CITY.name)}</small><strong id="side-drawer-title">Seu caderno</strong></span></div><button class="icon-button drawer-close" type="button" data-action="close-menu" aria-label="Fechar menu"><span aria-hidden="true">×</span></button></header>
      <nav class="drawer-navigation" aria-label="Todos os acessos do aplicativo">
        <p class="drawer-group-title">Explorar</p>${explore}
        <p class="drawer-group-title">Guia</p>${destinationLink}
        <p class="drawer-group-title">Sua caderneta</p>${personal}
      </nav>
      <footer class="drawer-footer"><p class="drawer-group-title">Acessos rápidos</p>
        <button id="drawer-theme-button" class="drawer-link drawer-utility" type="button" data-action="toggle-theme"><span class="drawer-icon" aria-hidden="true">${state.theme === "dark" ? "☼" : "☾"}</span><span class="drawer-link-copy"><strong>${state.theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}</strong><small>Aparência do aplicativo</small></span><span class="drawer-link-arrow" aria-hidden="true">›</span></button>
        <button class="drawer-link drawer-utility" type="button" data-action="install-app"><span class="drawer-icon" aria-hidden="true">⇩</span><span class="drawer-link-copy"><strong>Instalar aplicativo</strong><small>Adicionar à tela inicial</small></span><span class="drawer-link-arrow" aria-hidden="true">›</span></button>
      </footer>
    </aside>`;
}

export function renderChrome(state, activeView, activeRouteId = "", menuOpen = false) {
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", state.theme === "dark" ? "#1d1812" : "#f3ead7");
  const logo = `<img class="brand-mark" src="/icons/stamp.svg" alt="" width="42" height="42" />`;
  const avatar = state.account ? `<button class="icon-button avatar-button" type="button" data-action="switch-view" data-view="profile" aria-label="Meu perfil" title="Meu perfil">${escapeHtml(iniciais(state.account.nome))}</button>` : "";
  document.getElementById("topbar").innerHTML = `
    <button class="icon-button menu-trigger" type="button" data-action="toggle-menu" aria-label="Abrir menu de navegação" aria-controls="app-side-menu" aria-expanded="${menuOpen}" title="Abrir menu"><span aria-hidden="true">☰</span></button>
    <a class="brand" href="#" data-action="switch-view" data-view="home" aria-label="+1 KM, início">
      ${logo}<span class="brand-copy"><span class="brand-name">+1 KM</span><span class="brand-city">${CITY.name} · Nº ${escapeHtml(state.user.number)}</span></span>
    </a>
    <div class="top-actions">${avatar}
      <button class="icon-button" type="button" data-action="toggle-theme" aria-label="Alternar tema" title="Alternar tema"><span aria-hidden="true">${state.theme === "dark" ? "☼" : "☾"}</span></button>
      <button class="icon-button" type="button" data-action="reset-demo" aria-label="Reiniciar caderneta demonstrativa" title="Reiniciar demonstração"><span aria-hidden="true">↺</span></button>
    </div>`;
  document.getElementById("drawer-root").innerHTML = renderSideDrawer(state, activeView, activeRouteId, menuOpen);
  document.getElementById("side-rail").innerHTML = navLinks(activeView);
  document.getElementById("bottom-nav").innerHTML = navLinks(activeView);
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
  return `<article class="route-card">
    <div class="route-card-top"><span class="route-icon ${route.color}" aria-hidden="true">${route.icon}</span><div class="route-info"><h3 class="route-name">${escapeHtml(route.name)}</h3><p class="route-subtitle">${escapeHtml(route.subtitle)}</p></div><span class="route-count">${progress.count}/${progress.total}</span></div>
    ${progressBar(progress, route.color, `Progresso da rota ${route.name}`)}
    <div class="route-card-foot"><span>${complete ? "Concluída · certificado liberado" : `${progress.total - progress.count} ${progress.total - progress.count === 1 ? "ponto restante" : "pontos restantes"}`}</span><button class="route-card-button" type="button" data-action="open-route" data-id="${route.id}">Ver rota →</button></div>
  </article>`;
}

function stamp(point, ordinal, date = "", ctx = {}) {
  return stampHtml(point, ordinal, ctx) + (date ? `<span class="stamp-date">${escapeHtml(date)}</span>` : "");
}

function historyRows(state, count = 4) {
  const rows = [...state.history].reverse().slice(0, count);
  if (!rows.length) return `<div class="empty-state"><strong>Uma página em branco</strong>Seu próximo carimbo começa com uma descoberta.</div>`;
  return rows.map((entry) => {
    const point = getPoint(entry.pointId);
    if (!point) return "";
    return `<div class="history-row"><span class="history-stamp" aria-hidden="true">${point.id.slice(-2)}</span><span class="history-copy"><strong>${escapeHtml(point.name)}</strong><small>Carimbado em ${formatDate(entry.at)}</small></span><span class="status-pill conquered">Conquistado</span></div>`;
  }).join("");
}

// Cards de eventos e patrocínios (vêm do servidor; não alteram a caderneta local nem o certificado das rotas).
let cartoes = [];
export function setEventos(lista) { cartoes = Array.isArray(lista) ? lista : []; }
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
    const nota = card.estado === "encerrado" ? "A coleção terminou. Os carimbos que você fez ficam guardados." : card.estado === "em_breve" ? "Os pontos continuam valendo para a rota normal. O carimbo do card começa na data." : "Encoste nos pontos dentro do período: o mesmo toque vale para a rota e para este card.";
    return `<article class="route-card evento-card ${card.estado}"><div class="route-card-top"><div class="route-info"><p class="evento-origem">${origem}</p><h3 class="route-name">${escapeHtml(card.nome)}</h3><p class="route-subtitle">${janelaDoCard(card)}</p></div><span class="status-pill ${classe}">${rotulo}</span></div>${card.descricao ? `<p class="evento-desc">${escapeHtml(card.descricao)}</p>` : ""}${progressBar(progress, "red", `Carimbos do card ${card.nome}`)}<div class="route-card-foot"><span>${card.feitos}/${card.total} pontos do card</span></div><ul class="evento-pontos">${pontos}</ul><p class="evento-nota">${nota}</p></article>`;
  }).join("");
  return `<section aria-labelledby="eventos-title"><div class="section-heading"><div><h2 id="eventos-title">Eventos e patrocínios</h2><p>Cards com data. Não mudam sua rota nem seus certificados.</p></div></div><div class="evento-lista">${itens}</div></section>`;
}

function renderHome(state) {
  const city = progressFor(state);
  const categoryTotals = CATEGORIES.map((category) => categoryCard(state, category)).join("");
  return `${pageHead("Caderneta", CITY.name)}
    <section class="hero-card" aria-labelledby="hero-title">
      <div class="hero-copy"><span class="hero-overline">${CITY.name}</span><h2 class="hero-title" id="hero-title">Sua cidade.<br />Seus carimbos.</h2><div class="hero-foot"><span class="season-tag">Caderneta nº ${escapeHtml(state.user.number)}</span><span class="season-tag">${city.count}/${city.total} pontos</span></div></div>
      <div class="hero-stamp" aria-label="${city.count} de ${city.total} pontos conquistados"><span><small>${escapeHtml(CITY.name)}</small><strong>${String(city.count).padStart(2, "0")}<span style="font-size:.48em">/${city.total}</span></strong><span class="stamp-divider"></span><small>conquistados</small></span></div>
    </section>
    <div class="stats-strip" aria-label="Resumo da caderneta"><div class="stat-card"><span class="stat-value">${city.count}<span style="font-size:.65em">/${city.total}</span></span><span class="stat-label">pontos da cidade</span></div><div class="stat-card"><span class="stat-value">${certificateRoutes(state).length}</span><span class="stat-label">rotas concluídas</span></div><div class="stat-card"><span class="stat-value">${state.history.length}</span><span class="stat-label">carimbos guardados</span></div></div>
    <section><div class="section-heading"><div><h2>Progresso da cidade</h2><p>${city.count}/${city.total} pontos</p></div></div><div class="category-grid">${categoryTotals}</div>
      <article class="card"><div class="progress-meta"><span>${escapeHtml(CITY.name)}</span><strong>${city.percent}%</strong></div>${progressBar(city, "red", `Pontos conquistados em ${CITY.name}`)}</article>
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
  const field = mapped.filter((point) => point.coordinateKind === "field").length;
  return `<div class="map-stage"><div class="real-map" id="real-map" role="application" aria-label="Mapa de ${escapeHtml(CITY.name)} com ${mapped.length} pontos localizados"></div><div class="map-hud" id="map-hud"></div></div>
    <div class="map-ui" id="map-ui"></div>
    <div class="map-legend"><span class="legend-item"><i class="legend-dot green"></i> Conquistado</span><span class="legend-item"><i class="legend-dot"></i> Disponível</span><span class="legend-item"><i class="legend-dot ochre"></i> Mistério</span><span class="legend-item"><i class="legend-dot field"></i> Marcado em campo</span></div>
    <p class="map-source">OpenStreetMap · ${mapped.length - field} do catálogo (a conferir) · ${field} marcados em campo · ${points.length - mapped.length} sem coordenada</p>`;
}
function renderMap(state, filters) {
  const filtered = getFilteredPoints(state, filters);
  const categoryOptions = `<option value="all">Todas as páginas</option>${CATEGORIES.map((category) => `<option value="${category.id}" ${filters.categoryId === category.id ? "selected" : ""}>${escapeHtml(category.name)}</option>`).join("")}`;
  const statusChips = [
    ["all", "Todos"], ["discovered", "Descobertos"], ["available", "Disponíveis"], ["conquered", "Conquistados"], ["mystery", "Mistérios"],
  ].map(([id, label]) => `<button class="filter-chip" type="button" data-action="set-point-filter" data-filter="${id}" aria-pressed="${filters.pointFilter === id}">${label}</button>`).join("");
  return `${pageHead("Pontos", "Mapa", CITY.name)}
    <article class="card map-card">${mapCanvas(state, filters)}</article>
    <div class="section-heading"><div><h2>Pontos</h2><p>${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}</p></div><label class="eyebrow" for="category-filter">Categoria</label></div>
    <div class="filter-row" style="margin-bottom:10px"><select class="filter-select" id="category-filter" data-select="category" aria-label="Filtrar pontos por categoria">${categoryOptions}</select><input class="search-input" style="flex:1;min-width:170px" type="search" data-input="point-search" placeholder="Buscar um ponto ou código" value="${escapeHtml(filters.search)}" aria-label="Buscar ponto pelo nome ou código" /></div>
    <div class="chip-row" role="group" aria-label="Filtrar pontos por estado">${statusChips}</div>
    <div class="point-list">${filtered.length ? filtered.map((point) => pointRow(state, point, POINTS.indexOf(point) + 1)).join("") : `<div class="empty-state"><strong>Nenhum ponto nesta seleção</strong>Experimente outra categoria ou estado.</div>`}</div>`;
}

function renderRoutes(state) {
  return `${pageHead("Rotas", CITY.name)}
    <div class="route-list">${ROUTES.map((route) => routeCard(state, route)).join("")}</div>
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
      : `<button class="primary-button button-full" type="button" data-action="claim-point" data-id="${point.id}">◉ Carimbar ponto</button>`;
  const history = [...state.history].reverse().find((entry) => entry.pointId === point.id);
  return `${pageHead(`Ponto ${point.id}`, getVisibleName(state, point), CITY.name)}
    <article class="card point-detail-card"><div class="detail-topline"><button class="text-link" type="button" data-action="go-back">← Voltar</button><span class="status-pill ${status}">${stateLabel}</span></div><div class="detail-topline"><div><span class="eyebrow">${CITY.name} · ponto ${String(number).padStart(2, "0")}</span><h1 class="detail-title" style="margin-top:6px">${escapeHtml(getVisibleName(state, point))}</h1></div><span class="detail-seal" aria-hidden="true">${pointStatus(state, point) === "mystery" ? "?" : String(number).padStart(2, "0")}</span></div>
      <p class="detail-description">${escapeHtml(status === "mystery" ? "Uma página ainda escondida na cidade. Revele para descobrir o que ela guarda." : point.note)}</p><div class="tag-list">${categoryTags}<span class="tag">${point.id}</span></div>${action}
      ${history ? `<div class="detail-stamp">${stamp(point, number, "", { state, entry: history, plus: true })}</div>` : ""}
      ${history ? `<p class="small muted" style="margin:11px 0 0;text-align:center">Carimbado em ${formatDate(history.at)} · salvo nesta caderneta</p>` : ""}
      <p class="point-warning">Carimbo local de demonstração; não comprova presença física.</p>
    </article>`;
}

function renderCollection(state) {
  const city = progressFor(state);
  const earnedBadges = [
    { title: "Primeira marca", note: "Guarde seu primeiro carimbo", earned: state.conquered.length >= 1, icon: "✦" },
    { title: "Explorador", note: "Conquiste 5 pontos da cidade", earned: city.count >= 5, icon: "⌖" },
    { title: "Uma rota inteira", note: "Complete uma rota temática", earned: certificateRoutes(state).length >= 1, icon: "⌁" },
    { title: `${CITY.name} completa`, note: "Conquiste todos os pontos desta edição", earned: city.percent === 100, icon: "★" },
  ];
  return `${pageHead("Coleção", "Carimbos", CITY.name)}
    <div class="stats-strip"><div class="stat-card"><span class="stat-value">${state.conquered.length}</span><span class="stat-label">carimbos únicos</span></div><div class="stat-card"><span class="stat-value">${certificateRoutes(state).length}</span><span class="stat-label">rotas na coleção</span></div><div class="stat-card"><span class="stat-value">${city.percent}%</span><span class="stat-label">da cidade</span></div></div>
    <div class="collection-grid">${COLLECTIONS.map((collection) => {
      const progress = progressFor(state, collection.pointIds);
      const tiles = collection.pointIds.slice(0, 12).map((id, index) => {
        const point = getPoint(id);
        const earned = state.conquered.includes(id);
        return `<button class="stamp-slot ${earned ? "is-earned" : ""}" type="button" ${earned ? `data-action="open-point" data-id="${id}"` : `data-action="open-point" data-id="${id}"`} aria-label="${earned ? `Abrir carimbo de ${escapeHtml(point.name)}` : `Abrir ponto ${escapeHtml(getVisibleName(state, point))}`}" title="${escapeHtml(getVisibleName(state, point))}">${earned ? stamp(point, index + 1, "", { state, role: index === 0 ? "inicio" : index === collection.pointIds.length - 1 ? "chegada" : "" }) : `<span class="stamp-placeholder">·</span>`}</button>`;
      }).join("");
      return `<article class="card collection-card"><div class="collection-banner"><span class="route-icon ${collection.color}" aria-hidden="true">${collection.icon}</span><div class="collection-banner-copy"><h3>${escapeHtml(collection.name)}</h3><p>${escapeHtml(collection.subtitle)}</p></div><strong class="route-count">${progress.count}/${progress.total}</strong></div><div class="collection-content"><div class="stamp-grid">${tiles}</div><div style="margin-top:12px">${progressBar(progress, collection.color, `Progresso da coleção ${collection.name}`)}</div><div class="progress-meta"><span>Sem prazo para completar</span><strong>${progress.percent}%</strong></div></div></article>`;
    }).join("")}</div>
    <div class="section-heading"><div><h2>Conquistas especiais</h2><p>As pequenas marcas também contam.</p></div></div><div class="achievement-list">${earnedBadges.map((badge) => `<div class="achievement ${badge.earned ? "" : "locked"}"><span class="achievement-seal" aria-hidden="true">${badge.earned ? badge.icon : "·"}</span><span class="achievement-copy"><strong class="achievement-title">${escapeHtml(badge.title)}</strong><small>${badge.earned ? "Guardada na sua coleção" : escapeHtml(badge.note)}</small></span><span class="status-pill ${badge.earned ? "conquered" : ""}">${badge.earned ? "Conquistada" : "Em aberto"}</span></div>`).join("")}</div>
    <div class="section-heading"><div><h2>Histórico</h2><p>Últimos carimbos</p></div></div><article class="card">${historyRows(state, 5)}</article>`;
}

function renderJourney(state) {
  const journey = state.journey;
  const active = journey.status === "active";
  const clock = journeyClock(journey);
  const currentIndex = journey.currentStageIndex;
  const startButton = journey.status === "not-started"
    ? `<button class="primary-button" type="button" data-action="start-journey">➜ Começar jornada de ${JOURNEY_DAYS} dias</button>`
    : ["expired", "completed"].includes(journey.status)
      ? `<button class="primary-button" type="button" data-action="start-journey">➜ Começar novo ciclo</button>`
      : "";
  const countdown = active
    ? `<div class="journey-countdown-grid"><div class="journey-days"><strong>${clock.daysRemaining}</strong><span>dias restantes</span></div><div class="journey-countdown-copy"><span class="eyebrow">Ciclo ${journey.cycleNumber} · encerra em ${formatDate(clock.endsAt, { day: "2-digit", month: "short", year: "numeric" })}</span><p>Você avança cidade por cidade conforme conquista novos marcos.</p>${progressBar({ count: clock.elapsedPercent, total: 100, percent: clock.elapsedPercent }, "ochre", "Tempo do ciclo decorrido")}</div></div>`
    : journey.status === "completed"
      ? `<div class="journey-closed"><span class="journey-seal">✓</span><div><strong>Ciclo ${journey.cycleNumber} concluído</strong><p>Você fechou a jornada antes do prazo. As conquistas permanentes continuam na caderneta.</p></div></div>`
      : journey.status === "expired"
        ? `<div class="journey-closed"><span class="journey-seal">90</span><div><strong>Ciclo ${journey.cycleNumber} encerrado</strong><p>O tempo terminou; os carimbos e o histórico permanente não foram apagados.</p></div></div>`
        : `<div class="journey-closed"><span class="journey-seal">90</span><div><strong>Um ciclo no seu tempo</strong><p>O prazo começa quando você iniciar. A caderneta permanente não expira.</p></div></div>`;

  const stages = JOURNEY_STAGES.map((stage, index) => {
    const earned = journey.progress?.[stage.id] || [];
    const target = stage.kind === "new-points" ? stage.target : stage.milestones.length;
    const progress = { count: earned.length, total: target, percent: target ? Math.round((earned.length / target) * 100) : 0 };
    const completed = journey.status !== "not-started" && index < currentIndex;
    const isCurrent = active && index === currentIndex;
    const isReady = journey.status === "not-started" && index === 0;
    const expiredCurrent = journey.status === "expired" && index === currentIndex;
    const statusText = completed ? "Concluída" : isCurrent ? "Etapa atual" : isReady ? "Pronta para começar" : expiredCurrent ? "Ciclo encerrado" : "Bloqueada";
    const cssStatus = completed ? "complete" : isCurrent ? "active" : "locked";
    let details = "<p class=\"journey-stage-hint\">Conclua a etapa anterior para abrir este destino.</p>";

    if (completed) {
      details = `<div class="progress-meta"><span>Marcos guardados neste ciclo</span><strong>${progress.count}/${progress.total}</strong></div>${progressBar(progress, "green", `Progresso concluído em ${stage.cityName}`)}<p class="journey-stage-hint">Destino registrado no ciclo ${journey.cycleNumber}; a caderneta permanente segue separada.</p>`;
    } else if (isCurrent && stage.kind === "new-points") {
      details = `<p class="journey-stage-hint">${stage.target} pontos novos nesta etapa.</p><div class="progress-meta"><span>Progresso</span><strong>${progress.count}/${progress.total}</strong></div>${progressBar(progress, "red", `Novas conquistas em ${stage.cityName}`)}<button class="outline-button journey-map-button" type="button" data-action="switch-view" data-view="map">⌖ Abrir pontos de ${escapeHtml(stage.cityName)}</button>`;
    } else if (isCurrent && stage.kind === "milestones") {
      details = `<p class="journey-stage-hint">Marcos simulados desta etapa.</p><div class="journey-milestones">${stage.milestones.map((milestone) => {
        const isEarned = earned.includes(milestone.id);
        return `<button class="journey-milestone ${isEarned ? "is-earned" : ""}" type="button" data-action="complete-journey-milestone" data-id="${milestone.id}" ${isEarned ? "disabled" : ""}><span class="journey-milestone-mark" aria-hidden="true">${isEarned ? "✓" : "·"}</span><span>${escapeHtml(milestone.title)}</span><small>${isEarned ? "Guardado no ciclo" : "Simular marco"}</small></button>`;
      }).join("")}</div><div class="progress-meta"><span>Marcos da etapa</span><strong>${progress.count}/${progress.total}</strong></div>${progressBar(progress, "blue", `Marcos da etapa de ${stage.cityName}`)}`;
    } else if (isCurrent && journey.status === "active") {
      details = `<p class="journey-stage-hint">${escapeHtml(stage.subtitle)}</p>`;
    } else if (expiredCurrent) {
      details = `<p class="journey-stage-hint">O ciclo fechou com ${progress.count} de ${progress.total} marcos nesta etapa.</p>${progressBar(progress, "ochre", `Progresso ao encerrar ${stage.cityName}`)}`;
    } else if (isReady) {
      details = `<p class="journey-stage-hint">Inicie o ciclo para abrir esta etapa.</p>`;
    }

    return `<article class="journey-stage is-${cssStatus}" aria-label="${escapeHtml(stage.cityName)}: ${statusText}"><div class="journey-stage-heading"><span class="journey-step-number">${String(index + 1).padStart(2, "0")}</span><div class="journey-stage-title"><span class="eyebrow">Destino ${index + 1}</span><h3>${escapeHtml(stage.cityName)}</h3><p>${escapeHtml(stage.subtitle)}</p></div><span class="status-pill ${completed ? "conquered" : isCurrent ? "discovered" : ""}">${statusText}</span></div><div class="journey-stage-content">${details}</div></article>`;
  }).join("");

  const history = [...(journey.history || [])].reverse();
  const historyPanel = history.length
    ? `<div class="section-heading"><div><h2>Ciclos fechados</h2><p>Um resumo das jornadas anteriores; nada sai da caderneta.</p></div></div><div class="journey-history">${history.map((cycle) => `<article class="journey-history-row"><span class="journey-history-number">#${cycle.cycleNumber}</span><span><strong>${cycle.status === "completed" ? "Jornada concluída" : "Ciclo encerrado"}</strong><small>${formatDate(cycle.startedAt)} — ${formatDate(cycle.closedAt)} · ${cycle.completedStages}/${JOURNEY_STAGES.length} destinos · ${cycle.earnedMilestones} marcos</small></span></article>`).join("")}</div>`
    : "";
  const journeyRoute = [...new Set(JOURNEY_STAGES.map((stage) => stage.cityName))].join(" → ");

  return `${pageHead("Jornada", `Ciclo de ${JOURNEY_DAYS} dias`, CITY.name)}
    <section class="card journey-countdown" aria-label="Prazo da jornada">${countdown}<div class="journey-start-row">${startButton}<span class="small muted">${active ? `${clock.hoursRemaining} h além dos dias exibidos` : "Ciclos separados da coleção permanente"}</span></div></section>
    <div class="journey-route-head"><span class="eyebrow">Percurso da jornada</span><p>${escapeHtml(journeyRoute)}</p></div>
    <div class="journey-stages">${stages}</div>
    <p class="point-warning">Relógio local. A jornada não apaga os carimbos permanentes.</p>
    ${historyPanel}`;
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
    ${isCityComplete ? `<article class="card" style="margin-top:20px;text-align:center"><span class="eyebrow">Conquista especial</span><h3 class="card-title" style="margin:7px 0">${escapeHtml(CITY.name)} completa · ${CITY.totalPoints}/${CITY.totalPoints}</h3><p class="small muted">Você encontrou todos os pontos desta edição demonstrativa.</p></article>` : ""}
    <div class="section-heading"><div><h2>Rotas carimbadas</h2><p>Certificados liberados nesta caderneta.</p></div></div><div class="certificate-list">${earned.map((completeRoute) => `<button class="point-row" type="button" data-action="open-certificate" data-id="${completeRoute.id}"><span class="route-icon ${completeRoute.color}" aria-hidden="true">🎖</span><span class="point-main"><span class="point-name">${escapeHtml(completeRoute.name)}</span><span class="point-meta">Certificado · ${routeProgress(state, completeRoute).total} pontos</span></span><span class="status-pill conquered">Concluída</span></button>`).join("")}</div>`;
}

export function renderView(state, view, selectedPointId, selectedRouteId, filters) {
  switch (view) {
    case "map": return renderMap(state, filters);
    case "journey": return renderJourney(state);
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
        <p class="small muted">Caderneta nº ${escapeHtml(state.user.number)}${desde ? ` · desde ${escapeHtml(desde)}` : ""}</p>
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
    </article>`;
}


function renderEunapolis() {
  const guide = EUNAPOLIS_DESTINATION;
  const facts = guide.facts.map((fact) => `<div class="destination-fact"><span>${escapeHtml(fact.label)}</span><strong>${escapeHtml(fact.value)}</strong><small>${escapeHtml(fact.detail)}</small></div>`).join("");
  const eventRoutes = guide.event.routes.map((route) => `<article class="destination-event-route"><span class="destination-event-kind">Referência · 2025</span><strong class="destination-event-distance">${escapeHtml(route.distance)}</strong><span class="destination-return-label">Retorno informado</span><h3>${escapeHtml(route.returnPoint)}</h3><p>${escapeHtml(route.note)}</p></article>`).join("");
  const sourceLinks = guide.sources.map((source) => `<a class="destination-source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)} <span aria-hidden="true">↗</span></a>`).join("");
  const parkSource = guide.sources.find((source) => source.label.startsWith("Parque Gravatá"));
  return `${pageHead("Destino · Eunápolis, Bahia", guide.name, "Memória local, referências de percurso e caminhos comunitários para caminhada e pedal.")}
    <div class="destination-return-row no-print"><button class="text-link" type="button" data-action="switch-view" data-view="routes">← Voltar às rotas</button></div>
    <article class="card destination-hero">
      <div class="destination-hero-top"><span class="destination-stamp" aria-hidden="true">EU</span><div class="destination-hero-copy"><span class="eyebrow">${escapeHtml(guide.region)}</span><h2>Uma cidade que nasceu do caminho</h2><p>${escapeHtml(guide.summary)}</p></div></div>
      <div class="destination-facts">${facts}</div>
      <p class="destination-credit">População informada como resultado do Censo 2022; os demais dados vêm da página municipal de Eunápolis.</p>
    </article>

    <section class="card destination-community" aria-labelledby="destination-community-title">
      <div class="destination-section-heading"><span class="eyebrow">Atividade comunitária pública</span><h2 id="destination-community-title">Encontre caminhos no Strava</h2><p>Os mapas abaixo filtram atividade pública agregada perto do centro de Eunápolis. Eles mostram corredores e vias com atividade, não um arquivo de navegação individual.</p></div>
      <div class="destination-community-links">
        <a class="destination-community-link" href="${escapeHtml(guide.strava.walkHeatmap)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir mapa público do Strava para caminhada em Eunápolis"><span class="destination-mode-mark" aria-hidden="true">↟</span><span><strong>Caminhada</strong><small>Mapa comunitário · Walk</small></span><span class="destination-open-mark" aria-hidden="true">↗</span></a>
        <a class="destination-community-link" href="${escapeHtml(guide.strava.rideHeatmap)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir mapa público do Strava para pedal em Eunápolis"><span class="destination-mode-mark" aria-hidden="true">⌁</span><span><strong>Pedal</strong><small>Mapa comunitário · Ride</small></span><span class="destination-open-mark" aria-hidden="true">↗</span></a>
      </div>
      <div class="destination-instructions"><h3>Para gerar uma rota atual no app Strava</h3><ol class="destination-steps"><li>Abra <strong>Mapas → Rotas</strong>.</li><li>Busque <strong>Eunápolis</strong> e escolha um ponto de partida.</li><li>Selecione <strong>Caminhada</strong> ou <strong>Pedal</strong> e ajuste distância, elevação e superfície.</li></ol><a class="destination-inline-link" href="${escapeHtml(guide.strava.maps)}" target="_blank" rel="noopener noreferrer">Abrir Mapas do Strava ↗</a> <a class="destination-inline-link" href="${escapeHtml(guide.strava.communityHelp)}" target="_blank" rel="noopener noreferrer">Como funcionam as rotas da comunidade ↗</a></div>
      <p class="destination-caveat">A geração depende dos recursos disponíveis na sua conta Strava e pode exigir login/assinatura. Os mapas agregados não garantem calçada, iluminação, segurança, acessibilidade ou condições atuais das vias; confirme o percurso antes de sair. Nenhuma atividade privada sua ou rota individual de atleta foi copiada para o +1 KM.</p>
    </section>

    <div class="section-heading"><div><h2>Um percurso publicado na cidade</h2><p>${escapeHtml(guide.event.name)} · ${escapeHtml(guide.event.date)}</p></div></div>
    <article class="card destination-event-card"><div class="destination-event-meta"><span><strong>Largada:</strong> ${escapeHtml(guide.event.start)}</span><span class="destination-historic-pill">Evento histórico · 2025</span></div><div class="destination-event-grid">${eventRoutes}</div><p class="destination-caveat">A Prefeitura publicou essas distâncias e pontos de retorno para uma prova com sinalização e fechamento de vias naquela data. A publicação não oferece GPX e não confirma condições atuais: use como registro histórico, não como rota navegável.</p></article>

    <article class="card destination-park-card"><div><span class="eyebrow">Referência ao ar livre</span><h2>${escapeHtml(guide.outdoorSpot.name)}</h2><p>${escapeHtml(guide.outdoorSpot.note)}</p></div>${parkSource ? `<a class="destination-inline-link" href="${escapeHtml(parkSource.url)}" target="_blank" rel="noopener noreferrer">Ver registro municipal ↗</a>` : ""}</article>

    <section class="destination-sources" aria-label="Fontes consultadas"><p class="eyebrow">Fontes consultadas</p><div class="destination-source-list">${sourceLinks}</div></section>`;
}
