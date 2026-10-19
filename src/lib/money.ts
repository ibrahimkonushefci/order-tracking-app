/** Money is integer cents everywhere; these are the only conversions. */

/** 125000 → "€1.250", 125050 → "€1.250,50" (Albanian grouping, as in the prototype). */
export function eur(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error('money must be integer cents');
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const rest = abs % 100;
  return `${neg ? '−' : ''}€${whole}${rest ? ',' + String(rest).padStart(2, '0') : ''}`;
}

/** "800", "1.250", "1250,50", "€ 1 250" → cents, or null (same rules as the prototype). */
export function parseEur(input: string | null | undefined): number | null {
  if (input == null) return null;
  let t = String(input).replace(/[€\s]/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [w, f = ''] = t.split('.');
  return Number(w) * 100 + Number((f + '00').slice(0, 2));
}
