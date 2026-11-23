// Supabase backend test — spins up a tiny fake PostgREST server
// (node:http, in-memory tables) and runs the store's async API against
// it with SUPABASE_URL pointed at the fake. Mirrors the stub-server
// approach of the sibling nextjs-landing-demo project. No real Supabase
// account is needed.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

/* ---------------- fake PostgREST ---------------- */

const tables = {
  saas_users: [], saas_pages: [], saas_products: [], saas_orders: [],
  saas_ledger: [], saas_deposits: [], saas_email_outbox: [],
};

function matches(row, searchParams) {
  for (const [key, val] of searchParams.entries()) {
    if (key === 'select' || key === 'order' || key === 'limit' || key === 'offset') continue;
    const m = /^eq\.(.*)$/.exec(val);
    if (!m) return false;
    if (String(row[key] ?? '') !== m[1]) return false;
  }
  return true;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://fake');
  const m = /^\/rest\/v1\/(\w+)$/.exec(url.pathname);
  res.setHeader('Content-Type', 'application/json');
  if (!m || !tables[m[1]]) { res.statusCode = 404; return res.end('[]'); }
  const rows = tables[m[1]];
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const data = body ? JSON.parse(body) : null;
    if (req.method === 'GET') {
      return res.end(JSON.stringify(rows.filter((r) => matches(r, url.searchParams))));
    }
    if (req.method === 'POST') {
      const row = { created_at: new Date().toISOString(), ...data };
      rows.push(row);
      res.statusCode = 201;
      return res.end(JSON.stringify([row]));
    }
    if (req.method === 'PATCH') {
      const hit = rows.filter((r) => matches(r, url.searchParams));
      hit.forEach((r) => Object.assign(r, data));
      return res.end(JSON.stringify(hit));
    }
    if (req.method === 'DELETE') {
      const hit = rows.filter((r) => matches(r, url.searchParams));
      tables[m[1]] = rows.filter((r) => !hit.includes(r));
      return res.end(JSON.stringify(hit));
    }
    res.statusCode = 405;
    return res.end('[]');
  });
});

let store, billing, passwords, templates;
const DAY = 86400000;

before(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.SUPABASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key';
  process.env.SESSION_SECRET = 'test-secret';
  store = await import('../lib/store.js');
  billing = await import('../lib/billing.js');
  passwords = await import('../lib/passwords.js');
  templates = await import('../lib/templates.js');
  assert.equal(store.supabaseEnabled(), true);
});
after(() => server.close());

let seq = 0;
async function makeUser(balance = 0, paidThroughOffsetDays = 30) {
  seq += 1;
  const u = await store.createUser({
    name: `SB User ${seq}`, email: `sb${seq}@test.dev`,
    shopName: `SB Shop ${seq}`, passwordHash: passwords.hashPassword('secret1'),
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
    sections: templates.buildSections('classic-sales', product),
  });
}

/* ---------------- tests ---------------- */

test('supabase: createUser → getUserByEmail → getUserById round-trip', async () => {
  const u = await makeUser(0, 30);
  const byEmail = await store.getUserByEmail(u.email);
  assert.equal(byEmail.id, u.id);
  assert.equal(byEmail.shopName, u.shopName);
  assert.equal(byEmail.walletBalance, 0);
  assert.ok(passwords.verifyPassword('secret1', byEmail.passwordHash));
  const byId = await store.getUserById(u.id);
  assert.equal(byId.email, u.email);
  assert.equal(await store.getUserByEmail('nobody@test.dev'), null);
});

test('supabase: tenant isolation', async () => {
  const a = await makeUser(0, 30);
  const b = await makeUser(0, 30);
  const page = await makePage(a, 'sb-a-shop');
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
  assert.equal((await store.getPageByIdForUser(page.id, a.id)).title, a.shopName);
  // Slug lookup (public page path) still finds A's page.
  assert.equal((await store.getPageBySlug('sb-a-shop')).id, page.id);
});

test('supabase: deposit approve credits wallet, double-approve blocked', async () => {
  const user = await makeUser(0, 30);
  const dep = await store.createDeposit({ userId: user.id, method: 'bKash', trxId: 'SBTRX1', amount: 900 });
  const approved = await store.approveDeposit(dep.id);
  assert.equal(approved.status, 'approved');
  assert.equal((await store.getUserById(user.id)).walletBalance, 900);
  assert.ok((await store.listLedgerByUser(user.id))
    .some((e) => e.type === 'deposit' && e.amount === 900 && e.balanceAfter === 900));
  assert.equal(await store.approveDeposit(dep.id), null);
  assert.equal((await store.getUserById(user.id)).walletBalance, 900);
});

test('supabase: billing deduction via fake PostgREST', async () => {
  const user = await makeUser(1000, -1); // due yesterday
  await makePage(user, 'sb-deduct-shop');
  const beforeDue = (await store.getUserById(user.id)).paidThrough;
  const summary = await billing.runBillingCycle(null, new Date());
  const after = await store.getUserById(user.id);
  assert.ok(summary.deducted.some((d) => d.userId === user.id && d.amount === 299));
  assert.equal(after.walletBalance, 701);
  assert.equal(after.paidThrough, new Date(new Date(beforeDue).getTime() + 30 * DAY).toISOString());
  assert.ok((await store.listLedgerByUser(user.id))
    .some((e) => e.type === 'subscription' && e.amount === -299 && e.balanceAfter === 701));
  assert.ok((await store.listOutbox()).some((m) => m.userId === user.id && m.kind === 'subscription_paid'));
});
