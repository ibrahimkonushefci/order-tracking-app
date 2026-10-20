/**
 * Visits and "Punët e montuesve" (spec §5), ported from the prototype's logic.js:
 * time labels and order, what happened in the past and nobody marked, the next visit,
 * installer load per day (planned and done, the visit being edited excluded) and the
 * per-installer summary. Pure functions; dates are yyyy-MM-dd.
 */
import { addDays } from '@/lib/dates';
import { isHeld, isProject, activePayments, orderTotals, type OrderRec, type PaymentRec } from './balances';

export type VisitType = 'measure' | 'install' | 'delivery' | 'repair';
export const VISIT_TYPES: readonly VisitType[] = ['measure', 'install', 'delivery', 'repair'];

export interface VisitLite {
  id: string;
  type: VisitType;
  date: string;
  /** 'morning' | 'afternoon' | 'HH:MM' | null */
  time: string | null;
  installerId: string | null;
  doneAt: string | null;
  quantity: number | null;
  value: number | null;
  note?: string;
  lastSentAt?: Date | string | null;
}

/** An order with its visits, as the schedule needs it. */
export interface VisitOrder extends OrderRec {
  id: string;
  number: string;
  city: string;
  unit: string | null;
  client: { name: string };
  visits: VisitLite[];
}

export interface Job<O extends VisitOrder = VisitOrder> {
  o: O;
  v: O['visits'][number];
}

/** A sortable time: "paradite" before 08:30 < 12:30 (no time) < "pasdite" 13:00. */
const timeKey = (t: string | null) => (!t ? '12:30' : t === 'morning' ? '08:00' : t === 'afternoon' ? '13:00' : t);
export const visitSort = (a: Pick<VisitLite, 'date' | 'time'>, b: Pick<VisitLite, 'date' | 'time'>) => (a.date + timeKey(a.time)).localeCompare(b.date + timeKey(b.time));


/** Visit types where installers usually take the rest of the money. */
export const collectsCash = (v: Pick<VisitLite, 'type'>) => v.type === 'install' || v.type === 'delivery';

/** "Mblidh €X": only normal orders, only what remains of the agreed price. */
export const toCollect = (o: OrderRec) => (isProject(o) ? 0 : Math.max(0, orderTotals(o).remaining));

/** Every visit of the orders that are not cancelled, in time order. */
export function allJobs<O extends VisitOrder>(orders: O[]): Job<O>[] {
  const out: Job<O>[] = [];
  for (const o of orders) if (o.stage !== 'cancelled') for (const v of o.visits) out.push({ o, v });
  return out.sort((a, b) => visitSort(a.v, b.v));
}

export const jobsOnDay = <O extends VisitOrder>(jobs: Job<O>[], date: string) => jobs.filter(x => x.v.date === date);

/** Planned visits from the last two weeks that nobody marked done. */
export const pastUndone = <O extends VisitOrder>(jobs: Job<O>[], today: string) =>
  jobs.filter(x => !x.v.doneAt && x.v.date < today && x.v.date >= addDays(today, -14));

export const nextVisit = <V extends VisitLite>(visits: V[], today: string): V | null =>
  visits.filter(v => !v.doneAt && v.date >= today).sort(visitSort)[0] ?? null;

/** A visit that should have happened by now and isn't marked done (the primary button on the order). */
export const dueVisit = <V extends VisitLite>(visits: V[], today: string): V | null =>
  visits.filter(v => !v.doneAt && v.date <= today).sort(visitSort)[0] ?? null;

/** Every visit an installer has on a date, planned or done, except the one being edited. */
export const jobsOf = <O extends VisitOrder>(jobs: Job<O>[], installerId: string, date: string, exceptId?: string | null) =>
  jobs.filter(x => x.v.installerId === installerId && x.v.date === date && x.v.id !== exceptId);

/** Free (green), one job, or busy (amber from two jobs). Never blocks saving. */
export const loadTone = (n: number) => (n === 0 ? 'free' : n === 1 ? 'one' : 'busy');

/** Load per installer per day for the 7-day "Disponueshmëria" grid. */
export function availability<O extends VisitOrder>(jobs: Job<O>[], installerIds: string[], today: string, days = 7) {
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i));
  return {
    dates,
    rows: installerIds.map(id => ({ installerId: id, counts: dates.map(d => jobsOf(jobs, id, d).length) })),
  };
}

export interface InstallerSummary {
  upcoming: Job[];
  unmarked: Job[];
  done: Record<VisitType, number>;
  doneTotal: number;
  /** Project units installed, by unit ("18 banesa", "40 copë"). */
  units: Record<string, number>;
  /** Cash taken from customers and not handed over. */
  held: number;
}

/** "Përmbledhja e montuesve": Në pritje, Të kryera, Para në dorë. */
export function installerSummary(
  jobs: Job[],
  installerId: string,
  payments: PaymentRec[],
  today: string,
): InstallerSummary {
  const mine = jobs.filter(x => x.v.installerId === installerId);
  const done: Record<VisitType, number> = { install: 0, delivery: 0, measure: 0, repair: 0 };
  const units: Record<string, number> = {};
  for (const { o, v } of mine)
    if (v.doneAt) {
      done[v.type]++;
      if (v.quantity) units[o.unit ?? ''] = (units[o.unit ?? ''] ?? 0) + v.quantity;
    }
  const held = activePayments(payments)
    .filter(p => isHeld(p) && p.heldBy === installerId)
    .reduce((s, p) => s + p.amount, 0);
  return {
    upcoming: mine.filter(x => !x.v.doneAt && x.v.date >= today),
    unmarked: mine.filter(x => !x.v.doneAt && x.v.date < today),
    done,
    doneTotal: Object.values(done).reduce((a, b) => a + b, 0),
    units,
    held,
  };
}

/** Albanian definite form of a first name for "Dritoni ka 2 punë": Dritoni, Besniku, Besa. */
export const definite = (n: string) => (/[kgh]$/.test(n) ? n + 'u' : /[aeë]$/.test(n) ? n : n + 'i');

/** Dative for "Dërgo Dritonit": Dritonit, Besnikut, Besës. */
export const dative = (n: string) => (/[kgh]$/.test(n) ? n + 'ut' : /a$/.test(n) ? n.slice(0, -1) + 'ës' : /[eë]$/.test(n) ? n + 's' : /i$/.test(n) ? n + 't' : n + 'it');
