import type { Metadata, Viewport } from 'next';
import { cache, type CSSProperties } from 'react';
import { brandCssVars } from '@/brand/theme';
import { and, eq, ne } from 'drizzle-orm';
import { getActiveBrand } from '@/brand/active';
import { readBrand } from '@/brand/files';
import { BrandLogo } from '@/components/brand-logo';
import { Icon } from '@/components/icons';
import { getDb } from '@/db/client';
import { client, company, orders, visit } from '@/db/schema';
import { installedQty, isProject } from '@/domain/balances';
import { LANGS, type Lang } from '@/domain/messages';
import { headlineKey, TRACKING_TEXT, trackingSteps, trackTime, warmDate } from '@/domain/tracking';
import { nextVisit } from '@/domain/visits';
import { greetName } from '@/domain/messages';
import { THEME_KEY } from '@/lib/theme-script';
import { fmtPhone } from '@/lib/phone';
import { todayIso } from '@/lib/dates';

/** The order's own company decides the brand: the client has no login, and one installation can host several companies. */
async function brandFor(o: Awaited<ReturnType<typeof findOrder>>) {
  return o ? readBrand(o.brandSlug) : getActiveBrand();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { brand } = await brandFor(await findOrder((await params).token));
  return { title: { absolute: brand.companyName }, robots: { index: false, follow: false } };
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Viewport> {
  const { brand } = await brandFor(await findOrder((await params).token));
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: brand.colors.primary,
  };
}
export const dynamic = 'force-dynamic';

// Light unless this browser chose Night Mode in the app (the same saved choice as the staff screens).
const savedTheme = `var t=null;try{t=localStorage.getItem('${THEME_KEY}')}catch(e){}document.documentElement.dataset.theme=t==='dark'?'dark':'light';`;

/** The order behind a token, or null: unknown, replaced ("Link i ri") and cancelled links all look the same. */
async function loadTracked(token: string) {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ o: orders, c: client, brandSlug: company.brandSlug })
    .from(orders)
    .innerJoin(client, eq(client.id, orders.clientId))
    .innerJoin(company, eq(company.id, orders.companyId))
    .where(and(eq(orders.trackingToken, token), ne(orders.stage, 'cancelled')))
    .limit(1);
  if (!row) return null;
  const visits = await db.select().from(visit).where(eq(visit.orderId, row.o.id));
  return { ...row.o, client: row.c, visits, brandSlug: row.brandSlug };
}
/** Once per request: the metadata, the viewport and the page all need it. */
const findOrder = cache(loadTracked);

/**
 * Customer tracking page (spec §6): read-only, no login, noindex, in the client's language.
 * Three steps, one warm headline, the next visit and project progress. No prices, no balance.
 */
export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const o = await findOrder(token);
  const today = todayIso();
  const { brand, logoUrl } = await brandFor(o);
  // Several companies can share one installation, so the page carries its own brand colours.
  const scope = { className: 'trk brand-scope', style: brandCssVars(brand.colors) as CSSProperties };
  const lang: Lang = o ? (LANGS.find(l => l === o.client.language) ?? 'sq') : 'sq';
  const d = TRACKING_TEXT[lang];
  const tagline = brand.tagline[lang] || brand.tagline.sq;
  const wa = (brand.contact.whatsapp || brand.contact.phone).replace(/[^\d]/g, '');
  const hero = (
    <header className="trk-hero">
      <div className="trk-logo">
        <BrandLogo logoUrl={logoUrl} name={brand.companyName} />
      </div>
      <div className="trk-company">{brand.companyName}</div>
      {tagline ? <div className="trk-tagline">{tagline}</div> : null}
    </header>
  );
  const head = (
    <>
      <script dangerouslySetInnerHTML={{ __html: `${savedTheme}document.documentElement.lang=${JSON.stringify(lang)};` }} />
    </>
  );

  if (!o || o.stage === 'cancelled') {
    return (
      <>
        {head}
        <div {...scope}>
          {hero}
          <main className="trk-body">
            <section className="trk-card trk-status">
              <div className="trk-gone">
                <Icon name="link" />
              </div>
              <h1 className="trk-title">{d.inactive}</h1>
              <p className="trk-reassure">{d.contactUs}</p>
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

  const stage = o.stage as 'new' | 'active' | 'done';
  const project = isProject(o);
  const remaining = !!o.remainingWork;
  const key = headlineKey(stage, remaining, project);
  const nv = stage !== 'done' || remaining ? nextVisit(o.visits, today) : null;
  const tl = nv ? trackTime(nv.time, lang) : '';
  const steps = trackingSteps(stage, remaining);
  const n = project ? installedQty(o) : 0;
  const unit = d.units[o.unit ?? ''] ?? o.unit ?? '';
  const stepSub = (s: (typeof steps)[number]) =>
    s.state !== 'current' ? '' : s.key === 'done' && remaining ? d.finishing : s.key === 'active' && nv ? `${d.visitLabel[nv.type]}: ${warmDate(nv.date, today, lang)}` : d.now;
  return (
    <>
      {head}
      <div {...scope}>
        {hero}
        <main className="trk-body">
          <section className="trk-card trk-status">
            <p className="trk-hello">{d.hello(greetName(o.client.name))}</p>
            <h1 className="trk-title">{d.headline[key]}</h1>
            <p className="trk-reassure">{d.reassure[key]}</p>
            {nv ? (
              <div className="trk-when">
                <span className="trk-when__icon">
                  <Icon name="calendar" />
                </span>
                <div>
                  <div className="trk-when__label">{d.visitLabel[nv.type]}</div>
                  <div className="trk-when__date">{warmDate(nv.date, today, lang)}</div>
                  {tl ? <div className="trk-when__time">{tl}</div> : null}
                </div>
              </div>
            ) : null}
          </section>
          {project ? (
            <section className="trk-card">
              <div className="row row--between">
                <h2 className="trk-h2">{d.progressTitle}</h2>
                <b className="num">
                  {n} / {o.quantity}
                </b>
              </div>
              <div className="proj__bar proj__bar--lg">
                <span style={{ width: `${Math.min(100, (n / o.quantity!) * 100)}%` }} />
              </div>
              <p className="trk-muted">{d.progress(n, o.quantity!, unit)}</p>
            </section>
          ) : null}
          <section className="trk-card">
            <h2 className="trk-h2">{d.stepsTitle}</h2>
            <div className="trk-steps">
              {steps.map(s => (
                <div className={`trk-step trk-step--${s.state}`} key={s.key}>
                  <span className="trk-step__dot">{s.state === 'done' ? <Icon name="check" /> : null}</span>
                  <div>
                    <div className="trk-step__label">{d.steps[s.key]}</div>
                    {stepSub(s) ? <div className="trk-step__sub">{stepSub(s)}</div> : null}
                  </div>
                </div>
              ))}
            </div>
            <p className="trk-ref">{d.ref(o.number, o.productType)}</p>
          </section>
          <section className="trk-card trk-help">
            <h2 className="trk-h2">{d.helpTitle}</h2>
            <p className="trk-muted">{d.helpText}</p>
            {wa ? (
              <a className="btn btn--whatsapp btn--lg btn--block" href={`https://wa.me/${wa}`} target="_blank" rel="noopener">
                <Icon name="whatsapp" /> {d.whatsapp}
              </a>
            ) : null}
            <div className="trk-actions">
              {brand.contact.phone ? (
                <a className="btn btn--secondary" href={`tel:${brand.contact.phone}`}>
                  <Icon name="phone" /> {d.call}
                </a>
              ) : null}
              {brand.contact.viber ? (
                <a className="btn btn--secondary" href={`viber://chat?number=${encodeURIComponent(brand.contact.viber)}`}>
                  <span style={{ color: 'var(--color-viber)', display: 'flex' }}>
                    <Icon name="viber" />
                  </span>{' '}
                  {d.viber}
                </a>
              ) : null}
            </div>
            {brand.contact.address ? (
              <a
                className="trk-link"
                href={brand.contact.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${brand.contact.address}`)}`}
                target="_blank"
                rel="noopener"
              >
                <Icon name="nav" /> {d.directions(brand.contact.address)}
              </a>
            ) : null}
          </section>
          <footer className="trk-foot">
            <span>
              {brand.companyName}
              {brand.contact.address ? ` · ${brand.contact.address}` : ''}
            </span>
            <span>{d.onlyYou}</span>
          </footer>
        </main>
      </div>
    </>
  );
}
