// Google OAuth shared bits (kept in lib/ — route files may only export
// HTTP handlers, so helpers/constants cannot live in a route module).
export const GOOGLE_STATE_COOKIE = 'saas_google_state';

export const googleEnabled = () => !!process.env.GOOGLE_CLIENT_ID;

export function googleRedirectUri(req) {
  const base = (process.env.APP_URL || new URL(req.url).origin).replace(/\/+$/, '');
  return `${base}/api/auth/google/callback`;
}
