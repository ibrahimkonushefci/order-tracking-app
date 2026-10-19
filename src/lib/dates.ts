/** Dates: dd.MM.yyyy, Europe/Belgrade (same as Kosovo). Business dates are yyyy-MM-dd strings. */
export const TIME_ZONE = 'Europe/Belgrade';

export const WEEKDAYS = ['E diel', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë'];
export const MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];

/** Today in Kosovo as yyyy-MM-dd, whatever the server's timezone. */
export function todayIso(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function hourInKosovo(now = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(now));
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** "E hënë, 19.10.2026" (the Sot subtitle in the prototype). */
export function fmtLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${fmtDate(iso)}`;
}
