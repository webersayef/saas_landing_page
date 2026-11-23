// Data layer — local JSON file store (data/store.json) so the whole SaaS
// runs and tests pass with ZERO external accounts. The production schema
// for Supabase lives in supabase-saas-setup.sql; this module is the single
// access point, so swapping the backend later touches only this file.
//
// TENANT ISOLATION RULE: every tenant-scoped getter/mutator takes userId
// and filters by it. There is intentionally no unscoped page/product/order
// getter for tenant use (super-admin functions are named listAll*).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const EMPTY = () => ({
  users: [], pages: [], products: [], orders: [],
  deposits: [], ledger: [], emailOutbox: [],
});

let cache = null;
let cachePath = null;

export function storePath() {
  return process.env.SAAS_STORE_PATH
    ? path.resolve(process.env.SAAS_STORE_PATH)
    : path.join(process.cwd(), 'data', 'store.json');
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
  const p = storePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 1));
  fs.renameSync(tmp, p);
}

// Test helper: drop the in-memory cache (next load re-reads the file).
export function resetStoreCache() { cache = null; cachePath = null; }

export const newId = () => crypto.randomUUID();
const nowISO = () => new Date().toISOString();

/* ---------------- users ---------------- */

export function createUser({ name, email, passwordHash, shopName }) {
  const s = loadStore();
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
  s.users.push(user);
  saveStore();
  return user;
}

export function getUserByEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return loadStore().users.find((u) => u.email === e) || null;
}
export function getUserById(id) {
  return loadStore().users.find((u) => u.id === id) || null;
}
export function updateUser(id, patch) {
  const s = loadStore();
  const u = s.users.find((x) => x.id === id);
  if (!u) return null;
  Object.assign(u, patch);
  saveStore();
  return u;
}
export const listAllUsers = () => [...loadStore().users];

/* ---------------- wallet / ledger ---------------- */

export function addLedger(userId, type, amount, note = '', refId = null) {
  const s = loadStore();
  const user = s.users.find((u) => u.id === userId);
  if (!user) return null;
  const entry = {
    id: newId(), userId, type, amount,
    balanceAfter: user.walletBalance, note, refId,
    createdAt: nowISO(),
  };
  s.ledger.push(entry);
  return entry;
}

// Credit wallet + ledger in one mutation. Returns the user or null.
export function creditWallet(userId, amount, type, note = '', refId = null) {
  const s = loadStore();
  const user = s.users.find((u) => u.id === userId);
  if (!user || !(amount > 0)) return null;
  user.walletBalance += amount;
  addLedger(userId, type, amount, note, refId);
  saveStore();
  return user;
}

// Debit wallet + ledger; returns false (no mutation) when insufficient.
export function debitWallet(userId, amount, type, note = '', refId = null) {
  const s = loadStore();
  const user = s.users.find((u) => u.id === userId);
  if (!user || !(amount > 0) || user.walletBalance < amount) return false;
  user.walletBalance -= amount;
  addLedger(userId, type, -amount, note, refId);
  saveStore();
  return true;
}

export const listLedgerByUser = (userId) =>
  loadStore().ledger.filter((e) => e.userId === userId).slice().reverse();

/* ---------------- pages ---------------- */

export function createPage({ userId, title, slug, templateId, productId, sections }) {
  const s = loadStore();
  const page = {
    id: newId(), userId,
    title: String(title || '').trim(),
    slug: String(slug || '').trim().toLowerCase(),
    templateId, productId: productId || null,
    sections: sections || [],
    createdAt: nowISO(),
  };
  s.pages.push(page);
  saveStore();
  return page;
}
export const getPageBySlug = (slug) =>
  loadStore().pages.find((p) => p.slug === String(slug || '').toLowerCase()) || null;
export const getPageByIdForUser = (id, userId) =>
  loadStore().pages.find((p) => p.id === id && p.userId === userId) || null;
export const listPagesByUser = (userId) => loadStore().pages.filter((p) => p.userId === userId);
export const countPagesByUser = (userId) => listPagesByUser(userId).length;
export function updatePageForUser(id, userId, patch) {
  const p = getPageByIdForUser(id, userId);
  if (!p) return null;
  Object.assign(p, patch);
  saveStore();
  return p;
}
export function deletePageForUser(id, userId) {
  const s = loadStore();
  const i = s.pages.findIndex((p) => p.id === id && p.userId === userId);
  if (i < 0) return false;
  s.pages.splice(i, 1);
  saveStore();
  return true;
}
export const listAllPages = () => [...loadStore().pages];

/* ---------------- products ---------------- */

export function createProduct({ userId, name, price, imageUrl }) {
  const s = loadStore();
  const product = {
    id: newId(), userId,
    name: String(name || '').trim(),
    price: Math.max(0, Number(price) || 0),
    imageUrl: String(imageUrl || '').trim(),
    createdAt: nowISO(),
  };
  s.products.push(product);
  saveStore();
  return product;
}
export const getProductByIdForUser = (id, userId) =>
  loadStore().products.find((p) => p.id === id && p.userId === userId) || null;
export const getProductById = (id) => loadStore().products.find((p) => p.id === id) || null;
export const listProductsByUser = (userId) => loadStore().products.filter((p) => p.userId === userId);
export function updateProductForUser(id, userId, patch) {
  const p = getProductByIdForUser(id, userId);
  if (!p) return null;
  if (patch.name != null) p.name = String(patch.name).trim();
  if (patch.price != null) p.price = Math.max(0, Number(patch.price) || 0);
  if (patch.imageUrl != null) p.imageUrl = String(patch.imageUrl).trim();
  saveStore();
  return p;
}
export function deleteProductForUser(id, userId) {
  const s = loadStore();
  const i = s.products.findIndex((p) => p.id === id && p.userId === userId);
  if (i < 0) return false;
  s.products.splice(i, 1);
  saveStore();
  return true;
}

/* ---------------- orders ---------------- */

export function createOrder({ userId, pageId, productId, customerName, phone, address, quantity, total }) {
  const s = loadStore();
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
  s.orders.push(order);
  saveStore();
  return order;
}
export const listOrdersByUser = (userId) =>
  loadStore().orders.filter((o) => o.userId === userId).slice().reverse();
export function updateOrderStatusForUser(id, userId, status) {
  const s = loadStore();
  const o = s.orders.find((x) => x.id === id && x.userId === userId);
  if (!o) return null;
  o.status = status;
  saveStore();
  return o;
}
export const listAllOrders = () => [...loadStore().orders];

/* ---------------- deposits ---------------- */

export function createDeposit({ userId, method, trxId, amount }) {
  const s = loadStore();
  const dep = {
    id: newId(), userId,
    method: String(method || '').trim(),
    trxId: String(trxId || '').trim(),
    amount: Math.max(0, Number(amount) || 0),
    status: 'pending',
    createdAt: nowISO(),
  };
  s.deposits.push(dep);
  saveStore();
  return dep;
}
export const listDepositsByUser = (userId) =>
  loadStore().deposits.filter((d) => d.userId === userId).slice().reverse();
export const listAllDeposits = () => [...loadStore().deposits].reverse();
// Approve a pending deposit: credit the wallet + ledger, mark approved.
// Returns the deposit, or null when missing / already processed.
export function approveDeposit(id) {
  const s = loadStore();
  const d = s.deposits.find((x) => x.id === id);
  if (!d || d.status !== 'pending') return null;
  d.status = 'approved';
  saveStore();
  creditWallet(d.userId, d.amount, 'deposit', `${d.method} ডিপোজিট (${d.trxId})`, d.id);
  return d;
}

export function setDepositStatus(id, status) {
  const s = loadStore();
  const d = s.deposits.find((x) => x.id === id);
  if (!d) return null;
  d.status = status;
  saveStore();
  return d;
}

/* ---------------- email outbox ---------------- */

export function queueEmail({ userId, to, kind, subject, body }) {
  const s = loadStore();
  const mail = {
    id: newId(), userId: userId || null, to, kind, subject, body,
    status: 'queued', createdAt: nowISO(),
  };
  s.emailOutbox.push(mail);
  saveStore();
  return mail;
}
export function markEmailSent(id) {
  const s = loadStore();
  const m = s.emailOutbox.find((x) => x.id === id);
  if (m) { m.status = 'sent'; saveStore(); }
}
export const listOutbox = () => [...loadStore().emailOutbox];
