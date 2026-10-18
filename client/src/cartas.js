// Coleção de cartas de Eunápolis: uma carta numerada por ponto, com personagem, categoria, raridade e evolução por tempo.
// Tudo aqui é leitura: a carta é desbloqueada pelo primeiro carimbo de rota e não gera XP nem pode ser trocada.
const RARIDADE = { comum: ['Comum', 1], raro: ['Rara', 2], epico: ['Épica', 3], lendario: ['Lendária', 4] };
const rotuloRaridade = (r) => (RARIDADE[r] || RARIDADE.comum)[0];
const estrelas = (r) => '★'.repeat((RARIDADE[r] || RARIDADE.comum)[1]);
// Emblemas dourados por categoria (arte provisória até a ilustração final do ponto ser enviada).
const EMBLEMAS = {
  natureza: '<path d="M50 18c-18 10-26 30-18 48 4 8 10 12 18 16 8-4 14-8 18-16 8-18 0-38-18-48z"/><path d="M50 30v52" fill="none"/>',
  historia: '<path d="M22 40 50 22l28 18z"/><path d="M28 46v26M42 46v26M58 46v26M72 46v26M22 78h56" fill="none"/>',
  cultura: '<path d="M40 62V28l30-6v34" fill="none"/><ellipse cx="34" cy="64" rx="9" ry="7"/><ellipse cx="64" cy="58" rx="9" ry="7"/>',
  trabalho: '<path d="M50 84V44" fill="none"/><path d="M50 52C34 52 26 42 26 28c14 0 24 8 24 24zM50 44c0-14 10-22 24-22 0 14-8 22-24 22z"/>',
  litoral: '<path d="M16 46c8-8 16-8 22 0s14 8 22 0 14-8 24 0M16 62c8-8 16-8 22 0s14 8 22 0 14-8 24 0M16 78c8-8 16-8 22 0s14 8 22 0 14-8 24 0" fill="none"/>',
  misterio: '<path d="M50 14l7 29 29 7-29 7-7 29-7-29-29-7 29-7z"/>',
};
function emblemaSvg(categoria, bloqueada, size) {
  const g = EMBLEMAS[categoria] || EMBLEMAS.cultura;
  return `<svg class="carta-emblema" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${esc(categoria)}"><g fill="#d9a84a" stroke="#d9a84a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity="${bloqueada ? '.28' : '.95'}" transform="translate(12 12) scale(.76)">${g}</g></svg>`;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const CATEGORIAS = [
  { id: 'natureza', nome: 'Natureza' },
  { id: 'historia', nome: 'História' },
  { id: 'cultura', nome: 'Cultura' },
  { id: 'trabalho', nome: 'Trabalho' },
  { id: 'litoral', nome: 'Litoral' },
  { id: 'misterio', nome: 'Mistério' },
];
export const rotuloCategoria = (id) => (CATEGORIAS.find((c) => c.id === id) || { nome: 'Cultura' }).nome;
export const NOMES_ESTAGIO = ['Descoberta', 'Reconhecimento', 'Vínculo', 'Legado'];
const DIAS_ESTAGIO = [0, 5, 30, 45];
const num = (n) => String(n || 0).padStart(3, '0');

// Arte: arquivo definido no admin (em /cartas/) ou, sem ele, o desenho gerado do nome.
function arteHtml(i, size) {
  if (!i.capturada) return emblemaSvg(i.categoria, true, size);
  if (i.arte && /^[\w.-]{1,80}$/.test(i.arte)) return `<img class="carta-img" src="/cartas/${esc(i.arte)}" alt="${esc(i.criatura)}" width="${size}" height="${size}" loading="lazy" />`;
  return emblemaSvg(i.categoria, false, size);
}

export function cartaHtml(i, { size = 96, tag = 'button' } = {}) {
  const aberta = i.capturada;
  const attrs = tag === 'button' ? `type="button" data-carta="${esc(i.codigo)}"` : '';
  return `<${tag} class="carta ${aberta ? 'aberta' : 'fechada'} r-${esc(i.raridade)} cat-${esc(i.categoria)}" ${attrs} aria-label="${aberta ? `Carta ${num(i.carta)}: ${esc(i.criatura)}, ${esc(i.ponto)}` : `Carta ${num(i.carta)} ainda bloqueada`}">`
    + `<span class="carta-num">${num(i.carta)}</span>`
    + `<span class="carta-arte">${arteHtml(i, size)}</span>`
    + `<strong class="carta-nome">${aberta ? esc(i.criatura) : 'Bloqueada'}</strong>`
    + `<small class="carta-local">${esc(i.ponto)}</small>`
    + `<span class="carta-selo">${esc(rotuloCategoria(i.categoria))}${aberta ? ` · ${estrelas(i.raridade)}` : ''}</span>`
    + `</${tag}>`;
}

function estagiosHtml(i) {
  return `<ol class="carta-estagios">${NOMES_ESTAGIO.map((nome, k) => {
    const estado = !i.capturada ? 'trava' : k < i.estagio ? 'feito' : k === i.estagio ? 'atual' : 'trava';
    return `<li class="${estado}"><b>${k + 1}</b><span>${nome}</span><small>${DIAS_ESTAGIO[k] === 0 ? 'Primeiro carimbo' : `${DIAS_ESTAGIO[k]} dias`}</small></li>`;
  }).join('')}</ol>`;
}

export function detalheHtml(i) {
  const prox = i.proximo_estagio;
  const dica = !i.capturada ? 'Encoste na tag deste ponto para desbloquear o personagem.'
    : prox ? (prox.em_dias > 0 ? `Volte a este ponto em ${prox.em_dias} dia(s) para chegar a ${prox.nome}.` : `Carimbe de novo neste ponto para chegar a ${prox.nome}.`)
    : 'Esta carta chegou ao estágio máximo: Legado.';
  return `<div class="carta-detalhe">${cartaHtml(i, { size: 140, tag: 'div' })}<div class="carta-info">`
    + `<dl><dt>Número</dt><dd>${num(i.carta)}</dd><dt>Personagem</dt><dd>${i.capturada ? esc(i.criatura) : '???'}</dd><dt>Local</dt><dd>${esc(i.ponto)}</dd>`
    + `<dt>Categoria</dt><dd>${esc(rotuloCategoria(i.categoria))}</dd><dt>Raridade</dt><dd>${estrelas(i.raridade)} ${esc(rotuloRaridade(i.raridade))}</dd></dl>`
    + (i.capturada && i.historia ? `<p class="carta-historia">${esc(i.historia)}</p>` : '')
    + (i.capturada && i.frase ? `<blockquote class="carta-frase">“${esc(i.frase)}”</blockquote>` : '')
    + `</div>${estagiosHtml(i)}<p class="carta-dica">${esc(dica)}</p></div>`;
}

let itensAtuais = [];
export function secaoColecao(colecao) {
  if (!colecao || !colecao.itens || !colecao.itens.length) return '';
  itensAtuais = colecao.itens;
  const { total, capturadas, por_categoria: pc = {} } = colecao;
  const pct = total ? Math.round((capturadas / total) * 100) : 0;
  const chips = [`<button type="button" class="carta-chip ativo" data-cat="todas">Todas <small>${capturadas}/${total}</small></button>`]
    .concat(CATEGORIAS.filter((c) => (pc[c.id]?.total || 0) > 0).map((c) => `<button type="button" class="carta-chip" data-cat="${c.id}">${c.nome} <small>${pc[c.id].capturadas}/${pc[c.id].total}</small></button>`)).join('');
  return `<section class="colecao-cartas" aria-labelledby="colecao-title"><div class="section-heading"><div><h2 id="colecao-title">${total} ${total === 1 ? 'ponto' : 'pontos'}. Uma só cidade.</h2><p>Cada ponto é uma carta com um personagem de Eunápolis. Encoste na tag para desbloquear.</p></div><strong class="route-count">${capturadas}/${total}</strong></div>`
    + `<div class="colecao-barra" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${capturadas}" aria-label="Cartas desbloqueadas"><span style="width:${pct}%"></span></div>`
    + `<div class="carta-chips" role="group" aria-label="Filtrar por categoria">${chips}</div>`
    + `<ul class="carta-grid">${itensAtuais.map((i) => `<li data-cat="${esc(i.categoria)}">${cartaHtml(i)}</li>`).join('')}</ul></section>`;
}

// Delegação única: filtro por categoria e abertura do detalhe, sem depender do render das views.
if (typeof document !== 'undefined' && !window.__cartasOuvinte) {
  window.__cartasOuvinte = true;
  document.addEventListener('click', (ev) => {
    const chip = ev.target.closest?.('.carta-chip');
    if (chip) {
      const secao = chip.closest('.colecao-cartas');
      secao.querySelectorAll('.carta-chip').forEach((c) => c.classList.toggle('ativo', c === chip));
      secao.querySelectorAll('.carta-grid > li').forEach((li) => { li.hidden = chip.dataset.cat !== 'todas' && li.dataset.cat !== chip.dataset.cat; });
      return;
    }
    const botao = ev.target.closest?.('[data-carta]');
    const item = botao && itensAtuais.find((i) => i.codigo === botao.dataset.carta);
    if (!item) return;
    let dlg = document.getElementById('carta-dialogo');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'carta-dialogo';
      dlg.className = 'carta-dialogo';
      dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-fechar]')) dlg.close(); });
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = `<button type="button" class="carta-fechar" data-fechar aria-label="Fechar">×</button>${detalheHtml(item)}`;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  });
}
