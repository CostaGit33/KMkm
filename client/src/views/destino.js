import { EUNAPOLIS_DESTINATION } from "../data.js";
import { escapeHtml, pageHead } from "./base.js";

export function renderEunapolis() {
  const guide = EUNAPOLIS_DESTINATION;
  const facts = guide.facts.map((fact) => `<div class="destination-fact"><span>${escapeHtml(fact.label)}</span><strong>${escapeHtml(fact.value)}</strong><small>${escapeHtml(fact.detail)}</small></div>`).join("");
  const source = guide.sources[0];
  return `${pageHead("Destino · Eunápolis, Bahia", guide.name, "Um pouco da história e dos números da cidade.")}
    <div class="destination-return-row no-print"><button class="text-link" type="button" data-action="switch-view" data-view="routes">← Voltar às rotas</button></div>
    <article class="card destination-hero">
      <div class="destination-hero-top"><span class="destination-stamp" aria-hidden="true">EU</span><div class="destination-hero-copy"><span class="eyebrow">${escapeHtml(guide.region)}</span><h2>Uma cidade que nasceu do caminho</h2><p>${escapeHtml(guide.summary)}</p></div></div>
      <div class="destination-facts">${facts}</div>
      <p class="destination-credit">População informada como resultado do Censo 2022; os demais dados vêm da página municipal de Eunápolis.</p>
    </article>
    ${source ? `<section class="destination-sources" aria-label="Fonte dos dados"><p class="eyebrow">Fonte dos dados</p><div class="destination-source-list"><a class="destination-source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)} <span aria-hidden="true">↗</span></a></div></section>` : ""}`;
}
