import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/auth/session';
import { chosenBrandSlug, getActiveBrand, isDemoMode } from '@/brand/active';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme';
import { LoginForm } from './login-form';
import { Icon } from '@/components/icons';
import { readBrand } from '@/brand/files';
import { brandCssVars } from '@/brand/theme';
import type { CSSProperties } from 'react';
import { demoCompanyFor, demoUsers, ensureFreshDemo } from '@/server/demo';
import { demoLoginAction } from '@/server/demo-actions';

/** Demo mode: the brand's Pronari and Zyra, for the one-tap buttons. */
async function demoPeople() {
  if (!isDemoMode()) return null;
  await ensureFreshDemo();
  const c = await demoCompanyFor(await chosenBrandSlug());
  if (!c) return null;
  const users = await demoUsers(c.id);
  const owner = users.find(u => u.role === 'owner');
  const office = users.find(u => u.role === 'office');
  return owner && office
    ? { owner: owner.firstName, office: office.firstName, brandSlug: c.brandSlug }
    : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('login');
  return { title: t('title') };
}

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/');
  const people = await demoPeople();
  // Demo: the brand of the company the buttons sign into (with only the test fixtures loaded, that one company).
  const { brand, logoUrl } = people ? await readBrand(people.brandSlug) : await getActiveBrand();
  const t = await getTranslations('login');
  const td = await getTranslations('demo');
  const tr = await getTranslations('role');
  return (
    <div
      className={people ? 'auth brand-scope' : 'auth'}
      style={people ? (brandCssVars(brand.colors) as CSSProperties) : undefined}
    >
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
            {people ? (
              <>
                <form action={demoLoginAction} className="auth__demo">
                  <button
                    className="btn btn--primary btn--lg btn--block"
                    type="submit"
                    name="role"
                    value="owner"
                  >
                    <Icon name="user" /> {td('loginAs', { name: people.owner })}{' '}
                    <small>{tr('owner')}</small>
                  </button>
                  <button
                    className="btn btn--secondary btn--lg btn--block"
                    type="submit"
                    name="role"
                    value="office"
                  >
                    <Icon name="user" /> {td('loginAs', { name: people.office })}{' '}
                    <small>{tr('office')}</small>
                  </button>
                  <div className="help">{td('loginHelp')}</div>
                </form>
                <div className="auth__or">{td('orEmail')}</div>
              </>
            ) : null}
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
