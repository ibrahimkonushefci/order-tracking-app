/** Money is integer cents everywhere; these are the only conversions. */

/** 125000 → "1,250€", 125050 → "1,250.50€" (comma for thousands, euro sign after the amount). */
export function eur(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error('money must be integer cents');
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const rest = abs % 100;
  return `${neg ? '−' : ''}${whole}${rest ? '.' + String(rest).padStart(2, '0') : ''}€`;
}

/**
 * Typed amount → cents, or null. Accepts the app's format and the older one:
 * "800", "1,250", "1,250.50", "1250.50", "1.250", "1.250,50", "1250,50", "€ 1 250", "1 250€".
 * A comma or dot followed by exactly three digits groups thousands; otherwise it is the decimal point.
 */
export function parseEur(input: string | null | undefined): number | null {
  if (input == null) return null;
  let t = String(input).replace(/[€\s]/g, '');
  if (!t) return null;
  const last = Math.max(t.lastIndexOf(','), t.lastIndexOf('.'));
  if (last >= 0) {
    const sep = t[last];
    const other = sep === ',' ? '.' : ',';
    const decimals = t.length - last - 1;
    if (t.includes(other)) t = t.split(other).join('').replace(sep, '.'); // "1,250.50" / "1.250,50"
    else if (decimals === 3 && /^\d{1,3}([.,]\d{3})+$/.test(t)) t = t.split(sep).join(''); // "1,250" / "1.250"
    else if (t.split(sep).length === 2) t = t.replace(sep, '.'); // "1250.50" / "1250,50"
    else return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [w, f = ''] = t.split('.');
  return Number(w) * 100 + Number((f + '00').slice(0, 2));
}
