import { describe, expect, it } from 'vitest';
import { can, assertCan, ForbiddenError, type Action } from '@/auth/permissions';
import { eur, parseEur } from '@/lib/money';
import { fmtDate, fmtLong, fmtSpelled, parseDayInput, parseMonthInput, todayIso } from '@/lib/dates';
import { fmtPhone, splitPhone } from '@/lib/phone';
import { toE164 } from '@/services/common';

describe('permissions (spec table)', () => {
  const daily: Action[] = ['daily', 'edit'];
  const ownerOnly: Action[] = ['delete', 'export', 'settings'];
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
  it('formats as 12,250€: comma for thousands, euro sign after', () => {
    expect(eur(0)).toBe('0€');
    expect(eur(80000)).toBe('800€');
    expect(eur(1725000)).toBe('17,250€');
    expect(eur(125050)).toBe('1,250.50€');
    expect(eur(-125000)).toBe('−1,250€');
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
    expect(parseEur('12,250')).toBe(1225000);
    expect(parseEur('12,250€')).toBe(1225000);
    expect(parseEur('1,250.50')).toBe(125050);
    expect(parseEur('1.250,50')).toBe(125050);
    expect(parseEur('1,000,000')).toBe(100000000);
    expect(parseEur('12,5')).toBe(1250);
    expect(parseEur('10.5')).toBe(1050);
    expect(parseEur('1,000')).toBe(100000);
    expect(parseEur('1000')).toBe(100000);
    expect(parseEur('1,2345')).toBeNull();
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
  it('phone display: the saved number, without spaces', () => {
    expect(fmtPhone('+38344281734')).toBe('+38344281734');
    expect(fmtPhone('+383 44 281 734')).toBe('+38344281734');
  });
  it('a saved number goes back into the prefix select and the number field', () => {
    expect(splitPhone('+38344281734')).toEqual({ cc: '+383', local: '44281734' });
    expect(splitPhone('+383 44 281 734')).toEqual({ cc: '+383', local: '44281734' });
    expect(splitPhone('+4915112345678')).toEqual({ cc: '+49', local: '15112345678' });
    expect(splitPhone('+447700900123')).toEqual({ cc: '+383', local: '+447700900123' });
    expect(splitPhone('')).toEqual({ cc: '+383', local: '' });
    expect(splitPhone(null)).toEqual({ cc: '+383', local: '' });
  });
  it('typed numbers: spaces, brackets and a leading 0 make no difference; letters are refused', () => {
    for (const raw of ['44123456', '44 123 456', '044 123 456', '044-123-456', '(+383)44123456', '+383 44 123 456', '0038344123456'])
      expect(toE164('+383', raw)).toBe('+38344123456');
    expect(toE164('+49', '15112345678')).toBe('+4915112345678');
    expect(toE164('+383', '44a123456')).toBeNull();
    expect(toE164('+383', '123')).toBeNull();
  });
  it('typed dates are day first; a two-digit year is 20xx', () => {
    for (const raw of ['1/6/25', '01/06/2025', '1.6.2025', '01-06-25', '1 6 2025', '2025-06-01']) expect(parseDayInput(raw)).toBe('2025-06-01');
    expect(parseDayInput('22.10.2026')).toBe('2026-10-22');
    expect(parseDayInput('31.02.2026')).toBeNull();
    expect(parseDayInput('13/25')).toBeNull();
    expect(parseDayInput('abc')).toBeNull();
    expect(fmtSpelled('2025-06-01')).toBe('E diel, 1 qershor 2025');
  });
  it('typed months: 6/25, 06/25 and 06/2025 are the same', () => {
    for (const raw of ['6/25', '06/25', '06/2025', '6.2025', '06-2025', '2025-06']) expect(parseMonthInput(raw)).toBe('2025-06');
    expect(parseMonthInput('13/2025')).toBeNull();
    expect(parseMonthInput('1/6/25')).toBeNull();
  });
});
