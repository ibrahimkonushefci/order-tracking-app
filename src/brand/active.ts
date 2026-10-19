/**
 * The active brand: `?brand=<slug>` in demo mode (remembered in a cookie by proxy.ts),
 * otherwise the BRAND env var. Missing or invalid files fall back to the neutral brand.
 */
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { readBrand } from './files';

export const BRAND_COOKIE = 'ot-brand';
export const isDemoMode = () => process.env.DEMO_MODE === 'true';

export const getActiveBrand = cache(async () => {
  let slug = process.env.BRAND;
  if (isDemoMode()) {
    const fromCookie = (await cookies()).get(BRAND_COOKIE)?.value;
    if (fromCookie) slug = fromCookie;
  }
  return readBrand(slug);
});
