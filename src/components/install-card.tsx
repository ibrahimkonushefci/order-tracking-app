'use client';
/** "Instalo në telefon": the browser's own install prompt where it offers one, otherwise the two-line how-to. */
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from './icons';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export function InstallCard() {
  const t = useTranslations('install');
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    if (standalone) queueMicrotask(() => setInstalled(true));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  return (
    <section className="card">
      <div className="card__head">
        <h2 className="card__title">{t('title')}</h2>
      </div>
      <div className="card__body">
        {installed ? (
          <div className="small">
            <Icon name="check" /> {t('installed')}
          </div>
        ) : (
          <>
            <div className="help">{t('help')}</div>
            {evt ? (
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={async () => {
                    await evt.prompt();
                    await evt.userChoice.catch(() => null);
                    setEvt(null);
                  }}
                >
                  <Icon name="download" /> {t('button')}
                </button>
              </div>
            ) : (
              <>
                <div className="small">{t('android')}</div>
                <div className="small">{t('ios')}</div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
