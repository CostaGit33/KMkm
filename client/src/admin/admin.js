// Página /admin do +1 KM: pontos, rotas, eventos, pessoas e registro. Só abre para conta com papel "admin".
import { CATEGORIES } from '../data.js';
import { $, $$, esc, req, mensagem, avisar, dialogo, confirmar, arrastavel, paraCampoLocal, legivel } from './ui.js';

const raiz = $('#raiz');
const S = { eu: null, dados: null, aba: 'pontos', busca: '', filtroStatus: 'todos', usuarios: null, buscaPessoa: '', pagina: 0, registro: null };
const nomeCategoria = (id) => CATEGORIES.find((c) => c.id === id)?.name || id;
const ABAS = [['pontos', 'Pontos'], ['rotas', 'Rotas'], ['eventos', 'Eventos'], ['pessoas', 'Pessoas'], ['registro', 'Registro']];

// ---------- entrada ----------
async function iniciar() {
  try {
    S.eu = (await req('GET', '/admin/eu'));
  } catch (erro) {
    if (erro.status === 401) return telaLogin();
    if (erro.status === 403) return telaSemPermissao();
    return telaErro(erro);
  }
  await recarregar();
  desenhar();
}

function telaLogin(mensagemErro = '') {
  raiz.innerHTML = `<div class="login"><form class="cartao" id="form-login"><h1 style="margin:0;font-size:20px">+1 KM · Administração</h1>
    <p class="ajuda" style="margin:0">Entre com a conta de administrador (a mesma do app).</p>
    ${mensagemErro ? `<div class="erro-form">${esc(mensagemErro)}</div>` : ''}
    <label class="campo"><span>E-mail</span><input type="email" name="email" autocomplete="username" required /></label>
    <label class="campo"><span>Senha</span><input type="password" name="senha" autocomplete="current-password" required /></label>
    <button class="btn pri" type="submit">Entrar</button></form></div>`;
  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try { await req('POST', '/conta/entrar', { email: f.get('email'), senha: f.get('senha') }); iniciar(); } catch (erro) { telaLogin(mensagem(erro)); }
  });
}

function telaSemPermissao() {
  raiz.innerHTML = `<div class="login"><div class="cartao"><h1 style="margin:0;font-size:20px">Sem permissão</h1>
    <p>Esta conta não é de administrador. No console do serviço no servidor, rode:</p>
    <p><code>node server/scripts/admin.js promover SEU@EMAIL</code></p>
    <p class="ajuda">Depois, recarregue esta página. A conta precisa já existir (crie pelo app, em Perfil).</p>
    <button class="btn" id="sair">Sair e trocar de conta</button> <a class="btn" href="/">Voltar ao app</a></div></div>`;
  $('#sair').addEventListener('click', sair);
}
function telaErro(erro) {
  raiz.innerHTML = `<div class="login"><div class="cartao"><h1 style="margin:0;font-size:20px">Não foi possível abrir</h1><p>${esc(mensagem(erro))}</p><button class="btn" id="tentar">Tentar de novo</button></div></div>`;
  $('#tentar').addEventListener('click', iniciar);
}
async function sair() {
  try { await req('POST', '/conta/sair'); } catch { /* sessão já inválida */ }
  telaLogin();
}

async function recarregar() { S.dados = await req('GET', '/admin/dados'); }

// ---------- esqueleto ----------
function desenhar() {
  raiz.innerHTML = `<header class="topo"><h1>+1 KM <small>Administração · Eunápolis</small></h1>
    <div class="quem"><span>${esc(S.eu.nome)}</span><a class="btn mini" href="/">Ver o app</a><button class="btn mini" id="sair">Sair</button></div></header>
    <nav class="abas" role="tablist">${ABAS.map(([id, rotulo]) => `<button role="tab" data-aba="${id}" aria-selected="${S.aba === id}">${rotulo}</button>`).join('')}</nav>
    <main id="conteudo"></main>`;
  $('#sair').addEventListener('click', sair);
  $$('.abas button').forEach((b) => b.addEventListener('click', () => { S.aba = b.dataset.aba; desenhar(); }));
  conteudo();
}

async function conteudo() {
  const el = $('#conteudo');
  try {
    if (S.aba === 'pontos') el.innerHTML = htmlPontos();
    else if (S.aba === 'rotas') el.innerHTML = htmlRotas();
    else if (S.aba === 'eventos') el.innerHTML = htmlEventos();
    else if (S.aba === 'pessoas') { el.innerHTML = '<p class="ajuda">Carregando…</p>'; if (!S.usuarios) await carregarPessoas(); el.innerHTML = htmlPessoas(); }
    else if (S.aba === 'registro') { el.innerHTML = '<p class="ajuda">Carregando…</p>'; S.registro = (await req('GET', '/admin/auditoria')).registros; el.innerHTML = htmlRegistro(); }
    ligarEventos(el);
  } catch (erro) { el.innerHTML = `<div class="erro-form">${esc(mensagem(erro))}</div>`; }
}

async function executar(promessa, sucesso) {
  try {
    const r = await promessa();
    if (sucesso) avisar(sucesso);
    await recarregar();
    conteudo();
    return r;
  } catch (erro) {
    avisar(mensagem(erro), 'erro');
    try { await recarregar(); conteudo(); } catch { /* sem rede */ }
    return null;
  }
}

// ---------- PONTOS ----------
function htmlPontos() {
  const { rotas, pontos } = S.dados;
  const q = S.busca.trim().toLowerCase();
  const filtrando = Boolean(q) || S.filtroStatus !== 'todos';
  const passa = (p) => (S.filtroStatus === 'todos' || p.status === S.filtroStatus) && (!q || `${p.codigo} ${p.nome}`.toLowerCase().includes(q));
  const grupos = rotas.map((r) => ({ r, itens: pontos.filter((p) => p.rota_id === r.id) })).filter((g) => g.itens.length || g.r.status !== 'arquivado');
  const total = pontos.length;
  const contagem = (s) => pontos.filter((p) => p.status === s).length;
  return `<div class="barra"><input type="search" id="busca-ponto" placeholder="Buscar por código ou nome" value="${esc(S.busca)}" aria-label="Buscar ponto" />
    <select id="filtro-status" aria-label="Filtrar por status"><option value="todos">Todos os status</option>${['publicado', 'pendente', 'arquivado'].map((s) => `<option value="${s}" ${S.filtroStatus === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select>
    <span class="espaco"></span><button class="btn pri" data-act="novo-ponto">+ Novo ponto</button></div>
    <p class="ajuda">${total} pontos · ${contagem('publicado')} publicados (recebem carimbo) · ${contagem('pendente')} pendentes · ${contagem('arquivado')} arquivados. Arraste a alça ⠿ (ou use ↑ ↓ com ela focada) para mudar a ordem; a ordem numera os carimbos da rota.${filtrando ? ' <b>Limpe a busca e o filtro para reordenar.</b>' : ''}</p>
    ${grupos.map(({ r, itens }) => {
      const vis = itens.filter(passa);
      return `<section class="grupo"><header><h3>${esc(r.nome)}</h3><span class="chip ${esc(r.status)}">${esc(r.status)}</span><span class="ajuda" style="margin:0">${itens.length} ponto(s)${r.status === 'editorial' ? ' · não recebem carimbo' : ''}</span><span class="espaco"></span></header>
        <ul class="lista" data-sort="pontos:${r.id}">${vis.length ? vis.map((p, i) => linhaPonto(p, i + 1, filtrando)).join('') : `<li class="vazio">${itens.length ? 'Nada nesta busca.' : 'Sem pontos nesta rota.'}</li>`}</ul></section>`;
    }).join('')}`;
}
function linhaPonto(p, n, travado) {
  const sem = p.lat == null;
  return `<li class="linha" data-key="${esc(p.codigo)}"><button class="alca" type="button" aria-label="Mover ${esc(p.nome)}" ${travado ? 'disabled title="Limpe a busca/filtro para reordenar"' : ''}>⠿</button>
    <span class="num">${p.ordem}</span>
    <div class="corpo"><div class="titulo">${esc(p.nome)} ${p.oculto ? '<span class="chip pendente" title="Aparece como mistério até ser descoberto">surpresa</span>' : ''}</div>
      <div class="meta"><span class="cod">${esc(p.codigo)}</span><span class="chip ${esc(p.status)}">${esc(p.status)}</span>
        <span class="${sem ? 'alerta' : ''}">${sem ? 'sem coordenadas' : `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`}</span>
        <span>${p.carimbos} carimbo(s)</span>${p.eventos ? `<span>${p.eventos} evento(s)</span>` : ''}<span>${p.categorias.map(nomeCategoria).join(' · ')}</span></div></div>
    <div class="acoes"><button class="btn mini" data-act="editar-ponto" data-id="${esc(p.codigo)}">Editar</button>
      ${p.status === 'publicado' ? `<button class="btn mini" data-act="status-ponto" data-id="${esc(p.codigo)}" data-valor="pendente">Despublicar</button>` : p.status === 'pendente' ? `<button class="btn mini" data-act="status-ponto" data-id="${esc(p.codigo)}" data-valor="publicado">Publicar</button>` : `<button class="btn mini" data-act="status-ponto" data-id="${esc(p.codigo)}" data-valor="pendente">Restaurar</button>`}
      ${p.status !== 'arquivado' ? `<button class="btn mini" data-act="status-ponto" data-id="${esc(p.codigo)}" data-valor="arquivado">Arquivar</button>` : ''}
      <button class="btn mini perigo" data-act="excluir-ponto" data-id="${esc(p.codigo)}">Excluir</button></div></li>`;
}

function proximoCodigo() {
  const nums = S.dados.pontos.map((p) => /^eu-(\d+)$/.exec(p.codigo)).filter(Boolean).map((m) => Number(m[1]));
  return `eu-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}

function formularioPonto(p) {
  const novo = !p;
  const d = p || { codigo: proximoCodigo(), nome: '', rota_id: S.dados.rotas.find((r) => r.status === 'publicado')?.id, categorias: [], icone: '✳', forma: 'c', parceiro: false, oculto: false, lat: null, lng: null, endereco: '', nota: '', fonte_mapa: '', status: 'pendente' };
  const rotas = S.dados.rotas.filter((r) => r.status !== 'arquivado' || r.id === d.rota_id);
  dialogo(`<form class="caixa" novalidate><header><h3>${novo ? 'Novo ponto' : `Editar ${esc(d.codigo)}`}</h3><button class="btn mini" type="button" data-fechar>Fechar</button></header>
    <div class="conteudo"><div class="erro-form" data-erro hidden></div>
      <div class="dois"><label class="campo"><span>Código <b>*</b></span><input type="text" name="codigo" value="${esc(d.codigo)}" ${novo ? '' : 'disabled'} autocapitalize="none" /></label>
        <label class="campo"><span>Rota de carimbo <b>*</b></span><select name="rota_id">${rotas.map((r) => `<option value="${r.id}" ${r.id === d.rota_id ? 'selected' : ''}>${esc(r.nome)}${r.status !== 'publicado' ? ` (${esc(r.status)})` : ''}</option>`).join('')}</select></label></div>
      <label class="campo"><span>Nome <b>*</b></span><input type="text" name="nome" value="${esc(d.nome)}" maxlength="160" /></label>
      <div class="campo"><span>Categorias <b>*</b></span><div class="chips-escolha">${CATEGORIES.map((c) => `<label><input type="checkbox" name="categorias" value="${c.id}" ${d.categorias.includes(c.id) ? 'checked' : ''} />${esc(c.name)}</label>`).join('')}</div></div>
      <label class="campo"><span>Coordenadas — cole “lat, lng” do Google Maps no primeiro campo</span></label>
      <div class="dois"><label class="campo"><span>Latitude</span><input type="text" name="lat" inputmode="decimal" value="${d.lat ?? ''}" placeholder="-16.3751286" /></label>
        <label class="campo"><span>Longitude</span><input type="text" name="lng" inputmode="decimal" value="${d.lng ?? ''}" placeholder="-39.5881012" /></label></div>
      <a class="mapa-link" data-mapa target="_blank" rel="noopener noreferrer" hidden>Conferir no Google Maps ↗</a>
      <label class="campo"><span>Endereço</span><input type="text" name="endereco" value="${esc(d.endereco)}" maxlength="200" /></label>
      <label class="campo"><span>Fonte da coordenada</span><input type="text" name="fonte_mapa" value="${esc(d.fonte_mapa)}" maxlength="80" placeholder="Ex.: conferido em campo em 12/10" /></label>
      <label class="campo"><span>Descrição curta (aparece na página do ponto)</span><textarea name="nota" maxlength="400">${esc(d.nota)}</textarea></label>
      <h4 style="margin:14px 0 4px">Carta do personagem</h4>
      <div class="dois"><label class="campo"><span>Personagem (vazio = automático)</span><input type="text" name="criatura" value="${esc(d.criatura || '')}" maxlength="60" /></label>
        <label class="campo"><span>Categoria da carta</span><select name="categoria_carta">${[['natureza', 'Natureza'], ['historia', 'História'], ['cultura', 'Cultura'], ['trabalho', 'Trabalho'], ['litoral', 'Litoral'], ['misterio', 'Mistério']].map(([v, n]) => `<option value="${v}" ${(d.categoria_carta || '') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <div class="dois"><label class="campo"><span>Raridade</span><select name="raridade">${['comum', 'raro', 'epico', 'lendario'].map((r) => `<option value="${r}" ${(d.raridade || 'comum') === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
        <label class="campo"><span>Arte (arquivo em /cartas/)</span><input type="text" name="arte" value="${esc(d.arte || '')}" maxlength="80" placeholder="Ex.: 03.webp" /></label></div>
      <label class="campo"><span>História do personagem (até 400 caracteres)</span><textarea name="historia" maxlength="400">${esc(d.historia || '')}</textarea></label>
      <label class="campo"><span>Frase da carta</span><input type="text" name="frase" value="${esc(d.frase || '')}" maxlength="160" /></label>
      <div class="dois"><label class="campo"><span>Ícone do carimbo</span><input type="text" name="icone" value="${esc(d.icone)}" maxlength="4" /></label>
        <label class="campo"><span>Formato do carimbo</span><select name="forma"><option value="c" ${d.forma === 'c' ? 'selected' : ''}>Círculo</option><option value="r" ${d.forma === 'r' ? 'selected' : ''}>Retângulo</option></select></label></div>
      ${novo ? `<label class="campo"><span>Status inicial</span><select name="status"><option value="pendente">Pendente (valide em campo antes de publicar)</option><option value="publicado">Publicado (já recebe carimbo)</option></select></label>` : ''}
      <div class="chips-escolha"><label><input type="checkbox" name="oculto" ${d.oculto ? 'checked' : ''} />Ponto-surpresa (aparece como mistério)</label><label><input type="checkbox" name="parceiro" ${d.parceiro ? 'checked' : ''} />Parceiro</label></div></div>
    <footer><button class="btn" type="button" data-fechar>Cancelar</button><button class="btn pri" type="submit">${novo ? 'Criar ponto' : 'Salvar'}</button></footer></form>`, (el, fechar) => {
    const f = $('form', el);
    const lat = f.elements.lat, lng = f.elements.lng;
    const link = $('[data-mapa]', el);
    const atualizarLink = () => {
      const a = Number(lat.value.replace(',', '.')), b = Number(lng.value.replace(',', '.'));
      const valido = lat.value.trim() && lng.value.trim() && Number.isFinite(a) && Number.isFinite(b);
      link.hidden = !valido;
      if (valido) link.href = `https://www.google.com/maps?q=${a},${b}`;
    };
    // Aceita “-16.3751286, -39.5881012” colado no campo de latitude.
    lat.addEventListener('input', () => {
      const m = /^\s*(-?\d+(?:[.,]\d+)?)\s*[,;]\s*(-?\d+(?:[.,]\d+)?)\s*$/.exec(lat.value);
      if (m) { lat.value = m[1]; lng.value = m[2]; }
      atualizarLink();
    });
    lng.addEventListener('input', atualizarLink);
    atualizarLink();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const corpo = {
        codigo: String(fd.get('codigo') || '').trim().toLowerCase(), rota_id: Number(fd.get('rota_id')), nome: fd.get('nome'),
        categorias: fd.getAll('categorias'), lat: fd.get('lat'), lng: fd.get('lng'), endereco: fd.get('endereco'), fonte_mapa: fd.get('fonte_mapa'), nota: fd.get('nota'),
        criatura: fd.get('criatura'), raridade: fd.get('raridade'), categoria_carta: fd.get('categoria_carta'), frase: fd.get('frase'), historia: fd.get('historia'), arte: fd.get('arte'), icone: fd.get('icone'), forma: fd.get('forma'), oculto: fd.get('oculto') === 'on', parceiro: fd.get('parceiro') === 'on', status: fd.get('status') || undefined,
      };
      if (corpo.status === 'publicado' && !corpo.lat && !(await confirmar('Publicar sem coordenadas?', 'O ponto não vai aparecer no mapa, mas já poderá receber carimbo. Publicar assim mesmo?'))) return;
      const botao = $('button[type=submit]', f); botao.disabled = true;
      try {
        if (novo) await req('POST', '/admin/pontos', corpo); else await req('PUT', `/admin/pontos/${encodeURIComponent(d.codigo)}`, corpo);
        fechar(); avisar(novo ? 'Ponto criado.' : 'Ponto salvo.'); await recarregar(); conteudo();
      } catch (erro) { const box = $('[data-erro]', el); box.hidden = false; box.textContent = mensagem(erro); box.scrollIntoView({ block: 'nearest' }); botao.disabled = false; }
    });
  });
}

// ---------- ROTAS (circuitos + rotas de carimbo) ----------
function htmlRotas() {
  const { circuitos, rotas } = S.dados;
  return `<h2 style="margin-top:4px">Circuitos <span class="ajuda" style="margin:0">— o que aparece em “Rotas” no app</span></h2>
    <p class="ajuda">Um circuito é uma lista ordenada de pontos que a pessoa percorre. O mesmo ponto pode estar em vários circuitos. Arraste ⠿ para ordenar os circuitos.</p>
    <div class="barra"><span class="espaco"></span><button class="btn pri" data-act="novo-circuito">+ Novo circuito</button></div>
    <div class="grupo"><ul class="lista" data-sort="circuitos">${circuitos.length ? circuitos.map((c) => `<li class="linha" data-key="${c.id}"><button class="alca" type="button" aria-label="Mover ${esc(c.nome)}">⠿</button>
      <div class="corpo"><div class="titulo">${esc(c.icone || '')} ${esc(c.nome)}</div><div class="meta"><span class="chip ${c.status === 'publicado' ? 'publicado' : 'rascunho'}">${esc(c.status)}</span><span>${c.codigos.length} ponto(s)</span><span>${esc(c.subtitulo || '')}</span></div></div>
      <div class="acoes"><button class="btn mini" data-act="pontos-circuito" data-id="${c.id}">Pontos e ordem</button><button class="btn mini" data-act="editar-circuito" data-id="${c.id}">Editar</button><button class="btn mini perigo" data-act="excluir-circuito" data-id="${c.id}">Excluir</button></div></li>`).join('') : '<li class="vazio">Nenhum circuito ainda.</li>'}</ul></div>
    <h2>Rotas de carimbo <span class="ajuda" style="margin:0">— regra do certificado</span></h2>
    <p class="ajuda">Cada ponto pertence a uma rota de carimbo. A pessoa ganha o certificado ao carimbar todos os pontos da rota. Rotas “editorial” ou “arquivado” não recebem carimbo.</p>
    <div class="barra"><span class="espaco"></span><button class="btn pri" data-act="nova-rota">+ Nova rota de carimbo</button></div>
    ${rotas.map((r) => `<div class="cartao"><div class="topo-cartao"><div class="corpo"><h3>${esc(r.nome)}</h3><div class="meta" style="color:var(--suave);font-size:13px;display:flex;gap:10px;flex-wrap:wrap;margin-top:4px"><span class="chip ${esc(r.status)}">${esc(r.status)}</span><span>${r.pontos} ponto(s)</span>${r.km != null ? `<span>${r.km} km</span>` : ''}<span>${esc(r.tipo)}</span></div></div>
      <div class="acoes" style="margin:0"><button class="btn mini" data-act="editar-rota" data-id="${r.id}">Editar</button><button class="btn mini perigo" data-act="excluir-rota" data-id="${r.id}">Excluir</button></div></div></div>`).join('')}`;
}

function formularioCircuito(c) {
  const novo = !c;
  const d = c || { nome: '', subtitulo: '', icone: '✳', cor: 'ochre', status: 'publicado' };
  const cores = [['ochre', 'Ocre'], ['green', 'Verde'], ['blue', 'Azul'], ['red', 'Vermelho']];
  dialogo(`<form class="caixa" novalidate><header><h3>${novo ? 'Novo circuito' : 'Editar circuito'}</h3><button class="btn mini" type="button" data-fechar>Fechar</button></header>
    <div class="conteudo"><div class="erro-form" data-erro hidden></div>
      <label class="campo"><span>Nome <b>*</b></span><input type="text" name="nome" value="${esc(d.nome)}" maxlength="160" /></label>
      <label class="campo"><span>Subtítulo</span><input type="text" name="subtitulo" value="${esc(d.subtitulo)}" maxlength="200" /></label>
      <div class="dois"><label class="campo"><span>Ícone</span><input type="text" name="icone" value="${esc(d.icone)}" maxlength="4" /></label>
        <label class="campo"><span>Cor</span><select name="cor">${cores.map(([v, n]) => `<option value="${v}" ${d.cor === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <label class="campo"><span>Situação</span><select name="status"><option value="publicado" ${d.status === 'publicado' ? 'selected' : ''}>Publicado (aparece no app)</option><option value="rascunho" ${d.status === 'rascunho' ? 'selected' : ''}>Rascunho (escondido)</option></select></label></div>
    <footer><button class="btn" type="button" data-fechar>Cancelar</button><button class="btn pri" type="submit">Salvar</button></footer></form>`, (el, fechar) => {
    $('form', el).addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      try { if (novo) await req('POST', '/admin/circuitos', fd); else await req('PUT', `/admin/circuitos/${c.id}`, fd); fechar(); avisar('Circuito salvo.'); await recarregar(); conteudo(); }
      catch (erro) { const box = $('[data-erro]', el); box.hidden = false; box.textContent = mensagem(erro); }
    });
  });
}

function editorPontosCircuito(c) {
  let lista = [...c.codigos];
  const porCodigo = (cod) => S.dados.pontos.find((p) => p.codigo === cod);
  dialogo(`<div class="caixa"><header><h3>${esc(c.nome)} · pontos e ordem</h3><button class="btn mini" type="button" data-fechar>Fechar</button></header>
    <div class="conteudo"><div class="erro-form" data-erro hidden></div><p class="ajuda" style="margin:0">Arraste ⠿ para ordenar. Pontos arquivados continuam na lista mas não aparecem no app.</p>
      <div class="grupo" style="margin:0"><ul class="lista" data-lista></ul></div>
      <div class="dois" style="grid-template-columns:1fr auto"><select data-add aria-label="Adicionar ponto"></select><button class="btn" type="button" data-add-btn>Adicionar</button></div></div>
    <footer><button class="btn" type="button" data-fechar>Cancelar</button><button class="btn pri" type="button" data-salvar>Salvar ordem</button></footer></div>`, (el, fechar) => {
    const ul = $('[data-lista]', el), sel = $('[data-add]', el);
    const desenharLista = () => {
      ul.innerHTML = lista.length ? lista.map((cod, i) => { const p = porCodigo(cod); return `<li class="linha" data-key="${esc(cod)}"><button class="alca" type="button" aria-label="Mover ${esc(p?.nome || cod)}">⠿</button><span class="num">${i + 1}</span><div class="corpo"><div class="titulo">${esc(p?.nome || cod)}</div><div class="meta"><span class="cod">${esc(cod)}</span>${p ? `<span class="chip ${esc(p.status)}">${esc(p.status)}</span>` : ''}</div></div><button class="btn mini perigo" type="button" data-tirar="${esc(cod)}">Tirar</button></li>`; }).join('') : '<li class="vazio">Sem pontos. Adicione abaixo.</li>';
      const livres = S.dados.pontos.filter((p) => !lista.includes(p.codigo) && p.status !== 'arquivado');
      sel.innerHTML = livres.map((p) => `<option value="${esc(p.codigo)}">${esc(p.codigo)} · ${esc(p.nome)}</option>`).join('') || '<option value="">Todos já estão no circuito</option>';
      $('[data-add-btn]', el).disabled = !livres.length;
    };
    arrastavel(ul, (chaves) => { lista = chaves; desenharLista(); });
    ul.addEventListener('click', (e) => { const b = e.target.closest('[data-tirar]'); if (b) { lista = lista.filter((x) => x !== b.dataset.tirar); desenharLista(); } });
    $('[data-add-btn]', el).addEventListener('click', () => { if (sel.value) { lista.push(sel.value); desenharLista(); } });
    $('[data-salvar]', el).addEventListener('click', async () => {
      try { await req('PUT', `/admin/circuitos/${c.id}/pontos`, { codigos: lista }); fechar(); avisar('Circuito atualizado.'); await recarregar(); conteudo(); }
      catch (erro) { const box = $('[data-erro]', el); box.hidden = false; box.textContent = mensagem(erro); }
    });
    desenharLista();
  });
}

function formularioRota(r) {
  const novo = !r;
  const d = r || { nome: '', tipo: 'cidade', cor: 'folha', km: '', status: 'publicado' };
  dialogo(`<form class="caixa" novalidate><header><h3>${novo ? 'Nova rota de carimbo' : 'Editar rota de carimbo'}</h3><button class="btn mini" type="button" data-fechar>Fechar</button></header>
    <div class="conteudo"><div class="erro-form" data-erro hidden></div>
      <label class="campo"><span>Nome <b>*</b></span><input type="text" name="nome" value="${esc(d.nome)}" maxlength="160" /></label>
      <div class="dois"><label class="campo"><span>Tipo</span><select name="tipo">${['cidade', 'caminhada', 'pedal', 'corrida'].map((t) => `<option ${d.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="campo"><span>Quilometragem (opcional)</span><input type="text" name="km" inputmode="decimal" value="${d.km ?? ''}" placeholder="6,5" /></label></div>
      <label class="campo"><span>Situação</span><select name="status"><option value="publicado" ${d.status === 'publicado' ? 'selected' : ''}>Publicado (pontos publicados recebem carimbo)</option><option value="editorial" ${d.status === 'editorial' ? 'selected' : ''}>Editorial (só catálogo, sem carimbo)</option><option value="arquivado" ${d.status === 'arquivado' ? 'selected' : ''}>Arquivado</option></select></label></div>
    <footer><button class="btn" type="button" data-fechar>Cancelar</button><button class="btn pri" type="submit">Salvar</button></footer></form>`, (el, fechar) => {
    $('form', el).addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target)); fd.cor = d.cor;
      try { if (novo) await req('POST', '/admin/rotas', fd); else await req('PUT', `/admin/rotas/${r.id}`, fd); fechar(); avisar('Rota salva.'); await recarregar(); conteudo(); }
      catch (erro) { const box = $('[data-erro]', el); box.hidden = false; box.textContent = mensagem(erro); }
    });
  });
}

// ---------- EVENTOS ----------
const estadoEvento = (e) => { if (e.status === 'cancelado') return 'cancelado'; if (e.status === 'rascunho') return 'rascunho'; const agora = Date.now(); if (agora < Date.parse(e.inicio_em)) return 'em_breve'; if (agora >= Date.parse(e.fim_em)) return 'encerrado'; return 'ao_vivo'; };
const ROTULO_ESTADO = { ao_vivo: 'ao vivo', em_breve: 'em breve', encerrado: 'encerrado', cancelado: 'cancelado', rascunho: 'rascunho' };
function htmlEventos() {
  const { eventos, patrocinadores, fuso } = S.dados;
  return `<div class="barra"><span class="espaco"></span><button class="btn pri" data-act="novo-evento">+ Novo evento ou patrocínio</button></div>
    <p class="ajuda">Um card dá um segundo carimbo (do evento) a quem toca num dos pontos durante a janela. Cada ponto só pode ter um card por vez. Horários em Bahia (${esc(fuso)}).</p>
    ${eventos.length ? eventos.map((e) => { const est = estadoEvento(e); return `<div class="cartao"><div class="topo-cartao"><div class="corpo"><h3>${esc(e.nome)}</h3>
      <div style="color:var(--suave);font-size:13px;display:flex;gap:6px 12px;flex-wrap:wrap;margin-top:4px"><span class="chip ${est}">${ROTULO_ESTADO[est]}</span><span>${e.tipo === 'patrocinio' ? `Patrocínio${e.patrocinador ? ` · ${esc(e.patrocinador)}` : ''}` : 'Evento'}</span><span>${legivel(e.inicio_em, fuso)} → ${legivel(e.fim_em, fuso)}</span><span>${e.carimbos} carimbo(s)</span>${e.tiragem ? `<span>Edição numerada: ${e.emitidos}/${e.tiragem}${e.emitidos >= e.tiragem ? ' · esgotada' : ''}</span>` : ''}</div>
      ${e.descricao ? `<p class="ajuda" style="margin:6px 0 0">${esc(e.descricao)}</p>` : ''}<div class="pontos-chips">${e.codigos.map((c) => `<span class="cod">${esc(c)}</span>`).join('')}</div></div></div>
      <div class="acoes"><button class="btn mini" data-act="editar-evento" data-id="${esc(e.slug)}">Editar</button>
        ${e.status !== 'publicado' && e.status !== 'cancelado' ? `<button class="btn mini pri" data-act="status-evento" data-id="${esc(e.slug)}" data-valor="publicado">Publicar</button>` : ''}
        ${e.status === 'publicado' ? `<button class="btn mini" data-act="status-evento" data-id="${esc(e.slug)}" data-valor="cancelado">Cancelar</button>${e.carimbos ? '' : `<button class="btn mini" data-act="status-evento" data-id="${esc(e.slug)}" data-valor="rascunho">Voltar a rascunho</button>`}` : ''}
        ${e.status === 'cancelado' ? `<button class="btn mini" data-act="status-evento" data-id="${esc(e.slug)}" data-valor="publicado">Reativar</button>` : ''}
        <button class="btn mini" data-act="relatorio" data-id="${esc(e.slug)}">Relatório</button><button class="btn mini perigo" data-act="excluir-evento" data-id="${esc(e.slug)}">Excluir</button></div></div>`; }).join('') : '<div class="vazio">Nenhum card cadastrado.</div>'}
    ${patrocinadores.length ? `<h2>Patrocinadores</h2><div class="grupo"><ul class="lista">${patrocinadores.map((p) => `<li class="linha"><div class="corpo"><div class="titulo">${esc(p.nome)}</div><div class="meta"><span>${p.eventos} evento(s)</span></div></div><button class="btn mini perigo" data-act="excluir-patrocinador" data-id="${p.id}" ${p.eventos ? 'disabled' : ''}>Excluir</button></li>`).join('')}</ul></div>` : ''}`;
}

function formularioEvento(ev) {
  const novo = !ev;
  const { pontos, fuso, patrocinadores, limites_patrocinio: lim } = S.dados;
  const travado = Boolean(ev && ev.carimbos > 0);
  const agora = new Date();
  const d = ev || { nome: '', slug: '', tipo: 'evento', descricao: '', patrocinador: '', inicio_em: agora.toISOString(), fim_em: new Date(agora.getTime() + 7 * 864e5).toISOString(), codigos: [], status: 'rascunho' };
  const elegiveis = pontos.filter((p) => p.status !== 'arquivado' || d.codigos.includes(p.codigo));
  dialogo(`<form class="caixa" novalidate><header><h3>${novo ? 'Novo card' : `Editar ${esc(d.nome)}`}</h3><button class="btn mini" type="button" data-fechar>Fechar</button></header>
    <div class="conteudo"><div class="erro-form" data-erro hidden></div>
      ${travado ? '<div class="erro-form" style="background:var(--ouro-fundo);border-color:#6b5220;color:var(--ouro)">Este card já tem carimbos: só nome e descrição podem mudar (mudar janela ou pontos falsearia o relatório).</div>' : ''}
      <label class="campo"><span>Nome <b>*</b></span><input type="text" name="nome" value="${esc(d.nome)}" maxlength="160" /></label>
      <div class="dois"><label class="campo"><span>Tipo</span><select name="tipo" ${travado ? 'disabled' : ''}><option value="evento" ${d.tipo === 'evento' ? 'selected' : ''}>Evento</option><option value="patrocinio" ${d.tipo === 'patrocinio' ? 'selected' : ''}>Patrocínio (${lim.minimo}–${lim.maximo} pontos)</option></select></label>
        <label class="campo" data-bloco-patro><span>Patrocinador <b>*</b></span><input type="text" name="patrocinador" list="lista-patro" value="${esc(d.patrocinador || '')}" maxlength="120" ${travado ? 'disabled' : ''} /><datalist id="lista-patro">${patrocinadores.map((p) => `<option value="${esc(p.nome)}">`).join('')}</datalist></label></div>
      <label class="campo"><span>Tiragem numerada (opcional)</span><input type="number" name="tiragem" min="1" max="100000" step="1" value="${d.tiragem ?? ''}" placeholder="Ex.: 100 → carimbo nº N/100" ${travado ? 'disabled' : ''} /><small class="ajuda">Cada pessoa recebe um número único, em ordem de chegada. Trava depois do primeiro carimbo.</small></label>
      <label class="campo"><span>Descrição (até 400 caracteres)</span><textarea name="descricao" maxlength="400">${esc(d.descricao || '')}</textarea></label>
      <div class="dois"><label class="campo"><span>Início (Bahia) <b>*</b></span><input type="datetime-local" name="inicio" value="${paraCampoLocal(d.inicio_em, fuso)}" ${travado ? 'disabled' : ''} /></label>
        <label class="campo"><span>Fim (Bahia) <b>*</b></span><input type="datetime-local" name="fim" value="${paraCampoLocal(d.fim_em, fuso)}" ${travado ? 'disabled' : ''} /></label></div>
      <div class="campo"><span>Pontos do card <b>*</b> <em data-contagem style="font-style:normal"></em></span><div class="checklista">${elegiveis.map((p) => `<label><input type="checkbox" name="codigos" value="${esc(p.codigo)}" ${d.codigos.includes(p.codigo) ? 'checked' : ''} ${travado ? 'disabled' : ''} /><span class="cod">${esc(p.codigo)}</span> ${esc(p.nome)} ${p.status !== 'publicado' ? `<span class="chip ${esc(p.status)}">${esc(p.status)}</span>` : ''}</label>`).join('')}</div></div>
      ${novo || d.status !== 'publicado' ? `<div class="chips-escolha"><label><input type="checkbox" name="publicar" />Publicar agora (exige pontos publicados)</label></div>` : ''}</div>
    <footer><button class="btn" type="button" data-fechar>Cancelar</button><button class="btn pri" type="submit">${novo ? 'Criar card' : 'Salvar'}</button></footer></form>`, (el, fechar) => {
    const f = $('form', el);
    const sync = () => {
      const patro = f.elements.tipo.value === 'patrocinio';
      $('[data-bloco-patro]', el).style.opacity = patro ? 1 : .4;
      const n = $$('input[name=codigos]:checked', f).length;
      $('[data-contagem]', el).textContent = patro ? `— ${n} escolhido(s), precisa de ${lim.minimo} a ${lim.maximo}` : `— ${n} escolhido(s)`;
    };
    f.addEventListener('change', sync); sync();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const corpo = travado ? { nome: fd.get('nome'), descricao: fd.get('descricao') } : {
        nome: fd.get('nome'), tipo: fd.get('tipo'), descricao: fd.get('descricao'), patrocinador: fd.get('tipo') === 'patrocinio' ? fd.get('patrocinador') : '',
        inicio: String(fd.get('inicio') || '').replace('T', ' '), fim: String(fd.get('fim') || '').replace('T', ' '), codigos: fd.getAll('codigos'), tiragem: fd.get('tiragem'), publicar: fd.get('publicar') === 'on',
      };
      const botao = $('button[type=submit]', f); botao.disabled = true;
      try {
        if (novo) await req('POST', '/admin/eventos', corpo); else await req('PUT', `/admin/eventos/${encodeURIComponent(ev.slug)}`, corpo);
        if (!novo && !travado && fd.get('publicar') === 'on') await req('POST', `/admin/eventos/${encodeURIComponent(ev.slug)}/status`, { status: 'publicado' });
        fechar(); avisar('Card salvo.'); await recarregar(); conteudo();
      } catch (erro) { const box = $('[data-erro]', el); box.hidden = false; box.textContent = mensagem(erro); box.scrollIntoView({ block: 'nearest' }); botao.disabled = false; }
    });
  });
}

async function mostrarRelatorio(slug) {
  try {
    const r = await req('GET', `/admin/eventos/${encodeURIComponent(slug)}/relatorio`);
    dialogo(`<div class="caixa"><header><h3>Relatório · ${esc(r.evento.nome)}</h3><button class="btn mini" type="button" data-fechar>Fechar</button></header><div class="conteudo">
      <p class="ajuda" style="margin:0">Dados agregados, sem nome nem e-mail de ninguém. Contagens abaixo de ${r.minimo_para_exibir} aparecem como “&lt;${r.minimo_para_exibir}”.</p>
      <div class="rel"><div class="par"><span>Carimbos</span><b>${esc(r.carimbos)}</b></div><div class="par"><span>Pessoas</span><b>${esc(r.pessoas)}</b></div><div class="par"><span>Coleção completa</span><b>${esc(r.colecao_completa)}</b></div></div>
      <h3>Por ponto</h3><div class="rel">${r.por_ponto.map((p) => `<div class="par"><span>${esc(p.nome)}</span><b>${esc(p.carimbos)}</b></div>`).join('')}</div>
      <h3>Por dia</h3><div class="rel">${r.por_dia.length ? r.por_dia.map((p) => `<div class="par"><span>${esc(p.dia)}</span><b>${esc(p.carimbos)}</b></div>`).join('') : '<span class="ajuda">Ainda sem carimbos.</span>'}</div></div>
      <footer><button class="btn pri" type="button" data-fechar>Fechar</button></footer></div>`);
  } catch (erro) { avisar(mensagem(erro), 'erro'); }
}

// ---------- PESSOAS ----------
async function carregarPessoas() {
  S.usuarios = await req('GET', `/admin/usuarios?q=${encodeURIComponent(S.buscaPessoa)}&pagina=${S.pagina}`);
}
function htmlPessoas() {
  const u = S.usuarios;
  const paginas = Math.max(1, Math.ceil(u.total / u.por_pagina));
  return `<div class="barra"><input type="search" id="busca-pessoa" placeholder="Buscar por nome, apelido ou e-mail" value="${esc(S.buscaPessoa)}" aria-label="Buscar pessoa" /><button class="btn" data-act="buscar-pessoa">Buscar</button><span class="espaco"></span><span class="ajuda" style="margin:0">${u.total} pessoa(s)</span></div>
    <p class="ajuda">Dados pessoais (e-mail): use só para suporte e não compartilhe. Excluir apaga a conta e todos os carimbos da pessoa e não tem volta.</p>
    <div class="rolagem"><table class="tabela"><thead><tr><th>Pessoa</th><th>E-mail</th><th>Papel</th><th>Carimbos</th><th>Desde</th><th></th></tr></thead><tbody>
    ${u.usuarios.map((p) => `<tr><td>${esc(p.nome || p.apelido)}</td><td>${esc(p.email || '—')}</td><td><span class="chip ${esc(p.papel)}">${p.papel === 'sem_conta' ? 'sem conta' : esc(p.papel)}</span></td><td>${p.carimbos}</td><td>${legivel(p.criado_em, S.dados.fuso)}</td>
      <td style="white-space:nowrap"><button class="btn mini" data-act="ver-carimbos" data-id="${p.usuario_id}">Carimbos</button>
      ${p.conta_id && p.conta_id !== S.eu.conta_id ? `<button class="btn mini" data-act="papel" data-id="${p.usuario_id}" data-valor="${p.papel === 'admin' ? 'usuario' : 'admin'}" data-nome="${esc(p.nome || p.apelido)}">${p.papel === 'admin' ? 'Remover admin' : 'Tornar admin'}</button>` : ''}
      ${p.conta_id !== S.eu.conta_id ? `<button class="btn mini perigo" data-act="excluir-pessoa" data-id="${p.usuario_id}" data-nome="${esc(p.nome || p.apelido)}">Excluir</button>` : '<span class="ajuda">(você)</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Ninguém encontrado.</td></tr>'}
    </tbody></table></div>
    ${paginas > 1 ? `<div class="barra" style="margin-top:12px"><button class="btn" data-act="pag" data-valor="${S.pagina - 1}" ${S.pagina <= 0 ? 'disabled' : ''}>← Anterior</button><span class="ajuda" style="margin:0">Página ${S.pagina + 1} de ${paginas}</span><button class="btn" data-act="pag" data-valor="${S.pagina + 1}" ${S.pagina + 1 >= paginas ? 'disabled' : ''}>Próxima →</button></div>` : ''}`;
}

// ---------- REGISTRO ----------
function htmlRegistro() {
  return `<p class="ajuda">Últimas 200 ações de administração (quem, o quê e quando).</p><div class="rolagem"><table class="tabela"><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Alvo</th><th>Detalhe</th></tr></thead><tbody>
    ${S.registro.map((r) => `<tr><td>${legivel(r.criado_em, S.dados.fuso)}</td><td>${esc(r.quem)}</td><td><code>${esc(r.acao)}</code></td><td>${esc(r.alvo || '')}</td><td>${esc(r.detalhe || '')}</td></tr>`).join('') || '<tr><td colspan="5" class="vazio">Nada registrado ainda.</td></tr>'}</tbody></table></div>`;
}

// ---------- eventos da tela ----------
function ligarEventos(el) {
  $$('[data-sort]', el).forEach((caixa) => {
    const [tipo, id] = caixa.dataset.sort.split(':');
    arrastavel(caixa, async (chaves) => {
      if (tipo === 'pontos') await executar(() => req('PUT', `/admin/rotas/${id}/ordem`, { codigos: chaves }), 'Ordem salva.');
      else await executar(() => req('PUT', '/admin/circuitos/ordem', { ids: chaves.map(Number) }), 'Ordem salva.');
    });
  });
  const busca = $('#busca-ponto', el);
  if (busca) {
    busca.addEventListener('input', () => { S.busca = busca.value; const pos = busca.selectionStart; $('#conteudo').innerHTML = htmlPontos(); ligarEventos($('#conteudo')); const novo = $('#busca-ponto'); novo.focus(); novo.setSelectionRange(pos, pos); });
    $('#filtro-status', el).addEventListener('change', (e) => { S.filtroStatus = e.target.value; conteudo(); });
  }
  const pessoa = $('#busca-pessoa', el);
  if (pessoa) pessoa.addEventListener('keydown', (e) => { if (e.key === 'Enter') { S.buscaPessoa = pessoa.value; S.pagina = 0; S.usuarios = null; conteudo(); } });
  el.onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const { act, id, valor } = b.dataset;
    const ponto = () => S.dados.pontos.find((p) => p.codigo === id);
    if (act === 'novo-ponto') formularioPonto(null);
    else if (act === 'editar-ponto') formularioPonto(ponto());
    else if (act === 'status-ponto') {
      if (valor === 'arquivado' && !(await confirmar('Arquivar ponto?', `“${ponto().nome}” sai do app e deixa de receber carimbo. Os carimbos já dados continuam guardados.`, { rotulo: 'Arquivar' }))) return;
      if (valor === 'publicado' && ponto().lat == null && !(await confirmar('Publicar sem coordenadas?', 'O ponto não vai aparecer no mapa, mas já poderá receber carimbo (confirme a validação em campo).', { rotulo: 'Publicar' }))) return;
      await executar(() => req('POST', `/admin/pontos/${encodeURIComponent(id)}/status`, { status: valor }), valor === 'publicado' ? 'Ponto publicado.' : valor === 'arquivado' ? 'Ponto arquivado.' : 'Ponto atualizado.');
    } else if (act === 'excluir-ponto') {
      if (await confirmar('Excluir ponto?', `“${ponto().nome}” será apagado de vez. Só é possível se ninguém tiver carimbado; do contrário, arquive.`, { rotulo: 'Excluir', perigo: true })) await executar(() => req('DELETE', `/admin/pontos/${encodeURIComponent(id)}`), 'Ponto excluído.');
    } else if (act === 'novo-circuito') formularioCircuito(null);
    else if (act === 'editar-circuito') formularioCircuito(S.dados.circuitos.find((c) => String(c.id) === id));
    else if (act === 'pontos-circuito') editorPontosCircuito(S.dados.circuitos.find((c) => String(c.id) === id));
    else if (act === 'excluir-circuito') {
      const c = S.dados.circuitos.find((x) => String(x.id) === id);
      if (await confirmar('Excluir circuito?', `“${c.nome}” sai do app. Os pontos continuam existindo.`, { rotulo: 'Excluir', perigo: true })) await executar(() => req('DELETE', `/admin/circuitos/${id}`), 'Circuito excluído.');
    } else if (act === 'nova-rota') formularioRota(null);
    else if (act === 'editar-rota') formularioRota(S.dados.rotas.find((r) => String(r.id) === id));
    else if (act === 'excluir-rota') {
      const r = S.dados.rotas.find((x) => String(x.id) === id);
      if (await confirmar('Excluir rota de carimbo?', `“${r.nome}” só pode ser excluída se não tiver pontos.`, { rotulo: 'Excluir', perigo: true })) await executar(() => req('DELETE', `/admin/rotas/${id}`), 'Rota excluída.');
    } else if (act === 'novo-evento') formularioEvento(null);
    else if (act === 'editar-evento') formularioEvento(S.dados.eventos.find((x) => x.slug === id));
    else if (act === 'status-evento') {
      if (valor === 'cancelado' && !(await confirmar('Cancelar card?', 'Ele deixa de dar carimbos. Os carimbos já dados continuam guardados.', { rotulo: 'Cancelar card' }))) return;
      await executar(() => req('POST', `/admin/eventos/${encodeURIComponent(id)}/status`, { status: valor }), 'Card atualizado.');
    } else if (act === 'relatorio') mostrarRelatorio(id);
    else if (act === 'excluir-evento') {
      if (await confirmar('Excluir card?', 'Só é possível se ninguém tiver carimbado nele.', { rotulo: 'Excluir', perigo: true })) await executar(() => req('DELETE', `/admin/eventos/${encodeURIComponent(id)}`), 'Card excluído.');
    } else if (act === 'excluir-patrocinador') await executar(() => req('DELETE', `/admin/patrocinadores/${id}`), 'Patrocinador excluído.');
    else if (act === 'buscar-pessoa') { S.buscaPessoa = $('#busca-pessoa').value; S.pagina = 0; S.usuarios = null; conteudo(); }
    else if (act === 'pag') { S.pagina = Number(valor); S.usuarios = null; conteudo(); }
    else if (act === 'ver-carimbos') {
      try {
        const { carimbos } = await req('GET', `/admin/usuarios/${id}/carimbos`);
        dialogo(`<div class="caixa"><header><h3>Carimbos da pessoa</h3><button class="btn mini" type="button" data-fechar>Fechar</button></header><div class="conteudo">${carimbos.length ? `<div class="rel">${carimbos.map((c) => `<div class="par"><span><span class="cod">${esc(c.codigo)}</span> ${esc(c.nome)}${c.evento ? ` · card ${esc(c.evento)}` : ''}${c.especial ? ` · ${esc(c.especial)}` : ''}</span><span>${legivel(c.criado_em, S.dados.fuso)}</span></div>`).join('')}</div>` : '<p class="ajuda">Sem carimbos.</p>'}</div><footer><button class="btn pri" data-fechar type="button">Fechar</button></footer></div>`);
      } catch (erro) { avisar(mensagem(erro), 'erro'); }
    } else if (act === 'papel') {
      const dar = valor === 'admin';
      if (await confirmar(dar ? 'Tornar administrador?' : 'Remover administrador?', `${b.dataset.nome} ${dar ? 'poderá editar pontos, eventos e excluir pessoas.' : 'perde o acesso a esta página.'}`, { rotulo: dar ? 'Tornar admin' : 'Remover' })) {
        try { await req('PUT', `/admin/usuarios/${id}/papel`, { papel: valor }); avisar('Papel atualizado.'); S.usuarios = null; conteudo(); } catch (erro) { avisar(mensagem(erro), 'erro'); }
      }
    } else if (act === 'excluir-pessoa') {
      if (await confirmar('Excluir pessoa?', `${b.dataset.nome}: a conta e todos os carimbos serão apagados e não há como desfazer.`, { rotulo: 'Excluir para sempre', perigo: true, digite: 'EXCLUIR' })) {
        try { await req('DELETE', `/admin/usuarios/${id}`); avisar('Pessoa excluída.'); S.usuarios = null; conteudo(); } catch (erro) { avisar(mensagem(erro), 'erro'); }
      }
    }
  };
}

iniciar();
