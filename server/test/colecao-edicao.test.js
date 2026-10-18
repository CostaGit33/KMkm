import test from 'node:test';
import assert from 'node:assert/strict';
import { emitirNumero } from '../eventos.js';
import { POOL_CRIATURAS, RARIDADES, estagioPorDias, categoriaDaCarta, CATEGORIAS_CARTA } from '../criaturas.js';
import { criaturaSvg } from '../../client/src/criaturas.js';

// Conexão falsa que imita as tabelas eventos e edicao_numeros, só o suficiente para exercitar a regra.
// Como no mysql2, cada consulta devolve [linhas]; o código da regra desestrutura a primeira linha.
function conexaoFalsa({ emitidos = 0, numeros = [] } = {}) {
  const db = { emitidos, numeros: [...numeros] };
  return {
    db,
    async query(sql, params = []) {
      if (/SELECT id, emitidos FROM eventos/.test(sql)) return [[{ id: params[0], emitidos: db.emitidos }]];
      if (/SELECT numero FROM edicao_numeros/.test(sql)) return [db.numeros.filter((n) => n.usuario_id === params[1]).map((n) => ({ numero: n.numero }))];
      if (/INSERT INTO edicao_numeros/.test(sql)) { db.numeros.push({ numero: params[1], usuario_id: params[2] }); return [{}]; }
      if (/UPDATE eventos SET emitidos/.test(sql)) { db.emitidos = params[0]; return [{}]; }
      throw new Error(`SQL inesperado: ${sql}`);
    },
  };
}
test('card sem tiragem não emite número', async () => {
  assert.equal(await emitirNumero(conexaoFalsa(), { id: 1, tiragem: null }, 10), null);
  assert.equal(await emitirNumero(conexaoFalsa(), { id: 1 }, 10), null);
});

test('emite números em ordem, um por pessoa, e esgota na tiragem', async () => {
  const c = conexaoFalsa();
  const card = { id: 7, tiragem: 2 };
  const a = await emitirNumero(c, card, 1);
  assert.deepEqual({ n: a.numero, nova: a.nova, esgotada: a.esgotada }, { n: 1, nova: true, esgotada: false });
  const a2 = await emitirNumero(c, card, 1);
  assert.deepEqual({ n: a2.numero, nova: a2.nova }, { n: 1, nova: false });
  const b = await emitirNumero(c, card, 2);
  assert.deepEqual({ n: b.numero, esgotada: b.esgotada }, { n: 2, esgotada: true });
  const d = await emitirNumero(c, card, 3);
  assert.deepEqual({ n: d.numero, esgotada: d.esgotada }, { n: null, esgotada: true });
  assert.equal(c.db.emitidos, 2);
});

test('o pool de criaturas não tem nomes repetidos e as raridades são as quatro esperadas', () => {
  assert.equal(new Set(POOL_CRIATURAS).size, POOL_CRIATURAS.length);
  assert.ok(POOL_CRIATURAS.length >= 40);
  assert.deepEqual(RARIDADES, ['comum', 'raro', 'epico', 'lendario']);
});

test('arte da criatura: determinística, distinta por nome e sem revelar o nome na silhueta', () => {
  assert.equal(criaturaSvg('Quati'), criaturaSvg('Quati'));
  assert.notEqual(criaturaSvg('Quati'), criaturaSvg('Jacu'));
  const sombra = criaturaSvg('Onça-parda', { silhueta: true });
  assert.ok(!sombra.includes('Onça'));
  assert.match(criaturaSvg('Anta', { raridade: 'lendario' }), /stroke="#ffc53d"/);
  assert.ok(!criaturaSvg('Anta', { raridade: 'comum' }).includes('stroke-dasharray'));
});

test('evolução da carta: estágios em 0, 5, 30 e 45 dias', () => {
  assert.deepEqual([0, 4, 5, 29, 30, 44, 45, 400].map(estagioPorDias), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test('categoria da carta: oculto vira Mistério, sabores Trabalho, praias Litoral', () => {
  assert.equal(categoriaDaCarta({ oculto: 1, categorias: 'natureza' }), 'misterio');
  assert.equal(categoriaDaCarta({ categorias: 'sabores' }), 'trabalho');
  assert.equal(categoriaDaCarta({ categorias: 'praias' }), 'litoral');
  assert.equal(categoriaDaCarta({ categorias: 'natureza,historia' }), 'natureza');
  assert.equal(categoriaDaCarta({ categorias: '' }), 'cultura');
  assert.ok(CATEGORIAS_CARTA.includes(categoriaDaCarta({ categorias: 'x' })));
});
