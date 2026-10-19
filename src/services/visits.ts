/**
 * Visits (spec §5): Matje, Montim, Dërgesë, Riparim with an optional time and installer.
 * Planning, editing and removing a planned visit, and "U krye" in its four forms:
 * a measurement, a repair, a project part ("Sa u montuan?") and the €800 phone call
 * ("Montimi u krye": the payment, where the money is, and "Porosia është e kryer").
 */
import { and, desc, eq } from 'drizzle-orm';
import { isProject } from '@/domain/balances';
import { VISIT_TYPES, type VisitType } from '@/domain/visits';
import { history, installer, orders, visit } from '@/db/schema';
import type { Db } from '@/db/connect';
import { addDays, fmtDate } from '@/lib/dates';
import { allow, FieldError, log, NotFoundError, th, throwIf, tw, type Actor, type DbOrTx, type Tx } from './common';
import { checkInstaller, markDoneIn, mustLoad, recordPartIn, stageLabels, type DoneInput, type PartInput } from './orders';

export interface VisitInput {
  type: string;
  date: string;
  /** 'morning' | 'afternoon' | 'exact' | 'none' */
  time: string;
  exact?: string;
  /** An installer id, or '' / 'none'. */
  installerId?: string;
  note?: string;
}

const text = (v: unknown, max = 300) => String(v ?? '').trim().slice(0, max);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

async function nameOf(tx: DbOrTx, id: string | null) {
  if (!id) return tw('noInstaller');
  return (await tx.select({ n: installer.name }).from(installer).where(eq(installer.id, id)))[0]?.n ?? '—';
}

const timeText = (t: string | null) => (!t ? '' : t === 'morning' ? tw('time.morning') : t === 'afternoon' ? tw('time.afternoon') : t);

async function describe(tx: DbOrTx, v: { type: VisitType; date: string; time: string | null; installerId: string | null }) {
  const time = timeText(v.time);
  return `${tw(`visit.${v.type}`)} · ${fmtDate(v.date)}${time ? ` · ${time}` : ''} · ${await nameOf(tx, v.installerId)}`;
}

function parseVisit(input: VisitInput) {
  const errors: FieldError[] = [];
  const type = VISIT_TYPES.find(t => t === input.type);
  if (!type) errors.push(new FieldError('type', 'visitTypeRequired'));
  const date = text(input.date, 10);
  if (!isDate(date)) errors.push(new FieldError('date', 'dateRequired'));
  let time: string | null = null;
  if (input.time === 'morning' || input.time === 'afternoon') time = input.time;
  else if (input.time === 'exact') {
    const e = text(input.exact, 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(e)) errors.push(new FieldError('exact', 'timeInvalid'));
    else time = e;
  }
  throwIf(errors);
  const inst = input.installerId && input.installerId !== 'none' ? input.installerId : null;
  return { type: type!, date, time, installerId: inst, note: text(input.note) };
}

/** "Planifiko vizitë" / "Ndrysho vizitën" (both roles). Changing a sent visit clears "dërguar". */
export async function saveVisit(db: Db, actor: Actor, orderId: string, visitId: string | null, input: VisitInput) {
  allow(actor, 'daily');
  const v = parseVisit(input);
  return db.transaction(async tx => {
    const o = await mustLoad(tx, actor, orderId);
    if (o.stage === 'cancelled') throw new FieldError('date', 'cancelled');
    if (v.installerId) await checkInstaller(tx, actor, v.installerId);
    if (!visitId) {
      const [row] = await tx.insert(visit).values({ companyId: actor.companyId, orderId, ...v }).returning();
      await log(tx, actor, 'order', orderId, th('visitPlanned', { visit: await describe(tx, row) }));
      return row;
    }
    const old = o.visits.find(x => x.id === visitId);
    if (!old) throw new NotFoundError('visit');
    if (old.doneAt) throw new FieldError('date', 'visitDone');
    const before = await describe(tx, old);
    const after = await describe(tx, v);
    const changed = before !== after || old.note !== v.note;
    const [row] = await tx
      .update(visit)
      .set({ ...v, lastSentAt: changed ? null : old.lastSentAt })
      .where(eq(visit.id, visitId))
      .returning();
    if (before !== after) await log(tx, actor, 'order', orderId, th('visitChanged', { from: before, to: after }));
    else if (old.note !== v.note) await log(tx, actor, 'order', orderId, th('visitNote', { visit: after }));
    return row;
  });
}

/** "Hiq vizitën": a planned visit that won't happen (both roles). Done visits are corrected, not removed here. */
export async function removeVisit(db: Db, actor: Actor, orderId: string, visitId: string) {
  allow(actor, 'daily');
  await db.transaction(async tx => {
    const o = await mustLoad(tx, actor, orderId);
    const v = o.visits.find(x => x.id === visitId);
    if (!v) throw new NotFoundError('visit');
    if (v.doneAt) throw new FieldError('date', 'visitDone');
    await tx.delete(visit).where(eq(visit.id, visitId));
    await log(tx, actor, 'order', orderId, th('visitRemoved', { visit: await describe(tx, v) }));
  });
}

export interface VisitDoneInput extends Omit<DoneInput, 'pay'> {
  pay: 'no' | 'all' | 'part';
  /** Project visit: "Sa u montuan?", an optional value, "Projekti përfundoi". */
  quantity?: string;
  value?: string;
  finish?: boolean;
  /** Normal job: "Porosia është e kryer" (pre-checked). */
  close?: boolean;
  /** Repair: "Puna u përfundua" clears "Ka punë të mbetura". */
  finishRemaining?: boolean;
  note?: string;
}

/**
 * "U krye" on a visit. The visit is marked done today; for a normal installation or
 * delivery the €800 sheet runs in the same transaction, so the customer's payment, the
 * cash with the installer and the stage change are one step.
 */
export async function completeVisit(db: Db, actor: Actor, orderId: string, visitId: string, input: VisitDoneInput, today: string) {
  allow(actor, 'daily');
  return db.transaction(async tx => {
    const o = await mustLoad(tx, actor, orderId);
    const v = o.visits.find(x => x.id === visitId);
    if (!v) throw new NotFoundError('visit');
    if (v.doneAt) throw new FieldError('pay', 'visitDone');
    if (o.stage === 'cancelled') throw new FieldError('pay', 'cancelled');
    const who = v.installerId ? ` · ${await nameOf(tx, v.installerId)}` : '';

    if (isProject(o) && (v.type === 'install' || v.type === 'delivery')) {
      const part: PartInput = { quantity: input.quantity ?? '', value: input.value, pay: input.pay === 'no' ? 'no' : 'part', amount: input.amount, method: input.method, holder: input.holder, finish: input.finish, date: today };
      const r = await recordPartIn(tx, actor, orderId, part, today, visitId);
      return { kind: 'part' as const, ...r };
    }
    if (v.type === 'measure' || v.type === 'repair' || isProject(o)) {
      const note = text(input.note);
      await tx
        .update(visit)
        .set({ doneAt: today, note: note ? (v.note ? `${v.note} · ${note}` : note) : v.note })
        .where(eq(visit.id, visitId));
      await log(tx, actor, 'order', orderId, th('visitDone', { what: tw(`visitDone.${v.type}`), who, note: note ? ` · ${note}` : '' }));
      if (v.type === 'repair' && input.finishRemaining && o.remainingWork) await clearRemaining(tx, actor, o, visitId);
      if (v.type === 'repair') return { kind: 'repair' as const };
      return { kind: 'measure' as const };
    }
    await tx.update(visit).set({ doneAt: today }).where(eq(visit.id, visitId));
    await log(tx, actor, 'order', orderId, th('visitDone', { what: tw(`visitDone.${v.type}`), who, note: '' }));
    const r = await markDoneIn(tx, actor, orderId, { ...input, close: input.close ?? true }, today);
    return { kind: 'job' as const, ...r };
  });
}

/* ───────── Correcting a visit marked done ───────── */

export interface DoneVisitEditInput {
  /** The day it was done (yyyy-MM-dd, not in the future). */
  date: string;
  /** An installer id, or '' / 'none'. */
  installerId?: string;
  note?: string;
}

/** An ordinary visit marked done; project parts (with a quantity) are corrected in "Montimet e kryera". */
async function mustLoadDone(tx: DbOrTx, actor: Actor, orderId: string, visitId: string) {
  const o = await mustLoad(tx, actor, orderId);
  const v = o.visits.find(x => x.id === visitId);
  if (!v || !v.doneAt || v.quantity) throw new NotFoundError('visit');
  if (o.stage === 'cancelled') throw new FieldError('date', 'cancelled');
  return { o, v };
}

/**
 * "Ndrysho" on a done visit (both roles, like any edit): the day it was done, the installer
 * and the note. The visit moves to that day in Orari and in the installer's summary.
 * Payments and the order's stage are not touched.
 */
export async function editDoneVisit(db: Db, actor: Actor, orderId: string, visitId: string, input: DoneVisitEditInput, today: string) {
  allow(actor, 'edit');
  return db.transaction(async tx => {
    const { v } = await mustLoadDone(tx, actor, orderId, visitId);
    const errors: FieldError[] = [];
    const date = text(input.date, 10);
    if (!isDate(date)) errors.push(new FieldError('date', 'dateRequired'));
    else if (date > today) errors.push(new FieldError('date', 'dateFuture'));
    const inst = input.installerId && input.installerId !== 'none' ? input.installerId : null;
    if (inst) {
      try {
        await checkInstaller(tx, actor, inst);
      } catch (e) {
        if (!(e instanceof FieldError)) throw e;
        errors.push(e);
      }
    }
    throwIf(errors);
    const note = text(input.note);
    const before = `${tw(`visit.${v.type}`)} · ${fmtDate(v.doneAt)} · ${await nameOf(tx, v.installerId)}`;
    const after = `${tw(`visit.${v.type}`)} · ${fmtDate(date)} · ${await nameOf(tx, inst)}`;
    if (before === after && note === v.note) return { changed: 0 };
    await tx.update(visit).set({ date, doneAt: date, installerId: inst, note }).where(eq(visit.id, visitId));
    if (before !== after) await log(tx, actor, 'order', orderId, th('doneVisitChanged', { from: before, to: after }), { field: 'visit', old: `${v.installerId ?? ''}@${v.doneAt}`, new: `${inst ?? ''}@${date}` });
    if (note !== v.note) await log(tx, actor, 'order', orderId, th('visitNote', { visit: after }));
    return { changed: 1 };
  });
}

/** What "Puna u përfundua" on a repair cleared, kept on its history line so "Nuk u krye" can put it back. */
const CLEARED = 'repairCleared';
export interface RepairCleared {
  note: string;
  /** The "Punë të mbetura" pause it lifted, if any. */
  until: string | null;
}

/** The unfinished work this repair visit cleared when it was marked done (the latest time), or null. */
export async function repairCleared(db: DbOrTx, companyId: string, orderId: string, visitId: string): Promise<RepairCleared | null> {
  const rows = await db
    .select({ old: history.oldValue })
    .from(history)
    .where(and(eq(history.companyId, companyId), eq(history.recordType, 'order'), eq(history.recordId, orderId), eq(history.field, CLEARED)))
    .orderBy(desc(history.at));
  for (const r of rows) {
    try {
      const c = JSON.parse(r.old ?? '') as { visit?: string; note?: string; until?: string | null };
      if (c.visit === visitId && c.note) return { note: c.note, until: c.until ?? null };
    } catch {
      /* not ours */
    }
  }
  return null;
}

export interface ReopenVisitInput {
  /** Installation/delivery on a done order: the order goes back to active too. */
  reopenOrder?: boolean;
  /** Repair on a done order: "Ka ende punë të mbetura" with its note, and the reminder pause. */
  restoreRemaining?: boolean;
  remainingNote?: string;
  pause?: boolean;
}

/**
 * "Nuk u krye" on a visit marked done by mistake (both roles): it becomes planned again on
 * its date (a past date shows under "Nga ditët e kaluara"). Payments are never touched: a
 * payment recorded with it stays until it is edited or deleted in "Pagesat", so marking the
 * visit done again only offers what is still left. With `reopenOrder`, a done order goes
 * back to the active stage, exactly like the stage control. With `restoreRemaining`, a repair
 * puts "Ka punë të mbetura" back (the note it cleared, editable) and, with `pause`, the
 * reminder pause: until its old date if that is still ahead, else 14 days, as when it is set.
 * Remaining work or a pause set since then is kept as it is.
 */
export async function reopenVisit(db: Db, actor: Actor, orderId: string, visitId: string, input: ReopenVisitInput, today: string) {
  allow(actor, 'edit');
  return db.transaction(async tx => {
    const { o, v } = await mustLoadDone(tx, actor, orderId, visitId);
    const restore = !!input.restoreRemaining && v.type === 'repair' && o.stage === 'done' && !o.remainingWork;
    const note = text(input.remainingNote, 500);
    if (restore && !note) throw new FieldError('remainingNote', 'remainingRequired');
    await tx.update(visit).set({ doneAt: null }).where(eq(visit.id, visitId));
    await log(tx, actor, 'order', orderId, th('visitReopened', { visit: `${tw(`visit.${v.type}`)} · ${fmtDate(v.doneAt)} · ${await nameOf(tx, v.installerId)}` }), {
      field: 'visit',
      old: `done@${v.doneAt}`,
      new: 'planned',
    });
    const stage = !!input.reopenOrder && o.stage === 'done' && !isProject(o);
    if (stage) {
      const label = await stageLabels(tx, actor.companyId);
      await tx.update(orders).set({ stage: 'active', doneAt: null, payTerm: null, dueDate: null }).where(eq(orders.id, orderId));
      await log(tx, actor, 'order', orderId, th('stage', { from: label('done'), to: label('active') }), { field: 'stage', old: 'done', new: 'active' });
    }
    let paused = false;
    if (restore) {
      await tx.update(orders).set({ remainingWork: note }).where(eq(orders.id, orderId));
      await log(tx, actor, 'order', orderId, th('remaining', { note }), { field: 'remainingWork', old: null, new: note });
      if (input.pause && !(o.pausedUntil && o.pausedUntil >= today)) {
        const was = (await repairCleared(tx, actor.companyId, orderId, visitId))?.until;
        const until = was && was > today ? was : addDays(today, 14);
        const reason = tw('remainingReason');
        await tx.update(orders).set({ pausedUntil: until, pauseReason: reason }).where(eq(orders.id, orderId));
        await log(tx, actor, 'order', orderId, th('paused', { until: fmtDate(until), reason }));
        paused = true;
      }
    }
    return { reopenedOrder: stage, restoredRemaining: restore, paused };
  });
}

async function clearRemaining(tx: Tx, actor: Actor, o: { id: string; remainingWork: string | null; pausedUntil: string | null; pauseReason: string | null }, visitId: string) {
  const lifts = !!o.pausedUntil && o.pauseReason === tw('remainingReason');
  await tx.update(orders).set({ remainingWork: null }).where(eq(orders.id, o.id));
  await log(tx, actor, 'order', o.id, th('remainingDone', { note: o.remainingWork ?? '' }), {
    field: CLEARED,
    old: JSON.stringify({ visit: visitId, note: o.remainingWork, until: lifts ? o.pausedUntil : null }),
    new: null,
  });
  if (lifts) {
    await tx.update(orders).set({ pausedUntil: null, pauseReason: null }).where(eq(orders.id, o.id));
    await log(tx, actor, 'order', o.id, th('unpaused'));
  }
}
