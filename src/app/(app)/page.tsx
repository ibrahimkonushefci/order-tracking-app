import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { can } from '@/auth/permissions';
import { isProject, openingTotals, orderTotals } from '@/domain/balances';
import { cashWithInstallers, debts, headline } from '@/domain/debts';
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
  const { user, today, offset } = await pageContext();
  const b = await pageBook();
  const t = await getTranslations('dashboard');
  const tt = await getTranslations('time');
  const w = await getTranslations('words');
  const hour = hourInKosovo();
  const hello = hour < 11 ? t('morning') : hour < 18 ? t('day') : t('evening');

  const rows = debts(b.orders, b.openings, today);
  const cash = cashWithInstallers(b.orders, b.openings, b.installers, today);
  const D = headline(
    rows,
    cash.reduce((s, g) => s + g.sum, 0),
  );
  const parts = (
    [
      ['overdue', t('barOverdue'), D.overdueSum],
      ['term', t('barTerm'), D.upcomingSum],
      ['unknown', t('barUnknown'), D.unknownSum],
      ['held', t('barHeld'), D.cashSum],
    ] as const
  ).filter(x => x[2] > 0);
  const whole = parts.reduce((s, x) => s + x[2], 0) || 1;

  // Visits from the last two weeks that nobody marked done (the debts list depends on it).
  const jobs = allJobs(b.orders);
  const past = pastUndone(jobs, today);
  const todays = jobsOnDay(jobs, today);
  const attention: [string, IconName, string, string, string][] = [];
  for (const g of cash) attention.push(['warning', 'cash', '/cash', t('cashRow', { name: g.name, amount: eur(g.sum) }), t('cashRowSub')]);
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
      <PageHead title={`${hello}, ${user.firstName}`} sub={offset ? t('demoSub', { date: fmtLong(today), n: offset }) : fmtLong(today)} />
      <div className="dashboard-grid">
        <div className="dashboard-primary">
          <Link className="hero" href="/debts">
            <span className="hero__top">
              <span>{t('hero')}</span>
              <Icon name="right" className="chev" />
            </span>
            {D.overdue.length ? (
              <>
                <span className="hero__value">{eur(D.overdueSum)}</span>
                <span className="hero__sub">{t('overdueSub', { n: D.overdue.length, total: eur(D.total) })}</span>
              </>
            ) : (
              <>
                <span className="hero__value">{eur(D.total)}</span>
                <span className="hero__sub">{t('nothingDue')}</span>
              </>
            )}
            {parts.length ? (
              <>
                <span className="stackbar" role="img" aria-label={parts.map(([, l, v]) => `${l} ${eur(v)}`).join(', ')}>
                  {parts.map(([k, , v]) => (
                    <span key={k} className={`sb--${k}`} style={{ flex: (v / whole).toFixed(4) }} />
                  ))}
                </span>
                <span className="legend">
                  {parts.map(([k, l, v]) => (
                    <span className="legend__item" key={k}>
                      <span className={`legend__dot sb--${k}`} />
                      {l} <b>{eur(v)}</b>
                    </span>
                  ))}
                </span>
              </>
            ) : null}
            {D.overdue.length ? (
              <span className="hero__list">
                {D.overdue.slice(0, 3).map(d => (
                  <span className="hero__row" key={d.id}>
                    <span className="grow ellipsis">{d.name}</span>
                    <span className="num">{eur(d.amount)}</span>
                    <span className="hero__late">{lateSpan(d.late!, tt)}</span>
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
            {t('today')} <span className="subtle small">· {todays.length}</span>
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
