import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { installerJobText } from '@/domain/messages';
import { collectsCash, dative, toCollect } from '@/domain/visits';
import { Compose } from '@/components/compose';
import { Page, PageHead } from '@/components/shell/shell';
import { listInstallers } from '@/db/queries';
import { fmtDay } from '@/lib/fmt';
import { eur } from '@/lib/money';
import { loadOrder } from '@/services/book';
import { pageContext } from '@/server/context';

/** "Dërgo te montuesi": one visit, the installer preselected (choosing another also assigns the visit). */
export default async function SendVisitPage({ params, searchParams }: { params: Promise<{ orderId: string; visitId: string }>; searchParams: Promise<{ i?: string }> }) {
  const { orderId, visitId } = await params;
  const { i } = await searchParams;
  const { db, companyId, today } = await pageContext();
  const o = await loadOrder(db, companyId, orderId);
  const v = o?.visits.find(x => x.id === visitId);
  if (!o || !v) notFound();
  const t = await getTranslations('compose');
  const w = await getTranslations('words');
  const tt = await getTranslations('time');
  const installers = (await listInstallers(companyId)).filter(x => x.active || x.id === v.installerId);
  const inst = installers.find(x => x.id === i) ?? installers.find(x => x.id === v.installerId) ?? installers[0];
  if (!inst) notFound();
  const amount = collectsCash(v) && !v.doneAt ? toCollect(o) : 0;
  const assign = inst.id !== v.installerId;
  return (
    <Page nav="schedule">
      <PageHead back={`/orders/${o.id}`} backLabel={t('back')} title={t('titleTo', { name: dative(inst.name) })} sub={`${w(`visit.${v.type}`)} · ${fmtDay(v.date, today, tt)} · ${o.client.name}`} />
      <Compose
        key={inst.id}
        to={{ name: inst.name, phone: inst.phone, channel: inst.channel }}
        text={installerJobText(o, v, true)}
        textNoCollect={amount > 0 ? installerJobText(o, v, false) : undefined}
        collectLabel={t('collect', { amount: eur(amount) })}
        log={{ kind: 'installer', installerId: inst.id, visitIds: [v.id], mode: 'visit', assign, back: `/orders/${o.id}` }}
      >
        <div className="field">
          <span className="label">{t('pick')}</span>
          <div className="chips">
            {installers.map(x => (
              <Link key={x.id} className={`chip${x.id === inst.id ? ' is-on' : ''}`} href={`/send/visit/${o.id}/${v.id}?i=${x.id}`} aria-current={x.id === inst.id ? 'true' : undefined} replace>
                <span>{x.name}</span>
              </Link>
            ))}
          </div>
          {assign ? <div className="help">{t('assign', { name: dative(inst.name) })}</div> : null}
        </div>
      </Compose>
    </Page>
  );
}
