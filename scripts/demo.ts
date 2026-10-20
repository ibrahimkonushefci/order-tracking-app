/**
 * pnpm demo: resets the database to the full demo data (every brand in brands/ with
 * "demo": true, each as its own company with Pronari + Zyra). The tests use `pnpm fixtures`
 * instead. PGlite allows one process per data folder, so while the app is running the reset
 * is done by the app itself (dev/demo endpoint); otherwise directly.
 */
import './env';
import { demoEmail } from '../src/db/demo/load';

const port = process.env.PORT || '3100';
const token = process.env.FIXTURES_TOKEN;
type Summary = { slug: string; orders: number; clients: number; openings: number }[];

async function viaRunningApp(): Promise<Summary | null> {
  if (!token) return null;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/dev/fixtures?set=demo`, {
      method: 'POST',
      headers: { 'x-fixtures-token': token },
      signal: AbortSignal.timeout(120_000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return (await res.json()).brands;
  } catch (e) {
    if (e instanceof TypeError) return null; // app not running
    throw e;
  }
}

let brands = await viaRunningApp();
if (brands) {
  console.log(`Demo u rivendos përmes aplikacionit në portin ${port}.`);
} else {
  const { openDb } = await import('../src/db/open');
  const { loadDemo } = await import('../src/db/demo/load');
  brands = await loadDemo(await openDb(), {
    password: process.env.FIXTURE_PASSWORD ?? '',
    first: process.env.BRAND,
  });
  console.log('Demo u rivendos direkt në bazën e të dhënave.');
}
for (const b of brands)
  console.log(
    `  ${b.slug}: ${b.orders} porosi, ${b.clients} klientë, ${b.openings} borxhe të bartura · ${demoEmail(b.slug, 'owner')} / ${demoEmail(b.slug, 'office')}`,
  );
console.log('Fjalëkalimi: FIXTURE_PASSWORD në .env.local (ose butonat e demos në faqen e hyrjes).');
process.exit(0);
