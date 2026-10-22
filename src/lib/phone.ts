/** Numbers are shown the way they are saved, without spaces: "+38344281734" (easy to copy into WhatsApp or Viber). */
export function fmtPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  return e164.replace(/\s/g, '');
}

/** Quick-pick prefixes: Kosovo first, then the diaspora (spec: Language & locale). */
export const PHONE_CODES = ['+383', '+49', '+41', '+43', '+33', '+46', '+1'] as const;

/** What the number field lets through while typing: digits, a leading "+", and the spaces, dashes and brackets of a pasted number. */
export const phoneChars = (v: string) => v.replace(/[^\d+\s()\-./]/g, '');

/**
 * A saved number back into the form's two fields: "+4915123456789" → { cc: "+49", local: "15123456789" }.
 * An unknown prefix keeps +383 in the select and the whole number in the field (toE164 keeps a leading "+").
 */
export function splitPhone(phone: string | null | undefined): { cc: string; local: string } {
  const e164 = (phone ?? '').replace(/\s/g, '');
  const cc = [...PHONE_CODES].sort((a, b) => b.length - a.length).find(c => e164.startsWith(c) && e164.length > c.length);
  if (!cc) return { cc: '+383', local: e164 };
  return { cc, local: e164.slice(cc.length) };
}
