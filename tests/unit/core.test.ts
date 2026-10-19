import { describe, expect, it } from 'vitest';
import { can, assertCan, ForbiddenError, type Action } from '@/auth/permissions';
import { eur, parseEur } from '@/lib/money';
import { fmtDate, fmtLong, todayIso } from '@/lib/dates';
import { fmtPhone } from '@/lib/phone';

describe('permissions (spec table)', () => {
  const daily: Action[] = ['daily', 'edit'];
  const ownerOnly: Action[] = ['delete', 'export', 'settings', 'setup'];
  it('Pronari can do everything', () => {
    for (const a of [...daily, ...ownerOnly]) expect(can('owner', a)).toBe(true);
  });
  it('Zyra does all daily work and edits, but cannot delete, export or change settings', () => {
    for (const a of daily) expect(can('office', a)).toBe(true);
    for (const a of ownerOnly) expect(can('office', a)).toBe(false);
  });
  it('no role, no permission', () => {
    expect(can(null, 'daily')).toBe(false);
    expect(can('admin' as never, 'daily')).toBe(false);
  });
  it('assertCan throws a ForbiddenError', () => {
    expect(() => assertCan('office', 'export')).toThrow(ForbiddenError);
    expect(() => assertCan('owner', 'export')).not.toThrow();
  });
});

describe('money in integer cents', () => {
  it('formats like the prototype', () => {
    expect(eur(0)).toBe('€0');
    expect(eur(80000)).toBe('€800');
    expect(eur(1725000)).toBe('€17.250');
    expect(eur(125050)).toBe('€1.250,50');
    expect(eur(-125000)).toBe('−€1.250');
  });
  it('refuses floats', () => {
    expect(() => eur(10.5)).toThrow();
  });
  it('parses what owners type', () => {
    expect(parseEur('800')).toBe(80000);
    expect(parseEur('1.250')).toBe(125000);
    expect(parseEur('1250,50')).toBe(125050);
    expect(parseEur('€ 1 250')).toBe(125000);
    expect(parseEur('12.5')).toBe(1250);
    expect(parseEur('abc')).toBeNull();
    expect(parseEur('')).toBeNull();
  });
});

describe('dates and phones', () => {
  it('dd.MM.yyyy and the Sot subtitle', () => {
    expect(fmtDate('2026-10-19')).toBe('19.10.2026');
    expect(fmtLong('2026-10-19')).toBe('E hënë, 19.10.2026');
  });
  it('today is computed in Kosovo time', () => {
    // 23:30 UTC on 19.10 is already 20.10 in Prishtinë (UTC+2 in October).
    expect(todayIso(new Date('2026-10-19T23:30:00Z'))).toBe('2026-10-20');
  });
  it('phone display', () => {
    expect(fmtPhone('+38344281734')).toBe('+383 44 281 734');
    expect(fmtPhone('+4915112345678')).toBe('+49 15 112 345678');
  });
});
