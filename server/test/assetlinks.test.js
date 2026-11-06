import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PACOTE_ANDROID_PADRAO, assetLinksHandler, lerConfiguracao, montarAssetLinks, normalizarImpressao,
} from '../assetlinks.js';

const HEX_A = 'AB'.repeat(32);
const CANONICA_A = Array.from({ length: 32 }, () => 'AB').join(':');
const CANONICA_B = Array.from({ length: 32 }, () => '0F').join(':');

function respostaFalsa() {
  const resposta = { status: 200, cabecalhos: {}, corpo: undefined };
  resposta.status = (codigo) => { resposta.codigo = codigo; return resposta; };
  resposta.setHeader = (nome, valor) => { resposta.cabecalhos[nome] = valor; };
  resposta.json = (corpo) => { resposta.corpo = corpo; return resposta; };
  return resposta;
}

test('normalizarImpressao aceita os formatos usuais e devolve o canônico do Google', () => {
  assert.equal(normalizarImpressao(CANONICA_A), CANONICA_A);
  assert.equal(normalizarImpressao(HEX_A.toLowerCase()), CANONICA_A);
  assert.equal(normalizarImpressao(` ${CANONICA_A.toLowerCase().replaceAll(':', ' ')} `), CANONICA_A);
  assert.equal(normalizarImpressao(CANONICA_A.replaceAll(':', '-')), CANONICA_A);
});

test('normalizarImpressao recusa o que não é SHA-256', () => {
  for (const ruim of ['', null, undefined, 'AB:CD', HEX_A.slice(0, 62), `${HEX_A}00`, 'Z'.repeat(64)]) {
    assert.equal(normalizarImpressao(ruim), null, `deveria recusar ${String(ruim)}`);
  }
});

test('lerConfiguracao: pacote padrão, remoção de duplicadas e contagem de inválidas', () => {
  const vazia = lerConfiguracao({});
  assert.deepEqual(vazia, { pacote: PACOTE_ANDROID_PADRAO, impressoes: [], invalidas: 0 });

  const config = lerConfiguracao({
    ANDROID_PACKAGE_NAME: ' online.exemplo.app ',
    ANDROID_SHA256_CERT_FINGERPRINTS: `${CANONICA_A}, ${HEX_A.toLowerCase()};${CANONICA_B}\nlixo`,
  });
  assert.equal(config.pacote, 'online.exemplo.app');
  assert.deepEqual(config.impressoes, [CANONICA_A, CANONICA_B]);
  assert.equal(config.invalidas, 1);
});

test('montarAssetLinks segue o formato do Google e fica nulo sem impressões', () => {
  assert.equal(montarAssetLinks({ pacote: PACOTE_ANDROID_PADRAO, impressoes: [] }), null);
  assert.deepEqual(montarAssetLinks({ pacote: PACOTE_ANDROID_PADRAO, impressoes: [CANONICA_A] }), [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: PACOTE_ANDROID_PADRAO, sha256_cert_fingerprints: [CANONICA_A] },
  }]);
});

test('rota responde 404 em JSON quando não configurada e o documento quando configurada', () => {
  const semConfig = respostaFalsa();
  assetLinksHandler({})({}, semConfig);
  assert.equal(semConfig.codigo, 404);
  assert.deepEqual(semConfig.corpo, { erro: 'assetlinks_nao_configurado' });

  const comConfig = respostaFalsa();
  assetLinksHandler({ ANDROID_SHA256_CERT_FINGERPRINTS: CANONICA_A })({}, comConfig);
  assert.equal(comConfig.codigo, undefined);
  assert.equal(comConfig.cabecalhos['Content-Type'], 'application/json; charset=utf-8');
  assert.equal(comConfig.cabecalhos['Cache-Control'], 'public, max-age=300');
  assert.equal(comConfig.corpo[0].target.package_name, PACOTE_ANDROID_PADRAO);
  assert.deepEqual(comConfig.corpo[0].target.sha256_cert_fingerprints, [CANONICA_A]);
});
