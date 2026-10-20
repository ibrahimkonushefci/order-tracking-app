/** Brand switching in demo mode: record screens of one company fall back to their list. */
import { describe, expect, it } from 'vitest';
import { pathAfterBrandSwitch } from '@/lib/demo-paths';

describe('pathAfterBrandSwitch', () => {
  it('sends record screens to their list', () => {
    expect(pathAfterBrandSwitch('/orders/6f1c2a3b-0000-4000-8000-000000000001')).toBe('/orders');
    expect(pathAfterBrandSwitch('/orders/6f1c2a3b-0000-4000-8000-000000000001?new=1')).toBe('/orders');
    expect(pathAfterBrandSwitch('/debts/6f1c2a3b-0000-4000-8000-000000000002')).toBe('/debts');
    expect(pathAfterBrandSwitch('/compose/order/abc?t=link')).toBe('/orders');
    expect(pathAfterBrandSwitch('/compose/opening/abc')).toBe('/debts');
    expect(pathAfterBrandSwitch('/send/visit/abc/def')).toBe('/schedule');
    expect(pathAfterBrandSwitch('/send/day/abc/2026-10-21')).toBe('/schedule');
  });

  it('keeps lists, the dashboard and the new-record forms as they are', () => {
    for (const p of ['/', '/orders', '/orders?stage=done', '/orders/new', '/debts', '/debts/new', '/schedule?d=tomorrow', '/cash', '/settings'])
      expect(pathAfterBrandSwitch(p)).toBe(p);
  });
});
