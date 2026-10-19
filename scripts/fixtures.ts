/**
 * pnpm fixtures: resets the database to the known fixture set.
 * PGlite allows one process per data folder, so while the app is running the
 * reset is done by the app itself (dev-only endpoint); otherwise directly.
 */
import './env';
import { FIXTURE_USERS } from '../src/db/fixtures';

const port = process.env.PORT || '3100';
const token = process.env.FIXTURES_TOKEN;

async function viaRunningApp(): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/dev/fixtures`, {
      method: 'POST',
      headers: { 'x-fixtures-token': token },
      signal: AbortSignal.timeout(60_000),
    });
    if (res.status === 404) return false;
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return true;
  } catch (e) {
    if (e instanceof TypeError) return false; // app not running
    throw e;
  }
}

if (await viaRunningApp()) {
  console.log(`Fixtures u ngarkuan përmes aplikacionit në portin ${port}.`);
} else {
  const { openDb } = await import('../src/db/open');
  const { loadFixtures } = await import('../src/db/fixtures');
  const db = await openDb();
  await loadFixtures(db, fixtureOptions());
  console.log('Fixtures u ngarkuan direkt në bazën e të dhënave.');
}
console.log(`Hyrja: ${FIXTURE_USERS.map(u => u.email).join(' · ')} (fjalëkalimi: FIXTURE_PASSWORD në .env.local)`);
process.exit(0);

function fixtureOptions() {
  return {
    password: process.env.FIXTURE_PASSWORD ?? '',
    brandSlug: process.env.BRAND || 'druri-design',
  };
}
