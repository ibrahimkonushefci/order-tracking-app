/**
 * Logging what a person sent by hand (spec §5, §7): after WhatsApp/Viber/SMS opened, the
 * app asks "U dërgua?" and only a "Po" is written here. Nothing is ever sent from the server.
 * Also: the tracking link ("Link i ri"), the client's language and channel, installers,
 * and the company's message templates.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { DEFAULT_TEMPLATES, LANGS, TEMPLATE_TYPES, type Lang, type TemplateType } from '@/domain/messages';
import { client, company, installer, message, openingBalance, orders, visit, type Channel } from '@/db/schema';
import type { Db } from '@/db/connect';
import { fmtDate } from '@/lib/dates';
import { loadOpening } from './book';
import { allow, FieldError, log, newToken, NotFoundError, th, throwIf, toE164, tw, type Actor } from './common';
import { checkInstaller, mustLoad } from './orders';

const CHANNELS: readonly Channel[] = ['whatsapp', 'viber', 'sms'];
const channelOf = (c: unknown): Channel => (CHANNELS.includes(c as Channel) ? (c as Channel) : 'whatsapp');
const langOf = (l: unknown): Lang => (LANGS.includes(l as Lang) ? (l as Lang) : 'sq');
const CUSTOMER_TYPES = ['deposit', 'visit', 'link', 'thanks', 'reminder', 'free'] as const;
const text = (v: unknown, max = 4000) => String(v ?? '').trim().slice(0, max);
const chName = (c: Channel) => tw(`channelName.${c}`);
const firstOf = (name: string) => name.trim().split(/\s+/)[0];

export interface SentInput {
  type: string;
  channel: string;
  language: string;
  text: string;
}

/** "U dërgua? Po" for a customer message on an order or an opening balance. */
export async function logCustomerMessage(db: Db, actor: Actor, target: { orderId: string } | { openingId: string }, input: SentInput) {
  allow(actor, 'daily');
  const type = CUSTOMER_TYPES.find(t => t === input.type);
  if (!type) throw new FieldError('_', 'invalid');
  const body = text(input.text);
  if (!body) throw new FieldError('text', 'messageEmpty');
  const channel = channelOf(input.channel);
  await db.transaction(async tx => {
    let name: string;
    if ('orderId' in target) {
      const o = await mustLoad(tx, actor, target.orderId);
      name = o.client.name;
    } else {
      const ob = await loadOpening(tx, actor.companyId, target.openingId);
      if (!ob) throw new NotFoundError('opening');
      name = ob.name;
    }
    await tx.insert(message).values({
      companyId: actor.companyId,
      ...target,
      recipient: 'client',
      type,
      channel,
      language: langOf(input.language),
      text: body,
      sentBy: actor.id,
    });
    const label = type === 'deposit' ? tw('msgType.deposit', { word: await depositWord(tx, actor.companyId) }) : tw(`msgType.${type}`);
    const [kind, id] = 'orderId' in target ? (['order', target.orderId] as const) : (['opening', target.openingId] as const);
    await log(tx, actor, kind, id, th('messageSent', { channel: chName(channel), label, name: firstOf(name) }));
  });
}

async function depositWord(tx: Pick<Db, 'select'>, companyId: string) {
  return (await tx.select({ w: company.depositWord }).from(company).where(eq(company.id, companyId)))[0]?.w ?? 'Avans';
}

export interface InstallerSentInput {
  installerId: string;
  visitIds: string[];
  mode: 'visit' | 'day';
  channel: string;
  text: string;
  /** "Dërgo te montuesi" with another installer chosen: the visit is assigned to them. */
  assign?: boolean;
}

/** "U dërgua? Po" for one visit or one installer's day: each visit is marked sent and logged on its order. */
export async function logInstallerMessage(db: Db, actor: Actor, input: InstallerSentInput) {
  allow(actor, 'daily');
  const body = text(input.text);
  if (!body) throw new FieldError('text', 'messageEmpty');
  if (!input.visitIds.length) throw new FieldError('_', 'invalid');
  const channel = channelOf(input.channel);
  await db.transaction(async tx => {
    const inst = await checkInstaller(tx, actor, input.installerId);
    const rows = await tx
      .select()
      .from(visit)
      .where(and(eq(visit.companyId, actor.companyId), inArray(visit.id, input.visitIds)));
    if (rows.length !== input.visitIds.length) throw new NotFoundError('visit');
    const now = new Date();
    const byOrder = new Map<string, typeof rows>();
    for (const v of rows) {
      if (input.assign && v.installerId !== inst.id && !v.doneAt) {
        await log(tx, actor, 'order', v.orderId, th('visitAssigned', { visit: `${tw(`visit.${v.type}`)} · ${fmtDate(v.date)}`, name: inst.name }));
      }
      await tx
        .update(visit)
        .set({ lastSentAt: now, ...(input.assign && !v.doneAt ? { installerId: inst.id } : {}) })
        .where(eq(visit.id, v.id));
      byOrder.set(v.orderId, [...(byOrder.get(v.orderId) ?? []), v]);
    }
    for (const [orderId, vs] of byOrder) {
      await tx.insert(message).values({
        companyId: actor.companyId,
        orderId,
        recipient: 'installer',
        installerId: inst.id,
        type: input.mode === 'day' ? 'day' : 'job',
        channel,
        text: body,
        sentBy: actor.id,
      });
      for (const v of vs) {
        const line =
          input.mode === 'day'
            ? th('daySent', { date: fmtDate(v.date), name: inst.name, channel: chName(channel) })
            : th('jobSent', { visit: `${tw(`visit.${v.type}`)} ${fmtDate(v.date)}`, name: inst.name, channel: chName(channel) });
        await log(tx, actor, 'order', orderId, line);
      }
    }
  });
}

/** "Link i ri": the old link stops working at once and shows only the neutral page. */
export async function newTrackingLink(db: Db, actor: Actor, orderId: string) {
  allow(actor, 'daily');
  return db.transaction(async tx => {
    await mustLoad(tx, actor, orderId);
    const token = newToken();
    await tx.update(orders).set({ trackingToken: token }).where(eq(orders.id, orderId));
    await log(tx, actor, 'order', orderId, th('linkReplaced'));
    return token;
  });
}

/** The client's language (messages and tracking page) and preferred channel. */
export async function setClientContact(db: Db, actor: Actor, clientId: string, input: { language?: string; channel?: string }) {
  allow(actor, 'daily');
  await db.transaction(async tx => {
    const [c] = await tx.select().from(client).where(and(eq(client.id, clientId), eq(client.companyId, actor.companyId))).limit(1);
    if (!c) throw new NotFoundError('client');
    const language = input.language ? langOf(input.language) : c.language;
    const channel = input.channel ? channelOf(input.channel) : c.channel;
    if (language === c.language && channel === c.channel) return;
    await tx.update(client).set({ language, channel }).where(eq(client.id, clientId));
    if (language !== c.language) await log(tx, actor, 'client', clientId, th('change', { label: tw('field.language'), from: tw(`lang.${c.language}`), to: tw(`lang.${language}`) }));
    if (channel !== c.channel) await log(tx, actor, 'client', clientId, th('change', { label: tw('field.channel'), from: chName(c.channel), to: chName(channel) }));
  });
}

export async function setOpeningContact(db: Db, actor: Actor, id: string, input: { language?: string; channel?: string }) {
  allow(actor, 'daily');
  await db.transaction(async tx => {
    const ob = await loadOpening(tx, actor.companyId, id);
    if (!ob) throw new NotFoundError('opening');
    const language = input.language ? langOf(input.language) : ob.language;
    const channel = input.channel ? channelOf(input.channel) : ob.channel;
    if (language === ob.language && channel === ob.channel) return;
    await tx.update(openingBalance).set({ language, channel }).where(eq(openingBalance.id, id));
    if (language !== ob.language) await log(tx, actor, 'opening', id, th('change', { label: tw('field.language'), from: tw(`lang.${ob.language}`), to: tw(`lang.${language}`) }));
    if (channel !== ob.channel) await log(tx, actor, 'opening', id, th('change', { label: tw('field.channel'), from: chName(ob.channel), to: chName(channel) }));
  });
}

/* ───────── Installers (contacts, not users) ───────── */

export interface InstallerInput {
  name: string;
  phoneCc?: string;
  phone: string;
  channel?: string;
  active?: boolean;
}

/** Cilësimet → Montuesit: add or edit (both roles). Installers are never deleted, only set inactive. */
export async function saveInstaller(db: Db, actor: Actor, id: string | null, input: InstallerInput) {
  allow(actor, 'daily');
  const errors: FieldError[] = [];
  const name = text(input.name, 60);
  if (!name) errors.push(new FieldError('name', 'installerNameRequired'));
  const phone = text(input.phone) ? toE164(input.phoneCc ?? '+383', input.phone) : null;
  if (!phone) errors.push(new FieldError('phone', text(input.phone) ? 'phoneInvalid' : 'phoneRequired'));
  throwIf(errors);
  const channel = input.channel === 'viber' ? 'viber' : 'whatsapp';
  return db.transaction(async tx => {
    if (!id) {
      const [row] = await tx.insert(installer).values({ companyId: actor.companyId, name, phone: phone!, channel }).returning();
      await log(tx, actor, 'installer', row.id, th('installerAdded', { name }));
      return row;
    }
    const old = await checkInstaller(tx, actor, id);
    const active = input.active ?? old.active;
    const [row] = await tx.update(installer).set({ name, phone: phone!, channel, active }).where(eq(installer.id, id)).returning();
    if (old.name !== name || old.phone !== phone || old.channel !== channel || old.active !== active)
      await log(tx, actor, 'installer', id, th('installerEdited', { name }));
    return row;
  });
}

/* ───────── Templates (Pronari) ───────── */

/** Cilësimet → Mesazhet: the company's wording per language; an empty field goes back to the default. */
export async function saveTemplates(db: Db, actor: Actor, lang: string, input: Partial<Record<TemplateType, string>>) {
  allow(actor, 'settings');
  const l = langOf(lang);
  await db.transaction(async tx => {
    const [c] = await tx.select({ templates: company.templates }).from(company).where(eq(company.id, actor.companyId));
    const next = { ...(c?.templates ?? {}) };
    const mine: Record<string, string> = {};
    for (const t of TEMPLATE_TYPES) {
      const v = text(input[t], 2000);
      // The default wording isn't stored, so later improvements to it still reach this company.
      if (v && v !== DEFAULT_TEMPLATES[l][t].trim()) mine[t] = v;
    }
    next[l] = mine;
    await tx.update(company).set({ templates: next }).where(eq(company.id, actor.companyId));
    await log(tx, actor, 'settings', null, th('templatesSaved', { lang: tw(`lang.${l}`) }));
  });
}
