// Pokédex de Eunápolis: cada ponto publicado guarda uma criatura da fauna local, "capturada" no primeiro carimbo da pessoa.
// A captura não tem tabela própria: ela é o primeiro carimbo de rota (evento_id NULL) da pessoa naquele ponto,
// então não cria XP, não muda o pódio e não pode ser comprada, trocada nem transferida.
import { q } from './db/database.js';

export const RARIDADES = ['comum', 'raro', 'epico', 'lendario'];

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
    `SELECT t.id, t.rota_id, t.ordem, t.parceiro, t.oculto, t.criatura, t.raridade
     FROM tags t WHERE t.status <> 'arquivado' ORDER BY t.id`,
  );
  const usadas = new Set(pontos.map((p) => normalizar(p.criatura)).filter(Boolean));
  const ultimaOrdem = new Map();
  for (const p of pontos) ultimaOrdem.set(p.rota_id, Math.max(ultimaOrdem.get(p.rota_id) ?? 0, p.ordem));
  let cursor = 0;
  for (const p of pontos) {
    let { criatura, raridade } = p;
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

// Álbum da pessoa: todo ponto publicado, com a criatura só revelada depois da captura.
export async function albumDaPessoa(usuarioId) {
  const linhas = await q(
    `SELECT t.codigo, t.nome AS ponto, t.criatura, t.raridade, t.ordem, r.cor, c.primeira
     FROM tags t JOIN rotas r ON r.id = t.rota_id
     LEFT JOIN (SELECT tag_id, MIN(criado_em) AS primeira FROM carimbos WHERE usuario_id = ? AND evento_id IS NULL GROUP BY tag_id) c ON c.tag_id = t.id
     WHERE t.status = 'publicado' AND r.status = 'publicado' ORDER BY r.id, t.ordem`,
    [usuarioId],
  );
  const itens = linhas.map((l) => ({
    codigo: l.codigo,
    ponto: l.ponto,
    raridade: l.raridade || 'comum',
    cor: l.cor,
    capturada: Boolean(l.primeira),
    capturada_em: l.primeira ?? null,
    criatura: l.primeira ? l.criatura : null,
  }));
  const capturadas = itens.filter((i) => i.capturada).length;
  return { total: itens.length, capturadas, itens };
}
