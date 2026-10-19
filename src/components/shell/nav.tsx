'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, type IconName } from '../icons';

export const MAIN_NAV: { href: string; key: 'dashboard' | 'orders' | 'debts' | 'schedule'; icon: IconName }[] = [
  { href: '/', key: 'dashboard', icon: 'home' },
  { href: '/orders', key: 'orders', icon: 'list' },
  { href: '/debts', key: 'debts', icon: 'wallet' },
  { href: '/schedule', key: 'schedule', icon: 'calendar' },
];

function useIsCurrent() {
  const path = usePathname();
  return (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
}

export function MainTabs() {
  const t = useTranslations('nav');
  const isCurrent = useIsCurrent();
  return MAIN_NAV.map(n => (
    <Link key={n.key} className="tab" href={n.href} aria-current={isCurrent(n.href) ? 'page' : undefined}>
      <Icon name={n.icon} />
      <span>{t(n.key)}</span>
    </Link>
  ));
}

export function SecondaryTabs({ cashDot }: { cashDot: boolean }) {
  const t = useTranslations('nav');
  const isCurrent = useIsCurrent();
  return (
    <div className="rail-secondary">
      <Link className="tab" href="/cash" aria-current={isCurrent('/cash') ? 'page' : undefined}>
        <Icon name="cash" />
        <span>{t('cash')}</span>
        {cashDot ? <span className="rail-dot" /> : null}
      </Link>
      <Link className="tab" href="/settings" aria-current={isCurrent('/settings') ? 'page' : undefined}>
        <Icon name="settings" />
        <span>{t('settings')}</span>
      </Link>
    </div>
  );
}

export function SettingsGear() {
  const t = useTranslations('nav');
  const isCurrent = useIsCurrent();
  return (
    <Link className="icon-btn icon-btn--bare" href="/settings" aria-label={t('settings')} aria-current={isCurrent('/settings') ? 'page' : undefined}>
      <Icon name="settings" />
    </Link>
  );
}
