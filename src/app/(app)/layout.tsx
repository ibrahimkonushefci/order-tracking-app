import type { ReactNode } from 'react';
import { getActiveBrand } from '@/brand/active';
import { cashWithInstallers } from '@/domain/debts';
import { Shell } from '@/components/shell/shell';
import { pageBook, pageContext } from '@/server/context';
import { demoInfo } from '@/server/demo-info';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, today, offset } = await pageContext();
  const [{ brand, logoUrl }, b] = await Promise.all([getActiveBrand(), pageBook()]);
  const demo = await demoInfo(user, brand, today, offset, b);
  // "Para te montuesit" carries a dot while cash is waiting to be handed over.
  const cashDot = cashWithInstallers(b.orders, b.openings, b.installers, today).length > 0;
  return (
    <Shell user={user} brand={brand} logoUrl={logoUrl} cashDot={cashDot} demo={demo}>
      {children}
    </Shell>
  );
}
