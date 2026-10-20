import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { requireUser } from '@/auth/session';
import { getDb } from '@/db/client';
import { appToday, demoOffset } from './today';
import { ensureFreshDemo } from './demo';
import { loadBook } from '@/services/book';
import { stageLabels } from '@/services/orders';

/** What every Phase 3 screen needs: the user, the database, today in Kosovo. */
export const pageContext = cache(async () => {
  await ensureFreshDemo();
  const user = await requireUser();
  if (!user.companyId) notFound();
  const db = await getDb();
  const [today, offset] = await Promise.all([appToday(), demoOffset()]);
  const label = await stageLabels(db, user.companyId);
  return { user, companyId: user.companyId, db, today, offset, label };
});

/** The whole book of the company, once per request. */
export const pageBook = cache(async () => {
  const { db, companyId } = await pageContext();
  return loadBook(db, companyId);
});
