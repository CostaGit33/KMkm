// Fachada das telas. O código vive em ./views/*; este arquivo mantém a API que o resto do app importa.
import { renderHome } from "./views/home.js";
import { renderMap } from "./views/map.js";
import { renderRoutes, renderRouteDetail } from "./views/routes.js";
import { renderPoint } from "./views/ponto.js";
import { renderCollection, renderCertificates } from "./views/colecao.js";
import { renderEunapolis } from "./views/destino.js";

export { escapeHtml, progressFor, routeProgress, certificateRoutes, pointStatus, setEventos, setColecao } from "./views/base.js";
export { renderChrome } from "./views/chrome.js";
export { getFilteredPoints } from "./views/map.js";
export { renderProfile } from "./views/perfil.js";

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
