'use client';
/**
 * Order detail interactions, in the prototype's sheets: the three-stage stepper,
 * "E kryer" (the payment and the term in one sheet), "Shëno montim", "Projekti
 * përfundoi", moving back, the payment term, pauses, remaining work, Ndrysho, Anulo, Fshij.
 */
import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as A from '@/app/(app)/actions';
import { addDays } from '@/lib/dates';
import { eur } from '@/lib/money';
import { Chips, Field, FormAlert, HolderField, MethodField, MoneyInput, PhoneInput, ReasonField, SheetActions, TermField, useAction, type InstallerOpt } from '../forms';
import { Icon, type IconName } from '../icons';
import { Sheet, toast } from '../sheet';

export interface OrderView {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  productType: string;
  description: string;
  price: number;
  city: string;
  directions: string;
  internalNote: string;
  stage: 'new' | 'active' | 'done' | 'cancelled';
  doneAt: string | null;
  payTerm: string | null;
  dueDate: string | null;
  /** max(0, price − paid) */
  remaining: number;
  owed: number;
  earnedLeft: number;
  project: { quantity: number; unit: string; installed: number; unitPrice: number; term: string } | null;
}

type Labels = Record<'new' | 'active' | 'done', string>;

/* ───────── generic: a button that opens one sheet ───────── */

function SheetButton({ className, label, children, ariaLabel }: { className: string; label: ReactNode; ariaLabel?: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label={ariaLabel}>
        {label}
      </button>
      {open ? children(() => setOpen(false)) : null}
    </>
  );
}

/* ───────── The stepper ───────── */

const STEP_ICON: Record<'new' | 'active' | 'done', IconName> = { new: 'filePlus', active: 'tool', done: 'flag' };
const STAGES = ['new', 'active', 'done'] as const;

export function StageControl({ o, labels, installers }: { o: OrderView; labels: Labels; installers: InstallerOpt[] }) {
  const t = useTranslations('order');
  const router = useRouter();
  const [sheet, setSheet] = useState<null | 'done' | 'finish' | { back: 'new' | 'active' }>(null);
  const [pending, start] = useTransition();
  const ci = STAGES.indexOf(o.stage as 'new');
  const go = (k: (typeof STAGES)[number]) => {
    const i = STAGES.indexOf(k);
    if (i < ci) return setSheet({ back: k as 'new' | 'active' });
    if (k === 'done') return setSheet(o.project ? 'finish' : 'done');
    start(async () => {
      const r = await A.setStageAction(o.id, k as 'active');
      if (r.ok) router.refresh();
      else toast(r.errors?._);
    });
  };
  return (
    <>
      <div className="stepper3" role="group" aria-label={t('stage')} aria-busy={pending}>
        {STAGES.map((k, i) => {
          const cls = i < ci ? 'is-past' : i === ci ? 'is-current' : 'is-future';
          return (
            <span key={k} style={{ display: 'contents' }}>
              <button className={`st st--${k} ${cls}`} type="button" aria-current={i === ci ? 'step' : undefined} onClick={i === ci ? undefined : () => go(k)} disabled={pending}>
                <span className="st__node">
                  <Icon name={i < ci || (k === 'done' && i === ci) ? 'check' : STEP_ICON[k]} />
                </span>
                <span className="st__label">{labels[k]}</span>
              </button>
              {i < 2 ? (
                <span
                  className={`st__line${i < ci ? ' is-filled' : ''}`}
                  style={{ ['--from' as string]: `var(--stage-${k})`, ['--to' as string]: `var(--stage-${STAGES[i + 1]})` }}
                />
              ) : null}
            </span>
          );
        })}
      </div>
      {sheet === 'done' ? <DoneSheet o={o} labels={labels} installers={installers} onClose={() => setSheet(null)} /> : null}
      {sheet === 'finish' ? <FinishSheet o={o} onClose={() => setSheet(null)} /> : null}
      {sheet && typeof sheet === 'object' ? <StageBackSheet o={o} to={sheet.back} labels={labels} onClose={() => setSheet(null)} /> : null}
    </>
  );
}

/* ───────── "E kryer" for a normal order (the 800€ call, without the visit) ───────── */

export function DoneSheet({ o, labels, installers, onClose }: { o: OrderView; labels: Labels; installers: InstallerOpt[]; onClose: () => void }) {
  const t = useTranslations('done');
  const [pay, setPay] = useState<'no' | 'all' | 'part'>('no');
  const [holder, setHolder] = useState('office');
  const [method, setMethod] = useState('cash');
  const [term, setTerm] = useState('week');
  const { errors, pending, submit } = useAction(f => A.markDoneAction(o.id, f), onClose);
  const rem = o.remaining;
  return (
    <Sheet open onClose={onClose} title={t('title', { done: labels.done })} sub={`${o.clientName} · ${o.number}`}>
      <form onSubmit={submit} className="form">
        {rem > 0 ? (
          <>
            <Field name="pay" label={<>{t('paid')} <span className="muted">{t('left', { amount: eur(rem) })}</span></>} errors={errors}>
              <Chips name="pay" value={pay} onChange={setPay} options={[['no', t('notYet')], ['all', t('all', { amount: eur(rem) })], ['part', t('part')]]} />
            </Field>
            {pay === 'part' ? (
              <Field name="amount" label={t('howMuch')} errors={errors} htmlFor="m-amount">
                <MoneyInput name="amount" />
              </Field>
            ) : null}
            {pay !== 'no' ? <HolderField installers={installers} value={holder} onChange={setHolder} /> : null}
            {pay !== 'no' && holder === 'office' ? <MethodField value={method} onChange={setMethod} /> : null}
            {pay !== 'all' ? <TermField value={term} onChange={setTerm} errors={errors} /> : null}
          </>
        ) : (
          <div className="callout callout--success">
            <Icon name="check" />
            <span>{t('allPaid')}</span>
          </div>
        )}
        <FormAlert errors={errors} />
        <SheetActions label={t('save')} pending={pending} onCancel={onClose} />
      </form>
    </Sheet>
  );
}

/* ───────── Projects ───────── */

export function FinishSheet({ o, onClose }: { o: OrderView; onClose: () => void }) {
  const t = useTranslations('project');
  const w = useTranslations('words');
  const { errors, pending, submit } = useAction(() => A.finishProjectAction(o.id), onClose);
  const p = o.project!;
  return (
    <Sheet open onClose={onClose} title={t('finishTitle')} sub={o.description}>
      <form onSubmit={submit} className="form">
        <div className="callout callout--info">
          <Icon name="building" />
          <span>{t('finishHelp', { installed: p.installed, qty: p.quantity, unit: p.unit, rest: eur(o.earnedLeft), term: w(`term.${p.term as 'month'}`).toLowerCase() })}</span>
        </div>
        <FormAlert errors={errors} />
        <SheetActions label={t('finishYes')} pending={pending} onCancel={onClose} />
      </form>
    </Sheet>
  );
}

export function PartButton({ o, installers, today }: { o: OrderView; installers: InstallerOpt[]; today: string }) {
  const t = useTranslations('project');
  return (
    <SheetButton
      className="btn btn--soft btn--block"
      label={
        <>
          <Icon name="plus" /> {t('record')}
        </>
      }
    >
      {close => <PartSheet o={o} installers={installers} today={today} onClose={close} />}
    </SheetButton>
  );
}

function PartSheet({ o, installers, today, onClose }: { o: OrderView; installers: InstallerOpt[]; today: string; onClose: () => void }) {
  const t = useTranslations('project');
  const [inst, setInst] = useState(installers[0]?.id ?? '');
  const [pay, setPay] = useState<'no' | 'part'>('no');
  const [method, setMethod] = useState('bank');
  const [holder, setHolder] = useState('office');
  const [other, setOther] = useState(false);
  const { errors, pending, submit } = useAction(f => A.recordPartAction(o.id, f), onClose);
  const p = o.project!;
  return (
    <Sheet open onClose={onClose} title={t('record')} sub={t('recordSub', { description: o.description, installed: p.installed, qty: p.quantity })}>
      <form onSubmit={submit} className="form">
        <Field name="quantity" label={t('howMany', { unit: p.unit })} req errors={errors} help={t('perUnit', { price: eur(p.unitPrice), unit: p.unit, left: p.quantity - p.installed })} htmlFor="s-qty">
          <input className="input input--money" id="s-qty" name="quantity" inputMode="numeric" placeholder="0" style={{ maxWidth: 160 }} autoComplete="off" />
        </Field>
        <Field name="date" label={t('date')} errors={errors} htmlFor="s-date">
          <input className="input" id="s-date" type="date" name="date" defaultValue={today} max={today} />
        </Field>
        <Field label={t('installer')}>
          <Chips name="installerId" value={inst} onChange={setInst} options={installers.map(i => [i.id, i.name] as const)} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={other} onChange={e => setOther(e.target.checked)} />
          <span>
            {t('otherValue')}
            <span className="check__sub">{t('otherValueSub')}</span>
          </span>
        </label>
        {other ? (
          <Field name="value" label={t('value')} errors={errors} htmlFor="m-value">
            <MoneyInput name="value" />
          </Field>
        ) : null}
        <Field label={t('paidNow')}>
          <Chips name="pay" value={pay} onChange={setPay} options={[['no', t('no')], ['part', t('yes')]]} />
        </Field>
        {pay === 'part' ? (
          <>
            <Field name="amount" label={t('amount')} errors={errors} htmlFor="m-amount">
              <MoneyInput name="amount" />
            </Field>
            <MethodField value={method} onChange={setMethod} />
            {method === 'cash' ? <HolderField installers={installers} value={holder} onChange={setHolder} /> : <input type="hidden" name="holder" value="office" />}
          </>
        ) : null}
        <label className="check">
          <input type="checkbox" name="finish" value="1" />
          <span>
            {t('finished')}
            <span className="check__sub">{t('finishedSub')}</span>
          </span>
        </label>
        <FormAlert errors={errors} />
        <SheetActions label={t('save')} pending={pending} onCancel={onClose} />
      </form>
    </Sheet>
  );
}

/* ───────── Moving back ───────── */

function StageBackSheet({ o, to, labels, onClose }: { o: OrderView; to: 'new' | 'active'; labels: Labels; onClose: () => void }) {
  const t = useTranslations('order');
  const { errors, pending, submit } = useAction(() => A.setStageAction(o.id, to), onClose);
  return (
    <Sheet open onClose={onClose} title={t('backTitle', { stage: labels[to] })} sub={`${o.number} · ${o.clientName}`}>
      <form onSubmit={submit} className="form">
        {o.stage === 'done' ? (
          <div className="callout callout--warning">
            <Icon name="alert" />
            <span>{t('backHelp')}</span>
          </div>
        ) : null}
        <FormAlert errors={errors} />
        <SheetActions label={t('backYes')} pending={pending} onCancel={onClose} />
      </form>
    </Sheet>
  );
}

/* ───────── "Ndrysho afatin" ───────── */

export function TermButton({ o }: { o: OrderView }) {
  const t = useTranslations('order');
  return (
    <SheetButton className="btn btn--ghost btn--sm" label={t('changeTerm')}>
      {close => <TermSheet o={o} onClose={close} />}
    </SheetButton>
  );
}

function TermSheet({ o, onClose }: { o: OrderView; onClose: () => void }) {
  const t = useTranslations('order');
  const proj = !!o.project;
  const [term, setTerm] = useState(proj ? o.project!.term : (o.payTerm ?? 'week'));
  const { errors, pending, submit } = useAction(f => A.setTermAction(o.id, f), onClose);
  return (
    <Sheet open onClose={onClose} title={proj ? t('termTitleProject') : t('termTitle')} sub={proj ? t('termSubProject') : t('termSub', { date: o.doneAt ? o.doneAt.split('-').reverse().join('.') : '' })}>
      <form onSubmit={submit} className="form">
        <TermField value={term} onChange={setTerm} withDate={!proj} errors={errors} dateDefault={o.payTerm === 'date' ? o.dueDate : null} label={proj ? t('eachPart') : undefined} />
        <FormAlert errors={errors} />
        <SheetActions label={t('save')} pending={pending} onCancel={onClose} />
      </form>
    </Sheet>
  );
}

/* ───────── Pause / unpause (orders and opening balances) ───────── */

export function PauseSheet({ kind, id, today, onClose }: { kind: 'order' | 'opening'; id: string; today: string; onClose: () => void }) {
  const t = useTranslations('pause');
  const { errors, pending, submit } = useAction(f => A.pauseAction(kind, id, f), onClose);
  return (
    <Sheet open onClose={onClose} title={t('title')} sub={t('sub')}>
      <form onSubmit={submit} className="form">
        <Field name="until" label={t('until')} req errors={errors} htmlFor="pz-until">
          <input className="input" id="pz-until" type="date" name="until" min={addDays(today, 1)} defaultValue={addDays(today, 14)} />
        </Field>
        <ReasonField label={t('reason')} chips={[t('r1'), t('r2'), t('r3')]} required errors={errors} />
        <FormAlert errors={errors} />
        <SheetActions label={t('save')} pending={pending} onCancel={onClose} />
      </form>
    </Sheet>
  );
}

export function UnpauseButton({ kind, id }: { kind: 'order' | 'opening'; id: string }) {
  const t = useTranslations('pause');
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await A.unpauseAction(kind, id);
          router.refresh();
        })
      }
    >
      {t('remove')}
    </button>
  );
}

/* ───────── Remaining work ───────── */

export function ClearRemainingButton({ id }: { id: string }) {
  const t = useTranslations('remaining');
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn--secondary btn--sm btn--fit"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await A.clearRemainingAction(id);
          if (r.ok) toast(t('cleared'));
          router.refresh();
        })
      }
    >
      <Icon name="check" /> {t('clear')}
    </button>
  );
}

function RemainingSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useTranslations('remaining');
  const { errors, pending, submit } = useAction(f => A.remainingWorkAction(id, f), onClose);
  return (
    <Sheet open onClose={onClose} title={t('title')} sub={t('sub')}>
      <form onSubmit={submit} className="form">
        <Field name="note" label={t('what')} req errors={errors} htmlFor="rw-note">
          <textarea className="textarea" id="rw-note" name="note" />
        </Field>
        <label className="check">
          <input type="checkbox" name="pause" value="1" defaultChecked />
          <span>{t('pause')}</span>
        </label>
        <FormAlert errors={errors} />
        <SheetActions label={t('save')} pending={pending} onCancel={onClose} />
      </form>
    </Sheet>
  );
}

/* ───────── "Më shumë veprime" ───────── */

function Action({ icon, label, sub, onClick }: { icon: IconName; label: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" className="action" onClick={onClick}>
      <Icon name={icon} />
      <span className="grow">
        <span className="action__label">{label}</span>
        {sub ? <span className="action__sub">{sub}</span> : null}
      </span>
      <Icon name="right" className="chev" />
    </button>
  );
}

export function OrderMoreActions({
  o,
  canPause,
  canRemaining,
  canDelete,
  hasPayments,
  products,
  cities,
  today,
}: {
  o: OrderView;
  canPause: boolean;
  canRemaining: boolean;
  /** Pronari: "Fshij porosinë" shows; with active payments it only explains why it can't. */
  canDelete: boolean;
  hasPayments: boolean;
  products: string[];
  cities: string[];
  today: string;
}) {
  const t = useTranslations('more');
  const [sheet, setSheet] = useState<null | 'edit' | 'pause' | 'remaining' | 'cancel' | 'delete'>(null);
  const close = () => setSheet(null);
  return (
    <div className="actions">
      <Action icon="edit" label={t('edit')} sub={t('editSub')} onClick={() => setSheet('edit')} />
      {canPause ? <Action icon="pause" label={t('pause')} sub={t('pauseSub')} onClick={() => setSheet('pause')} /> : null}
      {canRemaining ? <Action icon="tool" label={t('remaining')} onClick={() => setSheet('remaining')} /> : null}
      {o.stage !== 'cancelled' ? <Action icon="x" label={t('cancel')} sub={t('cancelSub')} onClick={() => setSheet('cancel')} /> : null}
      {canDelete ? <Action icon="trash" label={t('delete')} sub={hasPayments ? t('deleteHasPayments') : t('deleteSub')} onClick={() => setSheet('delete')} /> : null}
      {sheet === 'edit' ? <EditOrderSheet o={o} products={products} cities={cities} onClose={close} /> : null}
      {sheet === 'pause' ? <PauseSheet kind="order" id={o.id} today={today} onClose={close} /> : null}
      {sheet === 'remaining' ? <RemainingSheet id={o.id} onClose={close} /> : null}
      {sheet === 'cancel' ? <CancelSheet o={o} onClose={close} /> : null}
      {sheet === 'delete' ? <DeleteOrderSheet o={o} hasPayments={hasPayments} onClose={close} /> : null}
    </div>
  );
}

function CancelSheet({ o, onClose }: { o: OrderView; onClose: () => void }) {
  const t = useTranslations('more');
  const { errors, pending, submit } = useAction(f => A.cancelOrderAction(o.id, f), onClose);
  return (
    <Sheet open onClose={onClose} title={t('cancelTitle')} sub={o.number}>
      <form onSubmit={submit} className="form">
        <div className="callout callout--neutral">
          <Icon name="help" />
          <span>{t('cancelHelp')}</span>
        </div>
        <ReasonField label={t('reason')} chips={[t('c1'), t('c2')]} errors={errors} />
        <FormAlert errors={errors} />
        <SheetActions label={t('cancelYes')} tone="danger" pending={pending} onCancel={onClose} />
      </form>
    </Sheet>
  );
}

function DeleteOrderSheet({ o, hasPayments, onClose }: { o: OrderView; hasPayments: boolean; onClose: () => void }) {
  const t = useTranslations('more');
  const { errors, pending, submit } = useAction(() => A.deleteOrderAction(o.id), onClose);
  return (
    <Sheet open onClose={onClose} title={t('deleteTitle')} sub={o.number}>
      <form onSubmit={submit} className="form">
        <div className="callout callout--warning">
          <Icon name="alert" />
          <span>{hasPayments ? t('deleteHasPayments') : t('deleteHelp')}</span>
        </div>
        <FormAlert errors={errors} />
        {errors.confirm ? <div className="error">{errors.confirm}</div> : null}
        {hasPayments ? (
          <button className="btn btn--secondary btn--lg" type="button" onClick={onClose}>
            {t('close')}
          </button>
        ) : (
          <SheetActions label={t('deleteYes')} tone="danger" pending={pending} onCancel={onClose} />
        )}
      </form>
    </Sheet>
  );
}

export function RestoreButton({ id }: { id: string }) {
  const t = useTranslations('more');
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn--secondary btn--sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await A.restoreOrderAction(id);
          router.refresh();
        })
      }
    >
      {t('restore')}
    </button>
  );
}

/* ───────── Ndrysho porosinë ───────── */

const UNITS = ['copë', 'm²', 'banesa'] as const;

function EditOrderSheet({ o, products, cities, onClose }: { o: OrderView; products: string[]; cities: string[]; onClose: () => void }) {
  const t = useTranslations('edit');
  const tn = useTranslations('newOrder');
  const w = useTranslations('words');
  const [product, setProduct] = useState(o.productType);
  const [project, setProject] = useState(!!o.project);
  const [unit, setUnit] = useState(o.project?.unit ?? 'copë');
  const [term, setTerm] = useState(o.project?.term ?? 'month');
  const { errors, pending, submit } = useAction(f => A.editOrderAction(o.id, f), onClose);
  const types = [...new Set([...products, o.productType])];
  return (
    <Sheet open onClose={onClose} title={t('title')} sub={t('sub', { number: o.number })}>
      <form onSubmit={submit} className="form">
        <Field name="name" label={tn('client')} errors={errors} htmlFor="e-name">
          <input className="input" id="e-name" name="name" defaultValue={o.clientName} autoComplete="off" />
        </Field>
        <Field name="phone" label={tn('phone')} errors={errors} htmlFor="e-phone">
          <PhoneInput id="e-phone" value={o.clientPhone} prefixLabel={tn('prefix')} />
        </Field>
        <Field label={tn('product')}>
          <Chips name="productType" value={product} onChange={setProduct} options={types.map(x => [x, x] as const)} />
          <input className="input" name="description" defaultValue={o.description} aria-label={tn('description')} />
        </Field>
        <Field name="price" label={o.project ? t('contract') : tn('price')} errors={errors} htmlFor="m-price">
          <MoneyInput name="price" defaultValue={o.price} />
        </Field>
        <Field label={t('priceNote')} opt htmlFor="e-pn">
          <input className="input" id="e-pn" name="priceNote" placeholder={t('priceNotePh')} autoComplete="off" />
        </Field>
        <Field label={tn('city')} htmlFor="e-city">
          <select className="select" id="e-city" name="city" defaultValue={o.city}>
            {[...new Set([o.city, ...cities].filter(Boolean))].map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <textarea className="textarea" name="directions" aria-label={tn('directions')} defaultValue={o.directions} />
        </Field>
        <Field label={tn('note')} htmlFor="e-note">
          <textarea className="textarea" id="e-note" name="internalNote" defaultValue={o.internalNote} style={{ minHeight: 64 }} />
        </Field>
        {!o.project ? (
          <label className="check">
            <input type="checkbox" name="project" value="1" checked={project} onChange={e => setProject(e.target.checked)} />
            <span>{tn('projectSwitch')}</span>
          </label>
        ) : (
          <input type="hidden" name="project" value="1" />
        )}
        {project ? (
          <div className="form">
            <Field name="quantity" label={tn('quantity')} req errors={errors} help={tn('quantityHelp')} htmlFor="e-qty">
              <div className="row row--wrap">
                <input className="input" id="e-qty" name="quantity" inputMode="numeric" defaultValue={o.project?.quantity ?? ''} style={{ maxWidth: 120 }} />
                <Chips name="unit" value={unit} onChange={setUnit} options={UNITS.map(u => [u, u] as const)} />
              </div>
            </Field>
            <Field label={tn('eachPart')} help={tn('eachPartHelp')}>
              <Chips name="projectPayTerm" value={term} onChange={setTerm} options={(['week', 'month', 'unknown'] as const).map(k => [k, w(`term.${k}`)] as const)} />
            </Field>
          </div>
        ) : null}
        <FormAlert errors={errors} />
        <SheetActions label={t('save')} pending={pending} onCancel={onClose} />
      </form>
    </Sheet>
  );
}

/* ───────── Client: "Mos sugjero kujtesa për borxh" ───────── */

export function NoRemindersToggle({ kind, id, value, label }: { kind: 'client' | 'opening'; id: string; value: boolean; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState(value);
  return (
    <label className={kind === 'opening' ? 'action' : 'check'}>
      <input
        type="checkbox"
        checked={on}
        disabled={pending}
        style={kind === 'opening' ? { width: 20, height: 20 } : undefined}
        onChange={e => {
          const v = e.target.checked;
          setOn(v);
          start(async () => {
            const r = kind === 'client' ? await A.clientNoRemindersAction(id, v) : await A.openingNoRemindersAction(id, v);
            if (!r.ok) setOn(!v);
            router.refresh();
          });
        }}
      />
      {kind === 'opening' ? (
        <span className="grow">
          <span className="action__label">{label}</span>
        </span>
      ) : (
        label
      )}
    </label>
  );
}

/* ───────── "Montimet e kryera": correcting a recorded part ───────── */

export interface PartView {
  id: string;
  quantity: number;
  date: string;
  installerId: string | null;
  /** The override, or null when it is quantity × unit price. */
  value: number | null;
}

/** A part that was a planned visit marked done: "Nuk u krye" plans it again on `date`. */
export interface PartPlanned {
  date: string;
  /** Payments recorded that day, listed (never changed) when it is reopened. */
  payments: string[];
}

type PartEditProps = { o: OrderView; part: PartView; installers: InstallerOpt[]; today: string; canDelete: boolean; planned?: PartPlanned };

export function PartEditButton(props: PartEditProps) {
  const t = useTranslations('project');
  return (
    <SheetButton className="btn btn--ghost btn--sm" ariaLabel={t('editTitle')} label={<><Icon name="edit" /> {t('edit')}</>}>
      {close => <PartEditSheet {...props} onClose={close} />}
    </SheetButton>
  );
}

function PartEditSheet({ o, part, installers, today, canDelete, planned, onClose }: PartEditProps & { onClose: () => void }) {
  const t = useTranslations('project');
  const p = o.project!;
  const [inst, setInst] = useState(part.installerId ?? '');
  const [other, setOther] = useState(part.value != null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reopen, setReopen] = useState(false);
  const { errors, pending, submit } = useAction(f => A.editPartAction(o.id, part.id, f), onClose);
  const del = useAction(() => A.deletePartAction(o.id, part.id), onClose);
  const back = useAction(f => A.reopenPartAction(o.id, part.id, f), onClose);
  const fmt = (iso: string) => iso.split('-').reverse().join('.');
  const date = fmt(part.date);
  return (
    <Sheet open onClose={onClose} title={reopen ? t('reopenTitle') : t('editTitle')} sub={t('editSub', { qty: part.quantity, unit: p.unit, date })}>
      {reopen && planned ? (
        <form onSubmit={back.submit} className="form">
          <div className="callout callout--neutral">
            <Icon name="help" />
            <span>{t('reopenHelp', { date: fmt(planned.date) })}</span>
          </div>
          {o.stage === 'done' ? (
            <label className="check">
              <input type="checkbox" name="reopenOrder" value="1" defaultChecked={o.doneAt === part.date} />
              <span>
                {t('reopenOrder')}
                <span className="check__sub">{t('reopenOrderSub')}</span>
              </span>
            </label>
          ) : null}
          {planned.payments.length ? (
            <div className="callout callout--warning">
              <Icon name="cash" />
              <span>{t('reopenPays', { list: planned.payments.join(' · ') })}</span>
            </div>
          ) : null}
          <FormAlert errors={back.errors} />
          <SheetActions label={t('reopenYes')} pending={back.pending} onCancel={() => setReopen(false)} />
        </form>
      ) : confirmDelete ? (
        <form onSubmit={del.submit} className="form">
          <div className="callout callout--warning">
            <Icon name="alert" />
            <span>{t('deletePartHelp')}</span>
          </div>
          <FormAlert errors={del.errors} />
          <SheetActions label={t('deletePartYes')} tone="danger" pending={del.pending} onCancel={() => setConfirmDelete(false)} />
        </form>
      ) : (
        <form onSubmit={submit} className="form" noValidate>
          <Field name="quantity" label={t('howMany', { unit: p.unit })} req errors={errors} help={t('perUnit', { price: eur(p.unitPrice), unit: p.unit, left: p.quantity - p.installed + part.quantity })} htmlFor="pe-qty">
            <input className="input input--money" id="pe-qty" name="quantity" inputMode="numeric" defaultValue={part.quantity} style={{ maxWidth: 160 }} autoComplete="off" />
          </Field>
          <Field name="date" label={t('date')} errors={errors} htmlFor="pe-date">
            <input className="input" id="pe-date" type="date" name="date" defaultValue={part.date} max={today} />
          </Field>
          <Field name="installerId" label={t('installer')} errors={errors}>
            <Chips name="installerId" value={inst} onChange={setInst} options={[...installers.map(i => [i.id, i.name] as const), ['', t('noInstaller')] as const]} />
          </Field>
          <label className="check">
            <input type="checkbox" checked={other} onChange={e => setOther(e.target.checked)} />
            <span>
              {t('otherValue')}
              <span className="check__sub">{t('valueHelp', { price: eur(p.unitPrice) })}</span>
            </span>
          </label>
          {other ? (
            <Field name="value" label={t('value')} errors={errors} htmlFor="m-pe-value">
              <MoneyInput name="value" id="m-pe-value" defaultValue={part.value} />
            </Field>
          ) : null}
          <div className="help">{t('editHelp')}</div>
          <FormAlert errors={errors} />
          <SheetActions label={t('save')} pending={pending} onCancel={onClose}>
            {planned ? (
              <button className="btn btn--ghost btn--lg" type="button" onClick={() => setReopen(true)}>
                <Icon name="refresh" /> {t('reopen')}
              </button>
            ) : null}
            {canDelete ? (
              <button className="btn btn--ghost-danger btn--lg" type="button" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" /> {t('deletePart')}
              </button>
            ) : null}
          </SheetActions>
        </form>
      )}
    </Sheet>
  );
}
