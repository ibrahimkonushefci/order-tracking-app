import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { allJobs, availability, dative, installerSummary, loadTone, pastUndone, type VisitType } from '@/domain/visits';
import { activePayments } from '@/domain/balances';
import { AgendaItem } from '@/components/agenda';
import { Avatar } from '@/components/cues';
import { Icon } from '@/components/icons';
import { Page, PageHead } from '@/components/shell/shell';
import { addDays, fmtDate, fmtLong, weekday, WEEKDAYS_SHORT } from '@/lib/dates';
import { fmtDay } from '@/lib/fmt';
import { eur } from '@/lib/money';
import { fmtPhone } from '@/lib/phone';
import { pageBook, pageContext } from '@/server/context';

const TABS = ['today', 'tomorrow', 'week', 'team'] as const;

/**
 * Orari (spec §5): Sot / Nesër / 7 ditë grouped by installer plus "Pa montues", "Nga ditët e
 * kaluara" with a one-tap "U krye", one "Dërgo … punët e nesërme" per installer and day, and
 * the "Montuesit" tab: "Disponueshmëria" (7-day grid) and "Përmbledhja e montuesve".
 */
export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ d?: string; i?: string }> }) {
  const { d: raw = 'today', i: only } = await searchParams;
  const { today } = await pageContext();
  const b = await pageBook();
  const t = await getTranslations('schedule');
  const w = await getTranslations('words');
  const tt = await getTranslations('time');
  const tomorrow = addDays(today, 1);
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const tab = isDate ? 'team' : (TABS.find(x => x === raw) ?? 'today');
  const jobs = allJobs(b.orders);
  const installers = b.installers.map(i => ({ id: i.id, name: i.name }));
  const instName = (id: string | null) => (id ? (b.installers.find(i => i.id === id)?.name ?? '—') : w('noInstaller'));

  const seg = (
    <nav className="seg" aria-label={t('title')}>
      {TABS.map(k => (
        <Link key={k} href={k === 'today' ? '/schedule' : `/schedule?d=${k}`} aria-current={tab === k ? 'page' : undefined}>
          {t(k === 'team' ? 'installers' : k)}
        </Link>
      ))}
    </nav>
  );

  if (tab === 'team' && !isDate) {
    const grid = availability(jobs, b.installers.filter(i => i.active).map(i => i.id), today);
    const payments = [...b.orders.flatMap(o => o.payments), ...b.openings.flatMap(o => o.payments)];
    return (
      <Page nav="schedule">
        <PageHead title={t('title')} sub={t('teamSub')} />
        {seg}
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">{t('availability')}</h2>
            <span className="xs subtle">{t('availabilitySub')}</span>
          </div>
          <div className="avail">
            <div className="avail__row">
              <span />
              {grid.dates.map(day => (
                <span key={day} className={`avail__day${day === today ? ' avail__day--today' : ''}`}>
                  {WEEKDAYS_SHORT[weekday(day)]}
                  <small>{Number(day.slice(8))}</small>
                </span>
              ))}
            </div>
            {grid.rows.map(r => {
              const name = instName(r.installerId);
              return (
                <div className="avail__row" key={r.installerId}>
                  <span className="avail__name">
                    <Avatar name={name} size="sm" />
                    <span>{name}</span>
                  </span>
                  {r.counts.map((n, k) => (
                    <Link
                      key={grid.dates[k]}
                      className={`avail__cell avail__cell--${Math.min(n, 2)}`}
                      href={`/schedule?d=${grid.dates[k]}&i=${r.installerId}`}
                      aria-label={t('cellLabel', { name, day: fmtLong(grid.dates[k]), n })}
                    >
                      {n || '—'}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="legend avail-legend">
            <span className="legend__item">
              <span className="legend__dot ld--free" />
              {t('free')}
            </span>
            <span className="legend__item">
              <span className="legend__dot ld--one" />
              {t('one')}
            </span>
            <span className="legend__item">
              <span className="legend__dot ld--busy" />
              {t('busy')}
            </span>
            <span className="legend__item subtle">{t('tapDay')}</span>
            <span className="legend__item subtle only-narrow">{t('swipe')}</span>
          </div>
        </section>
        <h2 className="section-title">{t('summary')}</h2>
        <div className="inst-grid">
          {b.installers
            .filter(i => i.active)
            .map(i => {
              const s = installerSummary(jobs, i.id, activePayments(payments), today);
              const next = s.upcoming[0];
              const tom = jobs.filter(x => x.v.installerId === i.id && x.v.date === tomorrow && !x.v.doneAt).length;
              const parts = (['install', 'delivery', 'measure', 'repair'] as VisitType[]).filter(k => s.done[k]);
              return (
                <section className="card inst" key={i.id}>
                  <div className="inst__head">
                    <Avatar name={i.name} />
                    <span className="grow">
                      <span className="inst__name">{i.name}</span>
                      <br />
                      <span className="xs muted">{fmtPhone(i.phone)}</span>
                    </span>
                    {tom ? (
                      <Link className={`icon-btn icon-btn--${i.channel}`} href={`/send/day/${i.id}/${tomorrow}`} aria-label={t('sendTomorrow', { name: dative(i.name) })}>
                        <Icon name={i.channel} />
                      </Link>
                    ) : null}
                    <a className="icon-btn icon-btn--call" href={`tel:${i.phone}`} aria-label={t('call', { name: i.name })}>
                      <Icon name="phone" />
                    </a>
                  </div>
                  <div className="stats">
                    <div className="stat">
                      <span className="stat__v">{s.upcoming.length}</span>
                      <span className="stat__l">{t('pending')}</span>
                    </div>
                    <div className="stat stat--ok">
                      <span className="stat__v">{s.doneTotal}</span>
                      <span className="stat__l">{t('doneJobs')}</span>
                    </div>
                    {s.held ? (
                      <Link className="stat stat--warn" href="/cash">
                        <span className="stat__v">{eur(s.held)}</span>
                        <span className="stat__l">{t('cashInHand')} ›</span>
                      </Link>
                    ) : (
                      <div className="stat">
                        <span className="stat__v">0€</span>
                        <span className="stat__l">{t('cashInHand')}</span>
                      </div>
                    )}
                  </div>
                  {parts.length || Object.keys(s.units).length ? (
                    <div className="breakdown">
                      {parts.map(k => (
                        <span key={k} className={`badge vt--${k}`} style={{ background: 'color-mix(in srgb, var(--vt) 12%, var(--color-surface))', color: 'var(--vt)' }}>
                          {t(`doneKind.${k}`)} <b>{s.done[k]}</b>
                        </span>
                      ))}
                      {Object.entries(s.units).map(([u, n]) => (
                        <span key={u} className="badge badge--brand">
                          <Icon name="building" /> <b>{n}</b> {t('unitsInstalled', { unit: u })}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="small muted">
                    {next ? (
                      <>
                        {t('next')} <b>{w(`visit.${next.v.type}`)}</b> {fmtDay(next.v.date, today, tt).toLowerCase()} · {next.o.client.name}
                      </>
                    ) : (
                      t('noneNext')
                    )}
                  </div>
                  {s.unmarked.length ? (
                    <div className="small" style={{ color: 'var(--color-warning)' }}>
                      {t('unmarked', { n: s.unmarked.length })}
                    </div>
                  ) : null}
                </section>
              );
            })}
        </div>
      </Page>
    );
  }

  const days = isDate ? [raw] : tab === 'today' ? [today] : tab === 'tomorrow' ? [tomorrow] : Array.from({ length: 7 }, (_, k) => addDays(today, k));
  const past = isDate ? [] : pastUndone(jobs, today);
  const groups = [...b.installers.map(i => ({ id: i.id as string | null, name: i.name, channel: i.channel })), { id: null, name: w('noInstaller'), channel: 'whatsapp' as const }];
  const blocks = await Promise.all(
    days.map(async day => {
      const items = jobs.filter(x => x.v.date === day && (!only || x.v.installerId === only));
      if (!items.length) {
        if (tab === 'week') return null;
        return (
          <div className="card" key={day}>
            <div className="empty">
              <Icon name="check" />
              <b>{isDate ? (only ? t('freeDay', { name: instName(only) }) : t('nothingDay')) : day === today ? t('nothingToday') : t('nothingTomorrow')}</b>
              {isDate ? null : <span className="small">{t('planHint')}</span>}
            </div>
          </div>
        );
      }
      return (
        <div key={day} style={{ display: 'contents' }}>
          {isDate ? null : (
            <h2 className="section-title">
              {fmtDay(day, today, tt)} · {fmtLong(day)}
            </h2>
          )}
          {groups
            .map(g => ({ ...g, items: items.filter(x => (x.v.installerId ?? null) === g.id) }))
            .filter(g => g.items.length)
            .map(g => {
              const open = g.items.filter(x => !x.v.doneAt);
              const tone = loadTone(g.items.length);
              const when = day === tomorrow ? t('whenTomorrow') : day === today ? t('whenToday') : t('whenDay');
              return (
                <section className="card" key={`${day}-${g.id}`}>
                  <div className="group-head">
                    {g.id ? (
                      <Avatar name={g.name} dot={tone === 'busy' ? 'warning' : null} size="sm" />
                    ) : (
                      <span className="av av--prod av--sm">
                        <Icon name="help" />
                      </span>
                    )}
                    <span className="grow">
                      <span className="group-head__name">{g.name}</span>{' '}
                      <span className="group-head__count">
                        · {t('jobs', { n: g.items.length })}
                        {g.id && tone === 'busy' ? ` · ${t('busyDay')}` : ''}
                      </span>
                    </span>
                  </div>
                  <div className="agenda">
                    {g.items.map(x => (
                      <AgendaItem key={x.v.id} o={x.o} v={x.v} today={today} installers={installers} doneBtn />
                    ))}
                  </div>
                  {g.id && open.length && day >= today ? (
                    <div className="card__foot">
                      <Link className={`btn btn--${g.channel} btn--block`} href={`/send/day/${g.id}/${day}`}>
                        <Icon name={g.channel} /> {t('sendDay', { name: dative(g.name), when })}
                      </Link>
                    </div>
                  ) : null}
                </section>
              );
            })}
        </div>
      );
    }),
  );
  const shown = blocks.filter(Boolean);
  return (
    <Page nav="schedule">
      {isDate ? <PageHead back="/schedule?d=team" backLabel={t('back')} title={fmtLong(raw)} sub={t('dayJobs')} /> : <PageHead title={t('title')} sub={t('sub')} />}
      {seg}
      {isDate && only ? (
        <Link className="filter-chip" href={`/schedule?d=${raw}`} aria-label={t('clearFilter')}>
          {instName(only)} <Icon name="x" />
        </Link>
      ) : null}
      {past.length ? (
        <>
          <h2 className="section-title">
            {t('past')} <span className="count">{past.length}</span>
          </h2>
          <p className="group-help">{t('pastHelp')}</p>
          <section className="card">
            <div className="agenda">
              {past.map(x => (
                <AgendaItem
                  key={x.v.id}
                  o={x.o}
                  v={x.v}
                  today={today}
                  installers={installers}
                  doneBtn
                  showInstaller
                  timeText={x.v.date === addDays(today, -1) ? tt('yesterday') : fmtDate(x.v.date).slice(0, 5)}
                />
              ))}
            </div>
          </section>
        </>
      ) : null}
      {shown.length ? (
        shown
      ) : (
        <div className="card">
          <div className="empty">
            <Icon name="check" />
            <b>{t('empty')}</b>
          </div>
        </div>
      )}
    </Page>
  );
}
