import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/auth/session';
import { BRAND_COOKIE, isDemoMode } from '@/brand/active';
import { readBrand } from '@/brand/files';
import { getCompany } from '@/db/queries';
import { signInDemo } from '@/server/demo';
import { browserOrigin } from '@/lib/origin';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** `?brand=<slug>` (see proxy.ts): demo mode only; anything else is a 404. */
export async function GET(req: NextRequest) {
  if (!isDemoMode()) return new Response('Not found', { status: 404 });
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const raw = req.nextUrl.searchParams.get('next') ?? '/';
  const next =
    raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/demo/') ? raw : '/';
  const jar = await cookies();
  const { fallback } = await readBrand(slug);
  if (!SLUG_RE.test(slug) || fallback) {
    jar.delete(BRAND_COOKIE);
  } else {
    jar.set(BRAND_COOKIE, slug, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
    const u = await getCurrentUser();
    const c = u?.companyId ? await getCompany(u.companyId) : null;
    if (u && c && c.brandSlug !== slug) await signInDemo(u.role, slug).catch(() => false);
  }
  return Response.redirect(new URL(next, browserOrigin(req)), 307);
}
