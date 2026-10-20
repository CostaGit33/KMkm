// Telemetria opcional e sem dados pessoais. Nenhum serviço é carregado quando
// VITE_GA4_ID não está definido no build.
let analyticsReady = false;

const analyticsEnabled = String(import.meta.env.VITE_ANALYTICS_ENABLED || '').toLowerCase() === 'true';
const gaId = String(import.meta.env.VITE_GA4_ID || '').trim();

function loadGoogleAnalytics() {
  if (!analyticsEnabled || !gaId || analyticsReady || typeof document === 'undefined') return;
  analyticsReady = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', gaId, { send_page_view: false, anonymize_ip: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  script.dataset.telemetry = 'ga4';
  document.head.appendChild(script);
}

export function initTelemetry() {
  loadGoogleAnalytics();
  window.addEventListener('error', () => {
    if (typeof window.gtag === 'function') window.gtag('event', 'client_error', { error_type: 'uncaught', page_path: location.pathname });
  });
  window.addEventListener('unhandledrejection', () => {
    if (typeof window.gtag === 'function') window.gtag('event', 'client_error', { error_type: 'unhandled_rejection', page_path: location.pathname });
  });
}

export function track(name, params = {}) {
  if (typeof window.gtag !== 'function') return;
  const safe = Object.fromEntries(Object.entries(params).filter(([key, value]) => {
    if (value == null || typeof value === 'object') return false;
    return /^(page_path|page_title|route|result|error_type|source|mode)$/.test(key);
  }));
  window.gtag('event', name, safe);
}
