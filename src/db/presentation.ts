/**
 * Presentation installations (one company per database): creating the company with its single
 * owner, and "start fresh". No Next.js imports: the scripts in /scripts and the tests use it.
 *
 * Start fresh empties whole tables, which is only right while the database holds exactly one
 * company. So it checks that, and that the company is the one the caller expects, inside the
 * same transaction that clears; a second company makes it refuse instead of wiping both.
 */
import { sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import type { Brand } from '../brand/schema';
import type { Db } from './connect';
import { account, company, user } from './schema';

/** Every business record of the company; together they are all the tables that point to orders or clients. */
const BUSINESS_TABLES = ['history', 'message', 'photo', 'payment', 'visit', 'orders', 'opening_balance', 'client'];

/** History kept by start fresh: the installers ("Montuesit") and the company settings. */
const KEPT_HISTORY = ['installer', 'settings'];

export async function provisionCompany(
  db: Db,
  opts: { brand: Brand; owner: { name: string; email: string; password: string } },
) {
  const email = opts.owner.email.trim().toLowerCase();
  const name = opts.owner.name.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email-i nuk është i vlefshëm.');
  if (name.length < 2) throw new Error('Emri duhet të ketë të paktën 2 shkronja.');
  if (opts.owner.password.length < 8) throw new Error('Fjalëkalimi duhet të ketë të paktën 8 shenja.');
  const hash = await hashPassword(opts.owner.password);
  return db.transaction(async tx => {
    await tx.execute(sql`lock table company in exclusive mode`);
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(company);
    if (n > 0) throw new Error('Kjo bazë ka tashmë një kompani: provision bëhet vetëm në një bazë të zbrazët.');
    const [c] = await tx.insert(company).values({ brandSlug: opts.brand.slug, depositWord: opts.brand.depositWord }).returning();
    const id = crypto.randomUUID();
    await tx.insert(user).values({ id, email, name, firstName: name.split(/\s+/)[0], role: 'owner', emailVerified: true, companyId: c.id });
    await tx.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: 'credential', userId: id, password: hash });
    return { companyId: c.id, userId: id };
  });
}

export type BusinessCounts = Record<'clients' | 'orders' | 'openings' | 'payments' | 'visits' | 'messages' | 'history' | 'installers' | 'users', number>;

export async function businessCounts(db: Db): Promise<BusinessCounts> {
  const { rows } = (await db.execute(sql`select
    (select count(*) from client)::int as clients, (select count(*) from orders)::int as orders,
    (select count(*) from opening_balance)::int as openings, (select count(*) from payment)::int as payments,
    (select count(*) from visit)::int as visits, (select count(*) from message)::int as messages,
    (select count(*) from history)::int as history, (select count(*) from installer)::int as installers,
    (select count(*) from "user")::int as users`)) as unknown as { rows: BusinessCounts[] };
  return rows[0];
}

/**
 * "Start fresh": clients, orders, visits, payments (and the cash installers hold), opening
 * balances, messages, photos and their history go; users, sessions, company settings and
 * installers stay, with the installer and settings history. Order numbers restart at 001.
 * The append-only trigger stays on: TRUNCATE doesn't fire row triggers, and the kept history
 * goes back unchanged. No CASCADE, so a future table pointing here fails instead of emptying.
 */
export async function clearPresentation(db: Db, expect: { companyId: string; brandSlug: string }) {
  await db.transaction(async tx => {
    await tx.execute(sql`lock table company in exclusive mode`);
    const rows = await tx.select({ id: company.id, brandSlug: company.brandSlug }).from(company);
    if (rows.length !== 1) throw new Error(`Kjo bazë ka ${rows.length} kompani: pastrimi bëhet vetëm në një bazë me një kompani.`);
    if (rows[0].id !== expect.companyId || rows[0].brandSlug !== expect.brandSlug)
      throw new Error('Kompania në këtë bazë nuk është ajo e pritura: asgjë nuk u fshi.');
    const kept = KEPT_HISTORY.map(t => `'${t}'`).join(', ');
    await tx.execute(sql.raw(`create temp table kept_history on commit drop as select * from history where record_type in (${kept})`));
    await tx.execute(sql.raw(`truncate ${BUSINESS_TABLES.join(', ')}`));
    await tx.execute(sql.raw('insert into history select * from kept_history'));
    await tx.update(company).set({ orderSeq: 0, orderSeqYear: 0 });
  });
}
