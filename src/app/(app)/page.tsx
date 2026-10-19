import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/auth/session';
import { Icon } from '@/components/icons';
import { Page, PageHead } from '@/components/shell/shell';
import { fmtLong, hourInKosovo, todayIso } from '@/lib/dates';
import { eur } from '@/lib/money';

/** Sot: the v10 layout. Money, attention items and the agenda fill in from Phase 3/4. */
export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations('dashboard');
  const tp = await getTranslations('phase');
  const hour = hourInKosovo();
  const hello = hour < 11 ? t('morning') : hour < 18 ? t('day') : t('evening');
  const total = 0;
  return (
    <Page nav="dashboard">
      <PageHead title={`${hello}, ${user.firstName}`} sub={fmtLong(todayIso())} />
      <div className="dashboard-grid">
        <div className="dashboard-primary">
          <Link className="hero" href="/debts">
            <span className="hero__top">
              <span>{t('hero')}</span>
              <Icon name="right" className="chev" />
            </span>
            <span className="hero__value">{eur(total)}</span>
            <span className="hero__sub">{t('nothingDue')}</span>
          </Link>
        </div>
        <div className="dashboard-secondary">
          <div className="eyebrow">{t('quick')}</div>
          <div className="tiles">
            <Link className="tile" href="/orders">
              <span className="tile__icon tone--brand">
                <Icon name="plus" />
              </span>
              <span className="tile__label">
                {t('newOrder')}
                <small>{t('newOrderSub')}</small>
              </span>
            </Link>
            <Link className="tile" href="/debts">
              <span className="tile__icon tone--success">
                <Icon name="cash" />
              </span>
              <span className="tile__label">
                {t('payment')}
                <small>{t('paymentSub')}</small>
              </span>
            </Link>
            <Link className="tile" href="/debts">
              <span className="tile__icon tone--info">
                <Icon name="book" />
              </span>
              <span className="tile__label">
                {t('opening')}
                <small>{t('openingSub')}</small>
              </span>
            </Link>
          </div>
        </div>
      </div>
      <section className="card today-agenda">
        <div className="card__head">
          <h2 className="card__title">
            {t('today')} <span className="subtle small">· 0</span>
          </h2>
          <Link className="card__link" href="/schedule">
            {t('toSchedule')} <Icon name="right" className="chev" />
          </Link>
        </div>
        <div className="empty small">
          {t('noVisits')}
          <span className="phase-note">{tp('later4')}</span>
        </div>
      </section>
    </Page>
  );
}
