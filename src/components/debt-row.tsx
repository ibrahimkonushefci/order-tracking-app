/**
 * One debt row (spec §2): name, what it's for, amount owed now, how late, ONE status
 * line (the most decisive context), the message button and the call button.
 * The green "Kujtesë" shows only where a reminder is reasonable now; otherwise a quiet
 * icon still opens the prepared message so the owner can decide by hand.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { DebtContext, DebtRow as Row } from '@/domain/debts';
import { fmtDate } from '@/lib/dates';
import { ago, fmtDay, lateSpan } from '@/lib/fmt';
import { eur } from '@/lib/money';
import { Avatar, MiniBar } from './cues';
import { Icon, type IconName } from './icons';

export async function DebtRow({ d, today, installers, flash }: { d: Row; today: string; installers: { id: string; name: string }[]; flash?: boolean }) {
  const t = await getTranslations('debts');
  const tt = await getTranslations('time');
  const name = (id: string) => installers.find(i => i.id === id)?.name ?? '—';
  const status = (c: DebtContext): [string, IconName, string] => {
    switch (c.kind) {
      case 'held':
        return ['warning', 'cash', t('ctxHeld', { list: c.holders.map(h => t('heldBy', { amount: eur(h.amount), name: name(h.installerId) })).join(', ') })];
      case 'noReminders':
        return ['neutral', 'bellOff', t('ctxNoReminders')];
      case 'paused':
        return ['neutral', 'pause', t('ctxPaused', { date: fmtDate(c.until), reason: c.reason })];
      case 'remaining':
        return ['neutral', 'tool', t('ctxRemaining', { note: c.note })];
      case 'lastReminder':
        return ['neutral', 'message', t('ctxLast', { ago: ago(c.at, today, tt) })];
    }
  };
  // Next to the green button the last-reminder line gets its short form, so it isn't cut off.
  const top = d.contexts[0];
  const st = top ? status(top) : null;
  if (st && top?.kind === 'lastReminder' && d.rem.ok) st[2] = t('ctxLastShort', { ago: ago(top.at, today, tt) });
  const dot = d.overdue ? 'danger' : d.totals.held > 0 ? 'warning' : d.unknownDue ? 'neutral' : 'info';
  const meta = d.order
    ? [d.order.number, d.order.project ? `${d.order.project.installed} / ${d.order.project.quantity} ${d.order.project.unit}` : d.order.productType, d.order.doneDays ? t('sinceDone', { n: d.order.doneDays }) : null]
    : [d.opening?.forWhat ? t('openingFor', { what: d.opening.forWhat }) : t('opening')];
  const late = d.overdue ? (
    <span className="debt__late debt__late--danger">{t('late', { span: lateSpan(d.late!, tt) })}</span>
  ) : d.unknownDue ? (
    <span className="debt__late subtle">{t('unknownDue')}</span>
  ) : d.late === 0 ? (
    <span className="debt__late">{t('dueToday')}</span>
  ) : (
    <span className="debt__late subtle">{t('dueOn', { day: d.dueApprox ? `≈ ${fmtDate(d.dueDate)}` : fmtDay(d.dueDate, today, tt).toLowerCase() })}</span>
  );
  const href = d.kind === 'order' ? `/orders/${d.id}` : `/debts/${d.id}`;
  const ch = d.channel === 'viber' ? 'viber' : 'whatsapp';
  return (
    <div className={`debt${flash ? ' debt--new' : ''}`} id={`debt-${d.id}`}>
      <Link className="debt__top" href={href}>
        <Avatar name={d.name} dot={dot} />
        <div className="grow">
          <div className="debt__name">{d.name}</div>
          <div className="debt__meta">{meta.filter(Boolean).join(' · ')}</div>
        </div>
        <div className="debt__amount">
          <b>{eur(d.amount)}</b>
          {late}
        </div>
      </Link>
      <div className="debt__bar">
        <MiniBar t={d.totals} />
      </div>
      <div className="debt__foot">
        {st ? (
          <span className={`debt__status debt__status--${st[0]}`}>
            <Icon name={st[1]} />
            <span className="clamp2">{st[2]}</span>
          </span>
        ) : (
          <span className="grow" />
        )}
        {d.phone ? (
          <>
            {d.rem.ok ? (
              <Link className={`btn btn--${ch} btn--sm`} href={`/compose/${d.kind}/${d.id}?t=reminder`} aria-label={t('remindLabel', { name: d.name })}>
                <Icon name={ch} /> {t('remind')}
              </Link>
            ) : (
              <Link className="icon-btn icon-btn--quiet" href={`/compose/${d.kind}/${d.id}?t=reminder`} aria-label={t('writeByHand', { name: d.name })}>
                <Icon name={ch} />
              </Link>
            )}
            <a className="icon-btn icon-btn--call" href={`tel:${d.phone}`} aria-label={t('call', { name: d.name })}>
              <Icon name="phone" />
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}
