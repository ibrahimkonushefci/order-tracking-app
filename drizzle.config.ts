import { defineConfig } from 'drizzle-kit';

// Migrations are generated from the schema; they run against PGlite locally
// and against Neon in production (scripts/migrate.ts picks by DATABASE_URL).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
