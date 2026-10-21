import { initTelemetry, mountConsentBanner } from './telemetry.js';

const tagMatch = window.location.pathname.match(/^\/t\/([\w-]+)/i);
initTelemetry({ name: tagMatch ? 'tag_opened' : 'app_opened', params: { route: tagMatch ? 'tag' : 'app' } });

// O catálogo (pontos e circuitos) vem do servidor antes de qualquer tela abrir; falhas não impedem o app.
(async () => {
  try {
    const { carregarCatalogo } = await import('./catalog.js');
    await carregarCatalogo();
  } catch { /* segue com o catálogo fixo */ }
  if (tagMatch) {
    const { bootTagPage } = await import('./tag.js');
    bootTagPage(tagMatch[1]);
  } else {
    await import('./app.js');
  }
  mountConsentBanner();
})();
