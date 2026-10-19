/**
 * Phase 4 through the real screens, on the fixtures: the €800 call from a visit in three taps,
 * planning with installer load, sending an installer's day and a reminder by hand ("U dërgua?"),
 * the tracking page in the client's language without any login, and a replaced link.
 */
import { expect, test, type Page } from '@playwright/test';

const PASSWORD = process.env.FIXTURE_PASSWORD!;

test.beforeEach(async ({ request, context }) => {
  const r = await request.post('/api/dev/fixtures', { headers: { 'x-fixtures-token': process.env.FIXTURES_TOKEN ?? '' } });
  expect(r.ok()).toBe(true);
  await context.addInitScript(() => localStorage.setItem('ot-theme', 'light'));
  // Click-to-send opens the person's own WhatsApp; the test only checks the link.
  await context.route(/^https:\/\/wa\.me\//, route => route.fulfill({ status: 200, body: 'wa' }));
});

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Fjalëkalimi').fill(PASSWORD);
  await page.getByRole('button', { name: 'Hyr' }).click();
  await expect(page).toHaveURL('/');
}

async function openOrder(page: Page, name: string) {
  await page.goto(`/orders?q=${encodeURIComponent(name)}`);
  await page.locator(`a[href^="/orders/"]:visible`, { hasText: name }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
}

test('the €800 call from the visit: three taps from the open order', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await openOrder(page, 'Naim Berisha');
  await page.getByRole('button', { name: 'Montimi u krye' }).click(); // 1
  const sheet = page.getByRole('dialog');
  await expect(sheet.locator('input[name=holder][value]:checked')).toHaveCount(0); // holder shows only once paid
  await sheet.getByText('Po, të gjitha €2.800').click(); // 2
  await expect(sheet.getByRole('radio', { name: 'Te Besnik' })).toBeChecked(); // the visit's installer is preselected
  await sheet.getByRole('button', { name: 'Ruaj' }).click(); // 3
  await expect(page.locator('.alert--warning')).toContainText('€2.800 te Besnik · pa dorëzuar ende');
  await expect(page.locator('.money__value')).toHaveText('€0');
  await expect(page.locator('.stepper3 .st--done')).toHaveAttribute('aria-current', 'step');
});

test('Planifiko vizitë shows each installer’s load on the chosen date', async ({ page }) => {
  await login(page, 'arben@druri.test');
  await openOrder(page, 'Blerta Kelmendi');
  await page.getByRole('button', { name: 'Planifiko' }).click();
  const sheet = page.getByRole('dialog');
  const friday = await page.evaluate(() => {
    const d = new Date();
    for (let i = 1; i <= 7; i++) {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      if (x.getDay() === 5) return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    }
    return '';
  });
  await sheet.locator('#vs-date').fill(friday);
  await expect(sheet.locator('.chip', { hasText: 'Driton' })).toContainText('2 punë');
  await expect(sheet.locator('.chip', { hasText: 'Faton' })).toContainText('i lirë');
  await sheet.locator('.chip', { hasText: 'Driton' }).click();
  await expect(sheet.locator('.avail-help')).toContainText('Dritoni ka 2 punë');
  await sheet.locator('.chip', { hasText: 'Faton' }).click();
  await expect(sheet.locator('.avail-help')).toContainText('Faton është i lirë në këtë datë.');
  await sheet.getByRole('button', { name: 'Ruaj', exact: true }).click();
  await expect(page.locator('.visit').filter({ hasText: 'Faton' }).first()).toBeVisible();
  await page.getByText('Historiku').click();
  await expect(page.locator('.timeline')).toContainText('Vizitë e planifikuar: Montim');
});

test('Dërgo Dritonit punët e nesërme → WhatsApp → "U dërgua?" → logged on the order', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await page.goto('/schedule?d=tomorrow');
  await page.getByRole('link', { name: /Dërgo Dritonit punët e nesërme/ }).click();
  const text = page.locator('#msg-text');
  await expect(text).toHaveValue(/^Punët për nesër,/);
  await expect(text).toHaveValue(/Liridona Shala · \+49 15 112 345678/);
  await expect(text).toHaveValue(/Mblidh: €900/);
  await page.getByText('Shto “Mblidh” në mesazh').click();
  await expect(text).not.toHaveValue(/Mblidh/);
  const send = page.getByRole('link', { name: 'Dërgo me WhatsApp' });
  await expect(send).toHaveAttribute('href', /^https:\/\/wa\.me\/38344281734\?text=Pun%C3%ABt%20p%C3%ABr%20nes%C3%ABr/);
  const [popup] = await Promise.all([page.waitForEvent('popup'), send.click()]);
  await popup.close();
  await page.getByRole('button', { name: 'Po, u dërgua' }).click();
  await expect(page).toHaveURL(/\/schedule\?d=tomorrow/);
  await expect(page.locator('.agenda__item', { hasText: 'Liridona Shala' })).toContainText('dërguar');
  await openOrder(page, 'Liridona Shala');
  await page.getByText('Historiku').click();
  await expect(page.locator('.timeline')).toContainText(/Lista e \d\d\.\d\d\.\d{4} u dërgua te Driton \(WhatsApp\)/);
});

test('Borxhet: the green "Kujtesë" opens the prepared reminder; after "Po, u dërgua" it waits 7 days', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await page.goto('/debts');
  const valon = page.locator('.debt', { hasText: 'Valon Hoxha' });
  await expect(page.locator('.debt', { hasText: 'Blerim Hasani' }).getByRole('link', { name: /Kujtesë/ })).toHaveCount(0);
  await valon.getByRole('link', { name: /Kujtesë/ }).click();
  await expect(page.locator('#msg-text')).toHaveValue(/vetëm një kujtesë e vogël për €1\.200/);
  await expect(page.locator('#msg-text')).toHaveValue(/Teuta, Druri Design$/);
  await page.getByRole('button', { name: 'Viber' }).click();
  await expect(page.getByRole('link', { name: 'Kopjo dhe hap Viber' })).toHaveAttribute('href', 'viber://chat?number=%2B38344318902');
  await page.getByRole('button', { name: 'WhatsApp' }).click();
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('link', { name: 'Dërgo me WhatsApp' }).click()]);
  await popup.close();
  await page.getByRole('button', { name: 'Po, u dërgua' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Valon Hoxha');
  await page.goto('/debts');
  await expect(page.locator('.debt', { hasText: 'Valon Hoxha' }).getByRole('link', { name: /Kujtesë/ })).toHaveCount(0);
  await expect(page.locator('.debt', { hasText: 'Valon Hoxha' })).toContainText('Kujtesa e fundit: sot');
});

test('the tracking page opens without any login, in the client’s language; "Link i ri" retires the old link', async ({ page, browser }) => {
  await login(page, 'teuta@druri.test');
  await openOrder(page, 'Liridona Shala');
  await page.getByText('Faqja e klientit', { exact: true }).click();
  const url = (await page.locator('.mono-box .ellipsis').textContent())!.trim();
  expect(url).toMatch(/\/t\/[0-9a-f]{32}$/);
  const path = new URL(url).pathname;

  const stranger = await browser.newContext();
  const p2 = await stranger.newPage();
  await p2.goto(path);
  await expect(p2.getByRole('heading', { level: 1 })).toHaveText('Ihr Auftrag ist in Arbeit');
  await expect(p2.locator('.trk-when')).toContainText('Montage');
  await expect(p2.locator('.trk-when')).toContainText('Morgen');
  await expect(p2.locator('.trk-steps')).toContainText('Auftrag erhalten');
  await expect(p2.locator('body')).not.toContainText('€');
  expect(await p2.locator('meta[name=robots]').getAttribute('content')).toContain('noindex');

  await page.getByRole('button', { name: 'Link i ri' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Krijo link të ri' }).click();
  await expect(page.locator('.mono-box .ellipsis')).not.toHaveText(url);
  await p2.goto(path);
  await expect(p2.getByRole('heading', { level: 1 })).toHaveText('Ky link nuk është më aktiv.');
  await expect(p2.locator('body')).not.toContainText('Liridona');
  // Staff screens stay behind the app login.
  await p2.goto('/schedule');
  await expect(p2).toHaveURL(/\/login/);
  await stranger.close();
});

test('Orari → Montuesit: availability grid and the per-installer summary', async ({ page }) => {
  await login(page, 'arben@druri.test');
  await page.goto('/schedule?d=team');
  await expect(page.locator('.avail__row', { hasText: 'Driton' }).locator('.avail__cell--2')).toHaveCount(1);
  await expect(page.locator('.inst', { hasText: 'Driton' })).toContainText('€800');
  await expect(page.locator('.inst', { hasText: 'Faton' })).toContainText('1 punë nga ditët e kaluara pa u shënuar');
  await page.locator('.avail__row', { hasText: 'Driton' }).locator('.avail__cell--2').click();
  await expect(page.locator('.agenda__item')).toHaveCount(2);
});

test('"Nga ditët e kaluara": one tap "U krye" on yesterday’s measurement', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await page.goto('/schedule');
  const row = page.locator('.agenda__item', { hasText: 'Granit Morina' });
  await row.getByRole('button', { name: 'U krye' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Po, u krye' }).click();
  await expect(page.getByText('Nga ditët e kaluara')).toHaveCount(0);
});

/* ───────── Review fixes: correcting a visit marked done, reminders on the demo date ───────── */

test('a visit marked done by mistake: "Nuk u krye" reopens it and the order; doing it again adds no payment', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await openOrder(page, 'Naim Berisha');
  await page.getByRole('button', { name: 'Montimi u krye' }).click();
  let sheet = page.getByRole('dialog');
  await sheet.getByText('Po, të gjitha €2.800').click();
  await sheet.getByRole('button', { name: 'Ruaj' }).click();
  await expect(page.locator('.money__value')).toHaveText('€0');

  // Ndrysho on the done visit: another installer, kept in the history.
  await page.getByText('Të kryera (1)').click();
  await page.getByRole('button', { name: 'Ndrysho vizitën e kryer' }).click();
  sheet = page.getByRole('dialog');
  await sheet.getByText('Driton', { exact: true }).click();
  await sheet.getByRole('button', { name: 'Ruaj' }).click();
  await expect(sheet).toHaveCount(0);
  await page.getByText('Historiku', { exact: true }).click();
  await expect(page.locator('.timeline')).toContainText('Vizita e kryer u ndryshua:');
  await expect(page.locator('.timeline')).toContainText('· Besnik → Montim ·');

  // Nuk u krye: the visit and the order are open again; the €2.800 with Besnik stays.
  await page.getByRole('button', { name: 'Ndrysho vizitën e kryer' }).click();
  sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Nuk u krye' }).click();
  await expect(sheet.getByRole('checkbox', { name: /Porosia nuk është e kryer ende/ })).toBeChecked();
  await expect(sheet).toContainText('Pagesat nuk ndryshojnë: €2.800 te Besnik');
  await sheet.getByRole('button', { name: 'Po, rikthe' }).click();
  await expect(page.getByRole('button', { name: 'Montimi u krye' })).toBeVisible();
  await expect(page.locator('.stepper3 .st--active')).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('.alert--warning')).toContainText('€2.800 te Besnik');

  // Marking it done again: nothing is left to pay, so no second payment.
  await page.getByRole('button', { name: 'Montimi u krye' }).click();
  sheet = page.getByRole('dialog');
  await expect(sheet.getByText('Po, të gjitha', { exact: false })).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Ruaj' }).click();
  await expect(page.locator('.stepper3 .st--done')).toHaveAttribute('aria-current', 'step');
  await page.getByText('Pagesat dhe llogaria').click();
  await expect(page.locator('.pay:not(.pay--deleted)', { hasText: '€2.800' })).toHaveCount(1);
});

test('demo date +7: a reminder logged then waits 7 simulated days, also after "Kthe në sot"', async ({ page }) => {
  await login(page, 'teuta@druri.test');
  await page.goto('/settings');
  await page.getByRole('button', { name: '+7 ditë' }).click();
  await expect(page.getByText(/\(\+7 ditë\)/)).toBeVisible();
  await page.goto('/debts');
  // Blerim's last reminder (3 days ago) is 10 days old on the demo date.
  const blerim = () => page.locator('.debt', { hasText: 'Blerim Hasani' });
  await blerim().getByRole('link', { name: /Kujtesë/ }).click();
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('link', { name: 'Dërgo me WhatsApp' }).click()]);
  await popup.close();
  await page.getByRole('button', { name: 'Po, u dërgua' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blerim Hasani');
  await page.goto('/debts');
  await expect(blerim().getByRole('link', { name: /Kujtesë/ })).toHaveCount(0);
  await expect(blerim()).toContainText('Kujtesa e fundit: sot');

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Kthe në sot' }).click();
  await expect(page.getByText(/\(\+7 ditë\)/)).toHaveCount(0);
  await page.goto('/debts');
  await expect(blerim().getByRole('link', { name: /Kujtesë/ })).toHaveCount(0);
  await expect(blerim()).toContainText('Kujtesa e fundit: sot');
});
