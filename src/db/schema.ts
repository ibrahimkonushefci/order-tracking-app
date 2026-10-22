/**
 * Drizzle schema (approved in Phase 2).
 *
 * - Money is integer cents. Business dates are `date` strings (yyyy-MM-dd, Europe/Belgrade);
 *   audit times are timestamptz.
 * - Every main table carries `companyId`, so multi-tenancy is easy later (one instance per client now).
 * - Phase 2 fills only `company`, the Better Auth tables and `installer`; later phases add behaviour.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const id = () => uuid('id').primaryKey().defaultRandom();
const companyRef = () =>
  uuid('company_id')
    .notNull()
    .references(() => company.id);

export type Role = 'owner' | 'office';
export type Channel = 'whatsapp' | 'viber' | 'sms';
export type Language = 'sq' | 'en' | 'de';
export type Stage = 'new' | 'active' | 'done' | 'cancelled';
export type PayTerm = 'week' | 'month' | 'date' | 'unknown';
export type VisitType = 'measure' | 'install' | 'delivery' | 'repair';
export type PayMethod = 'cash' | 'bank' | 'card';

/* ───────── Company (one per instance) ───────── */

export const company = pgTable('company', {
  id: id(),
  brandSlug: text('brand_slug').notNull(),
  depositWord: text('deposit_word').$type<'Avans' | 'Kapar'>().notNull().default('Avans'),
  /** Overrides for the stage labels, by key: { new?, active?, done? }. Keys never change. */
  stageLabels: jsonb('stage_labels').$type<Partial<Record<'new' | 'active' | 'done', string>>>().notNull().default({}),
  productTypes: jsonb('product_types').$type<string[]>().notNull().default([]),
  projectUnits: jsonb('project_units').$type<string[]>().notNull().default(['copë', 'm²', 'banesa']),
  /** Customer message template overrides per language, by template type. */
  templates: jsonb('templates').$type<Partial<Record<Language, Record<string, string>>>>().notNull().default({}),
  /** Order numbers look like 2026-041: the sequence restarts each year. */
  orderSeqYear: integer('order_seq_year').notNull().default(0),
  orderSeq: integer('order_seq').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ───────── Better Auth (users = Pronari / Zyra) ───────── */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').$type<Role>().notNull().default('office'),
  /** Signs customer messages ("Teuta, Druri Design") and appears in the history. */
  firstName: text('first_name').notNull().default(''),
  companyId: uuid('company_id').references(() => company.id),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('session_user_idx').on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('account_user_idx').on(t.userId)],
);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ───────── Contacts ───────── */

/** Installers are contacts, not users: they get their jobs on WhatsApp/Viber. */
export const installer = pgTable('installer', {
  id: id(),
  companyId: companyRef(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  channel: text('channel').$type<'whatsapp' | 'viber'>().notNull().default('whatsapp'),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** The client is the person who pays and gets reminders. */
export const client = pgTable(
  'client',
  {
    id: id(),
    companyId: companyRef(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    channel: text('channel').$type<Channel>().notNull().default('whatsapp'),
    language: text('language').$type<Language>().notNull().default('sq'),
    noReminders: boolean('no_reminders').notNull().default(false),
    note: text('note').notNull().default(''),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('client_phone_idx').on(t.phone)],
);

/* ───────── Orders, visits, payments ───────── */

export const orders = pgTable(
  'orders',
  {
    id: id(),
    companyId: companyRef(),
    number: text('number').notNull(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => client.id),
    productType: text('product_type').notNull(),
    description: text('description').notNull().default(''),
    price: integer('price').notNull(),
    stage: text('stage').$type<Stage>().notNull().default('new'),
    doneAt: date('done_at'),
    city: text('city').notNull().default(''),
    /** "Si të shkoni / Pikë referimi": shown to installers, goes into their message. */
    directions: text('directions').notNull().default(''),
    /** Never put into any message. */
    internalNote: text('internal_note').notNull().default(''),
    payTerm: text('pay_term').$type<PayTerm>(),
    dueDate: date('due_date'),
    /** Multi-unit project: quantity + unit; null for normal orders. */
    quantity: integer('quantity'),
    unit: text('unit'),
    projectPayTerm: text('project_pay_term').$type<Exclude<PayTerm, 'date'>>(),
    /** "Ka punë të mbetura": the note; null when there is none. */
    remainingWork: text('remaining_work'),
    pausedUntil: date('paused_until'),
    pauseReason: text('pause_reason'),
    trackingToken: text('tracking_token').notNull(),
    createdBy: text('created_by').references(() => user.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    uniqueIndex('orders_number_uq').on(t.companyId, t.number),
    uniqueIndex('orders_tracking_uq').on(t.trackingToken),
    index('orders_client_idx').on(t.clientId),
    check('orders_price_nonneg', sql`${t.price} >= 0`),
    check('orders_project_shape', sql`(${t.quantity} is null) = (${t.unit} is null)`),
  ],
);

export const visit = pgTable(
  'visit',
  {
    id: id(),
    companyId: companyRef(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    type: text('type').$type<VisitType>().notNull(),
    date: date('date').notNull(),
    /** 'morning' | 'afternoon' | 'HH:MM' | null */
    time: text('time'),
    installerId: uuid('installer_id').references(() => installer.id),
    note: text('note').notNull().default(''),
    doneAt: date('done_at'),
    /** Project parts: quantity installed and its value in cents. */
    quantity: integer('quantity'),
    value: integer('value'),
    /** "Mblidh €X" switch in the send screen. */
    collect: boolean('collect').notNull().default(false),
    lastSentAt: timestamp('last_sent_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('visit_date_idx').on(t.companyId, t.date),
    index('visit_order_idx').on(t.orderId),
  ],
);

/* ───────── Opening balances ("Borxh i bartur") ───────── */

export const openingBalance = pgTable('opening_balance', {
  id: id(),
  companyId: companyRef(),
  name: text('name').notNull(),
  phone: text('phone').notNull().default(''),
  channel: text('channel').$type<Channel>().notNull().default('whatsapp'),
  language: text('language').$type<Language>().notNull().default('sq'),
  amount: integer('amount').notNull(),
  forWhat: text('for_what').notNull().default(''),
  /** Free text: a date, a month/year or "nuk e di". */
  workDone: text('work_done').notNull().default(''),
  /** null = "Afat i panjohur". */
  dueDate: date('due_date'),
  /** The due date is only known to the month. */
  dueApprox: boolean('due_approx').notNull().default(false),
  note: text('note').notNull().default(''),
  noReminders: boolean('no_reminders').notNull().default(false),
  pausedUntil: date('paused_until'),
  pauseReason: text('pause_reason'),
  createdBy: text('created_by').references(() => user.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const payment = pgTable(
  'payment',
  {
    id: id(),
    companyId: companyRef(),
    orderId: uuid('order_id').references(() => orders.id),
    openingId: uuid('opening_id').references(() => openingBalance.id),
    amount: integer('amount').notNull(),
    date: date('date').notNull(),
    method: text('method').$type<PayMethod>().notNull(),
    /** Installer holding the cash; null = in the office. */
    heldBy: uuid('held_by').references(() => installer.id),
    handedAt: timestamp('handed_at', { withTimezone: true }),
    handedBy: text('handed_by').references(() => user.id),
    note: text('note').notNull().default(''),
    createdBy: text('created_by').references(() => user.id),
    /** "Fshij" removes it from every total; the row stays so history and export can name it. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    check('payment_one_record', sql`(${t.orderId} is null) <> (${t.openingId} is null)`),
    check('payment_positive', sql`${t.amount} > 0`),
    index('payment_order_idx').on(t.orderId),
    index('payment_opening_idx').on(t.openingId),
  ],
);

/* ───────── Messages, history, photos ───────── */

export const message = pgTable(
  'message',
  {
    id: id(),
    companyId: companyRef(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }),
    openingId: uuid('opening_id').references(() => openingBalance.id, { onDelete: 'cascade' }),
    recipient: text('recipient').$type<'client' | 'installer'>().notNull(),
    installerId: uuid('installer_id').references(() => installer.id),
    /** deposit | visit | link | thanks | reminder | free | job | day */
    type: text('type').notNull(),
    channel: text('channel').$type<Channel>().notNull(),
    language: text('language').$type<Language>().notNull().default('sq'),
    text: text('text').notNull(),
    sentBy: text('sent_by').references(() => user.id),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [index('message_order_idx').on(t.orderId), index('message_opening_idx').on(t.openingId)],
);

/** Append-only: a trigger (migration 0001) rejects UPDATE and DELETE. */
export const history = pgTable(
  'history',
  {
    id: id(),
    companyId: companyRef(),
    recordType: text('record_type')
      .$type<'order' | 'opening' | 'client' | 'installer' | 'settings'>()
      .notNull(),
    recordId: uuid('record_id'),
    userId: text('user_id').references(() => user.id),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    text: text('text').notNull(),
    field: text('field'),
    oldValue: text('old_value'),
    newValue: text('new_value'),
  },
  t => [index('history_record_idx').on(t.recordType, t.recordId)],
);

export const photo = pgTable('photo', {
  id: id(),
  companyId: companyRef(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  kind: text('kind').$type<'notebook' | 'after' | 'other'>().notNull(),
  /** Unique, never overwritten (append-only storage). */
  storageKey: text('storage_key').notNull().unique(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by').references(() => user.id),
  createdAt: createdAt(),
});
