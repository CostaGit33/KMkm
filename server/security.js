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
export function setSessionCookie(res, token) {
  const secure = res.req?.headers['x-forwarded-proto'] === 'https' || process.env.COOKIE_SECURE === 'true';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${SESSION_DAYS * 86400}; Path=/; HttpOnly;${secure ? ' Secure; SameSite=None' : ' SameSite=Lax'}`);
}
export function clearSessionCookie(res) {
  const secure = res.req?.headers['x-forwarded-proto'] === 'https' || process.env.COOKIE_SECURE === 'true';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly;${secure ? ' Secure; SameSite=None' : ' SameSite=Lax'}`);
}
