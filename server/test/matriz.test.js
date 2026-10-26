import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PONTO_MATRIZ } from '../db/migrations.js';
import { RARIDADES, CATEGORIAS_CARTA, categoriaDaCarta } from '../criaturas.js';

const c = PONTO_MATRIZ.carta;

test('Matriz: carta Comum cabe nos limites do cadastro', () => {
  assert.match(PONTO_MATRIZ.codigoPreferido, /^eu-\d{3}$/);
  assert.ok(PONTO_MATRIZ.nome.length > 0 && PONTO_MATRIZ.nome.length <= 160);
  assert.ok(PONTO_MATRIZ.nota.length <= 400);
  assert.ok(PONTO_MATRIZ.icone.length <= 8);
  assert.ok(c.criatura.length > 0 && c.criatura.length <= 60);
  assert.ok(c.frase.length > 0 && c.frase.length <= 160);
  assert.equal(c.raridade, 'comum');
  assert.ok(RARIDADES.includes(c.raridade));
  assert.ok(CATEGORIAS_CARTA.includes(c.categoria_carta));
});

test('Matriz: categoria da carta bate com a que o servidor deduziria das categorias do ponto', () => {
  assert.equal(categoriaDaCarta({ categorias: PONTO_MATRIZ.categorias, oculto: false }), c.categoria_carta);
});

test('Matriz: a arte tem nome aceito pelo painel e o arquivo existe', () => {
  assert.match(c.arte, /^[\w.-]{1,80}$/);
  const arquivo = fileURLToPath(new URL(`../../client/public/cartas/${c.arte}`, import.meta.url));
  assert.ok(existsSync(arquivo), `falta ${arquivo}`);
  assert.ok(statSync(arquivo).size < 300 * 1024, 'arte de carta deve ser leve (menos de 300 KB)');
});
