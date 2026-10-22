/**
 * One database API for the laptop and production, selected only by DATABASE_URL:
 * - a `postgres://` URL → node-postgres (Neon in production)
 * - anything else (default `./data/pglite`) → embedded PGlite stored in that folder (offline laptop)
 */
import 'server-only';
import type { Db } from './connect';
import { openDb } from './open';

const g = globalThis as unknown as { __otDb?: Promise<Db> };

/** The app's shared connection; reused across hot reloads in dev. */
export function getDb(): Promise<Db> {
  g.__otDb ??= openDb();
  return g.__otDb;
}
