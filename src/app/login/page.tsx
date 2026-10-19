import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/auth/session';
import { getActiveBrand } from '@/brand/active';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme';
import { LoginForm } from './login-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('login');
  return { title: t('title') };
}

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/');
  const { brand, logoUrl } = await getActiveBrand();
  const t = await getTranslations('login');
  return (
    <div className="auth">
      <div className="auth__theme">
        <ThemeToggle />
      </div>
      <div className="auth__card">
        <div className="auth__brand">
          <BrandLogo logoUrl={logoUrl} name={brand.companyName} />
          <span>
            <b>{brand.companyName}</b>
            <small>{t('sub')}</small>
          </span>
        </div>
        <section className="card">
          <div className="card__body">
            <h1>{t('title')}</h1>
            <LoginForm />
          </div>
        </section>
        <p className="help" style={{ margin: 0, textAlign: 'center' }}>
          {t('note')}
        </p>
      </div>
    </div>
  );
}
