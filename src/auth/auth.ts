import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { getDb } from '@/db/client';
import * as schema from '@/db/schema';
import type { Db } from '@/db/connect';

/**
 * Pronari and Zyra log in with email + password. There is no public sign-up:
 * accounts come from the fixtures now and from "Përdoruesit" (Pronari) later.
 */
function createAuth(db: Db) {
  return betterAuth({
    appName: 'Porositë',
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').filter(Boolean),
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    user: {
      additionalFields: {
        role: { type: 'string', input: false, defaultValue: 'office' },
        firstName: { type: 'string', input: false, defaultValue: '' },
        companyId: { type: 'string', input: false, required: false },
        active: { type: 'boolean', input: false, defaultValue: true },
      },
    },
    advanced: { database: { generateId: () => crypto.randomUUID() } },
    telemetry: { enabled: false },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const g = globalThis as unknown as { __otAuth?: Promise<Auth> };
export const getAuth = (): Promise<Auth> => (g.__otAuth ??= getDb().then(createAuth));
