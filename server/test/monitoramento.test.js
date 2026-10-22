import test from 'node:test';
import assert from 'node:assert/strict';
import { deveRegistrar, descarregarMonitoramento, iniciarMonitoramento, limparEvento, monitoramentoLigado, registrarErro } from '../monitoramento.js';

test('sem SENTRY_DSN o monitoramento fica desligado e nada quebra', async () => {
  assert.equal(await iniciarMonitoramento({}), false);
  assert.equal(await iniciarMonitoramento({ SENTRY_DSN: '   ' }), false);
  assert.equal(monitoramentoLigado(), false);
  assert.doesNotThrow(() => registrarErro(new Error('x'), { requestId: 'abc', method: 'GET', path: '/api/x' }));
  await assert.doesNotReject(descarregarMonitoramento(10));
});

test('erros 4xx não são enviados; 5xx e erros sem status são', () => {
  assert.equal(deveRegistrar(Object.assign(new Error('json'), { status: 400 })), false);
  assert.equal(deveRegistrar(Object.assign(new Error('grande'), { statusCode: 413 })), false);
  assert.equal(deveRegistrar(Object.assign(new Error('falha'), { status: 500 })), true);
  assert.equal(deveRegistrar(new Error('sem status')), true);
  assert.equal(deveRegistrar(null), true);
});

test('limparEvento remove usuário, cookies, cabeçalhos, corpo e query string', () => {
  const evento = limparEvento({
    user: { email: 'pessoa@exemplo.com', ip_address: '1.2.3.4' },
    request: {
      method: 'POST',
      url: 'https://app.exemplo.com/api/entrar?token=segredo',
      cookies: { mais1km_session: 'abc' },
      headers: { cookie: 'mais1km_session=abc', authorization: 'Bearer x' },
      data: { email: 'pessoa@exemplo.com', senha: '12345678' },
      query_string: 'token=segredo',
    },
    tags: { request_id: 'req-1' },
  });
  assert.equal(evento.user, undefined);
  assert.deepEqual(evento.request, { method: 'POST', url: 'https://app.exemplo.com/api/entrar' });
  assert.deepEqual(evento.tags, { request_id: 'req-1' });
  assert.doesNotThrow(() => limparEvento({}));
});

test('limparEvento oculta e-mails dentro de mensagens de erro e descarta breadcrumbs', () => {
  const evento = limparEvento({
    message: 'falha para pessoa@exemplo.com',
    exception: { values: [{ type: 'Error', value: "Duplicate entry 'Maria.Silva+1@mail.com.br' for key 'contas.email'" }] },
    breadcrumbs: [{ message: 'GET https://x' }],
  });
  assert.equal(evento.message, 'falha para [email]');
  assert.equal(evento.exception.values[0].value, "Duplicate entry '[email]' for key 'contas.email'");
  assert.equal(evento.breadcrumbs, undefined);
});
