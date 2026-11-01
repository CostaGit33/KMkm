import { CITY, CATEGORIES, POINTS, getPoint } from "../data.js";
import { cartaHtml } from "../cartas.js";
import { miniaturaHtml } from "../galeria.js";
import { escapeHtml, progressFor, pointStatus, getVisibleName, progressBar, pageHead, cartoes, colecaoServidor } from "./base.js";

function categoryCard(state, category) {
  const categoryPoints = POINTS.filter((point) => point.categoryIds.includes(category.id));
  const progress = progressFor(state, categoryPoints.map((point) => point.id));
  return `<article class="category-card"><div class="category-heading"><span class="category-symbol ${category.color}" aria-hidden="true">${category.icon}</span><span class="category-name">${escapeHtml(category.name)}</span><strong class="category-count">${progress.count}/${progress.total}</strong></div>${progressBar(progress, category.color, `Progresso em ${category.name}`)}</article>`;
}

const ESTADO_CARD = { ao_vivo: ["Ao vivo", "conquered"], em_breve: ["Em breve", "mystery"], encerrado: ["Coleção encerrada", "discovered"] };
function janelaDoCard(card) {
  const f = (v) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Bahia" }).format(new Date(v));
  return `${f(card.inicio_em)} a ${f(new Date(new Date(card.fim_em).getTime() - 1000))}`;
}
function renderCartoes(state) {
  // Cards são da conta no servidor: não aparecem para quem saiu (aparelho compartilhado).
  if (!cartoes.length || !(state.account && state.session)) return "";
  const itens = cartoes.map((card) => {
    const [rotulo, classe] = ESTADO_CARD[card.estado] || ESTADO_CARD.encerrado;
    const progress = { count: card.feitos, total: card.total, percent: card.total ? Math.round((card.feitos / card.total) * 100) : 0 };
    const origem = card.patrocinado_por ? `Patrocinado por ${escapeHtml(card.patrocinado_por)}` : (card.tipo === "evento" ? "Evento" : "Campanha");
    const pontos = card.pontos.map((p) => `<li class="evento-ponto ${p.carimbo ? "feito" : ""}"><span aria-hidden="true">${p.carimbo ? "✓" : "○"}</span>${escapeHtml(p.tag_nome)}<span class="sr-only">${p.carimbo ? " carimbado" : " pendente"}</span></li>`).join("");
    const edicao = card.edicao ? `<p class="evento-edicao"><strong>${card.edicao.numero ? `Seu carimbo nº ${card.edicao.numero}/${card.edicao.tiragem}` : card.edicao.emitidos >= card.edicao.tiragem ? "Edição esgotada" : `Edição numerada · ${card.edicao.tiragem - card.edicao.emitidos} de ${card.edicao.tiragem} disponíveis`}</strong></p>` : "";
    const nota = card.estado === "encerrado" ? "A coleção terminou. Os carimbos que você fez ficam guardados." : card.estado === "em_breve" ? "Os pontos continuam valendo para a rota normal. O carimbo do card começa na data." : "Encoste nos pontos dentro do período: o mesmo toque vale para a rota e para este card.";
    return `<article class="route-card evento-card ${card.estado}"><div class="route-card-top"><div class="route-info"><p class="evento-origem">${origem}</p><h3 class="route-name">${escapeHtml(card.nome)}</h3><p class="route-subtitle">${janelaDoCard(card)}</p></div><span class="status-pill ${classe}">${rotulo}</span></div>${card.descricao ? `<p class="evento-desc">${escapeHtml(card.descricao)}</p>` : ""}${edicao}${progressBar(progress, "red", `Carimbos do card ${card.nome}`)}<div class="route-card-foot"><span>${card.feitos}/${card.total} pontos do card</span></div><ul class="evento-pontos">${pontos}</ul><p class="evento-nota">${nota}</p></article>`;
  }).join("");
  return `<section aria-labelledby="eventos-title"><div class="section-heading"><div><h2 id="eventos-title">Eventos e patrocínios</h2><p>Cards com data. Não mudam sua rota nem seus certificados.</p></div></div><div class="evento-lista">${itens}</div></section>`;
}

// Cartas conquistadas em miniatura e mapa reduzido. A carta é a única coleção do usuário.
function homeCards(state) {
  const cards = Array.isArray(colecaoServidor?.itens)
    ? colecaoServidor.itens.filter((item) => item.capturada).sort((a, b) => {
      const dateA = Date.parse(a.capturada_em || a.primeira_captura || "") || 0;
      const dateB = Date.parse(b.capturada_em || b.primeira_captura || "") || 0;
      return dateB - dateA;
    })
    : POINTS.filter((point) => state.conquered.includes(point.id)).map((point) => ({ codigo: point.id, ponto: point.name, carta: POINTS.indexOf(point) + 1, categoria: "cultura", raridade: "comum", capturada: true, criatura: point.name }));
  if (!cards.length) return `<div class="home-empty-state"><p class="home-empty">Sua coleção está começando. Visite um ponto publicado e encoste na tag NFC para desbloquear sua primeira carta.</p><button class="outline-button" type="button" data-action="switch-view" data-view="map">Encontrar um ponto →</button></div>`;
  const recentes = cards.slice(0, 3);
  return `<div class="home-stamps home-cards" role="list" aria-label="Últimas três cartas conquistadas">${recentes.map((item) => { const point = getPoint(item.codigo); return `<button class="home-stamp home-card" role="listitem" type="button" data-action="open-point" data-id="${point?.id || item.codigo}" aria-label="Abrir carta de ${escapeHtml(item.ponto)}" title="${escapeHtml(item.ponto)}">${cartaHtml(item, { size: 96, tag: "div" })}</button>`; }).join("")}</div><div class="home-collection-link"><span>Mostrando ${recentes.length} de ${cards.length} cartas conquistadas</span><button class="route-card-button" type="button" data-action="switch-view" data-view="collection">Ver coleção completa →</button></div>`;
}

function collectionSpotlight(state, city) {
  if (!(state.account && state.session)) return "";
  const restante = Math.max(0, city.total - city.count);
  return `<section class="collection-spotlight" aria-labelledby="collection-spotlight-title"><div><p class="eyebrow">Coleção em andamento</p><h2 id="collection-spotlight-title">${city.count === 0 ? "Sua primeira carta começa na rua" : restante ? `Faltam ${restante} cartas para completar a cidade` : "Coleção de Eunápolis completa"}</h2><p>${city.count === 0 ? "Aproxime-se de uma tag publicada para desbloquear uma carta única." : "Cada visita confirmada revela uma carta; não há uma segunda coleção de carimbos."}</p></div><button class="spotlight-action" type="button" data-action="switch-view" data-view="collection">Ver coleção <span aria-hidden="true">→</span></button></section>`;
}

function miniMap(state) {
  const placed = POINTS.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  if (!placed.length) return "";
  const lats = placed.map((point) => point.lat);
  const lngs = placed.map((point) => point.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const cosLat = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  // Quadro 16:9 com margem; a longitude é corrigida pela latitude para a cidade não ficar esticada.
  const W = 320, H = 180, pad = 26;
  const spanX = Math.max((maxLng - minLng) * cosLat, 0.0004);
  const spanY = Math.max(maxLat - minLat, 0.0004);
  const scale = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
  const offX = (W - spanX * scale) / 2, offY = (H - spanY * scale) / 2;
  const dots = placed.map((point) => {
    const left = ((offX + (point.lng - minLng) * cosLat * scale) / W) * 100;
    const top = ((offY + (maxLat - point.lat) * scale) / H) * 100;
    const status = pointStatus(state, point);
    const name = getVisibleName(state, point);
    return `<button class="mini-dot ${status}" type="button" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%" data-action="open-point" data-id="${point.id}" aria-label="${escapeHtml(name)} · ${status === "conquered" ? "conquistado" : status === "mystery" ? "mistério" : "disponível"}" title="${escapeHtml(name)}">${status === "conquered" ? "✓" : status === "mystery" ? "?" : ""}</button>`;
  }).join("");
  const semCoordenada = POINTS.length - placed.length;
  return `<div class="mini-map-wrap"><div class="mini-map" role="group" aria-label="Mapa reduzido de ${escapeHtml(CITY.name)}">${dots}</div>
    <div class="mini-map-foot"><span class="mini-legend"><i class="mini-dot-key conquered"></i>conquistado <i class="mini-dot-key available"></i>disponível <i class="mini-dot-key mystery"></i>mistério</span><button class="route-card-button" type="button" data-action="switch-view" data-view="map">⌖ Mapa completo</button></div>
    ${semCoordenada ? `<p class="small muted mini-map-note">${semCoordenada} ${semCoordenada === 1 ? "ponto ainda sem coordenada" : "pontos ainda sem coordenada"}; ${semCoordenada === 1 ? "aparece" : "aparecem"} só na lista.</p>` : ""}</div>`;
}

// Próximo passo (Pareto, Zeigarnik, Fitts): a ação principal da caderneta fica logo no topo, em botão grande.
function nextStepCard(state, city) {
  const next = POINTS.find((p) => pointStatus(state, p) !== "conquered" && pointStatus(state, p) !== "mystery");
  if (!next) return city.total && city.count >= city.total ? `<article class="card next-step is-done" role="status"><strong>Caderneta completa!</strong><span>Você carimbou todos os pontos disponíveis.</span></article>` : "";
  const falta = city.total - city.count;
  return `<article class="card next-step" aria-label="Próximo passo">${miniaturaHtml(next, { tamanho: 56 })}<div class="next-step-copy"><span class="eyebrow">Próximo ponto · faltam ${falta}</span><strong>${escapeHtml(next.name)}</strong></div><button class="primary-button" type="button" data-action="switch-view" data-view="map">Ver no mapa</button></article>`;
}

export function renderHome(state) {
  const city = progressFor(state);
  const next = POINTS.find((point) => pointStatus(state, point) === "available");
  const categoryTotals = CATEGORIES.map((category) => categoryCard(state, category)).join("");
  const complete = city.total > 0 && city.count >= city.total;
  return `${pageHead("Sua jornada", CITY.name, "Descubra a cidade, visite pontos e colecione histórias.")}
    <section class="home-welcome" aria-labelledby="home-welcome-title">
      <div class="home-welcome-copy">
        <p class="home-welcome-kicker">+1 KM · ${escapeHtml(CITY.name)}</p>
        <h2 id="home-welcome-title">${complete ? "Você descobriu cada caminho." : city.count === 0 ? "Sua próxima descoberta começa aqui." : `Continue descobrindo ${escapeHtml(CITY.name)}.`}</h2>
        <p>${complete ? "Sua coleção desta edição está completa. Continue explorando os circuitos." : "Encontre um ponto participante, aproxime o celular da tag NFC e conquiste cartas da cidade."}</p>
      </div>
      <div class="home-welcome-mark" aria-hidden="true"><span>+1</span><small>KM</small></div>
      <button class="home-discover-button" type="button" data-action="switch-view" data-view="map"><span class="home-discover-icon" aria-hidden="true">⌖</span><span>${complete ? "Explorar o mapa" : "Encontrar um ponto"}</span><span aria-hidden="true">→</span></button>
    </section>
    <section class="home-progress-panel" aria-labelledby="home-progress-title">
      <div class="home-progress-heading"><div><p class="eyebrow">Sua coleção</p><h2 id="home-progress-title">${city.count} de ${city.total} cartas</h2></div><span class="home-progress-medal" aria-hidden="true">✦</span></div>
      ${progressBar(city, "green", `Progresso da coleção: ${city.count} de ${city.total} cartas`)}
      <div class="home-progress-foot"><span>${city.percent}% concluído</span><button type="button" data-action="switch-view" data-view="collection">Ver coleção →</button></div>
    </section>
    ${next ? `<section class="home-next-point" aria-labelledby="home-next-title"><div class="home-section-title"><div><p class="eyebrow">Continue sua jornada</p><h2 id="home-next-title">Próximo ponto para descobrir</h2></div><button type="button" data-action="switch-view" data-view="map">Ver todos</button></div><button class="home-next-card" type="button" data-action="open-point" data-id="${escapeHtml(next.id)}">${miniaturaHtml(next, { tamanho: 50, classe: "ponto-foto home-next-foto" }) || `<span class="home-next-symbol" aria-hidden="true">${escapeHtml(next.icon || "⌖")}</span>`}<span class="home-next-copy"><strong>${escapeHtml(next.name)}</strong><small>${escapeHtml(next.note || "Ponto participante da cidade")}</small><span class="home-published-note">Consulte o mapa para confirmar disponibilidade</span></span><span class="home-next-arrow" aria-hidden="true">›</span></button></section>` : `<article class="home-complete-note"><strong>Parabéns pela jornada!</strong><span>Explore outros circuitos e continue conhecendo a cidade.</span></article>`}
    <section class="home-shortcuts" aria-label="Explorar o aplicativo">
      <button class="home-shortcut" type="button" data-action="switch-view" data-view="map"><span aria-hidden="true">⌖</span><strong>Mapa</strong><small>Explore a cidade</small></button>
      <button class="home-shortcut" type="button" data-action="switch-view" data-view="routes"><span aria-hidden="true">⌁</span><strong>Rotas</strong><small>Siga circuitos</small></button>
      <button class="home-shortcut" type="button" data-action="switch-view" data-view="collection"><span aria-hidden="true">✳</span><strong>Coleção</strong><small>Veja suas cartas</small></button>
      <button class="home-shortcut" type="button" data-action="switch-view" data-view="podium"><span aria-hidden="true">✦</span><strong>Pódio</strong><small>Acompanhe o ranking</small></button>
    </section>
    <button class="home-nfc-guide" type="button" data-action="switch-view" data-view="map"><span class="home-nfc-icon" aria-hidden="true">)))</span><span><strong>${city.count === 0 ? "Quer sua primeira carta?" : "Pronto para o próximo carimbo?"}</strong><small>Visite um ponto publicado e aproxime o celular da tag NFC. O carimbo só é confirmado após a validação.</small></span><span aria-hidden="true">→</span></button>
    ${collectionSpotlight(state, city)}
    <section class="home-details-section"><div class="section-heading"><div><h2>Descubra mais da cidade</h2><p>Explore pontos por tema e acompanhe seu progresso.</p></div></div>
      <article class="card home-city-card"><h3 class="home-sub">Cartas conquistadas <span>${city.count}</span></h3>${homeCards(state)}<h3 class="home-sub">Mapa rápido</h3>${miniMap(state)}</article>
      <div class="category-grid">${categoryTotals}</div>
      <article class="card home-progress-card"><div class="progress-meta"><span>Progresso de ${escapeHtml(CITY.name)}</span><strong>${city.percent}%</strong></div>${progressBar(city, "green", `Pontos conquistados em ${CITY.name}`)}<p class="progress-guidance" role="status">${city.percent === 100 ? `Você conquistou todos os ${city.total} pontos desta edição.` : city.count === 0 ? `Sua primeira conquista começa em um ponto publicado. ${city.total} pontos disponíveis nesta edição.` : `Você já conquistou ${city.count} de ${city.total} pontos. Faltam ${city.total - city.count} para completar a cidade.`}</p><button class="route-card-button" type="button" data-action="switch-view" data-view="map">Continuar explorando →</button></article>
    </section>
    ${renderCartoes(state)}`;
}
