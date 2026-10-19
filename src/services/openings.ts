/**
 * Opening balances ("Borxh i bartur", spec §4): debts from before the app. Not an
 * order: no stages, visits or tracking link, and no invented sale or payment history.
 */
import { and, eq } from 'drizzle-orm';
import { openingBalance, payment } from '@/db/schema';
import type { Db } from '@/db/connect';
import { openingTotals } from '@/domain/balances';
import { endOfMonth, fmtDate, fmtMonth } from '@/lib/dates';
import { fmtPhone } from '@/lib/phone';
import { eur, parseEur } from '@/lib/money';
import { loadOpening } from './book';
import { allow, FieldError, log, NotFoundError, th, throwIf, toE164, tw, type Actor, type DbOrTx } from './common';

export interface OpeningInput {
  name: string;
  phoneCc?: string;
  phone?: string;
  amount: string;
  forWhat?: string;
  /** "Kur u bë puna?": a date, a month or "nuk e di". */
  workMode?: 'date' | 'month' | 'unknown';
  workDate?: string;
  workMonth?: string;
  /** "Kur duhej paguar?" (a required decision): a date, approximately a month, or "Nuk e di". */
  dueMode?: 'date' | 'month' | 'unknown' | '';
  dueDate?: string;
  dueMonth?: string;
  note?: string;
}

const text = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const isMonth = (v: string) => /^\d{4}-\d{2}$/.test(v);

/** The form's fields → a validated record (shared by "Borxh i bartur" and "Ndrysho borxhin"). */
function parseOpening(input: OpeningInput, today: string) {
  const name = text(input.name, 120);
  const errors: FieldError[] = [];
  if (!name) errors.push(new FieldError('name', 'nameRequired'));
  const rawAmount = text(input.amount, 40);
  const amount = parseEur(rawAmount);
  if (!rawAmount) errors.push(new FieldError('amount', 'openingAmountRequired'));
  else if (amount == null || amount <= 0) errors.push(new FieldError('amount', 'amountInvalid'));
  let phone = '';
  if (text(input.phone)) {
    const p = toE164(input.phoneCc ?? '+383', input.phone!);
    if (!p) errors.push(new FieldError('phone', 'phoneInvalid'));
    else phone = p;
  }
  let dueDate: string | null = null;
  let dueApprox = false;
  if (input.dueMode === 'date') {
    if (!isDate(text(input.dueDate))) errors.push(new FieldError('dueDate', 'dateRequired'));
    else dueDate = text(input.dueDate);
  } else if (input.dueMode === 'month') {
    if (!isMonth(text(input.dueMonth))) errors.push(new FieldError('dueMonth', 'monthRequired'));
    else {
      dueDate = endOfMonth(text(input.dueMonth));
      dueApprox = true;
    }
  } else if (input.dueMode !== 'unknown') errors.push(new FieldError('dueMode', 'dueModeRequired'));
  let workDone = '';
  if (input.workMode === 'date') {
    const d = text(input.workDate);
    if (d && (!isDate(d) || d > today)) errors.push(new FieldError('workDate', isDate(d) ? 'dateFuture' : 'dateRequired'));
    else workDone = d;
  } else if (input.workMode === 'month' && isMonth(text(input.workMonth))) workDone = text(input.workMonth);
  return {
    errors,
    value: { name, phone, amount: amount ?? 0, forWhat: text(input.forWhat, 200), workDone, dueDate, dueApprox, note: text(input.note) },
  };
}

const dueWords = (dueDate: string | null, approx: boolean) =>
  dueDate ? (approx ? `≈ ${fmtMonth(dueDate.slice(0, 7))}` : fmtDate(dueDate)) : tw('dueUnknown');
const workWords = (w: string) => (isDate(w) ? fmtDate(w) : isMonth(w) ? fmtMonth(w) : '');

export async function createOpening(db: Db, actor: Actor, input: OpeningInput, today: string) {
  allow(actor, 'daily');
  const { errors, value: v } = parseOpening(input, today);
  throwIf(errors);

  return db.transaction(async tx => {
    const [ob] = await tx
      .insert(openingBalance)
      .values({ companyId: actor.companyId, ...v, createdBy: actor.id })
      .returning();
    const due = v.dueDate ? th('dueOn', { date: dueWords(v.dueDate, v.dueApprox) }) : tw('dueUnknown').toLowerCase();
    await log(tx, actor, 'opening', ob.id, th('openingCreated', { amount: eur(v.amount), due }));
    return ob;
  });
}

/**
 * "Ndrysho borxhin" (both roles): every field of a notebook line can be corrected, including
 * the amount and "Kur duhej paguar?" (a date can be changed or set back to "Nuk e di").
 * Payments stay as they are; the amount can't go below what was already paid.
 * Each change is one history line with old → new.
 */
export async function editOpening(db: Db, actor: Actor, id: string, input: OpeningInput, today: string) {
  allow(actor, 'edit');
  const { errors, value: v } = parseOpening(input, today);
  return db.transaction(async tx => {
    const ob = await mustLoad(tx, actor, id);
    const paid = openingTotals(ob).paid;
    if (v.amount > 0 && v.amount < paid) errors.push(new FieldError('amount', 'openingBelowPaid', { paid: eur(paid) }));
    throwIf(errors);
    const changes: { text: string; field?: string; old?: string | null; new?: string | null }[] = [];
    const diff = (key: 'client' | 'phone' | 'forWhat' | 'workDone', a: string, b: string) => {
      if (a !== b) changes.push({ text: th('change', { label: tw(`field.${key}`), from: a || '—', to: b || '—' }) });
    };
    diff('client', ob.name, v.name);
    diff('phone', fmtPhone(ob.phone), fmtPhone(v.phone));
    if (ob.amount !== v.amount)
      changes.push({ text: th('openingAmount', { from: eur(ob.amount), to: eur(v.amount) }), field: 'amount', old: String(ob.amount), new: String(v.amount) });
    diff('forWhat', ob.forWhat, v.forWhat);
    diff('workDone', workWords(ob.workDone), workWords(v.workDone));
    if (ob.dueDate !== v.dueDate || (!!ob.dueDate && ob.dueApprox !== v.dueApprox))
      changes.push({ text: th('openingDueChanged', { from: dueWords(ob.dueDate, ob.dueApprox), to: dueWords(v.dueDate, v.dueApprox) }), field: 'dueDate', old: ob.dueDate, new: v.dueDate });
    if (ob.note !== v.note) changes.push({ text: th('noteEditedLine') });
    if (!changes.length) return { changed: 0 };
    await tx.update(openingBalance).set(v).where(eq(openingBalance.id, id));
    for (const c of changes) await log(tx, actor, 'opening', id, c.text, c.field ? { field: c.field, old: c.old, new: c.new } : undefined);
    return { changed: changes.length };
  });
}

async function mustLoad(db: DbOrTx, actor: Actor, id: string) {
  const ob = await loadOpening(db, actor.companyId, id);
  if (!ob) throw new NotFoundError('opening');
  return ob;
}

/** "Vendos afatin": the owner remembered when it should have been paid. */
export async function setOpeningDue(db: Db, actor: Actor, id: string, due: string) {
  allow(actor, 'daily');
  if (!isDate(text(due))) throw new FieldError('due', 'dateRequired');
  await db.transaction(async tx => {
    const ob = await mustLoad(tx, actor, id);
    await tx.update(openingBalance).set({ dueDate: due, dueApprox: false }).where(eq(openingBalance.id, id));
    await log(tx, actor, 'opening', id, th('openingDue', { date: fmtDate(due), before: ob.dueDate ? fmtDate(ob.dueDate) : tw('dueUnknown').toLowerCase() }), {
      field: 'dueDate',
      old: ob.dueDate,
      new: due,
    });
  });
}

export async function setOpeningNoReminders(db: Db, actor: Actor, id: string, on: boolean) {
  allow(actor, 'daily');
  await db.transaction(async tx => {
    const ob = await mustLoad(tx, actor, id);
    if (ob.noReminders === on) return;
    await tx.update(openingBalance).set({ noReminders: on }).where(eq(openingBalance.id, id));
    await log(tx, actor, 'opening', id, th(on ? 'noRemindersOn' : 'noRemindersOff'));
  });
}

export async function pauseOpening(db: Db, actor: Actor, id: string, input: { until: string; reason: string }, today: string) {
  allow(actor, 'daily');
  const until = text(input.until, 10);
  const reason = text(input.reason, 200);
  if (!isDate(until) || until <= today) throw new FieldError('until', 'dateAfterToday');
  if (!reason) throw new FieldError('reason', 'reasonRequired');
  await db.transaction(async tx => {
    await mustLoad(tx, actor, id);
    await tx.update(openingBalance).set({ pausedUntil: until, pauseReason: reason }).where(eq(openingBalance.id, id));
    await log(tx, actor, 'opening', id, th('paused', { until: fmtDate(until), reason }));
  });
}

export async function unpauseOpening(db: Db, actor: Actor, id: string) {
  allow(actor, 'daily');
  await db.transaction(async tx => {
    const ob = await mustLoad(tx, actor, id);
    if (!ob.pausedUntil) return;
    await tx.update(openingBalance).set({ pausedUntil: null, pauseReason: null }).where(eq(openingBalance.id, id));
    await log(tx, actor, 'opening', id, th('unpaused'));
  });
}

/** "Fshij borxhin" (e.g. added twice): Pronari only, and only without payments (delete those first). */
export async function deleteOpening(db: Db, actor: Actor, id: string) {
  allow(actor, 'delete');
  await db.transaction(async tx => {
    const ob = await mustLoad(tx, actor, id);
    if (ob.payments.some(p => !p.deletedAt)) throw new FieldError('confirm', 'openingHasPayments');
    await tx.delete(payment).where(and(eq(payment.openingId, id)));
    await tx.delete(openingBalance).where(eq(openingBalance.id, id));
    await log(tx, actor, 'opening', id, th('openingDeleted', { name: ob.name, amount: eur(ob.amount) }));
  });
}
