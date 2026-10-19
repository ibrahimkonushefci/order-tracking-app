'use client';
/** The order's tracking link row: copy, and "Link i ri" (one confirm, no reason); plus the client's language and channel. */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as A from '@/app/(app)/actions';
import { FormAlert, SheetActions, useAction } from '../forms';
import { Icon } from '../icons';
import { Sheet, toast } from '../sheet';

export function CopyLink({ url }: { url: string }) {
  const t = useTranslations('link');
  return (
    <button
      type="button"
      className="btn btn--secondary btn--sm"
      onClick={() =>
        navigator.clipboard?.writeText(url).then(
          () => toast(t('copied')),
          () => toast(url),
        )
      }
    >
      <Icon name="link" /> {t('copy')}
    </button>
  );
}

export function NewLinkButton({ orderId }: { orderId: string }) {
  const t = useTranslations('link');
  const [open, setOpen] = useState(false);
  const { errors, pending, submit } = useAction(() => A.newLinkAction(orderId), () => setOpen(false));
  return (
    <>
      <button type="button" className="btn btn--ghost btn--sm btn--fit" onClick={() => setOpen(true)}>
        <Icon name="refresh" /> {t('new')}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('newTitle')} sub={t('newSub')}>
        <form onSubmit={submit} className="form">
          <div className="callout callout--neutral">
            <Icon name="link" />
            <span>{t('newHelp')}</span>
          </div>
          <FormAlert errors={errors} />
          <SheetActions label={t('newYes')} pending={pending} onCancel={() => setOpen(false)} />
        </form>
      </Sheet>
    </>
  );
}

/** "Gjuha" (messages and the tracking page) and "Kanali", one tap each, saved at once. */
export function ContactPrefs({ kind, id, language, channel }: { kind: 'client' | 'opening'; id: string; language: string; channel: string }) {
  const t = useTranslations('link');
  const w = useTranslations('words');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [lang, setLang] = useState(language);
  const [ch, setCh] = useState(channel);
  const save = (input: { language?: string; channel?: string }) =>
    start(async () => {
      const r = kind === 'client' ? await A.clientContactAction(id, input) : await A.openingContactAction(id, input);
      if (!r.ok) toast(r.errors?._);
      router.refresh();
    });
  const chips = (name: string, value: string, set: (v: string) => void, opts: [string, string][], key: 'language' | 'channel') => (
    <div className="chips" role="radiogroup" aria-label={key === 'language' ? t('language') : t('channel')} aria-busy={pending}>
      {opts.map(([v, l]) => (
        <label className="chip" key={v}>
          <input
            type="radio"
            name={name}
            value={v}
            checked={value === v}
            onChange={() => {
              set(v);
              save({ [key]: v });
            }}
          />
          <span>{l}</span>
        </label>
      ))}
    </div>
  );
  return (
    <div className="form">
      <div className="field">
        <span className="label">{t('language')}</span>
        {chips(`lang-${id}`, lang, setLang, (['sq', 'en', 'de'] as const).map(l => [l, w(`lang.${l}`)]), 'language')}
        <div className="help">{t('languageHelp')}</div>
      </div>
      <div className="field">
        <span className="label">{t('channel')}</span>
        {chips(`ch-${id}`, ch, setCh, (['whatsapp', 'viber', 'sms'] as const).map(c => [c, w(`channelName.${c}`)]), 'channel')}
      </div>
    </div>
  );
}
