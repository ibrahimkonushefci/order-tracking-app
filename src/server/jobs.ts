import 'server-only';
import { headers } from 'next/headers';
import { allJobs, type VisitOrder } from '@/domain/visits';
import type { JobLite } from '@/components/sheets/visit';
import { addDays } from '@/lib/dates';
import { publicBase } from './demo';

/** Every visit from two weeks back to two months ahead, small enough to send to the visit sheet for live load. */
export function jobLites(orders: (VisitOrder & { client: { name: string } })[], today: string): JobLite[] {
  const from = addDays(today, -14);
  const to = addDays(today, 62);
  return allJobs(orders)
    .filter(x => x.v.date >= from && x.v.date <= to)
    .map(({ o, v }) => ({ id: v.id, installerId: v.installerId, date: v.date, time: v.time, type: v.type, client: o.client.name, city: o.city }));
}

/**
 * The public address of the tracking page: APP_URL when set (deployments); in demo mode on the
 * laptop, DEMO_PUBLIC_URL (the online demo, so a phone can open it); otherwise this request's host.
 */
export async function trackingUrl(token: string): Promise<string> {
  const base = publicBase();
  if (base) return `${base}/t/${token}`;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3100';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}/t/${token}`;
}
