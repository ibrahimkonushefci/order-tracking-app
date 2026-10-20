import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';

/** The prototype's empty state inside a card. */
export function EmptyCard({ icon = 'check', title }: { icon?: IconName; title: ReactNode }) {
  return (
    <section className="card">
      <div className="empty">
        <Icon name={icon} />
        <b>{title}</b>
      </div>
    </section>
  );
}
