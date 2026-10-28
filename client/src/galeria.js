// Galeria de fotos de um ponto no app: faixa de miniaturas, ampliação e comparação "Antes / Hoje".
// As fotos vêm de /api/pontos/:codigo/imagens (só as aprovadas). Nada aqui altera as imagens: restauradas ganham selo.
const cache = new Map();

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ROTULO = { historica: "Foto histórica", atual: "Foto atual", restauracao: "Versão restaurada", outra: "" };
const SELO = { historica: "Histórica", atual: "Hoje", restauracao: "Restaurada", outra: "" };

const credito = (f) => [f.autor && `Foto: ${f.autor}`, f.fonte && `Fonte: ${f.fonte}`].filter(Boolean).join(" · ");
const alternativo = (f) => f.titulo || f.legenda || ROTULO[f.tipo_registro] || "Foto do ponto";

// Espaço reservado enquanto a lista carrega (com a capa, se o catálogo já a trouxe).
export function galeriaHtml(ponto) {
  if (!ponto?.fotos) return "";
  const capa = ponto.capa ? `<span class="galeria-item is-capa" aria-hidden="true"><img src="${esc(ponto.capa)}" alt="" width="160" height="160" /></span>` : "";
  return `<section class="galeria" data-galeria="${esc(String(ponto.id).toLowerCase())}" aria-label="Fotos deste ponto"><div class="section-heading"><div><h2>Fotos do lugar</h2><p>${ponto.fotos} ${ponto.fotos === 1 ? "foto" : "fotos"}</p></div></div><div class="galeria-faixa" data-galeria-faixa>${capa}<span class="galeria-carregando small muted">Carregando…</span></div></section>`;
}

async function carregar(codigo) {
  if (cache.has(codigo)) return cache.get(codigo);
  const r = await fetch(`/api/pontos/${encodeURIComponent(codigo)}/imagens`);
  if (!r.ok) throw new Error(`galeria_${r.status}`);
  const fotos = (await r.json()).imagens || [];
  cache.set(codigo, fotos);
  return fotos;
}

function comparacao(fotos) {
  const antes = fotos.find((f) => f.tipo_registro === "historica");
  const hoje = fotos.find((f) => f.tipo_registro === "atual");
  if (!antes || !hoje) return "";
  return `<div class="comparar" data-comparar style="--pos:50%">
    <div class="comparar-quadro"><img class="comparar-base" src="${esc(hoje.url)}" alt="${esc(alternativo(hoje))}" loading="lazy" />
      <img class="comparar-topo" src="${esc(antes.url)}" alt="${esc(alternativo(antes))}" loading="lazy" />
      <span class="comparar-rotulo is-antes">Antes${antes.periodo_historico ? ` · ${esc(antes.periodo_historico)}` : ""}</span><span class="comparar-rotulo is-hoje">Hoje</span><span class="comparar-linha" aria-hidden="true"></span></div>
    <label class="comparar-controle"><span class="small muted">Arraste para comparar</span><input type="range" min="0" max="100" value="50" aria-label="Comparar a foto antiga com a de hoje" data-comparar-range /></label>
    ${[antes, hoje].map(credito).filter(Boolean).length ? `<p class="small muted comparar-creditos">${[antes, hoje].map((f) => credito(f) && `${SELO[f.tipo_registro]}: ${esc(credito(f))}`).filter(Boolean).join(" &nbsp;|&nbsp; ")}</p>` : ""}
  </div>`;
}

// Preenche a seção depois que a tela foi desenhada. Devolve sem erro se a seção sumiu (usuário saiu da tela).
export async function montarGaleria(raiz = document) {
  const secao = raiz.querySelector("[data-galeria]");
  if (!secao) return;
  const codigo = secao.dataset.galeria;
  let fotos;
  try { fotos = await carregar(codigo); } catch {
    const faixa = secao.querySelector("[data-galeria-faixa]");
    if (faixa) faixa.innerHTML = `<span class="small muted">Não foi possível carregar as fotos agora.</span>`;
    return;
  }
  if (!secao.isConnected) return;
  if (!fotos.length) { secao.remove(); return; }
  secao.querySelector(".section-heading p").textContent = `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"}`;
  secao.querySelector("[data-galeria-faixa]").innerHTML = fotos.map((f, i) => `<button class="galeria-item" type="button" data-foto="${i}" aria-label="Ampliar: ${esc(alternativo(f))}">
      <img src="${esc(f.miniatura_url)}" alt="" loading="lazy" decoding="async" width="${Math.round(160 * f.largura / Math.max(f.largura, f.altura))}" height="${Math.round(160 * f.altura / Math.max(f.largura, f.altura))}" />
      ${SELO[f.tipo_registro] ? `<span class="galeria-selo is-${f.tipo_registro}">${SELO[f.tipo_registro]}</span>` : ""}</button>`).join("");
  const comp = comparacao(fotos);
  if (comp) secao.insertAdjacentHTML("beforeend", comp);

  secao.addEventListener("click", (e) => {
    const b = e.target.closest("[data-foto]");
    if (b) ampliar(fotos, Number(b.dataset.foto), b);
  });
  const quadro = secao.querySelector("[data-comparar]");
  if (quadro) quadro.querySelector("[data-comparar-range]").addEventListener("input", (e) => quadro.style.setProperty("--pos", `${e.target.value}%`));
}

function ampliar(fotos, inicio, origem) {
  let i = inicio;
  const d = document.createElement("dialog");
  d.className = "galeria-dialogo";
  d.setAttribute("aria-label", "Foto ampliada");
  d.innerHTML = `<figure class="galeria-figura"><div class="galeria-palco"><img data-grande alt="" /></div><figcaption data-legenda></figcaption></figure>
    <button class="galeria-fechar" type="button" data-fechar aria-label="Fechar">✕</button>
    <button class="galeria-nav is-ant" type="button" data-nav="-1" aria-label="Foto anterior">‹</button><button class="galeria-nav is-prox" type="button" data-nav="1" aria-label="Próxima foto">›</button>`;
  document.body.append(d);
  const img = d.querySelector("[data-grande]");
  const mostrar = () => {
    const f = fotos[i];
    img.alt = alternativo(f);
    img.src = f.url;
    const info = [ROTULO[f.tipo_registro], f.periodo_historico].filter(Boolean).map(esc).join(" · ");
    d.querySelector("[data-legenda]").innerHTML = `${f.titulo ? `<strong>${esc(f.titulo)}</strong>` : ""}${f.legenda ? `<span>${esc(f.legenda)}</span>` : ""}${info ? `<small>${info}</small>` : ""}${f.tipo_registro === "restauracao" ? `<small class="galeria-aviso">Versão restaurada digitalmente; a foto original está guardada no acervo.</small>` : ""}${credito(f) ? `<small>${esc(credito(f))}</small>` : ""}<small>${i + 1} de ${fotos.length}</small>`;
    d.querySelectorAll("[data-nav]").forEach((n) => { n.hidden = fotos.length < 2; });
  };
  const fechar = () => { if (d.open) d.close(); d.remove(); origem?.focus?.({ preventScroll: true }); };
  d.addEventListener("click", (e) => {
    if (e.target.closest("[data-fechar]") || e.target === d) return fechar();
    const n = e.target.closest("[data-nav]");
    if (n) { i = (i + Number(n.dataset.nav) + fotos.length) % fotos.length; mostrar(); }
  });
  d.addEventListener("cancel", (e) => { e.preventDefault(); fechar(); });
  d.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); i = (i + (e.key === "ArrowRight" ? 1 : -1) + fotos.length) % fotos.length; mostrar(); }
  });
  mostrar();
  d.showModal();
  d.querySelector("[data-fechar]").focus({ preventScroll: true });
}
