/**
 * Test fixtures (PHASES.md "Test fixtures"). All data is fictional. Loading always starts
 * from an empty database, so every review and test begins from the same known records.
 * - Phase 2: one brand, Pronari + Zyra, three installers.
 * - Phase 3: the order and money cases (fixtures-phase3.ts), dated relative to today.
 */
import { sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import type { Db } from './connect';
import { account, company, installer, user } from './schema';
import { loadPhase3 } from './fixtures-phase3';
import { todayIso } from '../lib/dates';

export const FIXTURE_USERS = [
  { email: 'arben@druri.test', name: 'Arben Gashi', firstName: 'Arben', role: 'owner' as const },
  { email: 'teuta@druri.test', name: 'Teuta Berisha', firstName: 'Teuta', role: 'office' as const },
];

export const FIXTURE_INSTALLERS = [
  { name: 'Driton', phone: '+38344281734', channel: 'whatsapp' as const },
  { name: 'Faton', phone: '+38349660218', channel: 'whatsapp' as const },
  { name: 'Besnik', phone: '+38345117390', channel: 'viber' as const },
];

const TABLES = ['history', 'message', 'photo', 'payment', 'visit', 'orders', 'opening_balance', 'client', 'installer', 'session', 'account', 'verification', '"user"', 'company'];

export async function loadFixtures(
  db: Db,
  opts: { password: string; brandSlug: string; depositWord?: 'Avans' | 'Kapar'; today?: string; phase2Only?: boolean },
) {
  if (opts.password.length < 8) throw new Error('FIXTURE_PASSWORD must be at least 8 characters');
  const hash = await hashPassword(opts.password);
  await db.transaction(async tx => {
    await tx.execute(sql.raw(`TRUNCATE ${TABLES.join(', ')} CASCADE`));
    const [c] = await tx
      .insert(company)
      .values({ brandSlug: opts.brandSlug, depositWord: opts.depositWord ?? 'Avans' })
      .returning();
    const users: Record<'owner' | 'office', string> = { owner: '', office: '' };
    for (const u of FIXTURE_USERS) {
      const id = crypto.randomUUID();
      users[u.role] = id;
      await tx.insert(user).values({ id, ...u, emailVerified: true, companyId: c.id });
      await tx.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: 'credential', userId: id, password: hash });
    }
    // Distinct createdAt keeps the list in this order (now() is the same inside one transaction).
    const t0 = Date.now();
    const inst = await tx
      .insert(installer)
      .values(FIXTURE_INSTALLERS.map((i, n) => ({ ...i, companyId: c.id, createdAt: new Date(t0 + n), updatedAt: new Date(t0 + n) })))
      .returning();
    if (!opts.phase2Only) {
      const byName = Object.fromEntries(inst.map(i => [i.name, i.id])) as Record<'Driton' | 'Faton' | 'Besnik', string>;
      await loadPhase3(tx, { companyId: c.id, users, installers: byName, today: opts.today ?? todayIso() });
    }
  });
}
