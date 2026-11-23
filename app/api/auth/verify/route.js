import { NextResponse } from 'next/server';
import { verifyEmailCode } from '@/lib/auth-flow';

// Verify the 6-digit email code. Success activates the account but does
// NOT log the user in — the UI sends them to the login form next.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { status, body: out } = await verifyEmailCode(body);
  return NextResponse.json(out, { status });
}
