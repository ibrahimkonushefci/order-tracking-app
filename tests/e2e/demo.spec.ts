/**
 * Phase 5 demo mode on the full demo data (`?set=demo`, reloaded before each test): one-tap
 * logins, the demo bar and panel, `?brand=` with its own data, the QR for the owner's phone,
 * "Numri i takimit", the demo date and "Rivendos demon". The small fixtures are put back
 * afterwards for the other specs.
 */
import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const TOKEN = process.env.FIXTURES_TOKEN ?? '';
const PUBLIC = (process.env.DEMO_PUBLIC_URL || process.env.APP_URL || '').replace(/\/$/, '');
const demoToken = (slug: string, key: string) =>
  createHash('sha256').update(`order-tracking-demo:${slug}:${key}`).digest('hex').slice(0, 32);

test.beforeEach(async ({ request, context }) => {
  const r = await request.post('/api/dev/fixtures?set=demo', {
    headers: { 'x-fixtures-token': TOKEN },
  });
  expect(r.ok()).toBe(true);
  await context.addInitScript(() => localStorage.setItem('ot-theme', 'light'));
  await context.route(/^https:\/\/wa\.me\//, route => route.fulfill({ status: 200, body: 'wa' }));
});

test.afterAll(async ({ request }) => {
  await request.post('/api/dev/fixtures', { headers: { 'x-fixtures-token': TOKEN } });
});

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 760;

async function demoLogin(page: Page, who: 'Arben' | 'Teuta') {
  await page.goto('/login');
  await page.getByRole('button', { name: `Hyr si ${who}` }).click();
  await expect(page).toHaveURL('/');
}

/** The demo panel ("Më shumë…" on laptops, the Demo button in the header on phones). */
async function openPanel(page: Page) {
  if (isPhone(page)) await page.getByRole('button', { name: 'Hap kontrollet e demos' }).click();
  else await page.locator('.demo-bar').getByRole('button', { name: 'Më shumë…' }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'Demo' })).toBeVisible();
  return sheet;
}

test('one-tap logins for Pronari and Zyra, with the demo data', async ({ page }) => {
  await demoLogin(page, 'Teuta');
  await expect(page.locator('.app-header__sub')).toHaveText('Zyra · Teuta');
  await expect(page.locator('.hero')).toContainText('Arbëria Invest sh.p.k.');
  await page.goto('/orders');
  await expect(page.getByText('57 porosi')).toBeVisible();
});

test('the 800€ moment from the demo panel: three taps, owed 0€, the cash waits with Driton', async ({
  page,
}) => {
  await demoLogin(page, 'Arben');
  const sheet = await openPanel(page);
  await sheet.getByRole('link', { name: 'Driton telefonon: “Mora 800€”' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fatmir Krasniqi');
  await expect(
    page.locator('.money, .card').filter({ hasText: 'Mbetur nga totali' }).first(),
  ).toContainText('800€');
  await page.getByRole('button', { name: 'Montimi u krye' }).click(); // 1
  const done = page.getByRole('dialog');
  await done.getByText('Po, të gjitha 800€').click(); // 2
  await expect(done.getByRole('radio', { name: 'Te Driton' })).toBeChecked(); // the visit's installer
  await done.getByRole('button', { name: 'Ruaj' }).click(); // 3
  await expect(page.locator('.alert--warning')).toContainText('800€ te Driton');
  await page.goto('/cash');
  await expect(page.getByText('Fatmir Krasniqi')).toBeVisible();
});

test('"Shiko si" switches between Arben and Teuta on the same screen', async ({ page }) => {
  await demoLogin(page, 'Arben');
  await page.goto('/debts');
  const sheet = await openPanel(page);
  await sheet.getByRole('button', { name: 'Teuta · Zyra' }).click();
  await expect(page.locator('.app-header__sub')).toHaveText('Zyra · Teuta');
  await expect(page).toHaveURL('/debts');
});

test('?brand= switches the logo, the people and the data together; the tracking page follows the order', async ({
  page,
  browser,
}) => {
  await demoLogin(page, 'Arben');
  await page.goto('/orders?brand=lumi-dyer');
  await expect(page).toHaveURL('/orders');
  await expect(page.locator('.app-header__title')).toHaveText('Lumi Dyer & Parket');
  await expect(page.locator('.app-header__sub')).toHaveText('Pronari · Burim');
  await expect(
    page.locator('#main-content').getByText('Dyer të brendshme').filter({ visible: true }).first(),
  ).toBeVisible();

  // The owner's phone: no cookies, no login.
  const phone = await (await browser.newContext()).newPage();
  await phone.goto(`/t/${demoToken('lumi-dyer', 'track')}`);
  await expect(phone).toHaveTitle('Lumi Dyer & Parket');
  await expect(phone.locator('.trk-company')).toHaveText('Lumi Dyer & Parket');
  await expect(phone.locator('.trk-when')).toContainText('Nesër');
  await expect(phone.locator('.trk-when')).toContainText('paradite');
  await phone.goto(`/t/${demoToken('druri-design', 'track')}`);
  await expect(phone.locator('.trk-company')).toHaveText('Druri Design');
  await phone.goto(`/t/${demoToken('druri-design', 'revoked')}`);
  await expect(phone.getByRole('heading', { level: 1 })).toHaveText('Ky link nuk është më aktiv.');
  await phone.goto(`/t/${demoToken('druri-design', 'revoked-new')}`);
  await expect(phone.getByRole('heading', { level: 1 })).toHaveText('Ihr Auftrag ist in Arbeit');

  await page.goto('/?brand=druri-design');
  await expect(page.locator('.app-header__sub')).toHaveText('Pronari · Arben');
});

/** Clicks "Lumi" where the person would: the demo bar on laptops, the Demo panel on phones. */
async function switchToLumi(page: Page) {
  if (isPhone(page)) {
    const sheet = await openPanel(page);
    await sheet.getByRole('link', { name: 'Lumi', exact: true }).click();
  } else {
    await page.locator('.demo-bar').getByRole('link', { name: 'Lumi', exact: true }).click();
  }
}

test('switching brand from an order lands on the new brand’s list, same role (no 404)', async ({ page }) => {
  await demoLogin(page, 'Teuta');
  const sheet = await openPanel(page);
  await sheet.getByRole('link', { name: 'Driton telefonon: “Mora 800€”' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fatmir Krasniqi');
  const druriOrder = new URL(page.url()).pathname;
  await switchToLumi(page);
  await expect(page).toHaveURL('/orders');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Porositë');
  await expect(page.locator('.app-header__title')).toHaveText('Lumi Dyer & Parket');
  await expect(page.locator('.app-header__sub')).toHaveText('Zyra · Vjosa');
  // The old order's URL, typed or from history, is handled by the server too.
  await page.goto(druriOrder);
  await expect(page).toHaveURL('/orders');
});

test('the brand buttons keep the current view and its filters', async ({ page }) => {
  await demoLogin(page, 'Arben');
  await page.goto('/orders?stage=project&view=kanban');
  await switchToLumi(page);
  await expect(page.locator('.app-header__title')).toHaveText('Lumi Dyer & Parket');
  await expect(page).toHaveURL('/orders?stage=project&view=kanban');
});

test('switching brand from debt, message and installer screens; lists keep their place', async ({ page }) => {
  await demoLogin(page, 'Arben');
  await page.goto('/orders?q=Fatmir');
  await page.locator('a[href^="/orders/"]:visible', { hasText: 'Fatmir Krasniqi' }).first().click();
  const orderId = new URL(page.url()).pathname.split('/')[2];
  const visitSend = await page.locator('a[href^="/send/visit/"]').first().getAttribute('href');
  await page.goto('/debts');
  const debt = await page.locator('a[href^="/debts/"]:not([href="/debts/new"])').first().getAttribute('href');
  await page.goto('/schedule?d=tomorrow');
  const day = await page.locator('a[href^="/send/day/"]').first().getAttribute('href');
  const cases: [string, string][] = [
    [debt!, '/debts'],
    [`/compose/order/${orderId}?t=link`, '/orders'],
    [`/compose/opening/${debt!.split('/')[2]}`, '/debts'],
    [visitSend!, '/schedule'],
    [day!, '/schedule'],
  ];
  for (const [from, to] of cases) {
    await page.goto(`${from}${from.includes('?') ? '&' : '?'}brand=lumi-dyer`);
    await expect(page, from).toHaveURL(to);
    await expect(page.locator('.app-header__sub')).toHaveText('Pronari · Burim');
    await page.goto('/?brand=druri-design');
    await expect(page.locator('.app-header__sub')).toHaveText('Pronari · Arben');
  }
  // Dashboard and lists stay where they are, with their filters.
  for (const p of ['/', '/debts', '/orders?stage=done', '/schedule?d=tomorrow']) {
    await page.goto(`${p}${p.includes('?') ? '&' : '?'}brand=lumi-dyer`);
    await expect(page).toHaveURL(p);
    await expect(page.locator('.app-header__title')).toHaveText('Lumi Dyer & Parket');
    await page.goto('/?brand=druri-design');
  }
});

test('the QR opens the tracking page on the public HTTPS demo', async ({ page }) => {
  await demoLogin(page, 'Arben');
  const sheet = await openPanel(page);
  await sheet.getByRole('button', { name: /Faqja e klientit/ }).click();
  const qr = page.getByRole('dialog');
  await expect(qr.getByRole('img', { name: /Kodi QR: Besa Zeka/ })).toBeVisible();
  const url = (await qr.locator('.mono-box .ellipsis').textContent())!.trim();
  expect(url).toBe(`${PUBLIC || 'http://localhost:3100'}/t/${demoToken('druri-design', 'track')}`);
  if (PUBLIC) await expect(qr.getByText(/Hapet në demon online/)).toBeVisible();
  // Other pages to show: the project's progress, the German page, a replaced link.
  for (const label of [/Projekti · 24 kuzhina/, /Liridona Shala · Deutsch/, /Link i zëvendësuar/])
    await expect(qr.getByText(label)).toBeVisible();
});

test('"Numri i takimit": the prepared message can go to the owner’s phone, reviewed and sent by hand', async ({
  page,
}) => {
  await demoLogin(page, 'Arben');
  let sheet = await openPanel(page);
  await sheet.getByLabel('Numri i takimit').fill('44 000 111');
  await sheet.getByRole('button', { name: 'Ruaj numrin' }).click();
  await expect(sheet.getByText('Numri i takimit: +383 44 000 111')).toBeVisible();
  await sheet.getByRole('link', { name: 'Dërgoja Dritonit punët e nesërme' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dërgo Dritonit');
  const text = await page.locator('#msg-text').inputValue();
  expect(text).toContain('Besa Zeka');
  expect(text).toContain('Rinor Avdiu');
  expect(text).toMatch(/Mblidh: [0-9,]+€/);
  const wa = page.getByRole('link', { name: 'Dërgo me WhatsApp' });
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/38344000111\?text=/);
  await page.locator('label.chip', { hasText: 'Driton · +383 44 281 734' }).click();
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/38344281734\?text=/);
  // Nothing is logged until the person says it was sent.
  sheet = await openPanel(page);
  await sheet.getByRole('button', { name: 'Hiqe' }).click();
  await expect(sheet.getByText('Numri i takimit', { exact: true })).toBeVisible();
});

test('demo date and "Rivendos demon" return to the predictable start', async ({ page }) => {
  await demoLogin(page, 'Teuta');
  let sheet = await openPanel(page);
  await sheet.getByRole('button', { name: '+7 ditë' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Teuta');
  await expect(page.locator('.page-head__sub')).toContainText('demo +7 ditë');

  // Change something, then reset.
  await page.goto(`/orders?q=${encodeURIComponent('Fatmir Krasniqi')}`);
  await page.locator('a[href^="/orders/"]:visible', { hasText: 'Fatmir Krasniqi' }).first().click();
  await page.getByRole('button', { name: 'Montimi u krye' }).click();
  await page.getByRole('dialog').getByText('Po, të gjitha 800€').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ruaj' }).click();
  await expect(page.locator('.alert--warning')).toContainText('800€ te Driton');

  sheet = await openPanel(page);
  await sheet.getByRole('button', { name: 'Rivendos demon' }).click();
  await sheet.getByRole('button', { name: 'Po, rivendos' }).click();
  await expect(page).toHaveURL(/\/\?reset=1$/);
  await expect(page.locator('.app-header__sub')).toHaveText('Zyra · Teuta');
  await expect(page.locator('.page-head__sub')).not.toContainText('demo +');
  await page.goto('/cash');
  await expect(page.getByText('Fatmir Krasniqi')).toHaveCount(0);
});

test('the installable app: a manifest with PNG icons in the brand', async ({ request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m.display).toBe('standalone');
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  expect(m.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
  for (const src of [
    '/brand/icon/192',
    '/brand/icon/512',
    '/brand/icon/512?maskable=1',
    '/brand/icon/180',
  ]) {
    const r = await request.get(src);
    expect(r.ok()).toBe(true);
    expect(r.headers()['content-type']).toBe('image/png');
  }
});
