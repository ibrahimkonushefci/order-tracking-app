import 'server-only';
import { cookies } from 'next/headers';
import { isDemoMode } from '@/brand/active';
import { addDays, todayIso } from '@/lib/dates';

/** Demo date control ("jump forward X days"): a per-browser cookie, honoured only in demo mode. */
export const DEMO_DAYS_COOKIE = 'ot-demo-days';

export async function demoOffset(): Promise<number> {
  if (!isDemoMode()) return 0;
  const n = Number((await cookies()).get(DEMO_DAYS_COOKIE)?.value ?? 0);
  return Number.isInteger(n) && n > 0 && n <= 365 ? n : 0;
}

/** "Today" for every screen and action: Kosovo's date, shifted by the demo offset. */
export async function appToday(): Promise<string> {
  const n = await demoOffset();
  return n ? addDays(todayIso(), n) : todayIso();
}

/**
 * "Now" for timestamps that the app compares with `appToday()`: a message's sentAt and a
 * visit's "dërguar". Shifted by the same demo offset, so a reminder logged on the demo date
 * counts as sent that day. The history keeps the real time.
 */
export async function appNow(): Promise<Date> {
  const n = await demoOffset();
  return new Date(Date.now() + n * 864e5);
}
