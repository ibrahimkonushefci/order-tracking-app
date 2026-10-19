import type { ReactNode } from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { CurrentUser } from '@/auth/session';
import { logout } from '@/auth/actions';
import type { Brand } from '@/brand/schema';
import { BrandLogo } from '../brand-logo';
import { Icon } from '../icons';
import { ThemeToggle } from '../theme';
import { MainTabs, SecondaryTabs, SettingsGear } from './nav';

/**
 * The v10 shell: header + bottom tab bar on phones; on wider screens (container ≥ 760px)
 * the same nav becomes the sidebar with Para te montuesit, Cilësimet and the signed-in user.
 */
export async function Shell({
  user,
  brand,
  logoUrl,
  cashDot,
  children,
}: {
  user: CurrentUser;
  brand: Brand;
  logoUrl: string | null;
  cashDot: boolean;
  children: ReactNode;
}) {
  const t = await getTranslations();
  const role = t(`role.${user.role}`);
  return (
    <div className="app">
      <div id="view">
        <div className="shell">
          <a className="skip-link" href="#main-content">
            {t('app.skip')}
          </a>
          <header className="app-header">
            <Link className="app-header__brand" href="/">
              <BrandLogo logoUrl={logoUrl} name={brand.companyName} />
              <span className="app-header__titles">
                <span className="app-header__title">{brand.companyName}</span>
                <span className="app-header__sub" style={{ display: 'block' }}>
                  {role} · {user.firstName}
                </span>
              </span>
            </Link>
            <ThemeToggle />
            <SettingsGear />
          </header>
          <main className="main" id="main-content" tabIndex={-1}>
            {children}
          </main>
          <nav className="tabbar" aria-label={t('app.nav')}>
            <Link className="rail-brand" href="/">
              <BrandLogo logoUrl={logoUrl} name={brand.companyName} />
              <span>
                {brand.companyName}
                <small>{t('app.tagline')}</small>
              </span>
            </Link>
            <span className="rail-label">{t('app.workshop')}</span>
            <MainTabs />
            <SecondaryTabs cashDot={cashDot} />
            <div className="rail-user">
              <span className="avatar avatar--static">{user.firstName.slice(0, 1)}</span>
              <span className="grow">
                {user.firstName}
                <small>{role}</small>
              </span>
              <form action={logout}>
                <button className="rail-logout" type="submit" aria-label={t('user.logout')} title={t('user.logout')}>
                  <Icon name="logout" />
                </button>
              </form>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}

/** One screen's content area, with the prototype's per-screen class. */
export function Page({ nav, children }: { nav: string; children: ReactNode }) {
  return <div className={`content content--${nav}`}>{children}</div>;
}

export function PageHead({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="grow">
        <h1>{title}</h1>
        {sub ? <div className="page-head__sub">{sub}</div> : null}
      </div>
      {right}
    </div>
  );
}
