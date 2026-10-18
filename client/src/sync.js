// Ponte entre a caderneta do aparelho e o servidor das tags físicas.
import { api, limparToken } from './api.js';

// Carimbos que a pessoa deu em tags reais. Devolve null quando não há sessão no servidor ou não há rede.
export async function carimbosDoServidor() {
  return (await lerCaderneta())?.itens ?? null;
}

// Caderneta do servidor: carimbos das rotas (entram no aparelho) e cards de eventos (só exibição).
export async function lerCaderneta() {
  try {
    const dados = await api('/caderneta');
    const itens = [];
    for (const rota of dados.rotas || []) {
      for (const ponto of rota.pontos || []) {
        const quando = ponto.carimbo?.criado_em;
        if (ponto.codigo && quando && Number.isFinite(Date.parse(quando))) itens.push({ codigo: String(ponto.codigo), at: new Date(quando).toISOString() });
      }
    }
    return { itens, eventos: Array.isArray(dados.eventos) ? dados.eventos : [], colecao: dados.colecao && Array.isArray(dados.colecao.itens) ? dados.colecao : null };
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
