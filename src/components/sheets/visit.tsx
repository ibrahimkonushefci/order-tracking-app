'use client';
/**
 * Visits in the prototype's sheets: "Planifiko vizitë" / "Ndrysho vizitën" with each
 * installer's load on the chosen date and the helper box ("Punët e montuesve"), and
 * "U krye" in its four forms: measurement, repair, a project part, and the €800 call.
 */
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import * as A from '@/app/(app)/actions';
import { loadTone, definite } from '@/domain/visits';
import { addDays, MONTHS, WEEKDAYS_ON } from '@/lib/dates';
import { eur } from '@/lib/money';
import { Chips, Field, FormAlert, HolderField, MethodField, MoneyInput, SheetActions, TermField, useAction, type InstallerOpt } from '../forms';
import { Icon } from '../icons';
import { Sheet } from '../sheet';

export type VisitType = 'measure' | 'install' | 'delivery' | 'repair';
const TYPES: VisitType[] = ['measure', 'install', 'delivery', 'repair'];

/** A visit somewhere in the book, for the live load on the installer chips. */
export interface JobLite {
  id: string;
  installerId: string | null;
  date: string;
  time: string | null;
  type: VisitType;
  client: string;
  city: string;
}

export interface VisitView {
  id: string;
  type: VisitType;
  date: string;
  time: string | null;
  installerId: string | null;
  note: string;
}

/** What the visit sheets need to know about the order. */
export interface VisitOrderView {
  id: string;
  number: string;
  clientName: string;
  stage: 'new' | 'active' | 'done' | 'cancelled';
  description: string;
  /** max(0, price − paid) */
  remaining: number;
  remainingWork: string | null;
  hasMeasure: boolean;
  lastInstallerId: string | null;
  project: { quantity: number; unit: string; installed: number; unitPrice: number } | null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const first = (n: string) => n.trim().split(/\s+/)[0];

/* ───────── Planifiko / Ndrysho ───────── */

export function VisitButton({
  o,
  visit,
  installers,
  jobs,
  today,
  className,
  children,
  ariaLabel,
  date,
}: {
  o: VisitOrderView;
  visit?: VisitView;
  installers: InstallerOpt[];
  jobs: JobLite[];
  today: string;
  className: string;
  children: ReactNode;
  ariaLabel?: string;
  date?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label={ariaLabel}>
        {children}
      </button>
      {open ? <VisitSheet o={o} visit={visit} installers={installers} jobs={jobs} today={today} date={date} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function VisitSheet({ o, visit, installers, jobs, today, date: initialDate, onClose }: { o: VisitOrderView; visit?: VisitView; installers: InstallerOpt[]; jobs: JobLite[]; today: string; date?: string; onClose: () => void }) {
  const t = useTranslations('visit');
  const w = useTranslations('words');
  const [type, setType] = useState<VisitType>(visit?.type ?? (o.stage === 'new' && !o.hasMeasure ? 'measure' : 'install'));
  const [date, setDate] = useState(initialDate ?? visit?.date ?? addDays(today, 1));
  const initialTime = !visit?.time ? (visit ? 'none' : 'morning') : visit.time === 'morning' || visit.time === 'afternoon' ? visit.time : 'exact';
  const [time, setTime] = useState(initialTime);
  const [inst, setInst] = useState(visit ? (visit.installerId ?? 'none') : (o.lastInstallerId ?? installers[0]?.id ?? 'none'));
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { errors, pending, submit } = useAction(f => A.saveVisitAction(o.id, visit?.id ?? null, f), onClose);
  const remove = useAction(() => A.removeVisitAction(o.id, visit!.id), onClose);

  const jobsOf = (iid: string) => jobs.filter(j => j.installerId === iid && j.date === date && j.id !== visit?.id);
  const helper = (() => {
    if (!date) return null;
    if (inst === 'none')
      return (
        <div className="avail-help">
          <b>
            <Icon name="help" /> {t('noInstaller')}
          </b>
          <span className="muted">{t('noInstallerHelp')}</span>
        </div>
      );
    const i = installers.find(x => x.id === inst);
    if (!i) return null;
    const list = jobsOf(i.id).sort((a, b) => (a.time ?? '12:30').localeCompare(b.time ?? '12:30'));
    if (!list.length)
      return (
        <div className="avail-help avail-help--free">
          <b>
            <Icon name="check" /> {t('free', { name: i.name })}
          </b>
        </div>
      );
    const [y, m, d] = date.split('-').map(Number);
    const when = `${cap(WEEKDAYS_ON[new Date(Date.UTC(y, m - 1, d)).getUTCDay()])}, ${d} ${MONTHS[m - 1]}`;
    const at = (x: JobLite) => (!x.time ? t('noTime') : x.time === 'morning' ? cap(w('time.morning')) : x.time === 'afternoon' ? cap(w('time.afternoon')) : x.time);
    return (
      <div className={`avail-help avail-help--${loadTone(list.length)}`}>
        <b>
          <Icon name="calendar" /> {t('busy', { when, name: definite(i.name), n: list.length })}
        </b>
        <ul>
          {list.map(x => (
            <li key={x.id}>{t('busyItem', { at: at(x), type: w(`visit.${x.type}`), client: first(x.client), city: x.city })}</li>
          ))}
        </ul>
      </div>
    );
  })();

  if (confirmRemove)
    return (
      <Sheet open onClose={onClose} title={t('removeTitle')} sub={`${o.clientName} · ${o.number}`}>
        <form onSubmit={remove.submit} className="form">
          <div className="callout callout--neutral">
            <Icon name="help" />
            <span>{t('removeHelp')}</span>
          </div>
          <FormAlert errors={remove.errors} />
          <SheetActions label={t('removeYes')} tone="danger" pending={remove.pending} onCancel={() => setConfirmRemove(false)} />
        </form>
      </Sheet>
    );

  return (
    <Sheet open onClose={onClose} title={visit ? t('editTitle') : t('planTitle')} sub={`${o.clientName} · ${o.number}`}>
      <form onSubmit={submit} className="form" noValidate>
        <Field name="type" label={t('what')} errors={errors}>
          <Chips name="type" value={type} onChange={setType} options={TYPES.map(k => [k, w(`visit.${k}`)] as const)} />
        </Field>
        <Field name="date" label={t('date')} req errors={errors} htmlFor="vs-date">
          <input className="input" id="vs-date" type="date" name="date" value={date} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field name="exact" label={t('time')} opt errors={errors}>
          <Chips
            name="time"
            value={time}
            onChange={setTime}
            options={[
              ['morning', t('morning')],
              ['afternoon', t('afternoon')],
              ['exact', t('exact')],
              ['none', t('none')],
            ]}
          />
          {time === 'exact' ? <input className="input" type="time" name="exact" defaultValue={visit?.time && /^\d/.test(visit.time) ? visit.time : '08:00'} style={{ maxWidth: 160 }} aria-label={t('exact')} /> : null}
        </Field>
        <Field name="installerId" label={<>{t('installer')} <span className="opt">{t('installerLoad')}</span></>} errors={errors}>
          <div className="chips" role="radiogroup" aria-label={t('installer')}>
            {[...installers.map(i => [i.id, i.name] as const), ['none', t('noInstaller')] as const].map(([id, name]) => {
              const n = id === 'none' || !date ? null : jobsOf(id).length;
              return (
                <label className="chip" key={id}>
                  <input type="radio" name="installerId" value={id} checked={inst === id} onChange={() => setInst(id)} />
                  <span>
                    {name}
                    {n != null ? <span className={`load load--${loadTone(n)}`}>{n ? t('jobs', { n }) : t('freeShort')}</span> : null}
                  </span>
                </label>
              );
            })}
          </div>
          <div aria-live="polite">{helper}</div>
        </Field>
        <Field label={t('note')} opt htmlFor="vs-note">
          <input className="input" id="vs-note" name="note" defaultValue={visit?.note ?? ''} placeholder={o.project ? t('notePhProject') : t('notePh')} autoComplete="off" />
        </Field>
        <FormAlert errors={errors} />
        <div className="btn-row" style={{ marginTop: 4 }}>
          <button className="btn btn--primary btn--lg" type="submit" name="then" value="save" disabled={pending}>
            {t('save')}
          </button>
          <button className="btn btn--whatsapp btn--lg" type="submit" name="then" value="send" disabled={pending}>
            <Icon name="whatsapp" /> {t('saveSend')}
          </button>
        </div>
        {visit ? (
          <button type="button" className="btn btn--ghost-danger btn--sm btn--fit" onClick={() => setConfirmRemove(true)}>
            <Icon name="trash" /> {t('remove')}
          </button>
        ) : null}
      </form>
    </Sheet>
  );
}

/* ───────── U krye ───────── */

export function VisitDoneButton({ o, visit, installers, className, children }: { o: VisitOrderView; visit: VisitView; installers: InstallerOpt[]; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open ? <VisitDoneSheet o={o} visit={visit} installers={installers} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function VisitDoneSheet({ o, visit: v, installers, onClose }: { o: VisitOrderView; visit: VisitView; installers: InstallerOpt[]; onClose: () => void }) {
  const t = useTranslations('visitDone');
  const td = useTranslations('done');
  const tp = useTranslations('project');
  const w = useTranslations('words');
  const who = installers.find(i => i.id === v.installerId)?.name;
  const [pay, setPay] = useState<'no' | 'all' | 'part'>('no');
  const [holder, setHolder] = useState(v.installerId && installers.some(i => i.id === v.installerId) ? v.installerId : 'office');
  const [method, setMethod] = useState('cash');
  const [term, setTerm] = useState('week');
  const [close, setClose] = useState(true);
  const [other, setOther] = useState(false);
  const { errors, pending, submit } = useAction(f => A.completeVisitAction(o.id, v.id, f), onClose);
  const title = `${w(`visitDone.${v.type}`)}?`;
  const sub = `${o.clientName} · ${o.number}${who ? ` · ${who}` : ''}`;
  const projectPart = !!o.project && (v.type === 'install' || v.type === 'delivery');

  if (v.type === 'measure' || v.type === 'repair' || (o.project && !projectPart)) {
    return (
      <Sheet open onClose={onClose} title={title} sub={sub}>
        <form onSubmit={submit} className="form">
          {v.type === 'repair' && o.remainingWork ? (
            <label className="check">
              <input type="checkbox" name="finishRemaining" value="1" defaultChecked />
              <span>
                {t('finishRemaining')}
                <span className="check__sub">{o.remainingWork}</span>
              </span>
            </label>
          ) : null}
          <Field label={t('note')} opt htmlFor="vd-note">
            <input className="input" id="vd-note" name="note" placeholder={v.type === 'measure' ? t('notePhMeasure') : ''} autoComplete="off" />
          </Field>
          <FormAlert errors={errors} />
          <SheetActions label={t('yes')} pending={pending} onCancel={onClose} />
        </form>
      </Sheet>
    );
  }

  if (projectPart) {
    const p = o.project!;
    const payP = pay === 'part' ? 'part' : 'no';
    const setPayP = (x: 'no' | 'part') => setPay(x);
    return (
      <Sheet open onClose={onClose} title={title} sub={tp('recordSub', { description: o.description, installed: p.installed, qty: p.quantity })}>
        <form onSubmit={submit} className="form" noValidate>
          <Field name="quantity" label={t('howMany', { unit: p.unit })} req errors={errors} help={tp('perUnit', { price: eur(p.unitPrice), unit: p.unit, left: p.quantity - p.installed })} htmlFor="vd-qty">
            <input className="input input--money" id="vd-qty" name="quantity" inputMode="numeric" placeholder="0" style={{ maxWidth: 160 }} autoComplete="off" />
          </Field>
          <label className="check">
            <input type="checkbox" checked={other} onChange={e => setOther(e.target.checked)} />
            <span>
              {tp('otherValue')}
              <span className="check__sub">{tp('otherValueSub')}</span>
            </span>
          </label>
          {other ? (
            <Field name="value" label={tp('value')} errors={errors} htmlFor="m-vd-value">
              <MoneyInput name="value" id="m-vd-value" />
            </Field>
          ) : null}
          <Field label={tp('paidNow')}>
            <Chips name="pay" value={payP} onChange={setPayP} options={[['no', tp('no')], ['part', tp('yes')]]} />
          </Field>
          {payP === 'part' ? (
            <>
              <Field name="amount" label={tp('amount')} errors={errors} htmlFor="m-vd-amount">
                <MoneyInput name="amount" id="m-vd-amount" />
              </Field>
              <MethodField value={method} onChange={setMethod} />
              {method === 'cash' ? <HolderField installers={installers} value={holder} onChange={setHolder} /> : <input type="hidden" name="holder" value="office" />}
            </>
          ) : null}
          <label className="check">
            <input type="checkbox" name="finish" value="1" />
            <span>
              {tp('finished')}
              <span className="check__sub">{tp('finishedSub')}</span>
            </span>
          </label>
          <FormAlert errors={errors} />
          <SheetActions label={tp('save')} pending={pending} onCancel={onClose} />
        </form>
      </Sheet>
    );
  }

  /* The €800 call: A pagoi klienti? · Ku janë paratë? · Porosia është e kryer. */
  const rem = o.remaining;
  return (
    <Sheet open onClose={onClose} title={title} sub={sub}>
      <form onSubmit={submit} className="form" noValidate>
        {rem > 0 ? (
          <>
            <Field
              name="pay"
              label={
                <>
                  {td('paid')} <span className="muted">{td('left', { amount: eur(rem) })}</span>
                </>
              }
              errors={errors}
            >
              <Chips name="pay" value={pay} onChange={setPay} options={[['no', td('notYet')], ['all', td('all', { amount: eur(rem) })], ['part', td('part')]]} />
            </Field>
            {pay === 'part' ? (
              <Field name="amount" label={td('howMuch')} errors={errors} htmlFor="m-vd-amount">
                <MoneyInput name="amount" id="m-vd-amount" />
              </Field>
            ) : null}
            {pay !== 'no' ? <HolderField installers={installers} value={holder} onChange={setHolder} /> : null}
            {pay !== 'no' && holder === 'office' ? <MethodField value={method} onChange={setMethod} /> : null}
          </>
        ) : (
          <div className="callout callout--success">
            <Icon name="check" />
            <span>{td('allPaid')}</span>
          </div>
        )}
        <label className="check">
          <input type="checkbox" name="close" value="1" checked={close} onChange={e => setClose(e.target.checked)} />
          <span>{t('close')}</span>
        </label>
        {rem > 0 && close && pay !== 'all' ? <TermField value={term} onChange={setTerm} errors={errors} /> : null}
        <FormAlert errors={errors} />
        <SheetActions label={t('save')} pending={pending} onCancel={onClose} />
      </form>
    </Sheet>
  );
}
