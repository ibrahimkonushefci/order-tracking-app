/** pnpm db:migrate: applies drizzle/ migrations to DATABASE_URL (Neon) or local PGlite. */
import './env';
import { createDb } from '../src/db/connect';
import { runMigrations } from '../src/db/migrate';

const url = process.env.DATABASE_URL;
const db = await createDb(url);
await runMigrations(db, url);
console.log(`Migrimet u aplikuan (${url?.startsWith('postgres') ? 'Postgres' : 'PGlite'}).`);
process.exit(0);
