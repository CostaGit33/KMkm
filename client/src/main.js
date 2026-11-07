import './tag-chave.js'; // remove ?k= antes de qualquer medição
import './redefinir-token.js'; // remove token de recuperação antes de qualquer medição
import { initTelemetry, mountConsentBanner } from './telemetry.js';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { capturarLinkTagExterno } from './tag-chave.js';

let catalogoPromise;
let tagAtiva = null;

function carregarCatalogoUmaVez() {
  if (!catalogoPromise) {
    catalogoPromise = (async () => {
      try {
        const { carregarCatalogo } = await import('./catalog.js');
        await carregarCatalogo();
      } catch { /* segue com o catálogo fixo */ }
    })();
  }
  return catalogoPromise;
}

async function abrirTagExterna(url) {
  const codigo = capturarLinkTagExterno(url);
  if (!codigo) return false;
  if (tagAtiva === codigo && document.querySelector('.tag-page')) return true;

  tagAtiva = codigo;
  initTelemetry({ name: 'tag_opened', params: { route: 'tag' } });
  await carregarCatalogoUmaVez();
  const { bootTagPage } = await import('./tag.js');
  bootTagPage(codigo);
  mountConsentBanner();
  return true;
}

async function iniciarAplicacao() {
  if (Capacitor.isNativePlatform()) {
    // App Links de tags NFC/QR. A chave é removida da URL antes da telemetria.
    await App.addListener('appUrlOpen', ({ url }) => {
      void abrirTagExterna(url).catch(() => {
        // Não registrar a URL: ela pode conter a chave privada da TAG.
      });
    });

    // O retorno da página de TAG é uma navegação completa para reinicializar o shell.
    // Não reutilizar o App Link original, que pode continuar disponível em getLaunchUrl().
    const retornoTag = new URLSearchParams(window.location.search).get('retorno');
    if (retornoTag === 'colecao' || retornoTag === 'home') {
      initTelemetry({ name: 'app_opened', params: { route: 'app', source: 'tag_return' } });
      await carregarCatalogoUmaVez();
      await import('./app.js');
      mountConsentBanner();
      return;
    }

    try {
      const inicial = await App.getLaunchUrl();
      if (inicial?.url && await abrirTagExterna(inicial.url)) return;
    } catch {
      // Sem App Link inicial: abrir a aplicação normalmente.
    }
  }

  const tagMatch = window.location.pathname.match(/^\/t\/([\w-]+)/i);
  tagAtiva = tagMatch ? tagMatch[1].toLowerCase() : null;
  initTelemetry({ name: tagMatch ? 'tag_opened' : 'app_opened', params: { route: tagMatch ? 'tag' : 'app' } });
  await carregarCatalogoUmaVez();

  if (tagMatch) {
    const { bootTagPage } = await import('./tag.js');
    bootTagPage(tagMatch[1]);
  } else {
    await import('./app.js');
  }
  mountConsentBanner();
}

void iniciarAplicacao();
