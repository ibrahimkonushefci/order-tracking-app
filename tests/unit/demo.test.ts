/**
 * Phase 5 demo dataset (spec "Demo mode & seed data"): every business type, loaded into an
 * in-memory Postgres and read back through the same domain rules the screens use.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDb, type Db } from '@/db/connect';
import { runMigrations } from '@/db/migrate';
import { loadDemo, demoEmail, type DemoSummary } from '@/db/demo/load';
import { demoToken } from '@/db/demo/seed';
import { CATALOGS } from '@/db/demo/catalog';
import { company, history, user } from '@/db/schema';
import { loadBook } from '@/services/book';
import { BUSINESS_TYPES, brandSchema, type Brand } from '@/brand/schema';
import { cashWithInstallers, debts, groupDebts, sumOf } from '@/domain/debts';
import { allJobs, jobsOf, nextVisit } from '@/domain/visits';
import { installedQty, orderTotals } from '@/domain/balances';
import { addDays, weekday } from '@/lib/dates';

const TODAY = '2026-10-20'; // a Tuesday
let db: Db;
let summary: DemoSummary[];

const brandFor = (type: Brand['businessType'], n: number): { slug: string; brand: Brand } => {
  const slug = `demo-${type.replace('_', '-')}`;
  return {
    slug,
    brand: brandSchema.parse({
      schemaVersion: 2,
      slug,
      companyName: `Demo ${n}`,
      shortName: `D${n}`,
      logo: { src: 'none' },
      colors: { primary: '#365C50', accent: '#B99A70', background: '#FFFFFF', text: '#1A1A1A' },
      contact: { phone: '+38344123456', city: n % 2 ? 'Prizren' : 'Prishtinë' },
      businessType: type,
      depositWord: n % 2 ? 'Kapar' : 'Avans',
      demo: true,
    }),
  };
};

beforeAll(async () => {
  db = await createDb('memory://');
  await runMigrations(db, 'memory://');
  summary = await loadDemo(db, {
    password: 'test-password-1',
    today: TODAY,
    brands: BUSINESS_TYPES.map(brandFor),
  });
}, 120_000);

const bookOf = (i: number) => loadBook(db, summary[i].companyId);
const keysOf = async (i: number) =>
  (await db.select().from(company).where(eq(company.id, summary[i].companyId)))[0].demo!;

describe('demo seed: the size the spec asks for', () => {
  it.each(BUSINESS_TYPES.map((t, i) => [t, i] as const))(
    '%s: ~50 clients (~10 abroad), ~60 orders, ~8 opening balances',
    async (_t, i) => {
      const b = await bookOf(i);
      expect(b.clients.length).toBeGreaterThanOrEqual(45);
      expect(b.clients.length).toBeLessThanOrEqual(60);
      expect(b.clients.filter(c => !c.phone.startsWith('+383')).length).toBeGreaterThanOrEqual(10);
      expect(b.orders.length).toBeGreaterThanOrEqual(55);
      expect(b.openings.length).toBe(8);
      for (const s of ['new', 'active', 'done'] as const)
        expect(b.orders.filter(o => o.stage === s).length).toBeGreaterThan(5);
      const villages = b.orders.filter(o =>
        /^(Fshati |Shtëpia e |[A-ZËÇ][\wëç ]+: )/u.test(o.directions),
      ).length;
      expect(villages / b.orders.length).toBeGreaterThan(0.3);
      expect(new Set(b.orders.map(o => o.number)).size).toBe(b.orders.length);
    },
  );

  it.each(BUSINESS_TYPES.map((t, i) => [t, i] as const))(
    '%s: €15–30k outstanding, some overdue, some unknown due date',
    async (_t, i) => {
      const b = await bookOf(i);
      const rows = debts(b.orders, b.openings, TODAY);
      const g = groupDebts(rows);
      expect(sumOf(rows)).toBeGreaterThanOrEqual(15_000_00);
      expect(sumOf(rows)).toBeLessThanOrEqual(30_000_00);
      expect(g.overdue.length).toBeGreaterThanOrEqual(6);
      expect(g.unknown.length).toBeGreaterThanOrEqual(2);
      expect(g.upcoming.length).toBeGreaterThanOrEqual(2);
      expect(rows.filter(r => r.rem.ok).length).toBeGreaterThanOrEqual(3); // green "Kujtesë"
    },
  );

  it('uses the business type wording and the deposit word', async () => {
    for (const [i, t] of BUSINESS_TYPES.entries()) {
      const b = await bookOf(i);
      expect(b.orders.some(o => o.productType === CATALOGS[t].main.type)).toBe(true);
      const word = i % 2 ? 'Kapar' : 'Avans';
      const lines = await db
        .select()
        .from(history)
        .where(eq(history.companyId, summary[i].companyId));
      expect(lines.some(l => l.text.startsWith(`${word} €`))).toBe(true);
    }
  });
});

describe('demo seed: the key cases', () => {
  it('the €800 case is live: installation today with Driton, €800 left, nothing recorded yet', async () => {
    for (const i of BUSINESS_TYPES.keys()) {
      const b = await bookOf(i);
      const k = await keysOf(i);
      const o = b.orders.find(x => x.id === k.keys.k800)!;
      expect(o.client.name).toBe('Fatmir Krasniqi');
      expect(o.stage).toBe('active');
      const t = orderTotals(o);
      expect(o.price - t.paid).toBe(800_00);
      const v = o.visits.find(x => x.id === k.keys.k800Visit)!;
      expect([v.type, v.date, v.time, v.doneAt]).toEqual(['install', TODAY, 'morning', null]);
      expect(b.installers.find(x => x.id === v.installerId)?.name).toBe('Driton');
      expect(o.directions).toMatch(/^Fshati Orllan/);
    }
  });

  it('Driton tomorrow: Besa (installation, paradite) and Rinor (measurement); the tracking order shows it', async () => {
    const b = await bookOf(0);
    const k = await keysOf(0);
    const driton = b.installers.find(i => i.name === 'Driton')!;
    const tomorrow = addDays(TODAY, 1);
    const jobs = b.orders.flatMap(o =>
      o.visits
        .filter(v => v.date === tomorrow && v.installerId === driton.id)
        .map(v => [o.client.name, v.type, v.time]),
    );
    expect(jobs.sort()).toEqual([
      ['Besa Zeka', 'install', 'morning'],
      ['Rinor Avdiu', 'measure', 'afternoon'],
    ]);
    const track = b.orders.find(o => o.id === k.keys.track)!;
    expect(track.trackingToken).toBe(demoToken(summary[0].slug, 'track'));
    expect(nextVisit(track.visits, TODAY)?.date).toBe(tomorrow);
  });

  it('Besa is a returning client: her first order, five months ago, is done and paid', async () => {
    const b = await bookOf(0);
    const k = await keysOf(0);
    const besa = b.orders.filter(o => o.client.name === 'Besa Zeka');
    expect(besa).toHaveLength(2);
    expect(new Set(besa.map(o => o.clientId)).size).toBe(1);
    const first = besa.find(o => o.id !== k.keys.track)!;
    expect(first.stage).toBe('done');
    expect(orderTotals(first).remaining).toBe(0);
  });

  it('the busy day: Driton 2 jobs, Besnik 1, Faton free', async () => {
    const b = await bookOf(0);
    const k = await keysOf(0);
    const day = k.keys.busyDay;
    expect(weekday(day)).toBe(5); // TODAY is a Tuesday → this Friday
    const load = (name: string) =>
      jobsOf(allJobs(b.orders), b.installers.find(i => i.name === name)!.id, day).length;
    expect([load('Driton'), load('Besnik'), load('Faton')]).toEqual([2, 1, 0]);
  });

  it('projects: one owes money and is late, one is paid ahead, one only has the deposit', async () => {
    for (const i of BUSINESS_TYPES.keys()) {
      const b = await bookOf(i);
      const k = await keysOf(i);
      const [p1, p2, p3] = ['project', 'ahead', 'project3'].map(key =>
        b.orders.find(o => o.id === k.keys[key])!,
      );
      const rows = debts(b.orders, b.openings, TODAY);
      const r1 = rows.find(r => r.id === p1.id)!;
      expect(r1.overdue).toBe(true);
      expect(installedQty(p1)).toBeLessThan(p1.quantity!);
      const t2 = orderTotals(p2);
      expect(t2.owed).toBe(0);
      expect(t2.paidAhead).toBeGreaterThan(0);
      expect(p3.stage).toBe('new');
      expect(orderTotals(p3).owed).toBe(0);
    }
  });

  it('cash with installers: one for weeks (Besnik €350), one exactly the balance (Faton)', async () => {
    const b = await bookOf(0);
    const cash = cashWithInstallers(b.orders, b.openings, b.installers, TODAY);
    const besnik = cash.find(g => g.name === 'Besnik')!;
    expect(besnik.items.map(x => [x.name, x.payment.amount, x.days])).toEqual([
      ['Lindita Bytyqi', 350_00, 23],
    ]);
    const faton = cash.find(g => g.name === 'Faton')!;
    expect(faton.items).toHaveLength(1);
    const arbnor = b.orders.find(o => o.client.name === 'Arbnor Hajdari')!;
    expect(orderTotals(arbnor).owed).toBe(0);
    // Neither customer is asked again.
    const rows = debts(b.orders, b.openings, TODAY);
    expect(rows.find(r => r.name === 'Lindita Bytyqi')).toBeUndefined();
  });

  it('reminder history, pauses, "Mos sugjero", remaining work, edits and deletes', async () => {
    const b = await bookOf(0);
    const rows = debts(b.orders, b.openings, TODAY);
    const by = (name: string) => rows.find(r => r.name === name)!;
    expect(by('Shpend Berisha').rem.ok).toBe(true); // last sent 20 days ago
    expect(by('Valbona Gashi').rem.ok).toBe(false); // 3 days ago
    expect(by('Bekim Rexhepi').rem.ok).toBe(false); // cousin
    expect(by('Mimoza Hoxha').contexts.some(c => c.kind === 'paused')).toBe(true);
    expect(by('Flamur Ajeti').contexts.some(c => c.kind === 'paused')).toBe(true);
    expect(
      rows.filter(r => r.contexts.some(c => c.kind === 'remaining')).length,
    ).toBeGreaterThanOrEqual(2);
    expect(by('Shqipe Ramadani').unknownDue).toBe(true);
    const naim = b.orders.find(o => o.client.name === 'Naim Kelmendi')!;
    expect(naim.payments.filter(p => p.deletedAt)).toHaveLength(1);
    const lines = await db
      .select()
      .from(history)
      .where(eq(history.companyId, summary[0].companyId));
    expect(lines.some(l => l.text.startsWith('Pagesa u ndryshua:'))).toBe(true);
    expect(lines.some(l => l.text.startsWith('Çmimi:'))).toBe(true);
  });

  it('demo logins per brand, and tokens that match between two seeds', async () => {
    const users = await db.select().from(user);
    expect(users.map(u => u.email).sort()).toEqual(
      summary.flatMap(s => [demoEmail(s.slug, 'owner'), demoEmail(s.slug, 'office')]).sort(),
    );
    const before = (await bookOf(0)).orders.map(o => o.trackingToken).sort();
    const again = await loadDemo(db, {
      password: 'test-password-1',
      today: TODAY,
      brands: BUSINESS_TYPES.map(brandFor),
    });
    summary = again;
    expect((await bookOf(0)).orders.map(o => o.trackingToken).sort()).toEqual(before);
  });
});
