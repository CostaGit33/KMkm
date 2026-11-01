import { CITY, CATEGORIES, POINTS } from "../data.js";
import { escapeHtml, pointStatus, getVisibleName } from "./base.js";

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

function mapCanvas(state, filters) {
  const points = getFilteredPoints(state, filters);
  const mapped = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  return `<div class="map-stage"><div class="real-map" id="real-map" role="application" aria-label="Mapa de ${escapeHtml(CITY.name)} com ${mapped.length} pontos localizados"></div><div class="map-hud" id="map-hud"></div><div class="map-ui" id="map-ui"></div></div>`;
}
// Controles de mapa reutilizam os filtros existentes do catálogo, sem duplicar estado.
export function renderMap(state, filters) {
  const filtered = getFilteredPoints(state, filters);
  const mapped = filtered.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)).length;
  const active = filters.categoryId !== "all" || filters.pointFilter !== "all" || !!filters.search.trim();
  const filterLabels = [
    ["all", "Todos"],
    ["available", "Disponíveis"],
    ["conquered", "Conquistados"],
    ["discovered", "Descobertos"],
    ["mystery", "Mistérios"],
  ];
  return `<h1 class="sr-only">Mapa de ${escapeHtml(CITY.name)}</h1>
    <section class="map-discovery-tools" aria-label="Encontrar pontos no mapa">
      <label class="map-search-label" for="map-point-search">Buscar ponto</label>
      <div class="map-search-row">
        <input id="map-point-search" class="search-input map-search-input" type="search" data-input="point-search" value="${escapeHtml(filters.search)}" placeholder="Nome ou código do ponto" autocomplete="off" aria-describedby="map-results-summary" />
        <label class="sr-only" for="map-category-select">Filtrar por categoria</label>
        <select id="map-category-select" class="filter-select map-category-select" data-select="category" aria-label="Filtrar por categoria">
          <option value="all" ${filters.categoryId === "all" ? "selected" : ""}>Todas as categorias</option>
          ${CATEGORIES.map((category) => `<option value="${escapeHtml(category.id)}" ${filters.categoryId === category.id ? "selected" : ""}>${escapeHtml(category.name)}</option>`).join("")}
        </select>
      </div>
      <div class="map-filter-chips" role="group" aria-label="Filtrar por situação">
        ${filterLabels.map(([value, label]) => `<button type="button" class="filter-chip" data-action="set-point-filter" data-filter="${value}" aria-pressed="${filters.pointFilter === value}">${label}</button>`).join("")}
      </div>
      <p id="map-results-summary" class="map-results-summary" role="status" aria-live="polite"><strong>${filtered.length}</strong> ${filtered.length === 1 ? "ponto encontrado" : "pontos encontrados"} · <strong>${mapped}</strong> com localização no mapa</p>
      ${active ? `<button class="map-clear-filters" type="button" data-action="clear-map-filters">Limpar filtros</button>` : ""}
    </section>
    ${mapCanvas(state, filters)}`;
}
