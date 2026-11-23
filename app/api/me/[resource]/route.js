// Tenant API — every handler resolves the session user first and every
// store call is scoped by that user's id (tenant isolation).
import { NextResponse } from 'next/server';
import { getTenantUser, publicUser } from '@/lib/auth-server';
import {
  listPagesByUser, createPage, updatePageForUser, deletePageForUser, getPageBySlug,
  listProductsByUser, createProduct, updateProductForUser, deleteProductForUser,
  listOrdersByUser, updateOrderStatusForUser,
  listDepositsByUser, createDeposit, listLedgerByUser, updateUser,
} from '@/lib/store';
import { buildSections, uniqueSlug } from '@/lib/templates';
import { getSubscriptionStatus } from '@/lib/billing';
import { priceForPageCount } from '@/lib/plans';

const err = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

async function authed() {
  const user = await getTenantUser();
  return user;
}

export async function GET(req, { params }) {
  const user = await authed();
  if (!user) return err('লগইন করুন।', 401);
  const { resource } = await params;

  if (resource === 'overview') {
    const pages = listPagesByUser(user.id);
    const orders = listOrdersByUser(user.id);
    return NextResponse.json({
      user: publicUser(user),
      status: getSubscriptionStatus(user),
      pageCount: pages.length,
      orderCount: orders.length,
      monthlyPrice: priceForPageCount(pages.length),
      recentOrders: orders.slice(0, 5),
    });
  }
  if (resource === 'pages') return NextResponse.json({ pages: listPagesByUser(user.id) });
  if (resource === 'products') return NextResponse.json({ products: listProductsByUser(user.id) });
  if (resource === 'orders') return NextResponse.json({ orders: listOrdersByUser(user.id) });
  if (resource === 'wallet') {
    return NextResponse.json({
      balance: user.walletBalance,
      deposits: listDepositsByUser(user.id),
      ledger: listLedgerByUser(user.id),
    });
  }
  if (resource === 'settings') return NextResponse.json({ user: publicUser(user) });
  return err('পাওয়া যায়নি।', 404);
}

export async function POST(req, { params }) {
  const user = await authed();
  if (!user) return err('লগইন করুন।', 401);
  const { resource } = await params;
  const body = await req.json().catch(() => ({}));

  if (resource === 'pages') {
    // 1-click create: template + product + shop name → live page.
    const title = String(body.title || user.shopName || 'আমার শপ').trim();
    const slug = uniqueSlug(body.slug || title, (s) => !!getPageBySlug(s));
    const product = body.productId
      ? listProductsByUser(user.id).find((p) => p.id === body.productId) || null
      : null;
    const page = createPage({
      userId: user.id, title, slug,
      templateId: body.templateId || 'classic-sales',
      productId: product?.id || null,
      sections: buildSections(body.templateId || 'classic-sales', product),
    });
    return NextResponse.json({ page });
  }
  if (resource === 'products') {
    if (!body.name) return err('প্রোডাক্টের নাম দিন।');
    return NextResponse.json({ product: createProduct({ userId: user.id, ...body }) });
  }
  if (resource === 'wallet') {
    // Deposit request (bKash/Nagad + TrxID) — super admin approves.
    if (!body.amount || Number(body.amount) <= 0 || !body.trxId || !body.method) {
      return err('পরিমাণ, মাধ্যম ও TrxID দিন।');
    }
    return NextResponse.json({ deposit: createDeposit({ userId: user.id, ...body }) });
  }
  return err('পাওয়া যায়নি।', 404);
}

export async function PATCH(req, { params }) {
  const user = await authed();
  if (!user) return err('লগইন করুন।', 401);
  const { resource } = await params;
  const body = await req.json().catch(() => ({}));

  if (resource === 'pages') {
    const patch = {};
    if (body.title != null) patch.title = String(body.title).trim();
    if (body.productId !== undefined) patch.productId = body.productId || null;
    if (Array.isArray(body.sections)) patch.sections = body.sections;
    const page = updatePageForUser(body.id, user.id, patch);
    return page ? NextResponse.json({ page }) : err('পেজ পাওয়া যায়নি।', 404);
  }
  if (resource === 'products') {
    const product = updateProductForUser(body.id, user.id, body);
    return product ? NextResponse.json({ product }) : err('প্রোডাক্ট পাওয়া যায়নি।', 404);
  }
  if (resource === 'orders') {
    const order = updateOrderStatusForUser(body.id, user.id, String(body.status || 'pending'));
    return order ? NextResponse.json({ order }) : err('অর্ডার পাওয়া যায়নি।', 404);
  }
  if (resource === 'settings') {
    const patch = {};
    if (body.shopName != null) patch.shopName = String(body.shopName).trim();
    if (body.pixelId != null) patch.pixelId = String(body.pixelId).trim();
    if (body.courier && typeof body.courier === 'object') {
      patch.courier = { ...user.courier, ...body.courier };
    }
    return NextResponse.json({ user: publicUser(updateUser(user.id, patch)) });
  }
  return err('পাওয়া যায়নি।', 404);
}

export async function DELETE(req, { params }) {
  const user = await authed();
  if (!user) return err('লগইন করুন।', 401);
  const { resource } = await params;
  const { id } = await req.json().catch(() => ({}));
  if (resource === 'pages') {
    return deletePageForUser(id, user.id)
      ? NextResponse.json({ ok: true }) : err('পেজ পাওয়া যায়নি।', 404);
  }
  if (resource === 'products') {
    return deleteProductForUser(id, user.id)
      ? NextResponse.json({ ok: true }) : err('প্রোডাক্ট পাওয়া যায়নি।', 404);
  }
  return err('পাওয়া যায়নি।', 404);
}
