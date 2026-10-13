import { CITY, JOURNEY_DAYS, JOURNEY_STAGES, POINTS, ROUTES, getPoint } from "./data.js";
import { loadState, claimPoint, recordJourneyMilestone, recordJourneyPoint, refreshJourney, revealPoint, setTheme, startJourney, resetDemo, isSignedIn, createAccount, signIn, signOut, updateAccount } from "./store.js";
import { renderAuth, validarNome, validarEmail, validarSenha, gerarSenha, senhaConfere } from "./auth.js";
import { importServerStamps } from "./store.js";
import { lerCaderneta, apagarContaNoServidor } from "./sync.js";
import { applyFieldMarks } from "./geo.js";
import { setEventos, certificateRoutes, getFilteredPoints, renderChrome, renderView, renderProfile } from "./views.js";
import { installInk, playStampMoment } from "./stamp-kit.js";
import { mountRealMap } from "./real-map.js";
import { startIntro } from "./intro.js";
import { api, atualizarContaServidor, criarContaServidor, entrarContaServidor, sessaoContaServidor, sairContaServidor } from "./api.js";

let state = loadState();
let view = "home";
let pointId = "";
let routeId = "";
let previousView = "map";
let filters = { categoryId: "all", pointFilter: "all", search: "" };
let toastTimer;
let searchTimer;
let installPrompt = null;
let authMessage = "";
let authDraft = {};
let profileMessage = null;
let menuOpen = false;
let activeMap = null;
let introHandle = null;
let introDone = false;
let introCreated = false;

applyFieldMarks();
installInk();
const app = document.getElementById("app");
const toastNode = document.getElementById("toast");

const pageTitles = {
  home: "Caderneta",
  map: "Mapa",
  journey: "Jornada",
  routes: "Rotas",
  eunapolis: "Eunápolis",
  route: "Página da rota",
  collection: "Carimbos",
  certificates: "Certificados",
  point: "Ficha de descoberta",
  profile: "Meu perfil",
};

// Abertura cinematográfica V6: descoberta futurista e cadastro em etapas.
function launchIntro() {
  introCreated = false;
  try {
    introHandle = startIntro({
      mode: state.account ? "login" : "full",
      onCreate: async ({ nome, email, senha }) => {
        try {
          const servidor = await criarContaServidor({ nome, email, senha });
          const hash = await gerarSenha(senha);
          state = createAccount(state, { nome, email, serverId: servidor.usuario.id, criadoEm: new Date().toISOString(), ...hash });
        } catch (error) {
          authMessage = error.code === "email_ja_cadastrado" ? "Este e-mail já está cadastrado." : "Não foi possível criar sua conta no servidor.";
          showToast(authMessage);
          return;
        }
        authMessage = "";
        authDraft = {};
        view = "home";
        introCreated = true;
        render();
      },
      onEnter: () => {
        introDone = true;
        introHandle = null;
        render();
      },
      onFinish: () => {
        introDone = true;
        introHandle = null;
        if (introCreated) {
          document.body.classList.add("just-arrived");
          window.setTimeout(() => document.body.classList.remove("just-arrived"), 1800);
          showToast(`Bem-vindo ao +1 KM, ${state.user.name}!`);
        } else {
          document.querySelector(".auth-card input")?.focus();
        }
      },
    });
  } catch (error) {
    console.warn("A abertura V6 não pôde ser iniciada; usando autenticação simples.", error);
    introHandle = null;
    introDone = true;
  }
}
function render({ preserveFocus = false } = {}) {
  state = refreshJourney(state);
  const conectado = isSignedIn(state);
  document.body.classList.toggle("is-auth", !conectado);
  if (!conectado) {
    menuOpen = false;
    document.body.classList.remove("menu-open");
    document.querySelector(".app-shell").inert = false;
    document.getElementById("bottom-nav").inert = false;
    if (!introDone && !introHandle) launchIntro();
    if (introHandle) {
      app.innerHTML = "";
      document.title = "+1 KM";
      return;
    }
    app.innerHTML = renderAuth({ temConta: !!state.account, mensagem: authMessage, emailSugerido: state.account?.email || "", rascunho: authDraft });
    document.title = "Entrar · +1 KM";
    return;
  }
  document.body.classList.toggle("menu-open", menuOpen);
  let focusTarget = null;
  let selection = null;
  if (preserveFocus && document.activeElement instanceof HTMLElement) {
    const active = document.activeElement;
    focusTarget = active.dataset.input ? `[data-input="${active.dataset.input}"]` : active.dataset.select ? `[data-select="${active.dataset.select}"]` : null;
    if (typeof active.selectionStart === "number") selection = [active.selectionStart, active.selectionEnd];
  }
  renderChrome(state, view, routeId, menuOpen);
  document.querySelector(".app-shell").inert = menuOpen;
  document.getElementById("bottom-nav").inert = menuOpen;
  activeMap?.remove();
  activeMap = null;
  app.innerHTML = view === "profile" ? renderProfile(state, profileMessage) : renderView(state, view, pointId, routeId, filters);
  if (view === "map") {
    activeMap = mountRealMap({ element: document.getElementById("real-map"), city: CITY, points: getFilteredPoints(state, filters), state, onOpenPoint: goToPoint });
  }
  document.title = `${pageTitles[view] || "Caderneta"} · +1 KM`;
  if (focusTarget) {
    const next = document.querySelector(focusTarget);
    next?.focus({ preventScroll: true });
    if (selection && next instanceof HTMLInputElement) next.setSelectionRange(...selection);
  }
}

function showToast(message) {
  toastNode.textContent = message;
  toastNode.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastNode.classList.remove("is-visible"), 3100);
}

function isMainView(candidate) {
  return ["home", "map", "journey", "routes", "collection", "eunapolis"].includes(candidate);
}

function goToPoint(id) {
  if (!getPoint(id)) return;
  previousView = view;
  pointId = id;
  view = "point";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goToRoute(id) {
  if (!ROUTES.some((route) => route.id === id)) return;
  if (view !== "route") previousView = view;
  routeId = id;
  view = "route";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goBack() {
  view = isMainView(previousView) || ["route", "point"].includes(previousView) ? previousView : "map";
  if (view !== "route") routeId = "";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleClaim(id) {
  const point = getPoint(id);
  if (!point) return;
  let resposta = null;
  try {
    resposta = await api(`/tags/${encodeURIComponent(point.id.toLowerCase())}/carimbar`, { method: "POST" });
  } catch (error) {
    if (error.status === 401) {
      state = signOut(state);
      cartoesAtuais = []; setEventos([]);
      authMessage = "Sua sessão expirou. Entre novamente para carimbar.";
      render();
      return;
    }
    showToast(error.code === "ponto_nao_publicado" ? "Este ponto ainda aguarda validação operacional." : "O carimbo não foi confirmado pelo servidor.");
    return;
  }
  const result = claimPoint(state, id);
  state = result.state;
  if (resposta?.evento && !resposta.evento.repetido) {
    const rotulo = resposta.evento.patrocinado_por ? `${resposta.evento.nome} · patrocinado por ${resposta.evento.patrocinado_por}` : resposta.evento.nome;
    showToast(`Carimbo extra no card: ${rotulo}`);
  }
  if (resposta?.evento) { ultimaSincronizacao = 0; sincronizarComServidor(); }
  if (result.alreadyClaimed) {
    render();
    showToast("Este carimbo já está guardado — uma visita, uma marca.");
    return;
  }
  const journeyResult = recordJourneyPoint(state, id, CITY.id);
  state = journeyResult.state;
  const completedRoute = certificateRoutes(state).find((route) => route.pointIds.includes(id));
  render();
  playStampMoment(point, state);
  const journeyMessage = journeyResult.journeyCompleted
    ? "Jornada concluída! Seus carimbos permanentes seguem na caderneta."
    : journeyResult.stageCompleted
      ? `Etapa concluída. Próximo destino: ${JOURNEY_STAGES[state.journey.currentStageIndex].cityName}.`
      : "";
  showToast(journeyMessage || (completedRoute ? `Carimbo guardado. ${completedRoute.name} concluída — certificado liberado!` : `Carimbo ${point.id} guardado na sua caderneta.`));
}

function handleClick(event) {
  const target = event.target instanceof Element ? event.target.closest("[data-action]") : null;
  if (!target || target.hasAttribute("disabled")) return;
  const action = target.dataset.action;
  const id = target.dataset.id || "";
  const destination = target.dataset.view || "";
  event.preventDefault();

  switch (action) {
    case "toggle-menu":
      menuOpen = !menuOpen;
      render();
      if (menuOpen) document.querySelector(".drawer-close")?.focus({ preventScroll: true });
      else document.querySelector('[data-action="toggle-menu"]')?.focus({ preventScroll: true });
      break;
    case "close-menu":
      menuOpen = false;
      render();
      document.querySelector('[data-action="toggle-menu"]')?.focus({ preventScroll: true });
      break;
    case "switch-view": {
      const closedFromMenu = menuOpen;
      if (isMainView(view)) previousView = view;
      view = destination;
      menuOpen = false;
      profileMessage = null;
      pointId = "";
      if (view !== "route" && view !== "certificates") routeId = "";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (closedFromMenu) app.focus({ preventScroll: true });
      break;
    }
    case "open-point":
      goToPoint(id);
      break;
    case "open-route": {
      const closedFromMenu = menuOpen;
      menuOpen = false;
      goToRoute(id);
      if (closedFromMenu) app.focus({ preventScroll: true });
      break;
    }
    case "go-back":
      goBack();
      break;
    case "claim-point":
      handleClaim(id);
      break;
    case "logout":
      sairContaServidor().catch(() => {});
      state = signOut(state);
      cartoesAtuais = []; setEventos([]);
      view = "home";
      authMessage = "";
      authDraft = {};
      render();
      showToast("Você saiu. Seus carimbos continuam vinculados à conta.");
      break;
    case "delete-account":
      if (window.confirm("Excluir a conta e todos os carimbos? Isso apaga os dados deste aparelho e também os carimbos de tags guardados no servidor. Não tem como desfazer.")) {
        apagarContaNoServidor().then((servidorLimpo) => {
          // Sem internet não dá para limpar o servidor: a pessoa decide se apaga só o aparelho, sabendo disso.
          if (!servidorLimpo && !window.confirm("Sem conexão com o servidor. Apagar só os dados deste aparelho? Os carimbos de tags guardados no servidor continuam lá até você apagar a conta com internet.")) return;
          state = resetDemo();
          cartoesAtuais = []; setEventos([]);
          view = "home";
          introDone = false;
          authMessage = "";
          authDraft = {};
          profileMessage = null;
          render();
          showToast(servidorLimpo ? "Conta e dados apagados." : "Conta apagada neste aparelho. Os dados do servidor continuam até você apagar a conta com internet.");
        });
      }
      break;
    case "reveal-point":
      state = revealPoint(state, id);
      render();
      showToast("Uma nova página apareceu na sua caderneta.");
      break;
    case "set-point-filter":
      filters.pointFilter = target.dataset.filter || "all";
      render();
      break;
    case "toggle-theme": {
      const keepMenuFocus = menuOpen;
      state = setTheme(state, state.theme === "dark" ? "light" : "dark");
      render();
      if (keepMenuFocus) document.getElementById("drawer-theme-button")?.focus({ preventScroll: true });
      break;
    }
    case "reset-demo":
      if (window.confirm("Reiniciar a demonstração? Os carimbos desta caderneta neste dispositivo serão substituídos pelos exemplos iniciais.")) {
        state = resetDemo(state);
        view = "home";
        pointId = "";
        routeId = "";
        filters = { categoryId: "all", pointFilter: "all", search: "" };
        render();
        showToast("Caderneta demonstrativa reiniciada.");
      }
      break;
    case "open-certificates": {
      const closedFromMenu = menuOpen;
      menuOpen = false;
      routeId = "";
      view = "certificates";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (closedFromMenu) app.focus({ preventScroll: true });
      break;
    }
    case "open-certificate": {
      const closedFromMenu = menuOpen;
      menuOpen = false;
      routeId = id;
      view = "certificates";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (closedFromMenu) app.focus({ preventScroll: true });
      break;
    }
    case "start-journey":
      state = startJourney(state);
      render();
      showToast(`Ciclo ${state.journey.cycleNumber} iniciado · ${JOURNEY_DAYS} dias para abrir a próxima cidade.`);
      break;
    case "complete-journey-milestone": {
      const previousIndex = state.journey.currentStageIndex;
      const journeyResult = recordJourneyMilestone(state, id);
      state = journeyResult.state;
      render();
      const priorStage = JOURNEY_STAGES[previousIndex];
      const message = journeyResult.journeyCompleted
        ? "Jornada concluída! A caderneta permanente continua com você."
        : journeyResult.stageCompleted
          ? `Etapa de ${priorStage.cityName} concluída. Próximo destino: ${JOURNEY_STAGES[state.journey.currentStageIndex].cityName}.`
          : state.journey.status === "expired"
            ? "Ciclo encerrado: este marco não entrou na Jornada."
            : "Marco demonstrativo guardado nesta etapa.";
      showToast(message);
      break;
    }
    case "print-certificate":
      window.print();
      break;
    case "share-certificate":
      shareCertificate(id);
      break;
    case "install-app":
      if (menuOpen) {
        menuOpen = false;
        render();
      }
      installApp();
      break;
    default:
      break;
  }
}

async function shareCertificate(id) {
  const route = ROUTES.find((item) => item.id === id) || certificateRoutes(state)[0];
  if (!route) return;
  const text = `${state.user.name} completou a ${route.name} no +1 KM, em ${CITY.name}. Cada ponto, uma história guardada.`;
  try {
    if (navigator.share) {
      await navigator.share({ title: `Certificado · ${route.name}`, text, url: window.location.href });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showToast("Texto do certificado copiado para compartilhar.");
    } else {
      showToast("Seu certificado está pronto para imprimir.");
    }
  } catch (error) {
    if (error?.name !== "AbortError") showToast("Não foi possível abrir o compartilhamento neste navegador.");
  }
}

async function installApp() {
  if (!installPrompt) {
    showToast("Use o menu do navegador e escolha ‘Adicionar à tela inicial’.");
    return;
  }
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  document.querySelector('[data-action="install-app"]')?.remove();
}

document.addEventListener("click", handleClick);
document.addEventListener("keydown", (event) => {
  if (!menuOpen) return;
  if (event.key === "Escape") {
    event.preventDefault();
    menuOpen = false;
    render();
    document.querySelector('[data-action="toggle-menu"]')?.focus({ preventScroll: true });
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...document.querySelectorAll("#app-side-menu button:not([disabled])")];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
document.addEventListener("change", (event) => {
  const select = event.target instanceof HTMLSelectElement ? event.target : null;
  if (!select || select.dataset.select !== "category") return;
  filters.categoryId = select.value;
  render();
});
document.addEventListener("input", (event) => {
  const input = event.target instanceof HTMLInputElement ? event.target : null;
  if (!input || input.dataset.input !== "point-search") return;
  filters.search = input.value;
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => render({ preserveFocus: true }), 90);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  if (!document.querySelector('[data-action="install-app"]')) {
    const button = document.createElement("button");
    button.className = "icon-button";
    button.type = "button";
    button.dataset.action = "install-app";
    button.setAttribute("aria-label", "Instalar caderneta neste dispositivo");
    button.title = "Instalar caderneta";
    button.innerHTML = '<span aria-hidden="true">⇩</span>';
    document.querySelector(".top-actions")?.prepend(button);
  }
});

window.addEventListener("appinstalled", () => showToast("+1 KM instalado neste dispositivo."));

render();

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.dataset.form) return;
  event.preventDefault();
  const dados = new FormData(form);
  const v = (campo) => String(dados.get(campo) || "");
  switch (form.dataset.form) {
    case "criar": {
      authDraft = { nome: v("nome"), email: v("email") };
      authMessage = validarNome(v("nome")) || validarEmail(v("email")) || validarSenha(v("senha"))
        || (v("senha") !== v("confirma") ? "As senhas não são iguais." : "");
      if (authMessage) return render();
      const nome = v("nome").trim();
      let servidor;
      try {
        servidor = await criarContaServidor({ nome, email: v("email").trim().toLowerCase(), senha: v("senha") });
      } catch (error) {
        authMessage = error.code === "email_ja_cadastrado" ? "Este e-mail já está cadastrado." : "Não foi possível criar a conta no servidor.";
        return render();
      }
      const senha = await gerarSenha(v("senha"));
      state = createAccount(state, { nome, email: v("email").trim().toLowerCase(), serverId: servidor.usuario.id, criadoEm: new Date().toISOString(), ...senha });
      authMessage = "";
      authDraft = {};
      view = "home";
      render();
      showToast(`Bem-vindo ao +1 KM, ${nome}!`);
      sincronizarComServidor();
      break;
    }
    case "entrar": {
      const email = v("email").trim().toLowerCase();
      let servidor;
      try {
        servidor = await entrarContaServidor({ email, senha: v("senha") });
      } catch (error) {
        const localOk = !!state.account && state.account.email === email && (await senhaConfere(state.account, v("senha")));
        if (!localOk || v("senha").length < 8) {
          authMessage = "E-mail ou senha não conferem.";
          return render();
        }
        try {
          servidor = await criarContaServidor({ nome: state.account.nome, email, senha: v("senha") });
        } catch (migrationError) {
          authMessage = migrationError.code === "email_ja_cadastrado" ? "A conta existe no servidor, mas a senha precisa ser redefinida." : "Não foi possível recuperar esta conta no servidor.";
          return render();
        }
      }
      state = updateAccount(state, { nome: servidor.usuario.nome, email: servidor.usuario.email, serverId: servidor.usuario.id });
      state = signIn(state);
      authMessage = "";
      view = "home";
      render();
      showToast(`Olá de novo, ${state.user.name}.`);
      sincronizarComServidor();
      break;
    }
    case "perfil-dados": {
      const erro = validarNome(v("nome")) || validarEmail(v("email"));
      if (erro) {
        profileMessage = { texto: erro, ok: false };
        return render();
      }
      try {
        const servidor = await atualizarContaServidor({ nome: v("nome").trim(), email: v("email").trim().toLowerCase() });
        state = updateAccount(state, { nome: servidor.usuario.nome, email: servidor.usuario.email });
        profileMessage = { texto: "Dados salvos.", ok: true };
      } catch (error) {
        profileMessage = { texto: error.code === "email_ja_cadastrado" ? "Este e-mail já está em uso." : "Não foi possível salvar no servidor.", ok: false };
      }
      render();
      break;
    }
    case "perfil-senha": {
      if (!(await senhaConfere(state.account, v("atual")))) {
        profileMessage = { texto: "A senha atual não confere.", ok: false };
        return render();
      }
      const erro = validarSenha(v("nova")) || (v("nova") !== v("confirma") ? "As senhas novas não são iguais." : "");
      if (erro) {
        profileMessage = { texto: erro, ok: false };
        return render();
      }
      try {
        await atualizarContaServidor({ nome: state.account.nome, email: state.account.email, senhaAtual: v("atual"), senhaNova: v("nova") });
        state = updateAccount(state, await gerarSenha(v("nova")));
        profileMessage = { texto: "Senha trocada.", ok: true };
      } catch (error) {
        profileMessage = { texto: error.code === "senha_atual_invalida" ? "A senha atual não confere." : "Não foi possível trocar a senha no servidor.", ok: false };
      }
      render();
      break;
    }
  }
}

app.addEventListener("submit", handleSubmit);

// Carimbos de tags físicas (no servidor) entram na caderneta: ao abrir, ao voltar para o app e ao entrar na conta.
let sincronizando = false;
let cartoesAtuais = [];
let ultimaSincronizacao = 0;
async function sincronizarComServidor() {
  if (sincronizando || !isSignedIn(state) || Date.now() - ultimaSincronizacao < 15000) return;
  sincronizando = true;
  try {
    try {
      await sessaoContaServidor();
    } catch (error) {
      if (error.status === 401) {
        state = signOut(state);
      cartoesAtuais = []; setEventos([]);
        authMessage = "Sua sessão expirou. Entre novamente.";
        render();
        return;
      }
    }
    const caderneta = await lerCaderneta();
    ultimaSincronizacao = Date.now();
    if (!caderneta || !isSignedIn(state)) return;
    const itens = caderneta.itens;
    const anteriores = JSON.stringify(cartoesAtuais);
    cartoesAtuais = caderneta.eventos;
    setEventos(cartoesAtuais);
    if (JSON.stringify(cartoesAtuais) !== anteriores) render();
    const resultado = importServerStamps(state, itens);
    if (resultado.imported > 0) {
      state = resultado.state;
      render();
      showToast(resultado.imported === 1 ? "1 carimbo de tag chegou na sua caderneta." : `${resultado.imported} carimbos de tags chegaram na sua caderneta.`);
    }
  } finally {
    sincronizando = false;
  }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") sincronizarComServidor();
});
sincronizarComServidor();

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch((error) => {
    console.warn("O modo offline do PWA não pôde ser ativado.", error);
  }));
}
