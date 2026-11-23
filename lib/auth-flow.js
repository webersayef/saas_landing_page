// Auth flows (register + email verification, resend, login) — pure-ish
// logic over lib/store.js + lib/mailer.js, with NO next/* imports so the
// route handlers stay thin wrappers and this file is unit-testable.
//
// Security notes:
//  • Verification codes are 6 digits, stored ONLY as a SHA-256 hash,
//    expire after 10 minutes, and are invalidated after 5 wrong tries.
//  • Login counts consecutive failures on the user record; 5 fails lock
//    the account for 10 minutes. All state lives on the user record, so
//    it works identically in the JSON and Supabase backends.
//  • Pre-existing users (seed/demo, Phase 1/2 signups) have no
//    emailVerified field — they are treated as verified everywhere.
//    Only registerWithVerification() creates unverified users.
import crypto from 'node:crypto';
import {
  createUser, getUserByEmail, updateUser,
} from './store.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { sendEmail } from './mailer.js';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MS = 10 * 60 * 1000;
export const MIN_PASSWORD_LEN = 8;

const GENERIC_LOGIN_ERROR = 'ইমেইল বা পাসওয়ার্ড ভুল।';
const GENERIC_CODE_ERROR = 'কোডটি সঠিক নয়। আবার চেষ্টা করুন।';

export const isVerified = (u) => !!u && u.emailVerified !== false;
export const isPending = (u) => !!u && (u.status === 'pending' || u.emailVerified === false);

/* ---------------- verification codes ---------------- */

export function generateVerifyCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}
export function hashVerifyCode(code) {
  return crypto.createHash('sha256').update(String(code || '')).digest('hex');
}
function codeMatches(code, storedHash) {
  if (!storedHash) return false;
  const a = Buffer.from(hashVerifyCode(code));
  const b = Buffer.from(String(storedHash));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
// Fresh verify-* field set for a user record (new code, attempts reset).
function freshVerifyFields(now = Date.now()) {
  const code = generateVerifyCode();
  return {
    code,
    fields: {
      verifyCodeHash: hashVerifyCode(code),
      verifyCodeExpiresAt: new Date(now + CODE_TTL_MS).toISOString(),
      verifyAttempts: 0,
      verifySentAt: new Date(now).toISOString(),
    },
  };
}
const CLEAR_VERIFY_FIELDS = {
  verifyCodeHash: null, verifyCodeExpiresAt: null, verifyAttempts: 0, verifySentAt: null,
};

async function sendVerifyEmail(user, code) {
  await sendEmail({
    userId: user.id,
    to: user.email,
    kind: 'verify',
    subject: 'আপনার ভেরিফিকেশন কোড — Shera IT ল্যান্ডিং SaaS',
    body:
`আসসালামু আলাইকুম ${user.name || ''},

Shera IT ল্যান্ডিং SaaS-এ অ্যাকাউন্ট খোলার জন্য ধন্যবাদ।
আপনার ইমেইল ভেরিফিকেশন কোড:

    ${code}

কোডটি ১০ মিনিটের মধ্যে ব্যবহার করুন। কোডটি কারো সাথে শেয়ার করবেন না।
আপনি যদি অ্যাকাউন্ট খোলার চেষ্টা না করে থাকেন, এই ইমেইলটি উপেক্ষা করুন।

— Shera IT টিম`,
  });
}

/* ---------------- register ---------------- */

// Returns { status, body }. On success the user exists as UNVERIFIED
// (status 'pending') and a code has been emailed — NO session is made.
export async function registerWithVerification({ name, email, password, shopName }) {
  const cleanName = String(name || '').trim();
  const cleanShop = String(shopName || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanName || !cleanShop || !cleanEmail || !password) {
    return { status: 400, body: { error: 'সব ঘর পূরণ করুন — নাম, শপের নাম, ইমেইল ও পাসওয়ার্ড লাগবে।' } };
  }
  if (!EMAIL_RE.test(cleanEmail)) {
    return { status: 400, body: { error: 'সঠিক ইমেইল ঠিকানা দিন।' } };
  }
  if (String(password).length < MIN_PASSWORD_LEN) {
    return { status: 400, body: { error: `পাসওয়ার্ড কমপক্ষে ${MIN_PASSWORD_LEN} অক্ষরের হতে হবে।` } };
  }
  const existing = await getUserByEmail(cleanEmail);
  if (existing && isVerified(existing)) {
    return { status: 409, body: { error: 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা আছে। লগইন করুন।' } };
  }
  const { code, fields } = freshVerifyFields();
  let user;
  if (existing) {
    // Same email still pending: refresh the profile + password and send
    // a fresh code instead of dead-ending the signup.
    user = await updateUser(existing.id, {
      name: cleanName, shopName: cleanShop,
      passwordHash: hashPassword(password), ...fields,
    });
  } else {
    user = await createUser({
      name: cleanName, email: cleanEmail, shopName: cleanShop,
      passwordHash: hashPassword(password),
      emailVerified: false, status: 'pending', ...fields,
    });
  }
  await sendVerifyEmail(user, code);
  return { status: 200, body: { ok: true, needsVerification: true } };
}

/* ---------------- verify ---------------- */

export async function verifyEmailCode({ email, code }) {
  const user = await getUserByEmail(email || '');
  if (!user || isVerified(user) || !user.verifyCodeHash) {
    return { status: 400, body: { error: GENERIC_CODE_ERROR } };
  }
  const now = Date.now();
  if (user.verifyCodeExpiresAt && new Date(user.verifyCodeExpiresAt).getTime() < now) {
    return { status: 400, body: { error: 'কোডটির মেয়াদ শেষ হয়ে গেছে। নতুন কোড পাঠিয়ে আবার চেষ্টা করুন।' } };
  }
  if (!codeMatches(code, user.verifyCodeHash)) {
    const attempts = (user.verifyAttempts || 0) + 1;
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      await updateUser(user.id, { verifyAttempts: attempts, verifyCodeHash: null, verifyCodeExpiresAt: null });
      return { status: 400, body: { error: 'অনেকবার ভুল কোড দেওয়া হয়েছে — কোডটি বাতিল করা হলো। নতুন কোড পাঠান।' } };
    }
    await updateUser(user.id, { verifyAttempts: attempts });
    return { status: 400, body: { error: GENERIC_CODE_ERROR } };
  }
  await updateUser(user.id, {
    emailVerified: true, status: 'active', ...CLEAR_VERIFY_FIELDS,
  });
  return { status: 200, body: { ok: true, verified: true } };
}

/* ---------------- resend ---------------- */

export async function resendVerifyCode({ email }) {
  const user = await getUserByEmail(email || '');
  // Constant shape: unknown / already-verified emails get a plain ok so
  // the endpoint cannot be used to probe which emails are registered.
  if (!user || isVerified(user)) {
    return { status: 200, body: { ok: true } };
  }
  const now = Date.now();
  const sentAt = user.verifySentAt ? new Date(user.verifySentAt).getTime() : 0;
  const waitMs = RESEND_COOLDOWN_MS - (now - sentAt);
  if (sentAt && waitMs > 0) {
    return {
      status: 429,
      body: { error: 'কিছুক্ষণ অপেক্ষা করুন — নতুন কোড একটু পর আবার পাঠানো যাবে।', retryAfter: Math.ceil(waitMs / 1000) },
    };
  }
  const { code, fields } = freshVerifyFields(now);
  const updated = await updateUser(user.id, fields);
  await sendVerifyEmail(updated || user, code);
  return { status: 200, body: { ok: true, resent: true } };
}

/* ---------------- login ---------------- */

// Returns { status, body, user? } — user is set only on success (the
// route turns it into a session cookie).
export async function loginWithPassword({ email, password }) {
  const user = await getUserByEmail(email || '');
  if (!user) {
    return { status: 401, body: { error: GENERIC_LOGIN_ERROR } };
  }
  const now = Date.now();
  if (user.lockUntil && new Date(user.lockUntil).getTime() > now) {
    return { status: 403, body: { error: 'অনেকবার ভুল পাসওয়ার্ড দেওয়া হয়েছে — নিরাপত্তার জন্য অ্যাকাউন্টটি ১০ মিনিটের জন্য লক করা হয়েছে। পরে আবার চেষ্টা করুন।', locked: true } };
  }
  if (!verifyPassword(password || '', user.passwordHash)) {
    const fails = (user.failedLogins || 0) + 1;
    if (fails >= MAX_FAILED_LOGINS) {
      await updateUser(user.id, { failedLogins: 0, lockUntil: new Date(now + LOCK_MS).toISOString() });
    } else {
      await updateUser(user.id, { failedLogins: fails });
    }
    return { status: 401, body: { error: GENERIC_LOGIN_ERROR } };
  }
  if (!isVerified(user)) {
    return { status: 403, body: { error: 'আপনার ইমেইল এখনো ভেরিফাই করা হয়নি। ইনবক্সে পাঠানো ৬ সংখ্যার কোড দিয়ে আগে ভেরিফাই করুন।', needsVerification: true } };
  }
  if (user.failedLogins || user.lockUntil) {
    await updateUser(user.id, { failedLogins: 0, lockUntil: null });
  }
  return { status: 200, body: { ok: true }, user };
}
