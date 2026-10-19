/**
 * Borxhet, Para te montuesit and the Sot headline (spec §1, §2, §4), from the same
 * rules as the prototype. Rows carry structured data; the screens turn it into words.
 */
import { diffDays } from '@/lib/dates';
import {
  isHeld,
  isProject,
  installedQty,
  lateDays,
  openingTotals,
  orderTotals,
  activePayments,
  type OpeningRec,
  type OrderRec,
  type PaymentRec,
  type Totals,
} from './balances';

export interface ClientLite {
  id: string;
  name: string;
  phone: string;
  channel: 'whatsapp' | 'viber' | 'sms';
  noReminders: boolean;
}

export interface MessageLite {
  type: string;
  channel: 'whatsapp' | 'viber' | 'sms';
  sentAt: Date | string;
}

export interface BookOrder extends OrderRec {
  id: string;
  number: string;
  productType: string;
  unit: string | null;
  remainingWork: string | null;
  pausedUntil: string | null;
  pauseReason: string | null;
  client: ClientLite;
  messages: MessageLite[];
  payments: (PaymentRec & { method: string })[];
}

export interface BookOpening extends OpeningRec {
  id: string;
  name: string;
  phone: string;
  channel: 'whatsapp' | 'viber' | 'sms';
  forWhat: string;
  dueApprox: boolean;
  noReminders: boolean;
  pausedUntil: string | null;
  pauseReason: string | null;
  messages: MessageLite[];
  payments: (PaymentRec & { method: string })[];
}

export interface InstallerLite {
  id: string;
  name: string;
}

/** The one status line on a debt row: every context is computed, most decisive first. */
export type DebtContext =
  | { kind: 'held'; holders: { installerId: string; amount: number }[] }
  | { kind: 'noReminders' }
  | { kind: 'paused'; until: string; reason: string }
  | { kind: 'remaining'; note: string }
  | { kind: 'lastReminder'; at: string; channel: MessageLite['channel'] };

export interface DebtRow {
  kind: 'order' | 'opening';
  id: string;
  name: string;
  phone: string;
  channel: ClientLite['channel'];
  amount: number;
  totals: Totals;
  dueDate: string | null;
  late: number | null;
  overdue: boolean;
  unknownDue: boolean;
  dueApprox: boolean;
  contexts: DebtContext[];
  /** Normal order: number + product; project: number + "40 / 100 copë"; opening: what it was for. */
  order?: { number: string; productType: string; project: { installed: number; quantity: number; unit: string } | null; doneDays: number | null };
  opening?: { forWhat: string };
}

const tsIso = (t: Date | string) => (typeof t === 'string' ? t : t.toISOString()).slice(0, 10);

export function lastReminder(messages: MessageLite[]): MessageLite | null {
  return (
    messages
      .filter(m => m.type === 'reminder')
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0] ?? null
  );
}

function heldBy(payments: PaymentRec[]) {
  const by = new Map<string, number>();
  for (const p of activePayments(payments)) if (isHeld(p)) by.set(p.heldBy!, (by.get(p.heldBy!) ?? 0) + p.amount);
  return [...by].map(([installerId, amount]) => ({ installerId, amount }));
}

function contextsOf(
  r: { payments: PaymentRec[]; pausedUntil: string | null; pauseReason: string | null; messages: MessageLite[] },
  noReminders: boolean,
  remainingWork: string | null,
  today: string,
): DebtContext[] {
  const out: DebtContext[] = [];
  const holders = heldBy(r.payments);
  if (holders.length) out.push({ kind: 'held', holders });
  if (noReminders) out.push({ kind: 'noReminders' });
  if (r.pausedUntil && r.pausedUntil >= today) out.push({ kind: 'paused', until: r.pausedUntil, reason: r.pauseReason ?? '' });
  if (remainingWork) out.push({ kind: 'remaining', note: remainingWork });
  const last = lastReminder(r.messages);
  if (last) out.push({ kind: 'lastReminder', at: tsIso(last.sentAt), channel: last.channel });
  return out;
}

/** Everyone who owes money now: orders (cancelled excluded) and opening balances. */
export function debts(orders: BookOrder[], openings: BookOpening[], today: string): DebtRow[] {
  const rows: DebtRow[] = [];
  for (const o of orders) {
    if (o.stage === 'cancelled') continue;
    const t = orderTotals(o);
    if (t.owed <= 0) continue;
    const late = lateDays(t, today);
    rows.push({
      kind: 'order',
      id: o.id,
      name: o.client.name,
      phone: o.client.phone,
      channel: o.client.channel,
      amount: t.owed,
      totals: t,
      dueDate: t.dueDate,
      late,
      overdue: (late ?? 0) > 0,
      unknownDue: t.dueUnknown,
      dueApprox: false,
      contexts: contextsOf(o, o.client.noReminders, o.remainingWork, today),
      order: {
        number: o.number,
        productType: o.productType,
        project: isProject(o) ? { installed: installedQty(o), quantity: o.quantity!, unit: o.unit ?? '' } : null,
        doneDays: !isProject(o) && o.doneAt ? Math.max(0, diffDays(today, o.doneAt)) : null,
      },
    });
  }
  for (const ob of openings) {
    const t = openingTotals(ob);
    if (t.owed <= 0) continue;
    const late = lateDays(t, today);
    rows.push({
      kind: 'opening',
      id: ob.id,
      name: ob.name,
      phone: ob.phone,
      channel: ob.channel,
      amount: t.owed,
      totals: t,
      dueDate: t.dueDate,
      late,
      overdue: (late ?? 0) > 0,
      unknownDue: t.dueUnknown,
      dueApprox: ob.dueApprox,
      contexts: contextsOf(ob, ob.noReminders, null, today),
      opening: { forWhat: ob.forWhat },
    });
  }
  return rows;
}

/** The three groups of the debts list: "Me vonesë", "Afat i panjohur", "Ende në afat". */
export function groupDebts(rows: DebtRow[], sort: 'amount' | 'late' = 'amount') {
  const cmp =
    sort === 'late'
      ? (a: DebtRow, b: DebtRow) => (b.late ?? -1e9) - (a.late ?? -1e9) || b.amount - a.amount
      : (a: DebtRow, b: DebtRow) => b.amount - a.amount;
  const by = (f: (d: DebtRow) => boolean) => rows.filter(f).sort(cmp);
  return {
    overdue: by(d => d.overdue),
    unknown: by(d => d.unknownDue),
    upcoming: by(d => !d.overdue && !d.unknownDue),
  };
}

export const sumOf = (rows: { amount: number }[]) => rows.reduce((s, d) => s + d.amount, 0);

export interface CashItem {
  kind: 'order' | 'opening';
  recordId: string;
  name: string;
  number: string | null;
  payment: PaymentRec;
  days: number;
}

/** Cash an installer took from a customer and hasn't handed over yet, per installer, largest first. */
export function cashWithInstallers(orders: BookOrder[], openings: BookOpening[], installers: InstallerLite[], today: string) {
  const groups = new Map<string, { installerId: string; name: string; items: CashItem[]; sum: number }>();
  const add = (p: PaymentRec, item: Omit<CashItem, 'payment' | 'days'>) => {
    const id = p.heldBy!;
    const g = groups.get(id) ?? { installerId: id, name: installers.find(i => i.id === id)?.name ?? '—', items: [], sum: 0 };
    g.items.push({ ...item, payment: p, days: Math.max(0, diffDays(today, p.date)) });
    g.sum += p.amount;
    groups.set(id, g);
  };
  for (const o of orders)
    for (const p of activePayments(o.payments))
      if (isHeld(p)) add(p, { kind: 'order', recordId: o.id, name: o.client.name, number: o.number });
  for (const ob of openings)
    for (const p of activePayments(ob.payments))
      if (isHeld(p)) add(p, { kind: 'opening', recordId: ob.id, name: ob.name, number: null });
  for (const g of groups.values()) g.items.sort((a, b) => a.payment.date.localeCompare(b.payment.date));
  return [...groups.values()].sort((a, b) => b.sum - a.sum);
}

/** The Sot headline: where the money not yet in the office is (the stacked bar). */
export function headline(rows: DebtRow[], cashSum: number) {
  const overdue = rows.filter(d => d.overdue).sort((a, b) => b.amount - a.amount);
  return {
    total: sumOf(rows),
    overdue,
    overdueSum: sumOf(overdue),
    upcomingSum: sumOf(rows.filter(d => !d.overdue && !d.unknownDue)),
    unknownSum: sumOf(rows.filter(d => d.unknownDue)),
    cashSum,
  };
}
