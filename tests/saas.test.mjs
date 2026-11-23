// Phase 1 test suite — node --test. Uses a throwaway JSON store.
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
function makeUser(balance = 0, paidThroughOffsetDays = 30) {
  seq += 1;
  const u = store.createUser({
    name: `User ${seq}`, email: `user${seq}@test.dev`,
    shopName: `Shop ${seq}`, passwordHash: hashPassword('secret1'),
  });
  if (balance) store.creditWallet(u.id, balance, 'deposit', 'test seed');
  store.updateUser(u.id, {
    paidThrough: new Date(Date.now() + paidThroughOffsetDays * DAY).toISOString(),
    billingWarnFor: null, billingFailFor: null,
  });
  return store.getUserById(u.id);
}
function makePage(user, slug) {
  const product = store.createProduct({ userId: user.id, name: 'প্রোডাক্ট', price: 500, imageUrl: '' });
  return store.createPage({
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
  const user = makeUser(1000, -1); // due yesterday
  makePage(user, 'deduct-shop');
  const beforeDue = store.getUserById(user.id).paidThrough;
  const summary = await runBillingCycle(store.loadStore(), new Date());
  const after = store.getUserById(user.id);
  assert.ok(summary.deducted.some((d) => d.userId === user.id && d.amount === 299));
  assert.equal(after.walletBalance, 701);
  const expectedDue = new Date(new Date(beforeDue).getTime() + 30 * DAY).toISOString();
  assert.equal(after.paidThrough, expectedDue);
  const ledger = store.listLedgerByUser(user.id);
  assert.ok(ledger.some((e) => e.type === 'subscription' && e.amount === -299 && e.balanceAfter === 701));
  assert.ok(store.listOutbox().some((m) => m.userId === user.id && m.kind === 'subscription_paid'));
});

/* insufficient funds path */
test('insufficient balance → grace, fail email queued, no deduction', async () => {
  const user = makeUser(100, -1); // due yesterday, only ৳100
  makePage(user, 'poor-shop');
  const summary = await runBillingCycle(store.loadStore(), new Date());
  const after = store.getUserById(user.id);
  assert.ok(summary.insufficient.includes(user.id));
  assert.equal(after.walletBalance, 100); // untouched
  assert.equal(getSubscriptionStatus(after), 'grace');
  assert.ok(store.listOutbox().some((m) => m.userId === user.id && m.kind === 'payment_failed'));
  // Move past grace → locked.
  store.updateUser(user.id, { paidThrough: new Date(Date.now() - 6 * DAY).toISOString() });
  assert.equal(getSubscriptionStatus(store.getUserById(user.id)), 'locked');
});

/* due-soon warning queued once */
test('due-soon warning email queued', async () => {
  const user = makeUser(5000, 2); // due in 2 days
  makePage(user, 'warn-shop');
  await runBillingCycle(store.loadStore(), new Date());
  assert.ok(store.listOutbox().some((m) => m.userId === user.id && m.kind === 'due_warning'));
});

/* tenant isolation */
test('tenant isolation: user B cannot see or touch user A data', () => {
  const a = makeUser(0, 30);
  const b = makeUser(0, 30);
  const page = makePage(a, 'a-shop');
  const product = store.listProductsByUser(a.id)[0];
  const order = store.createOrder({
    userId: a.id, pageId: page.id, productId: product.id,
    customerName: 'কাস্টমার', phone: '01700000000', address: 'ঢাকা', quantity: 1, total: 500,
  });
  assert.equal(store.listPagesByUser(b.id).length, 0);
  assert.equal(store.listOrdersByUser(b.id).length, 0);
  assert.equal(store.getPageByIdForUser(page.id, b.id), null);
  assert.equal(store.getProductByIdForUser(product.id, b.id), null);
  assert.equal(store.updatePageForUser(page.id, b.id, { title: 'হ্যাক' }), null);
  assert.equal(store.deletePageForUser(page.id, b.id), false);
  assert.equal(store.updateOrderStatusForUser(order.id, b.id, 'cancelled'), null);
  // A's own data intact.
  assert.equal(store.getPageByIdForUser(page.id, a.id).title, a.shopName);
  assert.equal(store.listOrdersByUser(a.id).length, 1);
});

/* order creation from a public page (slug → tenant order) */
test('public page order lands on the page owner', () => {
  const owner = makeUser(0, 30);
  const page = makePage(owner, 'public-shop');
  const found = store.getPageBySlug('public-shop');
  assert.equal(found.id, page.id);
  const product = store.getProductById(found.productId);
  const order = store.createOrder({
    userId: found.userId, pageId: found.id, productId: product.id,
    customerName: 'রহিম', phone: '01800000000', address: 'চট্টগ্রাম',
    quantity: 2, total: product.price * 2,
  });
  assert.equal(order.userId, owner.id);
  assert.equal(order.total, 1000);
  assert.ok(store.listOrdersByUser(owner.id).some((o) => o.id === order.id));
});

/* deposit approve credits wallet */
test('deposit approve credits wallet + ledger, double-approve blocked', () => {
  const user = makeUser(0, 30);
  const dep = store.createDeposit({ userId: user.id, method: 'bKash', trxId: 'TRX123', amount: 900 });
  const approved = store.approveDeposit(dep.id);
  assert.equal(approved.status, 'approved');
  assert.equal(store.getUserById(user.id).walletBalance, 900);
  assert.ok(store.listLedgerByUser(user.id).some((e) => e.type === 'deposit' && e.amount === 900 && e.balanceAfter === 900));
  assert.equal(store.approveDeposit(dep.id), null); // already processed
  assert.equal(store.getUserById(user.id).walletBalance, 900); // not double-credited
});
