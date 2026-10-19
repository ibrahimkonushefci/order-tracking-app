import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cashWithInstallers } from '@/domain/debts';
import { Badge } from '@/components/cues';
import { Icon } from '@/components/icons';
import { Page, PageHead } from '@/components/shell/shell';
import { ConfirmAllButton, ConfirmCashButton } from '@/components/sheets/confirm-cash';
import { fmtDay } from '@/lib/fmt';
import { eur } from '@/lib/money';
import { pageBook, pageContext } from '@/server/context';

/** Para te montuesit, pa dorëzuar: the customer has paid; Konfirmo only means the cash reached the office. */
export default async function CashPage() {
  const { today } = await pageContext();
  const b = await pageBook();
  const t = await getTranslations('cash');
  const tt = await getTranslations('time');
  const groups = cashWithInstallers(b.orders, b.openings, b.installers, today);
  return (
    <Page nav="cash">
      <PageHead title={t('title')} sub={t('sub')} />
      <p className="group-help">{t('help')}</p>
      {groups.map(g => (
        <section className="card" key={g.installerId}>
          <div className="card__head">
            <h2 className="card__title">{g.name}</h2>
            <b className="num">{eur(g.sum)}</b>
          </div>
          <div className="card__body">
            {g.items.map(it => (
              <div className="pay" key={it.payment.id}>
                <div className="pay__top">
                  <div className="grow">
                    <Link href={it.kind === 'order' ? `/orders/${it.recordId}` : `/debts/${it.recordId}`} style={{ color: 'inherit' }}>
                      <b>{it.name}</b>
                    </Link>
                    <div className="small muted">
                      {it.number ?? t('opening')} · {t('took', { day: fmtDay(it.payment.date, today, tt).toLowerCase() })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="pay__amount">{eur(it.payment.amount)}</div>
                    <Badge tone={it.days >= 7 ? 'danger' : 'warning'} icon="clock">
                      {it.days === 0 ? tt('agoToday') : tt('days', { n: it.days })}
                    </Badge>
                  </div>
                </div>
                <ConfirmCashButton
                  paymentId={it.payment.id}
                  installer={g.name}
                  amount={it.payment.amount}
                  date={it.payment.date}
                  who={it.name}
                  variant={g.items.length === 1 ? 'small' : 'only'}
                />
              </div>
            ))}
            {g.items.length > 1 ? <ConfirmAllButton installerId={g.installerId} installer={g.name} sum={g.sum} count={g.items.length} /> : null}
          </div>
        </section>
      ))}
      {!groups.length ? (
        <div className="card">
          <div className="empty">
            <Icon name="check" />
            <b>{t('empty')}</b>
          </div>
        </div>
      ) : null}
    </Page>
  );
}
