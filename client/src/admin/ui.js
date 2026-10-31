// Utilidades da administração: escape, requisições, avisos, diálogos e lista arrastável (mouse, toque e teclado).
export const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
export const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ERROS = {
  nao_autenticado: 'Sua sessão expirou. Entre de novo.',
  sessao_conta_necessaria: 'Entre com uma conta (e-mail e senha).',
  credenciais_invalidas: 'E-mail ou senha incorretos.',
  muitas_tentativas: 'Muitas tentativas. Aguarde um minuto.',
  sem_permissao: 'Esta conta não é de administrador.',
  codigo_invalido: 'Código inválido: use de 3 a 80 caracteres, só minúsculas, números e hífen (ex.: eu-021).',
  codigo_ja_existe: 'Já existe um ponto com esse código.',
  nome_invalido: 'Nome muito curto.',
  categoria_obrigatoria: 'Escolha ao menos uma categoria.',
  coordenadas_invalidas: 'Coordenadas inválidas: preencha latitude e longitude juntas (ex.: -16.3751, -39.5881) ou deixe as duas vazias.',
  rota_invalida: 'Escolha uma rota de carimbo válida (não arquivada).',
  ponto_inexistente: 'Ponto não encontrado.',
  ponto_em_evento: 'Este ponto está em um evento ainda aberto. Tire-o do evento ou cancele o evento antes.',
  tem_carimbos: 'Já existem carimbos aqui. Para não apagar histórico de ninguém, arquive ou despublique em vez de excluir.',
  em_eventos: 'Este ponto aparece em eventos (mesmo antigos). Arquive em vez de excluir.',
  rota_com_pontos: 'A rota ainda tem pontos. Mova ou arquive os pontos (ou arquive a rota).',
  nome_ja_existe: 'Já existe uma rota com esse nome.',
  km_invalido: 'Quilometragem inválida.',
  ordem_invalida: 'A ordem não bateu com os pontos atuais. Recarreguei a lista; tente de novo.',
  slug_invalido: 'Identificador inválido: 3 a 80 caracteres com letras minúsculas, números e hífen.',
  slug_ja_existe: 'Já existe um evento com esse identificador.',
  tipo_invalido: 'Tipo inválido.',
  datas_invalidas: 'Datas inválidas.',
  fim_antes_do_inicio: 'O fim precisa ser depois do início.',
  pontos_obrigatorios: 'Escolha ao menos um ponto.',
  pontos_patrocinio_fora_da_faixa: 'Patrocínio precisa de entre 6 e 8 pontos.',
  patrocinador_obrigatorio: 'Informe o nome do patrocinador (o card diz “Patrocinado por …”).',
  patrocinador_so_em_patrocinio: 'Patrocinador só vale para o tipo Patrocínio.',
  ponto_nao_publicado: 'Há pontos ainda não publicados (não recebem carimbo). Publique os pontos primeiro.',
  conflito_de_janela: 'Outro card já usa estes pontos neste período. Cada ponto só pode ter um card por vez.',
  evento_inexistente: 'Evento não encontrado.',
  patrocinador_em_uso: 'Este patrocinador ainda tem eventos.',
  nao_altere_o_proprio_papel: 'Você não pode mudar o seu próprio papel.',
  nao_exclua_a_si_mesmo: 'Você não pode excluir a própria conta por aqui.',
  rebaixe_o_admin_antes: 'Rebaixe este administrador a usuário antes de excluir.',
  conta_inexistente: 'Esta pessoa não tem conta com e-mail e senha.',
  autorizacao_pendente: 'Faltam responsável, autorização ou vistoria registrados neste ponto.',
  data_invalida: 'Data inválida. Use o seletor de data.',
  raio_invalido: 'Raio inválido: use um número inteiro entre 0 e 100 metros (vazio ou 0 = 100 m).',
  coordenadas_pendentes: 'Este ponto não tem coordenadas válidas. Cadastre latitude e longitude conferidas em campo antes de publicar.',
  sem_segredo_de_chaves: 'O servidor não tem TAG_KEY_SECRET configurado (32+ caracteres). Defina-o no ambiente e reimplante.',
  sem_url_publica: 'O servidor não tem APP_PUBLIC_URL configurado; defina a URL pública HTTPS do app.',
  acao_invalida: 'Ação inválida.',
  origem_nao_permitida: 'O pedido foi bloqueado por segurança (origem diferente). Recarregue a página.',
  interno: 'Erro interno do servidor. Tente de novo.',
  rede: 'Sem conexão com o servidor.',
  foto_inexistente: 'Foto não encontrada.',
  imagem_ja_enviada: 'Esta foto já foi enviada para este ponto.',
  imagem_grande_demais: 'Arquivo grande demais (máximo 15 MB ou 80 megapixels).',
  corpo_grande_demais: 'Arquivo grande demais (máximo 15 MB).',
  formato_nao_aceito: 'Formato não aceito. Use JPEG, PNG ou WebP.',
  imagem_invalida: 'Não foi possível ler a imagem (arquivo corrompido ou incompleto).',
  imagem_pequena: 'Imagem pequena demais: o lado menor precisa ter ao menos 400 px.',
  imagem_animada: 'Imagens animadas não são aceitas.',
  imagem_vazia: 'O arquivo está vazio.',
  credito_pendente: 'Foto histórica ou restaurada precisa de autor ou fonte para ser aprovada.',
  foto_aprovada: 'Foto aprovada não pode ser excluída. Arquive antes.',
  tem_fotos: 'Este ponto tem fotos. Exclua as fotos antes (ou arquive o ponto).',
  midia_sem_armazenamento: 'O servidor ainda não tem onde guardar fotos (configure o R2 ou um volume persistente).',
  midia_falha_armazenamento: 'Falha ao gravar no armazenamento de fotos. Tente de novo; se repetir, verifique as credenciais do R2.',
  arquivo_ausente: 'O arquivo desta foto não foi encontrado no armazenamento.',
  tipo_registro_invalido: 'Tipo de registro inválido.',
  foto_nao_aprovada: 'Aprove a foto antes de usá-la na carta.',
  derivada_invalida: 'A foto de origem precisa ser outra foto deste mesmo ponto.',
};
export function mensagem(erro) {
  const base = ERROS[erro?.code] || `Erro: ${erro?.code || 'desconhecido'}`;
  const d = erro?.dados || {};
  const lista = d.faltando || d.codigos || d.eventos || d.conflitos;
  const extra = Array.isArray(lista) && lista.length ? ` (${lista.join(', ')})` : d.carimbos ? ` (${d.carimbos} carimbo(s))` : d.pontos ? ` (${d.pontos} ponto(s))` : '';
  return base + extra;
}

export async function req(metodo, caminho, corpo) {
  let r;
  try {
    r = await fetch(`/api${caminho}`, { method: metodo, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  } catch { throw Object.assign(new Error('rede'), { code: 'rede' }); }
  let dados = null;
  try { dados = await r.json(); } catch { /* corpo vazio */ }
  if (!r.ok) throw Object.assign(new Error(dados?.erro || 'erro'), { status: r.status, code: dados?.erro || 'erro', dados });
  return dados;
}

// Envia um arquivo cru (a foto) no corpo; os metadados vão na consulta do caminho.
export async function enviarArquivo(caminho, arquivo) {
  let r;
  try {
    r = await fetch(`/api${caminho}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': arquivo.type }, body: arquivo });
  } catch { throw Object.assign(new Error('rede'), { code: 'rede' }); }
  let dados = null;
  try { dados = await r.json(); } catch { /* corpo vazio */ }
  if (!r.ok) throw Object.assign(new Error(dados?.erro || 'erro'), { status: r.status, code: dados?.erro || 'erro', dados });
  return dados;
}

let aviso;
export function avisar(texto, tipo = 'ok') {
  const el = $('#aviso');
  el.textContent = texto;
  el.className = `aviso ok ${tipo === 'erro' ? 'erro' : ''}`;
  clearTimeout(aviso);
  aviso = setTimeout(() => { el.className = 'aviso'; }, tipo === 'erro' ? 6000 : 2600);
}

// Diálogo modal. `montar(dialog)` recebe o <dialog> já na tela. Devolve { fechar }.
export function dialogo(html, aoAbrir) {
  const d = document.createElement('dialog');
  d.innerHTML = html;
  document.body.append(d);
  const fechar = () => { if (d.open) d.close(); d.remove(); };
  d.addEventListener('cancel', (e) => { e.preventDefault(); fechar(); });
  d.addEventListener('click', (e) => { if (e.target === d) fechar(); if (e.target.closest('[data-fechar]')) fechar(); });
  d.showModal();
  aoAbrir?.(d, fechar);
  return { fechar, el: d };
}

export function confirmar(titulo, texto, { rotulo = 'Confirmar', perigo = false, digite = null } = {}) {
  return new Promise((resolve) => {
    const { el, fechar } = dialogo(`<div class="caixa"><header><h3>${esc(titulo)}</h3></header><div class="conteudo"><p style="margin:0">${esc(texto)}</p>
      ${digite ? `<label class="campo"><span>Digite <b style="color:var(--texto)">${esc(digite)}</b> para confirmar</span><input type="text" data-digite autocomplete="off" /></label>` : ''}</div>
      <footer><button class="btn" data-nao type="button">Cancelar</button><button class="btn ${perigo ? 'perigo' : 'pri'}" data-sim type="button" ${digite ? 'disabled' : ''}>${esc(rotulo)}</button></footer></div>`, (d) => {
      const sim = $('[data-sim]', d);
      if (digite) $('[data-digite]', d).addEventListener('input', (e) => { sim.disabled = e.target.value.trim() !== digite; });
      $('[data-nao]', d).focus();
    });
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-sim]')) { fechar(); resolve(true); } else if (e.target.closest('[data-nao]') || e.target === el) { fechar(); resolve(false); }
    });
    el.addEventListener('cancel', () => resolve(false));
  });
}

// Lista arrastável. Itens: filhos diretos com data-key; alça: .alca. Chama aoSoltar(chaves) só se a ordem mudou.
export function arrastavel(caixa, aoSoltar) {
  const chaves = () => [...caixa.children].filter((c) => c.dataset.key !== undefined).map((c) => c.dataset.key);
  let atraso;
  caixa.addEventListener('pointerdown', (e) => {
    const alca = e.target.closest('.alca');
    if (!alca || alca.disabled || e.button > 0) return;
    const item = alca.closest('[data-key]');
    if (!item || item.parentElement !== caixa) return;
    e.preventDefault();
    const antes = chaves();
    item.classList.add('arrastando');
    // Ouvintes no documento (não na alça): mover o item no DOM tira a alça do ar e o navegador solta a captura do ponteiro.
    const mover = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      const y = ev.clientY;
      if (y < 70) window.scrollBy(0, -14); else if (y > window.innerHeight - 70) window.scrollBy(0, 14);
      const irmaos = [...caixa.children].filter((c) => c !== item && c.dataset.key !== undefined);
      const alvo = irmaos.find((c) => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
      if (alvo) { if (item.nextElementSibling !== alvo) caixa.insertBefore(item, alvo); } else if (irmaos.length && caixa.lastElementChild !== item) caixa.append(item);
    };
    const encerrar = () => {
      document.removeEventListener('pointermove', mover);
      document.removeEventListener('pointerup', soltar);
      document.removeEventListener('pointercancel', cancelar);
      item.classList.remove('arrastando');
    };
    const soltar = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      encerrar();
      const depois = chaves();
      if (depois.join('|') !== antes.join('|')) aoSoltar(depois, antes);
    };
    const cancelar = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      encerrar();
      antes.forEach((k) => { const el = [...caixa.children].find((c) => c.dataset.key === k); if (el) caixa.append(el); });
    };
    document.addEventListener('pointermove', mover);
    document.addEventListener('pointerup', soltar);
    document.addEventListener('pointercancel', cancelar);
  });
  // Teclado: setas na alça movem o item (cada pausa grava a ordem).
  caixa.addEventListener('keydown', (e) => {
    const alca = e.target.closest?.('.alca');
    if (!alca || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    const item = alca.closest('[data-key]');
    const antes = chaves();
    if (e.key === 'ArrowUp' && item.previousElementSibling) caixa.insertBefore(item, item.previousElementSibling);
    else if (e.key === 'ArrowDown' && item.nextElementSibling) caixa.insertBefore(item.nextElementSibling, item);
    else return;
    e.preventDefault();
    alca.focus();
    clearTimeout(atraso);
    atraso = setTimeout(() => { const depois = chaves(); if (depois.join('|') !== antes.join('|')) aoSoltar(depois, antes); }, 700);
  });
}

// Data/hora no fuso do projeto, no formato do <input type="datetime-local">.
export function paraCampoLocal(iso, fuso) {
  if (!iso) return '';
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}
export const legivel = (iso, fuso) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: fuso, dateStyle: 'short', timeStyle: 'short' }) : '—');
