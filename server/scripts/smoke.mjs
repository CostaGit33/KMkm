#!/usr/bin/env node
// Teste de fumaça da API do +1 KM, contra qualquer servidor no ar (local ou Easypanel).
//
//   BASE_URL=https://seu-app.easypanel.host node server/scripts/smoke.mjs
//
// Modo básico (padrão): só leitura e uma conta descartável que é criada e excluída no fim.
// Modo profundo (--profundo): exige ADMIN_EMAIL e ADMIN_SENHA de uma conta admin e testa a edição numerada
// (cria um card de patrocínio com tiragem 2, carimba com 3 contas e apaga tudo). Não rode em produção com
// pontos reais publicados sem combinar o horário: o card ocupa os pontos durante o teste.
const base = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const profundo = process.argv.includes('--profundo');
const sufixo = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let falhas = 0;
let total = 0;
const ok = (nome, cond, detalhe = '') => {
  total += 1;
  if (!cond) falhas += 1;
  console.log(`${cond ? '✓' : '✗'} ${nome}${!cond && detalhe ? `  → ${detalhe}` : ''}`);
};

function sessao() {
  const jar = new Map();
  const chamar = async (metodo, caminho, corpo) => {
    const res = await fetch(`${base}${caminho}`, {
      method: metodo,
      headers: { 'content-type': 'application/json', ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      redirect: 'manual',
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [par] = c.split(';');
      const i = par.indexOf('=');
      const nome = par.slice(0, i).trim();
      const valor = par.slice(i + 1).trim();
      if (!valor || /max-age=0/i.test(c) || /expires=thu, 01 jan 1970/i.test(c)) jar.delete(nome); else jar.set(nome, valor);
    }
    const texto = await res.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { /* resposta não-JSON */ }
    return { status: res.status, json, texto, headers: res.headers };
  };
  return { chamar };
}

async function criarConta(rotulo) {
  const s = sessao();
  const email = `smoke-${rotulo}-${sufixo}@teste.invalid`;
  const r = await s.chamar('POST', '/api/conta/criar', { nome: `Smoke ${rotulo}`, email, senha: 'smoke-senha-123' });
  return { s, email, r };
}

async function basico() {
  console.log(`\n== Básico · ${base}`);
  const anon = sessao();
  let r = await anon.chamar('GET', '/api/saude');
  ok('GET /api/saude responde 200 com banco ok', r.status === 200 && r.json?.ok === true && r.json?.banco === 'ok', `${r.status} ${r.texto.slice(0, 80)}`);

  r = await anon.chamar('GET', '/api/catalogo');
  ok('GET /api/catalogo traz pontos e circuitos', r.status === 200 && Array.isArray(r.json?.pontos) && Array.isArray(r.json?.circuitos), `${r.status}`);

  r = await anon.chamar('GET', '/');
  ok('GET / entrega o app (HTML)', r.status === 200 && /<title>/i.test(r.texto));
  r = await anon.chamar('GET', '/privacidade');
  ok('GET /privacidade entrega a política de privacidade', r.status === 200 && /privacidade/i.test(r.texto), `${r.status}`);
  r = await anon.chamar('GET', '/excluir-conta');
  ok('GET /excluir-conta entrega as instruções de exclusão', r.status === 200 && /exclu/i.test(r.texto), `${r.status}`);
  r = await anon.chamar('GET', '/admin');
  ok('GET /admin entrega a página com noindex', r.status === 200 && /noindex/.test(r.headers.get('x-robots-tag') || ''), `${r.status}`);
  r = await anon.chamar('GET', '/api/rota-que-nao-existe');
  ok('Rota de API inexistente responde 404 em JSON', r.status === 404 && r.json?.erro === 'rota_api_inexistente', `${r.status}`);

  for (const [metodo, caminho] of [['GET', '/api/caderneta'], ['GET', '/api/gamificacao/me'], ['GET', '/api/admin/dados'], ['POST', '/api/tags/eu-001/carimbar'], ['DELETE', '/api/eu']]) {
    r = await anon.chamar(metodo, caminho, metodo === 'POST' ? {} : undefined);
    ok(`${metodo} ${caminho} sem sessão é negado (401/403)`, r.status === 401 || r.status === 403, `${r.status}`);
  }

  r = await anon.chamar('GET', '/api/gamificacao/podio?periodo=geral&limite=3');
  ok('GET /api/gamificacao/podio é público ou exige sessão (nunca erro 5xx)', r.status < 500, `${r.status}`);

  const c = await criarConta('basico');
  ok('POST /api/conta/criar cria conta (201)', c.r.status === 201, `${c.r.status} ${c.r.texto.slice(0, 80)}`);
  let r2 = await sessao().chamar('POST', '/api/conta/criar', { nome: 'X', email: 'nao-e-email', senha: '1' });
  ok('Conta com dados inválidos é recusada (400)', r2.status === 400, `${r2.status}`);

  r = await c.s.chamar('GET', '/api/conta/sessao');
  ok('Sessão da conta nova é válida', r.status === 200 && r.json?.usuario?.email === c.email, `${r.status}`);

  r = await c.s.chamar('GET', '/api/caderneta');
  ok('GET /api/caderneta traz rotas, eventos e coleção', r.status === 200 && Array.isArray(r.json?.rotas) && Array.isArray(r.json?.eventos) && r.json?.colecao && Array.isArray(r.json.colecao.itens), `${r.status} ${r.texto.slice(0, 100)}`);
  const colecao = r.json?.colecao;
  ok('Coleção nova começa com 0 desbloqueadas e sem revelar nomes', colecao && colecao.capturadas === 0 && colecao.itens.every((i) => i.criatura === null && i.capturada === false));

  r = await c.s.chamar('POST', '/api/tags/tag-que-nao-existe/carimbar', {});
  ok('Carimbar tag inexistente responde 404', r.status === 404 && r.json?.erro === 'tag_inexistente', `${r.status}`);

  r = await c.s.chamar('GET', '/api/gamificacao/me');
  ok('GET /api/gamificacao/me responde 200 com XP', r.status === 200 && typeof r.json?.xp?.total === 'number', `${r.status} ${r.texto.slice(0, 100)}`);

  // Primeiro ponto publicado (se houver) para testar o desbloqueio.
  const publicados = (await c.s.chamar('GET', '/api/caderneta')).json?.colecao?.itens ?? [];
  if (publicados.length) {
    const codigo = publicados[0].codigo;
    r = await c.s.chamar('POST', `/api/tags/${encodeURIComponent(codigo)}/carimbar`, {});
    ok(`Carimbar ${codigo} responde 200 e revela a criatura`, r.status === 200 && r.json?.criatura?.nova === true && Boolean(r.json.criatura.nome), `${r.status} ${r.texto.slice(0, 120)}`);
    const nome = r.json?.criatura?.nome;
    r = await c.s.chamar('POST', `/api/tags/${encodeURIComponent(codigo)}/carimbar`, {});
    ok('Segundo toque no mesmo ponto não desbloqueia de novo', r.status === 200 && r.json?.criatura?.nova === false && r.json?.repetido === true, `${r.status}`);
    r = await c.s.chamar('GET', '/api/caderneta');
    const item = r.json?.colecao?.itens?.find((i) => i.codigo === codigo);
    ok('Carta traz número e categoria, sem estágio de evolução', Number.isInteger(item?.carta) && ['natureza','historia','cultura','trabalho','litoral','misterio'].includes(item?.categoria) && item?.estagio === undefined && item?.proximo_estagio === undefined, JSON.stringify(item));
    ok('Coleção passa a mostrar o personagem desbloqueado', item?.capturada === true && item?.criatura === nome && r.json.colecao.capturadas === 1, JSON.stringify(item));
  } else {
    console.log('· Nenhum ponto publicado no servidor: pulei os testes de desbloqueio.');
  }

  r = await c.s.chamar('DELETE', '/api/eu');
  ok('DELETE /api/eu apaga a conta de teste', r.status === 200 && r.json?.ok === true, `${r.status}`);
  r = await c.s.chamar('GET', '/api/conta/sessao');
  ok('Depois de excluir, a sessão não vale mais', r.status === 401, `${r.status}`);
}

async function aprofundado() {
  console.log('\n== Profundo · edição numerada');
  const { ADMIN_EMAIL, ADMIN_SENHA } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_SENHA) { ok('ADMIN_EMAIL e ADMIN_SENHA definidos', false, 'defina as duas variáveis'); return; }
  const admin = sessao();
  let r = await admin.chamar('POST', '/api/conta/entrar', { email: ADMIN_EMAIL, senha: ADMIN_SENHA });
  ok('Admin entra', r.status === 200, `${r.status}`);
  if (r.status !== 200) return;
  const dados = await admin.chamar('GET', '/api/admin/dados');
  ok('Admin lê /api/admin/dados', dados.status === 200, `${dados.status}`);
  const livres = (dados.json?.pontos ?? []).filter((p) => p.status === 'publicado' && !p.eventos).slice(0, 6);
  if (livres.length < 6) { ok('Há 6 pontos publicados e sem card para o teste', false, `só ${livres.length}`); return; }

  const slug = `smoke-${sufixo}`;
  const agora = Date.now();
  const fmt = (ms) => new Date(ms).toLocaleString('sv-SE', { timeZone: dados.json.fuso || 'America/Bahia' }).slice(0, 16);
  const corpo = { nome: `Smoke ${sufixo}`, slug, tipo: 'patrocinio', patrocinador: `Smoke Patrocinador ${sufixo}`, descricao: 'teste automático', inicio: fmt(agora - 3600e3), fim: fmt(agora + 3600e3), codigos: livres.map((p) => p.codigo), tiragem: 2, publicar: true };
  r = await admin.chamar('POST', '/api/admin/eventos', { ...corpo, tiragem: 0 });
  ok('Tiragem 0 é recusada', r.status === 400 && r.json?.erro === 'tiragem_invalida', `${r.status} ${r.texto.slice(0, 80)}`);
  r = await admin.chamar('POST', '/api/admin/eventos', corpo);
  ok('Admin cria card de patrocínio com tiragem 2', r.status === 201, `${r.status} ${r.texto.slice(0, 120)}`);
  if (r.status !== 201) return;

  const contas = [];
  try {
    for (const rot of ['a', 'b', 'c']) contas.push(await criarConta(rot));
    const ponto = livres[0].codigo;
    const numeros = [];
    // Dois toques ao mesmo tempo da mesma conta não podem gerar dois números.
    const [x, y] = await Promise.all([1, 2].map(() => contas[0].s.chamar('POST', `/api/tags/${ponto}/carimbar`, {})));
    numeros.push(x.json?.evento?.edicao?.numero, y.json?.evento?.edicao?.numero);
    ok('Dois toques simultâneos da mesma conta recebem o mesmo número', numeros[0] && numeros[0] === numeros[1], JSON.stringify(numeros));
    const ra = x.json?.evento?.edicao;
    ok('Conta A recebe o nº 1/2', ra?.numero === 1 && ra?.tiragem === 2, JSON.stringify(ra));
    const rb = (await contas[1].s.chamar('POST', `/api/tags/${ponto}/carimbar`, {})).json?.evento?.edicao;
    ok('Conta B recebe o nº 2/2 e a edição esgota', rb?.numero === 2 && rb?.esgotada === true, JSON.stringify(rb));
    const rc = (await contas[2].s.chamar('POST', `/api/tags/${ponto}/carimbar`, {})).json;
    ok('Conta C não recebe número (esgotada) mas carimba a visita', rc?.evento?.edicao?.numero === null && rc?.evento?.edicao?.esgotada === true && rc?.carimbo, JSON.stringify(rc?.evento?.edicao));
    const ra2 = (await contas[0].s.chamar('POST', `/api/tags/${livres[1].codigo}/carimbar`, {})).json?.evento?.edicao;
    ok('Segundo ponto do card não dá novo número à conta A', ra2?.numero === 1, JSON.stringify(ra2));
    const cad = (await contas[1].s.chamar('GET', '/api/caderneta')).json;
    const card = cad?.eventos?.find((e) => e.slug === slug);
    ok('Caderneta mostra o número da conta B', card?.edicao?.numero === 2 && card?.edicao?.tiragem === 2 && card?.edicao?.emitidos === 2, JSON.stringify(card?.edicao));
    const rel = (await admin.chamar('GET', `/api/admin/eventos/${slug}/relatorio`)).json;
    ok('Relatório do admin informa edição esgotada', rel?.edicao?.esgotada === true && rel?.edicao?.emitidos === 2, JSON.stringify(rel?.edicao));
    const alt = await admin.chamar('PUT', `/api/admin/eventos/${slug}`, { nome: `Smoke ${sufixo}`, descricao: 'editado', tiragem: 5 });
    const depois = (await admin.chamar('GET', '/api/admin/dados')).json?.eventos?.find((e) => e.slug === slug);
    ok('Depois do primeiro carimbo a tiragem fica travada', alt.status === 200 && depois?.tiragem === 2, JSON.stringify({ s: alt.status, t: depois?.tiragem }));
    // Excluir a conta B não libera o número 2.
    await contas[1].s.chamar('DELETE', '/api/eu');
    contas.splice(1, 1);
    const dd = (await admin.chamar('GET', '/api/admin/dados')).json?.eventos?.find((e) => e.slug === slug);
    ok('Excluir uma conta não devolve o número à tiragem', dd?.emitidos === 2, JSON.stringify(dd?.emitidos));
  } finally {
    for (const c of contas) await c.s.chamar('DELETE', '/api/eu');
    // O card tem carimbos; o admin só consegue excluí-lo depois que as contas somem.
    let del = await admin.chamar('DELETE', `/api/admin/eventos/${slug}`);
    if (del.status === 409) {
      await admin.chamar('POST', `/api/admin/eventos/${slug}/status`, { status: 'cancelado' });
      console.log(`· Card ${slug} ficou cancelado (ainda tem carimbos); apague-o no /admin.`);
    } else ok('Card de teste removido', del.status === 200, `${del.status}`);
  }
}

try {
  await basico();
  if (profundo) await aprofundado();
} catch (erro) {
  falhas += 1;
  console.error('Erro inesperado:', erro);
}
console.log(`\n${total - falhas}/${total} verificações passaram${falhas ? `, ${falhas} falharam` : ''}.`);
process.exit(falhas ? 1 : 0);
