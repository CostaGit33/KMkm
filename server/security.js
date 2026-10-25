import crypto from 'node:crypto';

export const SESSION_COOKIE = 'mais1km_session';
export const SESSION_DAYS = 30;

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 160);
}
export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}
export function makeSalt() {
  return crypto.randomBytes(16);
}
export function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64);
}
export function verifyPassword(password, hash, salt) {
  const candidate = hashPassword(password, salt);
  return candidate.length === hash.length && crypto.timingSafeEqual(candidate, hash);
}
export function makeSessionToken() {
  return crypto.randomBytes(48).toString('base64url');
}
export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest();
}
export function sessionExpiry() {
  return new Date(Date.now() + SESSION_DAYS * 86400000);
}
// Cookie de sessão. O app e a API usam a mesma origem, então SameSite=Lax basta e protege melhor contra CSRF
// do que SameSite=None. Só use COOKIE_SAMESITE=None se o app for realmente embutido em outro site (exige HTTPS).
export function cookieSameSite(env = process.env) {
  const valor = String(env.COOKIE_SAMESITE || 'Lax').toLowerCase();
  return valor === 'none' ? 'None' : valor === 'strict' ? 'Strict' : 'Lax';
}
export function cookieAttrs({ https, sameSite = cookieSameSite() }) {
  const seguro = https || sameSite === 'None';
  return `Path=/; HttpOnly; SameSite=${sameSite}${seguro ? '; Secure' : ''}`;
}
function requisicaoHttps(res) {
  return res.req?.headers['x-forwarded-proto'] === 'https' || process.env.COOKIE_SECURE === 'true';
}
export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${SESSION_DAYS * 86400}; ${cookieAttrs({ https: requisicaoHttps(res) })}`);
}
export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; ${cookieAttrs({ https: requisicaoHttps(res) })}`);
}

// Gasta o mesmo tempo de uma verificação real quando o e-mail não existe, para o login não revelar
// (pelo tempo de resposta) quais e-mails têm conta.
const SAL_FALSO = Buffer.alloc(16, 7);
const HASH_FALSO = Buffer.alloc(64, 1);
export function verificacaoFalsa(password) {
  verifyPassword(password, HASH_FALSO, SAL_FALSO);
  return false;
}

export const MAX_SESSOES_POR_CONTA = 10;
