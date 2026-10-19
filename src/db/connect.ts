import fs from 'node:fs';
import path from 'node:path';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export type Db = ReturnType<typeof drizzlePglite<typeof schema>>;

export const DEFAULT_PGLITE_DIR = './data/pglite';

export const isPostgresUrl = (url?: string) => !!url && /^postgres(ql)?:\/\//.test(url);

/** Opens the database named by `url` (see client.ts). Used by the app, scripts and tests. */
export async function createDb(url?: string): Promise<Db> {
  if (isPostgresUrl(url)) {
    const { Pool } = await import('pg');
    // Both drivers expose the same Drizzle query API; the cast keeps one Db type.
    return drizzlePg(new Pool({ connectionString: url, max: 5 }), { schema }) as unknown as Db;
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = url === 'memory://' ? 'memory://' : path.resolve(url || DEFAULT_PGLITE_DIR);
  if (dir !== 'memory://') fs.mkdirSync(path.dirname(dir), { recursive: true });
  const client = await PGlite.create(dir);
  return drizzlePglite(client, { schema });
}
