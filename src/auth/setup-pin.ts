import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/** /setup is a demo convenience behind a PIN (spec), on top of the Pronari login. */
export const SETUP_COOKIE = 'ot-setup';

const mac = (pin: string) =>
  createHmac('sha256', process.env.BETTER_AUTH_SECRET || 'dev').update(`setup:${pin}`).digest('base64url');

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function pinMatches(input: string): boolean {
  const pin = process.env.SETUP_PIN;
  return !!pin && same(input, pin);
}

export async function hasSetupAccess(): Promise<boolean> {
  const pin = process.env.SETUP_PIN;
  const got = (await cookies()).get(SETUP_COOKIE)?.value;
  return !!pin && !!got && same(got, mac(pin));
}

export async function grantSetupAccess() {
  (await cookies()).set(SETUP_COOKIE, mac(process.env.SETUP_PIN!), {
    httpOnly: true,
    sameSite: 'strict',
    path: '/setup',
    maxAge: 60 * 60,
  });
}
