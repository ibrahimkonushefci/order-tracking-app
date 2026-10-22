/**
 * pnpm account <target> <email> [--password] [--email new@x.test] [--name "Emri Mbiemri"] [--off | --on]
 * Changes one existing login without touching its records: the user row (and so every history
 * line, order and payment it made) stays. A new password or --off also signs it out everywhere.
 * Passwords are typed here, hidden. Without options it only shows the account.
 */
import { and, eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { createDb } from '../src/db/connect';
import { account, company, session, user } from '../src/db/schema';
import { arg, askNewPassword, fail, readTarget } from './lib/target';

const [target, email] = process.argv.slice(2);
if (!target || !email || email.startsWith('-')) fail('Përdorimi: pnpm account <target> <email> [--password] [--email i-ri] [--name "Emri"] [--off|--on]');
const env = readTarget(target);
const db = await createDb(env.DATABASE_URL);
const [u] = await db
  .select({ id: user.id, email: user.email, name: user.name, role: user.role, active: user.active, brand: company.brandSlug })
  .from(user)
  .leftJoin(company, eq(company.id, user.companyId))
  .where(eq(user.email, email.toLowerCase()));
if (!u) fail(`Nuk ka llogari ${email} në ${target}.`);
console.log(`${u.email} · ${u.name} · ${u.role} · ${u.brand ?? 'pa kompani'} · ${u.active ? 'aktive' : 'jo aktive'}`);

const newEmail = arg('--email')?.trim().toLowerCase();
const newName = arg('--name')?.trim();
const active = process.argv.includes('--off') ? false : process.argv.includes('--on') ? true : undefined;
const password = process.argv.includes('--password') ? await askNewPassword() : undefined;
if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) fail('Email-i i ri nuk është i vlefshëm.');
if (newName !== undefined && newName.length < 2) fail('Emri duhet të ketë të paktën 2 shkronja.');
if (!newEmail && !newName && active === undefined && !password) process.exit(0);

await db.transaction(async tx => {
  const set: Partial<typeof user.$inferInsert> = {};
  if (newEmail) set.email = newEmail;
  if (newName) Object.assign(set, { name: newName, firstName: newName.split(/\s+/)[0] });
  if (active !== undefined) set.active = active;
  if (Object.keys(set).length) await tx.update(user).set(set).where(eq(user.id, u.id));
  if (password) {
    const done = await tx
      .update(account)
      .set({ password: await hashPassword(password) })
      .where(and(eq(account.userId, u.id), eq(account.providerId, 'credential')))
      .returning({ id: account.id });
    if (!done.length) throw new Error('Kjo llogari nuk ka fjalëkalim.');
  }
  if (password || active === false) await tx.delete(session).where(eq(session.userId, u.id));
});
console.log(
  [newEmail && `email → ${newEmail}`, newName && `emri → ${newName}`, active !== undefined && (active ? 'aktive' : 'jo aktive'), password && 'fjalëkalim i ri, u çkyç kudo']
    .filter(Boolean)
    .join(' · '),
);
process.exit(0);
