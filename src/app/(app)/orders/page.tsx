import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/auth/session';
import { EmptyCard } from '@/components/empty';
import { Icon } from '@/components/icons';
import { Page, PageHead } from '@/components/shell/shell';

export default async function OrdersPage() {
  await requireUser();
  const t = await getTranslations('orders');
  const tp = await getTranslations('phase');
  return (
    <Page nav="orders">
      <PageHead
        title={t('title')}
        sub={t('count', { count: 0 })}
        right={
          <button className="btn btn--primary btn--sm" type="button" disabled title={tp('later3')}>
            <Icon name="plus" /> {t('new')}
          </button>
        }
      />
      <div className="search">
        <Icon name="search" />
        <input className="input" type="search" placeholder={t('search')} aria-label={t('search')} disabled />
      </div>
      <EmptyCard icon="list" title={t('empty')} note={tp('later3')} />
    </Page>
  );
}
