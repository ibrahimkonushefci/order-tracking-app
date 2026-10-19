import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/auth/session';
import { EmptyCard } from '@/components/empty';
import { Icon } from '@/components/icons';
import { Page, PageHead } from '@/components/shell/shell';

export default async function DebtsPage() {
  await requireUser();
  const t = await getTranslations('debts');
  const tp = await getTranslations('phase');
  return (
    <Page nav="debts">
      <PageHead
        title={t('title')}
        sub={t('sub')}
        right={
          <button className="btn btn--soft btn--sm" type="button" disabled title={tp('later3')}>
            <Icon name="plus" /> {t('opening')}
          </button>
        }
      />
      <EmptyCard title={t('empty')} note={tp('later3')} />
    </Page>
  );
}
