/**
 * Deleting installers ("Fshij montuesin"), the presentation setup and "start fresh", against a
 * real (in-memory) Postgres with the fixtures: the same code the actions and scripts run.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { verifyPassword } from 'better-auth/crypto';
import { createDb, type Db } from '@/db/connect';
import { runMigrations } from '@/db/migrate';
import { loadFixtures } from '@/db/fixtures';
import { businessCounts, clearPresentation, provisionCompany } from '@/db/presentation';
import { account, client, company, history, installer, payment, session, user, visit } from '@/db/schema';
import { readBrand } from '@/brand/files';
import { ForbiddenError } from '@/auth/permissions';
import { FieldError, type Actor } from '@/services/common';
import { confirmAll } from '@/services/payments';
import { installerUse, removeInstaller, saveInstaller } from '@/services/messages';

const TODAY = '2026-10-19';
let db: Db;
let owner: Actor;
let office: Actor;
let inst: Record<string, string>;

const errorKey = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) => (e instanceof FieldError ? e.key : e instanceof ForbiddenError ? 'forbidden' : String(e)),
  );
const errorText = (p: Promise<unknown>) =>
  p.then(
    () => '',
    (e: Error) => e.message,
  );

beforeEach(async () => {
  db ??= await createDb('memory://').then(async x => (await runMigrations(x, 'memory://'), x));
  await loadFixtures(db, { password: 'test-password-1', brandSlug: 'druri-design', today: TODAY });
  const users = await db.select().from(user);
  const [c] = await db.select().from(company);
  const actor = (role: 'owner' | 'office'): Actor => {
    const u = users.find(x => x.role === role)!;
    return { id: u.id, role, companyId: c.id, firstName: u.firstName };
  };
  owner = actor('owner');
  office = actor('office');
  inst = Object.fromEntries((await db.select().from(installer)).map(i => [i.name, i.id]));
}, 60_000);

describe('Fshij montuesin', () => {
  it('an installer nothing points to is deleted for good, with a history line', async () => {
    const added = await saveInstaller(db, office, null, { name: 'Arianit', phone: '44 123 456' });
    expect((await installerUse(db, owner.companyId)).get(added.id)).toBeUndefined();
    expect(await removeInstaller(db, owner, added.id)).toBe('deleted');
    expect(await db.select().from(installer).where(eq(installer.id, added.id))).toHaveLength(0);
    const h = await db.select().from(history).where(eq(history.recordId, added.id));
    expect(h.map(x => x.text)).toEqual(['Montuesi u shtua: Arianit', 'Montuesi u fshi: Arianit']);
  });

  it('only Pronari deletes', async () => {
    const added = await saveInstaller(db, office, null, { name: 'Arianit', phone: '44 123 456' });
    expect(await errorKey(removeInstaller(db, office, added.id))).toBe('forbidden');
  });

  it('cash in hand blocks removing (and switching off) until it is handed over; no record changes', async () => {
    const use = (await installerUse(db, owner.companyId)).get(inst.Faton)!;
    expect(use.heldCash).toBeGreaterThan(0);
    const before = await db.select().from(payment).where(eq(payment.heldBy, inst.Faton));
    expect(await errorKey(removeInstaller(db, owner, inst.Faton))).toBe('installerHoldsCash');
    const faton = (await db.select().from(installer).where(eq(installer.id, inst.Faton)))[0];
    expect(await errorKey(saveInstaller(db, office, inst.Faton, { name: faton.name, phone: faton.phone, active: false }))).toBe('installerHoldsCash');
    expect(await db.select().from(payment).where(eq(payment.heldBy, inst.Faton))).toEqual(before);
    expect((await db.select().from(installer).where(eq(installer.id, inst.Faton)))[0].active).toBe(true);
  });

  it('a used installer leaves the list instead: inactive, every visit and payment keeps the name', async () => {
    const u = (await installerUse(db, owner.companyId)).get(inst.Faton)!;
    // Settle what blocks it first, by hand: hand the cash over and give the open visits to Driton.
    await confirmAll(db, owner, inst.Faton);
    if (u.openVisits) await db.update(visit).set({ installerId: inst.Driton }).where(sql`${visit.installerId} = ${inst.Faton} and ${visit.doneAt} is null`);
    const left = (await installerUse(db, owner.companyId)).get(inst.Faton)!;
    expect(left).toMatchObject({ openVisits: 0, heldCash: 0 });
    expect(left.records).toBeGreaterThan(0);
    const payments = await db.select().from(payment).where(eq(payment.heldBy, inst.Faton));

    expect(await removeInstaller(db, owner, inst.Faton)).toBe('removed');
    const [row] = await db.select().from(installer).where(eq(installer.id, inst.Faton));
    expect(row.active).toBe(false);
    expect(await db.select().from(payment).where(eq(payment.heldBy, inst.Faton))).toEqual(payments);
    const h = await db.select().from(history).where(eq(history.recordId, inst.Faton));
    expect(h.at(-1)!.text).toBe('Montuesi u hoq nga lista: Faton');
    // The database itself refuses to delete an installer that records point to.
    expect(await errorText(db.delete(installer).where(eq(installer.id, inst.Faton)))).not.toBe('');
  });

  it('open visits block removing until they go to someone else', async () => {
    const b = (await installerUse(db, owner.companyId)).get(inst.Besnik)!;
    expect(b.openVisits).toBeGreaterThan(0);
    if (!b.heldCash) expect(await errorKey(removeInstaller(db, owner, inst.Besnik))).toBe('installerHasVisits');
  });
});

describe('presentation setup and start fresh', () => {
  const freshDb = async () => {
    const x = await createDb('memory://');
    await runMigrations(x, 'memory://');
    return x;
  };

  it('both presentation brands are valid, with their business type', async () => {
    const ik = await readBrand('interier-kosova');
    const mk = await readBrand('mobileria-kosova');
    expect([ik.fallback, ik.brand.companyName, ik.brand.businessType, ik.brand.contact.city]).toEqual([false, 'Interier Kosova', 'doors_floors', 'Prishtinë']);
    expect([mk.fallback, mk.brand.companyName, mk.brand.businessType, mk.brand.contact.phone]).toEqual([false, 'Mobileria Kosova', 'kitchens', '+38344100200']);
    expect(ik.logoUrl).toBeNull();
  });

  it('provision: one company, one owner with full permissions, nothing else; never twice', async () => {
    const x = await freshDb();
    const { brand } = await readBrand('interier-kosova');
    const r = await provisionCompany(x, { brand, owner: { name: 'Ibrahim', email: 'Ibrahim@Order-Tracking.test', password: 'a-long-password' } });
    const [c] = await x.select().from(company);
    expect([c.id, c.brandSlug, c.depositWord]).toEqual([r.companyId, 'interier-kosova', 'Kapar']);
    const users = await x.select().from(user);
    expect(users.map(u => [u.email, u.role, u.firstName, u.companyId])).toEqual([['ibrahim@order-tracking.test', 'owner', 'Ibrahim', c.id]]);
    const [a] = await x.select().from(account);
    expect(await verifyPassword({ hash: a.password!, password: 'a-long-password' })).toBe(true);
    expect(await businessCounts(x)).toMatchObject({ clients: 0, orders: 0, openings: 0, payments: 0, installers: 0, users: 1 });
    expect(await errorText(provisionCompany(x, { brand, owner: { name: 'Ibrahim', email: 'other@x.test', password: 'a-long-password' } }))).toMatch(/ka tashmë një kompani/);
  });

  it('start fresh: business records go; owner, session, settings, installers and their history stay', async () => {
    const [c] = await db.select().from(company);
    await db.update(company).set({ depositWord: 'Kapar', templates: { sq: { thanks: 'Faleminderit!' } } }).where(eq(company.id, c.id));
    await db.insert(session).values({ id: 's1', token: 't1', userId: owner.id, expiresAt: new Date(Date.now() + 864e5) });
    await db.insert(history).values({ companyId: c.id, recordType: 'settings', userId: owner.id, text: 'Fjala për paradhënien: Avans → Kapar' });
    const keptHistory = await db.select().from(history).where(sql`${history.recordType} in ('installer', 'settings')`);
    const installers = await db.select().from(installer);
    const before = await businessCounts(db);
    expect(before.orders).toBeGreaterThan(0);

    await clearPresentation(db, { companyId: c.id, brandSlug: 'druri-design' });

    expect(await businessCounts(db)).toMatchObject({ clients: 0, orders: 0, openings: 0, payments: 0, visits: 0, messages: 0, history: keptHistory.length, installers: installers.length, users: before.users });
    expect(await db.select().from(history)).toEqual(keptHistory);
    expect(await db.select().from(installer)).toEqual(installers);
    expect(await db.select().from(session)).toHaveLength(1);
    const [after] = await db.select().from(company);
    expect([after.depositWord, after.templates, after.orderSeq, after.orderSeqYear]).toEqual(['Kapar', { sq: { thanks: 'Faleminderit!' } }, 0, 0]);
    // The append-only rule still holds afterwards.
    expect(await errorText(db.delete(history))).not.toBe('');
    // Every installer is unused now, so each can be deleted for good.
    for (const id of installers.map(i => i.id)) expect(await removeInstaller(db, owner, id)).toBe('deleted');
  });

  it('start fresh refuses a database with two companies, or another company, and changes nothing', async () => {
    const [c] = await db.select().from(company);
    expect(await errorText(clearPresentation(db, { companyId: c.id, brandSlug: 'lumi-dyer' }))).toMatch(/nuk është ajo e pritura/);
    expect(await errorText(clearPresentation(db, { companyId: crypto.randomUUID(), brandSlug: 'druri-design' }))).toMatch(/nuk është ajo e pritura/);
    const [other] = await db.insert(company).values({ brandSlug: 'lumi-dyer' }).returning();
    await db.insert(client).values({ companyId: other.id, name: 'Klient i Lumit', phone: '+38344000000' });
    const before = await businessCounts(db);
    expect(await errorText(clearPresentation(db, { companyId: c.id, brandSlug: 'druri-design' }))).toMatch(/ka 2 kompani/);
    expect(await businessCounts(db)).toEqual(before);
    await db.delete(client).where(eq(client.companyId, other.id));
    await db.delete(company).where(eq(company.id, other.id));
  });
});
