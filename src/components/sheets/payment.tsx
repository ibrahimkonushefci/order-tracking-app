'use client';
/**
 * "Regjistro pagesë" / "Ndrysho pagesën" / "Fshij pagesën?": amount, method, date, note,
 * and for cash where the money is now: "Në zyrë" or "Te montuesi (Driton)".
 */
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { addPaymentAction, deletePaymentAction, editPaymentAction } from '@/app/(app)/actions';
import { fmtDate } from '@/lib/dates';
import { eur } from '@/lib/money';
import { DateInput, Field, FormAlert, HolderField, MethodField, MoneyInput, ReasonField, SheetActions, useAction, type InstallerOpt } from '../forms';
import { Icon } from '../icons';
import { Sheet } from '../sheet';

export interface PaymentLite {
  id: string;
  amount: number;
  method: string;
  heldBy: string | null;
  date: string;
  note: string;
}

export function PaymentSheet({
  open,
  onClose,
  kind,
  recordId,
  payment,
  suggest,
  due,
  installers,
  canDelete,
  today,
}: {
  open: boolean;
  onClose: () => void;
  kind: 'order' | 'opening';
  recordId: string;
  payment?: PaymentLite | null;
  suggest: number;
  /** "Për t'u paguar: €X" under the title. */
  due: number;
  installers: InstallerOpt[];
  canDelete: boolean;
  today: string;
}) {
  const t = useTranslations('payment');
  const [mode, setMode] = useState<'edit' | 'delete'>('edit');
  const [method, setMethod] = useState(payment?.method ?? 'cash');
  const [holder, setHolder] = useState(payment?.heldBy ?? 'office');
  const close = () => {
    setMode('edit');
    onClose();
  };
  const save = useAction(f => (payment ? editPaymentAction(payment.id, f) : addPaymentAction(kind, recordId, f)), close);
  const del = useAction(f => deletePaymentAction(payment!.id, f), close);

  if (mode === 'delete' && payment)
    return (
      <Sheet open={open} onClose={close} title={t('deleteTitle')} sub={`${eur(payment.amount)} · ${fmtDate(payment.date)}`}>
        <form onSubmit={del.submit} className="form">
          <div className="callout callout--neutral">
            <Icon name="help" />
            <span>{t('deleteHelp')}</span>
          </div>
          <ReasonField label={t('why')} chips={[t('r1'), t('r2'), t('r3'), t('r4')]} errors={del.errors} />
          <FormAlert errors={del.errors} />
          <SheetActions label={t('delete')} tone="danger" pending={del.pending} onCancel={close} />
        </form>
      </Sheet>
    );

  return (
    <Sheet
      open={open}
      onClose={close}
      title={payment ? t('editTitle') : t('title')}
      sub={payment ? t('editSub', { amount: eur(payment.amount), date: fmtDate(payment.date) }) : t('sub', { amount: eur(due) })}
    >
      <form onSubmit={save.submit} className="form">
        <Field name="amount" label={t('amount')} req errors={save.errors} htmlFor="m-amount">
          <MoneyInput name="amount" defaultValue={payment?.amount ?? suggest} />
        </Field>
        <MethodField value={method} onChange={setMethod} />
        {method === 'cash' ? <HolderField installers={installers} value={holder} onChange={setHolder} /> : <input type="hidden" name="holder" value="office" />}
        <Field name="date" label={t('date')} errors={save.errors} htmlFor="p-date">
          <DateInput id="p-date" name="date" defaultValue={payment?.date ?? today} max={today} />
        </Field>
        <Field label={t('note')} opt htmlFor="p-note">
          <input className="input" id="p-note" name="note" defaultValue={payment?.note ?? ''} autoComplete="off" placeholder={t('notePh')} />
        </Field>
        <FormAlert errors={save.errors} />
        <SheetActions label={payment ? t('saveEdit') : t('save')} pending={save.pending} onCancel={close} />
        {payment ? (
          canDelete ? (
            <button type="button" className="btn btn--ghost-danger btn--sm btn--fit" onClick={() => setMode('delete')}>
              <Icon name="trash" /> {t('delete')}
            </button>
          ) : (
            <p className="xs subtle" style={{ margin: 0 }}>
              {t('ownerOnly')}
            </p>
          )
        ) : null}
      </form>
    </Sheet>
  );
}

/** A button that opens the payment sheet (new payment, or editing one). */
export function PaymentButton({ className, children, ...props }: Omit<Parameters<typeof PaymentSheet>[0], 'open' | 'onClose'> & { className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('payment');
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label={props.payment ? t('editTitle') : undefined}>
        {children}
      </button>
      {open ? <PaymentSheet {...props} open onClose={() => setOpen(false)} /> : null}
    </>
  );
}
