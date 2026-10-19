/** Same display rule as the prototype: "+38344281734" → "+383 44 281 734". */
export function fmtPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const m = /^\+(383|49|41|43|33|46|1)(\d+)$/.exec(e164);
  if (!m) return e164;
  return `+${m[1]} ${m[2].replace(/(\d{2})(\d{3})(\d+)/, '$1 $2 $3')}`;
}

/** Quick-pick prefixes: Kosovo first, then the diaspora (spec: Language & locale). */
export const PHONE_CODES = ['+383', '+49', '+41', '+43', '+33', '+46', '+1'] as const;
