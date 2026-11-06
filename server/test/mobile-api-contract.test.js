import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const fromHere = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const [openapiText, indexSource, recoverySource, gamificationSource, adminSource] = await Promise.all([
  readFile(fromHere('../../docs/api/openapi.yaml'), 'utf8'),
  readFile(fromHere('../index.js'), 'utf8'),
  readFile(fromHere('../recuperacao-senha.js'), 'utf8'),
  readFile(fromHere('../gamificacao.js'), 'utf8'),
  readFile(fromHere('../admin.js'), 'utf8'),
]);
const api = YAML.parse(openapiText);

function operation(path, method) {
  const value = api.paths?.[path]?.[method];
  assert.ok(value, `OpenAPI deve declarar ${method.toUpperCase()} ${path}`);
  return value;
}

function assertRouteSource(source, method, route) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(source, new RegExp(`app\\.${method}\\(['"]${escaped}['"]`), `handler deve registrar ${method.toUpperCase()} ${route}`);
}

test('rotas críticas de conta, carimbo e caderneta constam no código e no OpenAPI', () => {
  const directRoutes = [
    ['post', '/api/conta/criar'],
    ['post', '/api/conta/entrar'],
    ['get', '/api/conta/sessao'],
    ['post', '/api/conta/sair'],
    ['put', '/api/conta'],
    ['delete', '/api/eu'],
    ['post', '/api/tags/:codigo/carimbar'],
    ['post', '/api/eventos/:slug/carimbar'],
    ['get', '/api/caderneta'],
  ];
  for (const [method, route] of directRoutes) {
    assertRouteSource(indexSource, method, route);
    operation(route.replaceAll(':codigo', '{codigo}').replaceAll(':slug', '{slug}'), method);
  }

  assert.match(indexSource, /app\.use\(['"]\/api\/conta['"],\s*recuperacaoSenhaRouter\)/);
  for (const route of ['/recuperar-senha', '/redefinir-senha']) {
    assert.match(recoverySource, new RegExp(`recuperacaoSenhaRouter\\.post\\(['"]${route}['"]`));
    operation(`/api/conta${route}`, 'post');
  }

  assert.match(indexSource, /app\.use\(['"]\/api\/gamificacao['"],\s*gamificacaoRouter/);
  for (const [route, method] of [['/me', 'get'], ['/podio', 'get'], ['/participacao', 'put']]) {
    assert.match(gamificationSource, new RegExp(`router\\.${method}\\(['"]${route}['"]`));
    operation(`/api/gamificacao${route}`, method);
  }
});

test('login de conta documenta sessão em cookie sem token Bearer no JSON', () => {
  const cookie = api.components.securitySchemes.sessionCookie;
  assert.equal(cookie.type, 'apiKey');
  assert.equal(cookie.in, 'cookie');
  assert.equal(cookie.name, 'mais1km_session');

  for (const route of ['/api/conta/criar', '/api/conta/entrar']) {
    const op = operation(route, 'post');
    assert.deepEqual(op.security, []);
    const successCode = route.endsWith('/criar') ? '201' : '200';
    const response = op.responses[successCode];
    assert.ok(response.headers?.['Set-Cookie'], `${route} deve documentar Set-Cookie`);
    assert.match(response.description, /cookie/i);
    const schema = response.content['application/json'].schema;
    assert.equal(schema.$ref, '#/components/schemas/UsuarioResposta');
  }

  assert.deepEqual(Object.keys(api.components.schemas.UsuarioResposta.properties), ['usuario']);
  assert.equal(api.components.schemas.Usuario.properties.token, undefined);
  const overview = api.info.description;
  assert.match(overview, /SameSite=Lax` por padrão/);
  assert.match(overview, /não é devolvido no JSON/);
  assert.match(operation('/api/conta/entrar', 'post').description, /8 por 15 minutos por e-mail/);
});

test('sessão e logout documentam autenticação e revogação da sessão atual', () => {
  const session = operation('/api/conta/sessao', 'get');
  const logout = operation('/api/conta/sair', 'post');
  assert.deepEqual(session.security, [{ sessionCookie: [] }]);
  assert.deepEqual(logout.security, [{ sessionCookie: [] }]);
  assert.equal(logout.requestBody.required, false);
  assert.match(logout.requestBody.content['application/json'].schema.properties.todos.description, /revoga todas/);
  assert.ok(logout.responses['200'].headers?.['Set-Cookie']);
});

test('carimbos documentam os campos exatos de chave e localização aceitos pelo servidor', () => {
  const tag = operation('/api/tags/{codigo}/carimbar', 'post');
  const event = operation('/api/eventos/{slug}/carimbar', 'post');
  const schemas = api.components.schemas;
  assert.deepEqual(Object.keys(schemas.TagCarimbar.properties).sort(), ['chave', 'pos']);
  assert.deepEqual(Object.keys(schemas.EventoCarimbar.properties).sort(), ['chave', 'codigo', 'pos']);
  assert.deepEqual(Object.keys(schemas.PosicaoCarimbo.properties).sort(), ['acc', 'lat', 'lng']);
  assert.deepEqual(schemas.EventoCarimbar.required, ['codigo']);
  assert.equal(tag.requestBody.content['application/json'].schema.$ref, '#/components/schemas/TagCarimbar');
  assert.equal(event.requestBody.required, true);
  assert.equal(event.requestBody.content['application/json'].schema.$ref, '#/components/schemas/EventoCarimbar');
  assert.ok(tag.responses['403']);
  assert.ok(event.responses['403']);
  assert.equal(event.responses['200'].content['application/json'].schema.$ref, '#/components/schemas/CarimboEventoResposta');
});

test('catálogo público e circuitos não expõem pontos ou rotas não publicados', () => {
  const start = adminSource.indexOf('export async function catalogoPublico()');
  const end = adminSource.indexOf('// Gate de publicação.', start);
  assert.notEqual(start, -1, 'admin deve exportar catalogoPublico');
  assert.notEqual(end, -1, 'a função de catálogo deve ter um limite reconhecível');
  const catalogSource = adminSource.slice(start, end);

  assert.match(
    catalogSource,
    /FROM tags t JOIN rotas r ON r\.id = t\.rota_id WHERE t\.status = 'publicado' AND r\.status = 'publicado'/,
  );
  assert.match(
    catalogSource,
    /JOIN rotas r ON r\.id = t\.rota_id\s+WHERE t\.status = 'publicado' AND r\.status = 'publicado'/,
  );
});
