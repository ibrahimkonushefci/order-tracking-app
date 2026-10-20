import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';

/** Any unknown address, and a record that doesn't exist with demo mode off: in Albanian, not Next's English page. */
export default async function NotFound() {
  const t = await getTranslations('errorPage');
  return (
    <div className="auth">
      <div className="auth__card">
        <section className="card">
          <div className="empty">
            <Icon name="help" />
            <b>{t('notFoundTitle')}</b>
            <span>{t('notFoundText')}</span>
            <Link className="btn btn--secondary" href="/">
              {t('home')}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
