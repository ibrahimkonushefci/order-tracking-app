/**
 * The active brand. In demo mode a signed-in user sees the brand of their own company, so the
 * logo, the business type and the data always agree; signed out, `?brand=<slug>` (remembered
 * in a cookie by proxy.ts) decides. Otherwise the BRAND env var. Missing or invalid files fall
 * back to the neutral brand.
 */
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/auth/session';
import { getCompany } from '@/db/queries';
import { readBrand } from './files';

export const BRAND_COOKIE = 'ot-brand';
export const isDemoMode = () => process.env.DEMO_MODE === 'true';

/** The brand chosen in this browser (`?brand=`), demo mode only. */
export async function chosenBrandSlug(): Promise<string | undefined> {
  if (!isDemoMode()) return process.env.BRAND;
  return (await cookies()).get(BRAND_COOKIE)?.value || process.env.BRAND;
}

export const getActiveBrand = cache(async () => {
  let slug = await chosenBrandSlug();
  if (isDemoMode()) {
    const u = await getCurrentUser();
    const c = u?.companyId ? await getCompany(u.companyId) : null;
    if (c) slug = c.brandSlug;
  }
  return readBrand(slug);
});
