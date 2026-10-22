/**
 * pnpm provision <target> --name "Ibrahim" --email ibrahim@order-tracking.test
 * Sets up an empty presentation database: applies the migrations, then creates the company of
 * the target's BRAND with one owner (full permissions), no installers and no records. The
 * password is typed here, hidden. Refuses when the database already has a company. Saves the
 * company id and the database identity in the target's file, so start fresh can check them.
 */
import { readBrand } from '../src/brand/files';
import { createDb } from '../src/db/connect';
import { runMigrations } from '../src/db/migrate';
import { provisionCompany } from '../src/db/presentation';
import { arg, askNewPassword, dbIdentity, fail, POPULATED, readTarget, writeTargetValues } from './lib/target';

const target = process.argv[2];
if (!target || target.startsWith('-')) fail('Përdorimi: pnpm provision <target> --name "Emri" --email adresa@shembull.test');
if (target === POPULATED) fail('populated ka tashmë kompanitë e veta: provision bëhet vetëm në një bazë prezantimi.');
const env = readTarget(target);
const name = arg('--name') ?? fail('Mungon --name.');
const email = arg('--email') ?? fail('Mungon --email.');
const { brand, fallback } = await readBrand(env.BRAND);
if (fallback || brand.slug !== target) fail(`BRAND=${env.BRAND ?? ''}: mungon brands/${target}/brand.json ose nuk përputhet me ${target}.`);

console.log(`${brand.companyName} (${brand.businessType}, ${brand.depositWord}) · pronari ${name} <${email}>`);
const password = await askNewPassword();
const db = await createDb(env.DATABASE_URL);
await runMigrations(db, env.DATABASE_URL);
try {
  const { companyId } = await provisionCompany(db, { brand, owner: { name, email, password } });
  const id = dbIdentity(env.DATABASE_URL);
  writeTargetValues(target, { CLEAN_COMPANY_ID: companyId, CLEAN_DB_HOST: id.host, CLEAN_DB_NAME: id.name });
  console.log(`Gati: ${brand.companyName} me një pronar. Hyrja: ${email} në ${env.APP_URL ?? '(APP_URL mungon)'}.`);
} catch (e) {
  fail((e as Error).message);
}
process.exit(0);
