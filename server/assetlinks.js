// Digital Asset Links do app Android (/.well-known/assetlinks.json).
//
// Por que uma rota e não um arquivo em client/public/.well-known: o express.static
// ignora diretórios iniciados por ponto e o fallback da SPA devolveria index.html
// (200, text/html), o que faz a verificação dos Android App Links falhar sem aviso.
// A rota abaixo responde JSON de verdade e fica desligada (404) até a variável
// ANDROID_SHA256_CERT_FINGERPRINTS ser definida no ambiente.

export const PACOTE_ANDROID_PADRAO = 'online.novaagencian8n.mais1km';

// Aceita "AA:BB:...", "aabb..." ou com espaços/hifens; devolve o formato canônico
// do Google (64 hex em maiúsculas, separados por ":") ou null se não for um SHA-256.
export function normalizarImpressao(valor) {
  const hex = String(valor ?? '').toUpperCase().replace(/[:\s-]/g, '');
  if (!/^[0-9A-F]{64}$/.test(hex)) return null;
  return hex.match(/../g).join(':');
}

export function lerConfiguracao(env = process.env) {
  const pacote = String(env.ANDROID_PACKAGE_NAME || '').trim() || PACOTE_ANDROID_PADRAO;
  // Impressões vêm separadas por vírgula ou ponto e vírgula (os ":" internos são do próprio SHA-256).
  const partes = String(env.ANDROID_SHA256_CERT_FINGERPRINTS || '')
    .split(/[,;\n]+/)
    .map((parte) => parte.trim())
    .filter(Boolean);
  const normalizadas = partes.map(normalizarImpressao);
  return {
    pacote,
    impressoes: [...new Set(normalizadas.filter(Boolean))],
    invalidas: normalizadas.filter((valor) => valor === null).length,
  };
}

// null quando não há nenhuma impressão válida: melhor 404 do que um arquivo que não verifica.
export function montarAssetLinks({ pacote, impressoes }) {
  if (!impressoes.length) return null;
  return [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: pacote,
      sha256_cert_fingerprints: impressoes,
    },
  }];
}

export function assetLinksHandler(env = process.env) {
  return (_req, res) => {
    const documento = montarAssetLinks(lerConfiguracao(env));
    if (!documento) return res.status(404).json({ erro: 'assetlinks_nao_configurado' });
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json(documento);
  };
}
