// Política de segurança de conteúdo (CSP) do servidor, num módulo próprio para poder ser testada.
//
// Estrita por padrão: nenhum script embutido e nenhum eval. O app não usa os dois (o tema inicial vem de
// /theme-init.js e o GA4 é carregado por <script src>). Estilos embutidos continuam permitidos porque o
// index.html, as páginas públicas e o Google Maps dependem de style="..." / <style>; isso é um risco menor.
//
// Se algo quebrar em produção por causa da CSP, ligue CSP_LEGADO=true no ambiente: volta a aceitar
// 'unsafe-inline' e 'unsafe-eval' em script-src enquanto o problema é corrigido. É uma saída temporária.

const GOOGLE_MAPS_SCRIPT = ['https://maps.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com'];
const GA4_SCRIPT = ['https://www.googletagmanager.com'];
const GA4_CONNECT = ['https://www.google-analytics.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com'];
const GA4_IMG = ['https://www.google-analytics.com', 'https://*.google-analytics.com', 'https://www.googletagmanager.com'];

function origensDeFrame(valor) {
  const itens = String(valor || '').split(/[\s,]+/).filter(Boolean)
    .filter((item) => /^('self'|'none'|https:\/\/[\w.*-]+(:\d+)?)$/.test(item));
  return itens.length ? itens.join(' ') : "'self'";
}

export function montarCsp({ legado = false, https = false, frameAncestors = '' } = {}) {
  const scriptSrc = ["'self'", ...GOOGLE_MAPS_SCRIPT, ...GA4_SCRIPT];
  if (legado) scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
  const diretivas = [
    ["default-src", "'self'"],
    ["base-uri", "'self'"],
    ["object-src", "'none'"],
    ["form-action", "'self'"],
    ["frame-ancestors", origensDeFrame(frameAncestors)],
    ["img-src", ["'self'", 'data:', 'blob:', 'https://maps.gstatic.com', 'https://maps.google.com', 'https://*.googleapis.com', 'https://*.gstatic.com', 'https://*.ggpht.com', 'https://*.googleusercontent.com', ...GA4_IMG].join(' ')],
    ["script-src", scriptSrc.join(' ')],
    ["style-src", "'self' 'unsafe-inline' https://fonts.googleapis.com"],
    ["font-src", "'self' https://fonts.gstatic.com data:"],
    ["connect-src", ["'self'", 'https://tile.openstreetmap.de', 'https://api.maptiler.com', 'https://*.googleapis.com', ...GA4_CONNECT].join(' ')],
    ["worker-src", "'self' blob:"],
    ["manifest-src", "'self'"],
  ];
  if (https) diretivas.push(['upgrade-insecure-requests', '']);
  return diretivas.map(([nome, valor]) => (valor ? `${nome} ${valor}` : nome)).join('; ') + ';';
}
