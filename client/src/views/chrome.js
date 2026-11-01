import { CITY, EUNAPOLIS_DESTINATION } from "../data.js";
import { escapeHtml, certificateRoutes } from "./base.js";

const NAV_ITEMS = [
  { id: "home", label: "Início", icon: "⌂" },
  { id: "map", label: "Mapa", icon: "⌖" },
  { id: "routes", label: "Rotas", icon: "⌁" },
  { id: "collection", label: "Coleção", icon: "✳" },
  { id: "podium", label: "Pódio", icon: "✦" },
];

function navLinks(activeView, menuOpen = false) {
  const itens = NAV_ITEMS.map((item) => `
    <button class="nav-link" type="button" data-action="switch-view" data-view="${item.id}" aria-current="${activeView === item.id ? "page" : "false"}">
      <span class="nav-icon" aria-hidden="true">${item.icon}</span><span class="nav-label">${item.label}</span>
    </button>`).join("");
  const mais = `
    <button class="nav-link nav-more" type="button" data-action="toggle-menu" aria-controls="app-side-menu" aria-expanded="${menuOpen}" aria-haspopup="dialog" aria-label="Mais opções">
      <span class="nav-icon" aria-hidden="true">☰</span><span class="nav-label">Mais</span>
    </button>`;
  return itens + mais;
}

function drawerLink(label, description, icon, { action = "switch-view", view = "", id = "", active = false, className = "" } = {}) {
  const attributes = [`data-action="${action}"`];
  if (view) attributes.push(`data-view="${view}"`);
  if (id) attributes.push(`data-id="${escapeHtml(id)}"`);
  return `<button class="drawer-link ${className}" type="button" ${attributes.join(" ")} aria-current="${active ? "page" : "false"}">
    <span class="drawer-icon" aria-hidden="true">${escapeHtml(icon)}</span><span class="drawer-link-copy"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></span><span class="drawer-link-arrow" aria-hidden="true">›</span>
  </button>`;
}

function renderSideDrawer(state, activeView, activeRouteId, open) {
  const destinationLink = drawerLink("Guia de Eunápolis", "Dados e referências", "⌖", {
    view: EUNAPOLIS_DESTINATION.id, active: activeView === EUNAPOLIS_DESTINATION.id,
  });
  const personal = [
    drawerLink("Certificados", `${certificateRoutes(state).length} rotas concluídas`, "🎖", { action: "open-certificates", active: activeView === "certificates" }),
    drawerLink("Perfil", "Dados, progresso e conta", "◉", { view: "profile", active: activeView === "profile" }),
  ].join("") + `<a class="drawer-link" href="/como-funciona"><span class="drawer-icon" aria-hidden="true">?</span><span class="drawer-link-copy"><strong>Como funciona</strong><small>Passo a passo e dúvidas comuns</small></span><span class="drawer-link-arrow" aria-hidden="true">›</span></a>
      <a class="drawer-link" href="/parceiros"><span class="drawer-icon" aria-hidden="true">↗</span><span class="drawer-link-copy"><strong>Seja parceiro</strong><small>Prefeitura, empresas e eventos</small></span><span class="drawer-link-arrow" aria-hidden="true">›</span></a>`;
  const openClass = open ? "is-open" : "";
  return `<div class="drawer-backdrop ${openClass}" data-action="close-menu" aria-hidden="true"></div>
    <aside class="side-drawer ${openClass}" id="app-side-menu" role="dialog" aria-modal="${open ? "true" : "false"}" aria-labelledby="side-drawer-title" aria-hidden="${open ? "false" : "true"}" ${open ? "" : "inert"}>
      <header class="drawer-header"><div class="drawer-brand"><img src="/icons/stamp.svg" alt="" width="38" height="38" /><span><small>+1 KM · ${escapeHtml(CITY.name)}</small><strong id="side-drawer-title">Mais opções</strong></span></div><button class="icon-button drawer-close" type="button" data-action="close-menu" aria-label="Fechar menu"><span aria-hidden="true">×</span></button></header>
      <nav class="drawer-navigation" aria-label="Todos os acessos do aplicativo">
        ${destinationLink}${personal}
      </nav>
      <footer class="drawer-footer"><button id="drawer-theme-button" class="drawer-link drawer-utility" type="button" data-action="toggle-theme"><span class="drawer-icon" aria-hidden="true">${state.theme === "dark" ? "☼" : "☾"}</span><span class="drawer-link-copy"><strong>${state.theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}</strong><small>Aparência do aplicativo</small></span><span class="drawer-link-arrow" aria-hidden="true">›</span></button>
        ${appInstalado() ? "" : `<button class="drawer-link drawer-utility" type="button" data-action="install-app"><span class="drawer-icon" aria-hidden="true">⇩</span><span class="drawer-link-copy"><strong>Instalar aplicativo</strong><small>Adicionar à tela inicial</small></span><span class="drawer-link-arrow" aria-hidden="true">›</span></button>`}
      </footer>
    </aside>`;
}

// Dentro do app instalado (tela inicial ou Google Play) não há o que instalar.
const appInstalado = () => {
  try { return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || document.referrer.startsWith("android-app://"); } catch { return false; }
};

export function renderChrome(state, activeView, activeRouteId = "", menuOpen = false) {
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", state.theme === "dark" ? "#0b1a14" : "#f3ead7");
  const logo = `<img class="brand-mark" src="/icons/stamp.svg" alt="" width="42" height="42" />`;
  document.getElementById("topbar").innerHTML = `
    <a class="brand" href="#" data-action="switch-view" data-view="home" aria-label="+1 KM, início">
      ${logo}<span class="brand-copy"><span class="brand-name">+1 KM</span><span class="brand-city">${CITY.name}</span></span>
    </a>`;
  document.getElementById("drawer-root").innerHTML = renderSideDrawer(state, activeView, activeRouteId, menuOpen);
  document.getElementById("side-rail").innerHTML = navLinks(activeView, menuOpen);
  document.getElementById("bottom-nav").innerHTML = navLinks(activeView, menuOpen);
}
