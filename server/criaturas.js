// Personagens da coleção de cartas de Eunápolis: cada ponto publicado guarda um personagem, desbloqueado no primeiro carimbo da pessoa.
// O desbloqueio não tem tabela própria: ele é o primeiro carimbo de rota (evento_id NULL) da pessoa naquele ponto,
// então não cria XP, não muda o pódio e não pode ser comprada, trocada nem transferida.
import { q } from './db/database.js';

export const RARIDADES = ['comum', 'raro', 'epico', 'lendario'];

// Seis categorias da coleção (a carta), separadas das categorias do mapa: oculto vira Mistério, sabores vira Trabalho, praias vira Litoral.
export const CATEGORIAS_CARTA = ['natureza', 'historia', 'cultura', 'trabalho', 'litoral', 'misterio'];
export function categoriaDaCarta(ponto) {
  if (ponto.oculto) return 'misterio';
  const cats = String(ponto.categorias || '').split(',').filter(Boolean);
  if (cats.includes('sabores')) return 'trabalho';
  if (cats.includes('praias')) return 'litoral';
  if (cats.includes('natureza')) return 'natureza';
  if (cats.includes('historia')) return 'historia';
  return 'cultura';
}
// Personagens que já existem na coleção (nome, categoria, frase e história). Só preenche pontos ainda sem personagem próprio.
export const PERSONAGENS_INICIAIS = {
  'eu-003': { criatura: 'Jaguatirica do Gravatá', categoria_carta: 'natureza', raridade: 'comum', frase: 'Quem caminha com calma, enxerga a mata respirar.', historia: 'A jaguatirica simboliza a vida silvestre que ainda mora perto da cidade, no verde do Parque Ecológico do Gravatá.' },
  'eu-010': { criatura: 'Feira Livre', categoria_carta: 'trabalho', raridade: 'comum', frase: 'Na feira, cada banca conta uma história.', historia: 'Gente que acorda cedo para colocar a cidade à mesa: o trabalho de quem planta, carrega, pesa e vende na Feira Livre.' },
  'eu-011': { criatura: 'Viola de Bolso', categoria_carta: 'cultura', raridade: 'raro', frase: 'A memória também se toca de ouvido.', historia: 'No Ponto de Cultura, a viola reúne oficinas, vivências e memória comunitária de Eunápolis.' },
};

// Fauna da Mata Atlântica do Extremo Sul da Bahia (nomes populares, sem personagem de terceiros).
export const POOL_CRIATURAS = [
  'Sagui-de-tufos', 'Tucano-de-bico-preto', 'Preguiça-de-coleira', 'Quati', 'Jacu', 'Bem-te-vi', 'Tamanduá-mirim', 'Jaguatirica',
  'Saíra-sete-cores', 'Beija-flor-de-topete', 'Teiú', 'Gambá', 'Capivara', 'Tatu-galinha', 'Cutia', 'Coruja-buraqueira',
  'Arara-azul-pequena', 'Periquito-rei', 'Macuco', 'Lontra', 'Veado-mateiro', 'Ouriço-cacheiro', 'Curió', 'Sabiá-laranjeira',
  'João-de-barro', 'Garça-branca', 'Socó-boi', 'Maria-farinha', 'Mico-leão-de-cara-preta', 'Anta', 'Onça-parda', 'Gavião-carijó',
  'Jiboia', 'Calango-verde', 'Bugio', 'Cachorro-do-mato', 'Irara', 'Mutum-de-penacho', 'Pica-pau-de-banda-branca', 'Tié-sangue',
  'Cardeal', 'Rolinha-roxa', 'Lagarto-de-parede', 'Borboleta-azul', 'Jabuti-piranga', 'Paca', 'Caxinguelê', 'Sapo-cururu',
];

const normalizar = (nome) => String(nome || '').trim();

// Preenche só o que ainda está vazio; nunca sobrescreve o que o admin definiu. Idempotente.
export async function atribuirCriaturas(consulta = q) {
  const pontos = await consulta(
    `SELECT t.id, t.codigo, t.rota_id, t.ordem, t.parceiro, t.oculto, t.categorias, t.criatura, t.raridade, t.categoria_carta, t.carta, t.historia, t.frase
     FROM tags t WHERE t.status <> 'arquivado' ORDER BY t.id`,
  );
  const usadas = new Set(pontos.map((p) => normalizar(p.criatura)).filter(Boolean));
  const ultimaOrdem = new Map();
  for (const p of pontos) ultimaOrdem.set(p.rota_id, Math.max(ultimaOrdem.get(p.rota_id) ?? 0, p.ordem));
  let cursor = 0;
  let proximaCarta = pontos.reduce((m, p) => Math.max(m, Number(p.carta) || 0), 0);
  const pool = new Set(POOL_CRIATURAS);
  for (const p of pontos) {
    let { criatura, raridade } = p;
    const inicial = PERSONAGENS_INICIAIS[String(p.codigo).toLowerCase()];
    // Personagem próprio do ponto substitui só o nome automático (do pool) ou o vazio, nunca uma edição do admin.
    if (inicial && (!normalizar(criatura) || pool.has(normalizar(criatura)))) {
      criatura = inicial.criatura;
      usadas.add(criatura);
      await consulta('UPDATE tags SET criatura = ?, raridade = COALESCE(NULLIF(raridade, \'\'), ?) WHERE id = ?', [inicial.criatura, inicial.raridade, p.id]);
      if (!RARIDADES.includes(raridade)) raridade = inicial.raridade;
    }
    if (inicial) {
      await consulta('UPDATE tags SET categoria_carta = COALESCE(categoria_carta, ?), frase = COALESCE(frase, ?), historia = COALESCE(historia, ?) WHERE id = ?', [inicial.categoria_carta, inicial.frase, inicial.historia, p.id]);
    }
    if (!CATEGORIAS_CARTA.includes(p.categoria_carta) && !inicial) {
      await consulta('UPDATE tags SET categoria_carta = ? WHERE id = ? AND categoria_carta IS NULL', [categoriaDaCarta(p), p.id]);
    }
    if (!p.carta) {
      proximaCarta += 1;
      await consulta('UPDATE tags SET carta = ? WHERE id = ? AND carta IS NULL', [proximaCarta, p.id]);
    }
    if (!normalizar(criatura)) {
      let nome = null;
      for (let i = 0; i < POOL_CRIATURAS.length; i += 1) {
        const candidato = POOL_CRIATURAS[(cursor + i) % POOL_CRIATURAS.length];
        if (!usadas.has(candidato)) { nome = candidato; cursor = (cursor + i + 1) % POOL_CRIATURAS.length; break; }
      }
      // Pool esgotado (mais pontos que nomes): repete com número, mantendo o nome único dentro da cidade.
      criatura = nome ?? `${POOL_CRIATURAS[p.id % POOL_CRIATURAS.length]} ${Math.ceil(p.id / POOL_CRIATURAS.length)}`;
      usadas.add(criatura);
      await consulta('UPDATE tags SET criatura = ? WHERE id = ? AND (criatura IS NULL OR criatura = \'\')', [criatura, p.id]);
    }
    if (!RARIDADES.includes(raridade)) {
      raridade = p.oculto ? 'lendario' : p.parceiro ? 'raro' : p.ordem === ultimaOrdem.get(p.rota_id) && p.ordem > 1 ? 'epico' : 'comum';
      await consulta('UPDATE tags SET raridade = ? WHERE id = ? AND (raridade IS NULL OR raridade = \'\')', [raridade, p.id]);
    }
  }
}

// Álbum da pessoa: todo ponto publicado como carta numerada. Nome, história e frase só aparecem depois do desbloqueio.
export async function albumDaPessoa(usuarioId) {
  const linhas = await q(
    `SELECT t.codigo, t.nome AS ponto, t.criatura, t.raridade, t.ordem, t.carta, t.arte, t.frase, t.historia, t.oculto, t.categorias, t.categoria_carta,
            r.cor, c.primeira
     FROM tags t JOIN rotas r ON r.id = t.rota_id
     LEFT JOIN (SELECT tag_id, MIN(criado_em) AS primeira FROM carimbos WHERE usuario_id = ? GROUP BY tag_id) c ON c.tag_id = t.id
     WHERE t.status = 'publicado' AND r.status = 'publicado' ORDER BY t.carta, t.id`,
    [usuarioId],
  );
  const itens = linhas.map((l) => {
    const capturada = Boolean(l.primeira);
    return {
      codigo: l.codigo,
      carta: l.carta,
      ponto: l.ponto,
      categoria: CATEGORIAS_CARTA.includes(l.categoria_carta) ? l.categoria_carta : categoriaDaCarta(l),
      raridade: RARIDADES.includes(l.raridade) ? l.raridade : 'comum',
      cor: l.cor,
      capturada,
      capturada_em: l.primeira ?? null,
      criatura: capturada ? l.criatura : null,
      frase: capturada ? l.frase : null,
      historia: capturada ? l.historia : null,
      arte: capturada && l.arte ? l.arte : null,
    };
  });
  const capturadas = itens.filter((i) => i.capturada).length;
  const porCategoria = {};
  for (const cat of CATEGORIAS_CARTA) {
    const doGrupo = itens.filter((i) => i.categoria === cat);
    porCategoria[cat] = { total: doGrupo.length, capturadas: doGrupo.filter((i) => i.capturada).length };
  }
  return { total: itens.length, capturadas, por_categoria: porCategoria, itens };
}
