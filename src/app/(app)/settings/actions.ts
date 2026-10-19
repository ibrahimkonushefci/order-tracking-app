'use server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/auth/session';
import { getDb } from '@/db/client';
import { company, history } from '@/db/schema';

const wordSchema = z.enum(['Avans', 'Kapar']);

/** "Fjala për paradhënien": a company/brand setting, so Pronari only. */
export async function setDepositWord(form: FormData) {
  const u = await requirePermission('settings');
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
