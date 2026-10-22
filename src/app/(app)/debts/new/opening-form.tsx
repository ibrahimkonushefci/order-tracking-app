'use client';
/**
 * "Borxh i bartur": the owner types the notebook into the app on day 1. Only the amount and
 * "Kur duhej paguar?" are required. The same fields correct an existing line ("Ndrysho borxhin").
 */
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createOpeningAction } from '../../actions';
import { DateInput, Field, FormAlert, MoneyInput, PhoneInput, useAction } from '@/components/forms';
import { Icon } from '@/components/icons';

type Mode = 'date' | 'month' | 'unknown';

/** What an existing opening balance puts back into the fields. */
export interface OpeningInitial {
  name: string;
  phone: string;
  amount: number;
  forWhat: string;
  workDone: string;
  dueDate: string | null;
  dueApprox: boolean;
  note: string;
}

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const isMonth = (v: string) => /^\d{4}-\d{2}$/.test(v);

export function OpeningFields({ today, errors, initial, idPrefix = 'ob', dueReset }: { today: string; errors: Record<string, string>; initial?: OpeningInitial; idPrefix?: string; dueReset?: number }) {
  const t = useTranslations('openingForm');
  const [work, setWork] = useState<Mode>(initial ? (isDate(initial.workDone) ? 'date' : isMonth(initial.workDone) ? 'month' : 'unknown') : 'unknown');
  const [due, setDue] = useState<Mode | ''>(initial ? (!initial.dueDate ? 'unknown' : initial.dueApprox ? 'month' : 'date') : '');
  // "Ruaj dhe shto tjetër" resets the form; the parent bumps `dueReset` so the choices clear too.
  const [seen, setSeen] = useState(dueReset);
  if (seen !== dueReset) {
    setSeen(dueReset);
    setWork('unknown');
    setDue('');
  }
  const seg = (name: string, value: string, set: (v: Mode) => void, options: [Mode, string][]) => (
    <div className="seg">
      {options.map(([v, l]) => (
        <label key={v}>
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => set(v)} />
          <span>{l}</span>
        </label>
      ))}
    </div>
  );
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <>
      <Field name="name" label={t('name')} req errors={errors} htmlFor={id('name')}>
        <input className="input" id={id('name')} name="name" autoComplete="off" placeholder={t('namePh')} defaultValue={initial?.name} />
      </Field>
      <Field name="phone" label={t('phone')} opt errors={errors} htmlFor={id('phone')}>
        <PhoneInput id={id('phone')} value={initial?.phone} prefixLabel={t('prefix')} />
      </Field>
      <Field name="amount" label={t('amount')} req errors={errors} htmlFor={`m-${idPrefix}-amount`}>
        <MoneyInput name="amount" id={`m-${idPrefix}-amount`} defaultValue={initial?.amount} />
      </Field>
      <Field label={t('forWhat')} opt htmlFor={id('for')}>
        <input className="input" id={id('for')} name="forWhat" placeholder={t('forWhatPh')} defaultValue={initial?.forWhat} />
      </Field>
      <Field name="workDate" label={t('workDone')} opt errors={errors}>
        {seg('workMode', work, setWork, [
          ['date', t('date')],
          ['month', t('monthYear')],
          ['unknown', t('dontKnow')],
        ])}
        {work === 'date' ? <DateInput name="workDate" max={today} label={t('workDone')} defaultValue={initial && isDate(initial.workDone) ? initial.workDone : undefined} /> : null}
        {work === 'month' ? <DateInput month name="workMonth" label={t('workDone')} defaultValue={initial && isMonth(initial.workDone) ? initial.workDone : undefined} /> : null}
      </Field>
      <Field name="dueMode" label={t('due')} req errors={errors}>
        {seg('dueMode', due, setDue, [
          ['date', t('onDate')],
          ['month', t('approx')],
          ['unknown', t('dontKnow')],
        ])}
        {due === '' ? <div className="help">{t('dueHelp')}</div> : null}
        {due === 'date' ? (
          <Field name="dueDate" errors={errors} help={t('dueDateHelp')}>
            <DateInput name="dueDate" label={t('dueDate')} defaultValue={initial?.dueDate && !initial.dueApprox ? initial.dueDate : undefined} />
          </Field>
        ) : null}
        {due === 'month' ? (
          <Field name="dueMonth" errors={errors} help={t('dueMonthHelp')}>
            <DateInput month name="dueMonth" label={t('dueMonth')} defaultValue={initial?.dueDate && initial.dueApprox ? initial.dueDate.slice(0, 7) : undefined} />
          </Field>
        ) : null}
        {due === 'unknown' ? (
          <div className="callout callout--neutral">
            <Icon name="help" />
            <span>{t.rich('unknownHelp', { b: c => <b>{c}</b> })}</span>
          </div>
        ) : null}
      </Field>
      <Field label={t('note')} opt htmlFor={id('note')}>
        <textarea className="textarea" id={id('note')} name="note" placeholder={t('notePh')} defaultValue={initial?.note} />
      </Field>
    </>
  );
}

export function OpeningForm({ today }: { today: string }) {
  const t = useTranslations('openingForm');
  const form = useRef<HTMLFormElement>(null);
  const [resets, setResets] = useState(0);
  const { errors, pending, submit } = useAction(createOpeningAction, r => {
    if (!r.go) {
      // "Ruaj dhe shto tjetër": a clean form for the next notebook line.
      form.current?.reset();
      setResets(n => n + 1);
      form.current?.querySelector<HTMLInputElement>('[name=name]')?.focus();
    }
  });
  return (
    <form ref={form} className="card narrow form-page form-page--opening" onSubmit={submit} noValidate>
      <div className="card__body form">
        <OpeningFields today={today} errors={errors} dueReset={resets} />
        <FormAlert errors={errors} />
        <div className="btn-row">
          <button className="btn btn--primary" type="submit" name="then" value="list" disabled={pending}>
            {t('save')}
          </button>
          <button className="btn btn--secondary" type="submit" name="then" value="again" disabled={pending}>
            {t('saveAgain')}
          </button>
        </div>
      </div>
    </form>
  );
}
