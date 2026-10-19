import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getActiveBrand } from '@/brand/active';
import { BrandLogo } from '@/components/brand-logo';
import { Icon } from '@/components/icons';
import { fmtPhone } from '@/lib/phone';

export const metadata: Metadata = { robots: { index: false, follow: false } };

// The tracking page follows the visitor's device setting, not a saved staff choice.
const deviceTheme = `document.documentElement.dataset.theme=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';`;

/**
 * Customer tracking page. The order view arrives in Phase 4; until then every token
 * (like a replaced one) shows the neutral page with the company phone and nothing else.
 */
export default async function TrackingPage() {
  const { brand, logoUrl } = await getActiveBrand();
  const t = await getTranslations('tracking');
  const [first, ...rest] = t('inactive').split('. ');
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: deviceTheme }} />
      <div className="trk">
        <header className="trk-hero">
          <div className="trk-logo">
            <BrandLogo logoUrl={logoUrl} name={brand.companyName} />
          </div>
          <div className="trk-company">{brand.companyName}</div>
          {brand.tagline.sq ? <div className="trk-tagline">{brand.tagline.sq}</div> : null}
        </header>
        <main className="trk-body">
          <section className="trk-card trk-status">
            <div className="trk-gone">
              <Icon name="link" />
            </div>
            <h1 className="trk-title">{first}.</h1>
            <p className="trk-reassure">{rest.join('. ')}</p>
            {brand.contact.phone ? (
              <a className="btn btn--primary btn--lg btn--block" href={`tel:${brand.contact.phone}`}>
                <Icon name="phone" /> {fmtPhone(brand.contact.phone)}
              </a>
            ) : null}
          </section>
          <footer className="trk-foot">
            {brand.companyName}
            {brand.contact.city ? ` · ${brand.contact.city}` : ''}
          </footer>
        </main>
      </div>
    </>
  );
}
