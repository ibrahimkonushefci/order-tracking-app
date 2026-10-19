/** Dates: dd.MM.yyyy, Europe/Belgrade (same as Kosovo). Business dates are yyyy-MM-dd strings. */
export const TIME_ZONE = 'Europe/Belgrade';

export const WEEKDAYS = ['E diel', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë'];
/** "të enjten": the weekday after a preposition. */
export const WEEKDAYS_ON = ['të dielën', 'të hënën', 'të martën', 'të mërkurën', 'të enjten', 'të premten', 'të shtunën'];
export const WEEKDAYS_SHORT = ['Di', 'Hë', 'Ma', 'Më', 'En', 'Pr', 'Sh'];
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

const parseIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Calendar arithmetic on yyyy-MM-dd strings (no timezone drift). */
export function addDays(iso: string, n: number): string {
  return toIso(parseIso(iso) + n * 864e5);
}

/** Whole days from b to a (a − b). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseIso(a) - parseIso(b)) / 864e5);
}

export function weekday(iso: string): number {
  return new Date(parseIso(iso)).getUTCDay();
}

/** "2026-03" → "mars 2026". */
export function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Last day of a month: "2026-02" → "2026-02-28". */
export function endOfMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return toIso(Date.UTC(y, m, 0));
}

/** A timestamp as yyyy-MM-dd in Kosovo. */
export function isoOf(ts: Date | string): string {
  return todayIso(typeof ts === 'string' ? new Date(ts) : ts);
}

/** "19.10.2026 14:05" in Kosovo time (history lines). */
export function fmtDateTime(ts: Date | string): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  return `${fmtDate(isoOf(d))} ${time}`;
}
