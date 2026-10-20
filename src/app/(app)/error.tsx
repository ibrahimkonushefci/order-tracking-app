'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/icons';

/** An unexpected error on a screen: an Albanian card inside the app shell instead of Next's English page. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('errorPage');
  return (
    <div className="narrow">
      <section className="card">
        <div className="empty">
          <Icon name="alert" />
          <b>{t('errorTitle')}</b>
          <span>{t('errorText')}</span>
          <div className="btn-row">
            <button className="btn btn--primary" type="button" onClick={reset}>
              {t('retry')}
            </button>
            <Link className="btn btn--secondary" href="/">
              {t('home')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
