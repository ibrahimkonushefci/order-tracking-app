/**
 * Shared pieces of the service layer: who is acting, validation errors that the
 * forms show next to a field, and the append-only history.
 *
 * Services take the database as a parameter, so the server actions and the tests
 * run exactly the same code. Every service checks the role itself (spec: Permissions).
 */
import { createTranslator } from 'next-intl';
import messages from '../../messages/sq.json';
import { assertCan, type Action } from '@/auth/permissions';
import type { Db } from '@/db/connect';
import { history, type Role } from '@/db/schema';

export interface Actor {
  id: string;
  role: Role;
  companyId: string;
  firstName: string;
}

export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type DbOrTx = Db | Tx;

/** History lines and other stored words come from the message file, not from code. */
export const th = createTranslator({ locale: 'sq', messages, namespace: 'history' });
export const tw = createTranslator({ locale: 'sq', messages, namespace: 'words' });

/** A validation error for one form field; `key` is an i18n key under `errors`. */
export class FieldError extends Error {
  constructor(
    public field: string,
    public key: string,
    public params: Record<string, string | number> = {},
  ) {
    super(`${field}:${key}`);
  }
}

/** Several field errors at once (forms show them together, like the prototype). */
export class FieldErrors extends Error {
  constructor(public errors: FieldError[]) {
    super(errors.map(e => e.message).join(', '));
  }
}

/** Runs one field's check; a FieldError is collected instead of thrown. */
export function check<T>(errors: FieldError[], fn: () => T): T | undefined {
  try {
    return fn();
  } catch (e) {
    if (e instanceof FieldError) {
      errors.push(e);
      return undefined;
    }
    throw e;
  }
}

export function throwIf(errors: FieldError[]) {
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new FieldErrors(errors);
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`not found: ${what}`);
  }
}

export function allow(actor: Actor, action: Action) {
  assertCan(actor.role, action);
}

export async function log(
  db: DbOrTx,
  actor: Actor,
  recordType: 'order' | 'opening' | 'client' | 'installer' | 'settings',
  recordId: string | null,
  text: string,
  change?: { field: string; old?: string | null; new?: string | null },
) {
  await db.insert(history).values({
    companyId: actor.companyId,
    recordType,
    recordId,
    userId: actor.id,
    text,
    field: change?.field ?? null,
    oldValue: change?.old ?? null,
    newValue: change?.new ?? null,
  });
}

/**
 * Phone input → E.164. "044 123 456" with +383 → "+38344123456"; "(+383)44123456" → "+38344123456";
 * null when it doesn't look like a number (letters included).
 */
export function toE164(cc: string, raw: string): string | null {
  const t = String(raw ?? '').trim().replace(/[\s()\-./]/g, '');
  if (!t) return null;
  if (/[^\d+]/.test(t)) return null;
  if (t.startsWith('+') || t.startsWith('00')) {
    const d = t.replace(/^00/, '+').replace(/[^\d+]/g, '');
    return /^\+\d{8,15}$/.test(d) ? d : null;
  }
  const digits = t.replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length < 6 || digits.length > 12) return null;
  const code = /^\+\d{1,3}$/.test(cc) ? cc : '+383';
  return code + digits;
}


/** A random tracking token: 16 bytes = 128 bits. */
export function newToken(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}
