'use client';
import { useActionState, useEffect, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { BUSINESS_TYPES } from '@/brand/schema';
import { extractColorsFromFile } from '@/brand/extract-colors';
import { slugify } from '@/brand/slug';
import { brandCssVars } from '@/brand/theme';
import { BrandLogo } from '@/components/brand-logo';
import { Icon } from '@/components/icons';
import { applyBrand, type ApplyState } from './actions';

type Fields = {
  companyName: string;
  shortName: string;
  phone: string;
  city: string;
  businessType: (typeof BUSINESS_TYPES)[number];
  depositWord: 'Avans' | 'Kapar';
  primary: string;
  accent: string;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export function SetupForm({
  initial,
  initialSlug,
  logoUrl,
  ownerName,
}: {
  initial: Fields;
  initialSlug: string;
  logoUrl: string | null;
  ownerName: string;
}) {
  const t = useTranslations('setup');
  const [f, setF] = useState(initial);
  // An uploaded logo (blob: URL); otherwise the current logo only while the brand keeps its slug.
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [logoError, setLogoError] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyBrand, {});
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => () => void (uploaded && URL.revokeObjectURL(uploaded)), [uploaded]);

  async function onLogo(file: File | undefined) {
    setLogoError(false);
    if (!file) return;
    setFileName(file.name);
    if (file.size > 2 * 1024 * 1024 || !/^image\/(svg\+xml|png)$/.test(file.type)) {
      setLogoError(true);
      return;
    }
    setUploaded(URL.createObjectURL(file));
    try {
      const colors = await extractColorsFromFile(file);
      setSuggested(colors);
      if (colors[0]) set('primary', colors[0]);
      if (colors[1]) set('accent', colors[1]);
    } catch {
      setSuggested([]);
    }
  }

  const err = (k: keyof NonNullable<ApplyState['errors']>) => {
    const key = state.errors?.[k];
    return key ? t(key) : undefined;
  };
  const field = (k: keyof Fields, label: string, props: Record<string, unknown> = {}) => (
    <div className={`field${err(k as never) ? ' has-error' : ''}`}>
      <label className="label" htmlFor={`f-${k}`}>
        {label}
      </label>
      <input className="input" id={`f-${k}`} name={k} value={f[k]} onChange={e => set(k, e.target.value as never)} {...props} />
      {err(k as never) ? <div className="error">{err(k as never)}</div> : null}
    </div>
  );
  const colors = {
    primary: HEX.test(f.primary) ? f.primary : initial.primary,
    accent: HEX.test(f.accent) ? f.accent : initial.accent,
    background: '#FFFFFF',
    text: '#1A1A1A',
  };
  const name = f.companyName || '—';
  const logo = uploaded ?? (slugify(f.companyName) === initialSlug ? logoUrl : null);

  return (
    <>
      <section className="card">
        <div className="card__body">
          <form action={action} className="form">
            <div className={`field${err('logo') || logoError ? ' has-error' : ''}`}>
              <span className="label">{t('logo')}</span>
              <label className="btn btn--secondary btn--fit file-btn">
                <Icon name="camera" /> {fileName ?? t('chooseLogo')}
                <input id="f-logo" name="logo" type="file" accept="image/svg+xml,image/png" onChange={e => onLogo(e.target.files?.[0])} />
              </label>
              <div className="help">{t('logoHelp')}</div>
              {err('logo') || logoError ? <div className="error">{err('logo') ?? t('logoInvalid')}</div> : null}
            </div>
            {suggested.length ? (
              <div className="field">
                <span className="label">{t('suggested')}</span>
                <div className="swatches">
                  {suggested.map(c => (
                    <button
                      key={c}
                      type="button"
                      className="swatch"
                      style={{ background: c }}
                      aria-pressed={f.primary.toUpperCase() === c}
                      aria-label={c}
                      title={c}
                      onClick={() => set('primary', c)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {(['primary', 'accent'] as const).map(k => (
              <div key={k} className={`field${err(k) ? ' has-error' : ''}`}>
                <label className="label" htmlFor={`f-${k}`}>
                  {t(k)}
                </label>
                <div className="color-row">
                  <input type="color" aria-label={t(k)} value={colors[k]} onChange={e => set(k, e.target.value.toUpperCase())} />
                  <input className="input" id={`f-${k}`} name={k} value={f[k]} onChange={e => set(k, e.target.value)} />
                </div>
              </div>
            ))}
            {field('companyName', t('companyName'), { autoComplete: 'organization' })}
            {field('shortName', t('shortName'))}
            {field('phone', t('phone'), { inputMode: 'tel', placeholder: '+38344123456' })}
            {field('city', t('city'))}
            <div className="field">
              <label className="label" htmlFor="f-businessType">
                {t('businessType')}
              </label>
              <select className="select input" id="f-businessType" name="businessType" value={f.businessType} onChange={e => set('businessType', e.target.value as Fields['businessType'])}>
                {BUSINESS_TYPES.map(b => (
                  <option key={b} value={b}>
                    {t(`types.${b}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <span className="label">{t('deposit')}</span>
              <div className="seg">
                {(['Avans', 'Kapar'] as const).map(w => (
                  <label key={w}>
                    <input type="radio" name="depositWord" value={w} checked={f.depositWord === w} onChange={() => set('depositWord', w)} />
                    <span>{w}</span>
                  </label>
                ))}
              </div>
            </div>
            {state.ok ? (
              <div className="callout callout--success" role="status">
                <Icon name="check" />
                <span>{t('applied')}</span>
              </div>
            ) : state.errors ? (
              <div className="callout callout--danger" role="alert">
                <Icon name="alert" />
                <span>{t('invalid')}</span>
              </div>
            ) : null}
            <button className="btn btn--primary btn--block" type="submit" disabled={pending}>
              {pending ? t('applying') : t('apply')}
            </button>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">{t('preview')}</h2>
        </div>
        <div className="card__body setup-preview brand-scope" style={brandCssVars(colors) as CSSProperties}>
          <div className="app-header" style={{ borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <span className="app-header__brand">
              <BrandLogo logoUrl={logo} name={name} />
              <span className="app-header__titles">
                <span className="app-header__title">{name}</span>
                <span className="app-header__sub" style={{ display: 'block' }}>
                  {t('previewRole', { name: ownerName })}
                </span>
              </span>
            </span>
          </div>
          <div className="hero">
            <span className="hero__top">
              <span>{t('previewHero')}</span>
            </span>
            <span className="hero__value">€12.400</span>
            <span className="hero__sub">{t('previewHeroSub')}</span>
          </div>
          <div className="seg">
            <button type="button" aria-pressed="true">
              {t('previewToday')}
            </button>
            <button type="button" aria-pressed="false">
              {t('previewTomorrow')}
            </button>
            <button type="button" aria-pressed="false">
              {t('previewWeek')}
            </button>
          </div>
          <div className="btn-row">
            <span className="btn btn--primary">
              <Icon name="plus" /> {t('previewNewOrder')}
            </span>
            <span className="btn btn--whatsapp">
              <Icon name="whatsapp" /> {t('previewReminder')}
            </span>
          </div>
          <div className="help">
            {f.depositWord} · {f.city || '—'}
          </div>
        </div>
      </section>
    </>
  );
}
