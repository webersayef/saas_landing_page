import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getUserByEmail, createUser, updateUser } from '@/lib/store';
import { hashPassword } from '@/lib/passwords';
import { createTenantToken, TENANT_COOKIE, sessionCookieOpts, TENANT_MAX_AGE } from '@/lib/auth';
import { GOOGLE_STATE_COOKIE, googleRedirectUri } from '@/lib/google';

// Google OAuth callback: verify state → exchange code → userinfo.
// The Google email must be verified (email_verified from Google).
// Existing user → signed in (a pending account becomes verified/active).
// New email → account created already verified, then signed in.
export async function GET(req) {
  const fail = () => NextResponse.redirect(new URL('/login?error=google', req.url));
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const expectedState = req.cookies.get(GOOGLE_STATE_COOKIE)?.value;
    if (!code || !state || !expectedState || state !== expectedState) return fail();
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return fail();

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: googleRedirectUri(req),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return fail();
    const tokens = await tokenRes.json().catch(() => ({}));
    if (!tokens.access_token) return fail();

    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!infoRes.ok) return fail();
    const info = await infoRes.json().catch(() => ({}));
    if (!info.email || info.email_verified !== true) return fail();

    const email = String(info.email).trim().toLowerCase();
    let user = await getUserByEmail(email);
    let isNew = false;
    if (user) {
      if (user.emailVerified === false || user.status === 'pending') {
        user = await updateUser(user.id, {
          emailVerified: true, status: 'active',
          verifyCodeHash: null, verifyCodeExpiresAt: null,
          verifyAttempts: 0, verifySentAt: null,
        });
      }
    } else {
      user = await createUser({
        name: info.name || email.split('@')[0],
        email,
        shopName: '',
        // Random unusable password — this account signs in via Google.
        passwordHash: hashPassword(crypto.randomBytes(32).toString('hex')),
        emailVerified: true, status: 'active',
      });
      isNew = true;
    }

    const res = NextResponse.redirect(new URL(isNew ? '/dashboard?welcome=google' : '/dashboard', req.url));
    res.cookies.set(TENANT_COOKIE, createTenantToken(user.id), sessionCookieOpts(TENANT_MAX_AGE));
    res.cookies.set(GOOGLE_STATE_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return res;
  } catch {
    return fail();
  }
}
