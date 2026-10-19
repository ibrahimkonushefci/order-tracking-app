'use client';
/** The order search: filters as you type (name, phone, order number; "avans"/"kapar" = deposit only). */
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon } from './icons';

export function OrderSearch({ initial }: { initial: string }) {
  const t = useTranslations('orders');
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(initial);
  useEffect(() => {
    if (q === (params.get('q') ?? '')) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q.trim()) next.set('q', q);
      else next.delete('q');
      router.replace(`${path}?${next}`, { scroll: false });
    }, 250);
    return () => clearTimeout(timer);
  }, [q, params, path, router]);
  return (
    <div className="search">
      <Icon name="search" />
      <input className="input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} />
    </div>
  );
}
