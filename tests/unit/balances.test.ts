import { describe, expect, it } from 'vitest';
import {
  orderTotals,
  openingTotals,
  isOverdue,
  lateDays,
  paymentRoom,
  payStatus,
  termDue,
  type OrderRec,
  type PaymentRec,
  type VisitRec,
} from '@/domain/balances';
import { cashWithInstallers, debts, groupDebts, headline, type BookOpening, type BookOrder } from '@/domain/debts';
import { addDays } from '@/lib/dates';

const TODAY = '2026-10-19';
const d = (n: number) => addDays(TODAY, n);
let n = 0;
const pay = (amount: number, date = d(-1), extra: Partial<PaymentRec> = {}): PaymentRec & { method: string } => ({
  id: `p${++n}`,
  amount,
  date,
  heldBy: null,
  handedAt: null,
  method: 'cash',
  ...extra,
});
const part = (quantity: number, doneAt: string, extra: Partial<VisitRec> = {}): VisitRec => ({
  id: `v${++n}`,
  type: 'install',
  date: doneAt,
  installerId: 'driton',
  doneAt,
  quantity,
  value: null,
  ...extra,
});
const order = (o: Partial<OrderRec> = {}): OrderRec => ({
  price: 500000,
  stage: 'active',
  doneAt: null,
  payTerm: null,
  dueDate: null,
  quantity: null,
  projectPayTerm: null,
  payments: [],
  visits: [],
  ...o,
});

describe('balances: normal orders', () => {
  it('owes nothing until the work is done', () => {
    const t = orderTotals(order({ payments: [pay(150000)] }));
    expect(t).toMatchObject({ total: 500000, paid: 150000, remaining: 350000, owed: 0, dueDate: null });
  });

  it('once done: price − paid, due by the chosen term', () => {
    const o = order({ stage: 'done', doneAt: d(-10), payTerm: 'week', dueDate: d(-3), payments: [pay(150000)] });
    const t = orderTotals(o);
    expect(t.owed).toBe(350000);
    expect(t.dueDate).toBe(d(-3));
    expect(lateDays(t, TODAY)).toBe(3);
    expect(isOverdue(t, TODAY)).toBe(true);
  });

  it('marking done sets the due date from the term', () => {
    expect(termDue(TODAY, 'week')).toBe(d(7));
    expect(termDue(TODAY, 'month')).toBe(d(30));
    expect(termDue(TODAY, 'date', '2026-12-01')).toBe('2026-12-01');
    expect(termDue(TODAY, 'unknown')).toBeNull();
  });

  it('"Nuk e di" is counted in the total but never overdue', () => {
    const t = orderTotals(order({ stage: 'done', doneAt: d(-90), payTerm: 'unknown', dueDate: null }));
    expect(t.owed).toBe(500000);
    expect(t.dueUnknown).toBe(true);
    expect(isOverdue(t, TODAY)).toBe(false);
  });

  it('paid = office + installers; cancelled orders leave every total', () => {
    const o = order({ stage: 'done', doneAt: d(-1), payTerm: 'week', dueDate: d(6), payments: [pay(420000), pay(80000, TODAY, { heldBy: 'driton' })] });
    expect(orderTotals(o)).toMatchObject({ paid: 500000, inOffice: 420000, held: 80000, owed: 0 });
    expect(orderTotals({ ...o, stage: 'cancelled', payments: [] }).owed).toBe(0);
  });

  it('payment badges follow the deposit word rule', () => {
    const o = order({ payments: [pay(100000)] });
    expect(payStatus(o, orderTotals(o))).toBe('deposit');
    const done = { ...o, stage: 'done' as const, doneAt: TODAY };
    expect(payStatus(done, orderTotals(done))).toBe('partial');
    expect(payStatus(order(), orderTotals(order()))).toBe('unpaid');
  });
});

describe('the 800€ case', () => {
  const base = order({ stage: 'done', doneAt: TODAY, payTerm: 'week', dueDate: d(7), payments: [pay(420000, d(-52))] });
  const withDriton = { ...base, payments: [...base.payments, pay(80000, TODAY, { heldBy: 'driton' })] };

  it('recorded "Te montuesi": owed 0€, money in the office unchanged', () => {
    const t = orderTotals(withDriton);
    expect(t.owed).toBe(0);
    expect(t.held).toBe(80000);
    expect(t.inOffice).toBe(420000);
  });

  it('Konfirmo moves the 800€ into the office', () => {
    const confirmed = { ...withDriton, payments: withDriton.payments.map(p => (p.heldBy ? { ...p, handedAt: new Date() } : p)) };
    expect(orderTotals(confirmed)).toMatchObject({ owed: 0, held: 0, inOffice: 500000 });
  });

  it('cash not handed over for weeks never becomes the customer’s debt again', () => {
    const weeks = { ...withDriton, payments: [pay(420000, d(-80)), pay(80000, d(-40), { heldBy: 'driton' })] };
    const t = orderTotals(weeks);
    expect(t.owed).toBe(0);
    expect(debts([book(weeks)], [], d(60))).toHaveLength(0);
    // Only editing or deleting the payment changes that.
    const deleted = { ...weeks, payments: [weeks.payments[0], { ...weeks.payments[1], deletedAt: new Date() }] };
    expect(orderTotals(deleted).owed).toBe(80000);
  });
});

describe('projects: owed now = installed value − paid', () => {
  // Spec example: 25,000€ for 100 doors (250€ each), 5,000€ avans.
  const proj = (visits: VisitRec[], payments = [pay(500000, d(-60))]) =>
    order({ price: 2500000, quantity: 100, projectPayTerm: 'month', visits, payments });

  it('after 15 doors: owed 0€, paid ahead 1,250€', () => {
    const t = orderTotals(proj([part(5, d(-50)), part(10, d(-40))]));
    expect(t).toMatchObject({ earned: 375000, owed: 0, paidAhead: 125000, dueDate: null });
  });

  it('after 40 doors: owed 5,000€, late from the part that took the value past 5,000€', () => {
    const visits = [part(15, d(-60)), part(10, d(-45)), part(15, d(-35))];
    const t = orderTotals(proj(visits));
    expect(t.earned).toBe(1000000);
    expect(t.owed).toBe(500000);
    // Parts: 3,750€ (due −30), 2,500€ (due −15) → the 5,000€ is used up inside the second part.
    expect(t.dueDate).toBe(d(-15));
    expect(lateDays(t, TODAY)).toBe(15);
  });

  it('after a 4,000€ payment: owed 1,000€', () => {
    const visits = [part(15, d(-60)), part(10, d(-45)), part(15, d(-35))];
    const t = orderTotals(proj(visits, [pay(500000, d(-60)), pay(400000, d(-2))]));
    expect(t.owed).toBe(100000);
    expect(t.dueDate).toBe(d(-5)); // the third part (−35 + 30 days)
  });

  it('a value override counts instead of quantity × unit price', () => {
    const t = orderTotals(proj([part(2, d(-1), { value: 90000 })], []));
    expect(t.earned).toBe(90000);
  });

  it('done: the whole contract becomes payable, never more', () => {
    const o = { ...proj([part(40, d(-40))]), stage: 'done' as const, doneAt: TODAY, dueDate: d(30) };
    const t = orderTotals(o);
    expect(t.earned).toBe(2500000);
    expect(t.owed).toBe(2000000);
    expect(t.paidAhead).toBe(0);
  });
});

describe('opening balances', () => {
  it('a known due date can be overdue', () => {
    const t = openingTotals({ amount: 45000, dueDate: d(-60), payments: [] });
    expect(t.owed).toBe(45000);
    expect(lateDays(t, TODAY)).toBe(60);
  });

  it('"Nuk e di" → Afat i panjohur: in the total, not overdue', () => {
    const t = openingTotals({ amount: 110000, dueDate: null, payments: [pay(10000)] });
    expect(t.owed).toBe(100000);
    expect(t.dueUnknown).toBe(true);
    expect(isOverdue(t, TODAY)).toBe(false);
  });
});

describe('payment edit and delete change the balance', () => {
  it('the room for an edited payment includes its own amount', () => {
    const p = pay(50000);
    const o = order({ stage: 'done', doneAt: d(-5), dueDate: d(2), payTerm: 'week', price: 180000, payments: [p] });
    const t = orderTotals(o);
    expect(paymentRoom(t)).toBe(130000);
    expect(paymentRoom(t, p)).toBe(180000);
    expect(orderTotals({ ...o, payments: [{ ...p, amount: 60000 }] }).owed).toBe(120000);
    expect(orderTotals({ ...o, payments: [{ ...p, deletedAt: new Date() }] }).owed).toBe(180000);
  });
});

/* ───────── debts list, cash and the Sot headline ───────── */
function book(o: OrderRec, extra: Partial<BookOrder> = {}): BookOrder {
  return {
    ...o,
    id: `o${++n}`,
    number: `2026-${String(n).padStart(3, '0')}`,
    productType: 'Kuzhinë',
    unit: o.quantity ? 'copë' : null,
    remainingWork: null,
    pausedUntil: null,
    pauseReason: null,
    client: { id: 'c', name: 'Klient', phone: '+38344000000', channel: 'whatsapp', noReminders: false },
    messages: [],
    payments: o.payments.map(p => ({ method: 'cash', ...p })),
    ...extra,
  };
}
const opening = (o: Partial<BookOpening>): BookOpening => ({
  id: `ob${++n}`,
  name: 'Blerim',
  phone: '',
  channel: 'whatsapp',
  forWhat: '',
  dueApprox: false,
  noReminders: false,
  pausedUntil: null,
  pauseReason: null,
  messages: [],
  amount: 45000,
  dueDate: null,
  payments: [],
  ...o,
});

describe('Borxhet', () => {
  const overdue = book(order({ stage: 'done', doneAt: d(-40), payTerm: 'week', dueDate: d(-33), price: 180000 }));
  const inTerm = book(order({ stage: 'done', doneAt: d(-2), payTerm: 'week', dueDate: d(5), price: 90000 }));
  const unknown = opening({ amount: 110000, dueDate: null });
  const known = opening({ amount: 45000, dueDate: d(-60) });
  const rows = debts([overdue, inTerm], [unknown, known], TODAY);

  it('three groups, sorted by amount or by days late', () => {
    const g = groupDebts(rows);
    expect(g.overdue.map(r => r.amount)).toEqual([180000, 45000]);
    expect(g.unknown.map(r => r.amount)).toEqual([110000]);
    expect(g.upcoming.map(r => r.amount)).toEqual([90000]);
    expect(groupDebts(rows, 'late').overdue.map(r => r.late)).toEqual([60, 33]);
  });

  it('status line: cash with an installer comes first, then the reminder flags', () => {
    const o = book(order({ stage: 'done', doneAt: d(-3), dueDate: d(4), price: 100000, payments: [pay(20000, d(-3), { heldBy: 'faton' })] }), {
      pausedUntil: d(5),
      pauseReason: 'Premtoi',
      client: { id: 'c', name: 'X', phone: '', channel: 'whatsapp', noReminders: true },
    });
    const [r] = debts([o], [], TODAY);
    expect(r.contexts.map(c => c.kind)).toEqual(['held', 'noReminders', 'paused']);
  });

  it('the Sot headline splits the money not yet in the office', () => {
    const cash = cashWithInstallers(
      [book(order({ stage: 'done', doneAt: d(-20), payments: [pay(120000, d(-24), { heldBy: 'faton' })], price: 120000 }))],
      [],
      [{ id: 'faton', name: 'Faton' }],
      TODAY,
    );
    expect(cash).toHaveLength(1);
    expect(cash[0]).toMatchObject({ name: 'Faton', sum: 120000 });
    expect(cash[0].items[0].days).toBe(24);
    const h = headline(rows, cash[0].sum);
    expect(h).toMatchObject({ total: 425000, overdueSum: 225000, upcomingSum: 90000, unknownSum: 110000, cashSum: 120000 });
  });
});
