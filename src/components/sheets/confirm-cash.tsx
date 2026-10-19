'use client';
/** "Konfirmo: i mora paratë nga Driton" (one payment) and "Konfirmo të gjitha" (everything one installer holds). */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { confirmAllAction, confirmCashAction } from '@/app/(app)/actions';
import { FormAlert, SheetActions, useAction } from '../forms';
import { Icon } from '../icons';
import { Sheet } from '../sheet';
import { eur } from '@/lib/money';
import { fmtDate } from '@/lib/dates';

export function ConfirmCashButton({
  paymentId,
  installer,
  amount,
  date,
  who,
  variant = 'block',
}: {
  paymentId: string;
  installer: string;
  amount: number;
  date: string;
  who: string;
  variant?: 'block' | 'only' | 'small';
}) {
  const t = useTranslations('cash');
  const [open, setOpen] = useState(false);
  const { errors, pending, submit } = useAction(() => confirmCashAction(paymentId), () => setOpen(false));
  return (
    <>
      <button
        type="button"
        className={variant === 'only' ? 'btn btn--secondary btn--sm btn--fit' : variant === 'small' ? 'btn btn--success btn--sm' : 'btn btn--success btn--block'}
        onClick={() => setOpen(true)}
      >
        <Icon name="check" /> {variant === 'only' ? t('confirmOnly') : t('confirm', { name: installer })}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('confirm', { name: installer })} sub={t('confirmSub', { amount: eur(amount), who, date: fmtDate(date) })}>
        <form onSubmit={submit} className="form">
          <div className="callout callout--info">
            <Icon name="cash" />
            <span>{t.rich('confirmHelp', { name: installer, b: c => <b>{c}</b> })}</span>
          </div>
          <FormAlert errors={errors} />
          <SheetActions label={t('confirmYes', { amount: eur(amount) })} tone="success" pending={pending} onCancel={() => setOpen(false)} />
        </form>
      </Sheet>
    </>
  );
}

export function ConfirmAllButton({ installerId, installer, sum, count }: { installerId: string; installer: string; sum: number; count: number }) {
  const t = useTranslations('cash');
  const [open, setOpen] = useState(false);
  const { errors, pending, submit } = useAction(() => confirmAllAction(installerId), () => setOpen(false));
  return (
    <>
      <button type="button" className="btn btn--success" onClick={() => setOpen(true)}>
        <Icon name="check" /> {t('confirmAll', { amount: eur(sum), name: installer })}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('confirmAllTitle', { name: installer })} sub={t('confirmAllSub', { count, amount: eur(sum) })}>
        <form onSubmit={submit} className="form">
          <div className="callout callout--info">
            <Icon name="cash" />
            <span>{t.rich('confirmAllHelp', { name: installer, amount: eur(sum), b: c => <b>{c}</b> })}</span>
          </div>
          <FormAlert errors={errors} />
          <SheetActions label={t('confirmYes', { amount: eur(sum) })} tone="success" pending={pending} onCancel={() => setOpen(false)} />
        </form>
      </Sheet>
    </>
  );
}
