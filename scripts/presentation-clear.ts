/**
 * pnpm presentation:clear <target>: "start fresh" for one presentation brand, only when you run it.
 * Removes clients, orders, visits, payments (incl. cash held by installers), opening balances,
 * messages and their history; keeps the owner, settings, branding, installers and the installer
 * and settings history (src/db/presentation.ts). Refuses unless every check below passes, then
 * asks for the company name:
 *  - the target is a presentation brand with a provisioned company (never "populated");
 *  - its database is the one recorded at provisioning, and no other target uses that database;
 *  - the database holds exactly one company, with the recorded id and brand (checked again in
 *    the clearing transaction).
 */
import { readBrand } from '../src/brand/files';
import { createDb } from '../src/db/connect';
import { businessCounts, clearPresentation } from '../src/db/presentation';
import { company } from '../src/db/schema';
import { ask, dbIdentity, fail, otherTargets, POPULATED, readTarget } from './lib/target';

const target = process.argv[2];
if (!target) fail('Përdorimi: pnpm presentation:clear <target>');
if (target === POPULATED) fail('populated nuk pastrohet kurrë.');
const env = readTarget(target);
const { CLEAN_COMPANY_ID: companyId, CLEAN_DB_HOST: host, CLEAN_DB_NAME: dbName, BRAND: slug } = env;
if (!companyId || !host || !dbName || !slug) fail(`${target}: mungojnë CLEAN_COMPANY_ID / CLEAN_DB_HOST / CLEAN_DB_NAME / BRAND (pnpm provision i shton).`);

const id = dbIdentity(env.DATABASE_URL);
if (id.host !== host || id.name !== dbName) fail(`DATABASE_URL e ${target} nuk është baza e regjistruar te provision: asgjë nuk u fshi.`);
const clash = otherTargets(target).find(o => o.host === id.host && o.db === id.name);
if (clash) fail(`${target} dhe ${clash.name} përdorin të njëjtën bazë: asgjë nuk u fshi.`);

const db = await createDb(env.DATABASE_URL);
const companies = await db.select({ id: company.id, brandSlug: company.brandSlug }).from(company);
if (companies.length !== 1 || companies[0].id !== companyId || companies[0].brandSlug !== slug)
  fail(`Baza ka ${companies.length} kompani ose kompania nuk është ${slug}: asgjë nuk u fshi.`);
const { brand } = await readBrand(slug);

const before = await businessCounts(db);
console.log(`${brand.companyName} · ${id.host}/${id.name}`);
console.log(`Para: ${fmt(before)}`);
const typed = await ask(`Shkruani "${brand.companyName}" për ta pastruar: `);
if (typed !== brand.companyName) fail('Nuk përputhet. Asgjë nuk u fshi.');

try {
  await clearPresentation(db, { companyId, brandSlug: slug });
} catch (e) {
  fail((e as Error).message);
}
console.log(`Pas:  ${fmt(await businessCounts(db))}`);
process.exit(0);

function fmt(c: Awaited<ReturnType<typeof businessCounts>>) {
  return `${c.clients} klientë · ${c.orders} porosi · ${c.openings} borxhe · ${c.payments} pagesa · ${c.visits} vizita · ${c.messages} mesazhe · ${c.history} historik · ${c.installers} montues · ${c.users} përdorues`;
}
