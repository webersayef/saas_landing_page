// HMAC-signed session tokens (pure functions — no next/* imports, testable).
// Token = base64url(JSON {uid, exp}) + "." + HMAC-SHA256(payload, SESSION_SECRET)
import crypto from 'node:crypto';

export const TENANT_COOKIE = 'saas_session';
export const SUPER_COOKIE = 'saas_super_session';
const TENANT_TTL_MS = 30 * 24 * 3600 * 1000;
const SUPER_TTL_MS = 12 * 3600 * 1000;

function secret() {
  return process.env.SESSION_SECRET || 'dev-only-secret-change-me';
}
function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function createToken(uid, ttlMs, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ uid: String(uid), exp: now + ttlMs })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
export function parseToken(value, now = Date.now()) {
  if (!value || typeof value !== 'string') return null;
  const dot = value.lastIndexOf('.');
  if (dot < 1) return null;
  const payload = value.slice(0, dot);
  if (!safeEqual(value.slice(dot + 1), sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.uid || !data.exp || data.exp < now) return null;
    return data;
  } catch {
    return null;
  }
}

// Shared cookie options for session cookies — `secure` in production.
export const sessionCookieOpts = (maxAgeSec) => ({
  httpOnly: true, sameSite: 'lax', path: '/', maxAge: maxAgeSec,
  secure: process.env.NODE_ENV === 'production',
});
export const TENANT_MAX_AGE = 30 * 24 * 3600;
export const SUPER_MAX_AGE = 12 * 3600;

export const createTenantToken = (uid, now) => createToken(uid, TENANT_TTL_MS, now);
export const parseTenantToken = (v, now) => parseToken(v, now);
export const createSuperToken = (now) => createToken('super', SUPER_TTL_MS, now);
export function parseSuperToken(v, now) {
  const d = parseToken(v, now);
  return d && d.uid === 'super' ? d : null;
}
export function checkSuperPassword(password) {
  const expected = process.env.SUPER_ADMIN_PASSWORD || '';
  if (!expected || typeof password !== 'string') return false;
  const a = Buffer.from(password), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
