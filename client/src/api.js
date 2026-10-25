const CHAVE = 'caderneta_token';
export const token = () => localStorage.getItem(CHAVE);
export const limparToken = () => localStorage.removeItem(CHAVE);
export async function api(caminho, { method = 'GET', body } = {}) {
  const r = await fetch('/api' + caminho, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token() && { Authorization: 'Bearer ' + token() }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(data?.erro || 'erro_api'), { status: r.status, code: data?.erro, dados: data });
  return data;
}

// Fluxo legado da página pública de tag. A conta principal usa os endpoints abaixo.
export async function entrar(dados) {
  const d = await api('/entrar', { method: 'POST', body: dados });
  if (location.protocol === 'https:') limparToken();
  else if (d.token) localStorage.setItem(CHAVE, d.token);
  return d;
}
export const criarContaServidor = (dados) => api('/conta/criar', { method: 'POST', body: dados });
export const entrarContaServidor = (dados) => api('/conta/entrar', { method: 'POST', body: dados });
export const sessaoContaServidor = () => api('/conta/sessao');
export const atualizarContaServidor = (dados) => api('/conta', { method: 'PUT', body: dados });
export const sairContaServidor = () => api('/conta/sair', { method: 'POST' });

// Mensagem clara para quem usa o app (heurística 9 de Nielsen): diz o que houve e o que fazer.
export function mensagemErro(error, padrao) {
  if (error?.status === 429) return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  if (!error?.status) return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
  if (error.status >= 500) return "O servidor está com problema agora. Tente de novo em instantes.";
  return padrao;
}
