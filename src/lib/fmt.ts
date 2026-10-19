/**
 * Relative day and lateness words through i18n (namespace `time`), shared by server and
 * client components: pass the `t` from getTranslations('time') or useTranslations('time').
 */
import { diffDays, fmtDate, weekday, WEEKDAYS } from './dates';

type T = (key: 'today' | 'tomorrow' | 'yesterday' | 'days' | 'months' | 'agoToday' | 'agoYesterday' | 'agoDays' | 'agoMonths', values?: { n: number }) => string;

/** "Sot", "Nesër", "Dje" or "E enjte 23.10". */
export function fmtDay(iso: string | null | undefined, today: string, t: T): string {
  if (!iso) return '—';
  const diff = diffDays(iso, today);
  if (diff === 0) return t('today');
  if (diff === 1) return t('tomorrow');
  if (diff === -1) return t('yesterday');
  return `${WEEKDAYS[weekday(iso)]} ${fmtDate(iso).slice(0, 5)}`;
}

/** "12 ditë", "3 muaj". */
export function lateSpan(n: number, t: T): string {
  return n > 60 ? t('months', { n: Math.floor(n / 30) }) : t('days', { n });
}

/** "sot", "dje", "12 ditë më parë", "3 muaj më parë". */
export function ago(iso: string, today: string, t: T): string {
  const n = diffDays(today, iso);
  if (n <= 0) return t('agoToday');
  if (n === 1) return t('agoYesterday');
  return n > 60 ? t('agoMonths', { n: Math.floor(n / 30) }) : t('agoDays', { n });
}
