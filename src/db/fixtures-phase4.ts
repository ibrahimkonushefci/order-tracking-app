/**
 * Phase 4 fixtures (PHASES.md "Test fixtures"), on top of Phase 3. All fictional, dated
 * relative to `today`:
 *  - visits today, tomorrow, and one from yesterday not marked done (Granit Morina);
 *  - a 7-day spread for the three installers: on the coming Friday Driton has 2 jobs,
 *    Besnik 1 and Faton is free;
 *  - Liridona Shala (German) with a deposit message and a replaced tracking link;
 *  - reminder history: Valon Hoxha 20 days ago (the green "Kujtesë" shows again),
 *    Blerim Hasani 3 days ago (no green button for 4 more days).
 *
 *  2026-012  Granit Morina    new; measurement yesterday, not marked done (Faton)
 *  2026-013  Rinor Sopi       new; measurement today, paradite (Faton)
 *  2026-014  Dardan Hoti      active; installation on Friday, paradite (Driton), collect 2,200€
 *  2026-015  Blerta Kelmendi  active; delivery later this week (Faton)
 */
import { and, eq } from 'drizzle-orm';
import { addDays, weekday } from '../lib/dates';
import { client, company, history, message, openingBalance, orders, payment, visit } from './schema';
import type { Db } from './connect';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Installers = Record<'Driton' | 'Faton' | 'Besnik', string>;

const eur = (n: number) => Math.round(n * 100);

/** The coming Friday inside the 7-day window when possible (tomorrow at the earliest). */
export function comingFriday(today: string): string {
  for (let i = 1; i <= 7; i++) if (weekday(addDays(today, i)) === 5) return addDays(today, i);
  return addDays(today, 7);
}

export async function loadPhase4(
  tx: Tx,
  ctx: { companyId: string; users: Record<'owner' | 'office', string>; installers: Installers; today: string },
) {
  const { companyId, users, installers: I, today } = ctx;
  const d = (n: number) => addDays(today, n);
  const at = (iso: string, hm = '10:00') => new Date(`${iso}T${hm}:00+02:00`);
  let tick = 0;
  const hist = (recordType: 'order' | 'opening', recordId: string, when: string, by: 'owner' | 'office', text: string, hm = '10:00') =>
    tx.insert(history).values({ companyId, recordType, recordId, userId: users[by], at: new Date(at(when, hm).getTime() + ++tick * 1000), text });
  const token = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  const dmy = (iso: string) => iso.split('-').reverse().join('.');

  const [c0] = await tx.select().from(company).where(eq(company.id, companyId));
  const year = Number(today.slice(0, 4));
  let seq = c0.orderSeq;

  async function byClient(name: string) {
    const [row] = await tx
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(client, eq(client.id, orders.clientId))
      .where(and(eq(orders.companyId, companyId), eq(client.name, name)));
    return row.id;
  }

  async function newOrder(name: string, phone: string, o: Partial<typeof orders.$inferInsert> & { productType: string; price: number; created: number }, extra: Partial<typeof client.$inferInsert> = {}) {
    const [c] = await tx.insert(client).values({ companyId, name, phone, ...extra }).returning();
    const { created, ...rest } = o;
    const number = `${year}-${String(++seq).padStart(3, '0')}`;
    const [row] = await tx
      .insert(orders)
      .values({ companyId, number, clientId: c.id, city: 'Prishtinë', trackingToken: token(), createdBy: users.office, createdAt: at(d(created), '09:30'), ...rest })
      .returning();
    await hist('order', row.id, d(created), 'office', `Porosia u krijua · ${(o.price / 100).toLocaleString('en-US')}€`, '09:30');
    return row.id;
  }

  const timeWord = (t: string | null) => (t === 'morning' ? ' · paradite' : t === 'afternoon' ? ' · pasdite' : t ? ` · ${t}` : '');
  const VISIT = { measure: 'Matje', install: 'Montim', delivery: 'Dërgesë', repair: 'Riparim' } as const;
  const NAME = Object.fromEntries(Object.entries(I).map(([k, v]) => [v, k]));
  async function plan(orderId: string, type: keyof typeof VISIT, date: string, time: string | null, installerId: string | null, note = '', plannedOn = -2) {
    const [v] = await tx.insert(visit).values({ companyId, orderId, type, date, time, installerId, note }).returning();
    await hist('order', orderId, d(plannedOn), 'office', `Vizitë e planifikuar: ${VISIT[type]} · ${dmy(date)}${timeWord(time)} · ${installerId ? NAME[installerId] : 'Pa montues'}`, '12:00');
    return v.id;
  }

  const friday = comingFriday(today);
  const tomorrowIsFriday = friday === d(1);

  /* New orders for the week. */
  const granit = await newOrder('Granit Morina', '+38344733120', { productType: 'Garderobë', description: 'Garderobë me dyer rrëshqitëse, dhoma e gjumit', price: eur(1600), city: 'Fushë Kosovë', directions: 'Rr. Nëna Terezë 41, pas pompës së benzinës. Zilja e dytë.', created: -6 });
  const rinor = await newOrder('Rinor Sopi', '+38349502771', { productType: 'Kuzhinë', description: 'Kuzhinë në kënd, banesë e re', price: eur(4200), city: 'Prishtinë', directions: 'Lagjja Dardania, Rr. Bajram Kelmendi 8, kati 5, banesa 17.', created: -2 });
  const dardan = await newOrder('Dardan Hoti', '+38344118905', { productType: 'Kuzhinë', description: 'Kuzhinë e drejtë 3 m, fronte gri mat', price: eur(3200), stage: 'active', city: 'Ferizaj', directions: 'Fshati Talinoc i Muhaxherëve: te xhamia, majtas 300 m, shtëpia me çati të kuqe. https://maps.app.goo.gl/talinoc-demo', created: -25 });
  await tx.insert(payment).values({ companyId, orderId: dardan, amount: eur(1000), date: d(-25), method: 'cash', createdBy: users.office, createdAt: at(d(-25), '11:00') });
  await hist('order', dardan, d(-25), 'office', 'Avans 1,000€ (kesh) · në zyrë', '11:00');
  await hist('order', dardan, d(-10), 'office', 'Faza: E re → Në punë');
  const blerta = await newOrder('Blerta Kelmendi', '+38345390442', { productType: 'Dollap banjoje', description: 'Dollap banjoje i varur, 80 cm', price: eur(480), stage: 'active', city: 'Prishtinë', directions: 'Rr. Agim Ramadani 17, hyrja B, kati 2.', created: -9 });
  await hist('order', blerta, d(-4), 'office', 'Faza: E re → Në punë');

  const naim = await byClient('Naim Berisha');
  const liridona = await byClient('Liridona Shala');
  const rugova = await byClient('Ndërtimi Rugova sh.p.k.');
  const arta = await byClient('Arta Krasniqi');
  const mimoza = await byClient('Mimoza Rexhepi');
  const arberia = await byClient('Arbëria Invest sh.p.k.');
  const valon = await byClient('Valon Hoxha');

  /* Yesterday, not marked done. */
  await plan(granit, 'measure', d(-1), 'afternoon', I.Faton, '', -5);
  /* Today. */
  await plan(rinor, 'measure', today, 'morning', I.Faton, 'Klienti pret te hyrja', -2);
  await plan(naim, 'install', today, 'afternoon', I.Besnik, 'Merrni silikon të bardhë', -4);
  /* Tomorrow: the diaspora client's installation and a project part. */
  await plan(liridona, 'install', d(1), 'morning', I.Driton, '', -3);
  const rv = await plan(rugova, 'install', d(1), '08:30', I.Besnik, 'Kati 2: 3 garderoba', -3);
  await tx.update(visit).set({ lastSentAt: at(d(-1), '19:10') }).where(eq(visit.id, rv));
  await tx.insert(message).values({ companyId, orderId: rugova, recipient: 'installer', installerId: I.Besnik, type: 'job', channel: 'viber', text: 'Montim · Kati 2: 3 garderoba', sentBy: users.office, sentAt: at(d(-1), '19:10') });
  await hist('order', rugova, d(-1), 'office', `Detajet: Montim ${dmy(d(1))} u dërguan te Besnik (Viber)`, '19:10');
  /* The coming Friday: Driton 2 jobs, Besnik 1, Faton free. */
  if (!tomorrowIsFriday) await plan(dardan, 'install', friday, 'morning', I.Driton, '', -2);
  await plan(arta, 'measure', friday, 'afternoon', I.Driton, '', -1);
  if (!tomorrowIsFriday) await plan(mimoza, 'repair', friday, 'morning', I.Besnik, 'Dera e dollapit të sipërm', -2);
  /* The rest of the week. */
  const free = [2, 3, 4, 5, 6].map(d).filter(x => x !== friday);
  await plan(arberia, 'install', free[0], 'morning', I.Besnik, 'Lamela B, kati 5: 2 banesa', -2);
  await plan(blerta, 'delivery', free[1], 'afternoon', I.Faton, '', -2);
  if (tomorrowIsFriday) await plan(dardan, 'install', free[2], 'morning', I.Driton, '', -2);

  /* Liridona (German): deposit message sent; the link went to a wrong number and was replaced. */
  await tx.insert(message).values({
    companyId,
    orderId: liridona,
    recipient: 'client',
    type: 'deposit',
    channel: 'whatsapp',
    language: 'de',
    text: 'Guten Tag Liridona, vielen Dank für Ihre Anzahlung von 1,500€.',
    sentBy: users.office,
    sentAt: at(d(-20), '10:20'),
  });
  await hist('order', liridona, d(-20), 'office', 'Mesazh WhatsApp: Avansi u pranua → Liridona', '10:20');
  await tx.update(orders).set({ trackingToken: token() }).where(eq(orders.id, liridona));
  await hist('order', liridona, d(-19), 'office', 'U krijua link i ri për klientin; linku i vjetër nuk hapet më', '09:05');

  /* Reminder history. */
  await tx.insert(message).values({ companyId, orderId: valon, recipient: 'client', type: 'reminder', channel: 'whatsapp', text: 'Përshëndetje Valon, …', sentBy: users.office, sentAt: at(d(-20), '18:00') });
  await hist('order', valon, d(-20), 'office', 'Mesazh WhatsApp: Kujtesë për pagesë → Valon', '18:00');
  const [blerim] = await tx.select().from(openingBalance).where(and(eq(openingBalance.companyId, companyId), eq(openingBalance.name, 'Blerim Hasani')));
  await tx.insert(message).values({ companyId, openingId: blerim.id, recipient: 'client', type: 'reminder', channel: 'whatsapp', text: 'Përshëndetje Blerim, …', sentBy: users.owner, sentAt: at(d(-3), '17:30') });
  await hist('opening', blerim.id, d(-3), 'owner', 'Mesazh WhatsApp: Kujtesë për pagesë → Blerim', '17:30');

  await tx.update(company).set({ orderSeqYear: year, orderSeq: seq }).where(eq(company.id, companyId));
}
