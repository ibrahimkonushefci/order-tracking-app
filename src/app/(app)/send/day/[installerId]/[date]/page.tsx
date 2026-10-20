import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { isDemoMode } from '@/brand/active';
import { demoPhone } from '@/server/demo';
import { installerDayText } from '@/domain/messages';
import { allJobs, collectsCash, dative, toCollect } from '@/domain/visits';
import { Compose } from '@/components/compose';
import { EmptyCard } from '@/components/empty';
import { Page, PageHead } from '@/components/shell/shell';
import { addDays, fmtLong } from '@/lib/dates';
import { pageBook, pageContext } from '@/server/context';

/** "Dërgo Dritonit punët e nesërme": one installer's open visits of one day, numbered, in time order. */
export default async function SendDayPage({ params }: { params: Promise<{ installerId: string; date: string }> }) {
  const { installerId, date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const { today, user } = await pageContext();
  const b = await pageBook();
  const t = await getTranslations('compose');
  const inst = b.installers.find(i => i.id === installerId);
  if (!inst) notFound();
  const items = allJobs(b.orders).filter(x => x.v.installerId === inst.id && x.v.date === date && !x.v.doneAt);
  const can = items.some(x => collectsCash(x.v) && toCollect(x.o) > 0);
  return (
    <Page nav="schedule">
      <PageHead back="/schedule" backLabel={t('back')} title={t('titleTo', { name: dative(inst.name) })} sub={`${items.length} punë · ${fmtLong(date)}`} />
      {items.length ? (
        <Compose
          to={{ name: inst.name, phone: inst.phone, channel: inst.channel }}
          text={installerDayText(items, date, today, true)}
          textNoCollect={can ? installerDayText(items, date, today, false) : undefined}
          collectLabel={t('collectDay')}
          log={{ kind: 'installer', installerId: inst.id, visitIds: items.map(x => x.v.id), mode: 'day', assign: false, back: date === today ? '/schedule' : `/schedule?d=${date === addDays(today, 1) ? 'tomorrow' : 'week'}` }}
          demo={isDemoMode()}
          demoPhone={await demoPhone()}
          sender={user.firstName}
        />
      ) : (
        <EmptyCard title={t('nothingToSend')} />
      )}
    </Page>
  );
}
