/**
 * Phase 3 walkthrough through the real screens, on the Phase 3 fixtures (reloaded
 * before each test so the laptop and phone runs start from the same records).
 */
import { expect, test, type Page } from '@playwright/test';

const PASSWORD = process.env.FIXTURE_PASSWORD!;

test.beforeEach(async ({ request, context }) => {
  const r = await request.post('/api/dev/fixtures', { headers: { 'x-fixtures-token': process.env.FIXTURES_TOKEN ?? '' } });
  expect(r.ok()).toBe(true);
  await context.addInitScript(() => localStorage.setItem('ot-theme', 'light'));
});

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Fjalëkalimi').fill(PASSWORD);
  await page.getByRole('button', { name: 'Hyr', exact: true }).click();
  await expect(page).toHaveURL('/');
}

async function openOrder(page: Page, name: string) {
  await page.goto(`/orders?q=${encodeURIComponent(name)}`);
  // The table (laptop) and the row list (phone) both link the order; click the visible one.
  await page.locator(`a[href^="/orders/"]:visible`, { hasText: name }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
}

test('Sot and Borxhet add up', async ({ page }) => {
  await login(page, 'arben@druri.test');
  await expect(page.locator('.hero__value')).toHaveText('13,500€');
  await expect(page.locator('.hero__sub')).toContainText('gjithsej 15,250€');
  await expect(page.getByText('Driton: 800€ për t’u dorëzuar')).toBeVisible();
  await page.goto('/debts');
  await expect(page.locator('.summary')).toContainText('13,500€');
  await expect(page.locator('.summary')).toContainText('15,250€');
  await expect(page.locator('.debt').filter({ hasText: 'Ilir Gashi' })).toContainText('Mos sugjero kujtesa');
  await expect(page.locator('.debt').filter({ hasText: 'Mimoza Rexhepi' })).toContainText('Kujtesat në pauzë');
  await expect(page.locator('.debt').filter({ hasText: 'Shpresa Leka' })).toContainText('Afat i panjohur');
});

test('the 800€ call: E kryer, "Te Driton", then Konfirmo', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await openOrder(page, 'Arta Krasniqi');
  await page.locator('.stepper3 .st--active').click();
  await expect(page.locator('.stepper3 .st--active')).toHaveAttribute('aria-current', 'step');
  await page.locator('.stepper3 .st--done').click();
  const sheet = page.getByRole('dialog');
  await sheet.getByText('Po, të gjitha 3,000€').click();
  await sheet.getByText('Te Driton').click();
  await sheet.getByRole('button', { name: 'Po, u krye' }).click();
  await expect(page.locator('.alert--warning')).toContainText('3,000€ te Driton · pa dorëzuar ende');
  await expect(page.locator('.alert--warning')).toContainText('Për t’u mbledhur shtesë: 0€');
  await expect(page.locator('.money__value')).toHaveText('0€');
  await page.goto('/cash');
  await expect(page.locator('.card').filter({ hasText: 'Driton' })).toContainText('3,800€');
  await page.goto('/debts');
  await expect(page.locator('.debt').filter({ hasText: 'Arta Krasniqi' })).toHaveCount(0);
  await openOrder(page, 'Arta Krasniqi');
  await page.getByRole('button', { name: 'Konfirmo: i mora paratë nga Driton' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Po, i mora 3,000€' }).click();
  await expect(page.locator('.alert--warning')).toHaveCount(0);
  await expect(page.locator('.legend')).toContainText('Në zyrë 4,500€');
});

test('a payment edited and deleted changes the balance and shows in the history', async ({ page }) => {
  await login(page, 'arben@druri.test');
  await openOrder(page, 'Valon Hoxha');
  await expect(page.locator('.money__value')).toHaveText('1,200€');
  await page.getByText('Pagesat dhe llogaria').click();
  await page.getByRole('button', { name: 'Ndrysho pagesën' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.locator('input[name=amount]').fill('700');
  await sheet.getByRole('button', { name: 'Ruaj ndryshimet' }).click();
  await expect(page.locator('.money__value')).toHaveText('1,100€');
  await page.getByRole('button', { name: 'Ndrysho pagesën' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Fshij pagesën' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Shuma e gabuar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Fshij pagesën' }).click();
  await expect(page.locator('.money__value')).toHaveText('1,800€');
  await page.getByText('Historiku').click();
  await expect(page.locator('.timeline')).toContainText('Pagesa 700€');
  await expect(page.locator('.timeline')).toContainText('u fshi: Shuma e gabuar');
  await expect(page.locator('.timeline')).toContainText('Pagesa u ndryshua: 600€ → 700€');
});

test('a project: owed now, paid ahead, and "Shëno montim"', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await openOrder(page, 'Arbëria Invest sh.p.k.');
  await expect(page.locator('.money__value')).toHaveText('10,800€');
  await expect(page.locator('.proj2__gap')).toHaveText('E montuar, pa paguar: 10,800€');
  await openOrder(page, 'Ndërtimi Rugova sh.p.k.');
  await expect(page.locator('.proj2__gap')).toHaveText('Paguar përpara: 1,400€');
  await page.getByRole('button', { name: 'Shëno montim' }).click();
  await page.getByRole('dialog').locator('input[name=quantity]').fill('2');
  await page.getByRole('dialog').getByRole('button', { name: 'Ruaj' }).click();
  await expect(page.locator('.proj2__gap')).toHaveText('E montuar, pa paguar: 1,000€');
  await expect(page.locator('.ring__label')).toContainText('5/12');
});

test('Zyra can’t delete or export', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await openOrder(page, 'Dritë Hyseni');
  await page.getByText('Më shumë veprime').click();
  await expect(page.getByText('Anulo porosinë')).toBeVisible();
  await expect(page.getByText('Fshij porosinë')).toHaveCount(0);
  await openOrder(page, 'Valon Hoxha');
  await page.getByText('Pagesat dhe llogaria').click();
  await page.getByRole('button', { name: 'Ndrysho pagesën' }).click();
  await expect(page.getByRole('dialog')).toContainText('Vetëm pronari mund ta fshijë një pagesë.');
  expect((await page.request.get('/api/export?format=xlsx')).status()).toBe(403);
});

test('Pronari exports the Excel file and the JSON copy', async ({ page }) => {
  await login(page, 'arben@druri.test');
  await page.goto('/settings');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: /Excel/ }).click()]);
  expect(download.suggestedFilename()).toMatch(/^druri-design-te-dhenat-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const json = await (await page.request.get('/api/export?format=json')).json();
  expect(json.orders).toHaveLength(15);
});

test('Borxh i bartur with "Nuk e di" lands under "Afat i panjohur"', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await page.goto('/debts/new');
  await page.getByRole('button', { name: 'Ruaj borxhin' }).click();
  await expect(page.getByText('Zgjidhni: kur duhej paguar?')).toBeVisible();
  await page.getByLabel('Emri i klientit').fill('Gëzim Rama');
  await page.getByLabel('Sa ka borxh?').fill('320');
  await page.locator('[data-f=dueMode]').getByText('Nuk e di').click();
  await page.getByRole('button', { name: 'Ruaj borxhin' }).click();
  await expect(page).toHaveURL(/\/debts\?flash=/);
  await expect(page.locator('.debt--new')).toContainText('Gëzim Rama');
  await expect(page.locator('.debt--new')).toContainText('Afat i panjohur');
});

test('a returning client: picking the name fills the phone, and each order lists the other', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await page.goto('/orders/new');
  await page.locator('#no-name').fill('Arta Krasniqi');
  await expect(page.locator('#f-phone')).toHaveValue('44600700');
  await expect(page.getByText('Klient ekzistues · +38344600700')).toBeVisible();
  await page.locator('input[name=price]').fill('800');
  await page.getByRole('button', { name: 'Ruaj porosinë' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Arta Krasniqi');
  await page.locator('details.fold').filter({ has: page.locator('.fold__title', { hasText: /^Klienti$/ }) }).locator('summary').click();
  await expect(page.locator('.panel-links a', { hasText: '2026-011' })).toBeVisible();
});

test('a failed save keeps everything typed: the new order and the notebook debt', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await page.goto('/orders/new');
  await page.locator('#no-name').fill('Kujtim Bajrami');
  await page.locator('#f-phone').fill('44 900 100');
  await page.locator('input[name=description]').fill('Kuzhinë në formë U');
  await page.locator('input[name=price]').fill('1000');
  await page.locator('input[name=deposit]').fill('1500');
  await page.locator('textarea[name=directions]').fill('Te shkolla e vjetër, shtëpia e tretë');
  await page.locator('textarea[name=internalNote]').fill('Rekomandim nga Shpendi');
  await page.getByRole('button', { name: 'Ruaj porosinë' }).click();
  await expect(page.getByText('Paradhënia nuk mund të jetë më e madhe se çmimi.')).toBeVisible();
  await expect(page.locator('#no-name')).toHaveValue('Kujtim Bajrami');
  await expect(page.locator('#f-phone')).toHaveValue('44 900 100');
  await expect(page.locator('input[name=description]')).toHaveValue('Kuzhinë në formë U');
  await expect(page.locator('input[name=price]')).toHaveValue('1000');
  await expect(page.locator('input[name=deposit]')).toHaveValue('1500');
  await expect(page.locator('textarea[name=directions]')).toHaveValue('Te shkolla e vjetër, shtëpia e tretë');
  await expect(page.locator('textarea[name=internalNote]')).toHaveValue('Rekomandim nga Shpendi');
  // Fix only the deposit and save: the order is created with the rest as typed.
  await page.locator('input[name=deposit]').fill('500');
  await page.getByRole('button', { name: 'Ruaj porosinë' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kujtim Bajrami');

  await page.goto('/debts/new');
  await page.getByLabel('Emri i klientit').fill('Gëzim Rama');
  await page.locator('#ob-phone').fill('45 222 333');
  await page.getByLabel('Sa ka borxh?').fill('320');
  await page.getByLabel('Për çfarë ishte?').fill('Dyer, 2024');
  await page.locator('#ob-note').fill('Paguan pas verës');
  await page.getByRole('button', { name: 'Ruaj borxhin' }).click();
  await expect(page.getByText('Zgjidhni: kur duhej paguar?')).toBeVisible();
  await expect(page.getByLabel('Emri i klientit')).toHaveValue('Gëzim Rama');
  await expect(page.locator('#ob-phone')).toHaveValue('45 222 333');
  await expect(page.getByLabel('Sa ka borxh?')).toHaveValue('320');
  await expect(page.getByLabel('Për çfarë ishte?')).toHaveValue('Dyer, 2024');
  await expect(page.locator('#ob-note')).toHaveValue('Paguan pas verës');
});

test('Ndrysho borxhin: Zyra corrects the amount and an existing due date', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await page.goto('/debts');
  await page.locator('a:visible', { hasText: 'Blerim Hasani' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blerim Hasani');
  await page.getByRole('button', { name: 'Ndrysho', exact: true }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Sa ka borxh?').fill('');
  await sheet.getByRole('button', { name: 'Ruaj ndryshimet' }).click();
  await expect(sheet.getByText('Shkruani shumën e borxhit.')).toBeVisible();
  await expect(sheet.getByLabel('Emri i klientit')).toHaveValue('Blerim Hasani');
  await sheet.getByLabel('Sa ka borxh?').fill('400');
  const [y, m, d] = new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10).split('-');
  await sheet.getByLabel('Data e pagesës').fill(`${d}/${m}/${y.slice(2)}`);
  await sheet.getByRole('button', { name: 'Ruaj ndryshimet' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.money__value')).toHaveText('400€');
  await expect(page.locator('.badge--danger')).toContainText('5 ditë');
  await page.getByText('Historiku').click();
  await expect(page.locator('.timeline')).toContainText('Shuma e borxhit: 450€ → 400€');
  await expect(page.locator('.timeline')).toContainText('Kur duhej paguar:');
});

test('Montimet e kryera: Zyra edits a part, Pronari deletes one; payments stay', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await openOrder(page, 'Ndërtimi Rugova sh.p.k.');
  await page.getByText(/Montimet e kryera/).click();
  await page.getByRole('button', { name: 'Ndrysho montimin' }).click();
  let sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('button', { name: 'Fshij montimin' })).toHaveCount(0);
  await sheet.locator('input[name=quantity]').fill('5');
  await sheet.getByRole('button', { name: 'Ruaj' }).click();
  await expect(page.locator('.ring__label')).toContainText('5/12');
  await expect(page.locator('.proj2__gap')).toHaveText('E montuar, pa paguar: 1,000€');
  await page.getByText('Historiku').click();
  await expect(page.locator('.timeline')).toContainText('Sasia: 3 copë → 5 copë');

  await page.context().clearCookies();
  await login(page, 'arben@druri.test');
  await openOrder(page, 'Ndërtimi Rugova sh.p.k.');
  await page.getByText(/Montimet e kryera/).click();
  await page.getByRole('button', { name: 'Ndrysho montimin' }).click();
  sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Fshij montimin' }).click();
  await sheet.getByRole('button', { name: 'Fshij montimin' }).click();
  await expect(page.locator('.ring__label')).toContainText('0/12');
  await expect(page.locator('.proj2__gap')).toHaveText('Paguar përpara: 5,000€');
});
