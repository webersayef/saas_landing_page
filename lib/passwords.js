// Password hashing — Node built-in scrypt, no extra dependency.
// Stored format: scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>
import crypto from 'node:crypto';

const N = 16384, R = 8, P = 1, KEYLEN = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, KEYLEN, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64'), hash.toString('base64')].join('$');
}

export function verifyPassword(password, stored) {
  try {
    const parts = String(stored || '').split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const n = Number(parts[1]), r = Number(parts[2]), p = Number(parts[3]);
    if (![n, r, p].every(Number.isInteger)) return false;
    const salt = Buffer.from(parts[4], 'base64');
    const expected = Buffer.from(parts[5], 'base64');
    if (!salt.length || !expected.length) return false;
    const actual = crypto.scryptSync(String(password), salt, expected.length, { N: n, r, p });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
