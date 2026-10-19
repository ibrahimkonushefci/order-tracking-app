'use client';
/** Cilësimet: add/edit an installer (both roles), and the customer message templates per language (Pronari). */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import * as A from '@/app/(app)/actions';
import { DEFAULT_TEMPLATES, TEMPLATE_TYPES, TEMPLATE_VARS, type Lang, type TemplateType } from '@/domain/messages';
import { fmtPhone, PHONE_CODES } from '@/lib/phone';
import { Chips, Field, FormAlert, SheetActions, useAction } from './forms';
import { Icon } from './icons';
import { Sheet } from './sheet';

export interface InstallerRow {
  id: string;
  name: string;
  phone: string;
  channel: 'whatsapp' | 'viber';
  active: boolean;
}

export function InstallerButton({ installer, className, children, ariaLabel }: { installer?: InstallerRow; className: string; children: React.ReactNode; ariaLabel?: string }) {
  const t = useTranslations('installers');
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<string>(installer?.channel ?? 'whatsapp');
  const [active, setActive] = useState(installer?.active ?? true);
  const { errors, pending, submit } = useAction(f => A.saveInstallerAction(installer?.id ?? null, f), () => setOpen(false));
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label={ariaLabel}>
        {children}
      </button>
      {open ? (
        <Sheet open onClose={() => setOpen(false)} title={installer ? t('editTitle') : t('addTitle')} sub={t('sub')}>
          <form onSubmit={submit} className="form" noValidate>
            <Field name="name" label={t('name')} req errors={errors} htmlFor="in-name">
              <input className="input" id="in-name" name="name" defaultValue={installer?.name} autoComplete="off" placeholder={t('namePh')} />
            </Field>
            <Field name="phone" label={t('phone')} req errors={errors} htmlFor="in-phone">
              <div className="input-group">
                <select className="select" name="phoneCc" aria-label={t('prefix')} defaultValue="+383">
                  {PHONE_CODES.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <input className="input" id="in-phone" name="phone" inputMode="tel" placeholder="44 123 456" defaultValue={installer ? fmtPhone(installer.phone) : undefined} />
              </div>
            </Field>
            <Field label={t('channel')}>
              <Chips name="channel" value={channel} onChange={setChannel} options={[['whatsapp', 'WhatsApp'], ['viber', 'Viber']]} />
            </Field>
            {installer ? (
              <label className="check">
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
                <input type="hidden" name="active" value={active ? '1' : '0'} />
                <span>
                  {t('active')}
                  <span className="check__sub">{t('activeHelp')}</span>
                </span>
              </label>
            ) : null}
            <FormAlert errors={errors} />
            <SheetActions label={installer ? t('save') : t('add')} pending={pending} onCancel={() => setOpen(false)} />
          </form>
        </Sheet>
      ) : null}
    </>
  );
}

const LANGS: Lang[] = ['sq', 'en', 'de'];

/** "Mesazhet": one textarea per template; an empty field goes back to the default text. */
export function TemplatesEditor({ saved }: { saved: Partial<Record<Lang, Partial<Record<string, string>>>> }) {
  const t = useTranslations('templates');
  const w = useTranslations('words');
  const [lang, setLang] = useState<Lang>('sq');
  const { errors, pending, submit } = useAction(f => A.saveTemplatesAction(lang, f));
  const label = (k: TemplateType) => t(`type.${k}`);
  return (
    <div className="form">
      <div className="seg" role="group" aria-label={t("language")}>
        {LANGS.map(l => (
          <button key={l} type="button" aria-pressed={l === lang} onClick={() => setLang(l)}>
            {w(`lang.${l}`)}
          </button>
        ))}
      </div>
      <form key={lang} onSubmit={submit} className="form">
        {TEMPLATE_TYPES.map(k => (
          <Field key={k} label={label(k)} htmlFor={`tpl-${k}`}>
            <textarea className="textarea" id={`tpl-${k}`} name={`t_${k}`} rows={5} defaultValue={saved[lang]?.[k] ?? DEFAULT_TEMPLATES[lang][k]} />
          </Field>
        ))}
        <div className="help">
          {t('vars')} {TEMPLATE_VARS.map(v => `{${v}}`).join(' ')}
        </div>
        <FormAlert errors={errors} />
        <button className="btn btn--primary" type="submit" disabled={pending}>
          <Icon name="check" /> {t('save')}
        </button>
      </form>
    </div>
  );
}
