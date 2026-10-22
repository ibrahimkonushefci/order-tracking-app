'use client';
/** Opening balance actions: "Vendos afatin", pause, "Mos sugjero kujtesa", "Fshij borxhin" (Pronari). */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import * as A from '@/app/(app)/actions';
import { eur } from '@/lib/money';
import { DateInput, Field, FormAlert, SheetActions, useAction } from '../forms';
import { Icon } from '../icons';
import { Sheet } from '../sheet';
import { NoRemindersToggle, PauseSheet } from './order';
import { OpeningFields, type OpeningInitial } from '@/app/(app)/debts/new/opening-form';

/** "Ndrysho borxhin" (both roles): every field, including the amount and "Kur duhej paguar?". Payments are untouched. */
export function EditOpeningButton({ id, initial, paid, today }: { id: string; initial: OpeningInitial; paid: number; today: string }) {
  const t = useTranslations('opening');
  const [open, setOpen] = useState(false);
  const { errors, pending, submit, setErrors } = useAction(f => A.editOpeningAction(id, f), () => setOpen(false));
  const close = () => {
    setOpen(false);
    setErrors({});
  };
  return (
    <>
      <button type="button" className="btn btn--secondary" onClick={() => setOpen(true)}>
        <Icon name="edit" /> {t('edit')}
      </button>
      {open ? (
        <Sheet open onClose={close} title={t('editTitle')} sub={t('editSub')}>
          <form onSubmit={submit} className="form" noValidate>
            <OpeningFields today={today} errors={errors} initial={initial} idPrefix="eob" />
            {paid > 0 ? <div className="help">{t('editPaid', { paid: eur(paid) })}</div> : null}
            <FormAlert errors={errors} />
            <SheetActions label={t('saveEdit')} pending={pending} onCancel={close} />
          </form>
        </Sheet>
      ) : null}
    </>
  );
}

export function SetDueButton({ id }: { id: string }) {
  const t = useTranslations('opening');
  const [open, setOpen] = useState(false);
  const { errors, pending, submit } = useAction(f => A.setOpeningDueAction(id, f), () => setOpen(false));
  return (
    <>
      <button type="button" className="btn btn--secondary" onClick={() => setOpen(true)}>
        <Icon name="calendar" /> {t('setDue')}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('dueTitle')} sub={t('dueSub')}>
        <form onSubmit={submit} className="form">
          <Field name="due" errors={errors}>
            <DateInput name="due" label={t('dueTitle')} />
          </Field>
          <FormAlert errors={errors} />
          <SheetActions label={t('saveDue')} pending={pending} onCancel={() => setOpen(false)} />
        </form>
      </Sheet>
    </>
  );
}

export function OpeningMoreActions({ id, name, amount, canPause, noReminders, canDelete, hasPayments, today }: { id: string; name: string; amount: number; canPause: boolean; noReminders: boolean; canDelete: boolean; hasPayments: boolean; today: string }) {
  const t = useTranslations('opening');
  const [sheet, setSheet] = useState<null | 'pause' | 'delete'>(null);
  const del = useAction(() => A.deleteOpeningAction(id), () => setSheet(null));
  return (
    <div className="actions">
      {canPause ? (
        <button type="button" className="action" onClick={() => setSheet('pause')}>
          <Icon name="pause" />
          <span className="grow">
            <span className="action__label">{t('pause')}</span>
          </span>
          <Icon name="right" className="chev" />
        </button>
      ) : null}
      <NoRemindersToggle kind="opening" id={id} value={noReminders} label={t('noReminders')} />
      {canDelete ? (
        <button type="button" className="action" onClick={() => setSheet('delete')}>
          <Icon name="trash" />
          <span className="grow">
            <span className="action__label">{t('delete')}</span>
            <span className="action__sub">{hasPayments ? t('deleteHasPayments') : t('deleteSub')}</span>
          </span>
          <Icon name="right" className="chev" />
        </button>
      ) : null}
      {sheet === 'pause' ? <PauseSheet kind="opening" id={id} today={today} onClose={() => setSheet(null)} /> : null}
      <Sheet open={sheet === 'delete'} onClose={() => setSheet(null)} title={t('deleteTitle')} sub={`${name} · ${eur(amount)}`}>
        <form onSubmit={del.submit} className="form">
          <div className="callout callout--warning">
            <Icon name="alert" />
            <span>{hasPayments ? t('deleteHasPayments') : t('deleteHelp')}</span>
          </div>
          <FormAlert errors={del.errors} />
          {del.errors.confirm ? <div className="error">{del.errors.confirm}</div> : null}
          {hasPayments ? (
            <button className="btn btn--secondary btn--lg" type="button" onClick={() => setSheet(null)}>
              {t('close')}
            </button>
          ) : (
            <SheetActions label={t('deleteYes')} tone="danger" pending={del.pending} onCancel={() => setSheet(null)} />
          )}
        </form>
      </Sheet>
    </div>
  );
}
