import { CITY, POINTS, getCategory, getPoint } from "../data.js";
import { galeriaHtml } from "../galeria.js";
import { escapeHtml, pointStatus, getVisibleName, formatDate, pageHead, stamp } from "./base.js";

export function renderPoint(state, pointId) {
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
    </article>
    ${status === "mystery" ? "" : galeriaHtml(point)}`;
}
