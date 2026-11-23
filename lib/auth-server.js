// Server-side session helpers (next/headers) — kept apart from the pure
// token functions in lib/auth.js so those stay unit-testable.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  TENANT_COOKIE, SUPER_COOKIE, parseTenantToken, parseSuperToken,
} from './auth.js';
import { getUserById } from './store.js';

export async function getTenantUser() {
  const jar = await cookies();
  const data = parseTenantToken(jar.get(TENANT_COOKIE)?.value);
  if (!data) return null;
  return getUserById(data.uid);
}

export async function requireTenantUser() {
  const user = await getTenantUser();
  if (!user) redirect('/login');
  return user;
}

export async function isSuperAuthed() {
  const jar = await cookies();
  return !!parseSuperToken(jar.get(SUPER_COOKIE)?.value);
}

export async function requireSuper() {
  if (!(await isSuperAuthed())) redirect('/super/login');
}

// Public view of a user (never leak the password hash).
export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}
