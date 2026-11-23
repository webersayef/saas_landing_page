// Auth upgrade tests — node --test, JSON backend (throwaway file store).
// Exercises lib/auth-flow.js end to end: register → email code → verify
// → login, plus resend cooldown, attempt limits and login lockout.
// The plain code is recovered from the queued outbox email body, exactly
// like a user reading their inbox (no RESEND_API_KEY in tests).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = path.join(os.tmpdir(), `landing-saas-auth-test-${process.pid}.json`);
process.env.SAAS_STORE_PATH = tmp;
process.env.SESSION_SECRET = 'test-secret';
delete process.env.RESEND_API_KEY;

const store = await import('../lib/store.js');
const flow = await import('../lib/auth-flow.js');
const { hashPassword } = await import('../lib/passwords.js');

before(() => { try { fs.unlinkSync(tmp); } catch {} store.resetStoreCache(); });

let seq = 0;
const nextEmail = () => `auth${(seq += 1)}@test.dev`;

async function lastCodeFor(email) {
  const mails = (await store.listOutbox()).filter((m) => m.kind === 'verify' && m.to === email);
  assert.ok(mails.length, `no verify email queued for ${email}`);
  const m = /(\d{6})/.exec(mails[mails.length - 1].body);
  assert.ok(m, 'verify email body has no 6-digit code');
  return m[1];
}
const wrongCodeFor = (real) => (real === '000000' ? '111111' : '000000');
const goodReg = (email) => ({
  name: 'টেস্ট ইউজার', shopName: 'টেস্ট শপ', email, password: 'password123',
});

test('register validation: bad email, short password, missing fields', async () => {
  assert.equal((await flow.registerWithVerification({ ...goodReg('x@test.dev'), email: 'not-an-email' })).status, 400);
  assert.equal((await flow.registerWithVerification({ ...goodReg('x@test.dev'), password: 'short' })).status, 400);
  assert.equal((await flow.registerWithVerification({ ...goodReg('x@test.dev'), shopName: '' })).status, 400);
  assert.equal((await flow.registerWithVerification({ ...goodReg('x@test.dev'), name: ' ' })).status, 400);
  assert.equal(await store.getUserByEmail('x@test.dev'), null);
});

test('register creates pending user, code hashed in record + plain in outbox', async () => {
  const email = nextEmail();
  const r = await flow.registerWithVerification(goodReg(email));
  assert.equal(r.status, 200);
  assert.equal(r.body.needsVerification, true);
  const user = await store.getUserByEmail(email);
  assert.equal(user.emailVerified, false);
  assert.equal(user.status, 'pending');
  assert.ok(user.verifyCodeHash, 'code hash stored');
  const code = await lastCodeFor(email);
  assert.notEqual(user.verifyCodeHash, code, 'plain code must not be stored');
  assert.equal(user.verifyCodeHash, flow.hashVerifyCode(code));
  assert.ok(new Date(user.verifyCodeExpiresAt).getTime() > Date.now());
});

test('login blocked before verification (403 needsVerification)', async () => {
  const email = nextEmail();
  await flow.registerWithVerification(goodReg(email));
  const r = await flow.loginWithPassword({ email, password: 'password123' });
  assert.equal(r.status, 403);
  assert.equal(r.body.needsVerification, true);
  assert.equal(r.user, undefined);
});

test('wrong code increments attempts; correct code verifies; login then succeeds', async () => {
  const email = nextEmail();
  await flow.registerWithVerification(goodReg(email));
  const code = await lastCodeFor(email);
  const bad = await flow.verifyEmailCode({ email, code: wrongCodeFor(code) });
  assert.equal(bad.status, 400);
  assert.equal((await store.getUserByEmail(email)).verifyAttempts, 1);
  const ok = await flow.verifyEmailCode({ email, code });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.verified, true);
  const user = await store.getUserByEmail(email);
  assert.equal(user.emailVerified, true);
  assert.equal(user.status, 'active');
  assert.equal(user.verifyCodeHash, null);
  const login = await flow.loginWithPassword({ email, password: 'password123' });
  assert.equal(login.status, 200);
  assert.equal(login.user.email, email);
});

test('5 wrong codes invalidate the code — even the right code then fails', async () => {
  const email = nextEmail();
  await flow.registerWithVerification(goodReg(email));
  const code = await lastCodeFor(email);
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await flow.verifyEmailCode({ email, code: wrongCodeFor(code) })).status, 400);
  }
  assert.equal((await store.getUserByEmail(email)).verifyCodeHash, null);
  assert.equal((await flow.verifyEmailCode({ email, code })).status, 400);
  assert.equal((await store.getUserByEmail(email)).emailVerified, false);
});

test('expired code is rejected with the expiry message', async () => {
  const email = nextEmail();
  await flow.registerWithVerification(goodReg(email));
  const code = await lastCodeFor(email);
  const user = await store.getUserByEmail(email);
  await store.updateUser(user.id, { verifyCodeExpiresAt: new Date(Date.now() - 1000).toISOString() });
  const r = await flow.verifyEmailCode({ email, code });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /মেয়াদ/);
});

test('resend: 60s cooldown, then a fresh code replaces the old one', async () => {
  const email = nextEmail();
  await flow.registerWithVerification(goodReg(email));
  const oldCode = await lastCodeFor(email);
  const tooSoon = await flow.resendVerifyCode({ email });
  assert.equal(tooSoon.status, 429);
  assert.ok(tooSoon.body.retryAfter > 0);
  const user = await store.getUserByEmail(email);
  await store.updateUser(user.id, { verifySentAt: new Date(Date.now() - 61000).toISOString() });
  const ok = await flow.resendVerifyCode({ email });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.resent, true);
  assert.equal((await store.getUserByEmail(email)).verifyAttempts, 0);
  const newCode = await lastCodeFor(email);
  if (newCode !== oldCode) {
    assert.equal((await flow.verifyEmailCode({ email, code: oldCode })).status, 400);
  }
  assert.equal((await flow.verifyEmailCode({ email, code: newCode })).status, 200);
});

test('resend for unknown or verified email is a quiet ok (no probing)', async () => {
  assert.equal((await flow.resendVerifyCode({ email: 'ghost@test.dev' })).status, 200);
  const email = nextEmail();
  await flow.registerWithVerification(goodReg(email));
  await flow.verifyEmailCode({ email, code: await lastCodeFor(email) });
  const beforeCount = (await store.listOutbox()).filter((m) => m.to === email).length;
  assert.equal((await flow.resendVerifyCode({ email })).status, 200);
  assert.equal((await store.listOutbox()).filter((m) => m.to === email).length, beforeCount);
});

test('verified email cannot register again (409); pending email re-registers with a fresh code', async () => {
  const email = nextEmail();
  await flow.registerWithVerification(goodReg(email));
  await flow.verifyEmailCode({ email, code: await lastCodeFor(email) });
  assert.equal((await flow.registerWithVerification(goodReg(email))).status, 409);

  const pending = nextEmail();
  await flow.registerWithVerification(goodReg(pending));
  const again = await flow.registerWithVerification(goodReg(pending));
  assert.equal(again.status, 200);
  assert.equal(again.body.needsVerification, true);
  assert.equal((await flow.verifyEmailCode({ email: pending, code: await lastCodeFor(pending) })).status, 200);
});

test('login lockout: 5 wrong passwords lock for 10 minutes; success resets', async () => {
  const email = nextEmail();
  await flow.registerWithVerification(goodReg(email));
  await flow.verifyEmailCode({ email, code: await lastCodeFor(email) });
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await flow.loginWithPassword({ email, password: 'wrong-pass' })).status, 401);
  }
  const locked = await flow.loginWithPassword({ email, password: 'password123' });
  assert.equal(locked.status, 403);
  assert.equal(locked.body.locked, true);
  const user = await store.getUserByEmail(email);
  assert.ok(new Date(user.lockUntil).getTime() > Date.now());
  await store.updateUser(user.id, { lockUntil: new Date(Date.now() - 1000).toISOString() });
  const ok = await flow.loginWithPassword({ email, password: 'password123' });
  assert.equal(ok.status, 200);
  const after = await store.getUserByEmail(email);
  assert.equal(after.failedLogins, 0);
  assert.equal(after.lockUntil, null);
});

test('generic login error is identical for unknown email and wrong password', async () => {
  const a = await flow.loginWithPassword({ email: 'ghost@test.dev', password: 'whatever1' });
  const email = nextEmail();
  await flow.registerWithVerification(goodReg(email));
  await flow.verifyEmailCode({ email, code: await lastCodeFor(email) });
  const b = await flow.loginWithPassword({ email, password: 'wrong-pass' });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.body.error, b.body.error);
});

test('backward compat: users created directly (seed/demo style) are verified and can log in', async () => {
  const u = await store.createUser({
    name: 'ডেমো', email: 'demo-like@test.dev', shopName: 'ডেমো শপ',
    passwordHash: hashPassword('demo1234'),
  });
  assert.equal(u.emailVerified, true);
  assert.equal(u.status, 'active');
  const login = await flow.loginWithPassword({ email: 'demo-like@test.dev', password: 'demo1234' });
  assert.equal(login.status, 200);
});
