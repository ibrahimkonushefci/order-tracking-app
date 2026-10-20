/** The built-in QR encoder (src/lib/qr.ts). Decoding was also checked with macOS's QR reader (Phase 5 notes). */
import { describe, expect, it } from 'vitest';
import { qrMatrix, qrSvgPath } from '@/lib/qr';

const finderAt = (m: boolean[][], x: number, y: number) =>
  [0, 1, 2, 3, 4, 5, 6].every(
    i => m[y][x + i] && m[y + 6][x + i] && m[y + i][x] && m[y + i][x + 6],
  ) &&
  m[y + 3][x + 3] &&
  !m[y + 1][x + 1];

describe('QR encoder', () => {
  it('picks the smallest version for the text', () => {
    expect(qrMatrix('hi')).toHaveLength(21); // version 1
    expect(qrMatrix(`https://order-tracking-test.vercel.app/t/${'a'.repeat(32)}`)).toHaveLength(37); // version 5
    expect(qrMatrix('x'.repeat(150))).toHaveLength(49); // version 8, several blocks
  });

  it('draws the three finder patterns and the dark module', () => {
    const m = qrMatrix('https://order-tracking-test.vercel.app/t/0123456789abcdef0123456789abcdef');
    const n = m.length;
    expect(finderAt(m, 0, 0) && finderAt(m, n - 7, 0) && finderAt(m, 0, n - 7)).toBe(true);
    expect(m[n - 8][8]).toBe(true);
  });

  it('is deterministic and refuses text longer than version 10', () => {
    expect(qrSvgPath('abc')).toEqual(qrSvgPath('abc'));
    expect(qrSvgPath('abc').size).toBe(21 + 8);
    expect(() => qrMatrix('x'.repeat(300))).toThrow();
  });
});
