import { timingSafeEqual } from 'node:crypto';
import { getDb } from '@/db/client';
import { isPostgresUrl } from '@/db/connect';
import { loadFixtures } from '@/db/fixtures';

/**
 * Tests only: lets `pnpm fixtures` and the e2e tests reset the database to the small fixture
 * set while the app holds the PGlite folder. It exists only on a laptop database (a folder,
 * never a postgres:// URL) with FIXTURES_TOKEN set, so no deployment can be emptied through it.
 */
export async function POST(req: Request) {
  const expected = process.env.FIXTURES_TOKEN;
  if (isPostgresUrl(process.env.DATABASE_URL) || !expected) return new Response('Not found', { status: 404 });
  const got = req.headers.get('x-fixtures-token') ?? '';
  const ok = got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  if (!ok) return new Response('Forbidden', { status: 403 });
  await loadFixtures(await getDb(), { password: process.env.FIXTURE_PASSWORD ?? '', brandSlug: process.env.BRAND || 'druri-design' });
  return Response.json({ ok: true, set: 'fixtures' });
}
