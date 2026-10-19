import 'server-only';
import { installedQty, isProject, orderTotals, unitPrice } from '@/domain/balances';
import type { VisitOrderView, VisitView } from '@/components/sheets/visit';
import type { FullOrder } from '@/services/book';

/** What the visit sheets need about an order (client components get plain data only). */
export function visitOrderView(o: FullOrder): VisitOrderView {
  const tot = orderTotals(o);
  const withInst = o.visits.filter(v => v.installerId).sort((a, b) => a.date.localeCompare(b.date));
  return {
    id: o.id,
    number: o.number,
    clientName: o.client.name,
    stage: o.stage,
    description: o.description,
    remaining: Math.max(0, tot.remaining),
    remainingWork: o.remainingWork,
    hasMeasure: o.visits.some(v => v.type === 'measure'),
    lastInstallerId: withInst.at(-1)?.installerId ?? null,
    project: isProject(o) ? { quantity: o.quantity!, unit: o.unit ?? '', installed: installedQty(o), unitPrice: unitPrice(o) } : null,
  };
}

export const visitView = (v: FullOrder['visits'][number]): VisitView => ({ id: v.id, type: v.type, date: v.date, time: v.time, installerId: v.installerId, note: v.note });
