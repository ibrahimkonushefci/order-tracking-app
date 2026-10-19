'use client';
/** "+ Pagesë" from Sot: search the client (those who owe now first), then the payment sheet. */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { eur } from '@/lib/money';
import { Avatar } from '../cues';
import type { InstallerOpt } from '../forms';
import { Icon } from '../icons';
import { Sheet } from '../sheet';
import { PaymentSheet } from './payment';

export interface PickRow {
  kind: 'order' | 'opening';
  id: string;
  name: string;
  meta: string;
  owed: number;
  remaining: number;
}

export function PayPickTile({ rows, installers, canDelete, today, label, sub }: { rows: PickRow[]; installers: InstallerOpt[]; canDelete: boolean; today: string; label: string; sub: string }) {
  const t = useTranslations('payPick');
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [pick, setPick] = useState<PickRow | null>(null);
  const s = q.trim().toLowerCase();
  const list = rows.filter(r => !s || r.name.toLowerCase().includes(s) || r.meta.toLowerCase().includes(s)).slice(0, 30);
  return (
    <>
      <button type="button" className="tile" onClick={() => setOpen(true)}>
        <span className="tile__icon tone--success">
          <Icon name="cash" />
        </span>
        <span className="tile__label">
          {label}
          <small>{sub}</small>
        </span>
      </button>
      <Sheet open={open && !pick} onClose={() => setOpen(false)} title={t('title')} sub={t('sub')}>
        <div className="search">
          <Icon name="search" />
          <input className="input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} autoComplete="off" />
        </div>
        <div className="list" id="pick-list">
          {list.length ? (
            list.map(r => (
              <button type="button" className="list-row" key={`${r.kind}-${r.id}`} onClick={() => setPick(r)}>
                <Avatar name={r.name} dot={r.owed > 0 ? 'danger' : null} />
                <span className="grow">
                  <b>{r.name}</b>
                  <br />
                  <span className="small muted">{r.meta}</span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <b className="num">{eur(r.owed > 0 ? r.owed : r.remaining)}</b>
                  <br />
                  <span className="xs subtle">{r.owed > 0 ? t('owed') : t('left')}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="empty small">{t('none')}</div>
          )}
        </div>
      </Sheet>
      {pick ? (
        <PaymentSheet
          open
          onClose={() => {
            setPick(null);
            setOpen(false);
          }}
          kind={pick.kind}
          recordId={pick.id}
          suggest={pick.owed > 0 ? pick.owed : pick.remaining}
          due={pick.owed > 0 ? pick.owed : pick.remaining}
          installers={installers}
          canDelete={canDelete}
          today={today}
        />
      ) : null}
    </>
  );
}
