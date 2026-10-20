/**
 * "Rivendos demon": empties the database and seeds every demo brand (brands/<slug>/brand.json
 * with `"demo": true`) as its own company, with its own Pronari/Zyra and the realistic dataset
 * (seed.ts). One company per brand keeps `?brand=` honest: the logo, the business type and the
 * data always agree. Rows are inserted in bulk, so a reset takes seconds on Neon too.
 * No Next.js imports: the `pnpm demo` script and the tests use it directly.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { z } from 'zod';
import { BRANDS_DIR, listBrandSlugs, readBrand } from '../../brand/files';
import type { Brand } from '../../brand/schema';
import { todayIso } from '../../lib/dates';
import type { Db } from '../connect';
import {
  account,
  client,
  company,
  history,
  installer,
  message,
  openingBalance,
  orders,
  payment,
  user,
  visit,
} from '../schema';
import { buildDemo, DEFAULT_PEOPLE, type DemoPeople } from './seed';

const TABLES = [
  'history',
  'message',
  'photo',
  'payment',
  'visit',
  'orders',
  'opening_balance',
  'client',
  'installer',
  'session',
  'account',
  'verification',
  '"user"',
  'company',
];

/** The demo logins of a brand. Both use FIXTURE_PASSWORD; the demo buttons don't need typing. */
export const demoEmail = (slug: string, role: 'owner' | 'office') =>
  `${role === 'owner' ? 'pronari' : 'zyra'}@${slug}.test`;

const peopleSchema = z.object({
  owner: z.string().trim().min(2).max(60).optional(),
  office: z.string().trim().min(2).max(60).optional(),
});

/**
 * Optional brands/<slug>/demo.json: {"owner": "Arben Gashi", "office": "Teuta Berisha"}.
 * Lets a rebrand sign the demo messages with the real owner's first name.
 */
export async function readPeople(slug: string): Promise<DemoPeople> {
  try {
    const raw = peopleSchema.parse(
      JSON.parse(await fs.readFile(path.join(BRANDS_DIR, slug, 'demo.json'), 'utf8')),
    );
    const person = (full: string | undefined, fallback: DemoPeople['owner']) =>
      full ? { name: full, firstName: full.split(/\s+/)[0] } : fallback;
    return {
      owner: person(raw.owner, DEFAULT_PEOPLE.owner),
      office: person(raw.office, DEFAULT_PEOPLE.office),
    };
  } catch {
    return DEFAULT_PEOPLE;
  }
}

export async function writePeople(slug: string, people: { owner: string; office: string }) {
  await fs.writeFile(
    path.join(BRANDS_DIR, slug, 'demo.json'),
    JSON.stringify(people, null, 2) + '\n',
  );
}

/** Every valid brand folder marked `"demo": true`, the default brand first. */
export async function demoBrands(first?: string): Promise<{ slug: string; brand: Brand }[]> {
  const out: { slug: string; brand: Brand }[] = [];
  for (const slug of await listBrandSlugs()) {
    const { brand, fallback } = await readBrand(slug);
    if (!fallback && brand.demo) out.push({ slug, brand });
  }
  return out.sort(
    (a, b) => Number(b.slug === first) - Number(a.slug === first) || a.slug.localeCompare(b.slug),
  );
}

async function insertChunks<T>(insert: (rows: T[]) => Promise<unknown>, rows: T[], size = 250) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
}

export interface DemoSummary {
  slug: string;
  companyId: string;
  orders: number;
  clients: number;
  openings: number;
}

export async function loadDemo(
  db: Db,
  opts: {
    password: string;
    today?: string;
    first?: string;
    brands?: { slug: string; brand: Brand }[];
    /** Daily refresh: only reseed when some demo company was seeded before today (checked under a lock). */
    onlyIfStale?: boolean;
  },
): Promise<DemoSummary[]> {
  if (opts.password.length < 8) throw new Error('FIXTURE_PASSWORD must be at least 8 characters');
  const brands = opts.brands ?? (await demoBrands(opts.first));
  if (!brands.length)
    throw new Error('No demo brands: add a brands/<slug>/brand.json with "demo": true');
  const today = opts.today ?? todayIso();
  const hash = await hashPassword(opts.password);
  const people = await Promise.all(brands.map(b => readPeople(b.slug)));
  const summary: DemoSummary[] = [];
  await db.transaction(async tx => {
    if (opts.onlyIfStale) {
      // Two app instances may start the refresh at once: the second waits here, then skips.
      await tx.execute(sql`select pg_advisory_xact_lock(482113)`);
      const seeded = await tx.select({ demo: company.demo }).from(company);
      const demo = seeded.filter(c => c.demo);
      if (!demo.length || demo.every(c => c.demo!.seededOn === today)) return;
    }
    await tx.execute(sql.raw(`TRUNCATE ${TABLES.join(', ')} CASCADE`));
    for (const [n, { slug, brand }] of brands.entries()) {
      const [c] = await tx
        .insert(company)
        .values({ brandSlug: slug, depositWord: brand.depositWord })
        .returning();
      const users = {} as Record<'owner' | 'office', { id: string; firstName: string }>;
      for (const role of ['owner', 'office'] as const) {
        const p = people[n][role];
        const id = crypto.randomUUID();
        users[role] = { id, firstName: p.firstName };
        await tx
          .insert(user)
          .values({
            id,
            email: demoEmail(slug, role),
            name: p.name,
            firstName: p.firstName,
            role,
            emailVerified: true,
            companyId: c.id,
          });
        await tx
          .insert(account)
          .values({
            id: crypto.randomUUID(),
            accountId: id,
            providerId: 'credential',
            userId: id,
            password: hash,
          });
      }
      const rows = buildDemo({ companyId: c.id, slug, brand, users, today });
      await tx.insert(installer).values(rows.installers);
      await insertChunks(r => tx.insert(client).values(r), rows.clients);
      await insertChunks(r => tx.insert(openingBalance).values(r), rows.openings);
      await insertChunks(r => tx.insert(orders).values(r), rows.orders);
      await insertChunks(r => tx.insert(visit).values(r), rows.visits);
      await insertChunks(r => tx.insert(payment).values(r), rows.payments);
      await insertChunks(r => tx.insert(message).values(r), rows.messages);
      await insertChunks(r => tx.insert(history).values(r), rows.history);
      await tx
        .update(company)
        .set({
          orderSeqYear: rows.orderSeqYear,
          orderSeq: rows.orderSeq,
          demo: { seededOn: today, keys: { ...rows.keys, busyDay: rows.busyDay } },
        })
        .where(sql`${company.id} = ${c.id}`);
      summary.push({
        slug,
        companyId: c.id,
        orders: rows.orders.length,
        clients: rows.clients.length,
        openings: rows.openings.length,
      });
    }
  });
  return summary;
}
