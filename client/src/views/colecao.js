import { CITY, ROUTES, COLLECTIONS, getPoint } from "../data.js";
import { secaoColecao } from "../cartas.js";
import { escapeHtml, progressFor, routeProgress, certificateRoutes, pointStatus, getVisibleName, formatDate, progressBar, pageHead, stamp, historyRows, colecaoServidor } from "./base.js";

function renderColecao(state) {
  if (!(state.account && state.session)) return "";
  return secaoColecao(colecaoServidor);
}

export function renderCollection(state) {
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

export function renderCertificates(state, requestedRouteId = "") {
  const earned = certificateRoutes(state);
  const route = earned.find((item) => item.id === requestedRouteId) || earned[0];
  if (!route) {
    const progress = progressFor(state, ROUTES[0].pointIds);
    return `${pageHead("Uma lembrança para levar", "Certificados", "Cada certificado aparece quando seus carimbos completam uma rota.")}
      <div class="locked-certificate"><div class="lock" aria-hidden="true">▧</div><h2 class="card-title" style="margin:8px 0">Ainda falta uma página</h2><p class="small muted">Conquiste todos os pontos de uma rota para liberar seu primeiro certificado. Sem prazo.</p><div style="max-width:360px;margin:13px auto"><div class="progress-meta"><span>${escapeHtml(ROUTES[0].name)}</span><strong>${progress.count}/${progress.total}</strong></div>${progressBar(progress, "ochre", "Progresso até o primeiro certificado")}</div><button class="primary-button" type="button" data-action="open-route" data-id="${ROUTES[0].id}">Continuar esta rota</button></div>`;
  }
  const progress = routeProgress(state, route);
  const routeEntries = route.pointIds.map((id) => state.history.filter((entry) => entry.pointId === id).at(-1));
  const hasCompleteHistory = routeEntries.every(Boolean);
  const completionAt = hasCompleteHistory ? routeEntries.map((entry) => entry.at).sort((a, b) => Date.parse(b) - Date.parse(a))[0] : null;
  const date = completionAt ? `Rota concluída em ${formatDate(completionAt, { day: "2-digit", month: "long", year: "numeric" })}` : "Todos os pontos desta rota estão confirmados";
  const selectedIndex = earned.findIndex((item) => item.id === route.id) + 1;
  const stampRow = route.pointIds.slice(0, 6).map((id, index) => `<span class="certificate-stamp-cell" title="${escapeHtml(getPoint(id)?.name || id)}">${stamp(getPoint(id), index + 1, "", { state, role: index === 0 ? "inicio" : index === route.pointIds.length - 1 ? "chegada" : "" })}</span>`).join("");
  const isCityComplete = progressFor(state).percent === 100;
  return `${pageHead("Memória em papel", "Certificados", `${earned.length} ${earned.length === 1 ? "rota concluída" : "rotas concluídas"} · escolha um certificado para visualizar ou compartilhar.`)}
    <div class="certificate-counter"><span aria-hidden="true">🎖</span><div><strong>Certificado ${selectedIndex} de ${earned.length}</strong><small>${escapeHtml(date)}</small></div></div>
    <article class="certificate" aria-label="Certificado digital de conclusão da ${escapeHtml(route.name)}">
      <div class="certificate-stars">✦ · ✦ · ✦</div><p class="eyebrow" style="margin:12px 0 0">+1 KM · ${escapeHtml(CITY.name)}</p><h2 class="certificate-title">Certificado<br />de rota</h2><p class="small">Atesta que</p><p class="certificate-name">${escapeHtml(state.user.name)}</p><p>completou todos os ${progress.total} pontos da<br /><strong>${escapeHtml(route.name)}</strong></p><div class="certificate-stamp-row">${stampRow}</div><p class="small muted">${escapeHtml(date)} · caderneta nº ${escapeHtml(state.user.number)}</p><div class="certificate-seal">ROTA<br />CONQUISTADA</div><p class="eyebrow">Cada ponto, uma história guardada.</p>
    </article><div class="button-row no-print certificate-actions" style="justify-content:center;margin:20px 0"><button class="primary-button" type="button" data-action="share-certificate" data-id="${route.id}">↗ Compartilhar</button><button class="outline-button" type="button" data-action="print-certificate">▤ Imprimir</button></div>
    ${isCityComplete ? `<article class="card" style="margin-top:20px;text-align:center"><span class="eyebrow">Conquista especial</span><h3 class="card-title" style="margin:7px 0">${escapeHtml(CITY.name)} completa · ${CITY.totalPoints}/${CITY.totalPoints}</h3><p class="small muted">Você encontrou todos os pontos desta edição.</p></article>` : ""}
    <div class="section-heading"><div><h2>Rotas carimbadas</h2><p>Certificados liberados nesta caderneta.</p></div></div><div class="certificate-list">${earned.map((completeRoute) => `<button class="point-row certificate-route-choice ${completeRoute.id === route.id ? "is-selected" : ""}" type="button" data-action="open-certificate" data-id="${completeRoute.id}" ${completeRoute.id === route.id ? 'aria-current="true"' : 'aria-current="false"'}><span class="route-icon ${completeRoute.color}" aria-hidden="true">🎖</span><span class="point-main"><span class="point-name">${escapeHtml(completeRoute.name)}</span><span class="point-meta">Certificado · ${routeProgress(state, completeRoute).total} pontos</span></span><span class="status-pill conquered">Concluída</span></button>`).join("")}</div>`;
}
