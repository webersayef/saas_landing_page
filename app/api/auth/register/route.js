import { NextResponse } from 'next/server';
import { registerWithVerification } from '@/lib/auth-flow';

// Register now creates an UNVERIFIED account and emails a 6-digit code —
// no session cookie is set here; the user verifies, then logs in.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { status, body: out } = await registerWithVerification(body);
  return NextResponse.json(out, { status });
}
