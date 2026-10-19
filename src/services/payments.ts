/**
 * Payments (spec §4): "Në zyrë" or "Te montuesi", Konfirmo (one / all), and
 * corrections that are edits, not accounting: Ndrysho (both roles) and Fshij
 * (Pronari), each leaving one history line with who, when and old → new.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { openingTotals, orderTotals, paymentRoom } from '@/domain/balances';
import { installer, payment } from '@/db/schema';
import type { Db } from '@/db/connect';
import { fmtDate } from '@/lib/dates';
import { eur, parseEur } from '@/lib/money';
import { loadOpening, loadOrder, type PaymentRow } from './book';
import { allow, FieldError, log, NotFoundError, th, tw, type Actor, type DbOrTx, type Tx } from './common';
import { checkHolder, methodOf, type Method } from './orders';

/** 'office' or an installer id. */
export type Holder = 'office' | (string & {});

export interface PaymentInput {
  amount: string;
  method?: string;
  holder?: Holder;
  date?: string;
  note?: string;
}

type Target = { orderId: string } | { openingId: string };

async function installerName(tx: DbOrTx, id: string | null) {
  if (!id) return '';
  const [i] = await tx.select({ name: installer.name }).from(installer).where(eq(installer.id, id)).limit(1);
  return i?.name ?? '—';
}

const where = async (tx: DbOrTx, heldBy: string | null) => (heldBy ? th('whereHeld', { name: await installerName(tx, heldBy) }) : tw('office'));

/** Inserts a payment and its history line (used by every flow that takes money). */
export async function insertPayment(
  tx: Tx,
  actor: Actor,
  target: Target,
  p: { amount: number; method: Method; holder: Holder; date: string; note: string },
  historyText?: string,
) {
  const heldBy = p.holder === 'office' ? null : p.holder;
  const [row] = await tx
    .insert(payment)
    .values({
      companyId: actor.companyId,
      ...target,
      amount: p.amount,
      date: p.date,
      method: heldBy ? 'cash' : p.method,
      heldBy,
      note: p.note,
      createdBy: actor.id,
    })
    .returning();
  const [type, id] = 'orderId' in target ? (['order', target.orderId] as const) : (['opening', target.openingId] as const);
  const text =
    historyText ??
    (heldBy
      ? th('paymentHeld', { amount: eur(p.amount), name: await installerName(tx, heldBy) })
      : th('paymentOffice', { amount: eur(p.amount), method: tw(`method.${row.method}`) }));
  await log(tx, actor, type, id, text);
  return row;
}

async function totalsOf(tx: DbOrTx, actor: Actor, target: Target) {
  if ('orderId' in target) {
    const o = await loadOrder(tx, actor.companyId, target.orderId);
    if (!o || o.stage === 'cancelled') throw new NotFoundError('order');
    return orderTotals(o);
  }
  const ob = await loadOpening(tx, actor.companyId, target.openingId);
  if (!ob) throw new NotFoundError('opening');
  return openingTotals(ob);
}

function parseInput(input: PaymentInput, today: string) {
  const raw = String(input.amount ?? '').trim();
  if (!raw) throw new FieldError('amount', 'amountRequired');
  const amount = parseEur(raw);
  if (amount == null || amount <= 0) throw new FieldError('amount', 'amountInvalid');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date ?? '') ? input.date! : today;
  if (date > today) throw new FieldError('date', 'dateFuture');
  return { amount, method: methodOf(input.method), date, note: String(input.note ?? '').trim().slice(0, 300) };
}

/** "Regjistro pagesë" on an order or an opening balance. */
export async function addPayment(db: Db, actor: Actor, target: Target, input: PaymentInput, today: string) {
  allow(actor, 'daily');
  const p = parseInput(input, today);
  return db.transaction(async tx => {
    const t = await totalsOf(tx, actor, target);
    const room = paymentRoom(t);
    if (p.amount > room) throw new FieldError('amount', 'moreThanLeft', { left: eur(room) });
    const holder = p.method === 'cash' ? await checkHolder(tx, actor, input.holder) : 'office';
    return insertPayment(tx, actor, target, { ...p, holder });
  });
}

async function mustPayment(tx: DbOrTx, actor: Actor, id: string): Promise<PaymentRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new NotFoundError('payment');
  const [p] = await tx.select().from(payment).where(and(eq(payment.id, id), eq(payment.companyId, actor.companyId), isNull(payment.deletedAt))).limit(1);
  if (!p) throw new NotFoundError('payment');
  return p;
}

const recordOf = (p: PaymentRow) => (p.orderId ? (['order', p.orderId] as const) : (['opening', p.openingId!] as const));
const targetOf = (p: PaymentRow): Target => (p.orderId ? { orderId: p.orderId } : { openingId: p.openingId! });

/** "Ndrysho pagesën": both roles. A changed holder resets the handover. */
export async function editPayment(db: Db, actor: Actor, paymentId: string, input: PaymentInput, today: string) {
  allow(actor, 'edit');
  const n = parseInput(input, today);
  return db.transaction(async tx => {
    const p = await mustPayment(tx, actor, paymentId);
    const room = paymentRoom(await totalsOf(tx, actor, targetOf(p)), p);
    if (n.amount > room) throw new FieldError('amount', 'moreThanLeft', { left: eur(room) });
    const holder = n.method === 'cash' ? await checkHolder(tx, actor, input.holder) : 'office';
    const heldBy = holder === 'office' ? null : holder;
    const handover = heldBy === p.heldBy ? {} : { handedAt: null, handedBy: null };
    const changes: string[] = [];
    if (p.amount !== n.amount) changes.push(`${eur(p.amount)} → ${eur(n.amount)}`);
    if (p.method !== n.method) changes.push(`${tw(`method.${p.method}`).toLowerCase()} → ${tw(`method.${n.method}`).toLowerCase()}`);
    if (p.heldBy !== heldBy) changes.push(`${await where(tx, p.heldBy)} → ${await where(tx, heldBy)}`);
    if (p.date !== n.date) changes.push(`${fmtDate(p.date)} → ${fmtDate(n.date)}`);
    if (p.note !== n.note) changes.push(th('noteEdited'));
    await tx
      .update(payment)
      .set({ amount: n.amount, method: n.method, date: n.date, note: n.note, heldBy, ...handover })
      .where(eq(payment.id, p.id));
    const [type, id] = recordOf(p);
    if (changes.length)
      await log(tx, actor, type, id, th('paymentEdited', { changes: changes.join(' · ') }), {
        field: 'payment',
        old: String(p.amount),
        new: String(n.amount),
      });
    return { changed: changes.length };
  });
}

/** "Fshij pagesën": Pronari only. It leaves every total; the row stays for the history and export. */
export async function deletePayment(db: Db, actor: Actor, paymentId: string, reason: string) {
  allow(actor, 'delete');
  await db.transaction(async tx => {
    const p = await mustPayment(tx, actor, paymentId);
    await tx.update(payment).set({ deletedAt: new Date() }).where(eq(payment.id, p.id));
    const [type, id] = recordOf(p);
    const r = String(reason ?? '').trim().slice(0, 200);
    await log(tx, actor, type, id, th('paymentDeleted', { amount: eur(p.amount), date: fmtDate(p.date), reason: r ? `: ${r}` : '' }), {
      field: 'payment',
      old: String(p.amount),
      new: null,
    });
  });
}

/** "Konfirmo: i mora paratë nga Driton": the cash reached the office. Nothing else changes. */
export async function confirmCash(db: Db, actor: Actor, paymentId: string) {
  allow(actor, 'daily');
  return db.transaction(async tx => confirmOne(tx, actor, await mustPayment(tx, actor, paymentId)));
}

async function confirmOne(tx: Tx, actor: Actor, p: PaymentRow) {
  if (!p.heldBy || p.handedAt) return 0;
  await tx.update(payment).set({ handedAt: new Date(), handedBy: actor.id }).where(eq(payment.id, p.id));
  const [type, id] = recordOf(p);
  await log(tx, actor, type, id, th('confirmed', { who: actor.firstName, amount: eur(p.amount), name: await installerName(tx, p.heldBy) }));
  return p.amount;
}

/** "Konfirmo të gjitha": everything one installer holds. */
export async function confirmAll(db: Db, actor: Actor, installerId: string) {
  allow(actor, 'daily');
  return db.transaction(async tx => {
    if (!/^[0-9a-f-]{36}$/i.test(installerId)) throw new NotFoundError('installer');
    const held = await tx
      .select()
      .from(payment)
      .where(and(eq(payment.companyId, actor.companyId), eq(payment.heldBy, installerId), isNull(payment.handedAt), isNull(payment.deletedAt)));
    let sum = 0;
    for (const p of held) sum += await confirmOne(tx, actor, p);
    return sum;
  });
}
