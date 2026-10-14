// Catálogo vindo do servidor: o que a administração publica (pontos, coordenadas, circuitos) substitui o catálogo
// fixo de data.js antes do app abrir. Sem rede, usa a última cópia guardada no aparelho; sem nenhuma, o catálogo fixo.
import { POINTS, ROUTES, COLLECTIONS, CITY, CATEGORIES } from "./data.js";

const CHAVE = "mais1km:catalogo:v1";
const IDS_ORIGINAIS = new Set(POINTS.map((p) => p.id));
const CATEGORIAS_CONHECIDAS = new Set(CATEGORIES.map((c) => c.id));
const CORES = new Set(["green", "ochre", "blue", "red"]);

const lerCache = () => { try { return JSON.parse(localStorage.getItem(CHAVE)); } catch { return null; } };
const gravarCache = (catalogo) => { try { localStorage.setItem(CHAVE, JSON.stringify(catalogo)); } catch { /* armazenamento indisponível */ } };

export async function carregarCatalogo({ tempoMs = 2500 } = {}) {
  let catalogo = null;
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), tempoMs);
  try {
    const r = await fetch("/api/catalogo", { signal: controle.signal, cache: "no-store" });
    if (r.ok) { catalogo = await r.json(); gravarCache(catalogo); }
  } catch { /* offline ou lento: segue com a cópia local */ }
  clearTimeout(limite);
  catalogo = catalogo || lerCache();
  if (catalogo && Array.isArray(catalogo.pontos) && catalogo.pontos.length) aplicar(catalogo);
}

function aplicar(catalogo) {
  const novos = catalogo.pontos.map((p) => {
    const categorias = (p.categorias || []).filter((c) => CATEGORIAS_CONHECIDAS.has(c));
    const ponto = {
      id: String(p.codigo).toUpperCase(),
      name: p.nome,
      categoryIds: categorias.length ? categorias : ["cultura"],
      icon: p.icone || "✳",
      x: 50, y: 50,
      note: p.nota || "",
      hidden: Boolean(p.oculto),
    };
    if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) { ponto.lat = p.lat; ponto.lng = p.lng; }
    if (p.fonte_mapa) ponto.mapSource = p.fonte_mapa;
    if (p.endereco) ponto.address = p.endereco;
    return ponto;
  });
  POINTS.splice(0, POINTS.length, ...novos);
  const existe = new Set(POINTS.map((p) => p.id));

  const circuitos = (catalogo.circuitos || [])
    .map((c) => ({ id: c.slug, name: c.nome, subtitle: c.subtitulo || "", icon: c.icone || "✳", color: CORES.has(c.cor) ? c.cor : "ochre", pointIds: (c.codigos || []).map((x) => String(x).toUpperCase()).filter((id) => existe.has(id)) }))
    .filter((c) => c.pointIds.length);
  // A tela de certificado usa ROUTES[0]: nunca deixar a lista vazia.
  ROUTES.splice(0, ROUTES.length, ...(circuitos.length ? circuitos : [{ id: "eu-todos", name: "Minha Eunápolis", subtitle: "Todos os caminhos", icon: "✦", color: "ochre", pointIds: POINTS.filter((p) => !p.hidden).map((p) => p.id) }]));

  for (const colecao of COLLECTIONS) {
    if (colecao.id === "eu-cidade") { colecao.pointIds = POINTS.map((p) => p.id); continue; }
    const categorias = colecao.id === "eu-patrimonio" ? ["historia", "cultura"] : ["natureza", "caminhos"];
    const mantidos = colecao.pointIds.filter((id) => existe.has(id));
    // Pontos criados na administração entram na coleção pela categoria; os do catálogo original seguem a lista curada.
    const criados = POINTS.filter((p) => !IDS_ORIGINAIS.has(p.id) && p.categoryIds.some((c) => categorias.includes(c))).map((p) => p.id);
    colecao.pointIds = [...new Set([...mantidos, ...criados])];
  }
  CITY.totalPoints = POINTS.length;
}
