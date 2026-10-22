'use client';
/** Cilësimet: add/edit an installer (both roles), delete or remove one (Pronari), and the customer message templates per language (Pronari). */
import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import * as A from '@/app/(app)/actions';
import { DEFAULT_TEMPLATES, TEMPLATE_TYPES, TEMPLATE_VARS, type Lang, type TemplateType } from '@/domain/messages';
import { Chips, Field, FormAlert, PhoneInput, SheetActions, useAction } from './forms';
import { Icon } from './icons';
import { Sheet } from './sheet';

export interface InstallerRow {
  id: string;
  name: string;
  phone: string;
  channel: 'whatsapp' | 'viber';
  active: boolean;
  /** Pronari only (deleting is owner-only): what points to this installer, for "Fshij". */
  use?: { records: number; openVisits: number; heldCash: string | null };
}

export function InstallerButton({ installer, className, children, ariaLabel }: { installer?: InstallerRow; className: string; children: React.ReactNode; ariaLabel?: string }) {
  const t = useTranslations('installers');
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [channel, setChannel] = useState<string>(installer?.channel ?? 'whatsapp');
  const [active, setActive] = useState(installer?.active ?? true);
  const { errors, pending, submit } = useAction(f => A.saveInstallerAction(installer?.id ?? null, f), () => setOpen(false));
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label={ariaLabel}>
        {children}
      </button>
      {open && removing && installer?.use ? (
        <RemoveInstallerSheet installer={installer} use={installer.use} onClose={() => setOpen(false)} onBack={() => setRemoving(false)} />
      ) : open ? (
        <Sheet open onClose={() => setOpen(false)} title={installer ? t('editTitle') : t('addTitle')} sub={t('sub')}>
          <form onSubmit={submit} className="form" noValidate>
            <Field name="name" label={t('name')} req errors={errors} htmlFor="in-name">
              <input className="input" id="in-name" name="name" defaultValue={installer?.name} autoComplete="off" placeholder={t('namePh')} />
            </Field>
            <Field name="phone" label={t('phone')} req errors={errors} htmlFor="in-phone">
              <PhoneInput id="in-phone" value={installer?.phone} prefixLabel={t('prefix')} />
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
            {installer?.use ? (
              <button type="button" className="btn btn--ghost btn--sm btn--fit" onClick={() => setRemoving(true)}>
                <Icon name="trash" /> {t('delete')}
              </button>
            ) : null}
          </form>
        </Sheet>
      ) : null}
    </>
  );
}

/**
 * "Fshij montuesin": never used → deleted for good; used → "Hiq nga lista" (inactive, the name
 * stays on every visit, payment and message). Cash in hand or open visits are settled first.
 */
function RemoveInstallerSheet({ installer, use, onClose, onBack }: { installer: InstallerRow; use: NonNullable<InstallerRow['use']>; onClose: () => void; onBack: () => void }) {
  const t = useTranslations('installers');
  const { errors, pending, submit } = useAction(() => A.removeInstallerAction(installer.id), onClose);
  const blocked = !!use.heldCash || use.openVisits > 0;
  return (
    <Sheet open onClose={onClose} title={use.records ? t('removeTitle', { name: installer.name }) : t('deleteTitle', { name: installer.name })}>
      <form onSubmit={submit} className="form">
        {blocked ? (
          <div className="callout callout--warning">
            <Icon name="alert" />
            <span>
              {use.heldCash ? (
                <>
                  {t('blockedCash', { name: installer.name, amount: use.heldCash })} <Link href="/cash">{t('toCash')}</Link>
                  <br />
                </>
              ) : null}
              {use.openVisits ? (
                <>
                  {t('blockedVisits', { name: installer.name, n: use.openVisits })} <Link href="/schedule?d=week">{t('toSchedule')}</Link>
                </>
              ) : null}
            </span>
          </div>
        ) : (
          <div className={`callout ${use.records ? 'callout--neutral' : 'callout--warning'}`}>
            <Icon name={use.records ? 'help' : 'alert'} />
            <span>{use.records ? t('removeHelp', { name: installer.name, n: use.records }) : t('deleteHelp', { name: installer.name })}</span>
          </div>
        )}
        <FormAlert errors={errors} />
        {blocked ? (
          <button className="btn btn--secondary btn--lg" type="button" onClick={onBack}>
            {t('back')}
          </button>
        ) : (
          <SheetActions label={use.records ? t('removeYes') : t('deleteYes')} tone="danger" pending={pending} onCancel={onBack} />
        )}
      </form>
    </Sheet>
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
