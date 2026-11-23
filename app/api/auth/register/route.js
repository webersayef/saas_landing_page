import { NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/store';
import { hashPassword } from '@/lib/passwords';
import { createTenantToken, TENANT_COOKIE } from '@/lib/auth';

export async function POST(req) {
  const { name, email, password, shopName } = await req.json().catch(() => ({}));
  if (!name || !email || !password || String(password).length < 6) {
    return NextResponse.json({ error: 'সব ঘর পূরণ করুন, পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' }, { status: 400 });
  }
  if (await getUserByEmail(email)) {
    return NextResponse.json({ error: 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা আছে। লগইন করুন।' }, { status: 409 });
  }
  const user = await createUser({ name, email, shopName, passwordHash: hashPassword(password) });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TENANT_COOKIE, createTenantToken(user.id), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 3600,
  });
  return res;
}
