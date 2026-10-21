// Telemetria opcional (GA4) com consentimento. Nada do Google é carregado até a pessoa aceitar,
// e nenhum serviço é carregado quando VITE_ANALYTICS_ENABLED/VITE_GA4_ID não estão definidos no build.
import './consent.css';

const CONSENT_KEY = 'mais1km:analytics-consent';
const analyticsEnabled = String(import.meta.env.VITE_ANALYTICS_ENABLED || '').toLowerCase() === 'true';
const gaId = String(import.meta.env.VITE_GA4_ID || '').trim();
const disableKey = `ga-disable-${gaId}`;
export const analyticsAvailable = analyticsEnabled && Boolean(gaId);
let analyticsReady = false;
let pendingOpen = null;

function readConsent() {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch { return null; }
}
function writeConsent(value) {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* escolha vale só nesta sessão */ }
}
export function getAnalyticsConsent() { return readConsent(); }
function canSend() {
  return analyticsAvailable && readConsent() === 'granted' && typeof window.gtag === 'function';
}
function clearAnalyticsCookies() {
  const names = ['_ga', `_ga_${gaId.replace(/^G-/, '')}`];
  const host = location.hostname;
  const parts = host.split('.');
  const parent = parts.length > 2 ? parts.slice(-2).join('.') : host;
  for (const name of names) {
    for (const domain of ['', host, `.${host}`, `.${parent}`]) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ''}`;
    }
  }
}
function loadGoogleAnalytics() {
  if (!analyticsAvailable || analyticsReady || typeof document === 'undefined') return;
  analyticsReady = true;
  window[disableKey] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  window.gtag('consent', 'update', { analytics_storage: 'granted' });
  window.gtag('js', new Date());
  window.gtag('config', gaId, { send_page_view: false, anonymize_ip: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  script.dataset.telemetry = 'ga4';
  document.head.appendChild(script);
}
export function setAnalyticsConsent(granted) {
  writeConsent(granted ? 'granted' : 'denied');
  if (!analyticsAvailable) return;
  if (granted) {
    window[disableKey] = false;
    if (analyticsReady) window.gtag('consent', 'update', { analytics_storage: 'granted' });
    else loadGoogleAnalytics();
    if (pendingOpen) { track(pendingOpen.name, pendingOpen.params); pendingOpen = null; }
  } else {
    pendingOpen = null;
    window[disableKey] = true;
    if (typeof window.gtag === 'function') window.gtag('consent', 'update', { analytics_storage: 'denied' });
    clearAnalyticsCookies();
  }
}
export function initTelemetry(openEvent = null) {
  if (analyticsAvailable) {
    const consent = readConsent();
    if (consent === 'granted') {
      loadGoogleAnalytics();
      if (openEvent) track(openEvent.name, openEvent.params);
    } else if (consent === null) pendingOpen = openEvent;
  }
  window.addEventListener('error', () => {
    if (canSend()) window.gtag('event', 'client_error', { error_type: 'uncaught', page_path: location.pathname });
  });
  window.addEventListener('unhandledrejection', () => {
    if (canSend()) window.gtag('event', 'client_error', { error_type: 'unhandled_rejection', page_path: location.pathname });
  });
}
export function track(name, params = {}) {
  if (!canSend()) return;
  const safe = Object.fromEntries(Object.entries(params).filter(([key, value]) => {
    if (value == null || typeof value === 'object') return false;
    return /^(page_path|page_title|route|result|error_type|source|mode)$/.test(key);
  }));
  window.gtag('event', name, safe);
}
export function mountConsentBanner() {
  if (!analyticsAvailable || readConsent() !== null || typeof document === 'undefined') return;
  if (document.getElementById('consent-banner')) return;
  const box = document.createElement('section');
  box.id = 'consent-banner';
  box.className = 'consent-banner';
  box.setAttribute('role', 'region');
  box.setAttribute('aria-label', 'Estatísticas de uso');
  box.innerHTML = '<p><strong>Estatísticas de uso.</strong> Com o seu aceite, medimos com o Google Analytics quantas vezes o app abre e se há erros. Não enviamos seu nome nem e-mail. <a href="/privacidade">Saiba mais</a></p>'
    + '<div class="consent-actions"><button type="button" class="consent-btn" data-consent="denied">Recusar</button><button type="button" class="consent-btn" data-consent="granted">Aceitar</button></div>';
  box.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-consent]') : null;
    if (!button) return;
    setAnalyticsConsent(button.dataset.consent === 'granted');
    box.remove();
  });
  document.body.appendChild(box);
}
