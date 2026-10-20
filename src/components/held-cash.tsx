import { getTranslations } from 'next-intl/server';
import { ConfirmCashButton } from '@/components/sheets/confirm-cash';
import { Icon } from '@/components/icons';
import { fmtDay } from '@/lib/fmt';
import { eur } from '@/lib/money';

interface HeldPay {
  id: string;
  heldBy: string | null;
  amount: number;
  date: string;
}

/** "€X te Driton · pa dorëzuar ende" with one "Konfirmo" per payment: the order and the opening balance show the same alert. */
export async function HeldCashAlert({ held, instName, left, who, today }: { held: HeldPay[]; instName: (id: string | null) => string; left: number; who: string; today: string }) {
  const t = await getTranslations('order');
  const tt = await getTranslations('time');
  const names = [...new Set(held.map(p => instName(p.heldBy)))].join(', ');
  return (
    <section className="alert alert--warning">
      <div className="alert__title">
        <Icon name="cash" />
        <span>{t('heldTitle', { amount: eur(held.reduce((s, p) => s + p.amount, 0)), names })}</span>
      </div>
      <div className="alert__line">
        {t('heldLine')} <b className="num">{eur(left)}</b>
      </div>
      {held.map(p => (
        <div className="alert__pay" key={p.id}>
          <span className="small">{t('heldPay', { name: instName(p.heldBy), amount: eur(p.amount), day: fmtDay(p.date, today, tt).toLowerCase() })}</span>
          <ConfirmCashButton paymentId={p.id} installer={instName(p.heldBy)} amount={p.amount} date={p.date} who={who} />
        </div>
      ))}
    </section>
  );
}
