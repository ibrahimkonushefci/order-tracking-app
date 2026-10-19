/**
 * Business rules for money (spec §4 "Payments & debts"), ported from the approved
 * prototype's logic.js. Pure functions on plain records, so the same code serves
 * the screens, the export and the tests. Money is integer cents; dates are yyyy-MM-dd.
 */
import { addDays, diffDays } from '@/lib/dates';
import type { PayTerm, Stage } from '@/db/schema';

export interface PaymentRec {
  id: string;
  amount: number;
  date: string;
  /** Installer holding the cash; null = in the office. */
  heldBy: string | null;
  /** Set when the owner confirmed the cash reached the office. */
  handedAt: Date | string | null;
  deletedAt?: Date | string | null;
}

export interface VisitRec {
  id: string;
  type: 'measure' | 'install' | 'delivery' | 'repair';
  date: string;
  installerId: string | null;
  doneAt: string | null;
  /** Project parts: quantity installed and an optional value override. */
  quantity: number | null;
  value: number | null;
}

export interface OrderRec {
  price: number;
  stage: Stage;
  doneAt: string | null;
  /** Normal order: the term chosen when it was marked done, and the due date it set. */
  payTerm: PayTerm | null;
  dueDate: string | null;
  /** Multi-unit project: quantity + unit (null for normal orders) and the term for each part. */
  quantity: number | null;
  projectPayTerm: Exclude<PayTerm, 'date'> | null;
  payments: PaymentRec[];
  visits: VisitRec[];
}

export interface OpeningRec {
  amount: number;
  /** null = "Afat i panjohur". */
  dueDate: string | null;
  payments: PaymentRec[];
}

export interface Totals {
  total: number;
  /** Everything the customer handed over (in the office + with installers). */
  paid: number;
  /** Still with an installer, not handed over. */
  held: number;
  inOffice: number;
  /** total − paid (what is left of the contract). */
  remaining: number;
  /** Value that has become payable so far (installed parts, or everything once done). */
  earned: number;
  /** "Për t'u paguar tani". */
  owed: number;
  /** Project only: paid more than the installed value. Not debt. */
  paidAhead: number;
  dueDate: string | null;
  dueUnknown: boolean;
}

export const TERM_DAYS = { week: 7, month: 30 } as const;

/** The due date a term gives, counted from the day the work (or a part) was done. */
export function termDue(from: string, term: PayTerm | null, date?: string | null): string | null {
  if (term === 'date') return date ?? null;
  if (term === 'week' || term === 'month') return addDays(from, TERM_DAYS[term]);
  return null;
}

export const isProject = (o: Pick<OrderRec, 'quantity'>) => o.quantity != null && o.quantity > 0;
export const activePayments = <P extends PaymentRec>(ps: P[]) => ps.filter(p => !p.deletedAt);
export const isHeld = (p: PaymentRec) => !!p.heldBy && !p.handedAt;

/** paid = office + installers; held = with an installer and not confirmed. Deleted payments don't count. */
export function paidOf(payments: PaymentRec[]) {
  let paid = 0;
  let held = 0;
  for (const p of activePayments(payments)) {
    paid += p.amount;
    if (isHeld(p)) held += p.amount;
  }
  return { paid, held, inOffice: paid - held };
}

/** Contract ÷ quantity, rounded to the cent. */
export const unitPrice = (o: Pick<OrderRec, 'price' | 'quantity'>) => Math.round(o.price / (o.quantity || 1));

/** Installed parts of a project: done visits with a quantity, oldest first. */
export function parts(o: Pick<OrderRec, 'visits'>) {
  return o.visits
    .filter(v => v.doneAt && (v.quantity ?? 0) > 0)
    .sort((a, b) => a.doneAt!.localeCompare(b.doneAt!));
}

export const partValue = (o: Pick<OrderRec, 'price' | 'quantity'>, v: VisitRec) =>
  v.value != null ? v.value : (v.quantity ?? 0) * unitPrice(o);

export const installedQty = (o: Pick<OrderRec, 'visits'>) => parts(o).reduce((s, v) => s + (v.quantity ?? 0), 0);

/**
 * What the customer owes right now, and since when.
 * - Normal order: nothing until it is done; then price − paid, due by the chosen term.
 * - Project: value of installed parts − paid (the whole contract once done).
 *   Payments cover the oldest parts first; the oldest part not yet paid sets the due date.
 * - Cancelled: out of every total.
 */
export function orderTotals(o: OrderRec): Totals {
  const { paid, held, inOffice } = paidOf(o.payments);
  const total = o.price;
  const chunks: { value: number; due: string | null }[] = [];
  if (o.stage !== 'cancelled') {
    if (isProject(o)) {
      for (const v of parts(o)) chunks.push({ value: partValue(o, v), due: termDue(v.doneAt!, o.projectPayTerm) });
      const sum = chunks.reduce((s, c) => s + c.value, 0);
      if (o.stage === 'done' && total > sum)
        chunks.push({ value: total - sum, due: o.dueDate ?? termDue(o.doneAt!, o.projectPayTerm) });
    } else if (o.stage === 'done') {
      chunks.push({ value: total, due: o.dueDate ?? termDue(o.doneAt!, o.payTerm) });
    }
  }
  // The contract is the ceiling until the owner edits it.
  let earned = 0;
  for (const c of chunks) {
    c.value = Math.max(0, Math.min(c.value, total - earned));
    earned += c.value;
  }
  let left = paid;
  let dueDate: string | null = null;
  let found = false;
  for (const c of chunks) {
    const covered = Math.min(c.value, Math.max(0, left));
    left -= covered;
    if (covered < c.value && !found) {
      dueDate = c.due;
      found = true;
    }
  }
  const owed = o.stage === 'cancelled' ? 0 : Math.max(0, earned - paid);
  return {
    total,
    paid,
    held,
    inOffice,
    remaining: total - paid,
    earned,
    owed,
    paidAhead: isProject(o) && o.stage !== 'done' && o.stage !== 'cancelled' ? Math.max(0, paid - earned) : 0,
    dueDate: owed > 0 ? dueDate : null,
    dueUnknown: owed > 0 && !dueDate,
  };
}

export function openingTotals(ob: OpeningRec): Totals {
  const { paid, held, inOffice } = paidOf(ob.payments);
  const owed = Math.max(0, ob.amount - paid);
  return {
    total: ob.amount,
    paid,
    held,
    inOffice,
    remaining: ob.amount - paid,
    earned: ob.amount,
    owed,
    paidAhead: 0,
    dueDate: owed > 0 ? ob.dueDate : null,
    dueUnknown: owed > 0 && !ob.dueDate,
  };
}

/** Days past the due date (> 0 = overdue), or null without a known due date. */
export function lateDays(t: Pick<Totals, 'owed' | 'dueDate'>, today: string): number | null {
  return t.owed > 0 && t.dueDate ? diffDays(today, t.dueDate) : null;
}

export const isOverdue = (t: Pick<Totals, 'owed' | 'dueDate'>, today: string) => (lateDays(t, today) ?? 0) > 0;

/** Payment badge on a normal order: Pa paguar / Avans|Kapar / Pjesërisht / Paguar. */
export function payStatus(o: Pick<OrderRec, 'stage'>, t: Totals): 'unpaid' | 'deposit' | 'partial' | 'paid' {
  if (t.paid <= 0) return 'unpaid';
  if (t.remaining <= 0) return 'paid';
  return o.stage === 'done' ? 'partial' : 'deposit';
}

/**
 * The most a new (or edited) payment may be: what is left of the contract or the debt.
 * Editing a payment frees its own amount first. A project may be paid ahead of installation.
 */
export function paymentRoom(t: Totals, editing?: PaymentRec | null): number {
  return Math.max(0, t.remaining) + (editing && !editing.deletedAt ? editing.amount : 0);
}
