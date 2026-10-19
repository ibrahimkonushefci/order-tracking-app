import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { diffDays, fmtDate } from '@/lib/dates';
import { fmtDay } from '@/lib/fmt';
import { eur } from '@/lib/money';
import { installedQty, isProject, orderTotals, payStatus, type Totals } from '@/domain/balances';
import { Badge, MiniBar, PAY_TONE, ProdAnchor, ProjBar, STAGE_TONE } from '@/components/cues';
import { Icon } from '@/components/icons';
import { OrderSearch } from '@/components/order-search';
import { Page, PageHead } from '@/components/shell/shell';
import { BoardNext, FilterChip } from '@/components/board-next';
import { getCompany } from '@/db/queries';
import type { FullOrder } from '@/services/book';
import { pageBook, pageContext } from '@/server/context';

type Filter = '' | 'new' | 'active' | 'done' | 'project' | 'cancelled';

/** Porositë: a list with search and stage chips (incl. "Projekte"), and a three-column board. */
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string; view?: string }> }) {
  const { today, label, companyId } = await pageContext();
  const b = await pageBook();
  const company = await getCompany(companyId);
  const t = await getTranslations('orders');
  const tt = await getTranslations('time');
  const w = await getTranslations('words');
  const tm = await getTranslations('money');
  const p = await searchParams;
  const view = p.view === 'kanban' ? 'kanban' : 'list';
  const stage = (['new', 'active', 'done', 'project', 'cancelled'].includes(p.stage ?? '') ? p.stage : '') as Filter;
  const q = (p.q ?? '').trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const depositWord = company?.depositWord ?? 'Avans';

  const counts: Record<Filter, number> = { '': b.orders.length, new: 0, active: 0, done: 0, project: 0, cancelled: 0 };
  for (const o of b.orders) {
    counts[o.stage]++;
    if (isProject(o)) counts.project++;
  }
  // "avans"/"kapar" finds orders with only a deposit, whatever word the company uses.
  const depositQuery = /^(avans|kapar)/.test(q);
  const list = b.orders
    .map(o => ({ o, tot: orderTotals(o) }))
    .filter(({ o, tot }) => {
      if (depositQuery) {
        if (payStatus(o, tot) !== 'deposit') return false;
      } else if (q && !(o.client.name.toLowerCase().includes(q) || o.number.includes(q) || (digits.length >= 3 && o.client.phone.replace(/\D/g, '').includes(digits)))) return false;
      if (stage === 'project') return isProject(o);
      if (stage) return o.stage === stage;
      return true;
    });

  const href = (next: Partial<{ stage: string; view: string }>) => {
    const s = new URLSearchParams();
    if (p.q) s.set('q', p.q);
    const st = next.stage ?? stage;
    const vw = next.view ?? view;
    if (st) s.set('stage', st);
    if (vw !== 'list') s.set('view', vw);
    const str = s.toString();
    return `/orders${str ? `?${str}` : ''}`;
  };
  const chips: [Filter, string][] = [
    ['', t('all')],
    ['new', label('new')],
    ['active', label('active')],
    ['done', label('done')],
    ['project', t('projects')],
    ...(counts.cancelled ? ([['cancelled', w('stage.cancelled')]] as [Filter, string][]) : []),
  ];
  const nextVisit = (o: FullOrder) => o.visits.filter(v => !v.doneAt && v.date >= today).sort((a, z) => a.date.localeCompare(z.date))[0];
  const note = (o: FullOrder) => {
    if (isProject(o)) return `${installedQty(o)} / ${o.quantity} ${o.unit}`;
    const nv = nextVisit(o);
    if (nv) return `${w(`visit.${nv.type}`)} ${fmtDay(nv.date, today, tt).toLowerCase()}`;
    if (o.stage === 'done') return `${label('done')} ${fmtDate(o.doneAt)}`;
    return '';
  };
  const owedCell = (o: FullOrder, tot: Totals) =>
    tot.owed > 0 ? eur(tot.owed) : o.stage !== 'done' && o.stage !== 'cancelled' && tot.remaining > 0 ? <span className="subtle">{eur(tot.remaining)}</span> : '—';
  const bar = (o: FullOrder, tot: Totals) => (isProject(o) ? <ProjBar installed={installedQty(o)} quantity={o.quantity!} /> : <MiniBar t={tot} />);
  const payBadge = (o: FullOrder, tot: Totals) => {
    const st = payStatus(o, tot);
    return <Badge tone={PAY_TONE[st]}>{st === 'deposit' ? depositWord : tm(`status.${st}`)}</Badge>;
  };

  let results;
  if (!list.length)
    results = (
      <div className="card">
        <div className="empty">
          <Icon name="search" />
          <b>{b.orders.length ? t('noMatch') : t('empty')}</b>
        </div>
      </div>
    );
  else if (view === 'kanban')
    results = (
      <div className="kanban">
        {(['new', 'active', 'done'] as const).map(k => {
          const items = list.filter(x => x.o.stage === k);
          const shown = k === 'done' ? items.filter(x => diffDays(today, x.o.doneAt ?? today) <= 45) : items;
          return (
            <section className="kcol" key={k}>
              <div className="kcol__head">
                <span className="kcol__dot" style={{ background: `var(--stage-${k})` }} />
                {label(k)}
                <span className="count">{items.length}</span>
              </div>
              {shown.map(({ o, tot }) => {
                const nv = nextVisit(o);
                const next = k === 'new' ? 'active' : null;
                return (
                  <article className="kcard" key={o.id}>
                    <Link href={`/orders/${o.id}`}>
                      <div className="row">
                        <span className="kcard__num">{o.number}</span>
                        <span className="grow" />
                        {tot.owed > 0 ? <b className="num small">{eur(tot.owed)}</b> : payBadge(o, tot)}
                      </div>
                      <div className="kcard__name">{o.client.name}</div>
                      <div className="xs muted">
                        {o.productType} · {o.city}
                      </div>
                    </Link>
                    {isProject(o) ? (
                      <div className="badges">
                        <Badge tone="brand" icon="building">{`${installedQty(o)} / ${o.quantity} ${o.unit}`}</Badge>
                      </div>
                    ) : o.remainingWork ? (
                      <div className="badges">
                        <Badge tone="neutral" icon="tool">
                          {t('remaining')}
                        </Badge>
                      </div>
                    ) : nv ? (
                      <div className="badges">
                        <Badge tone="brand" icon="calendar">{`${w(`visit.${nv.type}`)} ${fmtDay(nv.date, today, tt).toLowerCase()}`}</Badge>
                      </div>
                    ) : null}
                    {next ? <BoardNext id={o.id} label={label(next)} /> : null}
                  </article>
                );
              })}
              {items.length > shown.length ? (
                <div className="xs subtle" style={{ padding: '4px 8px' }}>
                  {t('older', { n: items.length - shown.length })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    );
  else
    results = (
      <>
        <div className="card only-wide table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('colNumber')}</th>
                <th>{t('colClient')}</th>
                <th>{t('colStage')}</th>
                <th>{t('colPayment')}</th>
                <th>{t('colNext')}</th>
                <th className="right">{t('colLeft')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map(({ o, tot }) => (
                <tr key={o.id}>
                  <td className="num strong">
                    <Link className="order-number" href={`/orders/${o.id}`}>
                      {o.number}
                    </Link>
                  </td>
                  <td>
                    <Link className="cell-client" href={`/orders/${o.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      <ProdAnchor productType={o.productType} project={isProject(o)} />
                      <div>
                        <b>{o.client.name}</b>
                        <div className="xs subtle">
                          {isProject(o) ? t('projectOf', { qty: o.quantity!, unit: o.unit ?? '' }) : o.productType} · {o.city}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td>
                    <Badge tone={STAGE_TONE[o.stage]}>{o.stage === 'cancelled' ? w('stage.cancelled') : label(o.stage)}</Badge>
                  </td>
                  <td style={{ minWidth: 130 }}>{bar(o, tot)}</td>
                  <td className="small">{note(o) || '—'}</td>
                  <td className="right num strong">{owedCell(o, tot)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card list only-narrow">
          {list.map(({ o, tot }) => (
            <Link className="order-row" href={`/orders/${o.id}`} key={o.id}>
              <ProdAnchor productType={o.productType} project={isProject(o)} />
              <div className="order-row__main">
                <div className="order-row__top">
                  <span className="order-row__name">{o.client.name}</span>
                  {tot.owed > 0 ? <span className="order-row__amount">{eur(tot.owed)}</span> : <Badge tone={STAGE_TONE[o.stage]}>{o.stage === 'cancelled' ? w('stage.cancelled') : label(o.stage)}</Badge>}
                </div>
                <div className="order-row__meta">
                  {o.number} · {isProject(o) ? o.description.split(' · ')[0] : o.productType}
                  {note(o) && !isProject(o) ? ` · ${note(o)}` : ''}
                </div>
                {bar(o, tot)}
              </div>
            </Link>
          ))}
        </div>
      </>
    );

  return (
    <Page nav="orders">
      <PageHead
        title={t('title')}
        sub={t('count', { count: b.orders.length })}
        right={
          <Link className="btn btn--primary btn--sm" href="/orders/new">
            <Icon name="plus" /> {t('new')}
          </Link>
        }
      />
      <OrderSearch initial={p.q ?? ''} />
      <div className="filters">
        <div className="seg seg--inline">
          <Link href={href({ view: 'list' })} aria-current={view === 'list' ? 'page' : undefined}>
            {t('list')}
          </Link>
          <Link href={href({ view: 'kanban' })} aria-current={view === 'kanban' ? 'page' : undefined}>
            {t('board')}
          </Link>
        </div>
        {chips.map(([k, l]) => (
          <FilterChip key={k || 'all'} href={href({ stage: k })} on={stage === k}>
            {l} <b className="chip__count">{counts[k]}</b>
          </FilterChip>
        ))}
      </div>
      <div id="order-results" data-view={view}>
        {results}
      </div>
    </Page>
  );
}
