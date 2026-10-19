'use client';
/**
 * The send screen (spec §5, §7): the prepared text, editable, then WhatsApp (primary),
 * Viber (text copied, chat opened) or SMS (small fallback). Nothing is sent by the app:
 * the person's own phone sends it, and on return the app asks "U dërgua?" and logs a "Po".
 * In demo mode a phone-style preview (MockProvider) shows how the message lands.
 */
import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as A from '@/app/(app)/actions';
import { sendHref, type Channel } from '@/domain/messages';
import { fmtPhone } from '@/lib/phone';
import { Icon } from './icons';
import { toast } from './sheet';

export interface ComposeTarget {
  name: string;
  phone: string;
  channel: Channel;
}

type Log =
  | { kind: 'customer'; record: 'order' | 'opening'; id: string; type: string; language: string }
  | { kind: 'installer'; installerId: string; visitIds: string[]; mode: 'visit' | 'day'; assign: boolean; back: string };

export function Compose({
  to,
  text: initial,
  textNoCollect,
  collectLabel,
  log,
  demo,
  sender,
  children,
}: {
  to: ComposeTarget;
  text: string;
  /** Installer messages: the same text without "Mblidh €X" (the switch in the send screen). */
  textNoCollect?: string;
  collectLabel?: string;
  log: Log;
  demo: boolean;
  /** Who the preview shows as the sender ("Teuta · Druri" or the company). */
  sender: string;
  children?: ReactNode;
}) {
  const t = useTranslations('compose');
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>(to.channel);
  const [collect, setCollect] = useState(true);
  const [text, setText] = useState(initial);
  const [edited, setEdited] = useState(false);
  const [asked, setAsked] = useState(false);
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();
  const href = sendHref(channel, to.phone, text);

  const toggleCollect = (on: boolean) => {
    setCollect(on);
    // Keep the person's own edits; only swap the prepared text.
    if (!edited && textNoCollect != null) setText(on ? initial : textNoCollect);
  };

  const opened = () => {
    if (channel === 'viber') navigator.clipboard?.writeText(text).catch(() => {});
    setTimeout(() => setAsked(true), 400);
  };

  const confirm = () =>
    start(async () => {
      const r =
        log.kind === 'customer'
          ? await A.logCustomerMessageAction(log.record, log.id, { type: log.type, channel, language: log.language, text })
          : await A.logInstallerMessageAction({ installerId: log.installerId, visitIds: log.visitIds, mode: log.mode, channel, text, assign: log.assign }, log.back);
      if (!r.ok) return toast(r.errors?._ ?? Object.values(r.errors ?? {})[0]);
      toast(r.toast);
      if (r.go) router.push(r.go);
    });

  const CH: [Channel, string][] = [
    ['whatsapp', 'WhatsApp'],
    ['viber', 'Viber'],
    ['sms', 'SMS'],
  ];
  return (
    <div className="card narrow">
      <div className="card__body">
        <div className="contact">
          <div className="grow">
            <div className="xs subtle">{log.kind === 'installer' ? t('installer') : t('to')}</div>
            <b>{to.name}</b>
            <div className="small muted">{fmtPhone(to.phone)}</div>
          </div>
          <a className="icon-btn icon-btn--call" href={`tel:${to.phone}`} aria-label={t('call', { name: to.name })}>
            <Icon name="phone" />
          </a>
        </div>
        {children}
        {textNoCollect != null ? (
          <label className="check">
            <input type="checkbox" checked={collect} onChange={e => toggleCollect(e.target.checked)} /> {collectLabel}
          </label>
        ) : null}
        <div className="seg seg--channels" role="group" aria-label={t('channel')}>
          {CH.map(([c, l]) => (
            <button key={c} type="button" className={`seg__${c}`} aria-pressed={c === channel} onClick={() => setChannel(c)}>
              {c === 'sms' ? <Icon name="message" /> : <Icon name={c} />}
              <span>{l}</span>
            </button>
          ))}
        </div>
        <div className="field">
          <label className="label" htmlFor="msg-text">
            {t('text')} <span className="opt">{t('editable')}</span>
          </label>
          <textarea
            className="textarea"
            id="msg-text"
            rows={10}
            style={{ minHeight: log.kind === 'installer' && log.mode === 'day' ? 320 : 230 }}
            value={text}
            onChange={e => {
              setText(e.target.value);
              setEdited(true);
            }}
          />
        </div>
        {channel === 'viber' ? <div className="help">{t('viberHelp')}</div> : channel === 'sms' ? <div className="help">{t('smsHelp')}</div> : null}
        {log.kind === 'installer' ? (
          <div className="xs subtle">
            <Icon name="book" /> {t('noInternal')}
          </div>
        ) : null}
        <a className={`btn btn--${channel} btn--lg btn--block`} href={href} target={channel === 'whatsapp' ? '_blank' : undefined} rel="noopener" onClick={opened}>
          {channel === 'sms' ? <Icon name="message" /> : <Icon name={channel} />} {channel === 'viber' ? t('sendViber') : t('send', { channel: channel === 'sms' ? 'SMS' : 'WhatsApp' })}
        </a>
        {demo ? (
          <button type="button" className="btn btn--secondary btn--sm btn--fit" onClick={() => setPreview(true)}>
            <Icon name="eye" /> {t('preview')}
          </button>
        ) : null}
        {asked ? (
          <section className="callout callout--info sent-ask" role="dialog" aria-label={t('wasSent')}>
            <div className="grow">
              <b>{t('wasSent')}</b>
              <div className="small muted">{t('wasSentHelp')}</div>
              <div className="btn-row" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn--success btn--lg" onClick={confirm} disabled={pending}>
                  <Icon name="check" /> {t('yesSent')}
                </button>
                <button type="button" className="btn btn--secondary btn--lg" onClick={() => setAsked(false)}>
                  {t('notSent')}
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
      {preview ? (
        <div className={`chat${channel === 'viber' ? ' chat--viber' : channel === 'sms' ? ' chat--sms' : ''}`} role="dialog" aria-label={t('previewTitle')}>
          <div className="chat__head">
            <button className="back" style={{ color: 'inherit' }} onClick={() => setPreview(false)} aria-label={t('back')}>
              <Icon name="left" />
            </button>
            <span className="chat__avatar chat__avatar--initial">{sender.charAt(0)}</span>
            <div className="grow">
              <div className="chat__name">{sender}</div>
              <div className="chat__status">online</div>
            </div>
          </div>
          <div className="chat__body">
            <span className="chat__day">{t('today')}</span>
            <span className="chat__note">{t('previewNote', { name: to.name })}</span>
            <div className="bubble">
              {text}
              <span className="bubble__time">{new Date().toTimeString().slice(0, 5)}</span>
            </div>
          </div>
          <div className="chat__foot">
            <button className="btn btn--secondary btn--lg" onClick={() => setPreview(false)}>
              {t('closePreview')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
