// Regras de acesso ao carimbo físico, sem dependência de banco (testáveis isoladamente).
//
// O que cada camada realmente garante (leia antes de confiar nela):
//  - CHAVE DO LINK (?k=): impede adivinhar códigos (eu-001, eu-002…) e carimbar de longe. NÃO prova presença:
//    quem fotografa o QR ou lê a tag NFC consegue o link. Se vazar, gire a chave do ponto (revoga o link antigo).
//  - RAIO (geofence): confere a posição enviada pelo aparelho. Reduz carimbo à distância, mas o GPS pode ser
//    falsificado e depende de coordenadas validadas em campo. Desligado por padrão.
//  - SUSPEITA: marca (sem bloquear) carimbos com deslocamento fisicamente impossível entre dois pontos.
//  - Prova criptográfica de presença exige tag com contador assinado (NTAG 424 DNA); não está implementada aqui.
import crypto from 'node:crypto';

export function segredoDasChaves(env = process.env) {
  const segredo = String(env.TAG_KEY_SECRET || '');
  return segredo.length >= 32 ? segredo : null;
}

export function chaveDoPonto(codigo, versao, segredo) {
  if (!segredo) return null;
  return crypto.createHmac('sha256', segredo).update(`tag:${String(codigo).toLowerCase()}:${Number(versao)}`).digest().subarray(0, 16).toString('base64url');
}

export function exigeChave(tag, segredo) {
  return Boolean(segredo) && Number(tag?.chave_versao) > 0;
}

export function chaveConfere(informada, tag, segredo) {
  if (!exigeChave(tag, segredo)) return true;
  const esperada = chaveDoPonto(tag.codigo, tag.chave_versao, segredo);
  const recebida = String(informada || '');
  if (!esperada || recebida.length !== esperada.length) return false;
  return crypto.timingSafeEqual(Buffer.from(recebida), Buffer.from(esperada));
}

export function urlDoPonto(base, tag, segredo) {
  const raiz = String(base || '').replace(/\/+$/, '');
  const caminho = `/t/${encodeURIComponent(tag.codigo)}`;
  const chave = exigeChave(tag, segredo) ? chaveDoPonto(tag.codigo, tag.chave_versao, segredo) : null;
  return `${raiz}${caminho}${chave ? `?k=${chave}` : ''}`;
}

const R_TERRA_M = 6371008.8;
const rad = (graus) => (graus * Math.PI) / 180;

export function distanciaM(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function validarPosicao(pos) {
  if (!pos || typeof pos !== 'object') return null;
  const lat = Number(pos.lat);
  const lng = Number(pos.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const acc = Number(pos.acc);
  return { lat, lng, acc: Number.isFinite(acc) && acc >= 0 ? Math.min(acc, 1000) : 0 };
}

const temCoordenada = (tag) => tag?.lat != null && tag?.lng != null
  && Number.isFinite(Number(tag.lat)) && Number.isFinite(Number(tag.lng))
  && Math.abs(Number(tag.lat)) <= 90 && Math.abs(Number(tag.lng)) <= 180;

// Raio próprio positivo vence o padrão. Zero/nulo usa o padrão para não deixar ponto publicado sem proteção.
export function raioDoPonto(tag, raioPadraoM = 100) {
  const proprio = tag?.raio_m == null ? 0 : Number(tag.raio_m);
  const bruto = Number.isFinite(proprio) && proprio > 0 ? proprio : Number(raioPadraoM || 0);
  return bruto > 0 ? Math.min(Math.round(bruto), 5000) : 0;
}

export function avaliarLocalizacao(tag, pos, raioPadraoM = 100) {
  const raio = raioDoPonto(tag, raioPadraoM);
  if (!raio) return { exigida: false, ok: true };
  if (!temCoordenada(tag)) return { exigida: true, ok: false, motivo: 'ponto_sem_coordenadas', raio };
  const posicao = validarPosicao(pos);
  if (!posicao) return { exigida: true, ok: false, motivo: 'localizacao_necessaria', raio };
  if (posicao.acc <= 0 || posicao.acc > 50) {
    return { exigida: true, ok: false, motivo: 'gps_impreciso', raio, precisao: Math.round(posicao.acc) };
  }
  const distancia = distanciaM(posicao, { lat: Number(tag.lat), lng: Number(tag.lng) });
  if (distancia > raio) return { exigida: true, ok: false, motivo: 'fora_do_raio', raio, distancia: Math.round(distancia) };
  return { exigida: true, ok: true, raio, distancia: Math.round(distancia) };
}

// Dois carimbos de pontos distantes em tempo curto demais para serem fisicamente possíveis.
export function avaliarDeslocamento(anterior, tag, { velocidadeMaxMs = 40, distanciaMinimaM = 300 } = {}) {
  if (!anterior || !temCoordenada(anterior) || !temCoordenada(tag)) return null;
  const distancia = distanciaM({ lat: Number(anterior.lat), lng: Number(anterior.lng) }, { lat: Number(tag.lat), lng: Number(tag.lng) });
  if (distancia < distanciaMinimaM) return null;
  const segundos = Math.max(Number(anterior.segundos) || 0, 1);
  return distancia / segundos > velocidadeMaxMs ? 'deslocamento_impossivel' : null;
}

export const LIMITE_CARIMBOS_10MIN = 15;
export const AVISO_CARIMBOS_10MIN = 8;
export function avaliarRitmo(carimbosRecentes) {
  const n = Number(carimbosRecentes) || 0;
  if (n >= LIMITE_CARIMBOS_10MIN) return { bloquear: true };
  return { bloquear: false, suspeito: n >= AVISO_CARIMBOS_10MIN ? 'ritmo_alto' : null };
}
