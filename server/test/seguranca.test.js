import test from 'node:test';
import assert from 'node:assert/strict';
import { montarCsp } from '../csp.js';
import { cookieAttrs, cookieSameSite, verificacaoFalsa } from '../security.js';
import {
  avaliarDeslocamento, avaliarLocalizacao, avaliarRitmo, chaveConfere, chaveDoPonto, distanciaM,
  exigeChave, raioDoPonto, segredoDasChaves, urlDoPonto, validarPosicao,
} from '../tag-acesso.js';

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres-ok';

test('CSP estrita: sem script embutido nem eval, mas com o GA4 liberado', () => {
  const csp = montarCsp();
  const script = csp.split('; ').find((d) => d.startsWith('script-src'));
  assert.ok(!script.includes("'unsafe-inline'") && !script.includes("'unsafe-eval'"));
  assert.ok(script.includes('https://www.googletagmanager.com'));
  assert.ok(csp.includes('https://www.google-analytics.com') && csp.includes('https://*.analytics.google.com'));
  assert.ok(csp.includes("frame-ancestors 'self'") && !csp.includes('frame-ancestors \'self\' https:'));
  assert.ok(csp.includes("object-src 'none'") && csp.includes("form-action 'self'"));
});

test('CSP legada (saída temporária) devolve unsafe-inline e unsafe-eval só em script-src', () => {
  const script = montarCsp({ legado: true }).split('; ').find((d) => d.startsWith('script-src'));
  assert.ok(script.includes("'unsafe-inline'") && script.includes("'unsafe-eval'"));
});

test('CSP: upgrade-insecure-requests só em HTTPS e frame-ancestors só aceita valores seguros', () => {
  assert.ok(!montarCsp({ https: false }).includes('upgrade-insecure-requests'));
  assert.ok(montarCsp({ https: true }).includes('upgrade-insecure-requests'));
  assert.ok(montarCsp({ frameAncestors: "https://exemplo.com; script-src *" }).includes("frame-ancestors 'self'"));
  assert.ok(montarCsp({ frameAncestors: 'https://exemplo.com' }).includes('frame-ancestors https://exemplo.com'));
});

test('cookie de sessão: Lax por padrão, Secure em HTTPS, None só se pedido e sempre com Secure', () => {
  assert.equal(cookieSameSite({}), 'Lax');
  assert.equal(cookieSameSite({ COOKIE_SAMESITE: 'none' }), 'None');
  assert.equal(cookieSameSite({ COOKIE_SAMESITE: 'qualquer' }), 'Lax');
  assert.match(cookieAttrs({ https: true }), /HttpOnly; SameSite=Lax; Secure$/);
  assert.match(cookieAttrs({ https: false }), /HttpOnly; SameSite=Lax$/);
  assert.match(cookieAttrs({ https: false, sameSite: 'None' }), /SameSite=None; Secure$/);
});

test('verificação falsa nunca aprova e não lança', () => {
  assert.equal(verificacaoFalsa('qualquer-senha'), false);
});

test('chave do link: determinística, depende do código e da versão, e só vale com segredo longo', () => {
  assert.equal(segredoDasChaves({ TAG_KEY_SECRET: 'curto' }), null);
  assert.equal(segredoDasChaves({ TAG_KEY_SECRET: SEGREDO }), SEGREDO);
  const k1 = chaveDoPonto('eu-001', 1, SEGREDO);
  assert.equal(k1, chaveDoPonto('EU-001', 1, SEGREDO));
  assert.notEqual(k1, chaveDoPonto('eu-001', 2, SEGREDO));
  assert.notEqual(k1, chaveDoPonto('eu-002', 1, SEGREDO));
  assert.match(k1, /^[\w-]{22}$/);
  assert.equal(chaveDoPonto('eu-001', 1, null), null);
});

test('chaveConfere: link aberto (versão 0) passa; com chave, só a certa; girar invalida a antiga', () => {
  const aberto = { codigo: 'eu-001', chave_versao: 0 };
  assert.equal(exigeChave(aberto, SEGREDO), false);
  assert.equal(chaveConfere('', aberto, SEGREDO), true);
  const v1 = { codigo: 'eu-001', chave_versao: 1 };
  const k1 = chaveDoPonto('eu-001', 1, SEGREDO);
  assert.equal(chaveConfere(k1, v1, SEGREDO), true);
  assert.equal(chaveConfere('', v1, SEGREDO), false);
  assert.equal(chaveConfere('x'.repeat(22), v1, SEGREDO), false);
  assert.equal(chaveConfere(k1, { codigo: 'eu-001', chave_versao: 2 }, SEGREDO), false);
  assert.equal(chaveConfere(k1, { codigo: 'eu-002', chave_versao: 1 }, SEGREDO), false);
  // sem segredo configurado, nada é exigido (o servidor avisa no log e em /api/saude)
  assert.equal(chaveConfere('', v1, null), true);
});

test('urlDoPonto monta o link com a chave e sem barra dupla', () => {
  assert.equal(urlDoPonto('https://app.exemplo.com/', { codigo: 'eu-001', chave_versao: 0 }, SEGREDO), 'https://app.exemplo.com/t/eu-001');
  const url = urlDoPonto('https://app.exemplo.com', { codigo: 'eu-001', chave_versao: 1 }, SEGREDO);
  assert.equal(url, `https://app.exemplo.com/t/eu-001?k=${chaveDoPonto('eu-001', 1, SEGREDO)}`);
});

test('distância (haversine): Praça da Bandeira ↔ ponto a ~111 m ao norte', () => {
  const a = { lat: -16.3751286, lng: -39.5881012 };
  const b = { lat: -16.3741286, lng: -39.5881012 };
  const d = distanciaM(a, b);
  assert.ok(d > 110 && d < 112, `distância ${d}`);
  assert.equal(Math.round(distanciaM(a, a)), 0);
});

test('posição enviada pelo aparelho é validada', () => {
  assert.equal(validarPosicao(null), null);
  assert.equal(validarPosicao({ lat: 'x', lng: 1 }), null);
  assert.equal(validarPosicao({ lat: 91, lng: 0 }), null);
  assert.deepEqual(validarPosicao({ lat: -16.37, lng: -39.58, acc: 5000 }), { lat: -16.37, lng: -39.58, acc: 1000 });
  assert.deepEqual(validarPosicao({ lat: -16.37, lng: -39.58 }), { lat: -16.37, lng: -39.58, acc: 0 });
});

test('raio: usa 100 m por padrão, aceita raio próprio e não permite desligar com zero', () => {
  const com = { lat: '-16.3751286', lng: '-39.5881012', raio_m: null };
  assert.equal(raioDoPonto(com), 100);
  assert.equal(raioDoPonto(com, 200), 100);
  assert.equal(raioDoPonto({ ...com, raio_m: 80 }, 200), 80);
  assert.equal(raioDoPonto({ ...com, raio_m: 0 }, 200), 200);
  assert.equal(raioDoPonto({ ...com, raio_m: 99999 }, 0), 100);
  assert.equal(raioDoPonto({ ...com, lat: null }, 100), 100);
});

test('localização: exige GPS preciso, respeita 100 m exatos e bloqueia pontos sem coordenadas', () => {
  const tag = { lat: -16.3751286, lng: -39.5881012, raio_m: 100 };
  assert.deepEqual(avaliarLocalizacao({ ...tag, raio_m: null }, null, 0), { exigida: false, ok: true });
  assert.equal(avaliarLocalizacao(tag, null).motivo, 'localizacao_necessaria');
  assert.equal(avaliarLocalizacao(tag, { lat: -16.3751286, lng: -39.5881012, acc: 10 }).ok, true);
  const longe = avaliarLocalizacao(tag, { lat: -16.3741286, lng: -39.5881012, acc: 5 }); // ~111 m
  assert.equal(longe.ok, false);
  assert.equal(longe.motivo, 'fora_do_raio');
  assert.ok(longe.distancia > 100 && longe.raio === 100);
  const dentroComGpsRuim = avaliarLocalizacao(tag, { lat: -16.3751286, lng: -39.5881012, acc: 80 });
  assert.equal(dentroComGpsRuim.ok, false);
  assert.equal(dentroComGpsRuim.motivo, 'gps_impreciso');
  assert.equal(avaliarLocalizacao(tag, { lat: -16.3751286, lng: -39.5881012, acc: 0 }).motivo, 'gps_impreciso');
  assert.equal(avaliarLocalizacao({ ...tag, lat: null, lng: null }, { lat: tag.lat, lng: tag.lng, acc: 10 }).motivo, 'ponto_sem_coordenadas');
  assert.equal(avaliarLocalizacao(tag, { lat: -16.3651286, lng: -39.5881012, acc: 1000 }).motivo, 'gps_impreciso');
});

test('deslocamento impossível é marcado; deslocamento plausível ou curto, não', () => {
  const ponto = { lat: -16.3751286, lng: -39.5881012 };
  const longe = { lat: -16.3351286, lng: -39.5881012, segundos: 60 };   // ~4,4 km em 1 min
  assert.equal(avaliarDeslocamento(longe, ponto), 'deslocamento_impossivel');
  assert.equal(avaliarDeslocamento({ ...longe, segundos: 3600 }, ponto), null); // 1 h: de carro dá
  assert.equal(avaliarDeslocamento({ lat: -16.3750286, lng: -39.5881012, segundos: 1 }, ponto), null); // ~11 m
  assert.equal(avaliarDeslocamento(null, ponto), null);
  assert.equal(avaliarDeslocamento({ lat: null, lng: null, segundos: 1 }, ponto), null);
});

test('ritmo: marca a partir de 8 carimbos em 10 min e bloqueia a partir de 15', () => {
  assert.deepEqual(avaliarRitmo(0), { bloquear: false, suspeito: null });
  assert.deepEqual(avaliarRitmo(7), { bloquear: false, suspeito: null });
  assert.deepEqual(avaliarRitmo(8), { bloquear: false, suspeito: 'ritmo_alto' });
  assert.deepEqual(avaliarRitmo(15), { bloquear: true });
});
