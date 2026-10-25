// A chave do link da tag chega como /t/CODIGO?k=CHAVE. É lida uma única vez e tirada da barra de endereço
// logo na carga do módulo (antes do GA4 e de qualquer outro script), para não vazar por page_location,
// histórico, "copiar endereço" ou captura de tela. Fica só no sessionStorage desta aba, por código, para
// sobreviver a um recarregamento enquanto a pessoa cria a conta ou digita o apelido.
const PREFIXO = "mais1km:tagk:";

function capturar() {
  try {
    const casou = window.location.pathname.match(/^\/t\/([\w-]+)/i);
    if (!casou) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("k")) return;
    const chave = params.get("k") || "";
    params.delete("k");
    const resto = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (resto ? `?${resto}` : "") + window.location.hash);
    if (/^[\w-]{8,64}$/.test(chave)) window.sessionStorage.setItem(PREFIXO + casou[1].toLowerCase(), chave);
  } catch { /* sem sessionStorage ou history: segue sem guardar a chave */ }
}

export function lerChaveTag(codigo) {
  try { return window.sessionStorage.getItem(PREFIXO + String(codigo).toLowerCase()) || ""; } catch { return ""; }
}

capturar();
