// Motores de mapa: Google Maps (quando há chave configurada no servidor) e Leaflet/OpenStreetMap (reserva).
// Os dois expõem a mesma interface, então a tela do mapa (real-map.js) não sabe qual está em uso.
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const cssVar = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const htmlToElement = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };

// ---------- Leaflet ----------
export function createLeafletEngine(element, { center, zoom }, { onTileError } = {}) {
  const map = L.map(element, { zoomControl: false, scrollWheelZoom: false, minZoom: 10, maxZoom: 18 }).setView(center, zoom);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("/api/map-tiles/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    maxZoom: 19,
  }).on("tileerror", () => onTileError?.()).addTo(map);
  const markers = new Map();
  let line = null; let dot = null; let ring = null;
  const icon = (html) => L.divIcon({ className: "mk-wrap", iconSize: [38, 38], iconAnchor: [19, 19], html });
  return {
    kind: "leaflet",
    credit: "OpenStreetMap",
    setView: (lat, lng, z) => map.setView([lat, lng], z, { animate: !reduceMotion() }),
    fitBounds: (coords, maxZoom) => map.fitBounds(coords, { padding: [40, 40], maxZoom, animate: !reduceMotion() }),
    flyTo: (lat, lng, minZoom) => map.flyTo([lat, lng], Math.max(map.getZoom(), minZoom), { duration: reduceMotion() ? 0 : 0.9 }),
    upsertMarker(id, { lat, lng, html, title, draggable }, { onClick, onDragEnd }) {
      let marker = markers.get(id);
      if (!marker) {
        marker = L.marker([lat, lng], { icon: icon(html), keyboard: true, title, riseOnHover: true, draggable: false }).addTo(map);
        marker.on("click", onClick);
        marker.on("dragend", () => { const p = marker.getLatLng(); onDragEnd(p.lat, p.lng); });
        markers.set(id, marker);
      } else { marker.setLatLng([lat, lng]); marker.setIcon(icon(html)); }
      marker.dragging?.[draggable ? "enable" : "disable"]();
    },
    removeMarker(id) { markers.get(id)?.remove(); markers.delete(id); },
    setRoute(coords) {
      line?.remove(); line = null;
      if (coords && coords.length > 1) line = L.polyline(coords, { className: "map-route", weight: 4, opacity: .9, lineJoin: "round" }).addTo(map);
    },
    setUser(pos) {
      if (!pos) { dot?.remove(); ring?.remove(); dot = ring = null; return; }
      if (!dot) {
        ring = L.circle([pos.lat, pos.lng], { radius: pos.accuracy, className: "map-user-ring", weight: 1 }).addTo(map);
        dot = L.marker([pos.lat, pos.lng], { icon: L.divIcon({ className: "mk-wrap", iconSize: [22, 22], iconAnchor: [11, 11], html: '<span class="mk-user"><i></i></span>' }), interactive: false, zIndexOffset: 900 }).addTo(map);
        map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 16), { duration: reduceMotion() ? 0 : 1 });
      } else { dot.setLatLng([pos.lat, pos.lng]); ring.setLatLng([pos.lat, pos.lng]).setRadius(pos.accuracy); }
    },
    onClick: (cb) => map.on("click", (e) => cb(e.latlng.lat, e.latlng.lng)),
    onDragStart: (cb) => map.on("dragstart", cb),
    resize: () => map.invalidateSize(),
    destroy: () => map.remove(),
  };
}

// ---------- Google Maps ----------
let googlePromise = null;
export function loadGoogleMaps(apiKey) {
  if (googlePromise) return googlePromise;
  googlePromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) { resolve(); return; }
    window.__mais1kmGoogleReady = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&language=pt-BR&region=BR&loading=async&callback=__mais1kmGoogleReady`;
    script.async = true;
    script.onerror = () => { googlePromise = null; reject(new Error("google_maps_indisponivel")); };
    document.head.appendChild(script);
  });
  return googlePromise;
}

export async function createGoogleEngine(element, { center, zoom }, { apiKey, mapId, theme, onAuthFailure }) {
  // Registrar antes de carregar o script: o Google pode reportar falha de autorização durante a carga.
  window.gm_authFailure = () => onAuthFailure?.();
  await loadGoogleMaps(apiKey);
  const { Map, Polyline, Circle } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const map = new Map(element, {
    center: { lat: center[0], lng: center[1] }, zoom, mapId: mapId || "DEMO_MAP_ID",
    colorScheme: theme === "light" ? "LIGHT" : "DARK",
    minZoom: 10, maxZoom: 20, clickableIcons: false, gestureHandling: "greedy",
    zoomControl: true, mapTypeControl: true, streetViewControl: true, fullscreenControl: false, rotateControl: false,
    mapTypeControlOptions: { style: google.maps.MapTypeControlStyle.DROPDOWN_MENU, position: google.maps.ControlPosition.LEFT_CENTER },
    zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
    streetViewControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
  });
  const markers = new globalThis.Map();
  let line = null; let dot = null; let ring = null;
  const content = (html) => { const el = htmlToElement(html); el.style.transform = "translateY(50%)"; return el; };
  return {
    kind: "google",
    credit: "Google Maps",
    setView(lat, lng, z) { map.setCenter({ lat, lng }); map.setZoom(z); },
    fitBounds(coords, maxZoom) {
      const b = new google.maps.LatLngBounds();
      coords.forEach(([lat, lng]) => b.extend({ lat, lng }));
      map.fitBounds(b, 48);
      google.maps.event.addListenerOnce(map, "idle", () => { if (map.getZoom() > maxZoom) map.setZoom(maxZoom); });
    },
    flyTo(lat, lng, minZoom) { map.panTo({ lat, lng }); if ((map.getZoom() || 0) < minZoom) map.setZoom(minZoom); },
    upsertMarker(id, { lat, lng, html, title, draggable }, { onClick, onDragEnd }) {
      let marker = markers.get(id);
      if (!marker) {
        marker = new AdvancedMarkerElement({ map, position: { lat, lng }, content: content(html), title, gmpClickable: true, gmpDraggable: false });
        marker.addListener("click", onClick);
        marker.addListener("dragend", () => { const p = marker.position; onDragEnd(typeof p.lat === "function" ? p.lat() : p.lat, typeof p.lng === "function" ? p.lng() : p.lng); });
        markers.set(id, marker);
      } else { marker.position = { lat, lng }; marker.content = content(html); marker.title = title; }
      marker.gmpDraggable = !!draggable;
    },
    removeMarker(id) { const m = markers.get(id); if (m) m.map = null; markers.delete(id); },
    setRoute(coords) {
      line?.setMap(null); line = null;
      if (coords && coords.length > 1) {
        line = new Polyline({ map, path: coords.map(([lat, lng]) => ({ lat, lng })), strokeOpacity: 0, geodesic: false,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: cssVar("--red", "#d9a84a"), strokeWeight: 4, scale: 3 }, offset: "0", repeat: "16px" }] });
      }
    },
    setUser(pos) {
      if (!pos) { ring?.setMap(null); if (dot) dot.map = null; dot = ring = null; return; }
      const p = { lat: pos.lat, lng: pos.lng };
      if (!dot) {
        ring = new Circle({ map, center: p, radius: pos.accuracy, strokeColor: "#2b7fff", strokeOpacity: .8, strokeWeight: 1, fillColor: "#2b7fff", fillOpacity: .12, clickable: false });
        dot = new AdvancedMarkerElement({ map, position: p, content: content('<span class="mk-user"><i></i></span>'), zIndex: 900, gmpClickable: false });
        map.panTo(p); if ((map.getZoom() || 0) < 16) map.setZoom(16);
      } else { dot.position = p; ring.setCenter(p); ring.setRadius(pos.accuracy); }
    },
    onClick: (cb) => map.addListener("click", (e) => cb(e.latLng.lat(), e.latLng.lng())),
    onDragStart: (cb) => map.addListener("dragstart", cb),
    resize: () => google.maps.event.trigger(map, "resize"),
    destroy() { markers.forEach((m) => { m.map = null; }); element.innerHTML = ""; },
  };
}

export async function carregarConfigMapa() {
  try {
    const res = await fetch("/api/config-mapa", { headers: { Accept: "application/json" } });
    if (!res.ok) return {};
    return await res.json();
  } catch { return {}; }
}
