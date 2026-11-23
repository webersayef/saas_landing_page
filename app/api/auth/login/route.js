import { NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/store';
import { verifyPassword } from '@/lib/passwords';
import { createTenantToken, TENANT_COOKIE } from '@/lib/auth';

export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  const user = getUserByEmail(email || '');
  if (!user || !verifyPassword(password || '', user.passwordHash)) {
    return NextResponse.json({ error: 'ইমেইল বা পাসওয়ার্ড ভুল।' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TENANT_COOKIE, createTenantToken(user.id), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 3600,
  });
  return res;
}
