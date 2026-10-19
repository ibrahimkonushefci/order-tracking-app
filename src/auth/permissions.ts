/**
 * Permissions (spec: Permissions). Checked in every server action and route handler,
 * never in the proxy only. Both roles see all money and do all daily work.
 */
import type { Role } from '@/db/schema';

export type Action =
  | 'daily' // orders, stages, visits, payments, cash confirmation, opening balances, messages, tracking links
  | 'edit' // edit payments, prices and any order field
  | 'delete' // delete payments, opening balances, orders without payments
  | 'export' // export all data
  | 'settings' // users and brand settings (incl. the deposit word)
  | 'setup'; // /setup (demo convenience; also needs the PIN)

const OWNER_ONLY: ReadonlySet<Action> = new Set(['delete', 'export', 'settings', 'setup']);

export function can(role: Role | null | undefined, action: Action): boolean {
  if (role !== 'owner' && role !== 'office') return false;
  return role === 'owner' || !OWNER_ONLY.has(action);
}

export class ForbiddenError extends Error {
  constructor(public action: Action) {
    super(`forbidden:${action}`);
  }
}

export function assertCan(role: Role | null | undefined, action: Action) {
  if (!can(role, action)) throw new ForbiddenError(action);
}

export const ROLE_LABEL: Record<Role, string> = { owner: 'Pronari', office: 'Zyra' };
