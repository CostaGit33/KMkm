// A chave do link da tag chega como /t/CODIGO?k=CHAVE. Ela é removida da barra de endereço
// antes de telemetria, histórico ou qualquer medição e fica somente na sessionStorage da aba.
const PREFIXO = "mais1km:tagk:";
const ORIGEM_TAG = "https://mais1km.novaagencian8n.online";

function guardarChave(codigo, chave) {
  try {
    const storageKey = PREFIXO + String(codigo).toLowerCase();
    if (/^[\w-]{8,64}$/.test(String(chave || ""))) {
      window.sessionStorage.setItem(storageKey, String(chave));
    } else {
      window.sessionStorage.removeItem(storageKey);
    }
  } catch { /* segue sem chave; a API negará o carimbo */ }
}

function capturar() {
  try {
    const casou = window.location.pathname.match(/^\/t\/([\w-]+)/i);
    if (!casou) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("k")) return;
    const chave = params.get("k") || "";
    params.delete("k");
    const resto = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (resto ? \`?\${resto}\` : "") + window.location.hash);
    guardarChave(casou[1], chave);
  } catch { /* sem sessionStorage ou history: segue sem guardar a chave */ }
}

/**
 * Converte um App Link HTTPS de TAG para a rota local do WebView.
 * A chave é guardada somente na sessionStorage e nunca devolvida ao chamador.
 * Retorna o código da TAG, ou string vazia para URLs que não pertencem ao Mais1km.
 */
export function capturarLinkTagExterno(valor) {
  try {
    const url = new URL(String(valor || ""));
    if (url.protocol !== "https:" || url.origin !== ORIGEM_TAG) return "";
    const casou = url.pathname.match(/^\/t\/([\w-]+)/i);
    if (!casou) return "";
    const params = new URLSearchParams(url.search);
    const chave = params.get("k") || "";
    params.delete("k");
    guardarChave(casou[1], chave);
    const resto = params.toString();
    const caminhoLimpo = url.pathname + (resto ? \`?\${resto}\` : "") + url.hash;
    window.history.replaceState(null, "", caminhoLimpo);
    return casou[1].toLowerCase();
  } catch { return ""; }
}

export function lerChaveTag(codigo) {
  try { return window.sessionStorage.getItem(PREFIXO + String(codigo).toLowerCase()) || ""; } catch { return ""; }
}

capturar();
