// Rastreio de erros do servidor (Sentry), opcional.
// Só liga quando SENTRY_DSN existe no ambiente. Sem a variável, o pacote nem é carregado e o servidor
// se comporta exatamente como antes. Não enviamos e-mail, nome, cookies, cabeçalhos nem corpo de requisição:
// só a mensagem do erro, a pilha, a versão (RELEASE_VERSION) e o X-Request-Id para achar a linha no log.

let sentry = null;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const ocultarEmails = (texto) => (typeof texto === 'string' ? texto.replace(EMAIL, '[email]') : texto);

// Remove dados pessoais que o SDK ou um erro possam trazer. O MySQL, por exemplo, escreve o valor na mensagem
// ("Duplicate entry 'pessoa@exemplo.com' for key ..."), então e-mails dentro de mensagens de erro também são ocultados.
export function limparEvento(evento) {
  if (evento.user) delete evento.user;
  delete evento.breadcrumbs;
  if (evento.message) evento.message = ocultarEmails(evento.message);
  for (const item of evento.exception?.values || []) item.value = ocultarEmails(item.value);
  if (evento.request) {
    delete evento.request.cookies;
    delete evento.request.headers;
    delete evento.request.data;
    delete evento.request.query_string;
    if (typeof evento.request.url === 'string') evento.request.url = evento.request.url.split('?')[0];
  }
  return evento;
}

export async function iniciarMonitoramento(env = process.env) {
  const dsn = String(env.SENTRY_DSN || '').trim();
  if (!dsn) return false;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      release: env.RELEASE_VERSION || undefined,
      environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV || 'production',
      sendDefaultPii: false,
      tracesSampleRate: 0,
      // Sem breadcrumbs de console: os logs do app já têm caminho e request_id, e preferimos não replicá-los.
      // Promessa rejeitada sem tratamento continua derrubando o processo (o Easypanel reinicia), como sem o Sentry;
      // o modo padrão do SDK ("warn") engoliria o erro e manteria o app vivo em estado incerto.
      integrations: (padrao) => [
        ...padrao.filter((item) => item.name !== 'Console' && item.name !== 'OnUnhandledRejection'),
        Sentry.onUnhandledRejectionIntegration({ mode: 'strict' }),
      ],
      beforeSend: limparEvento,
    });
    sentry = Sentry;
    console.log(JSON.stringify({ type: 'monitoramento', sentry: 'ligado', release: env.RELEASE_VERSION || null }));
    return true;
  } catch (error) {
    // Falha no monitoramento nunca derruba o app.
    console.error(JSON.stringify({ type: 'monitoramento', sentry: 'falhou', error: error?.message || String(error) }));
    return false;
  }
}

// Erros de cliente (4xx) não são falhas do servidor e não vão para o Sentry.
export function deveRegistrar(error) {
  const status = Number(error?.status ?? error?.statusCode);
  return !(Number.isInteger(status) && status >= 400 && status < 500);
}

export function registrarErro(error, { requestId, method, path } = {}) {
  if (!sentry || !deveRegistrar(error)) return;
  try {
    sentry.withScope((scope) => {
      if (requestId) scope.setTag('request_id', requestId);
      if (method) scope.setTag('http.method', method);
      if (path) scope.setTag('http.path', path);
      sentry.captureException(error);
    });
  } catch { /* ignora */ }
}

export async function descarregarMonitoramento(ms = 2000) {
  if (!sentry) return;
  try { await sentry.flush(ms); } catch { /* ignora */ }
}

export const monitoramentoLigado = () => sentry !== null;
