import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { GOOGLE_STATE_COOKIE, googleRedirectUri } from '@/lib/google';

// Start Google OAuth (env-gated: needs GOOGLE_CLIENT_ID). Sets a random
// state in a short-lived httpOnly cookie, then redirects to Google.
export async function GET(req) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/login?error=google', req.url));
  }
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  res.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
