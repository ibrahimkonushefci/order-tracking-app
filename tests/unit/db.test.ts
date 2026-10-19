import { describe, expect, it, beforeAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { verifyPassword } from 'better-auth/crypto';
import { createDb, type Db } from '@/db/connect';
import { runMigrations } from '@/db/migrate';
import { loadFixtures, FIXTURE_INSTALLERS, FIXTURE_USERS } from '@/db/fixtures';
import { account, company, history, installer, payment, user } from '@/db/schema';

let db: Db;

/** Drizzle wraps the Postgres error; the database's own message is in `cause`. */
const dbError = (p: Promise<unknown>) =>
  p.then(
    () => '',
    (e: Error & { cause?: Error }) => `${e.message} ${e.cause?.message ?? ''}`,
  );
beforeAll(async () => {
  db = await createDb('memory://');
  await runMigrations(db, 'memory://');
  await loadFixtures(db, { password: 'test-password-1', brandSlug: 'druri-design' });
}, 60_000);

describe('Phase 2 fixtures', () => {
  it('one company, Pronari + Zyra, three installers', async () => {
    expect(await db.select().from(company)).toHaveLength(1);
    const users = await db.select().from(user);
    expect(users.map(u => [u.email, u.role, u.firstName]).sort()).toEqual(
      FIXTURE_USERS.map(u => [u.email, u.role, u.firstName]).sort(),
    );
    const inst = await db.select().from(installer);
    expect(inst.map(i => i.name).sort()).toEqual(FIXTURE_INSTALLERS.map(i => i.name).sort());
    expect(inst.every(i => /^\+383\d{8}$/.test(i.phone))).toBe(true);
  });

  it('stores hashed passwords that verify', async () => {
    const [a] = await db.select().from(account).limit(1);
    expect(a.password).not.toContain('test-password-1');
    expect(await verifyPassword({ hash: a.password!, password: 'test-password-1' })).toBe(true);
  });

  it('is repeatable: loading twice gives the same records', async () => {
    await loadFixtures(db, { password: 'test-password-1', brandSlug: 'druri-design' });
    expect(await db.select().from(user)).toHaveLength(2);
    expect(await db.select().from(installer)).toHaveLength(3);
  });
});

describe('schema guards', () => {
  it('history is append-only', async () => {
    const [c] = await db.select().from(company);
    await db.insert(history).values({ companyId: c.id, recordType: 'settings', text: 'test' });
    expect(await dbError(db.execute(sql`update history set text = 'x'`))).toMatch(/append-only/);
    expect(await dbError(db.execute(sql`delete from history`))).toMatch(/append-only/);
  });

  it('a payment belongs to exactly one order or opening balance, and is positive', async () => {
    const [c] = await db.select().from(company);
    expect(
      await dbError(db.insert(payment).values({ companyId: c.id, amount: 1000, date: '2026-10-19', method: 'cash' })),
    ).toMatch(/payment_one_record/);
  });
});
