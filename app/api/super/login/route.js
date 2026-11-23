import { NextResponse } from 'next/server';
import { checkSuperPassword, createSuperToken, SUPER_COOKIE } from '@/lib/auth';

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!checkSuperPassword(password || '')) {
    return NextResponse.json({ error: 'পাসওয়ার্ড ভুল।' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SUPER_COOKIE, createSuperToken(), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 12 * 3600,
  });
  return res;
}
