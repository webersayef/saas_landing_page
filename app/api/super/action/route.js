// Super-admin actions: deposit approve/reject, user extend/suspend,
// set paidThrough (expiry simulation for tests), run billing now.
import { NextResponse } from 'next/server';
import { isSuperAuthed } from '@/lib/auth-server';
import {
  setDepositStatus, approveDeposit, updateUser, getUserById,
} from '@/lib/store';
import { runBillingCycle } from '@/lib/billing';

const err = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function POST(req) {
  if (!(await isSuperAuthed())) return err('unauthorized', 401);
  const body = await req.json().catch(() => ({}));

  if (body.action === 'approveDeposit') {
    const dep = await approveDeposit(body.id);
    if (!dep) return err('ডিপোজিট পাওয়া যায়নি বা আগেই প্রসেস হয়েছে।', 404);
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'rejectDeposit') {
    const dep = await setDepositStatus(body.id, 'rejected');
    return dep ? NextResponse.json({ ok: true }) : err('ডিপোজিট পাওয়া যায়নি।', 404);
  }
  if (body.action === 'extendUser') {
    const u = await getUserById(body.userId);
    if (!u) return err('ইউজার পাওয়া যায়নি।', 404);
    const base = Math.max(Date.now(), new Date(u.paidThrough).getTime());
    await updateUser(u.id, { paidThrough: new Date(base + 30 * 86400000).toISOString() });
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'setSuspended') {
    const u = await updateUser(body.userId, { suspended: !!body.suspended });
    return u ? NextResponse.json({ ok: true }) : err('ইউজার পাওয়া যায়নি।', 404);
  }
  if (body.action === 'setPaidThrough') {
    // Test helper: simulate expiry by moving paidThrough into the past.
    const when = new Date(body.paidThrough);
    if (isNaN(when)) return err('তারিখ ঠিক নেই।');
    const u = await updateUser(body.userId, { paidThrough: when.toISOString(), billingWarnFor: null, billingFailFor: null });
    return u ? NextResponse.json({ ok: true }) : err('ইউজার পাওয়া যায়নি।', 404);
  }
  if (body.action === 'runBilling') {
    const summary = await runBillingCycle(null, new Date());
    return NextResponse.json({ ok: true, summary });
  }
  return err('অজানা অ্যাকশন।');
}
