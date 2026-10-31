import test from 'node:test';
import assert from 'node:assert/strict';
import { atrasoRetry, registrarEventoNaTransacao, webhookConfigurado } from '../integracoes/eventos-n8n.js';

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

test('evento é inserido na conexão recebida, pronto para participar da transação de negócio', async () => {
  let chamada;
  const connection = {
    async query(sql, params) {
      chamada = { sql, params };
      return [{ affectedRows: 1 }, []];
    },
  };
  const id = await registrarEventoNaTransacao(connection, 'stamp.created', { point_code: 'eu-001' });
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.match(chamada.sql, /INSERT INTO integracao_eventos/);
  assert.equal(chamada.params[0], id);
  assert.equal(chamada.params[1], 'stamp.created');
  assert.deepEqual(JSON.parse(chamada.params[2]), { point_code: 'eu-001' });
});

test('evento inválido ou payload excessivo é recusado antes da gravação', async () => {
  let chamadas = 0;
  const connection = { async query() { chamadas += 1; } };
  await assert.rejects(registrarEventoNaTransacao(connection, 'Tipo inválido', {}), /tipo_evento_invalido/);
  await assert.rejects(registrarEventoNaTransacao(connection, 'stamp.created', { texto: 'x'.repeat(9000) }), /payload_grande/);
  assert.equal(chamadas, 0);
});
