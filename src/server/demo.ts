/**
 * Demo mode (spec "Demo mode & seed data", PHASES.md Phase 5). Everything here is a no-op or
 * refuses when DEMO_MODE is not "true", so a client instance never shows or runs it.
 *  - the demo company of a brand and its Pronari/Zyra (one-tap logins)
 *  - "Rivendos demon" (reset) and the daily refresh of the online demo (DEMO_DAILY_RESET)
 *  - "Numri i takimit": the owner's phone number for the meeting, so prepared messages can be
 *    sent there by hand (a per-browser cookie that expires the same day)
 *  - the public HTTPS address used by QR codes and links, also when the laptop runs offline
 */
import 'server-only';
import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getAuth } from '@/auth/auth';
import { BRAND_COOKIE, isDemoMode } from '@/brand/active';
import { getDb } from '@/db/client';
import { company, user } from '@/db/schema';
import { loadDemo } from '@/db/demo/load';
import { todayIso } from '@/lib/dates';
import { toE164 } from '@/services/common';
import { DEMO_DAYS_COOKIE } from './today';

export const DEMO_PHONE_COOKIE = 'ot-demo-phone';

/**
 * A record screen whose record isn't in this company. In demo mode (several brands, stale URLs
 * after a brand switch or a reset) go to its list; otherwise the usual 404.
 */
export function missingRecord(list: '/orders' | '/debts' | '/schedule'): never {
  if (isDemoMode()) redirect(list);
  notFound();
}

/** The reachable HTTPS demo (e.g. https://order-tracking-test.vercel.app) for QR codes and links. */
export function publicBase(): string | null {
  const v = (process.env.APP_URL || (isDemoMode() ? process.env.DEMO_PUBLIC_URL : '') || '')
    .trim()
    .replace(/\/$/, '');
  return /^https?:\/\//.test(v) ? v : null;
}

/** The demo company for a brand: the seeded one, else (fixtures) the only company there is. */
export async function demoCompanyFor(slug: string | undefined) {
  const db = await getDb();
  const rows = await db.select().from(company).orderBy(asc(company.createdAt));
  return rows.find(c => c.brandSlug === slug) ?? rows.find(c => c.demo) ?? rows[0] ?? null;
}

export async function demoUsers(companyId: string) {
  const db = await getDb();
  return db
    .select({ id: user.id, email: user.email, firstName: user.firstName, role: user.role })
    .from(user)
    .where(and(eq(user.companyId, companyId), eq(user.active, true)));
}

/** Signs this browser in as the brand's Pronari or Zyra (FIXTURE_PASSWORD). Demo mode only. */
export async function signInDemo(
  role: 'owner' | 'office',
  slug: string | undefined,
): Promise<boolean> {
  if (!isDemoMode()) return false;
  const c = await demoCompanyFor(slug);
  if (!c) return false;
  const u = (await demoUsers(c.id)).find(x => x.role === role);
  if (!u) return false;
  const auth = await getAuth();
  await auth.api.signInEmail({
    body: { email: u.email, password: process.env.FIXTURE_PASSWORD ?? '' },
    headers: await headers(),
  });
  (await cookies()).set(BRAND_COOKIE, c.brandSlug, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return true;
}

/** "Rivendos demon": every demo brand back to its starting point, and today's date in this browser. */
export async function resetDemo(first?: string) {
  if (!isDemoMode()) throw new Error('demo mode is off');
  const db = await getDb();
  const summary = await loadDemo(db, { password: process.env.FIXTURE_PASSWORD ?? '', first });
  g.__otDemoFreshOn = todayIso();
  (await cookies()).delete(DEMO_DAYS_COOKIE);
  return summary;
}

const g = globalThis as unknown as { __otDemoFreshOn?: string; __otDemoReset?: Promise<void> };

/**
 * Online demo (DEMO_DAILY_RESET=true): the first request of a new day reseeds the demo data, so
 * "tomorrow's installation" is always tomorrow and the QR made on the laptop today matches.
 * Only data seeded by the demo is refreshed; the small test fixtures are never touched.
 */
export async function ensureFreshDemo(): Promise<void> {
  if (!isDemoMode() || process.env.DEMO_DAILY_RESET !== 'true') return;
  const today = todayIso();
  if (g.__otDemoFreshOn === today) return;
  g.__otDemoReset ??= (async () => {
    const db = await getDb();
    const rows = await db
      .select({ demo: company.demo })
      .from(company)
      .where(isNotNull(company.demo));
    if (rows.some(r => r.demo!.seededOn !== today))
      await loadDemo(db, {
        password: process.env.FIXTURE_PASSWORD ?? '',
        first: process.env.BRAND,
        onlyIfStale: true,
      });
    g.__otDemoFreshOn = today;
  })().finally(() => {
    g.__otDemoReset = undefined;
  });
  await g.__otDemoReset;
}

/** The meeting number, or null. Demo mode only. */
export async function demoPhone(): Promise<string | null> {
  if (!isDemoMode()) return null;
  const v = (await cookies()).get(DEMO_PHONE_COOKIE)?.value;
  return v && /^\+\d{8,15}$/.test(v) ? v : null;
}

export function parseDemoPhone(cc: string, raw: string): string | null {
  return toE164(cc, raw);
}
