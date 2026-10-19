'use client';
import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from './icons';
import { THEME_COLOR, THEME_KEY } from '@/lib/theme-script';

type Theme = 'light' | 'dark';

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}
const read = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

/** The current theme on the client; null during server render. */
export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {}
  const meta = document.querySelector('meta[name="theme-color"]');
  const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim();
  if (meta) meta.setAttribute('content', t === 'dark' ? THEME_COLOR.dark : brand);
}

/** Moon/sun in the header (both icons rendered; CSS shows the right one, so no flash). */
export function ThemeToggle({ className = 'icon-btn icon-btn--bare' }: { className?: string }) {
  const t = useTranslations('theme');
  return (
    <button
      type="button"
      className={className}
      aria-label={t('toggle')}
      title={t('toggle')}
      onClick={() => setTheme(read() === 'dark' ? 'light' : 'dark')}
    >
      <Icon name="moon" className="when-light" />
      <Icon name="sun" className="when-dark" />
    </button>
  );
}

/** "Pamja: Dritë / Errët" in Cilësimet. */
export function ThemeSeg() {
  const t = useTranslations('theme');
  const now = useTheme();
  return (
    <div className="seg">
      {(['light', 'dark'] as const).map(k => (
        <button key={k} type="button" aria-pressed={now === k} onClick={() => setTheme(k)}>
          <Icon name={k === 'light' ? 'sun' : 'moon'} /> {t(k)}
        </button>
      ))}
    </div>
  );
}
