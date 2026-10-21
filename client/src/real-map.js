import { carregarConfigMapa, createGoogleEngine, createLeafletEngine } from "./map-engines.js";
import { ROUTES, POINTS, CATEGORIES } from "./data.js";
import { ARRIVAL_M, clearMark, directionsUrl, streetViewUrl, distanceMeters, formatDistance, hasCoords, marksCsv, saveMark } from "./geo.js";

const EUNAPOLIS_VIEW = { center: [-16.3766, -39.5864], zoom: 14 };
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function statusOf(state, point) {
  if (state.conquered.includes(point.id)) return "conquered";
  if (point.hidden && !state.discovered.includes(point.id)) return "mystery";
  return "available";
}
const STATUS_TEXT = { conquered: "Conquistado", mystery: "Mistério", available: "Disponível" };

function sourceText(point) {
  if (point.coordinateKind === "field") {
    const m = point.fieldMark;
    const when = m?.at ? new Date(m.at).toLocaleDateString("pt-BR") : "";
    return `Marcado em campo${m?.accuracy ? ` · precisão ${m.accuracy} m` : ""}${when ? ` · ${when}` : ""}`;
  }
  if (point.coordinateKind === "area_anchor") return "Âncora de área, não é o local exato";
  if (hasCoords(point)) return point.mapSource || "Catálogo";
  return "Sem coordenada";
}

export function mountRealMap({ element, city, points, state, onOpenPoint }) {
  if (!element) return null;
  const ui = document.getElementById("map-ui");
  const mapConfig = city.mapCenter || EUNAPOLIS_VIEW;
  const message = { text: "" };
  let tileWarned = false;
  let engine = null;
  let destroyed = false;
  const ordinal = (point) => POINTS.indexOf(point) + 1;
  let routeId = "all";
  let selectedId = null;
  let markingId = null; // ponto aguardando um toque no mapa
  let user = null; // { lat, lng, accuracy }
  let watchId = null;
  let tourTimer = null;
  let arrivedId = null;

  let pendingOpen = false;

  const activeIds = () => (routeId === "all" ? null : new Set((ROUTES.find((r) => r.id === routeId)?.pointIds) || []));
  const nextPoint = () => {
    const ids = activeIds();
    return points.find((p) => hasCoords(p) && !p.hidden && statusOf(state, p) !== "conquered" && (!ids || ids.has(p.id)));
  };

  function htmlFor(point) {
    const status = statusOf(state, point);
    const ids = activeIds();
    const dim = ids && !ids.has(point.id) ? " is-dim" : "";
    const next = nextPoint()?.id === point.id ? " is-next" : "";
    const sel = selectedId === point.id ? " is-selected" : "";
    const field = point.coordinateKind === "field" ? " is-field" : point.coordinateKind === "area_anchor" ? " is-anchor" : "";
    const category = CATEGORIES.find((item) => point.categoryIds?.includes(item.id));
    const label = status === "mystery" ? "?" : (category?.icon || "•");
    return `<span class="mk-wrap"><span class="mk mk--${status}${dim}${next}${sel}${field}"><i class="mk-ring"></i><b>${label}</b></span></span>`;
  }

  function refreshMarkers() {
    if (!engine) return;
    for (const point of points) {
      if (!hasCoords(point)) { engine.removeMarker(point.id); continue; }
      engine.upsertMarker(point.id, { lat: point.lat, lng: point.lng, html: htmlFor(point), title: `${point.id} · ${point.name}`, draggable: markingId === point.id }, {
        onClick: () => select(point.id, { fly: true }),
        onDragEnd: (lat, lng) => {
          saveMark(point.id, { lat, lng });
          message.text = `${point.name}: posição ajustada.`;
          refresh();
        },
      });
    }
  }

  function drawRoute() {
    if (!engine) return;
    if (routeId === "all") { engine.setRoute(null); return; }
    const route = ROUTES.find((r) => r.id === routeId);
    const coords = (route?.pointIds || []).map((id) => POINTS.find((p) => p.id === id)).filter((p) => p && hasCoords(p)).map((p) => [p.lat, p.lng]);
    engine.setRoute(coords);
  }

  function frame() {
    if (!engine) return;
    const ids = activeIds();
    const pts = points.filter((p) => hasCoords(p) && (!ids || ids.has(p.id)));
    if (pts.length > 1) engine.fitBounds(pts.map((p) => [p.lat, p.lng]), 16);
    else if (pts.length === 1) engine.setView(pts[0].lat, pts[0].lng, 16);
  }

  function select(id, { fly = false } = {}) {
    selectedId = id;
    const point = POINTS.find((p) => p.id === id);
    if (fly && point && hasCoords(point)) engine?.flyTo(point.lat, point.lng, 16);
    refresh();
  }

  function stopTour() { if (tourTimer) { clearTimeout(tourTimer); tourTimer = null; } renderHud(); }
  function startTour() {
    if (tourTimer) return stopTour();
    const ids = activeIds();
    const seq = points.filter((p) => hasCoords(p) && (!ids || ids.has(p.id)));
    if (seq.length < 2) { message.text = "Para percorrer, a rota precisa de pelo menos 2 pontos com coordenada."; refresh(); return; }
    let i = 0;
    const step = () => {
      select(seq[i].id, { fly: true });
      i += 1;
      tourTimer = i < seq.length ? setTimeout(step, 2600) : null;
      if (!tourTimer) setTimeout(renderHud, 2600);
      renderHud();
    };
    step();
  }

  function locate() {
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; engine?.setUser(null); user = null; arrivedId = null; refresh(); return; }
    if (!navigator.geolocation) { message.text = "Este aparelho não oferece localização."; refresh(); return; }
    message.text = "Procurando sua posição…"; refresh();
    watchId = navigator.geolocation.watchPosition((pos) => {
      user = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
      engine?.setUser(user);
      const near = points.filter(hasCoords).map((p) => ({ p, d: distanceMeters(user, p) })).sort((a, b) => a.d - b.d)[0];
      arrivedId = near && near.d <= ARRIVAL_M ? near.p.id : null;
      message.text = "";
      refresh();
    }, (err) => {
      watchId = null;
      message.text = err.code === 1 ? "Localização bloqueada. Libere a permissão do site nas configurações do navegador." : "Não foi possível obter sua posição agora.";
      refresh();
    }, { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 });
  }

  function useMyPositionFor(point) {
    if (!user) { message.text = "Ligue “Estou aqui” e espere a posição aparecer; depois use este botão."; refresh(); return; }
    saveMark(point.id, user);
    message.text = `${point.name}: marcado com sua posição${user.accuracy ? ` (precisão ${Math.round(user.accuracy)} m)` : ""}.`;
    refresh();
  }

  async function copyCsv() {
    const csv = marksCsv();
    try { await navigator.clipboard.writeText(csv); message.text = "Marcações copiadas (CSV). Cole numa planilha."; }
    catch {
      try {
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a"); a.href = url; a.download = "marcacoes-eunapolis.csv"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        message.text = "Arquivo marcacoes-eunapolis.csv gerado.";
      } catch { message.text = "Não consegui copiar nem gerar o arquivo neste aparelho."; }
    }
    refresh();
  }

  function sheet() {
    const point = POINTS.find((p) => p.id === selectedId);
    if (!point) return `<p class="map-hint">Toque em um símbolo para ver o ponto, a distância até ele e como chegar. Cada símbolo representa a categoria do local.</p>`;
    const status = statusOf(state, point);
    const name = status === "mystery" ? "Ponto misterioso" : point.name;
    const dist = user && hasCoords(point) ? distanceMeters(user, point) : null;
    const arrived = dist != null && dist <= ARRIVAL_M;
    const mapped = hasCoords(point);
    return `<div class="map-sheet ${arrived ? "is-arrived" : ""}">
      <div class="map-sheet-top"><span class="map-sheet-num">${ordinal(point)}</span><div><strong>${esc(name)}</strong><small>${point.id} · ${STATUS_TEXT[status]}</small></div>${dist != null ? `<span class="map-dist">${arrived ? "Você chegou" : `a ${formatDistance(dist)}`}</span>` : ""}</div>
      <p class="map-sheet-src">${esc(sourceText(point))}</p>
      <div class="map-sheet-actions">
        <button type="button" class="map-btn primary" data-map="open" data-id="${point.id}">${arrived ? "Abrir e carimbar" : "Abrir ficha"}</button>
        ${mapped ? `<a class="map-btn" href="${esc(directionsUrl(point))}" target="_blank" rel="noopener noreferrer">Como chegar</a>` : ""}
        ${mapped ? `<a class="map-btn" href="${esc(streetViewUrl(point))}" target="_blank" rel="noopener noreferrer">Ver a rua</a>` : ""}
      </div>
    </div>`;
  }

  function renderHud() {
    const hud = document.getElementById("map-hud");
    if (!hud) return;
    hud.innerHTML = `<button type="button" class="map-fab ${tourTimer ? "on" : ""}" data-map="tour" aria-pressed="${!!tourTimer}">${tourTimer ? "■ Parar" : "▶ Percorrer"}</button>
      <button type="button" class="map-fab" data-map="fit">Enquadrar</button>
      <button type="button" class="map-fab ${watchId != null ? "on" : ""}" data-map="locate" aria-pressed="${watchId != null}">◎ Estou aqui</button>`;
  }

  function refresh() {
    refreshMarkers();
    drawRoute();
    renderHud();
    element.classList.toggle("is-marking", !!markingId);
    if (!ui) return;
    const ids = activeIds();
    const chips = [`<button type="button" class="map-chip" data-map="route" data-id="all" aria-pressed="${routeId === "all"}">Todos</button>`]
      .concat(ROUTES.map((r) => `<button type="button" class="map-chip" data-map="route" data-id="${r.id}" aria-pressed="${routeId === r.id}">${esc(r.name)}</button>`)).join("");
    const pending = points.filter((p) => !hasCoords(p) && statusOf(state, p) !== "mystery" && (!ids || ids.has(p.id)));
    const withCoords = points.filter(hasCoords).length;
    const route = routeId === "all" ? null : ROUTES.find((r) => r.id === routeId);
    const routeMapped = route ? route.pointIds.filter((id) => hasCoords(POINTS.find((p) => p.id === id) || {})).length : 0;
    const arrivedPoint = arrivedId && POINTS.find((p) => p.id === arrivedId);
    ui.innerHTML = `
      ${arrivedPoint ? `<div class="map-arrived" role="status"><strong>Você chegou: ${esc(arrivedPoint.name)}</strong><button type="button" class="map-btn primary" data-map="open" data-id="${arrivedPoint.id}">Abrir e carimbar</button></div>` : ""}
      <div class="map-chips" role="group" aria-label="Rotas no mapa">${chips}</div>
      ${route && routeMapped < 2 ? `<p class="map-hint">Esta rota tem ${routeMapped} ponto${routeMapped === 1 ? "" : "s"} com coordenada. Marque os outros para o trajeto aparecer.</p>` : ""}
      ${message.text ? `<p class="map-msg" role="status">${esc(message.text)}</p>` : ""}
      ${sheet()}
      ${pending.length ? `<details class="map-pending" ${pendingOpen ? "open" : ""}><summary>${pending.length} sem localização</summary><ul>${pending.map((p) => `<li><span>${esc(p.name)}</span><span class="map-sheet-src">Localização não cadastrada</span></li>`).join("")}</ul></details>` : ""}
      <div class="map-foot"><span>${withCoords} de ${points.length} com coordenada</span><button type="button" class="map-btn" data-map="csv">Copiar marcações (CSV)</button></div>`;
  }

  const onUiClick = (event) => {
    const target = event.target.closest("[data-map]");
    if (!target) return;
    const { map: action, id } = target.dataset;
    const point = POINTS.find((p) => p.id === id);
    if (action === "route") { routeId = id; stopTour(); refresh(); frame(); }
    else if (action === "open" && point) onOpenPoint(point.id);
    else if (action === "mark" && point) { markingId = markingId === point.id ? null : point.id; message.text = ""; select(point.id, { fly: hasCoords(point) }); }
    else if (action === "here" && point) useMyPositionFor(point);
    else if (action === "clear" && point) { clearMark(point.id); message.text = `${point.name}: marcação removida.`; refresh(); }
    else if (action === "csv") copyCsv();
  };
  const onHudClick = (event) => {
    const action = event.target.closest("[data-map]")?.dataset.map;
    if (action === "tour") startTour();
    else if (action === "fit") { stopTour(); frame(); }
    else if (action === "locate") locate();
  };
  const onToggle = (event) => { if (event.target.matches?.(".map-pending")) pendingOpen = event.target.open; };
  ui?.addEventListener("click", onUiClick);
  ui?.addEventListener("toggle", onToggle, true);
  const hudEl = document.getElementById("map-hud");
  hudEl?.addEventListener("click", onHudClick);

  function bindEngine() {
    engine.onClick((lat, lng) => {
      if (!markingId) return;
      const point = POINTS.find((p) => p.id === markingId);
      saveMark(markingId, { lat, lng });
      message.text = `${point?.name || "Ponto"} marcado.`;
      refresh();
    });
    engine.onDragStart(() => { if (tourTimer) stopTour(); });
    refresh();
    frame();
    window.setTimeout(() => engine?.resize(), 0);
  }

  function startLeaflet() {
    element.innerHTML = "";
    engine = createLeafletEngine(element, mapConfig, {
      onTileError: () => {
        if (tileWarned) return;
        tileWarned = true;
        message.text = "O mapa de fundo não carregou (sem internet ou sem acesso ao serviço de mapas). Os pontos continuam na posição certa.";
        refresh();
      },
    });
    bindEngine();
  }

  // Google Maps quando o servidor tem chave configurada; qualquer falha cai no mapa aberto (OpenStreetMap).
  (async () => {
    const config = await carregarConfigMapa();
    if (destroyed) return;
    if (!config.googleMapsKey) { startLeaflet(); return; }
    try {
      engine = await createGoogleEngine(element, mapConfig, {
        apiKey: config.googleMapsKey, mapId: config.googleMapId, theme: state.theme,
        onAuthFailure: () => {
          if (destroyed || engine?.kind !== "google") return;
          engine.destroy();
          message.text = "A chave do Google Maps foi recusada. Mostrando o mapa aberto.";
          startLeaflet();
        },
      });
      if (destroyed) { engine.destroy(); return; }
      element.dataset.engine = "google";
      bindEngine();
    } catch {
      if (destroyed) return;
      message.text = "Não consegui carregar o Google Maps. Mostrando o mapa aberto.";
      startLeaflet();
    }
  })();

  refresh();

  return {
    remove() {
      destroyed = true;
      if (tourTimer) clearTimeout(tourTimer);
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      ui?.removeEventListener("click", onUiClick);
      ui?.removeEventListener("toggle", onToggle, true);
      hudEl?.removeEventListener("click", onHudClick);
      engine?.destroy();
      engine = null;
    },
  };
}
