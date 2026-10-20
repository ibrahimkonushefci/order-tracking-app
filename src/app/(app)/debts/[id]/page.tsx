import { getTranslations } from 'next-intl/server';
import { can } from '@/auth/permissions';
import { isHeld, lateDays, openingTotals } from '@/domain/balances';
import { lastReminder, REMINDER_GAP_DAYS, reminderCheck } from '@/domain/debts';
import Link from 'next/link';
import { ContactPrefs } from '@/components/sheets/link';
import { Badge } from '@/components/cues';
import { HeldCashAlert } from '@/components/held-cash';
import { Icon } from '@/components/icons';
import { Page, PageHead } from '@/components/shell/shell';
import { EditOpeningButton, OpeningMoreActions, SetDueButton } from '@/components/sheets/opening';
import { UnpauseButton } from '@/components/sheets/order';
import { PaymentButton } from '@/components/sheets/payment';
import { firstName } from '@/components/cues';
import { listInstallers } from '@/db/queries';
import { addDays, fmtDate, fmtDateTime, fmtMonth, isoOf } from '@/lib/dates';
import { ago, lateSpan } from '@/lib/fmt';
import { eur } from '@/lib/money';
import { fmtPhone } from '@/lib/phone';
import { loadHistory, loadOpening } from '@/services/book';
import { pageContext } from '@/server/context';
import { missingRecord } from '@/server/demo';

/** Borxh i bartur: not an order (no stages, visits or tracking link), but payments, pauses and reminders work the same. */
export default async function OpeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, companyId, today, user } = await pageContext();
  const ob = await loadOpening(db, companyId, id);
  if (!ob) missingRecord('/debts');
  const [hist, installers] = await Promise.all([loadHistory(db, 'opening', ob.id), listInstallers(companyId)]);
  const t = await getTranslations('opening');
  const tm = await getTranslations('money');
  const tt = await getTranslations('time');
  const w = await getTranslations('words');
  const tot = openingTotals(ob);
  const late = lateDays(tot, today);
  const pauseOn = !!ob.pausedUntil && ob.pausedUntil >= today;
  const last = lastReminder(ob.messages);
  const inst = installers.map(i => ({ id: i.id, name: i.name }));
  const instName = (iid: string | null) => installers.find(i => i.id === iid)?.name ?? '—';
  const canDelete = can(user.role, 'delete');
  const workDone = /^\d{4}-\d{2}-\d{2}$/.test(ob.workDone) ? fmtDate(ob.workDone) : /^\d{4}-\d{2}$/.test(ob.workDone) ? fmtMonth(ob.workDone) : t('dontKnow');
  const rem = reminderCheck(tot, ob, ob.noReminders, today);
  const reminders = tot.owed <= 0 ? t('remNoDebt') : !ob.dueDate ? w('dueUnknown') : pauseOn ? tm('paused', { date: fmtDate(ob.pausedUntil), reason: ob.pauseReason ?? '' }) : ob.noReminders ? t('remOff') : (late ?? 0) <= 0 ? t('remNotDue', { date: fmtDate(ob.dueDate) }) : rem.ok || !rem.lastAt ? t('remNow') : t('remNext', { date: fmtDate(addDays(rem.lastAt, REMINDER_GAP_DAYS)) });
  const ch = ob.channel === 'viber' ? 'viber' : 'whatsapp';
  const held = ob.payments.filter(p => !p.deletedAt && isHeld(p));
  return (
    <Page nav="debts">
      <PageHead back="/debts" backLabel={t('back')} title={ob.name} sub={ob.forWhat ? t('subFor', { what: ob.forWhat }) : t('sub')} />
      <div className="narrow">
        {held.length ? <HeldCashAlert held={held} instName={instName} left={tot.owed} who={ob.name} today={today} /> : null}
        <section className="card">
          <div className="card__body">
            <div className="row">
              <span className="eyebrow grow">{t('sub')}</span>
              {!ob.dueDate ? (
                <Badge tone="neutral" icon="help">
                  {w('dueUnknown')}
                </Badge>
              ) : (late ?? 0) > 0 && tot.owed > 0 ? (
                <Badge tone="danger">{tm('late', { span: lateSpan(late!, tt) })}</Badge>
              ) : null}
            </div>
            <div className="money">
              <span className="money__label">{t('left')}</span>
              <span className={`money__value num${tot.owed <= 0 ? ' money__value--ok' : ''}`}>
                {tot.owed <= 0 ? <Icon name="check" /> : null}
                {eur(tot.owed)}
              </span>
              <span className="money__of">{tot.paid > 0 ? tm('of', { amount: eur(tot.total) }) : ''}</span>
            </div>
            <dl className="kv">
              <dt>{t('workDone')}</dt>
              <dd>{workDone}</dd>
              <dt>{t('due')}</dt>
              <dd>{ob.dueDate ? (ob.dueApprox ? `≈ ${fmtMonth(ob.dueDate.slice(0, 7))}` : fmtDate(ob.dueDate)) : t('dontKnow')}</dd>
              <dt>{t('phone')}</dt>
              <dd>{ob.phone ? fmtPhone(ob.phone) : '—'}</dd>
              <dt>{t('reminders')}</dt>
              <dd>{reminders}</dd>
            </dl>
            {ob.note ? (
              <div className="note-line">
                <Icon name="book" />
                <span>{ob.note}</span>
              </div>
            ) : null}
            {pauseOn ? (
              <div className="note-line">
                <Icon name="pause" />
                <span className="grow">{tm('paused', { date: fmtDate(ob.pausedUntil), reason: ob.pauseReason ?? '' })}</span>
                <UnpauseButton kind="opening" id={ob.id} />
              </div>
            ) : null}
            {last ? (
              <div className="note-line">
                <Icon name="message" />
                <span>{tm('lastReminder', { ago: ago(isoOf(last.sentAt), today, tt), channel: w(`channelName.${last.channel}`) })}</span>
              </div>
            ) : null}
            {ob.phone ? (
              <div className="row">
                <span className="grow small muted">{t('contact', { name: firstName(ob.name) })}</span>
                {rem.ok ? (
                  <Link className={`btn btn--${ch} btn--sm`} href={`/compose/opening/${ob.id}?t=reminder`}>
                    <Icon name={ch} /> {t('remind')}
                  </Link>
                ) : (
                  <Link className="icon-btn icon-btn--quiet" href={`/compose/opening/${ob.id}?t=reminder`} aria-label={t('write')}>
                    <Icon name={ch} />
                  </Link>
                )}
                <a className="icon-btn icon-btn--call" href={`tel:${ob.phone}`} aria-label={t('call')}>
                  <Icon name="phone" />
                </a>
              </div>
            ) : null}
            <div className="btn-row">
              {tot.owed > 0 ? (
                <PaymentButton className="btn btn--secondary" kind="opening" recordId={ob.id} suggest={tot.owed} due={tot.owed} installers={inst} canDelete={canDelete} today={today}>
                  <Icon name="plus" /> {tm('record')}
                </PaymentButton>
              ) : null}
              {!ob.dueDate ? <SetDueButton id={ob.id} /> : null}
              <EditOpeningButton
                id={ob.id}
                paid={tot.paid}
                today={today}
                initial={{ name: ob.name, phone: ob.phone, amount: ob.amount, forWhat: ob.forWhat, workDone: ob.workDone, dueDate: ob.dueDate, dueApprox: ob.dueApprox, note: ob.note }}
              />
            </div>
            {ob.payments.length ? (
              <div>
                {[...ob.payments]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(p => (
                    <div className={`pay${p.deletedAt ? ' pay--deleted' : ''}`} key={p.id}>
                      <div className="pay__top">
                        <div className="grow">
                          <div className="pay__amount">{eur(p.amount)}</div>
                          <div className="small muted">
                            {w(`method.${p.method}`)} · {fmtDate(p.date)} · {p.heldBy ? (p.handedAt ? tm('handedBy', { name: instName(p.heldBy), date: fmtDate(isoOf(p.handedAt)) }) : tm('withNotHanded', { name: instName(p.heldBy) })) : w('office')}
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
                            <PaymentButton
                              className="btn btn--ghost btn--sm"
                              kind="opening"
                              recordId={ob.id}
                              payment={{ id: p.id, amount: p.amount, method: p.method, heldBy: p.heldBy, date: p.date, note: p.note }}
                              suggest={p.amount}
                              due={0}
                              installers={inst}
                              canDelete={canDelete}
                              today={today}
                            >
                              <Icon name="edit" /> {tm('edit')}
                            </PaymentButton>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : null}
            <p className="xs subtle" style={{ margin: 0 }}>
              {t('notOrder')}
            </p>
          </div>
        </section>
        <section className="card folds">
          <details className="fold">
            <summary>
              <Icon name="settings" />
              <span className="grow">
                <span className="fold__title">{t('more')}</span>
              </span>
              <Icon name="right" className="chev" />
            </summary>
            <div className="fold__body">
              {ob.phone ? <ContactPrefs kind="opening" id={ob.id} language={ob.language} channel={ob.channel} /> : null}
              <OpeningMoreActions
                id={ob.id}
                name={ob.name}
                amount={ob.amount}
                canPause={tot.owed > 0 && !pauseOn}
                noReminders={ob.noReminders}
                canDelete={canDelete}
                hasPayments={ob.payments.some(p => !p.deletedAt)}
                today={today}
              />
            </div>
          </details>
          <details className="fold">
            <summary>
              <Icon name="clock" />
              <span className="grow">
                <span className="fold__title">{t('history')}</span>
                <span className="fold__sum">{t('historySum', { n: hist.length })}</span>
              </span>
              <Icon name="right" className="chev" />
            </summary>
            <div className="fold__body">
              <div className="timeline">
                {hist.map(h => (
                  <div className="tl tl--money" key={h.id}>
                    <span className="tl__dot" />
                    <div>
                      <div className="tl__text">{h.text}</div>
                      <div className="tl__meta">
                        {h.who ?? '—'} · {fmtDateTime(h.at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </section>
      </div>
    </Page>
  );
}
