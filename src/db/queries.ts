import 'server-only';
import { asc, desc, eq } from 'drizzle-orm';
import { getDb } from './client';
import { company, installer, user } from './schema';

export async function getCompany(companyId: string | null) {
  const db = await getDb();
  const rows = companyId
    ? await db.select().from(company).where(eq(company.id, companyId)).limit(1)
    : await db.select().from(company).limit(1);
  return rows[0] ?? null;
}

export async function listUsers(companyId: string) {
  const db = await getDb();
  return db
    .select({ id: user.id, firstName: user.firstName, name: user.name, role: user.role, email: user.email })
    .from(user)
    .where(eq(user.companyId, companyId))
    .orderBy(desc(user.role), asc(user.firstName)); // Pronari first
}

export async function listInstallers(companyId: string) {
  const db = await getDb();
  return db
    .select()
    .from(installer)
    .where(eq(installer.companyId, companyId))
    .orderBy(asc(installer.createdAt), asc(installer.name));
}
