import 'server-only';
import type { CurrentUser } from '@/auth/session';
import { isDemoMode } from '@/brand/active';
import type { Brand } from '@/brand/schema';
import { CATALOGS } from '@/db/demo/catalog';
import { demoBrands } from '@/db/demo/load';
import { getCompany } from '@/db/queries';
import { dative } from '@/domain/visits';
import { addDays, fmtLong } from '@/lib/dates';
import { fmtPhone } from '@/lib/phone';
import type { DemoInfo, DemoMoment } from '@/components/demo-bar';
import type { loadBook } from '@/services/book';
import { demoPhone, demoUsers } from './demo';
import { trackingUrl } from './jobs';

/** What the demo bar and panel show (demo mode only): shortcuts by the seed's key orders. */
export async function demoInfo(
  user: CurrentUser,
  brand: Brand,
  today: string,
  offset: number,
  book: Awaited<ReturnType<typeof loadBook>>,
): Promise<DemoInfo | null> {
  if (!isDemoMode() || !user.companyId) return null;
  const [c, brands, phone, people] = await Promise.all([
    getCompany(user.companyId),
    demoBrands(),
    demoPhone(),
    demoUsers(user.companyId),
  ]);
  const keys = c?.demo?.keys ?? {};
  const order = (k: string) => book.orders.find(o => o.id === keys[k]);
  const lead = book.installers.find(i => i.name === 'Driton') ?? book.installers[0];
  const project = order('project');
  const short = CATALOGS[brand.businessType]?.projects[0].short ?? '';
  const href = (k: string) => (order(k) ? `/orders/${order(k)!.id}` : null);

  const moments: DemoMoment[] = [
    { n: '1', short: 'Borxhet', label: 'Borxhet: kush më ka borxh', href: '/debts' },
    { n: '2', short: 'Klienti', label: 'Faqja e klientit: QR për telefonin', href: null, qr: true },
    {
      n: '3',
      short: 'WhatsApp',
      label: lead ? `Dërgoja ${dative(lead.name)} punët e nesërme` : 'Dërgo te montuesi',
      href: lead ? `/send/day/${lead.id}/${addDays(today, 1)}` : '/schedule',
    },
    {
      n: '4',
      short: 'Pagesa €800',
      label: `${lead?.name ?? 'Montuesi'} telefonon: “Mora €800”`,
      href: href('k800'),
    },
    {
      n: '+',
      short: 'Projekti',
      label: project ? `Projekti: ${short}` : 'Projekti',
      href: href('project') ?? '/orders?stage=projects',
    },
  ];

  const cases: DemoInfo['cases'] = [
    ['1', 'Sot', '/'],
    ['2', 'Borxhet', '/debts'],
    ['3', 'Para te montuesit', '/cash'],
    ['4', 'Projekti paguar përpara', href('ahead')],
    ['5', 'Orari · nesër', '/schedule?d=tomorrow'],
    ['6', 'Montuesit: disponueshmëria', '/schedule?d=team'],
    ['7', 'Porosi e re', '/orders/new'],
    ['7', 'Borxh i bartur', '/debts/new'],
    ['8', 'Porositë · bordi', '/orders?view=kanban'],
    ['+', 'Punë të mbetura + pauzë', href('remaining')],
    ['+', 'Mos sugjero kujtesa (kushëri)', href('cousin')],
    ['+', 'Pagesë e fshirë + çmim i ndryshuar', href('edited')],
    ['+', 'Kujtesë e mundshme (20 ditë)', href('overdue')],
    ['+', 'Matja e djeshme pa u shënuar', href('plan')],
    ['+', 'Klient në Gjermani (gjermanisht)', href('revoked')],
    ['+', 'Cilësimet & eksporti', '/settings'],
  ]
    .filter((x): x is [string, string, string] => !!x[2])
    .map(([n, label, h]) => ({ n, label, href: h }));

  const qr: DemoInfo['qr'] = [];
  const addQr = async (key: string, label: string, token: string | undefined) => {
    if (token) qr.push({ key, label, url: await trackingUrl(token), preview: `/t/${token}` });
  };
  await addQr(
    'track',
    `${order('track')?.client.name ?? 'Klienti'} · montimi nesër`,
    order('track')?.trackingToken,
  );
  await addQr('project', `Projekti · ${short}`, project?.trackingToken);
  await addQr(
    'de',
    `${order('revoked')?.client.name ?? 'Diaspora'} · Deutsch`,
    order('revoked')?.trackingToken,
  );
  await addQr('old', 'Link i zëvendësuar (jo aktiv)', keys.revokedToken);

  const first = (r: 'owner' | 'office') =>
    people.find(p => p.role === r)?.firstName ?? (r === 'owner' ? 'Pronari' : 'Zyra');
  return {
    brands: brands.map(b => ({ slug: b.slug, name: b.brand.shortName })),
    brandSlug: brand.slug,
    role: user.role,
    people: { owner: first('owner'), office: first('office') },
    moments,
    cases,
    qr,
    offset,
    date: fmtLong(today),
    phone: phone ? fmtPhone(phone) : null,
    hasDemoData: !!c?.demo,
  };
}
