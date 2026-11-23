// Test suite — node --test. JSON backend mode (throwaway file store).
// Supabase backend mode is covered by tests/supabase.test.mjs.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = path.join(os.tmpdir(), `landing-saas-test-${process.pid}.json`);
process.env.SAAS_STORE_PATH = tmp;
process.env.SESSION_SECRET = 'test-secret';

const store = await import('../lib/store.js');
const { priceForPageCount } = await import('../lib/plans.js');
const { getSubscriptionStatus, runBillingCycle } = await import('../lib/billing.js');
const { hashPassword, verifyPassword } = await import('../lib/passwords.js');
const { buildSections } = await import('../lib/templates.js');

const DAY = 86400000;
let seq = 0;
async function makeUser(balance = 0, paidThroughOffsetDays = 30) {
  seq += 1;
  const u = await store.createUser({
    name: `User ${seq}`, email: `user${seq}@test.dev`,
    shopName: `Shop ${seq}`, passwordHash: hashPassword('secret1'),
  });
  if (balance) await store.creditWallet(u.id, balance, 'deposit', 'test seed');
  await store.updateUser(u.id, {
    paidThrough: new Date(Date.now() + paidThroughOffsetDays * DAY).toISOString(),
    billingWarnFor: null, billingFailFor: null,
  });
  return await store.getUserById(u.id);
}
async function makePage(user, slug) {
  const product = await store.createProduct({ userId: user.id, name: 'প্রোডাক্ট', price: 500, imageUrl: '' });
  return await store.createPage({
    userId: user.id, title: user.shopName, slug,
    templateId: 'classic-sales', productId: product.id,
    sections: buildSections('classic-sales', product),
  });
}

before(() => { try { fs.unlinkSync(tmp); } catch {} store.resetStoreCache(); });

/* pricing */
test('priceForPageCount tiers', () => {
  assert.equal(priceForPageCount(0), 0);
  assert.equal(priceForPageCount(1), 299);
  assert.equal(priceForPageCount(2), 399);
  assert.equal(priceForPageCount(3), 649);
  assert.equal(priceForPageCount(4), 899);
  assert.equal(priceForPageCount(5), 1149);
});

/* passwords */
test('scrypt hash + verify', () => {
  const h = hashPassword('abc123');
  assert.ok(verifyPassword('abc123', h));
  assert.ok(!verifyPassword('wrong', h));
  assert.ok(!h.includes('abc123'));
});

/* billing status transitions */
test('status transitions active → due_soon → grace → locked', () => {
  const now = new Date();
  const mk = (offsetDays) => ({ suspended: false, paidThrough: new Date(now.getTime() + offsetDays * DAY).toISOString() });
  assert.equal(getSubscriptionStatus(mk(20), now), 'active');
  assert.equal(getSubscriptionStatus(mk(2), now), 'due_soon');
  assert.equal(getSubscriptionStatus(mk(-1), now), 'grace');
  assert.equal(getSubscriptionStatus(mk(-4), now), 'grace');
  assert.equal(getSubscriptionStatus(mk(-6), now), 'locked');
  assert.equal(getSubscriptionStatus({ ...mk(20), suspended: true }, now), 'locked');
});

/* wallet deduction success */
test('billing deducts wallet, extends 30d, writes ledger', async () => {
  const user = await makeUser(1000, -1); // due yesterday
  await makePage(user, 'deduct-shop');
  const beforeDue = (await store.getUserById(user.id)).paidThrough;
  const summary = await runBillingCycle(null, new Date());
  const after = await store.getUserById(user.id);
  assert.ok(summary.deducted.some((d) => d.userId === user.id && d.amount === 299));
  assert.equal(after.walletBalance, 701);
  const expectedDue = new Date(new Date(beforeDue).getTime() + 30 * DAY).toISOString();
  assert.equal(after.paidThrough, expectedDue);
  const ledger = await store.listLedgerByUser(user.id);
  assert.ok(ledger.some((e) => e.type === 'subscription' && e.amount === -299 && e.balanceAfter === 701));
  assert.ok((await store.listOutbox()).some((m) => m.userId === user.id && m.kind === 'subscription_paid'));
});

/* insufficient funds path */
test('insufficient balance → grace, fail email queued, no deduction', async () => {
  const user = await makeUser(100, -1); // due yesterday, only ৳100
  await makePage(user, 'poor-shop');
  const summary = await runBillingCycle(null, new Date());
  const after = await store.getUserById(user.id);
  assert.ok(summary.insufficient.includes(user.id));
  assert.equal(after.walletBalance, 100); // untouched
  assert.equal(getSubscriptionStatus(after), 'grace');
  assert.ok((await store.listOutbox()).some((m) => m.userId === user.id && m.kind === 'payment_failed'));
  // Move past grace → locked.
  await store.updateUser(user.id, { paidThrough: new Date(Date.now() - 6 * DAY).toISOString() });
  assert.equal(getSubscriptionStatus(await store.getUserById(user.id)), 'locked');
});

/* due-soon warning queued once */
test('due-soon warning email queued', async () => {
  const user = await makeUser(5000, 2); // due in 2 days
  await makePage(user, 'warn-shop');
  await runBillingCycle(null, new Date());
  assert.ok((await store.listOutbox()).some((m) => m.userId === user.id && m.kind === 'due_warning'));
});

/* tenant isolation */
test('tenant isolation: user B cannot see or touch user A data', async () => {
  const a = await makeUser(0, 30);
  const b = await makeUser(0, 30);
  const page = await makePage(a, 'a-shop');
  const product = (await store.listProductsByUser(a.id))[0];
  const order = await store.createOrder({
    userId: a.id, pageId: page.id, productId: product.id,
    customerName: 'কাস্টমার', phone: '01700000000', address: 'ঢাকা', quantity: 1, total: 500,
  });
  assert.equal((await store.listPagesByUser(b.id)).length, 0);
  assert.equal((await store.listOrdersByUser(b.id)).length, 0);
  assert.equal(await store.getPageByIdForUser(page.id, b.id), null);
  assert.equal(await store.getProductByIdForUser(product.id, b.id), null);
  assert.equal(await store.updatePageForUser(page.id, b.id, { title: 'হ্যাক' }), null);
  assert.equal(await store.deletePageForUser(page.id, b.id), false);
  assert.equal(await store.updateOrderStatusForUser(order.id, b.id, 'cancelled'), null);
  // A's own data intact.
  assert.equal((await store.getPageByIdForUser(page.id, a.id)).title, a.shopName);
  assert.equal((await store.listOrdersByUser(a.id)).length, 1);
});

/* order creation from a public page (slug → tenant order) */
test('public page order lands on the page owner', async () => {
  const owner = await makeUser(0, 30);
  const page = await makePage(owner, 'public-shop');
  const found = await store.getPageBySlug('public-shop');
  assert.equal(found.id, page.id);
  const product = await store.getProductById(found.productId);
  const order = await store.createOrder({
    userId: found.userId, pageId: found.id, productId: product.id,
    customerName: 'রহিম', phone: '01800000000', address: 'চট্টগ্রাম',
    quantity: 2, total: product.price * 2,
  });
  assert.equal(order.userId, owner.id);
  assert.equal(order.total, 1000);
  assert.ok((await store.listOrdersByUser(owner.id)).some((o) => o.id === order.id));
});

/* deposit approve credits wallet */
test('deposit approve credits wallet + ledger, double-approve blocked', async () => {
  const user = await makeUser(0, 30);
  const dep = await store.createDeposit({ userId: user.id, method: 'bKash', trxId: 'TRX123', amount: 900 });
  const approved = await store.approveDeposit(dep.id);
  assert.equal(approved.status, 'approved');
  assert.equal((await store.getUserById(user.id)).walletBalance, 900);
  assert.ok((await store.listLedgerByUser(user.id)).some((e) => e.type === 'deposit' && e.amount === 900 && e.balanceAfter === 900));
  assert.equal(await store.approveDeposit(dep.id), null); // already processed
  assert.equal((await store.getUserById(user.id)).walletBalance, 900); // not double-credited
});
