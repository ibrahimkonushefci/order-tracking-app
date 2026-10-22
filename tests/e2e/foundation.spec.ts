import { expect, test, type Page } from '@playwright/test';

const PASSWORD = process.env.FIXTURE_PASSWORD!;

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Fjalëkalimi').fill(PASSWORD);
  await page.getByRole('button', { name: 'Hyr', exact: true }).click();
  await expect(page).toHaveURL('/');
}

test.beforeEach(async ({ context }) => {
  // The app's theme follows the device unless a choice is saved; start from light.
  await context.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-init')) {
      sessionStorage.setItem('e2e-init', '1');
      localStorage.setItem('ot-theme', 'light');
    }
  });
});

test('without a session every screen goes to the login', async ({ page }) => {
  for (const path of ['/', '/orders', '/debts', '/schedule', '/cash', '/settings']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test('a wrong password shows the Albanian error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('arben@druri.test');
  await page.getByLabel('Fjalëkalimi').fill('wrong-password');
  await page.getByRole('button', { name: 'Hyr', exact: true }).click();
  await expect(page.locator('.error[role=alert]')).toHaveText('Email ose fjalëkalim i gabuar.');
});

test('Pronari: the v10 shell, navigation and owner-only settings', async ({ page }) => {
  await login(page, 'arben@druri.test');
  await expect(page.locator('.app-header__sub')).toHaveText('Pronari · Arben');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Arben');
  for (const [label, heading] of [
    ['Porositë', 'Porositë'],
    ['Borxhet', 'Borxhet'],
    ['Orari', 'Orari'],
    ['Sot', /Arben/],
  ] as const) {
    await page.locator('.tabbar').getByRole('link', { name: label, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(page.locator('.tabbar').getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  await page.goto('/settings');
  const main = page.locator('#main-content');
  await expect(main.getByText('Arben', { exact: true })).toBeVisible();
  for (const name of ['Driton', 'Faton', 'Besnik']) await expect(main.getByText(name, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kapar' })).toBeEnabled();
  await expect(page.getByRole('link', { name: /Excel/ })).toBeVisible();
});

test('Montuesit: an unused one is deleted, one with records leaves the list only after the cash is handed over', async ({ page }) => {
  await login(page, 'arben@druri.test');
  await page.goto('/settings');
  const main = page.locator('#main-content');
  await page.getByRole('button', { name: 'Shto' }).click();
  let sheet = page.getByRole('dialog');
  await sheet.getByLabel('Emri').fill('Arianit');
  await sheet.getByLabel('Telefoni').fill('44 123 456');
  await sheet.getByRole('button', { name: 'Shto' }).click();
  await expect(main.getByText('Arianit', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Ndrysho Arianit' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Fshij montuesin' }).click();
  sheet = page.getByRole('dialog');
  await expect(sheet).toContainText('fshihet përgjithmonë');
  await sheet.getByRole('button', { name: 'Po, fshije' }).click();
  await expect(main.getByText('Arianit', { exact: true })).toHaveCount(0);

  // Driton holds today's 800€: he can't be removed until Pronari confirms the handover.
  await page.getByRole('button', { name: 'Ndrysho Driton' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Fshij montuesin' }).click();
  sheet = page.getByRole('dialog');
  await expect(sheet).toContainText('mban ende');
  await expect(sheet.getByRole('button', { name: 'Hiq nga lista' })).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Kthehu' }).click();
  await page.keyboard.press('Escape');
});

test('Zyra: same screens, but no settings changes or export', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await expect(page.locator('.app-header__sub')).toHaveText('Zyra · Teuta');
  await page.goto('/settings');
  await expect(page.getByText('Vetëm pronari mund t’i eksportojë të gjitha të dhënat.')).toBeVisible();
  const kapar = page.getByRole('button', { name: 'Kapar' });
  await expect(kapar).toBeDisabled();

  // The server refuses even if the button is forced on: the role is checked in the action.
  await kapar.evaluate(b => b.removeAttribute('disabled'));
  await kapar.click();
  await page.waitForTimeout(800);
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Avans' })).toHaveAttribute('aria-pressed', 'true');
});

test('no demo features: no one-tap logins, no ?brand=, no /setup, no demo routes', async ({ page, request }) => {
  await page.goto('/login?brand=lumi-dyer');
  await expect(page.getByRole('button', { name: /Hyr si/ })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Lumi');
  await expect(page).toHaveURL(/\/login\?brand=lumi-dyer$/);
  expect((await request.get('/demo/brand?slug=lumi-dyer&next=/', { maxRedirects: 0 })).status()).toBe(404);
  await login(page, 'arben@druri.test');
  expect((await page.goto('/setup'))!.status()).toBe(404);
  await expect(page.locator('.demo-bar')).toHaveCount(0);
  await page.goto('/settings');
  await expect(page.getByText(/Data e demos|\+7 ditë/)).toHaveCount(0);
});

test('Night Mode: light by default even on a dark device, one tap, saved per device, set before first paint', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => {
    new MutationObserver((_, o) => {
      if (document.body) {
        (window as unknown as { __themeAtBody?: string }).__themeAtBody = document.documentElement.dataset.theme;
        o.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await login(page, 'arben@druri.test');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Dritë / Errët' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  expect(await page.evaluate(() => (window as unknown as { __themeAtBody?: string }).__themeAtBody)).toBe('dark');
  const canvas = await page.locator('.app').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(canvas).toBe('rgb(18, 24, 22)'); // #121816
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Dritë', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('works offline: no request leaves the laptop', async ({ page }) => {
  const external: string[] = [];
  page.on('request', r => {
    const host = new URL(r.url()).hostname;
    if (!['localhost', '127.0.0.1'].includes(host) && !r.url().startsWith('data:')) external.push(r.url());
  });
  await login(page, 'arben@druri.test');
  await page.goto('/settings');
  await expect(page.locator('body')).toHaveCSS('font-family', /InterVariable/);
  expect(await page.evaluate(() => document.fonts.check('14px InterVariable'))).toBe(true);
  expect(external).toEqual([]);
});

test('the customer tracking page shows the neutral page for an unknown link', async ({ page }) => {
  await page.goto('/t/not-a-real-token');
  await expect(page.getByRole('heading', { name: 'Ky link nuk është më aktiv.' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByText('Na kontaktoni.')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('every screen size can sign out from Cilësimet', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await page.goto('/settings');
  // Review finding: on phones the sidebar logout is hidden; Cilësimet carries a visible one.
  const out = page.getByRole('button', { name: 'Dil (Teuta)' });
  await expect(out).toBeVisible();
  await out.click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login$/);
});
