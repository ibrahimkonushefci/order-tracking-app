'use client';
/** Small client controls for the order list: the stage filter chips and the board's "next stage" button. */
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setStageAction } from '@/app/(app)/actions';
import { Icon } from './icons';
import { toast } from './sheet';

export function BoardNext({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn--soft btn--sm kcard__next"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setStageAction(id, 'active');
          if (!r.ok) toast(r.errors?._);
          router.refresh();
        })
      }
    >
      <span className="ellipsis">{label}</span>
      <Icon name="right" />
    </button>
  );
}

export function FilterChip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={() => router.push(href, { scroll: false })}>
      {children}
    </button>
  );
}
