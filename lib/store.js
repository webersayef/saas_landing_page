// Data layer — ASYNC API (Phase 2). Two backends behind one interface:
//
//   • Supabase mode — when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are
//     set: PostgREST REST via plain fetch (no SDK, no new dependencies).
//     Tables in supabase-saas-setup.sql mirror the JS shapes 1:1.
//   • JSON mode — otherwise: local JSON file store (data/store.json, or
//     /tmp on Vercel) so local dev and tests run with ZERO accounts.
//
// TENANT ISOLATION RULE (unchanged): every tenant-scoped getter/mutator
// takes userId and filters by it. There is intentionally no unscoped
// page/product/order getter for tenant use (super-admin functions are
// named listAll*).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/* ================= backend selection ================= */

export function supabaseEnabled() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function sb(table, { method = 'GET', query = '', body = undefined, prefer = '' } = {}) {
  const base = String(process.env.SUPABASE_URL).replace(/\/+$/, '');
  const headers = {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${base}/rest/v1/${table}${query}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase ${method} ${table} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  return data;
}
const sbList = async (table, query = '') => (await sb(table, { query })) || [];
const sbOne = async (table, query) => {
  const rows = await sbList(table, query);
  return rows[0] || null;
};
const sbInsert = async (table, row) => {
  const rows = await sb(table, { method: 'POST', body: row, prefer: 'return=representation' });
  return rows?.[0] || null;
};
const sbPatch = async (table, query, patch) => {
  const rows = await sb(table, { method: 'PATCH', query, body: patch, prefer: 'return=representation' });
  return rows?.[0] || null;
};
const eq = (col, val) => `${col}=eq.${encodeURIComponent(val)}`;

/* ================= row mapping (camelCase JS ↔ snake_case) ================= */

const ts = (v) => (v == null ? null : new Date(v).toISOString());

function userFromRow(r) {
  if (!r) return null;
  return {
    id: r.id, name: r.name, email: r.email,
    passwordHash: r.password_hash, shopName: r.shop_name,
    walletBalance: r.wallet_balance, paidThrough: ts(r.paid_through),
    suspended: r.suspended, pixelId: r.pixel_id,
    courier: r.courier || { steadfastApiKey: '', steadfastSecret: '', pathaoClientId: '', pathaoSecret: '', note: '' },
    billingWarnFor: ts(r.billing_warn_for), billingFailFor: ts(r.billing_fail_for),
    createdAt: ts(r.created_at),
  };
}
function userToRow(u) {
  const row = {};
  if (u.name !== undefined) row.name = u.name;
  if (u.email !== undefined) row.email = u.email;
  if (u.passwordHash !== undefined) row.password_hash = u.passwordHash;
  if (u.shopName !== undefined) row.shop_name = u.shopName;
  if (u.walletBalance !== undefined) row.wallet_balance = u.walletBalance;
  if (u.paidThrough !== undefined) row.paid_through = u.paidThrough;
  if (u.suspended !== undefined) row.suspended = u.suspended;
  if (u.pixelId !== undefined) row.pixel_id = u.pixelId;
  if (u.courier !== undefined) row.courier = u.courier;
  if (u.billingWarnFor !== undefined) row.billing_warn_for = u.billingWarnFor;
  if (u.billingFailFor !== undefined) row.billing_fail_for = u.billingFailFor;
  return row;
}
const pageFromRow = (r) => (r ? {
  id: r.id, userId: r.user_id, title: r.title, slug: r.slug,
  templateId: r.template_id, productId: r.product_id,
  sections: r.sections || [], createdAt: ts(r.created_at),
} : null);
function pageToRow(p) {
  const row = {};
  if (p.title !== undefined) row.title = p.title;
  if (p.slug !== undefined) row.slug = p.slug;
  if (p.templateId !== undefined) row.template_id = p.templateId;
  if (p.productId !== undefined) row.product_id = p.productId;
  if (p.sections !== undefined) row.sections = p.sections;
  return row;
}
const productFromRow = (r) => (r ? {
  id: r.id, userId: r.user_id, name: r.name, price: r.price,
  imageUrl: r.image_url, createdAt: ts(r.created_at),
} : null);
const orderFromRow = (r) => (r ? {
  id: r.id, userId: r.user_id, pageId: r.page_id, productId: r.product_id,
  customerName: r.customer_name, phone: r.phone, address: r.address,
  quantity: r.quantity, total: r.total, status: r.status, createdAt: ts(r.created_at),
} : null);
const ledgerFromRow = (r) => (r ? {
  id: r.id, userId: r.user_id, type: r.type, amount: r.amount,
  balanceAfter: r.balance_after, note: r.note, refId: r.ref_id, createdAt: ts(r.created_at),
} : null);
const depositFromRow = (r) => (r ? {
  id: r.id, userId: r.user_id, method: r.method, trxId: r.trx_id,
  amount: r.amount, status: r.status, createdAt: ts(r.created_at),
} : null);
const emailFromRow = (r) => (r ? {
  id: r.id, userId: r.user_id, to: r.to_email, kind: r.kind,
  subject: r.subject, body: r.body, status: r.status, createdAt: ts(r.created_at),
} : null);

/* ================= JSON file backend ================= */

const EMPTY = () => ({
  users: [], pages: [], products: [], orders: [],
  deposits: [], ledger: [], emailOutbox: [],
});

let cache = null;
let cachePath = null;

export function storePath() {
  if (process.env.SAAS_STORE_PATH) return path.resolve(process.env.SAAS_STORE_PATH);
  // Vercel/serverless: the project directory is read-only — only /tmp is
  // writable. JSON mode there is test-only (data lasts one warm instance);
  // production uses Supabase mode.
  if (process.env.VERCEL) return path.join('/tmp', 'landing-saas-store.json');
  return path.join(process.cwd(), 'data', 'store.json');
}

export function loadStore() {
  const p = storePath();
  if (cache && cachePath === p) return cache;
  let data = EMPTY();
  try {
    data = { ...EMPTY(), ...JSON.parse(fs.readFileSync(p, 'utf8')) };
  } catch { /* first run — empty store */ }
  cache = data;
  cachePath = p;
  return cache;
}

export function saveStore() {
  const write = (p) => {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const tmp = `${p}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 1));
    fs.renameSync(tmp, p);
  };
  try {
    write(storePath());
  } catch {
    write(path.join('/tmp', 'landing-saas-store.json'));
  }
}

// Test helper: drop the in-memory cache (next load re-reads the file).
export function resetStoreCache() { cache = null; cachePath = null; }

export const newId = () => crypto.randomUUID();
const nowISO = () => new Date().toISOString();

// JSON-mode ledger append; caller must have already applied the balance
// change to the user object (mirrors the original Phase-1 semantics).
function jAddLedger(s, user, type, amount, note, refId) {
  const entry = {
    id: newId(), userId: user.id, type, amount,
    balanceAfter: user.walletBalance, note, refId,
    createdAt: nowISO(),
  };
  s.ledger.push(entry);
  return entry;
}

/* ---------------- users ---------------- */

export async function createUser({ name, email, passwordHash, shopName }) {
  const user = {
    id: newId(),
    name: String(name || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    passwordHash,
    shopName: String(shopName || '').trim(),
    walletBalance: 0,
    // New accounts start with a 30-day free first cycle so the product
    // can be tested end-to-end; billing takes over from paidThrough.
    paidThrough: new Date(Date.now() + 30 * 86400000).toISOString(),
    suspended: false,
    pixelId: '',
    courier: { steadfastApiKey: '', steadfastSecret: '', pathaoClientId: '', pathaoSecret: '', note: '' },
    billingWarnFor: null, // paidThrough value a due-soon warning was sent for
    billingFailFor: null, // paidThrough value an insufficient-funds mail was sent for
    createdAt: nowISO(),
  };
  if (supabaseEnabled()) {
    const row = await sbInsert('saas_users', { id: user.id, created_at: user.createdAt, ...userToRow(user) });
    return userFromRow(row) || user;
  }
  const s = loadStore();
  s.users.push(user);
  saveStore();
  return user;
}

export async function getUserByEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (supabaseEnabled()) return userFromRow(await sbOne('saas_users', `?${eq('email', e)}`));
  return loadStore().users.find((u) => u.email === e) || null;
}
export async function getUserById(id) {
  if (supabaseEnabled()) return userFromRow(await sbOne('saas_users', `?${eq('id', id)}`));
  return loadStore().users.find((u) => u.id === id) || null;
}
export async function updateUser(id, patch) {
  if (supabaseEnabled()) {
    return userFromRow(await sbPatch('saas_users', `?${eq('id', id)}`, userToRow(patch)));
  }
  const s = loadStore();
  const u = s.users.find((x) => x.id === id);
  if (!u) return null;
  Object.assign(u, patch);
  saveStore();
  return u;
}
export async function listAllUsers() {
  if (supabaseEnabled()) return (await sbList('saas_users')).map(userFromRow);
  return [...loadStore().users];
}

/* ---------------- wallet / ledger ---------------- */

export async function addLedger(userId, type, amount, note = '', refId = null) {
  if (supabaseEnabled()) {
    const user = await getUserById(userId);
    if (!user) return null;
    const row = await sbInsert('saas_ledger', {
      id: newId(), user_id: userId, type, amount,
      balance_after: user.walletBalance, note, ref_id: refId,
    });
    return ledgerFromRow(row);
  }
  const s = loadStore();
  const user = s.users.find((u) => u.id === userId);
  if (!user) return null;
  const entry = jAddLedger(s, user, type, amount, note, refId);
  saveStore();
  return entry;
}

// Credit wallet + ledger in one mutation. Returns the user or null.
export async function creditWallet(userId, amount, type, note = '', refId = null) {
  if (!(amount > 0)) return null;
  if (supabaseEnabled()) {
    const user = await getUserById(userId);
    if (!user) return null;
    const updated = await updateUser(userId, { walletBalance: user.walletBalance + amount });
    await sbInsert('saas_ledger', {
      id: newId(), user_id: userId, type, amount,
      balance_after: updated.walletBalance, note, ref_id: refId,
    });
    return updated;
  }
  const s = loadStore();
  const user = s.users.find((u) => u.id === userId);
  if (!user) return null;
  user.walletBalance += amount;
  jAddLedger(s, user, type, amount, note, refId);
  saveStore();
  return user;
}

// Debit wallet + ledger; returns false (no mutation) when insufficient.
export async function debitWallet(userId, amount, type, note = '', refId = null) {
  if (!(amount > 0)) return false;
  if (supabaseEnabled()) {
    const user = await getUserById(userId);
    if (!user || user.walletBalance < amount) return false;
    const updated = await updateUser(userId, { walletBalance: user.walletBalance - amount });
    await sbInsert('saas_ledger', {
      id: newId(), user_id: userId, type, amount: -amount,
      balance_after: updated.walletBalance, note, ref_id: refId,
    });
    return true;
  }
  const s = loadStore();
  const user = s.users.find((u) => u.id === userId);
  if (!user || user.walletBalance < amount) return false;
  user.walletBalance -= amount;
  jAddLedger(s, user, type, -amount, note, refId);
  saveStore();
  return true;
}

export async function listLedgerByUser(userId) {
  if (supabaseEnabled()) {
    return (await sbList('saas_ledger', `?${eq('user_id', userId)}`)).map(ledgerFromRow).reverse();
  }
  return loadStore().ledger.filter((e) => e.userId === userId).slice().reverse();
}

/* ---------------- pages ---------------- */

export async function createPage({ userId, title, slug, templateId, productId, sections }) {
  const page = {
    id: newId(), userId,
    title: String(title || '').trim(),
    slug: String(slug || '').trim().toLowerCase(),
    templateId, productId: productId || null,
    sections: sections || [],
    createdAt: nowISO(),
  };
  if (supabaseEnabled()) {
    const row = await sbInsert('saas_pages', {
      id: page.id, user_id: userId, created_at: page.createdAt, ...pageToRow(page),
    });
    return pageFromRow(row) || page;
  }
  const s = loadStore();
  s.pages.push(page);
  saveStore();
  return page;
}
export async function getPageBySlug(slug) {
  const sl = String(slug || '').toLowerCase();
  if (supabaseEnabled()) return pageFromRow(await sbOne('saas_pages', `?${eq('slug', sl)}`));
  return loadStore().pages.find((p) => p.slug === sl) || null;
}
export async function getPageByIdForUser(id, userId) {
  if (supabaseEnabled()) {
    return pageFromRow(await sbOne('saas_pages', `?${eq('id', id)}&${eq('user_id', userId)}`));
  }
  return loadStore().pages.find((p) => p.id === id && p.userId === userId) || null;
}
export async function listPagesByUser(userId) {
  if (supabaseEnabled()) {
    return (await sbList('saas_pages', `?${eq('user_id', userId)}`)).map(pageFromRow);
  }
  return loadStore().pages.filter((p) => p.userId === userId);
}
export async function countPagesByUser(userId) {
  return (await listPagesByUser(userId)).length;
}
export async function updatePageForUser(id, userId, patch) {
  if (supabaseEnabled()) {
    return pageFromRow(await sbPatch('saas_pages',
      `?${eq('id', id)}&${eq('user_id', userId)}`, pageToRow(patch)));
  }
  const p = await getPageByIdForUser(id, userId);
  if (!p) return null;
  Object.assign(p, patch);
  saveStore();
  return p;
}
export async function deletePageForUser(id, userId) {
  if (supabaseEnabled()) {
    const rows = await sb('saas_pages', {
      method: 'DELETE',
      query: `?${eq('id', id)}&${eq('user_id', userId)}`,
      prefer: 'return=representation',
    });
    return !!(rows && rows.length);
  }
  const s = loadStore();
  const i = s.pages.findIndex((p) => p.id === id && p.userId === userId);
  if (i < 0) return false;
  s.pages.splice(i, 1);
  saveStore();
  return true;
}
export async function listAllPages() {
  if (supabaseEnabled()) return (await sbList('saas_pages')).map(pageFromRow);
  return [...loadStore().pages];
}

/* ---------------- products ---------------- */

export async function createProduct({ userId, name, price, imageUrl }) {
  const product = {
    id: newId(), userId,
    name: String(name || '').trim(),
    price: Math.max(0, Number(price) || 0),
    imageUrl: String(imageUrl || '').trim(),
    createdAt: nowISO(),
  };
  if (supabaseEnabled()) {
    const row = await sbInsert('saas_products', {
      id: product.id, user_id: userId, name: product.name, price: product.price,
      image_url: product.imageUrl, created_at: product.createdAt,
    });
    return productFromRow(row) || product;
  }
  const s = loadStore();
  s.products.push(product);
  saveStore();
  return product;
}
export async function getProductByIdForUser(id, userId) {
  if (supabaseEnabled()) {
    return productFromRow(await sbOne('saas_products', `?${eq('id', id)}&${eq('user_id', userId)}`));
  }
  return loadStore().products.find((p) => p.id === id && p.userId === userId) || null;
}
export async function getProductById(id) {
  if (supabaseEnabled()) return productFromRow(await sbOne('saas_products', `?${eq('id', id)}`));
  return loadStore().products.find((p) => p.id === id) || null;
}
export async function listProductsByUser(userId) {
  if (supabaseEnabled()) {
    return (await sbList('saas_products', `?${eq('user_id', userId)}`)).map(productFromRow);
  }
  return loadStore().products.filter((p) => p.userId === userId);
}
export async function updateProductForUser(id, userId, patch) {
  if (supabaseEnabled()) {
    const rowPatch = {};
    if (patch.name != null) rowPatch.name = String(patch.name).trim();
    if (patch.price != null) rowPatch.price = Math.max(0, Number(patch.price) || 0);
    if (patch.imageUrl != null) rowPatch.image_url = String(patch.imageUrl).trim();
    if (!Object.keys(rowPatch).length) return getProductByIdForUser(id, userId);
    return productFromRow(await sbPatch('saas_products',
      `?${eq('id', id)}&${eq('user_id', userId)}`, rowPatch));
  }
  const p = await getProductByIdForUser(id, userId);
  if (!p) return null;
  if (patch.name != null) p.name = String(patch.name).trim();
  if (patch.price != null) p.price = Math.max(0, Number(patch.price) || 0);
  if (patch.imageUrl != null) p.imageUrl = String(patch.imageUrl).trim();
  saveStore();
  return p;
}
export async function deleteProductForUser(id, userId) {
  if (supabaseEnabled()) {
    const rows = await sb('saas_products', {
      method: 'DELETE',
      query: `?${eq('id', id)}&${eq('user_id', userId)}`,
      prefer: 'return=representation',
    });
    return !!(rows && rows.length);
  }
  const s = loadStore();
  const i = s.products.findIndex((p) => p.id === id && p.userId === userId);
  if (i < 0) return false;
  s.products.splice(i, 1);
  saveStore();
  return true;
}

/* ---------------- orders ---------------- */

export async function createOrder({ userId, pageId, productId, customerName, phone, address, quantity, total }) {
  const order = {
    id: newId(), userId, pageId, productId: productId || null,
    customerName: String(customerName || '').trim(),
    phone: String(phone || '').trim(),
    address: String(address || '').trim(),
    quantity: Math.max(1, Number(quantity) || 1),
    total: Math.max(0, Number(total) || 0),
    status: 'pending',
    createdAt: nowISO(),
  };
  if (supabaseEnabled()) {
    const row = await sbInsert('saas_orders', {
      id: order.id, user_id: userId, page_id: pageId || null, product_id: order.productId,
      customer_name: order.customerName, phone: order.phone, address: order.address,
      quantity: order.quantity, total: order.total, status: order.status,
      created_at: order.createdAt,
    });
    return orderFromRow(row) || order;
  }
  const s = loadStore();
  s.orders.push(order);
  saveStore();
  return order;
}
export async function listOrdersByUser(userId) {
  if (supabaseEnabled()) {
    return (await sbList('saas_orders', `?${eq('user_id', userId)}`)).map(orderFromRow).reverse();
  }
  return loadStore().orders.filter((o) => o.userId === userId).slice().reverse();
}
export async function updateOrderStatusForUser(id, userId, status) {
  if (supabaseEnabled()) {
    return orderFromRow(await sbPatch('saas_orders',
      `?${eq('id', id)}&${eq('user_id', userId)}`, { status }));
  }
  const s = loadStore();
  const o = s.orders.find((x) => x.id === id && x.userId === userId);
  if (!o) return null;
  o.status = status;
  saveStore();
  return o;
}
export async function listAllOrders() {
  if (supabaseEnabled()) return (await sbList('saas_orders')).map(orderFromRow);
  return [...loadStore().orders];
}

/* ---------------- deposits ---------------- */

export async function createDeposit({ userId, method, trxId, amount }) {
  const dep = {
    id: newId(), userId,
    method: String(method || '').trim(),
    trxId: String(trxId || '').trim(),
    amount: Math.max(0, Number(amount) || 0),
    status: 'pending',
    createdAt: nowISO(),
  };
  if (supabaseEnabled()) {
    const row = await sbInsert('saas_deposits', {
      id: dep.id, user_id: userId, method: dep.method, trx_id: dep.trxId,
      amount: dep.amount, status: dep.status, created_at: dep.createdAt,
    });
    return depositFromRow(row) || dep;
  }
  const s = loadStore();
  s.deposits.push(dep);
  saveStore();
  return dep;
}
export async function listDepositsByUser(userId) {
  if (supabaseEnabled()) {
    return (await sbList('saas_deposits', `?${eq('user_id', userId)}`)).map(depositFromRow).reverse();
  }
  return loadStore().deposits.filter((d) => d.userId === userId).slice().reverse();
}
export async function listAllDeposits() {
  if (supabaseEnabled()) return (await sbList('saas_deposits')).map(depositFromRow).reverse();
  return [...loadStore().deposits].reverse();
}
// Approve a pending deposit: credit the wallet + ledger, mark approved.
// Returns the deposit, or null when missing / already processed.
export async function approveDeposit(id) {
  if (supabaseEnabled()) {
    // The status=eq.pending filter makes double-approve impossible.
    const d = depositFromRow(await sbPatch('saas_deposits',
      `?${eq('id', id)}&${eq('status', 'pending')}`, { status: 'approved' }));
    if (!d) return null;
    await creditWallet(d.userId, d.amount, 'deposit', `${d.method} ডিপোজিট (${d.trxId})`, d.id);
    return d;
  }
  const s = loadStore();
  const d = s.deposits.find((x) => x.id === id);
  if (!d || d.status !== 'pending') return null;
  d.status = 'approved';
  saveStore();
  await creditWallet(d.userId, d.amount, 'deposit', `${d.method} ডিপোজিট (${d.trxId})`, d.id);
  return d;
}

export async function setDepositStatus(id, status) {
  if (supabaseEnabled()) {
    return depositFromRow(await sbPatch('saas_deposits', `?${eq('id', id)}`, { status }));
  }
  const s = loadStore();
  const d = s.deposits.find((x) => x.id === id);
  if (!d) return null;
  d.status = status;
  saveStore();
  return d;
}

/* ---------------- email outbox ---------------- */

export async function queueEmail({ userId, to, kind, subject, body }) {
  const mail = {
    id: newId(), userId: userId || null, to, kind, subject, body,
    status: 'queued', createdAt: nowISO(),
  };
  if (supabaseEnabled()) {
    const row = await sbInsert('saas_email_outbox', {
      id: mail.id, user_id: mail.userId, to_email: to, kind, subject, body,
      status: mail.status, created_at: mail.createdAt,
    });
    return emailFromRow(row) || mail;
  }
  const s = loadStore();
  s.emailOutbox.push(mail);
  saveStore();
  return mail;
}
export async function markEmailSent(id) {
  if (supabaseEnabled()) {
    await sbPatch('saas_email_outbox', `?${eq('id', id)}`, { status: 'sent' });
    return;
  }
  const s = loadStore();
  const m = s.emailOutbox.find((x) => x.id === id);
  if (m) { m.status = 'sent'; saveStore(); }
}
export async function listOutbox() {
  if (supabaseEnabled()) return (await sbList('saas_email_outbox')).map(emailFromRow);
  return [...loadStore().emailOutbox];
}
