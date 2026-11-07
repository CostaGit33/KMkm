import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const main = await readFile(path.join(root, 'main.js'), 'utf8');
const app = await readFile(path.join(root, 'app.js'), 'utf8');
const tag = await readFile(path.join(root, 'tag.js'), 'utf8');

test('retorno da TAG ignora o App Link inicial antigo no Capacitor', () => {
  const retorno = main.indexOf("const retornoTag = new URLSearchParams(window.location.search).get('retorno')");
  const launchUrl = main.indexOf('App.getLaunchUrl()');
  assert.notEqual(retorno, -1, 'main.js deve reconhecer o parâmetro de retorno');
  assert.ok(launchUrl > retorno, 'o retorno deve ser tratado antes de consultar o App Link inicial');
  assert.match(main, /retornoTag === 'colecao' \|\| retornoTag === 'home'/);
});

test('retorno da TAG abre a coleção dentro da aplicação', () => {
  assert.match(app, /let view = retornoTag === "colecao" \? "collection" : "home"/);
  assert.match(app, /window\.history\.replaceState\(\{\}, "", window\.location\.pathname\)/);
  assert.ok(tag.includes('class="primary-button button-full" href="/?retorno=colecao">Ver minha coleção'));
  assert.ok(tag.includes('class="outline-button button-full" href="/?retorno=colecao">Ver minha coleção'));
});

test('links de saída de erro ou entrada da TAG retornam à caderneta', () => {
  assert.ok(tag.includes('class="text-link tag-back" href="/?retorno=home">Ir para minha caderneta'));
  assert.ok(tag.includes('class="text-link tag-back" href="/?retorno=home">Voltar à caderneta'));
});
