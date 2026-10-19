/**
 * One agenda row (Sot, Orari): time badge, the vertical rail, the client with the visit type,
 * place, installer, "Mblidh €X" and "dërguar"; "U krye" for visits that should have happened.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { collectsCash, toCollect } from '@/domain/visits';
import { eur } from '@/lib/money';
import type { FullOrder } from '@/services/book';
import { visitOrderView, visitView } from '@/server/views';
import type { InstallerOpt } from './forms';
import { Icon } from './icons';
import { VisitDoneButton } from './sheets/visit';

export async function AgendaItem({
  o,
  v,
  today,
  installers,
  showInstaller,
  doneBtn,
  timeText,
}: {
  o: FullOrder;
  v: FullOrder['visits'][number];
  today: string;
  installers: InstallerOpt[];
  showInstaller?: boolean;
  doneBtn?: boolean;
  timeText?: string;
}) {
  const t = await getTranslations('agenda');
  const w = await getTranslations('words');
  const coll = collectsCash(v) && !v.doneAt ? toCollect(o) : 0;
  const time = timeText ?? (!v.time ? '—' : v.time === 'morning' ? w('time.morning') : v.time === 'afternoon' ? w('time.afternoon') : v.time);
  const inst = v.installerId ? (installers.find(i => i.id === v.installerId)?.name ?? '—') : w('noInstaller');
  return (
    <div className={`agenda__item vt--${v.type}${v.doneAt ? ' agenda__item--done' : ''}`}>
      <span className="agenda__time">{time}</span>
      <span className="agenda__rail">
        <span className="agenda__dot" />
      </span>
      <span className="agenda__card">
        <Link className="agenda__body" href={`/orders/${o.id}`}>
          <span className="agenda__name">{o.client.name}</span>
          <span className="agenda__meta">
            <span className="type-tag">{w(`visit.${v.type}`)}</span>
            <span className="pill">
              <Icon name="map" />
              {o.city}
            </span>
            {showInstaller ? <span>{inst}</span> : null}
            {coll > 0 ? <span className="pill pill--money">{t('collect', { amount: eur(coll) })}</span> : null}
            {v.lastSentAt && !v.doneAt ? (
              <span className="pill pill--ok">
                <Icon name="check" /> {t('sent')}
              </span>
            ) : null}
          </span>
        </Link>
        {v.doneAt ? (
          <span className="badge badge--success">
            <Icon name="check" />
            <span className="ellipsis">{t('done')}</span>
          </span>
        ) : doneBtn && v.date <= today ? (
          <VisitDoneButton o={visitOrderView(o)} visit={visitView(v)} installers={installers} className="btn btn--soft btn--sm">
            {t('markDone')}
          </VisitDoneButton>
        ) : null}
      </span>
    </div>
  );
}
