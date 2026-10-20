'use client';
/**
 * Demo controls (PHASES.md Phase 5), shown only when DEMO_MODE is on: the prototype's laptop
 * demo bar (the four moments, "Shiko si", brand, demo date) and, on phones, a "Demo" button in
 * the header. Both open the same panel: QR for the tracking page, "Numri i takimit", every
 * case, and "Rivendos demon". Not part of a client's app.
 */
import { useActionState, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  resetDemoAction,
  setDemoPhoneAction,
  switchRoleAction,
  type DemoPhoneState,
} from '@/server/demo-actions';
import { setDemoDays } from '@/app/(app)/settings/actions';
import { PHONE_CODES } from '@/lib/phone';
import { Icon } from './icons';
import { QrCode } from './qr-code';
import { Sheet } from './sheet';

export interface DemoMoment {
  n: string;
  short: string;
  label: string;
  href: string | null;
  qr?: boolean;
}

export interface DemoInfo {
  brands: { slug: string; name: string }[];
  brandSlug: string;
  role: 'owner' | 'office';
  people: Record<'owner' | 'office', string>;
  moments: DemoMoment[];
  cases: { n: string; label: string; href: string }[];
  qr: { key: string; label: string; url: string; preview: string }[];
  offset: number;
  phone: string | null;
  hasDemoData: boolean;
}

type Panel = null | 'more' | 'qr';
const OPEN_EVENT = 'ot-demo-open';

/** Phones: the "Demo" button in the header (the bar itself is laptop/tablet only). */
export function DemoHeaderButton() {
  const t = useTranslations('demo');
  return (
    <button
      type="button"
      className="icon-btn icon-btn--bare demo-btn"
      aria-label={t('open')}
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      <Icon name="play" />
    </button>
  );
}

export function DemoBar({ info }: { info: DemoInfo }) {
  const t = useTranslations('demo');
  const [panel, setPanel] = useState<Panel>(null);
  const [qrKey, setQrKey] = useState(info.qr[0]?.key ?? '');
  const path = usePathname();
  useEffect(() => {
    const open = () => setPanel('more');
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);
  const openQr = (key?: string) => {
    if (key) setQrKey(key);
    setPanel('qr');
  };
  const moment = (m: DemoMoment, compact: boolean) =>
    m.qr ? (
      <button key={m.n} type="button" title={m.label} onClick={() => openQr(info.qr[0]?.key)}>
        <b>{m.n}</b>
        {compact ? m.short : m.label}
      </button>
    ) : m.href ? (
      <Link key={m.n} href={m.href} title={m.label} onClick={() => setPanel(null)}>
        <b>{m.n}</b>
        {compact ? m.short : m.label}
      </Link>
    ) : null;

  return (
    <>
      <div className="demo-bar" role="region" aria-label={t('bar')}>
        <span className="demo-bar__title">{t('title')}</span>
        {info.brands.length > 1 ? (
          <span className="demo-seg" role="group" aria-label={t('brand')}>
            {info.brands.map(b => (
              <a
                key={b.slug}
                href={`${path}?brand=${b.slug}`}
                aria-current={b.slug === info.brandSlug ? 'page' : undefined}
              >
                {b.name}
              </a>
            ))}
          </span>
        ) : null}
        <RoleSeg info={info} compact />
        <span className="demo-bar__moments">{info.moments.map(m => moment(m, true))}</span>
        <span className="demo-bar__spacer" />
        {info.phone ? (
          <span
            className="demo-bar__note demo-bar__note--phone"
            title={t('phoneOn', { phone: info.phone })}
          >
            <Icon name="phone" /> {info.phone}
          </span>
        ) : null}
        {info.offset ? (
          <span className="demo-bar__note">{t('offset', { n: info.offset })}</span>
        ) : null}
        <button type="button" onClick={() => setPanel('more')}>
          {t('more')}
        </button>
      </div>

      <Sheet
        open={panel === 'more'}
        onClose={() => setPanel(null)}
        title={t('panelTitle')}
        sub={t('panelSub')}
        autoFocusField={false}
      >
        <div className="panel-grid">
          {!info.hasDemoData ? (
            <div className="callout callout--warning">
              <Icon name="alert" />
              <span>{t('noDemoData')}</span>
            </div>
          ) : null}
          <div className="field">
            <span className="label">{t('moments')}</span>
            <div className="panel-links">
              {info.moments.map(m =>
                m.qr ? (
                  <button key={m.n} type="button" onClick={() => openQr(info.qr[0]?.key)}>
                    <b>{m.n}</b>
                    {m.label}
                  </button>
                ) : m.href ? (
                  <Link key={m.n} href={m.href} onClick={() => setPanel(null)}>
                    <b>{m.n}</b>
                    {m.label}
                  </Link>
                ) : null,
              )}
            </div>
          </div>
          <div className="field">
            <span className="label">{t('viewAs')}</span>
            <RoleSeg info={info} />
            <div className="help">{t('viewAsHelp', { office: info.people.office })}</div>
          </div>
          {info.brands.length > 1 ? (
            <div className="field">
              <span className="label">{t('brand')}</span>
              <div className="seg">
                {info.brands.map(b => (
                  <a
                    key={b.slug}
                    href={`${path}?brand=${b.slug}`}
                    aria-current={b.slug === info.brandSlug ? 'page' : undefined}
                  >
                    {b.name}
                  </a>
                ))}
              </div>
              <div className="help">{t('brandHelp')}</div>
            </div>
          ) : null}
          <div className="field">
            <span className="label">
              {info.offset ? t('dateOn', { n: info.offset }) : t('date')}
            </span>
            <form action={setDemoDays} className="btn-row">
              <button className="btn btn--secondary btn--sm" type="submit" name="step" value="1">
                {t('plus1')}
              </button>
              <button className="btn btn--secondary btn--sm" type="submit" name="step" value="7">
                {t('plus7')}
              </button>
              <button
                className="btn btn--ghost btn--sm"
                type="submit"
                name="step"
                value="reset"
                disabled={!info.offset}
              >
                {t('today')}
              </button>
            </form>
            <div className="help">{t('dateHelp')}</div>
          </div>
          <PhoneField phone={info.phone} />
          {info.cases.length ? (
            <details className="fold fold--inline">
              <summary>
                <Icon name="list" />
                <span className="grow">
                  <span className="fold__title">{t('cases')}</span>
                  <span className="fold__sum">{t('casesSum', { n: info.cases.length })}</span>
                </span>
                <Icon name="right" className="chev" />
              </summary>
              <div className="fold__body">
                <div className="panel-links">
                  {info.cases.map(c => (
                    <Link key={c.label} href={c.href} onClick={() => setPanel(null)}>
                      <b>{c.n}</b>
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            </details>
          ) : null}
          <ResetDemo />
        </div>
      </Sheet>

      <Sheet
        open={panel === 'qr'}
        onClose={() => setPanel(null)}
        title={t('qrTitle')}
        sub={t('qrSub')}
      >
        <QrPanel options={info.qr} value={qrKey} onChange={setQrKey} />
      </Sheet>
    </>
  );
}

function RoleSeg({ info, compact }: { info: DemoInfo; compact?: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <span
      className={compact ? 'demo-seg' : 'seg'}
      role="group"
      aria-label={t('demo.viewAs')}
      aria-busy={pending}
    >
      {(['owner', 'office'] as const).map(r => (
        <button
          key={r}
          type="button"
          aria-pressed={info.role === r}
          disabled={pending}
          onClick={() => {
            if (info.role === r) return;
            const f = new FormData();
            f.set('role', r);
            // The new session cookie applies from the next request: refresh this screen with it.
            start(async () => {
              await switchRoleAction(f);
              router.refresh();
            });
          }}
        >
          {compact ? info.people[r] : `${info.people[r]} · ${t(`role.${r}`)}`}
        </button>
      ))}
    </span>
  );
}

/** The QR of a tracking page, for the owner's own phone (moment 2). */
export function QrPanel({
  options,
  value,
  onChange,
}: {
  options: DemoInfo['qr'];
  value: string;
  onChange: (k: string) => void;
}) {
  const t = useTranslations('demo');
  const cur = options.find(o => o.key === value) ?? options[0];
  if (!cur) return <div className="help">{t('qrNone')}</div>;
  const local = /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(cur.url);
  return (
    <div className="qr-panel">
      {options.length > 1 ? (
        <div className="chips" role="radiogroup" aria-label={t('qrWhich')}>
          {options.map(o => (
            <label className="chip" key={o.key}>
              <input
                type="radio"
                name="qr"
                checked={o.key === cur.key}
                onChange={() => onChange(o.key)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      ) : null}
      <div className="qr-box">
        <QrCode text={cur.url} label={t('qrLabel', { label: cur.label })} />
      </div>
      <div className="mono-box">
        <Icon name="link" />
        <span className="ellipsis grow">{cur.url}</span>
      </div>
      {local ? (
        <div className="callout callout--warning">
          <Icon name="alert" />
          <span>{t('qrLocal')}</span>
        </div>
      ) : (
        <div className="help">{t('qrHelp')}</div>
      )}
      <div className="btn-row">
        <a className="btn btn--secondary btn--sm" href={cur.preview} target="_blank" rel="noopener">
          <Icon name="eye" /> {t('qrPreview')}
        </a>
      </div>
    </div>
  );
}

/** "Numri i takimit": the owner's phone, so prepared messages can be sent there by hand. */
function PhoneField({ phone }: { phone: string | null }) {
  const t = useTranslations('demo');
  const [cc, setCc] = useState('+383');
  const [raw, setRaw] = useState('');
  const [state, action, pending] = useActionState<DemoPhoneState, FormData>(setDemoPhoneAction, {});
  return (
    <form action={action} className="field">
      <label className="label" htmlFor="demo-phone">
        {phone ? t('phoneSet', { phone }) : t('phone')}
      </label>
      <div className="input-group">
        <select
          className="select"
          name="cc"
          aria-label={t('phoneCode')}
          value={cc}
          onChange={e => setCc(e.target.value)}
        >
          {PHONE_CODES.map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          className="input"
          id="demo-phone"
          name="phone"
          inputMode="tel"
          autoComplete="off"
          placeholder="044 123 456"
          value={raw}
          onChange={e => setRaw(e.target.value)}
        />
      </div>
      {state.error ? (
        <div className="error" role="alert">
          {t('phoneError')}
        </div>
      ) : null}
      <div className="btn-row">
        <button
          className="btn btn--secondary btn--sm"
          type="submit"
          disabled={pending || !raw.trim()}
        >
          {t('phoneSave')}
        </button>
        {phone ? (
          <button
            className="btn btn--ghost btn--sm"
            type="submit"
            name="clear"
            value="1"
            disabled={pending}
          >
            {t('phoneClear')}
          </button>
        ) : null}
      </div>
      <div className="help">{t('phoneHelp')}</div>
    </form>
  );
}

function ResetDemo() {
  const t = useTranslations('demo');
  const [ask, setAsk] = useState(false);
  const [pending, start] = useTransition();
  return ask ? (
    <div className="callout callout--danger">
      <div className="grow">
        <b>{t('resetAsk')}</b>
        <div className="small">{t('resetHelp')}</div>
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            disabled={pending}
            onClick={() => start(() => resetDemoAction())}
          >
            <Icon name="refresh" /> {pending ? t('resetting') : t('resetYes')}
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            disabled={pending}
            onClick={() => setAsk(false)}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  ) : (
    <button type="button" className="btn btn--ghost-danger" onClick={() => setAsk(true)}>
      <Icon name="refresh" /> {t('reset')}
    </button>
  );
}

/** Demo mode, on the order's "Faqja e klientit" row: this order's tracking page as a QR. */
export function OrderQrButton({
  url,
  preview,
  label,
}: {
  url: string;
  preview: string;
  label: string;
}) {
  const t = useTranslations('demo');
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn--secondary btn--sm" onClick={() => setOpen(true)}>
        <Icon name="qr" /> {t('qrButton')}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('qrTitle')} sub={t('qrSub')}>
        <QrPanel
          options={[{ key: 'order', label, url, preview }]}
          value="order"
          onChange={() => {}}
        />
      </Sheet>
    </>
  );
}
