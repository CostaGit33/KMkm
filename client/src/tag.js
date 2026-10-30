import { api, entrar, token } from './api.js';
import { lerChaveTag } from './tag-chave.js';
import { findPointByCode } from './data.js';
import { installInk, stampHtml } from './stamp-kit.js';
import { cartaHtml } from './cartas.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
// Se o app já tem conta neste aparelho, o apelido vem preenchido (um toque para carimbar).
const nomeLocal = () => {
  try { return String(JSON.parse(localStorage.getItem('mais1km-eunapolis:v4'))?.account?.nome || '').slice(0, 30); } catch { return ''; }
};
// Escuro por padrão; claro só se a pessoa escolheu no app.
const temaLocal = () => {
  try { const s = JSON.parse(localStorage.getItem('mais1km-eunapolis:v4')); return s?.themeChosen === true && s?.theme === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
};
const findPoint = (code, result) => findPointByCode(code) || {
  id: code.toUpperCase(), name: result?.carimbo?.tag_nome || 'Ponto da rota', categoryIds: ['cultura'], hidden: false,
};

// Evita requisições simultâneas se a pessoa tocar duas vezes ou o navegador repetir o evento.
let stampInFlight = false;

// Posição do aparelho, só no momento do carimbo e só quando o ponto pede. O servidor confere a distância e
// não guarda a coordenada.
function obterPosicao() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('sem_geolocalizacao'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      reject,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

function mensagemErroTag(error) {
  if (error?.code === 'chave_invalida') {
    return { titulo: 'Este link da tag não confere', texto: 'O link foi substituído ou está incompleto. Se você leu uma tag ou QR no local, avise a organização para trocar a etiqueta.', tentar: false };
  }
  if (error?.code === 'localizacao_necessaria') {
    return { titulo: 'Confirme que você está no local', texto: 'Este ponto pede a sua localização no momento do carimbo. Ela não é guardada: só conferimos a distância até o ponto.', localizar: true };
  }
  if (error?.code === 'gps_impreciso') {
    return { titulo: 'Precisamos de um GPS mais preciso', texto: 'A precisão atual está acima de 50 metros. Ative a localização precisa, aguarde alguns segundos em uma área aberta e tente novamente.', localizar: true };
  }
  if (error?.code === 'ponto_sem_coordenadas') {
    return { titulo: 'Localização do ponto pendente', texto: 'Este ponto ainda não possui coordenadas válidas cadastradas. O carimbo foi bloqueado para evitar uma confirmação incorreta. Avise a organização.', tentar: false };
  }
  if (error?.code === 'fora_do_raio') {
    const { raio, distancia } = error.dados || {};
    return { titulo: 'Você parece estar longe do ponto', texto: `Chegue mais perto da tag${raio ? ` (o ponto confere um raio de ${raio} m${distancia ? `; você está a cerca de ${distancia} m` : ''})` : ''}. Se já está no local, espere o GPS firmar e tente de novo.`, localizar: true };
  }
  if (error?.code === 'muitos_carimbos') {
    return { titulo: 'Carimbos em ritmo alto demais', texto: 'Por segurança, espere alguns minutos antes de carimbar outro ponto.', tentar: true };
  }
  if (error?.code === 'tag_inexistente' || error?.status === 404) {
    return { titulo: 'Tag não encontrada', texto: 'Confira o código deste ponto. Se o QR/NFC abriu este endereço, avise a organização para verificar a tag.', tentar: false };
  }
  if (error?.code === 'ponto_nao_publicado') {
    return { titulo: 'Ponto temporariamente indisponível', texto: 'Este ponto ainda não está publicado para receber carimbos. Tente novamente mais tarde.', tentar: false };
  }
  if (error?.status === 429) {
    return { titulo: 'Muitas tentativas seguidas', texto: 'Espere um minuto antes de tentar novamente.', tentar: true };
  }
  if (error?.status === 401) {
    return { titulo: 'Sua sessão precisa ser renovada', texto: 'Volte à caderneta, entre na sua conta e leia a tag novamente.', tentar: false };
  }
  if (!error?.status) {
    return { titulo: 'Sem conexão com o servidor', texto: 'Sua visita não pôde ser confirmada. Verifique a internet e tente novamente; não vamos marcar a visita como concluída sem confirmação.', tentar: true };
  }
  if (error.status >= 500) {
    return { titulo: 'Servidor temporariamente indisponível', texto: 'Não recebemos a confirmação do carimbo. Aguarde alguns instantes e tente novamente.', tentar: true };
  }
  return { titulo: 'Não foi possível confirmar o carimbo', texto: 'A visita não foi confirmada. Tente novamente; se o problema continuar, volte à caderneta e procure a organização.', tentar: true };
}

function shell(content) {
  document.documentElement.dataset.theme = temaLocal();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', temaLocal() === 'light' ? '#f4f4f5' : '#0e0e0f');
  document.body.innerHTML = `<main class="tag-page"><div class="tag-brand"><img src="/icons/stamp.svg" alt="" width="58" height="58"><strong>+1 KM</strong><span>carimbo de rota</span></div><div id="tag-content" aria-live="polite" aria-atomic="true">${content}</div></main>`;
}

function form(error = '') {
  return `<form class="card tag-card" id="tag-entry" novalidate><p class="eyebrow">Abrir caderneta</p><h1 class="page-title">Seu próximo carimbo começa aqui.</h1><p class="page-subtitle">Digite um apelido para registrar esta passagem. Se você recebeu um código de turma, pode informá-lo também.</p><label class="field"><span>Apelido</span><input name="apelido" minlength="2" maxlength="30" autocomplete="nickname" value="${escapeHtml(nomeLocal())}" required autofocus></label><label class="field"><span>Código da turma <small>(opcional)</small></span><input name="turma" maxlength="40" autocapitalize="characters" autocomplete="off"></label>${error ? `<p class="auth-error" role="alert">${escapeHtml(error)}</p>` : ''}<button class="primary-button button-full" type="submit">Abrir e carimbar</button><a class="text-link tag-back" href="/">Ir para minha caderneta →</a></form>`;
}

// Segundo carimbo do mesmo toque: o card ativo (evento ou patrocínio), mostrado separado do carimbo da rota.
function cartaoEvento(result, code) {
  const ev = result.evento;
  if (!ev) return '';
  const point = findPoint(code, { carimbo: ev.carimbo });
  const marca = stampHtml(point, ev.carimbo?.ordem || 1, { entry: { at: ev.carimbo?.criado_em || new Date().toISOString() }, size: 170, plus: true });
  const ed = ev.edicao;
  const numero = ed ? `<div class="tag-edicao ${ed.numero ? '' : 'esgotada'}" role="status"><strong>${ed.numero ? `Carimbo nº ${ed.numero}/${ed.tiragem}` : 'Edição esgotada'}</strong><small>${ed.numero ? (ed.nova ? 'Número só seu, em ordem de chegada.' : 'Este é o seu número nesta edição.') : `Os ${ed.tiragem} números já foram entregues. Seu carimbo de visita continua valendo.`}</small></div>` : '';
  const origem = ev.patrocinado_por ? `Patrocinado por ${escapeHtml(ev.patrocinado_por)}` : 'Evento';
  return `<article class="card tag-card tag-evento"><p class="eyebrow">${origem}</p><h2 class="page-title">${escapeHtml(ev.nome)}</h2><div class="tag-stamp">${marca}</div>${numero}<p class="page-subtitle">${ev.repetido ? 'Este ponto já está no seu card.' : 'Carimbo extra do card. Ele fica guardado na sua caderneta, separado da rota.'}</p></article>`;
}

// Desbloqueio da carta: o primeiro carimbo de rota revela o personagem do ponto.
function cartaoCriatura(result) {
  const c = result.criatura;
  if (!c) return '';
  const item = c.carta || { codigo: '', carta: 0, ponto: '', categoria: 'cultura', raridade: c.raridade, capturada: true, criatura: c.nome, estagio: 0 };
  const carta = cartaHtml(item, { size: 130, tag: 'div' });
  const progresso = `${c.capturadas} de ${c.total} cartas na sua coleção`;
  if (!c.nova) return `<article class="card tag-card tag-criatura"><div class="tag-criatura-arte">${carta}</div><p class="page-subtitle">Carta já desbloqueada. ${progresso}.</p></article>`;
  return `<article class="card tag-card tag-criatura nova" role="status"><p class="eyebrow">Ponto descoberto!</p><h2 class="page-title">Você desbloqueou o personagem deste local.</h2><div class="tag-criatura-arte">${carta}</div><p class="page-subtitle">${progresso}.</p><a class="outline-button button-full" href="/">Ver minha coleção</a></article>`;
}

async function stamp(code, pos = null) {
  if (stampInFlight) return;
  const content = document.getElementById('tag-content');
  if (!content) return;
  stampInFlight = true;
  content.setAttribute("aria-busy", "true");
  content.innerHTML = `<div class="card tag-card tag-loading" role="status" aria-live="polite"><span class="tag-loading-mark" aria-hidden="true">✳</span><p class="eyebrow">PONTO ${escapeHtml(code.toUpperCase())}</p><h1 class="page-title">Confirmando sua visita…</h1><p class="page-subtitle">Estamos validando a tag e guardando sua conquista. Aguarde a confirmação antes de sair desta tela.</p><span class="tag-loading-track" aria-hidden="true"></span></div>`;
  try {
    const result = await api(`/tags/${encodeURIComponent(code)}/carimbar`, { method: 'POST', body: { chave: lerChaveTag(code) || undefined, pos: pos || undefined } });
    const point = findPoint(code, result);
    const stamp = stampHtml(point, result.carimbo?.ordem || 1, { entry: { at: result.carimbo?.criado_em || new Date().toISOString() }, size: 230, plus: true });
    const turma = result.turma ? `<article class="card tag-note"><strong>${result.turma.formou ? 'Carimbo de turma formado!' : 'Carimbo coletivo em andamento'}</strong><p>${result.turma.formou ? 'A turma deixou uma marca conjunta neste ponto.' : `${result.turma.presentes} presentes. Faltam ${Math.max(0, result.turma.necessarios - result.turma.presentes)} em até 4 minutos.`}</p></article>` : '';
    const guardiao = result.guardiao ? `<article class="card tag-note"><strong>Guardião do ponto</strong><p>${escapeHtml(result.guardiao.apelido)} · ${result.guardiao.passagens} passagens</p></article>` : '';
    const carta = result.criatura?.carta;
    const conquista = carta ? `<div class="tag-criatura-arte">${cartaHtml(carta, { size: 190, tag: 'div' })}</div>` : `<div class="tag-stamp">${stamp}</div>`;
    const titulo = result.repetido
      ? 'Visita já registrada'
      : result.criatura?.nova
        ? 'Nova carta desbloqueada!'
        : carta
          ? 'Carta na coleção'
          : 'Carimbo registrado!';
    const feedback = result.repetido
      ? 'Esta passagem já foi registrada recentemente. Não criamos uma visita duplicada.'
      : result.criatura?.nova
        ? 'Conquista salva com sucesso na sua coleção.'
        : carta
          ? 'Sua visita foi confirmada; esta carta já fazia parte da sua coleção.'
          : 'Sua visita foi confirmada e o carimbo foi salvo.';
    content.innerHTML = `<article class="card tag-card tag-success ${result.repetido ? 'is-repeat' : 'is-confirmed'}" role="status" aria-live="polite"><p class="eyebrow">${escapeHtml(result.rota.nome)}</p>${conquista}<h1 class="page-title">${titulo}</h1><p class="tag-result-feedback">${feedback}</p><p class="page-subtitle">${escapeHtml(point.name)} · ${result.rota.feitos} de ${result.rota.total} pontos desta rota.</p>${result.certificado ? '<div class="tag-certificate">Rota completa · certificado liberado</div>' : ''}<p class="small muted">Visitas confirmadas hoje: ${result.hoje} passagem(ns) neste ponto.</p><a class="primary-button button-full" href="/">Ver minha coleção</a></article>${result.criatura?.nova ? '' : cartaoCriatura(result)}${cartaoEvento(result, code)}${turma}${guardiao}`;
  } catch (error) {
    const falha = mensagemErroTag(error);
    const acao = falha.localizar
      ? '<button class="primary-button button-full" id="tag-localizar" type="button">Confirmar minha localização</button>'
      : falha.tentar ? '<button class="outline-button button-full" id="tag-retry" type="button">Tentar novamente</button>' : '';
    content.innerHTML = `<div class="card tag-card tag-error" role="alert"><span class="tag-error-mark" aria-hidden="true">!</span><h1 class="page-title">${falha.titulo}</h1><p class="page-subtitle">${falha.texto}</p>${acao}<a class="text-link tag-back" href="/">Voltar à caderneta</a></div>`;
    document.getElementById('tag-localizar')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      if (button.disabled) return;
      button.disabled = true;
      button.textContent = 'Obtendo localização…';
      try {
        stamp(code, await obterPosicao());
      } catch {
        button.disabled = false;
        button.textContent = 'Tentar de novo';
        if (!document.getElementById('tag-geo-erro')) button.insertAdjacentHTML('beforebegin', '<p class="page-subtitle" id="tag-geo-erro" role="alert">Não foi possível obter a localização. Autorize a localização do navegador para este site e tente de novo.</p>');
      }
    }, { once: true });
    document.getElementById('tag-retry')?.addEventListener('click', (event) => {
      const button = event.currentTarget;
      if (button.disabled) return;
      button.disabled = true;
      button.textContent = 'Tentando novamente…';
      stamp(code);
    }, { once: true });
  } finally {
    stampInFlight = false;
    content.removeAttribute("aria-busy");
  }
}

export function bootTagPage(code) {
  shell(token() ? '<div class="card tag-card" role="status"><p class="page-title">Preparando seu carimbo…</p></div>' : form());
  installInk();

  const bindEntry = () => {
    const entry = document.getElementById('tag-entry');
    entry?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (entry.dataset.submitting === 'true') return;
      const data = new FormData(entry);
      const submit = entry.querySelector('button[type="submit"]');
      entry.dataset.submitting = 'true';
      entry.setAttribute('aria-busy', 'true');
      if (submit) { submit.disabled = true; submit.textContent = 'Abrindo sua caderneta…'; }
      try {
        await entrar({ apelido: String(data.get('apelido') || ''), turma: String(data.get('turma') || '') });
        await stamp(code);
      } catch {
        const content = document.getElementById('tag-content');
        content.innerHTML = form('Não foi possível abrir a caderneta. Confira o apelido e a conexão e tente novamente.');
        bindEntry();
        content.querySelector('input[name="apelido"]')?.focus();
      }
    });
  };
  bindEntry();

  if (token()) stamp(code);
  else if (location.protocol === 'https:') api('/sessao').then(() => stamp(code)).catch(() => {});
}
