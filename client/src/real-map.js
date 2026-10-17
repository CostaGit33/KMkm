import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ROUTES, POINTS } from "./data.js";
import { ARRIVAL_M, clearMark, directionsUrl, distanceMeters, formatDistance, hasCoords, marksCsv, saveMark } from "./geo.js";

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
  const map = L.map(element, { zoomControl: false, scrollWheelZoom: false, minZoom: 10, maxZoom: 18 }).setView(mapConfig.center, mapConfig.zoom);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("/api/map-tiles/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    maxZoom: 19,
  }).on("tileerror", () => {
    if (tileWarned) return;
    tileWarned = true;
    message.text = "O mapa de fundo não carregou (sem internet ou sem acesso ao serviço de mapas). Os pontos continuam na posição certa.";
    refresh();
  }).addTo(map);
  const message = { text: "" };
  let tileWarned = false;
  const ordinal = (point) => POINTS.indexOf(point) + 1;
  const markers = new Map();
  let routeId = "all";
  let selectedId = null;
  let markingId = null; // ponto aguardando um toque no mapa
  let routeLine = null;
  let userDot = null;
  let userRing = null;
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

  function iconFor(point) {
    const status = statusOf(state, point);
    const ids = activeIds();
    const dim = ids && !ids.has(point.id) ? " is-dim" : "";
    const next = nextPoint()?.id === point.id ? " is-next" : "";
    const sel = selectedId === point.id ? " is-selected" : "";
    const field = point.coordinateKind === "field" ? " is-field" : point.coordinateKind === "area_anchor" ? " is-anchor" : "";
    const label = status === "conquered" ? "✓" : status === "mystery" ? "?" : ordinal(point);
    return L.divIcon({ className: "mk-wrap", iconSize: [38, 38], iconAnchor: [19, 19], html: `<span class="mk mk--${status}${dim}${next}${sel}${field}"><i class="mk-ring"></i><b>${label}</b></span>` });
  }

  function addMarker(point) {
    const marker = L.marker([point.lat, point.lng], { icon: iconFor(point), keyboard: true, title: `${point.id} · ${point.name}`, riseOnHover: true, draggable: false }).addTo(map);
    marker.on("click", () => select(point.id, { fly: true }));
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      saveMark(point.id, { lat: p.lat, lng: p.lng });
      message.text = `${point.name}: posição ajustada.`;
      refresh();
    });
    markers.set(point.id, marker);
  }

  function refreshMarkers() {
    for (const point of points) {
      if (!hasCoords(point)) { markers.get(point.id)?.remove(); markers.delete(point.id); continue; }
      const marker = markers.get(point.id);
      if (!marker) addMarker(point);
      else { marker.setLatLng([point.lat, point.lng]); marker.setIcon(iconFor(point)); marker.dragging?.[markingId === point.id ? "enable" : "disable"](); }
    }
  }

  function drawRoute() {
    routeLine?.remove(); routeLine = null;
    if (routeId === "all") return;
    const route = ROUTES.find((r) => r.id === routeId);
    const coords = (route?.pointIds || []).map((id) => POINTS.find((p) => p.id === id)).filter((p) => p && hasCoords(p)).map((p) => [p.lat, p.lng]);
    if (coords.length > 1) routeLine = L.polyline(coords, { className: "map-route", weight: 4, opacity: .9, lineJoin: "round" }).addTo(map);
  }

  function frame() {
    const ids = activeIds();
    const pts = points.filter((p) => hasCoords(p) && (!ids || ids.has(p.id)));
    if (pts.length > 1) map.fitBounds(pts.map((p) => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 16, animate: !reduceMotion() });
    else if (pts.length === 1) map.setView([pts[0].lat, pts[0].lng], 16, { animate: !reduceMotion() });
  }

  function select(id, { fly = false } = {}) {
    selectedId = id;
    const point = POINTS.find((p) => p.id === id);
    if (fly && point && hasCoords(point)) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 16), { duration: reduceMotion() ? 0 : 0.9 });
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
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; userDot?.remove(); userRing?.remove(); userDot = userRing = null; user = null; arrivedId = null; refresh(); return; }
    if (!navigator.geolocation) { message.text = "Este aparelho não oferece localização."; refresh(); return; }
    message.text = "Procurando sua posição…"; refresh();
    watchId = navigator.geolocation.watchPosition((pos) => {
      user = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
      if (!userDot) {
        userRing = L.circle([user.lat, user.lng], { radius: user.accuracy, className: "map-user-ring", weight: 1 }).addTo(map);
        userDot = L.marker([user.lat, user.lng], { icon: L.divIcon({ className: "mk-wrap", iconSize: [22, 22], iconAnchor: [11, 11], html: '<span class="mk-user"><i></i></span>' }), interactive: false, zIndexOffset: 900 }).addTo(map);
        map.flyTo([user.lat, user.lng], Math.max(map.getZoom(), 16), { duration: reduceMotion() ? 0 : 1 });
      } else { userDot.setLatLng([user.lat, user.lng]); userRing.setLatLng([user.lat, user.lng]).setRadius(user.accuracy); }
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
    if (!point) return `<p class="map-hint">Toque num marcador para ver o ponto, a distância até ele e o caminho. Os números seguem a ordem do catálogo.</p>`;
    const status = statusOf(state, point);
    const name = status === "mystery" ? "Ponto misterioso" : point.name;
    const dist = user && hasCoords(point) ? distanceMeters(user, point) : null;
    const arrived = dist != null && dist <= ARRIVAL_M;
    const marking = markingId === point.id;
    const mapped = hasCoords(point);
    return `<div class="map-sheet ${arrived ? "is-arrived" : ""}">
      <div class="map-sheet-top"><span class="map-sheet-num">${ordinal(point)}</span><div><strong>${esc(name)}</strong><small>${point.id} · ${STATUS_TEXT[status]}</small></div>${dist != null ? `<span class="map-dist">${arrived ? "Você chegou" : `a ${formatDistance(dist)}`}</span>` : ""}</div>
      <p class="map-sheet-src">${esc(sourceText(point))}</p>
      <div class="map-sheet-actions">
        <button type="button" class="map-btn primary" data-map="open" data-id="${point.id}">${arrived ? "Abrir e carimbar" : "Abrir ficha"}</button>
        ${mapped ? `<a class="map-btn" href="${esc(directionsUrl(point))}" target="_blank" rel="noopener noreferrer">Como chegar</a>` : ""}
        <button type="button" class="map-btn ${marking ? "on" : ""}" data-map="mark" data-id="${point.id}">${marking ? "Toque no mapa…" : mapped ? "Ajustar posição" : "Marcar no mapa"}</button>
        ${user ? `<button type="button" class="map-btn" data-map="here" data-id="${point.id}">Usar minha posição</button>` : ""}
        ${point.fieldMark ? `<button type="button" class="map-btn" data-map="clear" data-id="${point.id}">Remover marcação</button>` : ""}
      </div>
      ${marking ? `<p class="map-sheet-src">${mapped ? "Arraste o marcador até o local exato da tag ou toque no mapa." : "Toque no mapa onde a tag está fixada."}</p>` : ""}
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
      ${pending.length ? `<details class="map-pending" ${pendingOpen ? "open" : ""}><summary>${pending.length} sem localização</summary><ul>${pending.map((p) => `<li><span>${esc(p.name)}</span><button type="button" class="map-btn" data-map="mark" data-id="${p.id}">Marcar no mapa</button></li>`).join("")}</ul></details>` : ""}
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

  map.on("click", (event) => {
    if (!markingId) return;
    const point = POINTS.find((p) => p.id === markingId);
    saveMark(markingId, { lat: event.latlng.lat, lng: event.latlng.lng });
    message.text = `${point?.name || "Ponto"} marcado. Arraste o marcador para ajustar ou toque em “Ajustar posição” para terminar.`;
    refresh();
  });
  map.on("dragstart", () => { if (tourTimer) stopTour(); });

  refresh();
  frame();
  window.setTimeout(() => map.invalidateSize(), 0);

  const originalRemove = map.remove.bind(map);
  map.remove = () => {
    if (tourTimer) clearTimeout(tourTimer);
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    ui?.removeEventListener("click", onUiClick);
    ui?.removeEventListener("toggle", onToggle, true);
    hudEl?.removeEventListener("click", onHudClick);
    return originalRemove();
  };
  return map;
}
