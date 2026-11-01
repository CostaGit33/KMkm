import { CITY, POINTS, ROUTES, getCategory, getPoint } from "../data.js";
import { miniaturaHtml } from "../galeria.js";
import { escapeHtml, routeProgress, pointStatus, getVisibleName, progressBar, pageHead } from "./base.js";

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

function pointRow(state, point, ordinal) {
  const status = pointStatus(state, point);
  const statusLabel = { conquered: "conquistado", discovered: "descoberto", available: "disponível", mystery: "mistério" }[status];
  const categoryNames = point.categoryIds.map((id) => getCategory(id)?.name).filter(Boolean).join(" · ");
  const mapStatus = Number.isFinite(point.lat) && Number.isFinite(point.lng) ? "coordenada no mapa" : "sem coordenada";
  return `<button class="point-row" type="button" data-action="open-point" data-id="${point.id}" aria-label="Abrir ${escapeHtml(getVisibleName(state, point))}, ${statusLabel}"><span class="point-number">${String(ordinal).padStart(2, "0")}</span>${status === "mystery" ? "" : miniaturaHtml(point)}<span class="point-main"><span class="point-name">${escapeHtml(getVisibleName(state, point))}</span><span class="point-meta">${escapeHtml(categoryNames)} · ${point.id} · ${mapStatus}</span></span><span class="status-pill ${status}">${statusLabel}</span></button>`;
}

export function renderRoutes(state) {
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

export function renderRouteDetail(state, routeId) {
  const route = ROUTES.find((item) => item.id === routeId);
  if (!route) return renderRoutes(state);
  const progress = routeProgress(state, route);
  const points = route.pointIds.map(getPoint).filter(Boolean);
  return `${pageHead("Rota", route.name, route.subtitle)}
    <article class="card" style="border-top:5px solid var(--${route.color === "ochre" ? "ochre" : route.color})"><div class="card-heading"><div><span class="eyebrow">${CITY.name}</span>${route.note ? `<p class="small muted" style="margin:6px 0 0">${escapeHtml(route.note)}</p>` : ""}</div><span class="route-icon ${route.color}" aria-hidden="true">${route.icon}</span></div><div class="progress-meta"><span>${progress.count}/${progress.total} pontos</span><strong>${progress.percent}%</strong></div>${progressBar(progress, route.color, `Progresso da ${route.name}`)}<div class="route-card-foot"><span>${progress.percent === 100 ? "Concluída · certificado liberado" : `${progress.total - progress.count} restantes`}</span><button class="route-card-button" type="button" data-action="switch-view" data-view="routes">← Rotas</button></div></article>
    <div class="section-heading"><div><h2>Pontos da rota</h2><p>${progress.count}/${progress.total} carimbados</p></div></div><div class="point-list">${points.map((point) => pointRow(state, point, POINTS.indexOf(point) + 1)).join("")}</div>
    ${progress.percent === 100 ? `<div class="button-row" style="margin-top:15px"><button class="primary-button" type="button" data-action="open-certificate" data-id="${route.id}">🎖 Abrir certificado</button></div>` : ""}`;
}
