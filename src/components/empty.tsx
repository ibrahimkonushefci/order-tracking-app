import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';

/** The prototype's empty state inside a card, with an optional note on which phase fills it. */
export function EmptyCard({ icon = 'check', title, note }: { icon?: IconName; title: ReactNode; note?: ReactNode }) {
  return (
    <section className="card">
      <div className="empty">
        <Icon name={icon} />
        <b>{title}</b>
        {note ? <span className="phase-note">{note}</span> : null}
      </div>
    </section>
  );
}
