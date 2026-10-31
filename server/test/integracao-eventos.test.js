import test from 'node:test';
import assert from 'node:assert/strict';
import { atrasoRetry, webhookConfigurado } from '../integracoes/eventos-n8n.js';

test('webhook só é considerado configurado com HTTPS e segredo de 32+ caracteres', () => {
  const segredo = 's'.repeat(32);
  assert.equal(webhookConfigurado({ N8N_EVENTS_WEBHOOK_URL: 'https://n8n.exemplo.com/webhook/x', N8N_EVENTS_SECRET: segredo }), true);
  assert.equal(webhookConfigurado({ N8N_EVENTS_WEBHOOK_URL: 'http://n8n.exemplo.com/webhook/x', N8N_EVENTS_SECRET: segredo }), false);
  assert.equal(webhookConfigurado({ N8N_EVENTS_WEBHOOK_URL: 'https://n8n.exemplo.com/webhook/x', N8N_EVENTS_SECRET: 'curto' }), false);
  assert.equal(webhookConfigurado({ N8N_EVENTS_SECRET: segredo }), false);
});

test('repetição usa backoff exponencial com limite de uma hora', () => {
  assert.equal(atrasoRetry(1), 5);
  assert.equal(atrasoRetry(2), 10);
  assert.equal(atrasoRetry(3), 20);
  assert.equal(atrasoRetry(8), 640);
  assert.equal(atrasoRetry(12), 3600);
  assert.equal(atrasoRetry(99), 3600);
});
