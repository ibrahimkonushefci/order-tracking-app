import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { can } from '@/auth/permissions';
import { isProject, openingTotals, orderTotals } from '@/domain/balances';
import { cashWithInstallers, debts, moneyOverview } from '@/domain/debts';
import { Badge } from '@/components/cues';
import { Icon, type IconName } from '@/components/icons';
import { AgendaItem } from '@/components/agenda';
import { allJobs, jobsOnDay, pastUndone } from '@/domain/visits';
import { Page, PageHead } from '@/components/shell/shell';
import { PayPickTile, type PickRow } from '@/components/sheets/pay-pick';
import { addDays, fmtLong, hourInKosovo } from '@/lib/dates';
import { lateSpan } from '@/lib/fmt';
import { eur } from '@/lib/money';
import { pageBook, pageContext } from '@/server/context';

/** Sot: the "Borxhet" headline, "Kërkon vëmendje", today's visits and the quick actions. */
export default async function DashboardPage() {
  const { user, today } = await pageContext();
  const b = await pageBook();
  const t = await getTranslations('dashboard');
  const d = await getTranslations('debts');
  const tt = await getTranslations('time');
  const w = await getTranslations('words');
  const c = await getTranslations('cash');
  const hour = hourInKosovo();
  const hello = hour < 11 ? t('morning') : hour < 18 ? t('day') : t('evening');

  const rows = debts(b.orders, b.openings, today);
  const M = moneyOverview(rows, cashWithInstallers(b.orders, b.openings, b.installers, today));
  // The bar splits the debts only; it always adds up to M.total.
  const parts = (
    [
      ['overdue', d('overdue'), M.overdue],
      ['term', d('upcoming'), M.upcoming],
      ['unknown', d('unknownDue'), M.unknown],
    ] as const
  ).filter(x => x[2].sum > 0);

  // Visits from the last two weeks that nobody marked done (the debts list depends on it).
  const jobs = allJobs(b.orders);
  const past = pastUndone(jobs, today);
  const todays = jobsOnDay(jobs, today);
  const todaysDone = todays.filter(x => x.v.doneAt).length;
  const attention: [string, IconName, string, string, string][] = [];
  if (past.length) {
    const allYesterday = past.every(x => x.v.date === addDays(today, -1));
    attention.push([
      'info',
      'calendar',
      '/schedule',
      t(allYesterday ? 'pastYesterday' : 'pastDays', { n: past.length }),
      past.map(x => `${w(`visit.${x.v.type}`)} · ${x.o.client.name}`).join(', '),
    ]);
  }

  const remindable = rows.filter(r => r.rem.ok);
  if (remindable.length) attention.push(['success', 'message', '/debts', t('remindable', { n: remindable.length }), t('remindableSub')]);

  const pick: PickRow[] = [
    ...b.orders
      .filter(o => o.stage !== 'cancelled')
      .map(o => {
        const tot = orderTotals(o);
        return { kind: 'order' as const, id: o.id, name: o.client.name, meta: `${o.number} · ${isProject(o) ? t('project') : o.productType}`, owed: tot.owed, remaining: Math.max(0, tot.remaining) };
      }),
    ...b.openings.map(ob => {
      const tot = openingTotals(ob);
      return { kind: 'opening' as const, id: ob.id, name: ob.name, meta: t('opening'), owed: tot.owed, remaining: Math.max(0, tot.remaining) };
    }),
  ]
    .filter(r => r.remaining > 0)
    .sort((a, z) => z.owed - a.owed || z.remaining - a.remaining);

  return (
    <Page nav="dashboard">
      <PageHead title={`${hello}, ${user.firstName}`} sub={fmtLong(today)} />
      <div className="dashboard-grid">
        <div className="dashboard-primary">
          <Link className="hero" href="/debts">
            <span className="hero__top">
              <span>{t('hero')}</span>
              <Icon name="right" className="chev" />
            </span>
            <span className="hero__value">{eur(M.total)}</span>
            <span className="hero__sub">
              {!M.total
                ? d('empty')
                : M.overdue.count
                  ? t.rich('totalSub', { amount: eur(M.overdue.sum), n: M.overdue.count, late: c => <b className="hero__late-sum">{c}</b> })
                  : t('totalSubNone')}
            </span>
            {parts.length ? (
              <>
                <span className="stackbar" role="img" aria-label={parts.map(([, l, p]) => `${l} ${eur(p.sum)}`).join(', ')}>
                  {parts.map(([k, , p]) => (
                    <span key={k} className={`sb--${k}`} style={{ flex: (p.sum / M.total).toFixed(4) }} />
                  ))}
                </span>
                <span className="hero__parts">
                  {parts.map(([k, l, p]) => (
                    <span className="hero__part" key={k}>
                      <span className="hero__part-label">
                        <span className={`legend__dot sb--${k}`} />
                        {l}
                      </span>
                      <b className="num">{eur(p.sum)}</b>
                      <small>{t('clients', { n: p.count })}</small>
                    </span>
                  ))}
                </span>
              </>
            ) : null}
            {M.overdue.count ? (
              <span className="hero__list">
                <span className="hero__eyebrow">{t('topLate')}</span>
                {M.overdue.rows.slice(0, 3).map(r => (
                  <span className="hero__row" key={r.id}>
                    <span className="grow ellipsis">{r.name}</span>
                    <span className="hero__late">{lateSpan(r.late!, tt)}</span>
                    <span className="num">{eur(r.amount)}</span>
                  </span>
                ))}
              </span>
            ) : null}
          </Link>
        </div>
        <div className="dashboard-secondary">
          <div className="eyebrow">{t('quick')}</div>
          <div className="tiles">
            <Link className="tile" href="/orders/new">
              <span className="tile__icon tone--brand">
                <Icon name="plus" />
              </span>
              <span className="tile__label">
                {t('newOrder')}
                <small>{t('newOrderSub')}</small>
              </span>
            </Link>
            <PayPickTile rows={pick} installers={b.installers.map(i => ({ id: i.id, name: i.name }))} canDelete={can(user.role, 'delete')} today={today} label={t('payment')} sub={t('paymentSub')} />
            <Link className="tile" href="/debts/new">
              <span className="tile__icon tone--info">
                <Icon name="book" />
              </span>
              <span className="tile__label">
                {t('opening')}
                <small>{t('openingSub')}</small>
              </span>
            </Link>
          </div>
          <section className="card cash-card" aria-labelledby="cash-card-title">
            <div className="cash-card__head">
              <span className="list-row__icon tone--warning">
                <Icon name="cash" />
              </span>
              <span className="grow">
                <span className="small muted" id="cash-card-title">
                  {d('cashTitle')}
                </span>
                <b className="cash-card__value num">{eur(M.cash.sum)}</b>
                <span className="xs muted">{M.cash.sum ? t('cashHelp') : c('empty')}</span>
              </span>
              {M.cash.sum ? (
                <Link className="card__link" href="/cash">
                  {t('cashConfirm')} <Icon name="right" className="chev" />
                </Link>
              ) : null}
            </div>
            {M.cash.groups.length ? (
              <>
                <div className="cash-card__list">
                  {M.cash.groups.map(g => (
                    <Link className="cash-card__row" href="/cash" key={g.installerId}>
                      <span className="cash-card__name ellipsis">{g.name}</span>
                      <span className="progress">
                        <span className="progress__held" style={{ width: `${((g.sum / M.cash.sum) * 100).toFixed(2)}%` }} />
                      </span>
                      <Badge tone={g.items[0].days >= 7 ? 'danger' : 'warning'} icon="clock">
                        {g.items[0].days === 0 ? tt('agoToday') : tt('days', { n: g.items[0].days })}
                      </Badge>
                      <b className="num">{eur(g.sum)}</b>
                    </Link>
                  ))}
                </div>
                <div className="cash-card__foot">
                  <span>{t('outside')}</span>
                  <span>{t.rich('outsideSum', { debts: eur(M.total), cash: eur(M.cash.sum), sum: eur(M.outsideOffice), b: x => <b className="num">{x}</b> })}</span>
                </div>
              </>
            ) : null}
          </section>
          {attention.length ? (
            <section className="card attention-card">
              <div className="card__head">
                <h2 className="card__title">{t('attention')}</h2>
              </div>
              <div className="list">
                {attention.slice(0, 4).map(([tone, icon, href, title, sub]) => (
                  <Link className="list-row" href={href} key={title}>
                    <span className={`list-row__icon tone--${tone}`}>
                      <Icon name={icon} />
                    </span>
                    <span className="grow">
                      <b>{title}</b>
                      <br />
                      <span className="small muted clamp2">{sub}</span>
                    </span>
                    <Icon name="right" className="chev" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      <section className="card today-agenda">
        <div className="card__head">
          <h2 className="card__title">
            {t('today')}{' '}
            <span className="subtle small">
              · {todays.length}
              {todaysDone ? ` · ${t('todayDone', { n: todaysDone })}` : ''}
            </span>
          </h2>
          <Link className="card__link" href="/schedule">
            {t('toSchedule')} <Icon name="right" className="chev" />
          </Link>
        </div>
        {todays.length ? (
          <div className="agenda">
            {todays.map(({ o, v }) => (
              <AgendaItem key={v.id} o={o} v={v} today={today} installers={b.installers.map(i => ({ id: i.id, name: i.name }))} showInstaller />
            ))}
          </div>
        ) : (
          <div className="empty small">{t('noVisits')}</div>
        )}
      </section>
    </Page>
  );
}
