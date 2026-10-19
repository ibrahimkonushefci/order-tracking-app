import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/auth/session';
import { EmptyCard } from '@/components/empty';
import { Page, PageHead } from '@/components/shell/shell';

const TABS = ['today', 'tomorrow', 'week', 'installers'] as const;

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireUser();
  const t = await getTranslations('schedule');
  const tp = await getTranslations('phase');
  const { tab: raw } = await searchParams;
  const tab = TABS.includes(raw as (typeof TABS)[number]) ? (raw as (typeof TABS)[number]) : 'today';
  return (
    <Page nav="schedule">
      <PageHead title={t('title')} sub={t('sub')} />
      <nav className="seg" aria-label={t('title')}>
        {TABS.map(k => (
          <Link key={k} href={k === 'today' ? '/schedule' : `/schedule?tab=${k}`} aria-current={tab === k ? 'page' : undefined}>
            {t(k)}
          </Link>
        ))}
      </nav>
      <EmptyCard title={t('empty')} note={tp('later4')} />
    </Page>
  );
}
