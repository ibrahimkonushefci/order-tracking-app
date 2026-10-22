/**
 * The active brand: a signed-in user sees the brand of their own company, so one installation
 * can host several companies (the logo, the business type and the data always agree). Signed
 * out, the BRAND env var decides. Missing or invalid files fall back to the neutral brand.
 */
import 'server-only';
import { cache } from 'react';
import { getCurrentUser } from '@/auth/session';
import { getCompany } from '@/db/queries';
import { readBrand } from './files';

export const getActiveBrand = cache(async () => {
  const u = await getCurrentUser();
  const c = u?.companyId ? await getCompany(u.companyId) : null;
  return readBrand(c?.brandSlug ?? process.env.BRAND);
});
