import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { can } from '@/auth/permissions';
import { getActiveBrand } from '@/brand/active';
import { citiesFor, productTypes } from '@/domain/catalog';
import { installedQty, isHeld, isProject, lateDays, orderTotals, partValue, payStatus, unitPrice } from '@/domain/balances';
import { Badge, PAY_TONE, PayLegend, Progress } from '@/components/cues';
import { Icon, type IconName } from '@/components/icons';
import { Page, PageHead } from '@/components/shell/shell';
import { ConfirmCashButton } from '@/components/sheets/confirm-cash';
import {
  ClearRemainingButton,
  NoRemindersToggle,
  OrderMoreActions,
  PartButton,
  PartEditButton,
  RestoreButton,
  StageControl,
  TermButton,
  UnpauseButton,
  type OrderView,
} from '@/components/sheets/order';
import { PaymentButton } from '@/components/sheets/payment';
import { Linkified, mapsLink } from '@/components/linkify';
import { getCompany } from '@/db/queries';
import { addDays, fmtDate, fmtDateTime, isoOf } from '@/lib/dates';
import { ago, fmtDay, lateSpan } from '@/lib/fmt';
import { eur } from '@/lib/money';
import { fmtPhone } from '@/lib/phone';
import { lastReminder } from '@/domain/debts';
import { loadHistory, loadOrder } from '@/services/book';
import { repairCleared } from '@/services/visits';
import { pageContext } from '@/server/context';
import { listInstallers } from '@/db/queries';
import { DoneVisitEditButton, VisitButton, VisitDoneButton } from '@/components/sheets/visit';
import { ContactPrefs, CopyLink, NewLinkButton } from '@/components/sheets/link';
import { reminderCheck, templatesFor } from '@/domain/messages';
import { dueVisit, nextVisit as nextVisitOf } from '@/domain/visits';
import { jobLites, trackingUrl } from '@/server/jobs';
import { visitOrderView, visitView } from '@/server/views';
import { pageBook } from '@/server/context';

const timeLabel = (v: string) => (v === 'morning' ? 'paradite' : v === 'afternoon' ? 'pasdite' : v);
const VISIT_ICON: Record<string, IconName> = { measure: 'ruler', install: 'tool', delivery: 'truck', repair: 'tool' };

/**
 * Order detail (spec §3): one alert at a time, the stage control, the money, the visits,
 * then quiet rows that open in place, the rare actions and the append-only history.
 */
export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { new: justCreated } = await searchParams;
  const { db, user, companyId, today, label } = await pageContext();
  const o = await loadOrder(db, companyId, id);
  if (!o) notFound();
  const [hist, installers, company, { brand }] = await Promise.all([loadHistory(db, 'order', o.id, o.clientId), listInstallers(companyId), getCompany(companyId), getActiveBrand()]);
  const t = await getTranslations('order');
  const tm = await getTranslations('money');
  const tt = await getTranslations('time');
  const w = await getTranslations('words');
  const tot = orderTotals(o);
  const proj = isProject(o);
  const inst = installers.map(i => ({ id: i.id, name: i.name }));
  const instName = (iid: string | null) => (iid ? (installers.find(i => i.id === iid)?.name ?? '—') : t('noInstaller'));
  const labels = { new: label('new'), active: label('active'), done: label('done') };
  const held = o.payments.filter(p => !p.deletedAt && isHeld(p));
  const pauseOn = !!o.pausedUntil && o.pausedUntil >= today;
  const last = lastReminder(o.messages);
  const installed = installedQty(o);
  const book = await pageBook();
  const jobs = jobLites(book.orders, today);
  const vo = visitOrderView(o);
  const activeInst = installers.filter(i => i.active || o.visits.some(v => v.installerId === i.id)).map(i => ({ id: i.id, name: i.name }));
  const rem = reminderCheck(tot, o, o.client.noReminders, today);
  const link = await trackingUrl(o.trackingToken);
  const firstTemplate = templatesFor(o, today)[0];

  const view: OrderView = {
    id: o.id,
    number: o.number,
    clientId: o.clientId,
    clientName: o.client.name,
    clientPhone: fmtPhone(o.client.phone),
    productType: o.productType,
    description: o.description,
    price: o.price,
    city: o.city,
    directions: o.directions,
    internalNote: o.internalNote,
    stage: o.stage,
    doneAt: o.doneAt,
    payTerm: o.payTerm,
    dueDate: o.dueDate,
    remaining: Math.max(0, tot.remaining),
    owed: tot.owed,
    earnedLeft: Math.max(0, tot.total - tot.earned),
    project: proj ? { quantity: o.quantity!, unit: o.unit ?? '', installed, unitPrice: unitPrice(o), term: o.projectPayTerm ?? 'month' } : null,
  };

  /* One alert at a time, most urgent first. */
  let alert = null;
  if (held.length) {
    const names = [...new Set(held.map(p => instName(p.heldBy)))].join(', ');
    alert = (
      <section className="alert alert--warning">
        <div className="alert__title">
          <Icon name="cash" />
          <span>{t('heldTitle', { amount: eur(tot.held), names })}</span>
        </div>
        <div className="alert__line">
          {t('heldLine')} <b className="num">{eur(proj ? tot.owed : Math.max(0, tot.remaining))}</b>
        </div>
        {held.map(p => (
          <div className="alert__pay" key={p.id}>
            <span className="small">{t('heldPay', { name: instName(p.heldBy), amount: eur(p.amount), day: fmtDay(p.date, today, tt).toLowerCase() })}</span>
            <ConfirmCashButton paymentId={p.id} installer={instName(p.heldBy)} amount={p.amount} date={p.date} who={o.client.name} />
          </div>
        ))}
      </section>
    );
  } else if (o.remainingWork) {
    alert = (
      <section className="alert alert--info">
        <div className="alert__title">
          <Icon name="tool" />
          <span>{t('remainingTitle')}</span>
        </div>
        <div className="alert__line">{o.remainingWork}</div>
        <div className="alert__line xs">{t('remainingHelp')}</div>
        <ClearRemainingButton id={o.id} />
      </section>
    );
  }

  /* Status: stepper, project progress, next visit line, the primary action. */
  const nextVisit = nextVisitOf(o.visits, today);
  const dv = o.stage !== 'cancelled' ? dueVisit(o.visits, today) : null;
  let info = '';
  if (o.stage === 'done') info = t('doneOn', { stage: labels.done, date: fmtDate(o.doneAt) });
  if (nextVisit) info += `${info ? ' · ' : ''}${t('nextVisit', { type: w(`visit.${nextVisit.type}`), day: fmtDay(nextVisit.date, today, tt).toLowerCase(), who: instName(nextVisit.installerId) })}`;
  else if (o.stage === 'new' || o.stage === 'active') info = info || t('noVisit');
  const projBlock = proj
    ? (() => {
        const pq = Math.round((installed / o.quantity!) * 100);
        const C = 2 * Math.PI * 30;
        const pI = Math.min(100, Math.round((tot.earned / tot.total) * 100));
        const pP = Math.min(100, Math.round((tot.paid / tot.total) * 100));
        return (
          <div className="proj2">
            <div className="ring" role="img" aria-label={t('ringLabel', { pct: pq })}>
              <svg viewBox="0 0 74 74">
                <circle className="ring__track" cx="37" cy="37" r="30" fill="none" strokeWidth="7" />
                <circle className="ring__fill" cx="37" cy="37" r="30" fill="none" strokeWidth="7" strokeDasharray={`${((C * pq) / 100).toFixed(1)} ${C.toFixed(1)}`} />
              </svg>
              <span className="ring__label">
                <b>
                  {installed}/{o.quantity}
                </b>
                <small>{o.unit}</small>
              </span>
            </div>
            <div className="proj2__bars">
              <div className="bar-row">
                <span>{t('installed')}</span>
                <b>
                  {eur(tot.earned)} · {pI}%
                </b>
              </div>
              <div className="bar bar--installed">
                <span style={{ width: `${pI}%` }} />
              </div>
              <div className="bar-row">
                <span>{t('paid')}</span>
                <b>
                  {eur(tot.paid)} · {pP}%
                </b>
              </div>
              <div className="bar bar--paid">
                <span style={{ width: `${pP}%` }} />
              </div>
              <div className={`proj2__gap${tot.owed > 0 ? '' : ' proj2__gap--ok'}`}>
                {tot.owed > 0 ? t('gapOwed', { amount: eur(tot.owed) }) : tot.paidAhead ? t('gapAhead', { amount: eur(tot.paidAhead) }) : t('gapOk')}
              </div>
            </div>
          </div>
        );
      })()
    : null;

  /* Money: one number first; the arithmetic lives in the fold. */
  const [mLabel, mValue, mOf] = proj
    ? [tm('owedNow'), tot.owed, tot.paidAhead ? tm('paidAhead', { amount: eur(tot.paidAhead) }) : tm('paidSoFar', { amount: eur(tot.paid) })]
    : o.stage === 'done'
      ? [tm('toPay'), tot.owed, tm('of', { amount: eur(tot.total) })]
      : [tm('leftOfTotal'), Math.max(0, tot.remaining), tm('ofWhenDone', { amount: eur(tot.total) })];
  const late = lateDays(tot, today);
  const dueBits: React.ReactNode[] = [];
  if (tot.owed > 0) {
    dueBits.push(tot.dueDate ? tm('dueOn', { date: fmtDate(tot.dueDate) }) : w('dueUnknown'));
    if (late && late > 0)
      dueBits.push(
        <span className="danger" key="late">
          {tm('late', { span: lateSpan(late, tt) })}
        </span>,
      );
  } else if (proj) dueBits.push(tm('eachPart', { term: w(`term.${o.projectPayTerm ?? 'month'}`).toLowerCase() }));
  const canTerm = o.stage !== 'cancelled' && (o.stage === 'done' || proj);
  const payments = [...o.payments].sort((a, b) => b.date.localeCompare(a.date));
  const ledgerRow = (l: React.ReactNode, v: string, cls = '') => (
    <div className={`ledger__row ${cls}`}>
      <span>{l}</span>
      <span className="num">{v}</span>
    </div>
  );
  const canDeletePay = can(user.role, 'delete');
  const payLite = (p: (typeof o.payments)[number]) => ({ id: p.id, amount: p.amount, method: p.method, heldBy: p.heldBy, date: p.date, note: p.note });

  /* Payments recorded on the day a visit was marked done, shown (never changed) when it is reopened. */
  const paysOn = (date: string) =>
    o.payments.filter(p => !p.deletedAt && p.date === date).map(p => `${eur(p.amount)} ${p.heldBy ? tm('withShort', { name: instName(p.heldBy) }).replace(/^T/, 't') : w('office')}`);
  const visitsOpen = o.visits.filter(v => !v.doneAt).sort((a, b) => a.date.localeCompare(b.date));
  const visitsDone = o.visits.filter(v => v.doneAt).sort((a, b) => b.doneAt!.localeCompare(a.doneAt!));
  /* "Nuk u krye" on a done repair offers to put "Ka punë të mbetura" back (the note it cleared, if any). */
  const restorable = o.stage === 'done' && !o.remainingWork ? visitsDone.filter(v => v.type === 'repair' && !v.quantity) : [];
  const cleared = new Map(await Promise.all(restorable.map(async v => [v.id, await repairCleared(db, companyId, o.id, v.id)] as const)));
  const restoreFor = (v: (typeof o.visits)[number]) => {
    if (!cleared.has(v.id)) return undefined;
    const c = cleared.get(v.id);
    return { checked: !!c, note: c?.note ?? '', pause: !c || !!c.until, until: c?.until && c.until > today ? c.until : addDays(today, 14), pausedUntil: pauseOn ? o.pausedUntil : null };
  };
  const visitRow = (v: (typeof o.visits)[number]) => {
    const sub = [instName(v.installerId)];
    if (v.quantity) sub.push(`${v.quantity} ${o.unit ?? ''} · ${eur(partValue(o, v))}`);
    if (v.note) sub.push(v.note);
    if (v.lastSentAt && !v.doneAt) sub.push(t('sentAgo', { ago: ago(isoOf(v.lastSentAt), today, tt) }));
    const main = (
      <>
        <span className={`visit__icon visit__icon--${v.type}`}>
          <Icon name={VISIT_ICON[v.type]} />
        </span>
        <span className="grow">
          <b>{w(`visit.${v.type}`)}</b> <span className="muted">· {v.doneAt ? fmtDate(v.doneAt) : `${fmtDay(v.date, today, tt)}${v.time ? ` · ${timeLabel(v.time)}` : ''}`}</span>
          <span className="visit__sub">{sub.join(' · ')}</span>
        </span>
      </>
    );
    return (
      <div className={`visit vt--${v.type}${v.doneAt ? ' visit--done' : ''}`} key={v.id}>
        {!v.doneAt && o.stage !== 'cancelled' ? (
          <VisitButton o={vo} visit={visitView(v)} installers={activeInst} jobs={jobs} today={today} className="visit__main" ariaLabel={t('editVisit')}>
            {main}
          </VisitButton>
        ) : (
          <div className="visit__main">{main}</div>
        )}
        {v.doneAt && proj && v.quantity && o.stage !== 'cancelled' ? (
          <PartEditButton o={view} part={{ id: v.id, quantity: v.quantity, date: v.doneAt, installerId: v.installerId, value: v.value }} installers={inst} today={today} canDelete={canDeletePay} />
        ) : v.doneAt && !v.quantity && o.stage !== 'cancelled' ? (
          <>
            <Badge tone="success" icon="check">
              {t('visitDone')}
            </Badge>
            <DoneVisitEditButton o={vo} visit={{ ...visitView(v), doneAt: v.doneAt }} installers={activeInst} today={today} payments={paysOn(v.doneAt)} restore={restoreFor(v)} />
          </>
        ) : v.doneAt ? (
          <Badge tone="success" icon="check">
            {t('visitDone')}
          </Badge>
        ) : o.stage !== 'cancelled' ? (
          <>
            {v.date <= today ? (
              <VisitDoneButton o={vo} visit={visitView(v)} installers={activeInst} className="btn btn--soft btn--sm">
                {t('markDone')}
              </VisitDoneButton>
            ) : null}
            <Link className="icon-btn icon-btn--whatsapp" href={`/send/visit/${o.id}/${v.id}`} aria-label={t('sendToInstaller')}>
              <Icon name="whatsapp" />
            </Link>
          </>
        ) : null}
      </div>
    );
  };

  const maps = mapsLink(o.directions);
  const fold = (key: string, icon: IconName, title: string, sum: React.ReactNode, body: React.ReactNode) => (
    <details className="fold" key={key}>
      <summary>
        <Icon name={icon} />
        <span className="grow">
          <span className="fold__title">{title}</span>
          {sum ? <span className="fold__sum">{sum}</span> : null}
        </span>
        <Icon name="right" className="chev" />
      </summary>
      <div className="fold__body">{body}</div>
    </details>
  );
  const ch = o.client.channel === 'viber' ? 'viber' : 'whatsapp';

  return (
    <Page nav="orders">
      <PageHead
        back="/orders"
        backLabel={t('back')}
        title={o.client.name}
        sub={`${o.number} · ${proj ? o.description.split(' · ')[0] : o.productType} · ${o.city}`}
      />
      <div className="detail-layout">
        {alert}
        {justCreated && o.payments.some(p => !p.deletedAt) && firstTemplate !== 'reminder' ? (
          <Link className="strip" href={`/compose/order/${o.id}?t=deposit`}>
            <span className={`strip__icon strip__icon--${ch}`}>
              <Icon name={ch} />
            </span>
            <span className="grow">
              <b>{t('thankDeposit', { word: (company?.depositWord ?? 'Avans').toLowerCase() })}</b> <span className="muted">{t('thankDepositSub')}</span>
            </span>
            <span className="strip__cta">
              {t('write')} <Icon name="right" />
            </span>
          </Link>
        ) : null}
        <div className="detail-primary">
          <section className="card">
            <div className="card__body">
              <div className="eyebrow">{proj ? t('stageProject') : t('stage')}</div>
              {o.stage === 'cancelled' ? (
                <div className="row">
                  <span className="grow">
                    <Badge tone="neutral" icon="x">
                      {w('stage.cancelled')}
                    </Badge>
                  </span>
                  <RestoreButton id={o.id} />
                </div>
              ) : (
                <StageControl o={view} labels={labels} installers={inst} />
              )}
              {projBlock}
              {info ? <div className="small muted">{info}</div> : null}
              {dv ? (
                <VisitDoneButton o={vo} visit={visitView(dv)} installers={activeInst} className="btn btn--primary btn--block">
                  <Icon name="check" /> {w(`visitDone.${dv.type}`)}
                  {dv.date < today ? ` (${fmtDay(dv.date, today, tt).toLowerCase()})` : ''}
                </VisitDoneButton>
              ) : proj && (o.stage === 'new' || o.stage === 'active') ? (
                <PartButton o={view} installers={inst} today={today} />
              ) : null}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <h2 className="card__title">{t('visits')}</h2>
              {o.stage !== 'cancelled' ? (
                <VisitButton o={vo} installers={activeInst} jobs={jobs} today={today} className="card__link">
                  <Icon name="plus" /> {t('plan')}
                </VisitButton>
              ) : null}
            </div>
            <div className="card__body">
              {visitsOpen.length ? <div className="list list--flush">{visitsOpen.map(visitRow)}</div> : null}
              {!visitsOpen.length && !visitsDone.length ? <div className="small muted">{t('noVisitsPlan')}</div> : null}
              {visitsDone.length ? (
                <details className="fold fold--inline">
                  <summary>
                    <span className="grow">
                      <span className="fold__title">{proj ? t('partsDone', { n: visitsDone.filter(v => v.quantity).length }) : t('visitsDone', { n: visitsDone.length })}</span>
                    </span>
                    <Icon name="right" className="chev" />
                  </summary>
                  <div className="fold__body">
                    <div className="list list--flush">{visitsDone.map(visitRow)}</div>
                  </div>
                </details>
              ) : null}
            </div>
          </section>

          <section className="card folds">
            {fold(
              'loc',
              'map',
              t('place'),
              [o.city, o.directions].filter(Boolean).join(' · '),
              <>
                {o.directions ? (
                  <div className="job__dir">
                    <Icon name="nav" />
                    <span>
                      <Linkified text={o.directions} />
                    </span>
                  </div>
                ) : null}
                <div className="small muted">{o.city}</div>
                {maps ? (
                  <a className="btn btn--secondary btn--sm btn--fit" href={maps} target="_blank" rel="noopener">
                    <Icon name="map" /> {t('openMaps')}
                  </a>
                ) : (
                  <div className="xs subtle">{t('placeHelp')}</div>
                )}
              </>,
            )}
            {fold(
              'client',
              'user',
              t('client'),
              `${o.client.name} · ${fmtPhone(o.client.phone)}`,
              <>
                <div className="contact">
                  <div className="grow">
                    <b>{o.client.name}</b>
                    <div className="small muted">
                      {fmtPhone(o.client.phone)} · {o.client.channel === 'viber' ? 'Viber' : o.client.channel === 'sms' ? 'SMS' : 'WhatsApp'}
                    </div>
                    {o.client.note ? <div className="xs subtle">{o.client.note}</div> : null}
                  </div>
                  <a className="icon-btn icon-btn--call" href={`tel:${o.client.phone}`} aria-label={t('call', { name: o.client.name })}>
                    <Icon name="phone" />
                  </a>
                </div>
                <Link className={`btn btn--${ch} btn--sm btn--fit`} href={`/compose/order/${o.id}`}>
                  <Icon name={ch} /> {t('writeClient')}
                </Link>
                <ContactPrefs kind="client" id={o.clientId} language={o.client.language} channel={o.client.channel} />
                <NoRemindersToggle kind="client" id={o.clientId} value={o.client.noReminders} label={t('noReminders')} />
                <div className="xs subtle">{t('clientHelp')}</div>
              </>,
            )}
            {o.stage !== 'cancelled'
              ? fold(
                  'link',
                  'link',
                  t('trackingPage'),
                  t('trackingSum', { lang: w(`lang.${o.client.language}`) }),
                  <>
                    <div className="mono-box">
                      <Icon name="link" />
                      <span className="ellipsis grow">{link}</span>
                    </div>
                    <div className="btn-row">
                      <Link className="btn btn--soft btn--sm" href={`/compose/order/${o.id}?t=link`}>
                        <Icon name="whatsapp" /> {t('sendLink')}
                      </Link>
                      <a className="btn btn--secondary btn--sm" href={`/t/${o.trackingToken}`} target="_blank" rel="noopener">
                        <Icon name="eye" /> {t('previewLink')}
                      </a>
                      <CopyLink url={link} />
                    </div>
                    <NewLinkButton orderId={o.id} />
                  </>,
                )
              : null}
            {o.internalNote
              ? fold(
                  'notes',
                  'book',
                  t('internalNote'),
                  o.internalNote,
                  <>
                    <div className="small">{o.internalNote}</div>
                    <div className="xs subtle">{t('internalNoteHelp')}</div>
                  </>,
                )
              : null}
          </section>
        </div>

        <aside className="detail-secondary">
          <section className="card">
            <div className="card__body">
              <div className="row">
                <span className="eyebrow grow">{tm('payments')}</span>
                {proj ? null : (
                  <Badge tone={PAY_TONE[payStatus(o, tot)]}>{payStatus(o, tot) === 'deposit' ? (company?.depositWord ?? 'Avans') : tm(`status.${payStatus(o, tot)}`)}</Badge>
                )}
              </div>
              <div className="money">
                <span className="money__label">{mLabel}</span>
                <span className={`money__value num${mValue <= 0 ? ' money__value--ok' : ''}`}>
                  {mValue <= 0 ? <Icon name="check" /> : null}
                  {eur(mValue)}
                </span>
                <span className="money__of">{mOf}</span>
              </div>
              <Progress t={tot} big />
              <PayLegend t={tot} />
              {dueBits.length ? (
                <div className="row">
                  <span className="small muted grow">
                    {dueBits.map((b, i) => (
                      <span key={i}>
                        {i ? ' · ' : ''}
                        {b}
                      </span>
                    ))}
                  </span>
                  {canTerm ? <TermButton o={view} /> : null}
                </div>
              ) : null}
              {pauseOn ? (
                <div className="note-line">
                  <Icon name="pause" />
                  <span className="grow">{tm('paused', { date: fmtDate(o.pausedUntil), reason: o.pauseReason ?? '' })}</span>
                  <UnpauseButton kind="order" id={o.id} />
                </div>
              ) : null}
              {o.client.noReminders ? (
                <div className="note-line">
                  <Icon name="bellOff" />
                  <span>
                    {t('noReminders')}
                    {o.client.note ? ` · ${o.client.note}` : ''}
                  </span>
                </div>
              ) : null}
              {last ? (
                <div className="note-line">
                  <Icon name="message" />
                  <span>{tm('lastReminder', { ago: ago(new Date(last.sentAt).toISOString().slice(0, 10), today, tt), channel: last.channel })}</span>
                </div>
              ) : null}
              {(tot.remaining > 0 && o.stage !== 'cancelled') || rem.ok ? (
                <div className="btn-row">
                  <PaymentButton
                    className="btn btn--secondary"
                    kind="order"
                    recordId={o.id}
                    suggest={proj ? tot.owed : Math.max(0, tot.remaining)}
                    due={proj ? tot.owed : Math.max(0, tot.remaining)}
                    installers={inst}
                    canDelete={canDeletePay}
                    today={today}
                  >
                    <Icon name="plus" /> {tm('record')}
                  </PaymentButton>
                  {rem.ok ? (
                    <Link className={`btn btn--${ch}`} href={`/compose/order/${o.id}?t=reminder`}>
                      <Icon name={ch} /> {t('reminder')}
                    </Link>
                  ) : null}
                </div>
              ) : null}
              <details className="fold fold--inline">
                <summary>
                  <span className="grow">
                    <span className="fold__title">{tm('ledgerTitle')}</span>
                    <span className="fold__sum">{tm('count', { n: o.payments.filter(p => !p.deletedAt).length })}</span>
                  </span>
                  <Icon name="right" className="chev" />
                </summary>
                <div className="fold__body">
                  <div className="ledger">
                    {ledgerRow(proj ? tm('contract') : tm('agreed'), eur(tot.total))}
                    {proj ? ledgerRow(tm('installedLine', { n: installed, unit: o.unit ?? '', price: eur(unitPrice(o)) }), eur(tot.earned)) : null}
                    {ledgerRow(tm('customerPaid'), eur(tot.paid))}
                    {tot.held ? (
                      <>
                        {ledgerRow(tm('inOfficeLower'), eur(tot.inOffice), 'ledger__row--sub')}
                        {ledgerRow(tm('heldLower'), eur(tot.held), 'ledger__row--sub')}
                      </>
                    ) : null}
                    {proj ? (
                      <>
                        {ledgerRow(tm('owedNow'), eur(tot.owed), 'ledger__row--sum')}
                        {ledgerRow(tm('contractLeft'), eur(Math.max(0, tot.remaining)))}
                      </>
                    ) : (
                      ledgerRow(tm('left'), eur(Math.max(0, tot.remaining)), 'ledger__row--sum')
                    )}
                  </div>
                  {payments.length ? (
                    <div>
                      {payments.map(p => (
                        <div className={`pay${p.deletedAt ? ' pay--deleted' : ''}`} key={p.id}>
                          <div className="pay__top">
                            <div className="grow">
                              <div className="pay__amount">{eur(p.amount)}</div>
                              <div className="small muted">
                                {w(`method.${p.method}`)} · {fmtDate(p.date)} ·{' '}
                                {p.heldBy
                                  ? p.handedAt
                                    ? tm('handedBy', { name: instName(p.heldBy), date: fmtDate(new Date(p.handedAt).toISOString().slice(0, 10)) })
                                    : tm('withNotHanded', { name: instName(p.heldBy) })
                                  : w('office')}
                              </div>
                              {p.note ? <div className="xs subtle">{p.note}</div> : null}
                            </div>
                            {p.deletedAt ? (
                              <Badge tone="neutral" icon="trash">
                                {tm('deleted')}
                              </Badge>
                            ) : (
                              <>
                                {p.heldBy && !p.handedAt ? (
                                  <Badge tone="warning" icon="clock">
                                    {tm('withShort', { name: instName(p.heldBy) })}
                                  </Badge>
                                ) : null}
                                {o.stage !== 'cancelled' ? (
                                  <PaymentButton
                                    className="btn btn--ghost btn--sm"
                                    kind="order"
                                    recordId={o.id}
                                    payment={payLite(p)}
                                    suggest={p.amount}
                                    due={0}
                                    installers={inst}
                                    canDelete={canDeletePay}
                                    today={today}
                                  >
                                    <Icon name="edit" /> {tm('edit')}
                                  </PaymentButton>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="small muted">{tm('none')}</div>
                  )}
                </div>
              </details>
            </div>
          </section>

          <section className="card folds">
            {fold(
              'more',
              'settings',
              t('more'),
              '',
              <OrderMoreActions
                o={view}
                canPause={(tot.owed > 0 || o.stage === 'done') && !pauseOn && o.stage !== 'cancelled'}
                canRemaining={o.stage === 'done' && !o.remainingWork}
                canDelete={can(user.role, 'delete') && !o.payments.some(p => !p.deletedAt)}
                products={productTypes(company?.productTypes, brand.businessType)}
                cities={citiesFor(brand.contact.city)}
                today={today}
              />,
            )}
            {fold(
              'hist',
              'clock',
              t('history'),
              t('historySum', { n: hist.length }),
              <div className="timeline">
                {hist.map(h => (
                  <div className={`tl ${/^Pagesa|^Pagesë|Konfirmuar|Avans|Kapar|Çmimi/.test(h.text) ? 'tl--money' : /fshi|anulua/.test(h.text) ? 'tl--danger' : /pauzë|mbetura|Faza: E kryer →/.test(h.text) ? 'tl--warn' : 'tl--stage'}`} key={h.id}>
                    <span className="tl__dot" />
                    <div>
                      <div className="tl__text">{h.text}</div>
                      <div className="tl__meta">
                        {h.who ?? '—'} · {fmtDateTime(h.at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>,
            )}
          </section>
        </aside>
      </div>
    </Page>
  );
}
