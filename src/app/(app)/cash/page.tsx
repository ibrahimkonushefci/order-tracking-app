import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/auth/session';
import { EmptyCard } from '@/components/empty';
import { Page, PageHead } from '@/components/shell/shell';

export default async function CashPage() {
  await requireUser();
  const t = await getTranslations('cash');
  const tp = await getTranslations('phase');
  return (
    <Page nav="cash">
      <PageHead title={t('title')} sub={t('sub')} />
      <EmptyCard title={t('empty')} note={tp('later3')} />
    </Page>
  );
}
