import { timingSafeEqual } from 'node:crypto';
import { getDb } from '@/db/client';
import { loadFixtures } from '@/db/fixtures';
import { loadDemo } from '@/db/demo/load';

/**
 * Dev/demo only: lets `pnpm fixtures` (the small test set) and `pnpm demo` (`?set=demo`, the full
 * demo data for every demo brand) reset the database while the app holds the PGlite folder, and
 * resets the online demo with curl.
 */
export async function POST(req: Request) {
  const expected = process.env.FIXTURES_TOKEN;
  if (process.env.DEMO_MODE !== 'true' || !expected) return new Response('Not found', { status: 404 });
  const got = req.headers.get('x-fixtures-token') ?? '';
  const ok = got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  if (!ok) return new Response('Forbidden', { status: 403 });
  const password = process.env.FIXTURE_PASSWORD ?? '';
  const brandSlug = process.env.BRAND || 'druri-design';
  if (new URL(req.url).searchParams.get('set') === 'demo') {
    const brands = await loadDemo(await getDb(), { password, first: brandSlug });
    return Response.json({ ok: true, set: 'demo', brands });
  }
  await loadFixtures(await getDb(), { password, brandSlug });
  return Response.json({ ok: true, set: 'fixtures' });
}
