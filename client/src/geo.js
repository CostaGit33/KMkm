// Marcações de campo: a pessoa registra no próprio aparelho onde a tag está fixada.
// Nada aqui é enviado ao servidor; a lista sai por exportação (CSV) para validar e publicar o ponto.
import { POINTS } from "./data.js";

const KEY = "mais1km-eunapolis:marcas:v1";
export const ARRIVAL_M = 100; // distância para dizer "você chegou"
const original = new Map();

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function write(marks) {
  try { localStorage.setItem(KEY, JSON.stringify(marks)); } catch { /* sem armazenamento: a marcação vale só até recarregar */ }
}

// Aplica as marcações de campo sobre o catálogo. Chame ao iniciar e depois de salvar.
export function applyFieldMarks() {
  const marks = read();
  for (const point of POINTS) {
    if (!original.has(point.id)) original.set(point.id, { lat: point.lat, lng: point.lng, mapSource: point.mapSource, coordinateKind: point.coordinateKind });
    const base = original.get(point.id);
    const mark = marks[point.id];
    if (mark && Number.isFinite(mark.lat) && Number.isFinite(mark.lng)) {
      point.lat = mark.lat; point.lng = mark.lng; point.mapSource = "Marcação em campo"; point.coordinateKind = "field"; point.fieldMark = mark;
    } else {
      point.lat = base.lat; point.lng = base.lng; point.mapSource = base.mapSource; point.coordinateKind = base.coordinateKind;
      delete point.fieldMark;
    }
  }
}

export function saveMark(pointId, { lat, lng, accuracy = null }) {
  const marks = read();
  marks[pointId] = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), accuracy: accuracy == null ? null : Math.round(accuracy), at: new Date().toISOString() };
  write(marks);
  applyFieldMarks();
}

export function clearMark(pointId) {
  const marks = read();
  delete marks[pointId];
  write(marks);
  applyFieldMarks();
}

export const hasCoords = (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng);

export function distanceMeters(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters) {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

export function directionsUrl(point) {
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=walking`;
}

export function streetViewUrl(point) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${point.lat},${point.lng}`;
}

export function marksCsv() {
  const rows = [["codigo", "nome", "latitude", "longitude", "origem", "precisao_m", "marcado_em"]];
  for (const point of POINTS) {
    if (!hasCoords(point)) { rows.push([point.id, point.name, "", "", "sem coordenada", "", ""]); continue; }
    const mark = point.fieldMark;
    rows.push([point.id, point.name, point.lat, point.lng, mark ? "campo" : (point.mapSource || "catálogo"), mark?.accuracy ?? "", mark?.at ?? ""]);
  }
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}
