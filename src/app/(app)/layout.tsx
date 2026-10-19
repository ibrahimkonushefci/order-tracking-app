import type { ReactNode } from 'react';
import { requireUser } from '@/auth/session';
import { getActiveBrand } from '@/brand/active';
import { Shell } from '@/components/shell/shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const { brand, logoUrl } = await getActiveBrand();
  // Cash with installers arrives in Phase 3; until then nothing is waiting.
  return (
    <Shell user={user} brand={brand} logoUrl={logoUrl} cashDot={false}>
      {children}
    </Shell>
  );
}
