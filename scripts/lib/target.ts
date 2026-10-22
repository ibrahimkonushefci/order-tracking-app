/**
 * Online installations ("targets") for the account, provision and start-fresh scripts. Each one
 * has its own gitignored settings file; they are read here, never `source`d by a shell (database
 * URLs contain '&') and never printed.
 *   populated         → .env.deploy.local (order-tracking-test: Druri Design + Lumi Dyer)
 *   <brand slug>      → .env.<slug>.local (one presentation company per database)
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { parse } from 'dotenv';

export const POPULATED = 'populated';

export function targetFile(name: string): string {
  if (name === POPULATED) return '.env.deploy.local';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) fail(`Emër i pavlefshëm: ${name}`);
  return `.env.${name}.local`;
}

export function readTarget(name: string): Record<string, string> {
  const file = targetFile(name);
  if (!fs.existsSync(file)) fail(`Mungon ${file}.`);
  const env = parse(fs.readFileSync(file));
  if (!/^postgres(ql)?:\/\//.test(env.DATABASE_URL ?? '')) fail(`${file}: DATABASE_URL mungon ose nuk është Postgres.`);
  return env;
}

/** Adds or replaces KEY=value lines, keeping the rest of the file as it is. */
export function writeTargetValues(name: string, values: Record<string, string>) {
  const file = targetFile(name);
  let text = fs.readFileSync(file, 'utf8');
  for (const [k, v] of Object.entries(values)) {
    const line = `${k}=${v}`;
    text = new RegExp(`^${k}=.*$`, 'm').test(text) ? text.replace(new RegExp(`^${k}=.*$`, 'm'), line) : `${text.replace(/\n?$/, '\n')}${line}\n`;
  }
  fs.writeFileSync(file, text, { mode: 0o600 });
}

/** Host and database name of a Postgres URL: what tells two databases apart. */
export function dbIdentity(url: string): { host: string; name: string } {
  const u = new URL(url);
  return { host: u.hostname.replace('-pooler.', '.'), name: u.pathname.replace(/^\//, '') };
}

/** Every other target that has a settings file here, with its database identity. */
export function otherTargets(name: string): { name: string; host: string; db: string }[] {
  const out: { name: string; host: string; db: string }[] = [];
  for (const f of fs.readdirSync('.')) {
    const m = f === '.env.deploy.local' ? [f, POPULATED] : /^\.env\.([a-z0-9-]+)\.local$/.exec(f);
    if (!m || m[1] === name) continue;
    const url = parse(fs.readFileSync(path.resolve(f))).DATABASE_URL;
    if (!url || !/^postgres(ql)?:\/\//.test(url)) continue;
    const id = dbIdentity(url);
    out.push({ name: m[1], host: id.host, db: id.name });
  }
  return out;
}

export function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

export function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : undefined;
}

export async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a = await new Promise<string>(r => rl.question(question, r));
  rl.close();
  return a.trim();
}

/** Typed without echo; the value never reaches the terminal, the shell history or a file. */
export async function askHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) fail('Fjalëkalimi shkruhet vetëm në një terminal.');
  process.stdout.write(question);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  let value = '';
  return new Promise(resolve => {
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          process.stdin.off('data', onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          return resolve(value);
        }
        if (ch === '\u0003') {
          process.stdout.write('\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    process.stdin.on('data', onData);
  });
}

export async function askNewPassword(): Promise<string> {
  const a = await askHidden('Fjalëkalimi i ri (të paktën 8 shenja): ');
  if (a.length < 8) fail('Fjalëkalimi duhet të ketë të paktën 8 shenja.');
  const b = await askHidden('Përsëriteni: ');
  if (a !== b) fail('Fjalëkalimet nuk përputhen. Asgjë nuk ndryshoi.');
  return a;
}
