import { NextResponse } from 'next/server';
import { checkSuperPassword, createSuperToken, SUPER_COOKIE, sessionCookieOpts, SUPER_MAX_AGE } from '@/lib/auth';

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!checkSuperPassword(password || '')) {
    return NextResponse.json({ error: 'পাসওয়ার্ড ভুল।' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SUPER_COOKIE, createSuperToken(), sessionCookieOpts(SUPER_MAX_AGE));
  return res;
}
