/**
 * Reads a company's records into the shapes the domain rules use. A workshop has
 * hundreds of orders, not millions, so screens load the whole book and compute
 * balances with the same pure functions the tests cover.
 */
import { and, asc, desc, eq, or } from 'drizzle-orm';
import type { BookOpening, BookOrder } from '@/domain/debts';
import { client, history, installer, message, openingBalance, orders, payment, user, visit } from '@/db/schema';
import type { DbOrTx } from './common';

export type PaymentRow = typeof payment.$inferSelect;
export type VisitRow = typeof visit.$inferSelect;
export type ClientRow = typeof client.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type OpeningRow = typeof openingBalance.$inferSelect;

export type FullOrder = Omit<BookOrder, 'client' | 'payments' | 'visits'> &
  Omit<OrderRow, 'payTerm' | 'projectPayTerm'> & {
    client: ClientRow;
    payments: PaymentRow[];
    visits: VisitRow[];
    payTerm: OrderRow['payTerm'];
    projectPayTerm: OrderRow['projectPayTerm'];
  };
export type FullOpening = Omit<BookOpening, 'payments'> & OpeningRow & { payments: PaymentRow[] };

function group<T, K extends keyof T>(rows: T[], key: K) {
  const m = new Map<T[K], T[]>();
  for (const r of rows) {
    const list = m.get(r[key]) ?? [];
    list.push(r);
    m.set(r[key], list);
  }
  return m;
}

function assembleOrders(
  rows: OrderRow[],
  clients: ClientRow[],
  visits: VisitRow[],
  payments: PaymentRow[],
  messages: (typeof message.$inferSelect)[],
): FullOrder[] {
  const byClient = new Map(clients.map(c => [c.id, c]));
  const v = group(visits, 'orderId');
  const p = group(payments.filter(x => x.orderId), 'orderId');
  const m = group(messages.filter(x => x.orderId && x.recipient === 'client'), 'orderId');
  return rows.map(o => ({
    ...o,
    client: byClient.get(o.clientId)!,
    visits: v.get(o.id) ?? [],
    payments: p.get(o.id) ?? [],
    messages: m.get(o.id) ?? [],
  })) as FullOrder[];
}

function assembleOpenings(rows: OpeningRow[], payments: PaymentRow[], messages: (typeof message.$inferSelect)[]): FullOpening[] {
  const p = group(payments.filter(x => x.openingId), 'openingId');
  const m = group(messages.filter(x => x.openingId), 'openingId');
  return rows.map(ob => ({ ...ob, payments: p.get(ob.id) ?? [], messages: m.get(ob.id) ?? [] })) as FullOpening[];
}

/** Everything that money and lists depend on. Soft-deleted payments are included (they carry `deletedAt`). */
export async function loadBook(db: DbOrTx, companyId: string) {
  const [orderRows, clients, visits, payments, openings, messages, installers] = await Promise.all([
    db.select().from(orders).where(eq(orders.companyId, companyId)).orderBy(desc(orders.number)),
    db.select().from(client).where(eq(client.companyId, companyId)).orderBy(asc(client.name)),
    db.select().from(visit).where(eq(visit.companyId, companyId)),
    db.select().from(payment).where(eq(payment.companyId, companyId)).orderBy(asc(payment.date), asc(payment.createdAt)),
    db.select().from(openingBalance).where(eq(openingBalance.companyId, companyId)).orderBy(asc(openingBalance.createdAt)),
    db.select().from(message).where(eq(message.companyId, companyId)),
    db.select().from(installer).where(eq(installer.companyId, companyId)).orderBy(asc(installer.createdAt), asc(installer.name)),
  ]);
  return {
    orders: assembleOrders(orderRows, clients, visits, payments, messages),
    openings: assembleOpenings(openings, payments, messages),
    clients,
    installers,
  };
}
export type Book = Awaited<ReturnType<typeof loadBook>>;

export async function loadOrder(db: DbOrTx, companyId: string, id: string): Promise<FullOrder | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [o] = await db.select().from(orders).where(and(eq(orders.companyId, companyId), eq(orders.id, id))).limit(1);
  if (!o) return null;
  const [clients, visits, payments, messages] = await Promise.all([
    db.select().from(client).where(eq(client.id, o.clientId)),
    db.select().from(visit).where(eq(visit.orderId, id)),
    db.select().from(payment).where(eq(payment.orderId, id)).orderBy(asc(payment.date), asc(payment.createdAt)),
    db.select().from(message).where(eq(message.orderId, id)),
  ]);
  return assembleOrders([o], clients, visits, payments, messages)[0];
}

export async function loadOpening(db: DbOrTx, companyId: string, id: string): Promise<FullOpening | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [ob] = await db
    .select()
    .from(openingBalance)
    .where(and(eq(openingBalance.companyId, companyId), eq(openingBalance.id, id)))
    .limit(1);
  if (!ob) return null;
  const [payments, messages] = await Promise.all([
    db.select().from(payment).where(eq(payment.openingId, id)).orderBy(asc(payment.date), asc(payment.createdAt)),
    db.select().from(message).where(eq(message.openingId, id)),
  ]);
  return assembleOpenings([ob], payments, messages)[0];
}

/** The history of one record, newest first, with the user's first name. */
export async function loadHistory(db: DbOrTx, recordType: 'order' | 'opening', recordId: string, alsoClient?: string) {
  const where = alsoClient
    ? or(and(eq(history.recordType, recordType), eq(history.recordId, recordId)), and(eq(history.recordType, 'client'), eq(history.recordId, alsoClient)))
    : and(eq(history.recordType, recordType), eq(history.recordId, recordId));
  return db
    .select({ id: history.id, at: history.at, text: history.text, who: user.firstName })
    .from(history)
    .leftJoin(user, eq(user.id, history.userId))
    .where(where)
    .orderBy(desc(history.at));
}

/** Clients for the "Klienti" suggestions on the new-order form. */
export async function clientNames(db: DbOrTx, companyId: string) {
  return db.select({ id: client.id, name: client.name, phone: client.phone }).from(client).where(eq(client.companyId, companyId)).orderBy(asc(client.name));
}
