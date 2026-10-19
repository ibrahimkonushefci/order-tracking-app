import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { can } from '@/auth/permissions';
import { requireUser } from '@/auth/session';
import { hasSetupAccess } from '@/auth/setup-pin';
import { getActiveBrand, isDemoMode } from '@/brand/active';
import { Icon } from '@/components/icons';
import { Page, PageHead } from '@/components/shell/shell';
import { PinForm } from './pin-form';
import { SetupForm } from './setup-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('setup');
  return { title: t('title') };
}

export default async function SetupPage() {
  const me = await requireUser();
  const t = await getTranslations('setup');
  const blocked = !isDemoMode() ? t('disabled') : !can(me.role, 'setup') ? t('ownerOnly') : null;
  const { brand, logoUrl, fallback } = await getActiveBrand();
  return (
    <Page nav="setup">
      <PageHead title={t('title')} sub={t('sub')} />
      {blocked ? (
        <div className="callout callout--neutral">
          <Icon name="help" />
          <span>{blocked}</span>
        </div>
      ) : !(await hasSetupAccess()) ? (
        <PinForm />
      ) : (
        <SetupForm
          initial={{
            companyName: fallback ? '' : brand.companyName,
            shortName: fallback ? '' : brand.shortName,
            phone: brand.contact.phone,
            city: brand.contact.city,
            businessType: brand.businessType,
            depositWord: brand.depositWord,
            primary: brand.colors.primary,
            accent: brand.colors.accent,
          }}
          initialSlug={fallback ? '' : brand.slug}
          logoUrl={logoUrl}
          ownerName={me.firstName}
        />
      )}
    </Page>
  );
}
