import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cashWithInstallers, debts, groupDebts, moneyOverview, sumOf, type DebtRow as Row } from '@/domain/debts';
import { DebtRow } from '@/components/debt-row';
import { Icon } from '@/components/icons';
import { Page, PageHead } from '@/components/shell/shell';
import { eur } from '@/lib/money';
import { pageBook, pageContext } from '@/server/context';

/** Borxhet ("Kush më ka borxh?"): three groups, sorted by amount or by days late. */
export default async function DebtsPage({ searchParams }: { searchParams: Promise<{ sort?: string; flash?: string }> }) {
  const { today } = await pageContext();
  const b = await pageBook();
  const t = await getTranslations('debts');
  const q = await searchParams;
  const sort = q.sort === 'late' ? 'late' : 'amount';
  const all = debts(b.orders, b.openings, today);
  const g = groupDebts(all, sort);
  // The same figures as Sot.
  const M = moneyOverview(all, cashWithInstallers(b.orders, b.openings, b.installers, today));
  const flashUpcoming = !!q.flash && g.upcoming.some(d => d.id === q.flash);
  const rows = (list: Row[]) => (
    <div className="card list">
      {list.map(d => (
        <DebtRow key={d.id} d={d} today={today} installers={b.installers} flash={q.flash === d.id} />
      ))}
    </div>
  );
  const title = (label: string, list: Row[]) => (
    <>
      {label}{' '}
      <span className="count">
        {list.length} · {eur(sumOf(list))}
      </span>
    </>
  );
  return (
    <Page nav="debts">
      <PageHead
        title={t('title')}
        sub={t('sub')}
        right={
          <Link className="btn btn--soft btn--sm" href="/debts/new">
            <Icon name="plus" /> {t('opening')}
          </Link>
        }
      />
      <div className="debt-overview">
        <div className="summary card">
          <div className="summary__row">
            <span>{t('overdue')}</span>
            <b className={`num${M.overdue.count ? ' danger' : ''}`}>{eur(M.overdue.sum)}</b>
          </div>
          <div className="summary__row">
            <span>{t('total')}</span>
            <b className="num">{eur(M.total)}</b>
          </div>
        </div>
        <Link className="cash-summary card" href="/cash">
          <span className="list-row__icon tone--warning">
            <Icon name="cash" />
          </span>
          <span className="grow">
            <span className="small muted">{t('cashTitle')}</span>
            <b className="num">{eur(M.cash.sum)}</b>
            <span className="xs muted">{t('cashSub')}</span>
          </span>
          <Icon name="right" className="chev" />
        </Link>
      </div>
      <div className="debt-toolbar">
        <span className="small muted">{t('sortLabel')}</span>
        <div className="seg seg--inline" role="group" aria-label={t('sortLabel')}>
          <Link href="/debts?sort=amount" aria-current={sort === 'amount' ? 'page' : undefined}>
            {t('byAmount')}
          </Link>
          <Link href="/debts?sort=late" aria-current={sort === 'late' ? 'page' : undefined}>
            {t('byLate')}
          </Link>
        </div>
      </div>
      {g.overdue.length ? (
        <>
          <h2 className="section-title">{title(t('overdue'), g.overdue)}</h2>
          {rows(g.overdue)}
        </>
      ) : null}
      {g.unknown.length ? (
        <>
          <h2 className="section-title">{title(t('unknownDue'), g.unknown)}</h2>
          <p className="group-help">{t('unknownHelp')}</p>
          {rows(g.unknown)}
        </>
      ) : null}
      {g.upcoming.length ? (
        <details className="group" open={flashUpcoming || undefined}>
          <summary className="section-title">
            <Icon name="right" className="chev" />
            {title(t('upcoming'), g.upcoming)}
          </summary>
          {rows(g.upcoming)}
        </details>
      ) : null}
      {!all.length ? (
        <div className="card">
          <div className="empty">
            <Icon name="check" />
            <b>{t('empty')}</b>
          </div>
        </div>
      ) : null}
      <p className="xs subtle">{t('projectNote')}</p>
    </Page>
  );
}
