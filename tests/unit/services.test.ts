/**
 * Phase 3 services against a real (in-memory) Postgres with the Phase 3 fixtures:
 * the same code the server actions run.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { createDb, type Db } from '@/db/connect';
import { runMigrations } from '@/db/migrate';
import { loadFixtures } from '@/db/fixtures';
import { company, history, installer, payment, user } from '@/db/schema';
import { ForbiddenError } from '@/auth/permissions';
import { orderTotals, openingTotals, installedQty } from '@/domain/balances';
import { cashWithInstallers, debts, groupDebts, headline, sumOf } from '@/domain/debts';
import { loadBook, loadHistory, loadOrder, type Book } from '@/services/book';
import { FieldError, FieldErrors, type Actor } from '@/services/common';
import {
  cancelOrder,
  clearRemainingWork,
  createOrder,
  deleteOrder,
  editOrder,
  finishProject,
  markDone,
  deletePart,
  editPart,
  recordPart,
  restoreOrder,
  setStage,
  setTerm,
} from '@/services/orders';
import { addPayment, confirmAll, confirmCash, deletePayment, editPayment } from '@/services/payments';
import { createOpening, deleteOpening, editOpening, setOpeningDue } from '@/services/openings';
import { buildExport } from '@/services/export';
import { addDays } from '@/lib/dates';

const TODAY = '2026-10-19';
const d = (n: number) => addDays(TODAY, n);
let db: Db;
let owner: Actor;
let office: Actor;
let inst: Record<string, string>;

const byName = (b: Book, name: string) => b.orders.find(o => o.client.name === name)!;
const book = () => loadBook(db, owner.companyId);
const fieldError = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) => (e instanceof FieldError ? e.key : e instanceof FieldErrors ? e.errors.map(x => x.key).join(',') : e instanceof ForbiddenError ? 'forbidden' : String(e)),
  );

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
  inst = Object.fromEntries((await db.select().from(installer)).map(i => [i.name, i.id]));
}, 60_000);

describe('Phase 3 fixtures', () => {
  it('the debts list and the Sot headline add up', async () => {
    const b = await book();
    const rows = debts(b.orders, b.openings, TODAY);
    const g = groupDebts(rows);
    expect(g.overdue.map(r => [r.name, r.amount, r.late])).toEqual([
      ['Arbëria Invest sh.p.k.', 1080000, 11],
      ['Valon Hoxha', 120000, 33],
      ['Ilir Gashi', 90000, 23],
      ['Blerim Hasani', 45000, 60],
      ['Mimoza Rexhepi', 15000, 5],
    ]);
    expect(g.unknown.map(r => [r.name, r.amount])).toEqual([['Shpresa Leka', 110000]]);
    expect(g.upcoming.map(r => [r.name, r.amount])).toEqual([['Dritë Hyseni', 65000]]);
    const cash = cashWithInstallers(b.orders, b.openings, b.installers, TODAY);
    expect(cash.map(c => [c.name, c.sum, c.items[0].days])).toEqual([
      ['Driton', 80000, 0],
      ['Faton', 75000, 24],
    ]);
    const h = headline(rows, sumOf(cash.map(c => ({ amount: c.sum }))));
    expect(h).toMatchObject({ overdueSum: 1350000, unknownSum: 110000, upcomingSum: 65000, cashSum: 155000 });
  });

  it('the €800 case: owed €0, €800 with Driton, no debt row', async () => {
    const o = byName(await book(), 'Fatmir Krasniqi');
    expect(orderTotals(o)).toMatchObject({ owed: 0, held: 80000, inOffice: 420000 });
  });

  it('projects: one owes from the oldest unpaid part, one is paid ahead', async () => {
    const b = await book();
    const a = orderTotals(byName(b, 'Arbëria Invest sh.p.k.'));
    expect(a).toMatchObject({ earned: 5040000, paid: 3960000, owed: 1080000, dueDate: d(-11) });
    expect(installedQty(byName(b, 'Arbëria Invest sh.p.k.'))).toBe(18);
    const r = orderTotals(byName(b, 'Ndërtimi Rugova sh.p.k.'));
    expect(r).toMatchObject({ earned: 360000, owed: 0, paidAhead: 140000 });
  });

  it('a deleted payment is out of every total, but its history line stays', async () => {
    const o = byName(await book(), 'Liridona Shala');
    expect(orderTotals(o).paid).toBe(150000);
    expect(o.payments).toHaveLength(2);
    const h = await loadHistory(db, 'order', o.id);
    expect(h.some(x => /u fshi: U regjistrua dy herë/.test(x.text))).toBe(true);
  });
});

describe('orders: the three stages by key', () => {
  it('new → active → E kryer with the €800 "Te Driton", then Konfirmo', async () => {
    const arta = byName(await book(), 'Arta Krasniqi');
    await setStage(db, office, arta.id, 'active');
    // Remaining €3.000; the customer pays all of it to Driton.
    const r = await markDone(db, office, arta.id, { pay: 'all', holder: inst.Driton, term: 'week' }, TODAY);
    expect(r.left).toBe(0);
    let o = (await loadOrder(db, owner.companyId, arta.id))!;
    expect(o.stage).toBe('done');
    expect(orderTotals(o)).toMatchObject({ owed: 0, held: 300000, inOffice: 150000 });
    expect(debts([o], [], d(90))).toHaveLength(0);
    const held = o.payments.find(p => p.heldBy)!;
    expect(held.method).toBe('cash');
    await confirmCash(db, office, held.id);
    o = (await loadOrder(db, owner.companyId, arta.id))!;
    expect(orderTotals(o)).toMatchObject({ owed: 0, held: 0, inOffice: 450000 });
    const h = (await loadHistory(db, 'order', arta.id)).map(x => x.text);
    expect(h).toContain('Faza: E re → Në punë');
    expect(h).toContain('Faza: Në punë → E kryer');
    expect(h).toContain('Konfirmuar: Teuta i mori €3.000 nga Driton');
  });

  it('marking done sets the due date from the term; "Nuk e di" leaves it unknown', async () => {
    const arta = byName(await book(), 'Arta Krasniqi');
    await markDone(db, office, arta.id, { pay: 'part', amount: '1.000', holder: 'office', method: 'bank', term: 'month' }, TODAY);
    let o = (await loadOrder(db, owner.companyId, arta.id))!;
    expect(o.dueDate).toBe(d(30));
    expect(orderTotals(o)).toMatchObject({ owed: 200000, dueDate: d(30) });
    await setTerm(db, owner, arta.id, { term: 'unknown' });
    o = (await loadOrder(db, owner.companyId, arta.id))!;
    expect(orderTotals(o)).toMatchObject({ owed: 200000, dueDate: null, dueUnknown: true });
  });

  it('a specific date is required for "Në një datë"', async () => {
    const arta = byName(await book(), 'Arta Krasniqi');
    expect(await fieldError(markDone(db, office, arta.id, { pay: 'no', term: 'date' }, TODAY))).toBe('dateRequired');
  });

  it('moving back is allowed and logged; the order leaves the debts list', async () => {
    const valon = byName(await book(), 'Valon Hoxha');
    await setStage(db, office, valon.id, 'active');
    const o = (await loadOrder(db, owner.companyId, valon.id))!;
    expect(o).toMatchObject({ stage: 'active', doneAt: null, dueDate: null });
    expect(orderTotals(o).owed).toBe(0);
    expect((await loadHistory(db, 'order', valon.id))[0].text).toBe('Faza: E kryer → Në punë');
  });

  it('renamed labels don’t change behaviour: the key decides', async () => {
    await db.update(company).set({ stageLabels: { active: 'Në prodhim', done: 'Montuar' } });
    const arta = byName(await book(), 'Arta Krasniqi');
    await setStage(db, office, arta.id, 'active');
    await markDone(db, office, arta.id, { pay: 'no', term: 'week' }, TODAY);
    const o = (await loadOrder(db, owner.companyId, arta.id))!;
    expect(o.stage).toBe('done');
    expect(orderTotals(o)).toMatchObject({ owed: 300000, dueDate: d(7) });
    expect((await loadHistory(db, 'order', arta.id))[0].text).toBe('Faza: Në prodhim → Montuar · pagesa: brenda javës');
  });

  it('cancelling takes the order out of every total; restoring brings back its stage', async () => {
    const valon = byName(await book(), 'Valon Hoxha');
    await cancelOrder(db, office, valon.id, 'Klienti hoqi dorë');
    let b = await book();
    expect(debts(b.orders, b.openings, TODAY).some(r => r.name === 'Valon Hoxha')).toBe(false);
    await restoreOrder(db, office, valon.id);
    b = await book();
    expect(byName(b, 'Valon Hoxha').stage).toBe('done');
  });

  it('+ Porosi e re: numbers per year, the client is reused, avans in the office', async () => {
    const r = await createOrder(
      db,
      office,
      { name: 'Arta Krasniqi', phoneCc: '+383', phone: '044 600 700', productType: 'Garderobë', price: '1.200', deposit: '400', method: 'cash', city: 'Prishtinë' },
      TODAY,
    );
    expect(r.number).toBe('2026-016');
    const b = await book();
    expect(b.clients.filter(c => c.name === 'Arta Krasniqi')).toHaveLength(1);
    const o = b.orders.find(x => x.id === r.id)!;
    expect(orderTotals(o)).toMatchObject({ paid: 40000, inOffice: 40000, owed: 0 });
    const r2 = await createOrder(db, office, { name: 'X', phoneCc: '+49', phone: '151 1234 5678', productType: 'Kuzhinë', price: '5000', city: 'Prishtinë' }, '2027-01-03');
    expect(r2.number).toBe('2027-001');
  });

  it('the five-field form explains every missing field at once', async () => {
    expect(await fieldError(createOrder(db, office, { name: '', phoneCc: '+383', phone: '', productType: '', price: 'abc', city: '' }, TODAY))).toBe(
      'nameRequired,phoneRequired,productRequired,amountInvalid',
    );
    expect(await fieldError(createOrder(db, office, { name: 'A', phoneCc: '+383', phone: '44123456', productType: 'Kuzhinë', price: '1000', deposit: '1500', city: '' }, TODAY))).toBe(
      'depositTooBig',
    );
  });

  it('Ndrysho porosinë: price changes with a note go into the history', async () => {
    const arta = byName(await book(), 'Arta Krasniqi');
    await editOrder(db, office, arta.id, {
      name: 'Arta Krasniqi',
      phone: '+38344600700',
      productType: 'Kuzhinë',
      description: arta.description,
      price: '4.700',
      priceNote: '+1 dollap',
      city: 'Prishtinë',
      directions: arta.directions,
      internalNote: '',
    });
    const h = (await loadHistory(db, 'order', arta.id)).map(x => x.text);
    expect(h).toContain('Çmimi: €4.500 → €4.700 · +1 dollap');
  });

  it('remaining work: "Puna u përfundua" clears it and its pause', async () => {
    const m = byName(await book(), 'Mimoza Rexhepi');
    await clearRemainingWork(db, office, m.id);
    const o = (await loadOrder(db, owner.companyId, m.id))!;
    expect(o).toMatchObject({ remainingWork: null, pausedUntil: null });
  });
});

describe('projects', () => {
  it('"Shëno montim" adds a part; the first part moves a new project to "Në punë"', async () => {
    const r = await createOrder(
      db,
      owner,
      { name: 'Kodra Ndërtim sh.p.k.', phoneCc: '+383', phone: '38 500 600', productType: 'Dyer', price: '25.000', deposit: '5.000', method: 'bank', city: 'Prishtinë', project: true, quantity: '100', unit: 'copë', projectPayTerm: 'month' },
      TODAY,
    );
    let res = await recordPart(db, office, r.id, { quantity: '15', date: d(-1), installerId: inst.Driton }, TODAY);
    expect(res).toMatchObject({ installed: 15, owed: 0 });
    let o = (await loadOrder(db, owner.companyId, r.id))!;
    expect(o.stage).toBe('active');
    expect(orderTotals(o).paidAhead).toBe(125000);
    res = await recordPart(db, office, r.id, { quantity: '25', installerId: inst.Faton }, TODAY);
    expect(res.owed).toBe(500000);
    expect(await fieldError(recordPart(db, office, r.id, { quantity: '61' }, TODAY))).toBe('qtyTooMany');
    await finishProject(db, owner, r.id, TODAY);
    o = (await loadOrder(db, owner.companyId, r.id))!;
    expect(orderTotals(o)).toMatchObject({ owed: 2000000 });
  });
});

describe('payments', () => {
  it('edit changes the balance and writes old → new', async () => {
    const valon = byName(await book(), 'Valon Hoxha');
    const p = valon.payments[0];
    await editPayment(db, office, p.id, { amount: '800', method: 'cash', holder: 'office', date: p.date, note: p.note }, TODAY);
    const o = (await loadOrder(db, owner.companyId, valon.id))!;
    expect(orderTotals(o).owed).toBe(100000);
    expect((await loadHistory(db, 'order', valon.id))[0].text).toBe('Pagesa u ndryshua: €600 → €800');
  });

  it('delete (Pronari) puts the debt back and writes history', async () => {
    const valon = byName(await book(), 'Valon Hoxha');
    await deletePayment(db, owner, valon.payments[0].id, 'Shuma e gabuar');
    const o = (await loadOrder(db, owner.companyId, valon.id))!;
    expect(orderTotals(o).owed).toBe(180000);
    expect((await loadHistory(db, 'order', valon.id))[0]).toMatchObject({ who: 'Arben' });
  });

  it('cash not handed over for weeks: only editing or deleting the payment changes the debt', async () => {
    const besa = byName(await book(), 'Besa Morina');
    expect(debts([besa], [], d(60))).toHaveLength(0);
    const p = besa.payments[0];
    await editPayment(db, office, p.id, { amount: '700', method: 'cash', holder: inst.Faton, date: p.date }, TODAY);
    const o = (await loadOrder(db, owner.companyId, besa.id))!;
    expect(orderTotals(o)).toMatchObject({ owed: 5000, held: 70000 });
  });

  it('no payment larger than what is left', async () => {
    const dh = byName(await book(), 'Dritë Hyseni');
    expect(await fieldError(addPayment(db, office, { orderId: dh.id }, { amount: '700' }, TODAY))).toBe('moreThanLeft');
    expect(await fieldError(addPayment(db, office, { orderId: dh.id }, { amount: '0' }, TODAY))).toBe('amountInvalid');
  });

  it('Konfirmo të gjitha: everything one installer holds', async () => {
    const sum = await confirmAll(db, owner, inst.Faton);
    expect(sum).toBe(75000);
    const b = await book();
    expect(cashWithInstallers(b.orders, b.openings, b.installers, TODAY).map(c => c.name)).toEqual(['Driton']);
  });

  it('a payment on an opening balance', async () => {
    const ob = (await book()).openings.find(x => x.name === 'Shpresa Leka')!;
    await addPayment(db, office, { openingId: ob.id }, { amount: '100', method: 'cash', holder: inst.Besnik }, TODAY);
    const b = await book();
    const t = openingTotals(b.openings.find(x => x.id === ob.id)!);
    expect(t).toMatchObject({ owed: 100000, held: 10000, dueUnknown: true });
  });
});

describe('opening balances', () => {
  it('a known date, an approximate month, or "Nuk e di"', async () => {
    const a = await createOpening(db, office, { name: 'A', amount: '300', dueMode: 'date', dueDate: d(-10) }, TODAY);
    const b = await createOpening(db, office, { name: 'B', amount: '300', dueMode: 'month', dueMonth: '2026-02' }, TODAY);
    const c = await createOpening(db, office, { name: 'C', amount: '300', dueMode: 'unknown' }, TODAY);
    expect([a.dueDate, b.dueDate, b.dueApprox, c.dueDate]).toEqual([d(-10), '2026-02-28', true, null]);
    expect(await fieldError(createOpening(db, office, { name: '', amount: '', dueMode: '' }, TODAY))).toBe('nameRequired,openingAmountRequired,dueModeRequired');
    await setOpeningDue(db, office, c.id, d(-1));
    const bk = await book();
    expect(debts(bk.orders, bk.openings, TODAY).find(r => r.id === c.id)).toMatchObject({ overdue: true, late: 1 });
  });
});

describe('opening balances: "Ndrysho borxhin"', () => {
  it('both roles correct every field, the due date included; each change is one history line', async () => {
    const b = await book();
    const ob = b.openings.find(x => x.name === 'Blerim Hasani')!;
    const work = /^\d{4}-\d{2}$/.test(ob.workDone) ? { workMode: 'month' as const, workMonth: ob.workDone } : /^\d{4}-\d{2}-\d{2}$/.test(ob.workDone) ? { workMode: 'date' as const, workDate: ob.workDone } : { workMode: 'unknown' as const };
    const base = { name: 'Blerim Hasani', phone: ob.phone, amount: '450', forWhat: ob.forWhat, ...work, dueMode: 'date' as const, dueDate: ob.dueDate!, note: ob.note };
    // Zyra fixes the name, the amount and sets the due date back to "Nuk e di".
    const r = await editOpening(db, office, ob.id, { ...base, name: 'Blerim Hasan', amount: '400', dueMode: 'unknown' }, TODAY);
    expect(r.changed).toBe(3);
    let bk = await book();
    let row = debts(bk.orders, bk.openings, TODAY).find(x => x.id === ob.id)!;
    expect(row).toMatchObject({ name: 'Blerim Hasan', amount: 40000, overdue: false });
    expect(groupDebts(debts(bk.orders, bk.openings, TODAY)).unknown.some(x => x.id === ob.id)).toBe(true);
    // An existing date can be corrected (the old flow only allowed setting one when unknown).
    await editOpening(db, owner, ob.id, { ...base, name: 'Blerim Hasan', amount: '400', dueMode: 'date', dueDate: d(-5) }, TODAY);
    await editOpening(db, owner, ob.id, { ...base, name: 'Blerim Hasan', amount: '400', dueMode: 'date', dueDate: d(-7) }, TODAY);
    bk = await book();
    row = debts(bk.orders, bk.openings, TODAY).find(x => x.id === ob.id)!;
    expect(row).toMatchObject({ overdue: true, late: 7 });
    const h = (await loadHistory(db, 'opening', ob.id)).map(x => x.text);
    expect(h).toEqual(expect.arrayContaining(['Klienti: Blerim Hasani → Blerim Hasan', 'Shuma e borxhit: €450 → €400']));
    expect(h.filter(x => x.startsWith('Kur duhej paguar:'))).toHaveLength(3);
    // Nothing changed → nothing written.
    expect((await editOpening(db, office, ob.id, { ...base, name: 'Blerim Hasan', amount: '400', dueMode: 'date', dueDate: d(-7) }, TODAY)).changed).toBe(0);
  });

  it('validation; the amount never drops below what was paid; payments stay; delete only without active payments', async () => {
    const ob = (await book()).openings.find(x => x.name === 'Shpresa Leka')!;
    expect(await fieldError(editOpening(db, office, ob.id, { name: '', amount: 'x', dueMode: 'date', dueDate: '' }, TODAY))).toBe('nameRequired,amountInvalid,dateRequired');
    await addPayment(db, office, { openingId: ob.id }, { amount: '300', method: 'cash', holder: 'office' }, TODAY);
    expect(await fieldError(editOpening(db, office, ob.id, { name: 'Shpresa Leka', amount: '200', dueMode: 'unknown' }, TODAY))).toBe('openingBelowPaid');
    await editOpening(db, office, ob.id, { name: 'Shpresa Leka', amount: '1.000', dueMode: 'unknown' }, TODAY);
    const after = (await book()).openings.find(x => x.id === ob.id)!;
    expect(openingTotals(after)).toMatchObject({ total: 100000, paid: 30000, owed: 70000 });
    expect(await fieldError(deleteOpening(db, owner, ob.id))).toBe('openingHasPayments');
  });
});

describe('projects: correcting a recorded part', () => {
  it('both roles edit quantity, date, installer and value; balances, progress and due dates follow; payments stay', async () => {
    const ab = byName(await book(), 'Arbëria Invest sh.p.k.');
    const paidBefore = orderTotals(ab).paid;
    const p3 = ab.visits.find(v => v.quantity === 5)!;
    // 5 → 2 banesa: the oldest unpaid part is now the one due in 15 days, so nothing is overdue.
    const r = await editPart(db, office, ab.id, p3.id, { quantity: '2', date: p3.doneAt!, installerId: inst.Faton }, TODAY);
    expect(r.changed).toBe(3);
    let o = (await loadOrder(db, owner.companyId, ab.id))!;
    expect(installedQty(o)).toBe(15);
    expect(orderTotals(o)).toMatchObject({ earned: 4200000, paid: paidBefore, owed: 240000, dueDate: d(15) });
    // A value override and a different date.
    await editPart(db, owner, ab.id, p3.id, { quantity: '2', date: d(-40), installerId: inst.Faton, value: '6.000' }, TODAY);
    o = (await loadOrder(db, owner.companyId, ab.id))!;
    expect(o.visits.find(v => v.id === p3.id)).toMatchObject({ doneAt: d(-40), date: d(-40), value: 600000 });
    expect(orderTotals(o).earned).toBe(4240000);
    // Validation: too many, future date, unknown installer.
    expect(await fieldError(editPart(db, office, ab.id, p3.id, { quantity: '12', date: d(1), installerId: 'nope' }, TODAY))).toBe('qtyTooMany,dateFuture,installerUnknown');
    const h = (await loadHistory(db, 'order', ab.id)).map(x => x.text);
    expect(h.some(x => x.startsWith(`Montimi i ${d(-41).split('-').reverse().join('.')} u ndryshua: Sasia: 5 banesa → 2 banesa · Montuesi: Driton → Faton`))).toBe(true);
  });

  it('deleting a part is Pronari only; money paid beyond the installed value becomes "Paguar përpara"', async () => {
    const ru = byName(await book(), 'Ndërtimi Rugova sh.p.k.');
    const part = ru.visits.find(v => v.quantity)!;
    expect(await fieldError(deletePart(db, office, ru.id, part.id))).toBe('forbidden');
    await deletePart(db, owner, ru.id, part.id);
    const o = (await loadOrder(db, owner.companyId, ru.id))!;
    expect(installedQty(o)).toBe(0);
    expect(orderTotals(o)).toMatchObject({ paid: 500000, owed: 0, paidAhead: 500000 });
    expect(o.payments.filter(p => !p.deletedAt)).toHaveLength(1);
    expect((await loadHistory(db, 'order', ru.id))[0].text).toMatch(/^Montimi u fshi: 3 copë · Besnik · €3\.600/);
  });
});

describe('permissions: Zyra can’t delete or export', () => {
  it('delete payment, order, opening balance; export', async () => {
    const b = await book();
    const valon = byName(b, 'Valon Hoxha');
    expect(await fieldError(deletePayment(db, office, valon.payments[0].id, ''))).toBe('forbidden');
    const dh = byName(b, 'Dritë Hyseni');
    expect(await fieldError(deleteOrder(db, office, dh.id))).toBe('forbidden');
    expect(await fieldError(deleteOpening(db, office, b.openings[0].id))).toBe('forbidden');
    expect(await fieldError(buildExport(db, office, TODAY))).toBe('forbidden');
  });

  it('Pronari deletes an order only without payments', async () => {
    const b = await book();
    expect(await fieldError(deleteOrder(db, owner, byName(b, 'Valon Hoxha').id))).toBe('hasPayments');
    const dh = byName(b, 'Dritë Hyseni');
    await deleteOrder(db, owner, dh.id);
    expect(await loadOrder(db, owner.companyId, dh.id)).toBeNull();
    const h = await db.select().from(history).where(and(eq(history.recordType, 'order'), eq(history.recordId, dh.id)));
    expect(h.at(-1)?.text).toBe('Porosia 2026-010 (Dritë Hyseni) u fshi');
  });

  it('services check payments belong to the company', async () => {
    const [p] = await db.select().from(payment).limit(1);
    const stranger = { ...owner, companyId: crypto.randomUUID() };
    await expect(confirmCash(db, stranger, p.id)).rejects.toThrow(/not found/);
  });
});

describe('export', () => {
  it('Pronari gets one .xlsx with five sheets and a complete JSON copy', async () => {
    const x = await buildExport(db, owner, TODAY);
    expect(x.json.orders).toHaveLength(15);
    expect(x.json.openingBalances).toHaveLength(2);
    expect(x.sheets.map(s => s.name)).toEqual(['Porositë', 'Pagesat', 'Vizitat', 'Borxhet e bartura', 'Klientët']);
    const orders = x.sheets[0];
    const fatmir = orders.rows.find(r => r[1] === 'Fatmir Krasniqi')!;
    expect(fatmir[7]).toBe('E kryer');
    expect(fatmir[10]).toBe(0); // owed now, in cents
    const pays = x.sheets[1];
    expect(pays.rows.some(r => r[5] === 'Te Driton' && r[6] === 'Pa dorëzuar')).toBe(true);
    expect(pays.rows.some(r => r[9] === 'E fshirë')).toBe(true);
    expect(x.xlsx.subarray(0, 2).toString()).toBe('PK');
    expect(JSON.stringify(x.json)).not.toMatch(/password|"token"/i);
  });
});
