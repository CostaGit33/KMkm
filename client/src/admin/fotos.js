// Galeria de fotos de um ponto (administração): envio, crédito, aprovação, ordem, original e exclusão.
// A foto entra "pendente"; só aparece no app depois de aprovada. O original fica guardado e só o admin baixa.
import { $, esc, req, mensagem, avisar, dialogo, confirmar, arrastavel, enviarArquivo } from './ui.js';

const TIPOS = [['atual', 'Foto atual'], ['historica', 'Foto histórica'], ['restauracao', 'Restauração (derivada de outra foto)'], ['outra', 'Outra']];
const rotuloTipo = (t) => TIPOS.find(([id]) => id === t)?.[1] || t;
const ROTULO_STATUS = { pendente: 'aguardando aprovação', aprovado: 'publicada no app', arquivado: 'arquivada' };
const CLASSE_STATUS = { pendente: 'pendente', aprovado: 'publicado', arquivado: 'arquivado' };
const ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 15;

const tamanho = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const caminhoPonto = (codigo) => `/admin/pontos/${encodeURIComponent(codigo)}/imagens`;

function camposMetadados(d = {}, { restaurada = [] } = {}) {
  return `<label class="campo"><span>Tipo de registro</span><select name="tipo_registro">${TIPOS.map(([id, nome]) => `<option value="${id}" ${(d.tipo_registro || 'atual') === id ? 'selected' : ''}>${nome}</option>`).join('')}</select></label>
    <label class="campo"><span>Título (opcional)</span><input type="text" name="titulo" maxlength="120" value="${esc(d.titulo || '')}" placeholder="Ex.: Matriz ao entardecer" /></label>
    <label class="campo"><span>Legenda (opcional)</span><textarea name="legenda" maxlength="400" rows="2" placeholder="O que a pessoa está vendo">${esc(d.legenda || '')}</textarea></label>
    <div class="dois"><label class="campo"><span>Período (opcional)</span><input type="text" name="periodo_historico" maxlength="60" value="${esc(d.periodo_historico || '')}" placeholder="Ex.: antes da reforma" /></label>
    <label class="campo"><span>Autor / fotógrafo</span><input type="text" name="autor" maxlength="120" value="${esc(d.autor || '')}" /></label></div>
    <label class="campo"><span>Fonte / acervo</span><input type="text" name="fonte" maxlength="200" value="${esc(d.fonte || '')}" placeholder="Ex.: acervo da paróquia, cedida por …" /></label>
    <div data-derivada ${(d.tipo_registro || 'atual') === 'restauracao' ? '' : 'hidden'}>${restaurada === null ? '<p class="ajuda" style="margin:0">Depois do envio, use <b>Editar</b> para marcar de qual foto esta restauração deriva. No app ela aparece com o selo “versão restaurada”. Nada de colorização ou detalhes inventados por IA.</p>' : `<label class="campo"><span>Derivada de</span><select name="derivada_de"><option value="">— escolha a foto original —</option>${restaurada.map((o) => `<option value="${o.id}" ${d.derivada_de === o.id ? 'selected' : ''}>#${o.id} · ${esc(o.titulo || rotuloTipo(o.tipo_registro))}</option>`).join('')}</select></label>
      <p class="ajuda" style="margin:4px 0 0">No app, a versão restaurada aparece com o selo “versão restaurada”. Nada de colorização ou detalhes inventados por IA.</p>`}</div>`;
}
function ligarTipo(form) {
  const sel = $('[name=tipo_registro]', form);
  const alvo = $('[data-derivada]', form);
  sel.addEventListener('change', () => { alvo.hidden = sel.value !== 'restauracao'; });
}
const lerCampos = (form) => Object.fromEntries([...new FormData(form).entries()].filter(([, v]) => typeof v === 'string'));

export function abrirFotos(ponto, aoMudar = () => {}) {
  let imagens = [];
  let armazenamento = null;
  let primeiraCarga = false;
  const codigo = ponto.codigo;

  const { el, fechar } = dialogo(`<div class="caixa"><header><h3>Fotos · ${esc(ponto.nome)}</h3><button class="btn mini" type="button" data-fechar>Fechar</button></header>
    <div class="conteudo">
      <div data-armazenamento></div>
      <div data-lista><p class="ajuda">Carregando…</p></div>
      <details data-novo open><summary style="cursor:pointer;font-weight:700;margin-bottom:8px">Enviar nova foto</summary>
      <form data-envio class="grupo" style="padding:12px;display:grid;gap:10px">
        <label class="campo"><span>Arquivo (JPEG, PNG ou WebP, até ${MAX_MB} MB, lado menor de 400 px ou mais)</span><input type="file" name="arquivo" accept="${ACEITOS.join(',')}" required /></label>
        ${camposMetadados({}, { restaurada: null })}
        <p class="ajuda" style="margin:0">A foto entra como <b>aguardando aprovação</b> e só aparece no app depois de aprovada. O original é guardado como veio (com os dados da câmera, visível só para administradores); a cópia pública é otimizada e sem localização.</p>
        <div data-erro-envio></div>
        <div><button class="btn pri" type="submit" data-enviar>Enviar para aprovação</button></div>
      </form>
      </details>
    </div></div>`, (d) => {
    d.style.width = 'min(760px, calc(100vw - 24px))';
  });

  const dependentes = () => imagens.filter((i) => i.tipo_registro !== 'restauracao');

  function desenharArmazenamento() {
    const a = armazenamento;
    const alvo = $('[data-armazenamento]', el);
    if (!a) { alvo.innerHTML = ''; return; }
    if (!a.pronto) {
      alvo.innerHTML = '<div class="erro-form">O servidor ainda não tem onde guardar fotos. Configure o armazenamento (R2 ou volume persistente) — veja docs/midia.md. Enquanto isso, o envio fica bloqueado.</div>';
      $('[data-enviar]', el).disabled = true;
    } else { $('[data-enviar]', el).disabled = false; alvo.innerHTML = ''; }
  }

  function linha(i, n) {
    const credito = [i.autor, i.fonte].filter(Boolean).map(esc).join(' · ');
    const origem = i.derivada_de ? imagens.find((x) => x.id === i.derivada_de) : null;
    return `<li class="linha" data-key="${i.id}"><button class="alca" type="button" aria-label="Mover foto ${i.id}">⠿</button>
      <a href="/api/admin/imagens/${i.id}/arquivo?v=g" target="_blank" rel="noopener" title="Abrir em tamanho grande"><img class="foto-mini" src="/api/admin/imagens/${i.id}/arquivo?v=m" alt="${esc(i.titulo || 'Foto do ponto')}" loading="lazy" width="84" height="84" /></a>
      <div class="corpo"><div class="titulo">${esc(i.titulo || '(sem título)')}</div>
        <div class="meta"><span class="chip ${CLASSE_STATUS[i.status]}">${ROTULO_STATUS[i.status]}</span><span>${esc(rotuloTipo(i.tipo_registro))}</span>${i.periodo_historico ? `<span>${esc(i.periodo_historico)}</span>` : ''}${origem ? `<span>derivada de #${origem.id}</span>` : ''}</div>
        <div class="meta"><span class="${credito ? '' : 'alerta'}">${credito || 'sem crédito'}</span><span>${i.largura}×${i.altura}</span><span>original ${tamanho(i.bytes_original)}</span><span>#${i.id}</span></div>
        ${i.legenda ? `<div class="meta"><span>${esc(i.legenda)}</span></div>` : ''}</div>
      <div class="acoes">
        ${i.status !== 'aprovado' ? `<button class="btn mini pri" type="button" data-foto="aprovado" data-id="${i.id}">${i.status === 'arquivado' ? 'Aprovar de novo' : 'Aprovar'}</button>` : ''}
        ${i.status === 'aprovado' ? `<button class="btn mini" type="button" data-foto="arquivado" data-id="${i.id}">Arquivar</button>` : ''}
        ${i.status === 'pendente' ? `<button class="btn mini" type="button" data-foto="arquivado" data-id="${i.id}">Arquivar</button>` : ''}
        <button class="btn mini" type="button" data-foto="editar" data-id="${i.id}">Editar</button>
        <a class="btn mini" href="${esc(i.original_url)}" download>Original ↓</a>
        <button class="btn mini perigo" type="button" data-foto="excluir" data-id="${i.id}" ${i.status === 'aprovado' ? 'disabled title="Arquive antes de excluir"' : ''}>Excluir</button></div></li>`;
  }

  function desenharLista() {
    const alvo = $('[data-lista]', el);
    const aprovadas = imagens.filter((i) => i.status === 'aprovado').length;
    alvo.innerHTML = `<h4 style="margin:4px 0 6px">${imagens.length ? `${imagens.length} foto(s) · ${aprovadas} no app` : 'Ainda sem fotos'}</h4>
      ${imagens.length ? `<p class="ajuda" style="margin-top:0">Arraste a alça ⠿ para mudar a ordem (a primeira aprovada vira a capa). Fotos históricas ou restauradas precisam de autor ou fonte para serem aprovadas.</p>
      <ul class="lista" data-fotos>${imagens.map(linha).join('')}</ul>` : ''}`;
    const ul = $('[data-fotos]', alvo);
    if (ul) {
      arrastavel(ul, async (chaves, antes) => {
        try { await req('PUT', `${caminhoPonto(codigo)}/ordem`, { ids: chaves.map(Number) }); imagens.sort((a, b) => chaves.indexOf(String(a.id)) - chaves.indexOf(String(b.id))); avisar('Ordem salva.'); aoMudar(); }
        catch (erro) { avisar(mensagem(erro), 'erro'); await carregar(); }
      });
    }
  }

  async function carregar() {
    try {
      const r = await req('GET', caminhoPonto(codigo));
      imagens = r.imagens; armazenamento = r.armazenamento;
    } catch (erro) { $('[data-lista]', el).innerHTML = `<div class="erro-form">${esc(mensagem(erro))}</div>`; return; }
    desenharArmazenamento();
    desenharLista();
    const novo = $('[data-novo]', el);
    if (novo && !primeiraCarga) { novo.open = imagens.length === 0; primeiraCarga = true; }
  }

  async function mudarStatus(imagem, status) {
    try {
      await req('POST', `/admin/imagens/${imagem.id}/status`, { status });
    } catch (erro) {
      if (erro.code !== 'credito_pendente') { avisar(mensagem(erro), 'erro'); return; }
      const ok = await confirmar('Aprovar sem crédito?', `Esta foto é ${rotuloTipo(imagem.tipo_registro).toLowerCase()} e não tem autor nem fonte. Ela vai aparecer no app sem crédito; a decisão fica registrada na auditoria. O ideal é preencher em Editar.`, { rotulo: 'Aprovar assim mesmo', perigo: true });
      if (!ok) return;
      try { await req('POST', `/admin/imagens/${imagem.id}/status`, { status, forcar: true }); } catch (e2) { avisar(mensagem(e2), 'erro'); return; }
    }
    avisar(status === 'aprovado' ? 'Foto publicada no app.' : 'Foto arquivada.');
    await carregar(); aoMudar();
  }

  function editar(imagem) {
    const outras = imagens.filter((i) => i.id !== imagem.id && i.tipo_registro !== 'restauracao');
    const dlg = dialogo(`<form class="caixa"><header><h3>Editar foto #${imagem.id}</h3><button class="btn mini" type="button" data-fechar>Fechar</button></header>
      <div class="conteudo">${camposMetadados(imagem, { restaurada: outras })}<div data-erro></div></div>
      <footer><button class="btn" type="button" data-fechar>Cancelar</button><button class="btn pri" type="submit">Salvar</button></footer></form>`);
    const form = $('form', dlg.el);
    ligarTipo(form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const c = lerCampos(form);
      const corpo = { titulo: c.titulo, legenda: c.legenda, periodo_historico: c.periodo_historico, tipo_registro: c.tipo_registro, autor: c.autor, fonte: c.fonte };
      if (c.tipo_registro === 'restauracao') corpo.derivada_de = c.derivada_de ? Number(c.derivada_de) : null;
      try { await req('PUT', `/admin/imagens/${imagem.id}`, corpo); dlg.fechar(); avisar('Foto atualizada.'); await carregar(); aoMudar(); }
      catch (erro) { $('[data-erro]', dlg.el).innerHTML = `<div class="erro-form">${esc(mensagem(erro))}</div>`; }
    });
  }

  // ----- envio -----
  const form = $('[data-envio]', el);
  ligarTipo(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const erroEl = $('[data-erro-envio]', form);
    erroEl.innerHTML = '';
    const arquivo = $('[name=arquivo]', form).files[0];
    if (!arquivo) return;
    if (!ACEITOS.includes(arquivo.type)) { erroEl.innerHTML = '<div class="erro-form">Formato não aceito. Use JPEG, PNG ou WebP.</div>'; return; }
    if (arquivo.size > MAX_MB * 1048576) { erroEl.innerHTML = `<div class="erro-form">Arquivo maior que ${MAX_MB} MB.</div>`; return; }
    const c = lerCampos(form);
    const consulta = new URLSearchParams(Object.entries({ tipo_registro: c.tipo_registro, titulo: c.titulo, legenda: c.legenda, periodo_historico: c.periodo_historico, autor: c.autor, fonte: c.fonte }).filter(([, v]) => v)).toString();
    const botao = $('[data-enviar]', form);
    botao.disabled = true; botao.textContent = 'Enviando e processando…';
    try {
      await enviarArquivo(`${caminhoPonto(codigo)}${consulta ? `?${consulta}` : ''}`, arquivo);
      avisar('Foto enviada. Revise e aprove para ela aparecer no app.');
      form.reset(); $('[data-derivada]', form).hidden = true;
      await carregar(); aoMudar();
    } catch (erro) {
      erroEl.innerHTML = `<div class="erro-form">${esc(mensagem(erro))}</div>`;
    } finally { botao.textContent = 'Enviar para aprovação'; desenharArmazenamento(); }
  });

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-foto]');
    if (!b || b.disabled) return;
    const imagem = imagens.find((i) => String(i.id) === b.dataset.id);
    if (!imagem) return;
    const acao = b.dataset.foto;
    if (acao === 'aprovado' || acao === 'arquivado') {
      if (acao === 'arquivado' && imagem.status === 'aprovado' && !(await confirmar('Arquivar foto?', 'Ela sai do app imediatamente. O original continua guardado.', { rotulo: 'Arquivar' }))) return;
      b.disabled = true; await mudarStatus(imagem, acao);
    } else if (acao === 'editar') editar(imagem);
    else if (acao === 'excluir') {
      if (!(await confirmar('Excluir foto?', 'O original e as cópias saem do armazenamento de vez. Não dá para desfazer; arquivar guarda a foto sem mostrá-la.', { rotulo: 'Excluir', perigo: true }))) return;
      try { await req('DELETE', `/admin/imagens/${imagem.id}`); avisar('Foto excluída.'); await carregar(); aoMudar(); } catch (erro) { avisar(mensagem(erro), 'erro'); }
    }
  });

  carregar();
  return { fechar };
}
