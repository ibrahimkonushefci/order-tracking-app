'use server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ForbiddenError, type Action } from '@/auth/permissions';
import { requirePermission } from '@/auth/session';
import { getDb } from '@/db/client';
import { company, history } from '@/db/schema';

const wordSchema = z.enum(['Avans', 'Kapar']);

/** These are plain form actions: a role that may not use them (the UI hides them) gets nothing, not an error page. */
async function allowed(action: Action) {
  try {
    return await requirePermission(action);
  } catch (e) {
    if (e instanceof ForbiddenError) return null;
    throw e;
  }
}

/** "Fjala për paradhënien": a company/brand setting, so Pronari only. */
export async function setDepositWord(form: FormData) {
  const u = await allowed('settings');
  if (!u) return;
  const word = wordSchema.parse(form.get('word'));
  if (!u.companyId) throw new Error('no company');
  const db = await getDb();
  await db.transaction(async tx => {
    const [c] = await tx.select().from(company).where(eq(company.id, u.companyId!)).limit(1);
    if (!c || c.depositWord === word) return;
    await tx.update(company).set({ depositWord: word }).where(eq(company.id, c.id));
    await tx.insert(history).values({
      companyId: c.id,
      recordType: 'settings',
      userId: u.id,
      text: `Fjala për paradhënien: ${c.depositWord} → ${word}`,
      field: 'depositWord',
      oldValue: c.depositWord,
      newValue: word,
    });
  });
  revalidatePath('/settings');
}

