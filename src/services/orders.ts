/**
 * Orders (spec §3): the five-field form, three stages by key, "E kryer" with the
 * payment term, multi-unit projects, remaining work, pauses, edits and deletes.
 * Every change writes one history line.
 */
import { and, desc, eq } from 'drizzle-orm';
import { installedQty, isProject, orderTotals, partValue, termDue, unitPrice } from '@/domain/balances';
import { client, company, history, installer, orders, payment, visit, type PayTerm, type Stage } from '@/db/schema';
import { addDays, fmtDate } from '@/lib/dates';
import { eur, parseEur } from '@/lib/money';
import { loadOrder, type FullOrder } from './book';
import { allow, check, FieldError, log, newToken, NotFoundError, th, throwIf, toE164, tw, type Actor, type DbOrTx, type Tx } from './common';
import type { Db } from '@/db/connect';
import { insertPayment, type Holder } from './payments';

export const UNITS = ['copë', 'm²', 'banesa'] as const;
export const METHODS = ['cash', 'bank', 'card'] as const;
export type Method = (typeof METHODS)[number];

export async function stageLabels(db: DbOrTx, companyId: string) {
  const [c] = await db.select({ stageLabels: company.stageLabels }).from(company).where(eq(company.id, companyId)).limit(1);
  const o = c?.stageLabels ?? {};
  return (k: Stage) => (k !== 'cancelled' && o[k]) || tw(`stage.${k}`);
}

export async function mustLoad(db: DbOrTx, actor: Actor, id: string) {
  const o = await loadOrder(db, actor.companyId, id);
  if (!o) throw new NotFoundError('order');
  return o;
}

const text = (v: unknown, max = 2000) => String(v ?? '').trim().slice(0, max);

function money(field: string, raw: unknown, required: boolean): number {
  const s = text(raw, 40);
  if (!s) {
    if (required) throw new FieldError(field, 'amountRequired');
    return 0;
  }
  const v = parseEur(s);
  if (v == null || v <= 0) throw new FieldError(field, 'amountInvalid');
  if (v > 100_000_000_00) throw new FieldError(field, 'amountInvalid');
  return v;
}

function quantity(raw: unknown, min = 2): number {
  const q = Number(text(raw, 10));
  if (!Number.isInteger(q) || q < min || q > 100000) throw new FieldError('quantity', min > 1 ? 'qtyProject' : 'qtyRequired');
  return q;
}

const projectTerm = (raw: unknown): Exclude<PayTerm, 'date'> =>
  raw === 'week' || raw === 'unknown' ? raw : 'month';

async function nextNumber(tx: Tx, companyId: string, today: string) {
  const year = Number(today.slice(0, 4));
  const [c] = await tx.select().from(company).where(eq(company.id, companyId)).for('update');
  const seq = c.orderSeqYear === year ? c.orderSeq + 1 : 1;
  await tx.update(company).set({ orderSeqYear: year, orderSeq: seq }).where(eq(company.id, companyId));
  return `${year}-${String(seq).padStart(3, '0')}`;
}

/* ───────── + Porosi e re ───────── */

export interface NewOrderInput {
  name: string;
  phoneCc: string;
  phone: string;
  productType: string;
  description?: string;
  price: string;
  deposit?: string;
  method?: string;
  city: string;
  directions?: string;
  internalNote?: string;
  project?: boolean;
  quantity?: string;
  unit?: string;
  projectPayTerm?: string;
}

export async function createOrder(db: Db, actor: Actor, input: NewOrderInput, today: string): Promise<{ id: string; number: string }> {
  allow(actor, 'daily');
  const errors: FieldError[] = [];
  const name = text(input.name, 120);
  if (!name) errors.push(new FieldError('name', 'nameRequired'));
  const phone = check(errors, () => {
    if (!text(input.phone)) throw new FieldError('phone', 'phoneRequired');
    return toE164(input.phoneCc, input.phone) ?? (() => { throw new FieldError('phone', 'phoneInvalid'); })();
  });
  const productType = text(input.productType, 60);
  if (!productType) errors.push(new FieldError('productType', 'productRequired'));
  const price = check(errors, () => money('price', input.price, true));
  const deposit = check(errors, () => money('deposit', input.deposit, false)) ?? 0;
  if (price && deposit > price) errors.push(new FieldError('deposit', 'depositTooBig'));
  const method: Method = METHODS.includes(input.method as Method) ? (input.method as Method) : 'cash';
  const project = !!input.project;
  const qty = project ? (check(errors, () => quantity(input.quantity)) ?? null) : null;
  const unit = project ? (UNITS.includes(input.unit as (typeof UNITS)[number]) ? input.unit! : 'copë') : null;
  throwIf(errors);

  return db.transaction(async tx => {
    // The client is the person who pays: reuse them when the name and phone match.
    const same = await tx.select().from(client).where(and(eq(client.companyId, actor.companyId), eq(client.phone, phone!)));
    let c = same.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!c) [c] = await tx.insert(client).values({ companyId: actor.companyId, name, phone: phone! }).returning();
    const number = await nextNumber(tx, actor.companyId, today);
    const [o] = await tx
      .insert(orders)
      .values({
        companyId: actor.companyId,
        number,
        clientId: c!.id,
        productType,
        description: text(input.description, 300),
        price: price!,
        city: text(input.city, 60),
        directions: text(input.directions),
        internalNote: text(input.internalNote),
        quantity: qty,
        unit,
        projectPayTerm: project ? projectTerm(input.projectPayTerm) : null,
        trackingToken: newToken(),
        createdBy: actor.id,
      })
      .returning();
    await log(tx, actor, 'order', o.id, th(project ? 'createdProject' : 'created', { price: eur(price!), qty: qty ?? 0, unit: unit ?? '' }));
    if (deposit) {
      const word = (await tx.select({ w: company.depositWord }).from(company).where(eq(company.id, actor.companyId)))[0]?.w ?? 'Avans';
      await insertPayment(tx, actor, { orderId: o.id }, { amount: deposit, method, holder: 'office', date: today, note: '' }, th('depositPaid', { word, amount: eur(deposit), method: tw(`method.${method}`) }));
    }
    return { id: o.id, number };
  });
}

/* ───────── Stages ───────── */

/** One tap forward to "Në punë", or back to an earlier stage (logged, no reasons). */
export async function setStage(db: Db, actor: Actor, id: string, to: 'new' | 'active') {
  allow(actor, 'daily');
  await db.transaction(async tx => {
    const o = await mustLoad(tx, actor, id);
    if (o.stage === to || o.stage === 'cancelled') return;
    const label = await stageLabels(tx, actor.companyId);
    await tx.update(orders).set({ stage: to, doneAt: null, payTerm: null, dueDate: null }).where(eq(orders.id, id));
    await log(tx, actor, 'order', id, th('stage', { from: label(o.stage), to: label(to) }), { field: 'stage', old: o.stage, new: to });
  });
}

export interface DoneInput {
  /** Did the customer pay the rest? */
  pay: 'no' | 'all' | 'part';
  amount?: string;
  holder?: Holder;
  method?: string;
  term?: string;
  termDate?: string;
}

/** "E kryer" for a normal order: the payment (in the office or with an installer) and the term in one sheet. */
export async function markDone(db: Db, actor: Actor, id: string, input: DoneInput, today: string) {
  allow(actor, 'daily');
  return db.transaction(tx => markDoneIn(tx, actor, id, input, today));
}

/**
 * The body of "E kryer", shared with "Montimi u krye" on a visit. `close: false` records only
 * the payment (the visit was done, the order isn't finished yet).
 */
export async function markDoneIn(tx: Tx, actor: Actor, id: string, input: DoneInput & { close?: boolean }, today: string) {
  const o = await mustLoad(tx, actor, id);
  if (isProject(o)) throw new FieldError('pay', 'projectUsesFinish');
  if (o.stage === 'cancelled') throw new FieldError('pay', 'cancelled');
  const close = input.close ?? true;
  const rem = Math.max(0, orderTotals(o).remaining);
  const pay = rem > 0 ? input.pay : 'no';
  let amount = pay === 'all' ? rem : 0;
  if (pay === 'part') {
    amount = money('amount', input.amount, true);
    if (amount > rem) throw new FieldError('amount', 'moreThanLeft', { left: eur(rem) });
  }
  const left = rem - amount;
  const term = (['week', 'month', 'date', 'unknown'] as const).find(t => t === input.term) ?? 'week';
  const termDate = text(input.termDate, 10);
  if (close && left > 0 && term === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(termDate)) throw new FieldError('term', 'dateRequired');
  if (amount > 0) {
    const holder = await checkHolder(tx, actor, input.holder);
    await insertPayment(tx, actor, { orderId: id }, { amount, method: holder === 'office' ? methodOf(input.method) : 'cash', holder, date: today, note: '' });
  }
  if (close && o.stage !== 'done') {
    const label = await stageLabels(tx, actor.companyId);
    const t = left > 0 ? term : 'week';
    const dueDate = termDue(today, t, termDate);
    await tx.update(orders).set({ stage: 'done', doneAt: today, payTerm: t, dueDate }).where(eq(orders.id, id));
    const termText = left > 0 ? th('termSuffix', { term: tw(`term.${t}`).toLowerCase(), date: t === 'date' ? ` ${fmtDate(dueDate)}` : '' }) : '';
    await log(tx, actor, 'order', id, th('stage', { from: label(o.stage), to: label('done') }) + termText, { field: 'stage', old: o.stage, new: 'done' });
  }
  return { left, held: amount > 0 && input.holder !== 'office' && !!input.holder, closed: close };
}

/* ───────── Projects ───────── */

export interface PartInput {
  quantity: string;
  date?: string;
  installerId?: string;
  value?: string;
  pay?: 'no' | 'part';
  amount?: string;
  method?: string;
  holder?: Holder;
  finish?: boolean;
}

/** "Shëno montim": one installed part (date, installer, quantity); its value is quantity × unit price unless overridden. */
export async function recordPart(db: Db, actor: Actor, id: string, input: PartInput, today: string) {
  allow(actor, 'daily');
  return db.transaction(tx => recordPartIn(tx, actor, id, input, today));
}

/**
 * The body of "Shëno montim", shared with a planned project visit marked done ("Sa u montuan?"):
 * with `visitId` that visit becomes the part instead of a new one.
 */
export async function recordPartIn(tx: Tx, actor: Actor, id: string, input: PartInput, today: string, visitId?: string) {
  const o = await mustLoad(tx, actor, id);
  if (!isProject(o) || o.stage === 'done' || o.stage === 'cancelled') throw new FieldError('quantity', 'notOpenProject');
  const errors: FieldError[] = [];
  const left = o.quantity! - installedQty(o);
  const q = check(errors, () => quantity(input.quantity, 1));
  if (q != null && q > left) errors.push(new FieldError('quantity', 'qtyTooMany', { left }));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date ?? '') ? input.date! : today;
  if (date > today) errors.push(new FieldError('date', 'dateFuture'));
  const value = text(input.value) ? (check(errors, () => money('value', input.value, true)) ?? null) : null;
  const amount = input.pay === 'part' ? check(errors, () => money('amount', input.amount, true)) : undefined;
  const room = Math.max(0, orderTotals(o).remaining);
  if (amount != null && amount > room) errors.push(new FieldError('amount', 'moreThanLeft', { left: eur(room) }));
  throwIf(errors);
  const planned = visitId ? o.visits.find(v => v.id === visitId && !v.doneAt) : undefined;
  if (visitId && !planned) throw new NotFoundError('visit');
  const instId = planned ? planned.installerId : input.installerId ? (await checkInstaller(tx, actor, input.installerId)).id : null;
  const instName = instId ? ((await tx.select({ n: installer.name }).from(installer).where(eq(installer.id, instId)))[0]?.n ?? '') : '';
  if (planned) await tx.update(visit).set({ doneAt: date, quantity: q!, value }).where(eq(visit.id, planned.id));
  else
    await tx.insert(visit).values({
      companyId: actor.companyId,
      orderId: id,
      type: 'install',
      date,
      installerId: instId,
      doneAt: date,
      quantity: q!,
      value,
    });
  const label = await stageLabels(tx, actor.companyId);
  if (o.stage === 'new') {
    await tx.update(orders).set({ stage: 'active' }).where(eq(orders.id, id));
    await log(tx, actor, 'order', id, th('stage', { from: label('new'), to: label('active') }), { field: 'stage', old: 'new', new: 'active' });
  }
  // A planned visit that became this part carries a marker, so "Nuk u krye" can plan it again.
  await log(
    tx,
    actor,
    'order',
    id,
    th('part', { qty: q!, unit: o.unit ?? '', who: instName ? ` · ${instName}` : '', value: value != null ? th('valueSuffix', { value: eur(value) }) : '', date: fmtDate(date) }),
    planned ? { field: FROM_VISIT, old: null, new: planned.id } : undefined,
  );
  if (amount != null) {
    const holder = await checkHolder(tx, actor, input.holder);
    await insertPayment(tx, actor, { orderId: id }, { amount, method: holder === 'office' ? methodOf(input.method) : 'cash', holder, date: today, note: '' });
  }
  if (input.finish) await finish(tx, actor, o, today);
  const after = await mustLoad(tx, actor, id);
  return { installed: installedQty(after), owed: orderTotals(after).owed };
}

export interface PartEditInput {
  quantity: string;
  date: string;
  installerId?: string;
  /** Empty = quantity × unit price. */
  value?: string;
}

async function mustLoadPart(tx: DbOrTx, actor: Actor, orderId: string, visitId: string) {
  const o = await mustLoad(tx, actor, orderId);
  const v = o.visits.find(x => x.id === visitId);
  if (!isProject(o) || !v || !v.doneAt || !v.quantity) throw new NotFoundError('part');
  return { o, v };
}

/**
 * Correcting a recorded part ("Montimet e kryera" → Ndrysho, both roles): quantity, date,
 * installer and value. Progress, owed now, paid ahead and the per-part due dates are all
 * computed from the parts, so they follow; payments are never touched.
 */
export async function editPart(db: Db, actor: Actor, orderId: string, visitId: string, input: PartEditInput, today: string) {
  allow(actor, 'edit');
  return db.transaction(async tx => {
    const { o, v } = await mustLoadPart(tx, actor, orderId, visitId);
    if (o.stage === 'cancelled') throw new FieldError('quantity', 'cancelled');
    const errors: FieldError[] = [];
    const q = check(errors, () => quantity(input.quantity, 1));
    const others = installedQty(o) - v.quantity!;
    if (q != null && others + q > o.quantity!) errors.push(new FieldError('quantity', 'qtyTooMany', { left: o.quantity! - others }));
    const date = text(input.date, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push(new FieldError('date', 'dateRequired'));
    else if (date > today) errors.push(new FieldError('date', 'dateFuture'));
    const value = text(input.value) ? check(errors, () => money('value', input.value, true)) : null;
    let inst: Awaited<ReturnType<typeof checkInstaller>> | null = null;
    if (input.installerId) {
      try {
        inst = await checkInstaller(tx, actor, input.installerId);
      } catch (e) {
        if (!(e instanceof FieldError)) throw e;
        errors.push(e);
      }
    }
    throwIf(errors);
    const unit = o.unit ?? '';
    const auto = (qty: number) => qty * unitPrice(o);
    const changes: string[] = [];
    const diff = (label: string, a: string, b: string) => {
      if (a !== b) changes.push(th('change', { label, from: a || '—', to: b || '—' }));
    };
    const name = async (id: string | null) => (id ? ((await tx.select({ n: installer.name }).from(installer).where(eq(installer.id, id)))[0]?.n ?? '—') : '');
    diff(tw('field.quantity'), `${v.quantity} ${unit}`, `${q} ${unit}`);
    diff(tw('field.date'), fmtDate(v.doneAt), fmtDate(date));
    diff(tw('field.installer'), await name(v.installerId), inst?.name ?? '');
    const oldValue = v.value ?? auto(v.quantity!);
    const newValue = value ?? auto(q!);
    if (oldValue !== newValue || (v.value == null) !== (value == null)) diff(tw('field.value'), eur(oldValue), eur(newValue));
    if (!changes.length) return { changed: 0 };
    await tx.update(visit).set({ quantity: q!, date, doneAt: date, installerId: inst?.id ?? null, value }).where(eq(visit.id, visitId));
    await log(tx, actor, 'order', orderId, th('partEdited', { date: fmtDate(v.doneAt), changes: changes.join(' · ') }), {
      field: 'part',
      old: `${v.quantity}@${v.doneAt}`,
      new: `${q}@${date}`,
    });
    return { changed: changes.length };
  });
}

/** Deleting a part recorded by mistake: Pronari only. Payments stay; money paid beyond the installed value shows as paid ahead. */
export async function deletePart(db: Db, actor: Actor, orderId: string, visitId: string) {
  allow(actor, 'delete');
  await db.transaction(async tx => {
    const { o, v } = await mustLoadPart(tx, actor, orderId, visitId);
    const who = v.installerId ? ((await tx.select({ n: installer.name }).from(installer).where(eq(installer.id, v.installerId)))[0]?.n ?? '') : '';
    await tx.delete(visit).where(eq(visit.id, visitId));
    await log(tx, actor, 'order', orderId, th('partDeleted', { qty: v.quantity!, unit: o.unit ?? '', who: who ? ` · ${who}` : '', value: eur(partValue(o, v)), date: fmtDate(v.doneAt) }), {
      field: 'part',
      old: `${v.quantity}@${v.doneAt}`,
      new: null,
    });
  });
}

/** History field marking a part that was a planned visit marked done ("Montimi u krye"). */
const FROM_VISIT = 'partFromVisit';

/** The parts of this order that were planned visits, so "Nuk u krye" can put them back. */
export async function partsFromVisits(db: DbOrTx, companyId: string, orderId: string): Promise<Set<string>> {
  const rows = await db
    .select({ id: history.newValue })
    .from(history)
    .where(and(eq(history.companyId, companyId), eq(history.recordType, 'order'), eq(history.recordId, orderId), eq(history.field, FROM_VISIT)));
  return new Set(rows.map(r => r.id).filter((x): x is string => !!x));
}

/**
 * "Nuk u krye" on a part that was a planned visit marked done by mistake (both roles): the
 * visit is planned again on its date, with its time, installer and note; progress follows.
 * Payments are never touched, as with any visit. With `reopenOrder`, a project marked
 * finished goes back to the active stage and its due date is removed.
 */
export async function reopenPart(db: Db, actor: Actor, orderId: string, visitId: string, input: { reopenOrder?: boolean }) {
  allow(actor, 'edit');
  return db.transaction(async tx => {
    const { o, v } = await mustLoadPart(tx, actor, orderId, visitId);
    if (o.stage === 'cancelled') throw new FieldError('quantity', 'cancelled');
    if (!(await partsFromVisits(tx, actor.companyId, orderId)).has(visitId)) throw new NotFoundError('part');
    const who = v.installerId ? ((await tx.select({ n: installer.name }).from(installer).where(eq(installer.id, v.installerId)))[0]?.n ?? '') : '';
    await tx.update(visit).set({ doneAt: null, quantity: null, value: null }).where(eq(visit.id, visitId));
    await log(tx, actor, 'order', orderId, th('partReopened', { qty: v.quantity!, unit: o.unit ?? '', who: who ? ` · ${who}` : '', date: fmtDate(v.doneAt) }), {
      field: 'part',
      old: `${v.quantity}@${v.doneAt}`,
      new: 'planned',
    });
    const stage = !!input.reopenOrder && o.stage === 'done';
    if (stage) {
      const label = await stageLabels(tx, actor.companyId);
      await tx.update(orders).set({ stage: 'active', doneAt: null, payTerm: null, dueDate: null }).where(eq(orders.id, orderId));
      await log(tx, actor, 'order', orderId, th('stage', { from: label('done'), to: label('active') }), { field: 'stage', old: 'done', new: 'active' });
    }
    return { reopenedOrder: stage };
  });
}

async function finish(tx: Tx, actor: Actor, o: FullOrder, today: string) {
  const label = await stageLabels(tx, actor.companyId);
  const term = o.projectPayTerm ?? 'month';
  await tx.update(orders).set({ stage: 'done', doneAt: today, dueDate: termDue(today, term) }).where(eq(orders.id, o.id));
  const fresh = await mustLoad(tx, actor, o.id);
  await log(
    tx,
    actor,
    'order',
    o.id,
    th('projectDone', { from: label(o.stage), to: label('done'), installed: installedQty(fresh), qty: o.quantity!, unit: o.unit ?? '' }),
    { field: 'stage', old: o.stage, new: 'done' },
  );
}

/** "Projekti përfundoi": the rest of the contract becomes payable by the project's term. */
export async function finishProject(db: Db, actor: Actor, id: string, today: string) {
  allow(actor, 'daily');
  await db.transaction(async tx => {
    const o = await mustLoad(tx, actor, id);
    if (!isProject(o) || o.stage === 'done' || o.stage === 'cancelled') return;
    await finish(tx, actor, o, today);
  });
}

/* ───────── Terms, pauses, remaining work ───────── */

/** "Ndrysho afatin": the term of a done order, or the per-part term of a project. */
export async function setTerm(db: Db, actor: Actor, id: string, input: { term: string; termDate?: string }) {
  allow(actor, 'daily');
  await db.transaction(async tx => {
    const o = await mustLoad(tx, actor, id);
    if (isProject(o)) {
      const term = projectTerm(input.term);
      const dueDate = o.stage === 'done' && o.doneAt ? termDue(o.doneAt, term) : null;
      await tx.update(orders).set({ projectPayTerm: term, dueDate }).where(eq(orders.id, id));
      await log(tx, actor, 'order', id, th('projectTerm', { term: tw(`term.${term}`) }), { field: 'projectPayTerm', old: o.projectPayTerm, new: term });
      return;
    }
    if (o.stage !== 'done' || !o.doneAt) return;
    const term = (['week', 'month', 'date', 'unknown'] as const).find(t => t === input.term);
    if (!term) throw new FieldError('term', 'termRequired');
    const termDate = text(input.termDate, 10);
    if (term === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(termDate)) throw new FieldError('term', 'dateRequired');
    const dueDate = termDue(o.doneAt, term, termDate);
    await tx.update(orders).set({ payTerm: term, dueDate }).where(eq(orders.id, id));
    await log(tx, actor, 'order', id, th('term', { term: tw(`term.${term}`), date: dueDate ? fmtDate(dueDate) : tw('dueUnknown') }), {
      field: 'dueDate',
      old: o.dueDate,
      new: dueDate,
    });
  });
}

export async function pauseOrder(db: Db, actor: Actor, id: string, input: { until: string; reason: string }, today: string) {
  allow(actor, 'daily');
  const until = text(input.until, 10);
  const reason = text(input.reason, 200);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until) || until <= today) throw new FieldError('until', 'dateAfterToday');
  if (!reason) throw new FieldError('reason', 'reasonRequired');
  await db.transaction(async tx => {
    await mustLoad(tx, actor, id);
    await tx.update(orders).set({ pausedUntil: until, pauseReason: reason }).where(eq(orders.id, id));
    await log(tx, actor, 'order', id, th('paused', { until: fmtDate(until), reason }));
  });
}

export async function unpauseOrder(db: Db, actor: Actor, id: string) {
  allow(actor, 'daily');
  await db.transaction(async tx => {
    const o = await mustLoad(tx, actor, id);
    if (!o.pausedUntil) return;
    await tx.update(orders).set({ pausedUntil: null, pauseReason: null }).where(eq(orders.id, id));
    await log(tx, actor, 'order', id, th('unpaused'));
  });
}

/** "Ka punë të mbetura": a note on a done order; offers to pause reminders in the same step. */
export async function setRemainingWork(db: Db, actor: Actor, id: string, input: { note: string; pause?: boolean }, today: string) {
  allow(actor, 'daily');
  const note = text(input.note, 500);
  if (!note) throw new FieldError('note', 'remainingRequired');
  await db.transaction(async tx => {
    const o = await mustLoad(tx, actor, id);
    if (o.stage !== 'done') return;
    await tx.update(orders).set({ remainingWork: note }).where(eq(orders.id, id));
    await log(tx, actor, 'order', id, th('remaining', { note }));
    if (input.pause) {
      const until = addDays(today, 14);
      const reason = tw('remainingReason');
      await tx.update(orders).set({ pausedUntil: until, pauseReason: reason }).where(eq(orders.id, id));
      await log(tx, actor, 'order', id, th('paused', { until: fmtDate(until), reason }));
    }
  });
}

/** "Puna u përfundua": clears the flag, and the pause it set. */
export async function clearRemainingWork(db: Db, actor: Actor, id: string) {
  allow(actor, 'daily');
  await db.transaction(async tx => {
    const o = await mustLoad(tx, actor, id);
    if (!o.remainingWork) return;
    await tx.update(orders).set({ remainingWork: null }).where(eq(orders.id, id));
    await log(tx, actor, 'order', id, th('remainingDone', { note: o.remainingWork }));
    if (o.pausedUntil && o.pauseReason === tw('remainingReason')) {
      await tx.update(orders).set({ pausedUntil: null, pauseReason: null }).where(eq(orders.id, id));
      await log(tx, actor, 'order', id, th('unpaused'));
    }
  });
}

/* ───────── Ndrysho porosinë ───────── */

export interface EditOrderInput {
  name: string;
  phone: string;
  productType: string;
  description?: string;
  price: string;
  priceNote?: string;
  city: string;
  directions?: string;
  internalNote?: string;
  project?: boolean;
  quantity?: string;
  unit?: string;
  projectPayTerm?: string;
}

/** Every field can be edited; each change is one history line ("Çmimi: €5.000 → €5.200 · +1 dollap"). */
export async function editOrder(db: Db, actor: Actor, id: string, input: EditOrderInput) {
  allow(actor, 'edit');
  return db.transaction(async tx => {
    const o = await mustLoad(tx, actor, id);
    const name = text(input.name, 120);
    if (!name) throw new FieldError('name', 'nameRequired');
    const phone = toE164('+383', input.phone);
    if (!phone) throw new FieldError('phone', 'phoneInvalid');
    const price = money('price', input.price, true);
    const productType = text(input.productType, 60) || o.productType;
    const project = isProject(o) || !!input.project;
    const qty = project ? quantity(input.quantity) : null;
    if (qty != null && qty < installedQty(o)) throw new FieldError('quantity', 'qtyBelowInstalled', { n: installedQty(o) });
    if (price < orderTotals(o).paid) throw new FieldError('price', 'priceBelowPaid', { paid: eur(orderTotals(o).paid) });
    const changes: string[] = [];
    const diff = (label: string, a: string | null | undefined, b: string | null | undefined) => {
      if ((a ?? '') !== (b ?? '')) changes.push(th('change', { label, from: a || '—', to: b || '—' }));
    };
    // The client is shared by their orders: renaming here renames them everywhere.
    if (name !== o.client.name || phone !== o.client.phone) {
      diff(tw('field.client'), o.client.name, name);
      diff(tw('field.phone'), o.client.phone, phone);
      await tx.update(client).set({ name, phone }).where(eq(client.id, o.clientId));
    }
    const next = {
      productType,
      description: text(input.description, 300),
      price,
      city: text(input.city, 60) || o.city,
      directions: text(input.directions),
      internalNote: text(input.internalNote),
      quantity: qty,
      unit: project ? (UNITS.includes(input.unit as (typeof UNITS)[number]) ? input.unit! : (o.unit ?? 'copë')) : null,
      projectPayTerm: project ? projectTerm(input.projectPayTerm) : null,
    };
    diff(tw('field.product'), o.productType, next.productType);
    diff(tw('field.description'), o.description, next.description);
    diff(tw('field.city'), o.city, next.city);
    diff(tw('field.directions'), o.directions, next.directions);
    if (o.internalNote !== next.internalNote) changes.push(th('noteChanged'));
    if (project) {
      diff(tw('field.quantity'), o.quantity?.toString(), String(qty));
      diff(tw('field.unit'), o.unit, next.unit);
      diff(tw('field.projectTerm'), o.projectPayTerm ? tw(`term.${o.projectPayTerm}`) : null, tw(`term.${next.projectPayTerm!}`));
    }
    await tx.update(orders).set(next).where(eq(orders.id, id));
    for (const c of changes) await log(tx, actor, 'order', id, c);
    if (price !== o.price) {
      const note = text(input.priceNote, 120);
      await log(tx, actor, 'order', id, th('price', { from: eur(o.price), to: eur(price), note: note ? ` · ${note}` : '' }), {
        field: 'price',
        old: String(o.price),
        new: String(price),
      });
    }
    return { changed: changes.length + (price !== o.price ? 1 : 0) };
  });
}

/* ───────── Anulo / Fshij ───────── */

export async function cancelOrder(db: Db, actor: Actor, id: string, reason: string) {
  allow(actor, 'daily');
  await db.transaction(async tx => {
    const o = await mustLoad(tx, actor, id);
    if (o.stage === 'cancelled') return;
    const label = await stageLabels(tx, actor.companyId);
    await tx.update(orders).set({ stage: 'cancelled' }).where(eq(orders.id, id));
    const r = text(reason, 200);
    await log(tx, actor, 'order', id, th('cancelled', { was: label(o.stage), reason: r ? `: ${r}` : '' }), { field: 'stage', old: o.stage, new: 'cancelled' });
  });
}

/** "Rikthe porosinë": back to the stage it had before it was cancelled (from the history). */
export async function restoreOrder(db: Db, actor: Actor, id: string) {
  allow(actor, 'daily');
  await db.transaction(async tx => {
    const o = await mustLoad(tx, actor, id);
    if (o.stage !== 'cancelled') return;
    const [last] = await tx
      .select({ old: history.oldValue })
      .from(history)
      .where(and(eq(history.recordType, 'order'), eq(history.recordId, id), eq(history.field, 'stage'), eq(history.newValue, 'cancelled')))
      .orderBy(desc(history.at))
      .limit(1);
    const to = (['new', 'active', 'done'] as const).find(s => s === last?.old) ?? (o.doneAt ? 'done' : 'new');
    const label = await stageLabels(tx, actor.companyId);
    await tx.update(orders).set({ stage: to }).where(eq(orders.id, id));
    await log(tx, actor, 'order', id, th('restored', { to: label(to) }), { field: 'stage', old: 'cancelled', new: to });
  });
}

/** For orders created by mistake: Pronari only, and only without payments. */
export async function deleteOrder(db: Db, actor: Actor, id: string) {
  allow(actor, 'delete');
  await db.transaction(async tx => {
    const o = await mustLoad(tx, actor, id);
    if (o.payments.some(p => !p.deletedAt)) throw new FieldError('confirm', 'hasPayments');
    // Deleted payments only stay for the history; the history keeps its own lines.
    await tx.delete(payment).where(and(eq(payment.orderId, id)));
    await tx.delete(orders).where(eq(orders.id, id));
    await log(tx, actor, 'order', id, th('orderDeleted', { number: o.number, name: o.client.name }));
  });
}

/** "Mos sugjero kujtesa për borxh" (relatives, friends, big contractors): on the client. */
export async function setClientNoReminders(db: Db, actor: Actor, clientId: string, on: boolean) {
  allow(actor, 'daily');
  await db.transaction(async tx => {
    const [c] = await tx.select().from(client).where(and(eq(client.id, clientId), eq(client.companyId, actor.companyId))).limit(1);
    if (!c || c.noReminders === on) return;
    await tx.update(client).set({ noReminders: on }).where(eq(client.id, clientId));
    await log(tx, actor, 'client', clientId, th(on ? 'noRemindersOn' : 'noRemindersOff'));
  });
}

/* ───────── helpers shared with payments ───────── */

export const methodOf = (m: unknown): Method => (METHODS.includes(m as Method) ? (m as Method) : 'cash');

export async function checkInstaller(tx: DbOrTx, actor: Actor, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new FieldError('installerId', 'installerUnknown');
  const [i] = await tx.select().from(installer).where(and(eq(installer.id, id), eq(installer.companyId, actor.companyId))).limit(1);
  if (!i) throw new FieldError('installerId', 'installerUnknown');
  return i;
}

/** "Ku janë paratë?": 'office' or an installer of this company. */
export async function checkHolder(tx: DbOrTx, actor: Actor, holder: Holder | undefined): Promise<Holder> {
  if (!holder || holder === 'office') return 'office';
  return (await checkInstaller(tx, actor, holder)).id;
}

