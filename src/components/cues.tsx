/**
 * The v10 visual cues: row anchors (initials with a status dot, product icons),
 * the mini payment bar (green = in the office, striped amber = with an installer,
 * grey = still to pay), badges and the "how late" text. Usable on server and client.
 */
import { useTranslations } from 'next-intl';
import type { Totals } from '@/domain/balances';
import { eur } from '@/lib/money';
import { Icon, type IconName } from './icons';

export function Badge({ tone, icon, children }: { tone: 'danger' | 'warning' | 'success' | 'info' | 'brand' | 'neutral'; icon?: IconName; children: React.ReactNode }) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon ? <Icon name={icon} /> : null}
      <span className="ellipsis">{children}</span>
    </span>
  );
}

/** First name of a person, or a company's name without "sh.p.k." (greetings, initials). */
export function firstName(name: string) {
  return /sh\.?p\.?k|l\.?l\.?c/i.test(name) ? name.replace(/\s*(sh\.?p\.?k\.?|l\.?l\.?c\.?)\s*$/i, '') : name.split(' ')[0];
}

function initials(name: string) {
  const w = firstName(name).split(/\s+/).filter(Boolean);
  const full = name.split(/\s+/).filter(Boolean);
  const a = (w[0] ?? '?')[0];
  const b = full[1] && !/sh\.?p\.?k/i.test(full[1]) ? full[1][0] : (w[0] ?? '').slice(1, 2);
  return (a + b).toUpperCase();
}
const hueOf = (name: string) => 1 + ([...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 6);

export function Avatar({ name, dot, size }: { name: string; dot?: 'danger' | 'warning' | 'info' | 'success' | 'neutral' | null; size?: 'sm' }) {
  return (
    <span className={`av av--${hueOf(name)}${size ? ` av--${size}` : ''}`} aria-hidden="true">
      {initials(name)}
      {dot ? <span className={`av__dot av__dot--${dot}`} /> : null}
    </span>
  );
}

const PROD_ICON: [RegExp, IconName][] = [
  [/kuzhin/i, 'kitchen'],
  [/garderob|dollap/i, 'wardrobe'],
  [/der[eë]|dyer/i, 'door'],
  [/parket|laminat|dysheme/i, 'layers'],
  [/tavolin|mobilje|dhom/i, 'sofa'],
];

export function ProdAnchor({ productType, project }: { productType: string; project: boolean }) {
  const icon: IconName = project ? 'building' : (PROD_ICON.find(([re]) => re.test(productType))?.[1] ?? 'package');
  return (
    <span className={`av ${project ? 'av--project' : 'av--prod'}`} aria-hidden="true">
      <Icon name={icon} />
    </span>
  );
}

export function Progress({ t, big }: { t: Pick<Totals, 'total' | 'inOffice' | 'held'>; big?: boolean }) {
  const tr = useTranslations('money');
  const tot = Math.max(t.total, 1);
  const pct = (v: number) => Math.max(0, Math.min(100, (v / tot) * 100));
  return (
    <div className={`progress${big ? ' progress--lg' : ''}`} title={tr('barTitle', { office: eur(t.inOffice), held: eur(t.held) })}>
      <span className="progress__confirmed" style={{ width: `${pct(t.inOffice)}%` }} />
      <span className="progress__reported" style={{ width: `${pct(t.held)}%` }} />
    </div>
  );
}

export function MiniBar({ t }: { t: Pick<Totals, 'total' | 'inOffice' | 'held' | 'paid'> }) {
  const pct = Math.max(0, Math.min(100, Math.round((t.paid / Math.max(t.total, 1)) * 100)));
  return (
    <div className="mini">
      <Progress t={t} />
      <span className="mini__pct">{pct}%</span>
    </div>
  );
}

export function ProjBar({ installed, quantity }: { installed: number; quantity: number }) {
  return (
    <div className="mini">
      <div className="proj__bar" role="img" aria-label={`${installed} / ${quantity}`}>
        <span style={{ width: `${Math.min(100, (installed / quantity) * 100)}%` }} />
      </div>
      <span className="mini__pct">
        {installed}/{quantity}
      </span>
    </div>
  );
}

export function PayLegend({ t }: { t: Totals }) {
  const tr = useTranslations('money');
  return (
    <div className="legend">
      <span className="legend__item">
        <span className="legend__dot ld--office" />
        {tr('inOffice')} <b>{eur(t.inOffice)}</b>
      </span>
      {t.held ? (
        <span className="legend__item">
          <span className="legend__dot ld--held" />
          {tr('withInstallers')} <b>{eur(t.held)}</b>
        </span>
      ) : null}
      <span className="legend__item">
        <span className="legend__dot ld--rest" />
        {tr('left')} <b>{eur(Math.max(0, t.remaining))}</b>
      </span>
    </div>
  );
}

export const STAGE_TONE = { new: 'info', active: 'brand', done: 'success', cancelled: 'neutral' } as const;
export const PAY_TONE = { unpaid: 'danger', deposit: 'info', partial: 'warning', paid: 'success' } as const;
