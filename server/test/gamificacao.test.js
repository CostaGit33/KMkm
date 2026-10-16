import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLifetimeXP,
  calculateSeasonXP,
  getLevelForXP,
  rankPodiumRows,
  XP_REWARDS,
} from '../../shared/gamification.mjs';

test('XP permanente soma visitas únicas e bônus de primeira conclusão de circuito', () => {
  assert.equal(calculateLifetimeXP({ uniquePoints: 18, completedCircuits: 4 }), 260);
  assert.equal(calculateLifetimeXP({ uniquePoints: 1, completedCircuits: 1 }), 30);
  assert.equal(calculateLifetimeXP({ uniquePoints: -2, completedCircuits: 1.8 }), 20);
});

test('XP sazonal concede uma vez por ponto distinto informado pelo servidor', () => {
  assert.equal(XP_REWARDS.FIRST_VERIFIED_POINT, 10);
  assert.equal(calculateSeasonXP(3), 30);
  assert.equal(calculateSeasonXP('invalid'), 0);
});

test('níveis usam limites inclusivos e sinalizam o máximo', () => {
  assert.equal(getLevelForXP(29).current.level, 1);
  assert.equal(getLevelForXP(30).current.level, 2);
  assert.equal(getLevelForXP(259).current.level, 5);
  assert.equal(getLevelForXP(260).current.level, 6);
  assert.equal(getLevelForXP(260).percent, 100);
});

test('pódio compartilha a posição em empate e ordena por XP sazonal', () => {
  const ranked = rankPodiumRows([
    { alias: 'Beta', uniquePoints: 2 },
    { alias: 'Ana', uniquePoints: 3 },
    { alias: 'Caio', uniquePoints: 3 },
  ]);
  assert.deepEqual(ranked.map(({ alias, rank, seasonXP }) => [alias, rank, seasonXP]), [
    ['Ana', 1, 30],
    ['Caio', 1, 30],
    ['Beta', 3, 20],
  ]);
});
