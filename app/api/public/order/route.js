// Public order form endpoint — resolves the page by slug, credits the
// order to that page's tenant, and refuses locked subscriptions.
import { NextResponse } from 'next/server';
import { getPageBySlug, getProductById, createOrder, getUserById } from '@/lib/store';
import { getSubscriptionStatus } from '@/lib/billing';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const page = await getPageBySlug(body.slug || '');
  if (!page) return NextResponse.json({ error: 'পেজ পাওয়া যায়নি।' }, { status: 404 });
  const owner = await getUserById(page.userId);
  if (!owner || getSubscriptionStatus(owner) === 'locked') {
    return NextResponse.json({ error: 'এই পেজটির মেয়াদ শেষ হয়ে গেছে।' }, { status: 410 });
  }
  if (!body.customerName || !body.phone || !body.address) {
    return NextResponse.json({ error: 'নাম, মোবাইল নম্বর ও ঠিকানা দিন।' }, { status: 400 });
  }
  const product = page.productId ? await getProductById(page.productId) : null;
  const qty = Math.max(1, Number(body.quantity) || 1);
  const order = await createOrder({
    userId: page.userId, pageId: page.id, productId: product?.id || null,
    customerName: body.customerName, phone: body.phone, address: body.address,
    quantity: qty, total: product ? product.price * qty : 0,
  });
  return NextResponse.json({ ok: true, orderId: order.id });
}
