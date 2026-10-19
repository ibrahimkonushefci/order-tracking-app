import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from './auth';
import { assertCan, type Action } from './permissions';
import type { Role } from '@/db/schema';

export interface CurrentUser {
  id: string;
  name: string;
  firstName: string;
  email: string;
  role: Role;
  companyId: string | null;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const auth = await getAuth();
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = s.user as typeof s.user & { role?: string; firstName?: string; companyId?: string | null; active?: boolean };
  if (u.active === false || (u.role !== 'owner' && u.role !== 'office')) return null;
  return {
    id: u.id,
    name: u.name,
    firstName: u.firstName || u.name.split(' ')[0],
    email: u.email,
    role: u.role,
    companyId: u.companyId ?? null,
  };
});

/** Pages: redirect to /login without a session. */
export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  return u;
}

/** Server actions: a session and the permission for `action`, or throw. */
export async function requirePermission(action: Action): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error('unauthenticated');
  assertCan(u.role, action);
  return u;
}
