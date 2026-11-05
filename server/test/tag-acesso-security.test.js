import test from 'node:test';
import assert from 'node:assert/strict';
import { chaveConfere, chaveDoPonto, exigeChave, urlDoPonto } from '../tag-acesso.js';

const segredo = 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';
const tagProtegida = { codigo: 'eu-001', chave_versao: 1 };
const tagLegada = { codigo: 'eu-002', chave_versao: 0 };

test('TAG protegida continua exigindo chave mesmo quando o segredo está ausente', () => {
  assert.equal(exigeChave(tagProtegida), true);
  assert.equal(chaveConfere('', tagProtegida, null), false);
  assert.equal(chaveConfere('qualquer-valor', tagProtegida, null), false);
});

test('TAG protegida rejeita chave ausente ou incorreta e aceita apenas HMAC correto', () => {
  const correta = chaveDoPonto(tagProtegida.codigo, tagProtegida.chave_versao, segredo);
  assert.ok(correta);
  assert.equal(chaveConfere('', tagProtegida, segredo), false);
  assert.equal(chaveConfere('incorreta', tagProtegida, segredo), false);
  assert.equal(chaveConfere(correta, tagProtegida, segredo), true);
});

test('TAG sem versão de chave mantém compatibilidade legada', () => {
  assert.equal(exigeChave(tagLegada), false);
  assert.equal(chaveConfere('', tagLegada, null), true);
});

test('exportação de link não inventa chave quando o segredo está indisponível', () => {
  assert.equal(urlDoPonto('https://exemplo.test///', tagProtegida, null), 'https://exemplo.test/t/eu-001');
});
