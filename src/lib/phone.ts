/** Same display rule as the prototype: "+38344281734" → "+383 44 281 734". */
export function fmtPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const m = /^\+(383|49|41|43|33|46|1)(\d+)$/.exec(e164);
  if (!m) return e164;
  return `+${m[1]} ${m[2].replace(/(\d{2})(\d{3})(\d+)/, '$1 $2 $3')}`;
}

/** Quick-pick prefixes: Kosovo first, then the diaspora (spec: Language & locale). */
export const PHONE_CODES = ['+383', '+49', '+41', '+43', '+33', '+46', '+1'] as const;

/**
 * A saved number back into the form's two fields: "+4915123456789" → { cc: "+49", local: "15 123 456789" }.
 * An unknown prefix keeps +383 in the select and the whole number in the field (toE164 keeps a leading "+").
 */
export function splitPhone(phone: string | null | undefined): { cc: string; local: string } {
  const e164 = (phone ?? '').replace(/\s/g, '');
  const cc = [...PHONE_CODES].sort((a, b) => b.length - a.length).find(c => e164.startsWith(c) && e164.length > c.length);
  if (!cc) return { cc: '+383', local: e164 };
  const shown = fmtPhone(e164);
  return { cc, local: shown.startsWith(`${cc} `) ? shown.slice(cc.length + 1) : e164.slice(cc.length) };
}
