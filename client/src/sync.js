// Ponte entre a caderneta do aparelho e o servidor das tags físicas.
import { api, limparToken } from './api.js';

// Caderneta do servidor: a coleção de cartas é a fonte de verdade das conquistas.
export async function lerCaderneta() {
  try {
    const dados = await api('/caderneta');
    return { eventos: Array.isArray(dados.eventos) ? dados.eventos : [], colecao: dados.colecao && Array.isArray(dados.colecao.itens) ? dados.colecao : null };
  } catch {
    return null;
  }
}

// Apaga o apelido e os carimbos guardados no servidor. true = não sobrou nada lá (apagou ou nunca existiu).
export async function apagarContaNoServidor() {
  try {
    await api('/eu', { method: 'DELETE' });
    limparToken();
    return true;
  } catch (erro) {
    if (erro?.status === 401) { limparToken(); return true; }
    return false;
  }
}
