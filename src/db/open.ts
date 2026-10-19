/** Opens the database and, for local PGlite, applies pending migrations first. */
import { createDb, isPostgresUrl, type Db } from './connect';
import { runMigrations } from './migrate';

export async function openDb(url = process.env.DATABASE_URL): Promise<Db> {
  const db = await createDb(url);
  if (!isPostgresUrl(url)) await runMigrations(db, url);
  return db;
}
