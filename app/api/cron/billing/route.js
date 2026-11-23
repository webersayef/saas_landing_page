// Billing cron — Vercel Cron compatible. Protect with CRON_SECRET:
// Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when
// the env var is set; manual calls may use ?secret= as well.
import { NextResponse } from 'next/server';
import { runBillingCycle } from '@/lib/billing';

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  const url = new URL(req.url);
  return auth === `Bearer ${secret}` || url.searchParams.get('secret') === secret;
}

async function handle(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const summary = await runBillingCycle(null, new Date());
  return NextResponse.json({ ok: true, summary });
}
export const GET = handle;
export const POST = handle;
