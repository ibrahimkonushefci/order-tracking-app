/**
 * Phase 4: visits, installer load, prepared messages, the reminder rule, the tracking page
 * rules, and the services behind them, on the Phase 4 fixtures (in-memory Postgres).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDb, type Db } from '@/db/connect';
import { runMigrations } from '@/db/migrate';
import { loadFixtures } from '@/db/fixtures';
import { comingFriday } from '@/db/fixtures-phase4';
import { company, history, installer, message, orders, user, visit } from '@/db/schema';
import { orderTotals, installedQty } from '@/domain/balances';
import { debts, lastReminder, reminderCheck } from '@/domain/debts';
import { fill, installerDayText, installerJobText, openingMessage, orderMessage, sendHref, templatesFor, type Sender } from '@/domain/messages';
import { headlineKey, trackingSteps, warmDate } from '@/domain/tracking';
import { allJobs, availability, dative, installerSummary, jobsOf, pastUndone } from '@/domain/visits';
import { activePayments } from '@/domain/balances';
import { loadBook, loadHistory, loadOrder, type Book } from '@/services/book';
import { FieldError, FieldErrors, type Actor } from '@/services/common';
import { completeVisit, editDoneVisit, removeVisit, reopenVisit, repairCleared, saveVisit } from '@/services/visits';
import { editPart, partsFromVisits, pauseOrder, reopenPart, setRemainingWork } from '@/services/orders';
import { logCustomerMessage, logInstallerMessage, newTrackingLink, saveInstaller, saveTemplates, setClientContact } from '@/services/messages';
import { ForbiddenError } from '@/auth/permissions';
import { addDays } from '@/lib/dates';

const TODAY = '2026-10-19'; // a Monday: the coming Friday is 23.10
const d = (n: number) => addDays(TODAY, n);
let db: Db;
let owner: Actor;
let office: Actor;
let I: Record<string, string>;
const book = () => loadBook(db, owner.companyId);
const byName = (b: Book, name: string) => b.orders.find(o => o.client.name === name)!;
const err = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) => (e instanceof FieldError ? e.key : e instanceof FieldErrors ? e.errors.map(x => x.key).join(',') : e instanceof ForbiddenError ? 'forbidden' : String(e)),
  );
const S: Sender = { staffName: 'Teuta', companyName: 'Druri Design', companyPhone: '+38344123456', reviewUrl: 'https://g.page/r/druri', depositWord: 'Avans' };

beforeEach(async () => {
  db ??= await createDb('memory://').then(async x => (await runMigrations(x, 'memory://'), x));
  await loadFixtures(db, { password: 'test-password-1', brandSlug: 'druri-design', today: TODAY });
  const users = await db.select().from(user);
  const [c] = await db.select().from(company);
  const actor = (role: 'owner' | 'office'): Actor => {
    const u = users.find(x => x.role === role)!;
    return { id: u.id, role, companyId: c.id, firstName: u.firstName };
  };
  owner = actor('owner');
  office = actor('office');
  I = Object.fromEntries((await db.select().from(installer)).map(i => [i.name, i.id]));
}, 60_000);

describe('Phase 4 fixtures', () => {
  it('visits today, tomorrow and yesterday; on the coming Friday Driton has 2 jobs, Besnik 1, Faton is free', async () => {
    const b = await book();
    const jobs = allJobs(b.orders);
    expect(comingFriday(TODAY)).toBe('2026-10-23');
    expect(jobsOf(jobs, I.Driton, '2026-10-23')).toHaveLength(2);
    expect(jobsOf(jobs, I.Besnik, '2026-10-23')).toHaveLength(1);
    expect(jobsOf(jobs, I.Faton, '2026-10-23')).toHaveLength(0);
    expect(pastUndone(jobs, TODAY).map(x => x.o.client.name)).toEqual(['Granit Morina']);
    expect(jobs.filter(x => x.v.date === TODAY).length).toBeGreaterThanOrEqual(2);
    expect(jobs.filter(x => x.v.date === d(1)).map(x => x.o.client.name).sort()).toEqual(['Liridona Shala', 'Ndërtimi Rugova sh.p.k.']);
  });

  it('comingFriday stays inside the 7-day window except on a Friday', () => {
    expect(comingFriday('2026-10-22')).toBe('2026-10-23'); // Thursday → tomorrow
    expect(comingFriday('2026-10-23')).toBe('2026-10-30'); // Friday → next week
    expect(comingFriday('2026-10-24')).toBe('2026-10-30');
  });
});

describe('installer load ("Punët e montuesve")', () => {
  it('counts planned and done visits per day, without the visit being edited', async () => {
    const b = await book();
    const jobs = allJobs(b.orders);
    // Fatmir's installation today is done and still counts for Driton.
    expect(jobsOf(jobs, I.Driton, TODAY)).toHaveLength(1);
    const friday = jobsOf(jobs, I.Driton, '2026-10-23');
    expect(jobsOf(jobs, I.Driton, '2026-10-23', friday[0].v.id)).toHaveLength(1);
    const grid = availability(jobs, [I.Driton, I.Faton, I.Besnik], TODAY);
    expect(grid.dates).toHaveLength(7);
    expect(grid.rows[0].counts[4]).toBe(2);
    expect(grid.rows[1].counts[4]).toBe(0);
  });

  it('the per-installer summary: Në pritje, Të kryera (with project units), Para në dorë', async () => {
    const b = await book();
    const jobs = allJobs(b.orders);
    const pays = activePayments([...b.orders.flatMap(o => o.payments), ...b.openings.flatMap(o => o.payments)]);
    const dr = installerSummary(jobs, I.Driton, pays, TODAY);
    expect(dr.held).toBe(80000);
    expect(dr.units).toEqual({ banesa: 9 });
    expect(dr.done.install).toBe(3);
    expect(dr.upcoming).toHaveLength(3);
    const fa = installerSummary(jobs, I.Faton, pays, TODAY);
    expect(fa.held).toBe(75000);
    expect(fa.unmarked.map(x => x.o.client.name)).toEqual(['Granit Morina']);
  });

  it('Albanian name forms', () => {
    expect(['Driton', 'Besnik', 'Besa', 'Arta', 'Ilir'].map(dative)).toEqual(['Dritonit', 'Besnikut', 'Besës', 'Artës', 'Ilirit']);
  });
});

describe('the green "Kujtesë" rule', () => {
  const t = { owed: 10000, dueDate: d(-5) };
  const r = (extra: Partial<{ pausedUntil: string | null; messages: { type: string; channel: 'whatsapp'; sentAt: string }[] }> = {}) => ({ pausedUntil: null, messages: [], ...extra });
  it('overdue, not paused, not "Mos sugjero", nothing in the last 7 days', () => {
    expect(reminderCheck(t, r(), false, TODAY)).toMatchObject({ ok: true, late: 5 });
    expect(reminderCheck({ owed: 0, dueDate: d(-5) }, r(), false, TODAY)).toMatchObject({ ok: false, reason: 'noDebt' });
    expect(reminderCheck({ owed: 1, dueDate: null }, r(), false, TODAY)).toMatchObject({ ok: false, reason: 'unknownDue' });
    expect(reminderCheck({ owed: 1, dueDate: TODAY }, r(), false, TODAY)).toMatchObject({ ok: false, reason: 'notDue' });
    expect(reminderCheck(t, r({ pausedUntil: d(3) }), false, TODAY)).toMatchObject({ ok: false, reason: 'paused' });
    expect(reminderCheck(t, r({ pausedUntil: d(-1) }), false, TODAY)).toMatchObject({ ok: true });
    expect(reminderCheck(t, r(), true, TODAY)).toMatchObject({ ok: false, reason: 'noReminders' });
    expect(reminderCheck(t, r({ messages: [{ type: 'reminder', channel: 'whatsapp', sentAt: `${d(-6)}T10:00:00Z` }] }), false, TODAY)).toMatchObject({ ok: false, reason: 'recent' });
    expect(reminderCheck(t, r({ messages: [{ type: 'reminder', channel: 'whatsapp', sentAt: `${d(-7)}T10:00:00Z` }] }), false, TODAY)).toMatchObject({ ok: true });
    // Another message type doesn't count as a reminder.
    expect(reminderCheck(t, r({ messages: [{ type: 'link', channel: 'whatsapp', sentAt: `${d(-1)}T10:00:00Z` }] }), false, TODAY)).toMatchObject({ ok: true });
  });

  it('on the fixtures: Valon (20 days ago) yes, Blerim (3 days ago) no; later days change it', async () => {
    const b = await book();
    const rows = debts(b.orders, b.openings, TODAY);
    const ok = (name: string, today = TODAY) => debts(b.orders, b.openings, today).find(x => x.name === name)!.rem.ok;
    expect(ok('Valon Hoxha')).toBe(true);
    expect(ok('Blerim Hasani')).toBe(false);
    expect(ok('Ilir Gashi')).toBe(false);
    expect(ok('Mimoza Rexhepi')).toBe(false);
    expect(rows.find(x => x.name === 'Shpresa Leka')!.rem).toMatchObject({ ok: false, reason: 'unknownDue' });
    // Four days later Blerim's last reminder is 7 days old.
    expect(ok('Blerim Hasani', d(4))).toBe(true);
    // Dritë is due in 4 days: no reminder today, one after the due date.
    expect(ok('Dritë Hyseni')).toBe(false);
    expect(ok('Dritë Hyseni', d(5))).toBe(true);
  });
});

describe('prepared messages', () => {
  it('fill: an empty variable leaves no stray comma, colon or brackets', () => {
    expect(fill('Vijmë {date}, {time}. Faleminderit!', { date: 'nesër', time: '' })).toBe('Vijmë nesër. Faleminderit!');
    expect(fill('Na ndihmon:\n{reviewLink}\n\nTeuta', { reviewLink: '' })).toBe('Na ndihmon.\n\nTeuta');
    expect(fill('Porosia ({product}) u regjistrua', { product: '' })).toBe('Porosia u regjistrua');
    expect(fill('Përshëndetje {customerName},\n\nTeuta', { customerName: 'Besa' })).toBe('Përshëndetje Besa,\n\nTeuta');
  });

  it('a first reminder is polite, later ones gentler; in the client language; signed by the staff member', async () => {
    const b = await book();
    const ab = byName(b, 'Arbëria Invest sh.p.k.');
    const first = orderMessage('reminder', ab, 'sq', 'https://x/t/1', S, TODAY);
    expect(first).toContain('Përshëndetje Arbëria Invest,');
    expect(first).toContain('për 18 banesa të montuara deri tani ka mbetur për t’u paguar 10,800€');
    expect(first.endsWith('Teuta, Druri Design')).toBe(true);
    const valon = byName(b, 'Valon Hoxha');
    expect(orderMessage('reminder', valon, 'sq', '', S, TODAY)).toContain('vetëm një kujtesë e vogël për 1,200€');
    expect(orderMessage('reminder', valon, 'en', '', S, TODAY)).toContain('just a small reminder about the 1,200€ still open for order 2026-002');
    expect(orderMessage('reminder', ab, 'de', '', S, TODAY)).toContain('für die bisher montierten 18 Wohnungen noch 10,800€ offen');
    const blerim = b.openings.find(x => x.name === 'Blerim Hasani')!;
    expect(openingMessage('reminder', blerim, 45000, 'sq', S)).toContain('vetëm një kujtesë e vogël për 450€ që ka mbetur për Garderobë, 2024');
  });

  it('the visit and link templates carry the next visit and the tracking link', async () => {
    const b = await book();
    const lir = byName(b, 'Liridona Shala');
    expect(templatesFor(lir, TODAY)).toEqual(['visit', 'deposit', 'link', 'free']);
    const de = orderMessage('visit', lir, 'de', 'https://example.test/t/abc', S, TODAY);
    expect(de).toContain('unser Team kommt morgen (Dienstag, 20.10.), vormittags zur Montage');
    expect(de).toContain('https://example.test/t/abc');
    expect(orderMessage('visit', lir, 'sq', 'L', S, TODAY)).toContain('ekipi ynë vjen për montim nesër (të martën, 20.10), paradite.');
    expect(orderMessage('deposit', lir, 'en', 'L', S, TODAY)).toContain('thank you for your deposit of 1,500€');
    expect(orderMessage('thanks', byName(b, 'Dritë Hyseni'), 'sq', 'L', S, TODAY)).toContain('https://g.page/r/druri');
    expect(orderMessage('thanks', byName(b, 'Dritë Hyseni'), 'sq', 'L', { ...S, reviewUrl: '' }, TODAY)).not.toMatch(/:\s*\n\s*\n/);
  });

  it('installer messages: one job and one installer’s day, with "Mblidh", never the internal note', async () => {
    const b = await book();
    const lir = byName(b, 'Liridona Shala');
    const v = lir.visits.find(x => !x.doneAt)!;
    const job = installerJobText(lir, v, true);
    expect(job.split('\n')).toEqual([
      'Montim · E martë 20.10 · paradite',
      'Liridona Shala · +49 15 112 345678',
      'Vushtrri',
      'Prindërit e Liridonës: Rr. Skënderbeu 14, kati 2. Nëna Hava: 044 207 118',
      'Garderobë deri në tavan, 3 m',
      'Mblidh: 900€',
      'Porosia 2026-008',
    ]);
    expect(installerJobText(lir, v, false)).not.toContain('Mblidh');
    const fatmir = byName(b, 'Fatmir Krasniqi');
    expect(installerJobText(fatmir, fatmir.visits[0], true)).not.toContain('Zbritje');
    const jobs = allJobs(b.orders).filter(x => x.v.installerId === I.Driton && x.v.date === '2026-10-23');
    const day = installerDayText(jobs, '2026-10-23', TODAY, true);
    expect(day.split('\n')[0]).toBe('Punët për të premten, E premte 23.10 · 2 punë');
    expect(day).toMatch(/1\) Montim · paradite\nDardan Hoti[\s\S]*Mblidh: 2,200€[\s\S]*2\) Matje · pasdite\nArta Krasniqi/);
    expect(day).not.toMatch(/Arta[\s\S]*Mblidh/);
  });

  it('click-to-send links: WhatsApp carries the text, Viber only opens the chat, SMS is the fallback', () => {
    expect(sendHref('whatsapp', '+383 44 281 734', 'A b')).toBe('https://wa.me/38344281734?text=A%20b');
    expect(sendHref('viber', '+38344281734', 'A b')).toBe('viber://chat?number=%2B38344281734');
    expect(sendHref('sms', '+4915112345678', 'Hi')).toBe('sms:+4915112345678?body=Hi');
  });
});

describe('tracking page rules', () => {
  it('three steps by key; the last stays open while work remains', () => {
    expect(trackingSteps('new', false).map(s => s.state)).toEqual(['done', 'future', 'future']);
    expect(trackingSteps('active', false).map(s => s.state)).toEqual(['done', 'current', 'future']);
    expect(trackingSteps('done', false).map(s => s.state)).toEqual(['done', 'done', 'done']);
    expect(trackingSteps('done', true).map(s => s.state)).toEqual(['done', 'done', 'current']);
    expect(headlineKey('active', false, true)).toBe('activeProject');
    expect(headlineKey('done', true, false)).toBe('doneRemaining');
  });
  it('warm dates in the client language', () => {
    expect(warmDate(d(1), TODAY, 'sq')).toBe('Nesër · e martë, 20 tetor');
    expect(warmDate(d(1), TODAY, 'en')).toBe('Tomorrow · Tuesday, 20 October');
    expect(warmDate(d(4), TODAY, 'de')).toBe('Freitag, 23. Oktober');
  });
});

describe('visits: plan, edit, remove, "U krye"', () => {
  it('planning and editing write history; editing a sent visit clears "dërguar"', async () => {
    const naim = byName(await book(), 'Naim Berisha');
    const v = await saveVisit(db, office, naim.id, null, { type: 'repair', date: d(2), time: 'exact', exact: '09:15', installerId: I.Faton, note: 'Dera' });
    expect(v).toMatchObject({ type: 'repair', time: '09:15', installerId: I.Faton });
    await db.update(visit).set({ lastSentAt: new Date() }).where(eq(visit.id, v.id));
    const e = await saveVisit(db, office, naim.id, v.id, { type: 'repair', date: d(3), time: 'afternoon', installerId: 'none' });
    expect(e).toMatchObject({ date: d(3), time: 'afternoon', installerId: null, lastSentAt: null });
    const h = (await loadHistory(db, 'order', naim.id)).map(x => x.text);
    expect(h).toContain(`Vizita u ndryshua: Riparim · ${d(2).split('-').reverse().join('.')} · 09:15 · Faton → Riparim · ${d(3).split('-').reverse().join('.')} · pasdite · Pa montues`);
    expect(await err(saveVisit(db, office, naim.id, null, { type: 'x', date: '', time: 'exact', exact: '25:00' }))).toBe('visitTypeRequired,dateRequired,timeInvalid');
    await removeVisit(db, office, naim.id, v.id);
    expect((await loadOrder(db, owner.companyId, naim.id))!.visits.some(x => x.id === v.id)).toBe(false);
  });

  it('the 800€ call from a visit: paid in full "Te Besnik", order done, owes 0€, cash waits with the installer', async () => {
    const naim = byName(await book(), 'Naim Berisha');
    const v = naim.visits.find(x => x.date === TODAY)!;
    const r = await completeVisit(db, office, naim.id, v.id, { pay: 'all', holder: I.Besnik, close: true }, TODAY);
    expect(r).toMatchObject({ kind: 'job', left: 0, held: true });
    const o = (await loadOrder(db, owner.companyId, naim.id))!;
    expect(o.stage).toBe('done');
    expect(o.visits.find(x => x.id === v.id)!.doneAt).toBe(TODAY);
    expect(orderTotals(o)).toMatchObject({ owed: 0, held: 280000, paid: 380000, inOffice: 100000 });
    const b = await book();
    expect(debts(b.orders, b.openings, TODAY).some(x => x.id === naim.id)).toBe(false);
    expect(await err(completeVisit(db, office, naim.id, v.id, { pay: 'no' }, TODAY))).toBe('visitDone');
  });

  it('a visit done without closing the order records only the payment; part payments ask for the term', async () => {
    const naim = byName(await book(), 'Naim Berisha');
    const v = naim.visits.find(x => x.date === TODAY)!;
    expect(await err(completeVisit(db, office, naim.id, v.id, { pay: 'part', amount: '500', holder: 'office', close: true, term: 'date' }, TODAY))).toBe('dateRequired');
    await completeVisit(db, office, naim.id, v.id, { pay: 'part', amount: '500', holder: 'office', method: 'bank', close: false }, TODAY);
    const o = (await loadOrder(db, owner.companyId, naim.id))!;
    expect(o.stage).toBe('active');
    expect(orderTotals(o)).toMatchObject({ paid: 150000, owed: 0 });
  });

  it('a project visit asks "Sa u montuan?" and becomes the installed part', async () => {
    const ru = byName(await book(), 'Ndërtimi Rugova sh.p.k.');
    const v = ru.visits.find(x => !x.doneAt)!;
    expect(await err(completeVisit(db, office, ru.id, v.id, { pay: 'no', quantity: '' }, TODAY))).toBe('qtyRequired');
    const r = await completeVisit(db, office, ru.id, v.id, { pay: 'no', quantity: '3' }, TODAY);
    expect(r).toMatchObject({ kind: 'part', installed: 6 });
    const o = (await loadOrder(db, owner.companyId, ru.id))!;
    expect(o.visits.find(x => x.id === v.id)).toMatchObject({ doneAt: TODAY, quantity: 3, installerId: I.Besnik });
    expect(installedQty(o)).toBe(6);
    expect(orderTotals(o)).toMatchObject({ earned: 720000, paid: 500000, owed: 220000 });
  });

  it('a measurement and a repair are just marked done; the repair can clear "Ka punë të mbetura"', async () => {
    const b = await book();
    const granit = byName(b, 'Granit Morina');
    await completeVisit(db, office, granit.id, granit.visits[0].id, { pay: 'no', note: 'priza 2×' }, TODAY);
    const g = (await loadOrder(db, owner.companyId, granit.id))!;
    expect(g.visits[0]).toMatchObject({ doneAt: TODAY, note: 'priza 2×' });
    expect(g.stage).toBe('new');
    const mim = byName(b, 'Mimoza Rexhepi');
    const rv = mim.visits.find(x => x.type === 'repair')!;
    await completeVisit(db, office, mim.id, rv.id, { pay: 'no', finishRemaining: true }, TODAY);
    const m = (await loadOrder(db, owner.companyId, mim.id))!;
    expect(m.remainingWork).toBeNull();
    expect(m.pausedUntil).toBeNull();
  });
});

describe('"U dërgua?" logging, links, contacts, installers, templates', () => {
  it('a customer message is logged only when confirmed; the reminder button then hides for 7 days', async () => {
    const valon = byName(await book(), 'Valon Hoxha');
    await logCustomerMessage(db, office, { orderId: valon.id }, { type: 'reminder', channel: 'whatsapp', language: 'sq', text: 'Përshëndetje Valon…' });
    const b = await book();
    expect(debts(b.orders, b.openings, TODAY).find(x => x.id === valon.id)!.rem).toMatchObject({ ok: false, reason: 'recent' });
    expect((await loadHistory(db, 'order', valon.id))[0].text).toBe('Mesazh WhatsApp: Kujtesë për pagesë → Valon');
    expect(await err(logCustomerMessage(db, office, { orderId: valon.id }, { type: 'reminder', channel: 'whatsapp', language: 'sq', text: '  ' }))).toBe('messageEmpty');
  });

  it('an installer day is logged on every order; choosing another installer for one visit assigns it', async () => {
    const b = await book();
    const jobs = allJobs(b.orders).filter(x => x.v.installerId === I.Driton && x.v.date === '2026-10-23');
    await logInstallerMessage(db, office, { installerId: I.Driton, visitIds: jobs.map(x => x.v.id), mode: 'day', channel: 'whatsapp', text: 'Punët…' });
    for (const x of jobs) expect((await loadHistory(db, 'order', x.o.id))[0].text).toBe('Lista e 23.10.2026 u dërgua te Driton (WhatsApp)');
    const sent = await db.select().from(visit).where(eq(visit.installerId, I.Driton));
    expect(sent.filter(v => v.lastSentAt && v.date === '2026-10-23')).toHaveLength(2);
    const lir = byName(b, 'Liridona Shala');
    const lv = lir.visits.find(x => !x.doneAt)!;
    await logInstallerMessage(db, office, { installerId: I.Faton, visitIds: [lv.id], mode: 'visit', channel: 'viber', text: 'Montim…', assign: true });
    const [after] = await db.select().from(visit).where(eq(visit.id, lv.id));
    expect(after.installerId).toBe(I.Faton);
    const msgs = await db.select().from(message).where(eq(message.orderId, lir.id));
    expect(msgs.some(m => m.recipient === 'installer' && m.installerId === I.Faton && m.channel === 'viber')).toBe(true);
  });

  it('"Link i ri" replaces the token; the client language and channel are saved with history', async () => {
    const lir = byName(await book(), 'Liridona Shala');
    const token = await newTrackingLink(db, office, lir.id);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(token).not.toBe(lir.trackingToken);
    const [o] = await db.select().from(orders).where(eq(orders.trackingToken, lir.trackingToken));
    expect(o).toBeUndefined();
    await setClientContact(db, office, lir.clientId, { language: 'en', channel: 'viber' });
    const h = await db.select().from(history).where(eq(history.recordId, lir.clientId));
    expect(h.map(x => x.text)).toEqual(expect.arrayContaining(['Gjuha: Gjermanisht → Anglisht', 'Kanali: WhatsApp → Viber']));
  });

  it('installers: both roles add and edit; templates: Pronari only, defaults are not stored', async () => {
    const i = await saveInstaller(db, office, null, { name: 'Leart', phone: '049 111 222' });
    expect(i).toMatchObject({ phone: '+38349111222', channel: 'whatsapp', active: true });
    await saveInstaller(db, office, i.id, { name: 'Leart', phone: '+38349111222', channel: 'viber', active: false });
    expect(await err(saveInstaller(db, office, null, { name: '', phone: '12' }))).toBe('installerNameRequired,phoneInvalid');
    expect(await err(saveTemplates(db, office, 'sq', { reminder: 'X' }))).toBe('forbidden');
    const { DEFAULT_TEMPLATES } = await import('@/domain/messages');
    await saveTemplates(db, owner, 'de', { reminder: 'Hallo {customerName}', free: DEFAULT_TEMPLATES.de.free });
    const [c] = await db.select().from(company);
    expect(c.templates).toEqual({ de: { reminder: 'Hallo {customerName}' } });
    const b = await book();
    expect(orderMessage('reminder', byName(b, 'Arbëria Invest sh.p.k.'), 'de', '', S, TODAY, c.templates)).toBe('Hallo Arbëria Invest');
  });
});

/* ───────── Review fixes (Phase 4): correcting a visit marked done, reminders across days ───────── */

describe('correcting a visit marked done', () => {
  const dmy = (iso: string) => iso.split('-').reverse().join('.');
  const naimDone = async () => {
    const naim = byName(await book(), 'Naim Berisha');
    const v = naim.visits.find(x => x.date === TODAY)!;
    await completeVisit(db, office, naim.id, v.id, { pay: 'all', holder: I.Besnik, close: true }, TODAY);
    return { id: naim.id, v };
  };

  it('Ndrysho: the day, installer and note move in Orari and the summaries; payments and stage stay', async () => {
    const { id, v } = await naimDone();
    const r = await editDoneVisit(db, office, id, v.id, { date: d(-1), installerId: I.Driton, note: 'U montua dje' }, TODAY);
    expect(r.changed).toBe(1);
    const o = (await loadOrder(db, owner.companyId, id))!;
    expect(o.visits.find(x => x.id === v.id)).toMatchObject({ date: d(-1), doneAt: d(-1), installerId: I.Driton, note: 'U montua dje' });
    expect(o.stage).toBe('done');
    expect(orderTotals(o)).toMatchObject({ owed: 0, held: 280000, paid: 380000 });
    const b = await book();
    const jobs = allJobs(b.orders);
    expect(jobsOf(jobs, I.Driton, d(-1)).some(x => x.v.id === v.id)).toBe(true);
    expect(jobsOf(jobs, I.Besnik, TODAY).some(x => x.v.id === v.id)).toBe(false);
    // The visit counts for Driton now; the cash stays with whoever took it (Besnik) until confirmed or edited.
    const pays = b.orders.flatMap(x => x.payments);
    expect(installerSummary(jobs, I.Driton, pays, TODAY).done.install).toBeGreaterThanOrEqual(1);
    expect(installerSummary(jobs, I.Besnik, pays, TODAY).held).toBe(280000);
    const h = (await loadHistory(db, 'order', id)).map(x => x.text);
    expect(h).toContain(`Vizita e kryer u ndryshua: Montim · ${dmy(TODAY)} · Besnik → Montim · ${dmy(d(-1))} · Driton`);
    expect(h).toContain(`Shënimi i vizitës u ndryshua: Montim · ${dmy(d(-1))} · Driton`);
    // Nothing changed → no history line; a future day is refused.
    expect((await editDoneVisit(db, office, id, v.id, { date: d(-1), installerId: I.Driton, note: 'U montua dje' }, TODAY)).changed).toBe(0);
    expect(await err(editDoneVisit(db, office, id, v.id, { date: d(1), installerId: I.Driton }, TODAY))).toBe('dateFuture');
    // saveVisit/removeVisit still refuse a done visit: corrections go through these two.
    expect(await err(removeVisit(db, owner, id, v.id))).toBe('visitDone');
  });

  it('"Nuk u krye" plans it again and can reopen the order; payments are kept, never duplicated', async () => {
    const { id, v } = await naimDone();
    const before = (await loadOrder(db, owner.companyId, id))!;
    const payCount = activePayments(before.payments).length;
    const r = await reopenVisit(db, office, id, v.id, { reopenOrder: true }, TODAY);
    expect(r.reopenedOrder).toBe(true);
    let o = (await loadOrder(db, owner.companyId, id))!;
    expect(o.visits.find(x => x.id === v.id)!.doneAt).toBeNull();
    expect(o).toMatchObject({ stage: 'active', doneAt: null, dueDate: null, payTerm: null });
    expect(activePayments(o.payments)).toHaveLength(payCount);
    expect(orderTotals(o)).toMatchObject({ held: 280000, paid: 380000, owed: 0 });
    // Customer page: back to "Në punë"; Orari: the visit is open again on its day.
    expect(trackingSteps(o.stage as 'active', false).map(s => s.state)).toEqual(['done', 'current', 'future']);
    let b = await book();
    expect(allJobs(b.orders).find(x => x.v.id === v.id)!.v.doneAt).toBeNull();
    expect(installerSummary(allJobs(b.orders), I.Besnik, b.orders.flatMap(x => x.payments), d(-1)).upcoming.some(x => x.v.id === v.id)).toBe(true);
    const h = (await loadHistory(db, 'order', id)).map(x => x.text);
    expect(h).toContain(`Vizita u rikthye si e pakryer: Montim · ${dmy(TODAY)} · Besnik`);
    expect(h).toContain('Faza: E kryer → Në punë');
    // Marking it done again: everything is already paid, so no second payment is recorded.
    await completeVisit(db, office, id, v.id, { pay: 'all', holder: I.Besnik, close: true }, TODAY);
    o = (await loadOrder(db, owner.companyId, id))!;
    expect(o.stage).toBe('done');
    expect(activePayments(o.payments)).toHaveLength(payCount);
    expect(orderTotals(o)).toMatchObject({ held: 280000, paid: 380000, owed: 0 });
    b = await book();
    expect(debts(b.orders, b.openings, TODAY).some(x => x.id === id)).toBe(false);
  });

  it('reopening a past visit puts it under "Nga ditët e kaluara"; the stage stays unless asked', async () => {
    const b = await book();
    const granit = byName(b, 'Granit Morina');
    const gv = granit.visits[0];
    await completeVisit(db, office, granit.id, gv.id, { pay: 'no', note: 'priza 2×' }, TODAY);
    expect(pastUndone(allJobs((await book()).orders), TODAY).some(x => x.v.id === gv.id)).toBe(false);
    const r = await reopenVisit(db, owner, granit.id, gv.id, {}, TODAY);
    expect(r.reopenedOrder).toBe(false);
    const after = await book();
    expect(pastUndone(allJobs(after.orders), TODAY).some(x => x.v.id === gv.id)).toBe(true);
    expect(byName(after, 'Granit Morina').stage).toBe('new');
    // Only a done visit can be reopened.
    expect(await err(reopenVisit(db, owner, granit.id, gv.id, {}, TODAY))).toMatch(/not found: visit/);
  });

  it('project parts keep their own correction ("Montimet e kryera"); a cancelled order refuses', async () => {
    const ru = byName(await book(), 'Ndërtimi Rugova sh.p.k.');
    const part = ru.visits.find(x => x.doneAt && x.quantity)!;
    expect(await err(editDoneVisit(db, office, ru.id, part.id, { date: TODAY }, TODAY))).toMatch(/not found: visit/);
    expect(await err(reopenVisit(db, office, ru.id, part.id, {}, TODAY))).toMatch(/not found: visit/);
    expect((await editPart(db, office, ru.id, part.id, { quantity: String(part.quantity), date: part.doneAt!, installerId: I.Faton }, TODAY)).changed).toBe(1);
    const { id, v } = await naimDone();
    await db.update(orders).set({ stage: 'cancelled' }).where(eq(orders.id, id));
    expect(await err(reopenVisit(db, owner, id, v.id, {}, TODAY))).toBe('cancelled');
  });
});

describe('"Nuk u krye" on a project visit marked done', () => {
  it('plans it again with its time, installer and note; progress follows; the project can reopen; payments stay', async () => {
    const ru = byName(await book(), 'Ndërtimi Rugova sh.p.k.');
    const v = ru.visits.find(x => !x.doneAt)!;
    const direct = ru.visits.find(x => x.doneAt && x.quantity)!;
    const paid = orderTotals(ru).paid;
    await completeVisit(db, office, ru.id, v.id, { pay: 'part', amount: '300', holder: 'office', method: 'cash', quantity: '3', finish: true }, TODAY);
    expect((await loadOrder(db, owner.companyId, ru.id))!.stage).toBe('done');
    expect(await partsFromVisits(db, owner.companyId, ru.id)).toEqual(new Set([v.id]));

    const r = await reopenPart(db, office, ru.id, v.id, { reopenOrder: true });
    expect(r.reopenedOrder).toBe(true);
    const o = (await loadOrder(db, owner.companyId, ru.id))!;
    expect(o.visits.find(x => x.id === v.id)).toMatchObject({ doneAt: null, quantity: null, value: null, date: v.date, time: v.time, installerId: v.installerId, note: v.note });
    expect(installedQty(o)).toBe(installedQty(ru));
    expect(o).toMatchObject({ stage: 'active', doneAt: null, dueDate: null });
    expect(orderTotals(o).paid).toBe(paid + 30000);
    const h = (await loadHistory(db, 'order', ru.id)).map(x => x.text);
    expect(h.some(x => x.startsWith('Montimi u rikthye si vizitë e planifikuar: 3 copë'))).toBe(true);

    // Planned again: nothing to reopen. A part recorded directly ("Shëno montim") is corrected or deleted instead.
    expect(await err(reopenPart(db, office, ru.id, v.id, {}))).toMatch(/not found: part/);
    expect(await err(reopenPart(db, office, ru.id, direct.id, {}))).toMatch(/not found: part/);
  });

  it('without "Projekti nuk ka përfunduar" the stage stays; a cancelled project refuses', async () => {
    const ru = byName(await book(), 'Ndërtimi Rugova sh.p.k.');
    const v = ru.visits.find(x => !x.doneAt)!;
    await completeVisit(db, office, ru.id, v.id, { pay: 'no', quantity: '2', finish: true }, TODAY);
    expect((await reopenPart(db, owner, ru.id, v.id, {})).reopenedOrder).toBe(false);
    expect((await loadOrder(db, owner.companyId, ru.id))!.stage).toBe('done');
    await db.update(orders).set({ stage: 'active' }).where(eq(orders.id, ru.id));
    await completeVisit(db, office, ru.id, v.id, { pay: 'no', quantity: '2' }, TODAY);
    await db.update(orders).set({ stage: 'cancelled' }).where(eq(orders.id, ru.id));
    expect(await err(reopenPart(db, office, ru.id, v.id, {}))).toBe('cancelled');
  });
});

describe('"Nuk u krye" on a repair that cleared "Ka punë të mbetura"', () => {
  const dmy = (iso: string) => iso.split('-').reverse().join('.');
  const NOTE = 'Një derë duhet rregulluar; klienti paguan 150€ e fundit pas rregullimit.';
  const mimozaDone = async (today = TODAY) => {
    const m = byName(await book(), 'Mimoza Rexhepi');
    const rv = m.visits.find(x => x.type === 'repair')!;
    await completeVisit(db, office, m.id, rv.id, { pay: 'no', finishRemaining: true }, today);
    return { id: m.id, rv, payCount: activePayments(m.payments).length };
  };
  const mimozaRem = async (today = TODAY) => {
    const b = await book();
    return debts(b.orders, b.openings, today).find(x => x.name === 'Mimoza Rexhepi')!.rem;
  };

  it('puts the note and its pause back; tracking and the green "Kujtesë" follow; payments stay', async () => {
    const { id, rv, payCount } = await mimozaDone();
    // The bug: once cleared, the 150€ is due and the green button shows.
    expect((await mimozaRem()).ok).toBe(true);
    expect(await repairCleared(db, owner.companyId, id, rv.id)).toEqual({ note: NOTE, until: d(10) });
    const r = await reopenVisit(db, office, id, rv.id, { restoreRemaining: true, remainingNote: NOTE, pause: true }, TODAY);
    expect(r).toMatchObject({ restoredRemaining: true, paused: true, reopenedOrder: false });
    const o = (await loadOrder(db, owner.companyId, id))!;
    expect(o.visits.find(x => x.id === rv.id)!.doneAt).toBeNull();
    expect(o).toMatchObject({ stage: 'done', remainingWork: NOTE, pausedUntil: d(10), pauseReason: 'Punë të mbetura' });
    expect(activePayments(o.payments)).toHaveLength(payCount);
    expect(headlineKey('done', !!o.remainingWork, false)).toBe('doneRemaining');
    expect(trackingSteps('done', !!o.remainingWork).at(-1)!.state).toBe('current');
    expect(await mimozaRem()).toMatchObject({ ok: false });
    const h = (await loadHistory(db, 'order', id)).map(x => x.text);
    expect(h).toContain(`Ka punë të mbetura: ${NOTE}`);
    expect(h).toContain(`Kujtesat në pauzë deri më ${dmy(d(10))}: Punë të mbetura`);
    // Done again: it clears again, and can be undone again.
    await completeVisit(db, office, id, rv.id, { pay: 'no', finishRemaining: true }, TODAY);
    expect((await loadOrder(db, owner.companyId, id))!.remainingWork).toBeNull();
  });

  it('a pause that has run out restarts for 14 days; without the pause tick only the note returns', async () => {
    const { id, rv } = await mimozaDone();
    const later = d(12);
    await reopenVisit(db, owner, id, rv.id, { restoreRemaining: true, remainingNote: 'Dera e dytë', pause: true }, later);
    let o = (await loadOrder(db, owner.companyId, id))!;
    expect(o).toMatchObject({ remainingWork: 'Dera e dytë', pausedUntil: addDays(later, 14) });
    await completeVisit(db, office, id, rv.id, { pay: 'no', finishRemaining: true }, later);
    await reopenVisit(db, owner, id, rv.id, { restoreRemaining: true, remainingNote: 'Dera e dytë' }, later);
    o = (await loadOrder(db, owner.companyId, id))!;
    expect(o).toMatchObject({ remainingWork: 'Dera e dytë', pausedUntil: null });
    // Remaining work shows on the debt row, but nothing pauses the reminder.
    expect(await mimozaRem(later)).toMatchObject({ ok: true });
  });

  it('keeps later changes: a pause or remaining work set since then; a note is required', async () => {
    const { id, rv } = await mimozaDone();
    await pauseOrder(db, office, id, { until: d(20), reason: 'Premtoi të paguajë' }, TODAY);
    expect(await err(reopenVisit(db, office, id, rv.id, { restoreRemaining: true, remainingNote: ' ', pause: true }, TODAY))).toBe('remainingRequired');
    expect((await loadOrder(db, owner.companyId, id))!.visits.find(x => x.id === rv.id)!.doneAt).toBe(TODAY);
    await reopenVisit(db, office, id, rv.id, { restoreRemaining: true, remainingNote: NOTE, pause: true }, TODAY);
    let o = (await loadOrder(db, owner.companyId, id))!;
    expect(o).toMatchObject({ remainingWork: NOTE, pausedUntil: d(20), pauseReason: 'Premtoi të paguajë' });
    // Remaining work set again by hand before the undo is not overwritten.
    await completeVisit(db, office, id, rv.id, { pay: 'no', finishRemaining: true }, TODAY);
    await setRemainingWork(db, office, id, { note: 'Doreza' }, TODAY);
    const r = await reopenVisit(db, office, id, rv.id, { restoreRemaining: true, remainingNote: NOTE }, TODAY);
    expect(r.restoredRemaining).toBe(false);
    o = (await loadOrder(db, owner.companyId, id))!;
    expect(o.remainingWork).toBe('Doreza');
    // Only repairs: another visit type ignores it.
    const g = byName(await book(), 'Granit Morina');
    await completeVisit(db, office, g.id, g.visits[0].id, { pay: 'no' }, TODAY);
    expect((await reopenVisit(db, office, g.id, g.visits[0].id, { restoreRemaining: true, remainingNote: 'x' }, TODAY)).restoredRemaining).toBe(false);
  });
});

describe('reminders across days', () => {
  const at = (iso: string, hhmm = '12:00') => new Date(`${iso}T${hhmm}:00+02:00`);
  const valonRem = async (today: string) => {
    const b = await book();
    return debts(b.orders, b.openings, today).find(x => x.name === 'Valon Hoxha')!.rem;
  };

  it('a reminder logged on a later day suppresses the green "Kujtesë" for seven days from that day', async () => {
    const valon = byName(await book(), 'Valon Hoxha');
    const later = d(7);
    expect((await valonRem(later)).ok).toBe(true);
    await logCustomerMessage(db, office, { orderId: valon.id }, { type: 'reminder', channel: 'whatsapp', language: 'sq', text: 'Kujtesë' }, at(later));
    expect(await valonRem(later)).toMatchObject({ ok: false, reason: 'recent', lastAt: later });
    expect((await valonRem(addDays(later, 6))).ok).toBe(false);
    expect((await valonRem(addDays(later, 7))).ok).toBe(true);
    const o = (await loadOrder(db, owner.companyId, valon.id))!;
    expect(new Date(lastReminder(o.messages)!.sentAt).toISOString().slice(0, 10)).toBe(later);
  });

  it('on the normal date nothing changes: a reminder sent today counts from today', async () => {
    const valon = byName(await book(), 'Valon Hoxha');
    await logCustomerMessage(db, office, { orderId: valon.id }, { type: 'reminder', channel: 'whatsapp', language: 'sq', text: 'Kujtesë' }, at(TODAY));
    expect((await valonRem(TODAY)).ok).toBe(false);
    expect((await valonRem(d(6))).ok).toBe(false);
    expect((await valonRem(d(7))).ok).toBe(true);
  });

  it('the day of a reminder is Kosovo’s: 00:30 local is that day, not the UTC day before', () => {
    const t = { owed: 10000, dueDate: d(-30) };
    const late = { pausedUntil: null, messages: [{ type: 'reminder', channel: 'whatsapp' as const, sentAt: '2026-10-11T22:30:00Z' }] };
    // 22:30 UTC on 11.10 is 00:30 on 12.10 in Kosovo: seven days later is 19.10.
    expect(reminderCheck(t, late, false, '2026-10-18')).toMatchObject({ ok: false, reason: 'recent', lastAt: '2026-10-12' });
    expect(reminderCheck(t, late, false, TODAY)).toMatchObject({ ok: true });
  });

  it('an installer job logged on a day is "dërguar" that day', async () => {
    const naim = byName(await book(), 'Naim Berisha');
    const v = naim.visits.find(x => x.date === TODAY)!;
    await logInstallerMessage(db, office, { installerId: I.Besnik, visitIds: [v.id], mode: 'visit', channel: 'whatsapp', text: 'Puna' }, at(d(3)));
    const [row] = await db.select().from(visit).where(eq(visit.id, v.id));
    expect(row.lastSentAt!.toISOString().slice(0, 10)).toBe(d(3));
    const [m] = await db.select().from(message).where(eq(message.orderId, naim.id));
    expect(m.sentAt.toISOString().slice(0, 10)).toBe(d(3));
  });
});
