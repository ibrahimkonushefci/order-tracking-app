/**
 * "Eksporto të dhënat" (spec §9): Pronari only. One .xlsx readable without the app
 * (euros, dd.MM.yyyy, Albanian words for stages and holders) and a complete JSON copy.
 * It is the owner's own copy, not the backup.
 */
import { asc, eq } from 'drizzle-orm';
import { createTranslator } from 'next-intl';
import messages from '../../messages/sq.json';
import { installedQty, isProject, openingTotals, orderTotals } from '@/domain/balances';
import { company, history, message, photo, user } from '@/db/schema';
import type { Db } from '@/db/connect';
import { fmtDate, fmtMonth, isoOf } from '@/lib/dates';
import { fmtPhone } from '@/lib/phone';
import { workbook, type Sheet } from '@/lib/xlsx';
import { loadBook } from './book';
import { allow, tw, type Actor } from './common';

function omit<T extends object, K extends keyof T>(o: T, keys: K[]): Omit<T, K> {
  const out = { ...o };
  for (const k of keys) delete out[k];
  return out;
}

const tx = createTranslator({ locale: 'sq', messages, namespace: 'export' });

export async function buildExport(db: Db, actor: Actor, today: string) {
  allow(actor, 'export');
  const b = await loadBook(db, actor.companyId);
  const [c] = await db.select().from(company).where(eq(company.id, actor.companyId));
  const users = await db
    .select({ id: user.id, name: user.name, firstName: user.firstName, email: user.email, role: user.role, active: user.active })
    .from(user)
    .where(eq(user.companyId, actor.companyId));
  const [hist, msgs, photos] = await Promise.all([
    db.select().from(history).where(eq(history.companyId, actor.companyId)).orderBy(asc(history.at)),
    db.select().from(message).where(eq(message.companyId, actor.companyId)),
    db.select().from(photo).where(eq(photo.companyId, actor.companyId)),
  ]);
  const labels = c.stageLabels ?? {};
  const stage = (k: string) => (k !== 'cancelled' && labels[k as 'new']) || tw(`stage.${k as 'new'}`);
  const inst = (id: string | null) => (id ? (b.installers.find(i => i.id === id)?.name ?? '—') : '');
  const who = (id: string | null) => users.find(u => u.id === id)?.firstName ?? '';
  const method = (m: string) => tw(`method.${m as 'cash'}`);

  const orders: Sheet = {
    name: tx('orders'),
    cols: [
      { h: tx('col.number'), w: 10 },
      { h: tx('col.client'), w: 26 },
      { h: tx('col.phone'), w: 18 },
      { h: tx('col.product'), w: 20 },
      { h: tx('col.description'), w: 40 },
      { h: tx('col.city'), w: 12 },
      { h: tx('col.directions'), w: 50 },
      { h: tx('col.stage'), w: 10 },
      { h: tx('col.price'), w: 12, money: true },
      { h: tx('col.paid'), w: 12, money: true },
      { h: tx('col.owed'), w: 16, money: true },
      { h: tx('col.due'), w: 14 },
      { h: tx('col.quantity'), w: 8 },
      { h: tx('col.installed'), w: 9 },
      { h: tx('col.unit'), w: 8 },
      { h: tx('col.created'), w: 12 },
      { h: tx('col.done'), w: 12 },
      { h: tx('col.internalNote'), w: 36 },
    ],
    rows: b.orders.map(o => {
      const t = orderTotals(o);
      return [
        o.number,
        o.client.name,
        fmtPhone(o.client.phone),
        o.productType,
        o.description,
        o.city,
        o.directions,
        stage(o.stage),
        o.price,
        t.paid,
        t.owed,
        t.owed > 0 ? (t.dueDate ? fmtDate(t.dueDate) : tw('dueUnknown')) : '',
        o.quantity ?? '',
        isProject(o) ? installedQty(o) : '',
        o.unit ?? '',
        fmtDate(isoOf(o.createdAt)),
        o.doneAt ? fmtDate(o.doneAt) : '',
        o.internalNote,
      ];
    }),
  };

  const payRows: { date: string; row: Sheet['rows'][number] }[] = [];
  const payRow = (p: (typeof b.orders)[number]['payments'][number], record: string, name: string) => ({
    date: p.date,
    row: [
      fmtDate(p.date),
      record,
      name,
      p.amount,
      method(p.method),
      p.heldBy ? tx('heldBy', { name: inst(p.heldBy) }) : tx('inOffice'),
      p.handedAt ? fmtDate(isoOf(p.handedAt)) : p.heldBy ? tx('notHanded') : '',
      who(p.createdBy),
      p.note,
      p.deletedAt ? tx('deleted') : '',
    ],
  });
  for (const o of b.orders) for (const p of o.payments) payRows.push(payRow(p, o.number, o.client.name));
  for (const ob of b.openings) for (const p of ob.payments) payRows.push(payRow(p, tx('opening'), ob.name));
  payRows.sort((a, z) => z.date.localeCompare(a.date));
  const payments: Sheet = {
    name: tx('payments'),
    cols: [
      { h: tx('col.date'), w: 12 },
      { h: tx('col.order'), w: 14 },
      { h: tx('col.client'), w: 26 },
      { h: tx('col.amount'), w: 12, money: true },
      { h: tx('col.method'), w: 10 },
      { h: tx('col.where'), w: 16 },
      { h: tx('col.handed'), w: 14 },
      { h: tx('col.by'), w: 12 },
      { h: tx('col.note'), w: 30 },
      { h: tx('col.status'), w: 10 },
    ],
    rows: payRows.map(r => r.row),
  };

  const allVisits = b.orders.flatMap(o => o.visits.map(v => ({ o, v }))).sort((a, z) => z.v.date.localeCompare(a.v.date));
  const time = (t: string | null) => (!t ? '' : t === 'morning' ? tx('morning') : t === 'afternoon' ? tx('afternoon') : t);
  const visits: Sheet = {
    name: tx('visits'),
    cols: [
      { h: tx('col.date'), w: 12 },
      { h: tx('col.time'), w: 10 },
      { h: tx('col.type'), w: 10 },
      { h: tx('col.order'), w: 10 },
      { h: tx('col.client'), w: 26 },
      { h: tx('col.installer'), w: 12 },
      { h: tx('col.city'), w: 12 },
      { h: tx('col.doneOn'), w: 12 },
      { h: tx('col.installedQty'), w: 14 },
      { h: tx('col.note'), w: 34 },
    ],
    rows: allVisits.map(({ o, v }) => [
      fmtDate(v.date),
      time(v.time),
      tw(`visit.${v.type}`),
      o.number,
      o.client.name,
      inst(v.installerId),
      o.city,
      v.doneAt ? fmtDate(v.doneAt) : '',
      v.quantity ? `${v.quantity} ${o.unit ?? ''}`.trim() : '',
      v.note,
    ]),
  };

  const openings: Sheet = {
    name: tx('openings'),
    cols: [
      { h: tx('col.name'), w: 24 },
      { h: tx('col.phone'), w: 18 },
      { h: tx('col.amount'), w: 12, money: true },
      { h: tx('col.paid'), w: 12, money: true },
      { h: tx('col.left'), w: 12, money: true },
      { h: tx('col.forWhat'), w: 24 },
      { h: tx('col.dueOpening'), w: 16 },
      { h: tx('col.note'), w: 30 },
    ],
    rows: b.openings.map(ob => {
      const t = openingTotals(ob);
      const due = ob.dueDate ? (ob.dueApprox ? `≈ ${fmtMonth(ob.dueDate.slice(0, 7))}` : fmtDate(ob.dueDate)) : tw('term.unknown');
      return [ob.name, fmtPhone(ob.phone), ob.amount, t.paid, t.owed, ob.forWhat, due, ob.note];
    }),
  };

  const clients: Sheet = {
    name: tx('clients'),
    cols: [
      { h: tx('col.name'), w: 26 },
      { h: tx('col.phone'), w: 18 },
      { h: tx('col.channel'), w: 10 },
      { h: tx('col.language'), w: 8 },
      { h: tx('col.noReminders'), w: 18 },
      { h: tx('col.orders'), w: 8 },
      { h: tx('col.note'), w: 30 },
    ],
    rows: b.clients.map(cl => [
      cl.name,
      fmtPhone(cl.phone),
      cl.channel === 'viber' ? 'Viber' : cl.channel === 'sms' ? 'SMS' : 'WhatsApp',
      cl.language,
      cl.noReminders ? tx('yes') : '',
      b.orders.filter(o => o.clientId === cl.id).length,
      cl.note,
    ]),
  };

  const sheets = [orders, payments, visits, openings, clients];
  const strip = <T extends object>(rows: T[]) => rows.map(r => ({ ...r }));
  const json = {
    exportedAt: new Date().toISOString(),
    today,
    note: tx('jsonNote'),
    moneyIn: 'cents',
    company: { brandSlug: c.brandSlug, depositWord: c.depositWord, stageLabels: c.stageLabels, productTypes: c.productTypes, projectUnits: c.projectUnits },
    users,
    installers: strip(b.installers),
    clients: strip(b.clients),
    orders: b.orders.map(o => omit(o, ['client', 'visits', 'payments', 'messages'])),
    visits: b.orders.flatMap(o => o.visits),
    payments: [...b.orders.flatMap(o => o.payments), ...b.openings.flatMap(o => o.payments)],
    openingBalances: b.openings.map(o => omit(o, ['payments', 'messages'])),
    messages: msgs,
    history: hist,
    photos: photos.map(p => ({ id: p.id, orderId: p.orderId, kind: p.kind, storageKey: p.storageKey, deletedAt: p.deletedAt, createdAt: p.createdAt })),
  };
  return { sheets, xlsx: Buffer.from(workbook(sheets)), json, base: `${c.brandSlug}-te-dhenat-${today}` };
}
