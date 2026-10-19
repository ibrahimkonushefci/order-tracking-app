import path from 'node:path';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Db } from './connect';
import { isPostgresUrl } from './connect';

const migrationsFolder = path.resolve(process.cwd(), 'drizzle');

export async function runMigrations(db: Db, url?: string) {
  if (isPostgresUrl(url)) await migratePg(db as unknown as NodePgDatabase, { migrationsFolder });
  else await migratePglite(db, { migrationsFolder });
}
