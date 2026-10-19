import { getTranslations } from 'next-intl/server';
import { Page, PageHead } from '@/components/shell/shell';
import { pageContext } from '@/server/context';
import { OpeningForm } from './opening-form';

export default async function NewOpeningPage() {
  const { today } = await pageContext();
  const t = await getTranslations('openingForm');
  return (
    <Page nav="debts">
      <PageHead back="/debts" backLabel={t('back')} title={t('title')} sub={t('sub')} />
      <OpeningForm today={today} />
    </Page>
  );
}
