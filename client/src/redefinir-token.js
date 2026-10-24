// O link de recuperação chega como /?redefinir=TOKEN. O token é lido uma única vez e tirado da barra de endereço
// já na carga do módulo (antes do GA4 e de qualquer outro script), para não vazar por page_location, histórico,
// compartilhamento da tela ou "copiar endereço". Fica só no sessionStorage desta aba, por no máximo 30 minutos
// (a mesma validade do link), para sobreviver a um recarregamento enquanto a pessoa digita a senha nova.
const CHAVE = "mais1km:redefinir";
const VALIDADE_MS = 30 * 60 * 1000;

function capturar() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("redefinir")) return;
    const token = params.get("redefinir") || "";
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    if (token) window.sessionStorage.setItem(CHAVE, JSON.stringify({ token, ate: Date.now() + VALIDADE_MS }));
  } catch { /* sem sessionStorage ou history: segue sem guardar o token */ }
}

export function lerTokenRedefinicao() {
  try {
    const guardado = JSON.parse(window.sessionStorage.getItem(CHAVE) || "null");
    if (guardado?.token && Number(guardado.ate) > Date.now()) return String(guardado.token);
    window.sessionStorage.removeItem(CHAVE);
  } catch { /* ignora */ }
  return "";
}

export function limparTokenRedefinicao() {
  try { window.sessionStorage.removeItem(CHAVE); } catch { /* ignora */ }
}

capturar();
