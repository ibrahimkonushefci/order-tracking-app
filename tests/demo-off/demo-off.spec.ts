/**
 * With DEMO_MODE off (a client instance), none of the demo controls exist or work:
 * no one-tap logins, no demo bar or panel, no QR, no meeting number, no ?brand=, no reset
 * endpoint, no daily reseed. Run against an app started with DEMO_MODE=false (see README → Checks).
 */
import { expect, test } from '@playwright/test';

const PASSWORD = process.env.FIXTURE_PASSWORD!;

test('no demo logins, no ?brand=, no demo endpoints', async ({ page, request }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /Hyr si/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hyr', exact: true })).toBeVisible();

  const brand = await request.get('/login?brand=lumi-dyer', { maxRedirects: 0 });
  expect(brand.status()).toBe(200);
  expect(await brand.text()).not.toContain('Lumi Dyer');
  expect(
    (await request.get('/demo/brand?slug=lumi-dyer&next=/', { maxRedirects: 0 })).status(),
  ).toBe(404);
  for (const set of ['', '?set=demo'])
    expect(
      (
        await request.post(`/api/dev/fixtures${set}`, {
          headers: { 'x-fixtures-token': process.env.FIXTURES_TOKEN ?? '' },
        })
      ).status(),
    ).toBe(404);
});

test('signed in: no demo bar, panel, QR or meeting number; tracking links stay on this host', async ({
  page,
  context,
}) => {
  // A meeting-number cookie left from a demo is ignored.
  await context.addCookies([
    {
      name: 'ot-demo-phone',
      value: '+38344000111',
      url: process.env.DEMO_OFF_URL || 'http://127.0.0.1:3200',
    },
  ]);
  await page.goto('/login');
  await page.getByLabel('Email').fill('arben@druri.test');
  await page.getByLabel('Fjalëkalimi').fill(PASSWORD);
  await page.getByRole('button', { name: 'Hyr', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('.demo-bar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hap kontrollet e demos' })).toHaveCount(0);

  await page.goto('/orders?q=Dardan');
  await page.locator('a[href^="/orders/"]:visible', { hasText: 'Dardan Hoti' }).first().click();
  await page.getByText('Faqja e klientit', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'QR' })).toHaveCount(0);
  await expect(page.locator('.mono-box .ellipsis')).toHaveText(
    /^http:\/\/127\.0\.0\.1:3200\/t\/[0-9a-f]{32}$/,
  );

  await page.goto('/schedule?d=week');
  await page.locator('a[href^="/send/day/"]').first().click();
  await expect(page.getByText('Numri i takimit')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Parapamje në telefon/ })).toHaveCount(0);

  // An unknown record stays a 404 (the demo-mode fallback to the list is demo only).
  const missing = await page.goto('/orders/00000000-0000-4000-8000-000000000000');
  expect(missing?.status()).toBe(404);

  await page.goto('/settings');
  await expect(page.getByText('Data e demos')).toHaveCount(0);
  await page.goto('/setup');
  await expect(page.getByText('Konfigurimi i markës është i fikur')).toBeVisible();
});
