import { api, entrar, token } from './api.js';
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

async function stamp(code) {
  const content = document.getElementById('tag-content');
  content.setAttribute("aria-busy", "true");
  content.innerHTML = `<div class="card tag-card tag-loading" role="status"><span class="tag-loading-mark" aria-hidden="true">✳</span><p class="eyebrow">${escapeHtml(code.toUpperCase())}</p><h1 class="page-title">Confirmando sua visita…</h1><p class="page-subtitle">Estamos validando a tag e guardando sua conquista. Não feche esta tela.</p><span class="tag-loading-track" aria-hidden="true"></span></div>`;
  try {
    const result = await api(`/tags/${encodeURIComponent(code)}/carimbar`, { method: 'POST' });
    const point = findPoint(code, result);
    const stamp = stampHtml(point, result.carimbo?.ordem || 1, { entry: { at: result.carimbo?.criado_em || new Date().toISOString() }, size: 230, plus: true });
    const turma = result.turma ? `<article class="card tag-note"><strong>${result.turma.formou ? 'Carimbo de turma formado!' : 'Carimbo coletivo em andamento'}</strong><p>${result.turma.formou ? 'A turma deixou uma marca conjunta neste ponto.' : `${result.turma.presentes} presentes. Faltam ${Math.max(0, result.turma.necessarios - result.turma.presentes)} em até 4 minutos.`}</p></article>` : '';
    const guardiao = result.guardiao ? `<article class="card tag-note"><strong>Guardião do ponto</strong><p>${escapeHtml(result.guardiao.apelido)} · ${result.guardiao.passagens} passagens</p></article>` : '';
    const carta = result.criatura?.carta;
    const conquista = carta ? `<div class="tag-criatura-arte">${cartaHtml(carta, { size: 190, tag: 'div' })}</div>` : `<div class="tag-stamp">${stamp}</div>`;
    content.removeAttribute("aria-busy");
    content.innerHTML = `<article class="card tag-card tag-success"><p class="eyebrow">${escapeHtml(result.rota.nome)}</p>${conquista}<h1 class="page-title">${result.repetido ? 'Carta já está na coleção' : 'Carta desbloqueada!'}</h1><p class="page-subtitle">${escapeHtml(point.name)} · ${result.rota.feitos} de ${result.rota.total} pontos desta rota.</p>${result.certificado ? '<div class="tag-certificate">Rota completa · certificado liberado</div>' : ''}<p class="small muted">Visita confirmada hoje: ${result.hoje} passagem(ns) neste ponto.</p>${findPointByCode(code) ? '<p class="small muted">Esta carta já está disponível na sua coleção.</p>' : ''}<a class="primary-button button-full" href="/">Ver minha coleção</a></article>${result.criatura?.nova ? '' : cartaoCriatura(result)}${cartaoEvento(result, code)}${turma}${guardiao}`;
  } catch (error) {
    content.removeAttribute("aria-busy");
    content.innerHTML = `<div class="card tag-card tag-error" role="alert"><span class="tag-error-mark" aria-hidden="true">!</span><h1 class="page-title">${error.status === 404 ? 'Tag não encontrada' : 'Não foi possível carimbar'}</h1><p class="page-subtitle">${error.status === 404 ? 'Confira o código deste ponto.' : 'Tente novamente quando houver conexão.'}</p><button class="outline-button button-full" id="tag-retry" type="button">Tentar novamente</button><a class="text-link tag-back" href="/">Voltar à caderneta</a></div>`;
    document.getElementById('tag-retry')?.addEventListener('click', () => stamp(code));
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
