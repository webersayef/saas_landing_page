import { NextResponse } from 'next/server';
import { loginWithPassword } from '@/lib/auth-flow';
import { createTenantToken, TENANT_COOKIE, sessionCookieOpts, TENANT_MAX_AGE } from '@/lib/auth';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { status, body: out, user } = await loginWithPassword(body);
  const res = NextResponse.json(out, { status });
  if (user) {
    res.cookies.set(TENANT_COOKIE, createTenantToken(user.id), sessionCookieOpts(TENANT_MAX_AGE));
  }
  return res;
}
