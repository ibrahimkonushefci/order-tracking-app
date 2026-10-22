'use client';
/** Form pieces in the prototype's markup: fields, money inputs, chip radios, "Ku janë paratë?", the payment term. */
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ActionResult } from '@/app/(app)/action-result';
import { fmtDate, fmtMonth, fmtMonthShort, fmtSpelled, parseDayInput, parseMonthInput } from '@/lib/dates';
import { eur, parseEur } from '@/lib/money';
import { PHONE_CODES, phoneChars, splitPhone } from '@/lib/phone';
import { Icon } from './icons';
import { toast } from './sheet';

/**
 * Runs a server action from a form's `onSubmit`; shows field errors, the toast, and goes where the action says.
 * Not `<form action>`: React resets every uncontrolled field after a form action, which wiped what the
 * user typed whenever validation failed. Here the form is only reset when the caller asks for it.
 */
export function useAction(action: (f: FormData) => Promise<ActionResult>, onOk?: (r: ActionResult) => void) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    // A date typed so that it can't be read: say so there instead of saving without it.
    const bad = e.currentTarget.querySelector<HTMLInputElement>('.input[aria-invalid="true"]');
    if (bad) {
      bad.focus();
      bad.dispatchEvent(new Event('focusout', { bubbles: true }));
      return;
    }
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    run(new FormData(e.currentTarget, submitter));
  };
  const run = (f: FormData) =>
    start(async () => {
      const r = await action(f);
      setErrors(r.errors ?? {});
      if (!r.ok) {
        // Bring the first error into view (long forms on phones).
        requestAnimationFrame(() => document.querySelector('.has-error, .form-alert')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
        return;
      }
      toast(r.toast);
      onOk?.(r);
      if (r.go) router.push(r.go);
    });
  return { errors, pending, submit, run, setErrors };
}

export function Field({
  name,
  label,
  req,
  opt,
  errors,
  help,
  htmlFor,
  children,
  hidden,
}: {
  name?: string;
  label?: ReactNode;
  req?: boolean;
  opt?: ReactNode | true;
  errors?: Record<string, string>;
  help?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  hidden?: boolean;
}) {
  const t = useTranslations('form');
  const err = name ? errors?.[name] : undefined;
  if (hidden) return null;
  const head = (
    <>
      {label} {req ? <span className="req">*</span> : null}
      {opt ? <span className="opt">{opt === true ? t('optional') : opt}</span> : null}
    </>
  );
  return (
    <div className={`field${err ? ' has-error' : ''}`} data-f={name}>
      {label ? (
        htmlFor ? (
          <label className="label" htmlFor={htmlFor}>
            {head}
          </label>
        ) : (
          <span className="label">{head}</span>
        )
      ) : null}
      {children}
      {help ? <div className="help">{help}</div> : null}
      {err ? (
        <div className="error" role="alert">
          {err}
        </div>
      ) : null}
    </div>
  );
}

/** `onInput` for counts (quantities): anything but digits is dropped as it's typed. */
export function digitsOnly(e: FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  const v = el.value.replace(/\D/g, '');
  if (v !== el.value) el.value = v;
}

/** Keeps a field's own state in step with `form.reset()` ("Ruaj dhe shto tjetër"). */
function useOnReset(ref: RefObject<HTMLInputElement | null>, onReset: () => void) {
  const cb = useRef(onReset);
  useEffect(() => {
    cb.current = onReset;
  });
  useEffect(() => {
    const form = ref.current?.form;
    const h = () => cb.current();
    form?.addEventListener('reset', h);
    return () => form?.removeEventListener('reset', h);
  }, [ref]);
}

/** "Prefiksi" and the number (form fields `phoneCc` and `phone`); a saved number is split into both. Letters can't be typed. */
export function PhoneInput({ id, value, prefixLabel }: { id: string; value?: string | null; prefixLabel: string }) {
  const { cc, local } = splitPhone(value);
  return (
    <div className="input-group">
      <select className="select" name="phoneCc" aria-label={prefixLabel} defaultValue={cc}>
        {PHONE_CODES.map(c => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input
        className="input"
        id={id}
        name="phone"
        type="tel"
        inputMode="tel"
        placeholder="44123456"
        defaultValue={local || undefined}
        autoComplete="off"
        onInput={e => {
          const el = e.currentTarget;
          const v = phoneChars(el.value);
          if (v !== el.value) el.value = v;
        }}
      />
    </div>
  );
}

/**
 * The amount input with the € sign after it. Only digits, "," and "." can be typed; "19,350", "19.350" and "19350"
 * are the same, "1,250.50" and "10.5" have cents. What was understood shows underneath ("= 19,350€").
 */
export function MoneyInput({ name, defaultValue, id, autoFocus }: { name: string; defaultValue?: number | null; id?: string; autoFocus?: boolean }) {
  const t = useTranslations('form');
  const v = defaultValue && defaultValue > 0 ? (defaultValue / 100).toFixed(defaultValue % 100 ? 2 : 0) : '';
  const [text, setText] = useState(v);
  const ref = useRef<HTMLInputElement>(null);
  useOnReset(ref, () => setText(v));
  const cents = parseEur(text);
  // Only worth saying when the amount was typed with a separator, or can't be read.
  const echo = !text.trim() ? null : cents == null ? t('amountInvalid') : /[.,]/.test(text) ? `= ${eur(cents)}` : null;
  return (
    <>
      <div className="money-wrap">
        <input
          ref={ref}
          className="input input--money"
          id={id ?? `m-${name}`}
          name={name}
          inputMode="decimal"
          value={text}
          onChange={e => setText(e.target.value.replace(/[^\d.,\s]/g, ''))}
          autoComplete="off"
          placeholder="0"
          autoFocus={autoFocus}
        />
      </div>
      {echo ? <div className={cents == null ? 'error' : 'help help--echo'}>{echo}</div> : null}
    </>
  );
}

/**
 * A date typed day first, as "22.10.2026" (or "22/10/26", "1-6-2025"), or a month ("06.2025", "6/25") with `month`.
 * The form gets yyyy-MM-dd / yyyy-MM in a hidden field `name`; the day spelled out underneath catches mix-ups.
 * The calendar button opens the phone's own picker. Text that can't be read blocks saving (see useAction).
 */
export function DateInput({
  name,
  month,
  id,
  defaultValue,
  value,
  onChange,
  min,
  max,
  label,
}: {
  name: string;
  month?: boolean;
  id?: string;
  defaultValue?: string | null;
  value?: string;
  onChange?: (iso: string) => void;
  min?: string;
  max?: string;
  label?: string;
}) {
  const t = useTranslations('form');
  const show = (iso: string | null | undefined) => (!iso ? '' : month ? fmtMonthShort(iso) : fmtDate(iso));
  const [text, setText] = useState(show(value ?? defaultValue));
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const parse = month ? parseMonthInput : parseDayInput;
  const iso = parse(text);
  // A controlled value changed from outside (e.g. "Nesër" chips): show it.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== (iso ?? '')) setText(show(value));
  }
  useOnReset(ref, () => {
    setText(show(defaultValue));
    setTouched(false);
  });
  const set = (v: string) => {
    setText(v);
    const next = parse(v);
    if (onChange && (next ?? '') !== (value ?? '')) onChange(next ?? '');
  };
  const err = !text.trim()
    ? null
    : !iso
      ? t(month ? 'monthInvalid' : 'dateInvalid')
      : min && iso < min
        ? t('dateMin', { date: fmtDate(min) })
        : max && iso > max
          ? t('dateMax', { date: fmtDate(max) })
          : null;
  return (
    <>
      <div className={month ? undefined : 'date-wrap'}>
        <input
          ref={ref}
          className="input"
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder={month ? t('monthPh') : t('datePh')}
          aria-label={label}
          aria-invalid={err ? true : undefined}
          value={text}
          onChange={e => set(e.target.value.replace(/[^\d./\-\s]/g, ''))}
          onBlur={() => {
            setTouched(true);
            // "1/7/25" is tidied to "01.07.2025", the way the app shows dates.
            if (iso) setText(show(iso));
          }}
        />
        {month ? null : (
          <>
            <button
              type="button"
              className="date-wrap__btn"
              aria-label={t('pickDate')}
              onClick={() => {
                const p = picker.current;
                if (!p) return;
                p.value = iso ?? '';
                try {
                  p.showPicker();
                } catch {
                  p.focus();
                }
              }}
            >
              <Icon name="calendar" />
            </button>
            <input
              ref={picker}
              type="date"
              className="date-wrap__picker"
              tabIndex={-1}
              aria-hidden
              min={min}
              max={max}
              onChange={e => {
                if (e.target.value) set(fmtDate(e.target.value));
              }}
            />
          </>
        )}
      </div>
      <input type="hidden" name={name} value={iso ?? (text.trim() ? 'invalid' : '')} />
      {err && touched ? (
        <div className="error" role="alert">
          {err}
        </div>
      ) : iso && !err ? (
        <div className="help help--echo">{month ? fmtMonth(iso) : fmtSpelled(iso)}</div>
      ) : null}
    </>
  );
}

/** Chip radios (selected = solid brand fill, from the v10 CSS). Controlled when `onChange` is given. */
export function Chips<V extends string>({
  name,
  options,
  value,
  onChange,
  label,
}: {
  name: string;
  options: readonly (readonly [V, ReactNode])[];
  value?: V;
  onChange?: (v: V) => void;
  label?: string;
}) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <label key={v} className="chip">
          <input
            type="radio"
            name={name}
            value={v}
            {...(onChange ? { checked: value === v, onChange: () => onChange(v) } : { defaultChecked: value === v })}
          />
          <span>{l}</span>
        </label>
      ))}
    </div>
  );
}

export interface InstallerOpt {
  id: string;
  name: string;
  /** Where the visit's "Ruaj dhe dërgo" goes; WhatsApp when not given. */
  channel?: 'whatsapp' | 'viber';
}

/** "Ku janë paratë?": [Te Driton] [Te Faton] … [Në zyrë]. */
export function HolderField({ installers, value, onChange }: { installers: InstallerOpt[]; value: string; onChange: (v: string) => void }) {
  const t = useTranslations('form');
  return (
    <Field label={t('where')}>
      <Chips name="holder" value={value} onChange={onChange} options={[...installers.map(i => [i.id, t('withInstaller', { name: i.name })] as const), ['office', t('inOffice')] as const]} />
      <div className="help">{value === 'office' ? t('inOfficeHelp') : t('heldHelp')}</div>
    </Field>
  );
}

export const METHOD_KEYS = ['cash', 'bank', 'card'] as const;

export function MethodField({ value, onChange, label }: { value: string; onChange: (v: (typeof METHOD_KEYS)[number]) => void; label?: string }) {
  const t = useTranslations('form');
  const w = useTranslations('words');
  return (
    <Field label={label ?? t('method')}>
      <Chips name="method" value={value as 'cash'} onChange={onChange} options={METHOD_KEYS.map(k => [k, w(`method.${k}`)] as const)} />
    </Field>
  );
}

/** "Kur paguan pjesën tjetër?": Brenda javës · Brenda muajit · Në një datë · Nuk e di. */
export function TermField({
  value,
  onChange,
  withDate = true,
  errors,
  label,
  dateDefault,
}: {
  value: string;
  onChange: (v: string) => void;
  withDate?: boolean;
  errors?: Record<string, string>;
  label?: string;
  dateDefault?: string | null;
}) {
  const t = useTranslations('form');
  const w = useTranslations('words');
  const keys = (['week', 'month', 'date', 'unknown'] as const).filter(k => withDate || k !== 'date');
  return (
    <Field name="term" label={label ?? t('when')} errors={errors}>
      <Chips name="term" value={value as 'week'} onChange={onChange} options={keys.map(k => [k, w(`term.${k}`)] as const)} />
      {withDate && value === 'date' ? <DateInput name="termDate" label={t('termDate')} defaultValue={dateDefault} /> : null}
      {value === 'unknown' ? <div className="help">{t('unknownHelp')}</div> : null}
    </Field>
  );
}

/** Reason chips that fill the text field (cancel, delete, pause). */
export function ReasonField({ name = 'reason', label, chips, required, errors, placeholder }: { name?: string; label: string; chips: string[]; required?: boolean; errors?: Record<string, string>; placeholder?: string }) {
  const [v, setV] = useState('');
  return (
    <Field name={name} label={label} req={required} opt={!required || undefined} errors={errors}>
      {chips.length ? (
        <div className="chips">
          {chips.map(c => (
            <button key={c} type="button" className="chip" aria-pressed={v === c} onClick={() => setV(c)}>
              {c}
            </button>
          ))}
        </div>
      ) : null}
      <input className="input" name={name} value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} autoComplete="off" />
    </Field>
  );
}

export function FormAlert({ errors }: { errors: Record<string, string> }) {
  const t = useTranslations('errors');
  const keys = Object.keys(errors);
  if (!keys.length) return null;
  return (
    <div className="callout callout--danger form-alert" role="alert">
      <Icon name="alert" />
      <span>{errors._ ?? t('invalid')}</span>
    </div>
  );
}

/** Save + Anulo at the bottom of a sheet. */
export function SheetActions({ label, tone = 'primary', pending, onCancel, children }: { label: ReactNode; tone?: string; pending?: boolean; onCancel: () => void; children?: ReactNode }) {
  const t = useTranslations('ui');
  return (
    <div className="btn-row" style={{ marginTop: 4 }}>
      <button className={`btn btn--${tone} btn--lg`} type="submit" disabled={pending}>
        {pending ? t('saving') : label}
      </button>
      <button className="btn btn--secondary btn--lg" type="button" onClick={onCancel}>
        {t('cancel')}
      </button>
      {children}
    </div>
  );
}
