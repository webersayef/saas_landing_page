import { NextResponse } from 'next/server';
import { resendVerifyCode } from '@/lib/auth-flow';

// Resend a fresh verification code (pending users only, 60s cooldown).
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { status, body: out } = await resendVerifyCode(body);
  return NextResponse.json(out, { status });
}
