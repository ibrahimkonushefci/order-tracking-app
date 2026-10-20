/** Brand switching in demo mode: record screens of one company fall back to their list. */
import { describe, expect, it } from 'vitest';
import { brandSwitchHref, pathAfterBrandSwitch } from '@/lib/demo-paths';

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

describe('brandSwitchHref', () => {
  it('keeps the filters of the current screen', () => {
    expect(brandSwitchHref('/orders', 'stage=project&view=kanban', 'lumi-dyer', false)).toBe('/orders?stage=project&view=kanban&brand=lumi-dyer');
    expect(brandSwitchHref('/schedule', 'd=tomorrow', 'druri-design', true)).toBe('/schedule?d=tomorrow&brand=druri-design');
    expect(brandSwitchHref('/debts', '', 'lumi-dyer', false)).toBe('/debts?brand=lumi-dyer');
  });

  it('drops an old brand parameter and sends record screens of the other brand to their list', () => {
    expect(brandSwitchHref('/orders', 'brand=druri-design&stage=done', 'lumi-dyer', false)).toBe('/orders?stage=done&brand=lumi-dyer');
    expect(brandSwitchHref('/orders/6f1c2a3b-0000-4000-8000-000000000001', 'new=1', 'lumi-dyer', false)).toBe('/orders?brand=lumi-dyer');
    expect(brandSwitchHref('/orders/6f1c2a3b-0000-4000-8000-000000000001', 'new=1', 'druri-design', true)).toBe('/orders/6f1c2a3b-0000-4000-8000-000000000001?new=1&brand=druri-design');
  });
});
