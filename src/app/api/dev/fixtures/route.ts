import { timingSafeEqual } from 'node:crypto';
import { getDb } from '@/db/client';
import { loadFixtures } from '@/db/fixtures';

/** Dev/demo only: lets `pnpm fixtures` reset the database while the app holds the PGlite folder. */
export async function POST(req: Request) {
  const expected = process.env.FIXTURES_TOKEN;
  if (process.env.DEMO_MODE !== 'true' || !expected) return new Response('Not found', { status: 404 });
  const got = req.headers.get('x-fixtures-token') ?? '';
  const ok = got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  if (!ok) return new Response('Forbidden', { status: 403 });
  await loadFixtures(await getDb(), {
    password: process.env.FIXTURE_PASSWORD ?? '',
    brandSlug: process.env.BRAND || 'druri-design',
  });
  return Response.json({ ok: true });
}
