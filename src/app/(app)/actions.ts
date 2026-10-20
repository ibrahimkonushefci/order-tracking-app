'use server';
/**
 * Server actions for Phase 3. Each one is a thin wrapper: the session, then the
 * service (which checks the role itself and writes the history), then the errors
 * translated for the form. Forms send FormData; results are plain objects.
 */
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/auth/session';
import { ForbiddenError } from '@/auth/permissions';
import { getDb } from '@/db/client';
import type { Db } from '@/db/connect';
import { appNow, appToday } from '@/server/today';
import { eur } from '@/lib/money';
import { FieldError, FieldErrors, NotFoundError, type Actor } from '@/services/common';
import * as O from '@/services/orders';
import * as P from '@/services/payments';
import * as B from '@/services/openings';
import * as V from '@/services/visits';
import * as M from '@/services/messages';
import type { ActionResult } from './action-result';

const s = (f: FormData, k: string) => String(f.get(k) ?? '');
const on = (f: FormData, k: string) => f.get(k) === '1' || f.get(k) === 'on';

async function run(fn: (db: Db, actor: Actor, today: string) => Promise<Omit<ActionResult, 'ok' | 'errors'> | void>): Promise<ActionResult> {
  const te = await getTranslations('errors');
  const u = await getCurrentUser();
  if (!u?.companyId) return { errors: { _: te('forbidden') } };
  try {
    const r = await fn(await getDb(), { id: u.id, role: u.role, companyId: u.companyId, firstName: u.firstName }, await appToday());
    revalidatePath('/', 'layout');
    return { ok: true, ...(r ?? {}) };
  } catch (e) {
    const msg = (x: FieldError) => te(x.key as 'invalid', x.params as never);
    if (e instanceof FieldError) return { errors: { [e.field]: msg(e) } };
    if (e instanceof FieldErrors) return { errors: Object.fromEntries(e.errors.map(x => [x.field, msg(x)])) };
    if (e instanceof ForbiddenError) return { errors: { _: te('forbidden') } };
    if (e instanceof NotFoundError) return { errors: { _: te('notFound') } };
    throw e;
  }
}

/* ───────── Orders ───────── */

export async function createOrderAction(f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a, today) => {
    const r = await O.createOrder(
      db,
      a,
      {
        name: s(f, 'name'),
        phoneCc: s(f, 'phoneCc'),
        phone: s(f, 'phone'),
        productType: s(f, 'productType'),
        description: s(f, 'description'),
        price: s(f, 'price'),
        deposit: s(f, 'deposit'),
        method: s(f, 'method'),
        city: s(f, 'city'),
        directions: s(f, 'directions'),
        internalNote: s(f, 'internalNote'),
        project: on(f, 'project'),
        quantity: s(f, 'quantity'),
        unit: s(f, 'unit'),
        projectPayTerm: s(f, 'projectPayTerm'),
      },
      today,
    );
    return { toast: tt('orderCreated', { number: r.number }), go: `/orders/${r.id}?new=1` };
  });
}

export async function setStageAction(id: string, to: 'new' | 'active') {
  return run(async (db, a) => {
    await O.setStage(db, a, id, to);
  });
}

export async function markDoneAction(id: string, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a, today) => {
    const r = await O.markDone(db, a, id, { pay: s(f, 'pay') as 'no', amount: s(f, 'amount'), holder: s(f, 'holder'), method: s(f, 'method'), term: s(f, 'term'), termDate: s(f, 'termDate') }, today);
    return { toast: r.held && r.left <= 0 ? tt('doneHeld') : r.left > 0 ? tt('doneLeft', { left: eur(r.left) }) : tt('done') };
  });
}

export async function recordPartAction(id: string, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a, today) => {
    const r = await O.recordPart(
      db,
      a,
      id,
      {
        quantity: s(f, 'quantity'),
        date: s(f, 'date'),
        installerId: s(f, 'installerId') || undefined,
        value: s(f, 'value'),
        pay: s(f, 'pay') === 'part' ? 'part' : 'no',
        amount: s(f, 'amount'),
        method: s(f, 'method'),
        holder: s(f, 'holder'),
        finish: on(f, 'finish'),
      },
      today,
    );
    return { toast: tt('part', { installed: r.installed, owed: eur(r.owed) }) };
  });
}

export async function finishProjectAction(id: string) {
  const tt = await getTranslations('toast');
  return run(async (db, a, today) => {
    await O.finishProject(db, a, id, today);
    return { toast: tt('projectDone') };
  });
}

export async function setTermAction(id: string, f: FormData) {
  return run(async (db, a) => {
    await O.setTerm(db, a, id, { term: s(f, 'term'), termDate: s(f, 'termDate') });
  });
}

export async function pauseAction(kind: 'order' | 'opening', id: string, f: FormData) {
  return run(async (db, a, today) => {
    const input = { until: s(f, 'until'), reason: s(f, 'reason') };
    if (kind === 'order') await O.pauseOrder(db, a, id, input, today);
    else await B.pauseOpening(db, a, id, input, today);
  });
}

export async function unpauseAction(kind: 'order' | 'opening', id: string) {
  return run(async (db, a) => {
    if (kind === 'order') await O.unpauseOrder(db, a, id);
    else await B.unpauseOpening(db, a, id);
  });
}

export async function remainingWorkAction(id: string, f: FormData) {
  return run(async (db, a, today) => {
    await O.setRemainingWork(db, a, id, { note: s(f, 'note'), pause: on(f, 'pause') }, today);
  });
}

export async function clearRemainingAction(id: string) {
  return run(async (db, a) => {
    await O.clearRemainingWork(db, a, id);
  });
}

export async function editOrderAction(id: string, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    const r = await O.editOrder(db, a, id, {
      name: s(f, 'name'),
      phone: s(f, 'phone'),
      productType: s(f, 'productType'),
      description: s(f, 'description'),
      price: s(f, 'price'),
      priceNote: s(f, 'priceNote'),
      city: s(f, 'city'),
      directions: s(f, 'directions'),
      internalNote: s(f, 'internalNote'),
      project: on(f, 'project'),
      quantity: s(f, 'quantity'),
      unit: s(f, 'unit'),
      projectPayTerm: s(f, 'projectPayTerm'),
    });
    return { toast: r.changed ? tt('saved') : tt('nothingChanged') };
  });
}

export async function cancelOrderAction(id: string, f: FormData) {
  return run(async (db, a) => {
    await O.cancelOrder(db, a, id, s(f, 'reason'));
  });
}

export async function restoreOrderAction(id: string) {
  return run(async (db, a) => {
    await O.restoreOrder(db, a, id);
  });
}

export async function deleteOrderAction(id: string) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    await O.deleteOrder(db, a, id);
    return { toast: tt('orderDeleted'), go: '/orders' };
  });
}

export async function clientNoRemindersAction(clientId: string, value: boolean) {
  return run(async (db, a) => {
    await O.setClientNoReminders(db, a, clientId, value);
  });
}

/* ───────── Payments ───────── */

const payInput = (f: FormData): P.PaymentInput => ({ amount: s(f, 'amount'), method: s(f, 'method'), holder: s(f, 'holder'), date: s(f, 'date'), note: s(f, 'note') });

export async function addPaymentAction(kind: 'order' | 'opening', id: string, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a, today) => {
    const p = await P.addPayment(db, a, kind === 'order' ? { orderId: id } : { openingId: id }, payInput(f), today);
    return { toast: p.heldBy ? tt('paymentHeld', { amount: eur(p.amount) }) : tt('payment', { amount: eur(p.amount) }) };
  });
}

export async function editPaymentAction(paymentId: string, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a, today) => {
    await P.editPayment(db, a, paymentId, payInput(f), today);
    return { toast: tt('paymentEdited') };
  });
}

export async function deletePaymentAction(paymentId: string, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    await P.deletePayment(db, a, paymentId, s(f, 'reason'));
    return { toast: tt('paymentDeleted') };
  });
}

export async function confirmCashAction(paymentId: string) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    const amount = await P.confirmCash(db, a, paymentId);
    return { toast: tt('confirmed', { amount: eur(amount) }) };
  });
}

export async function confirmAllAction(installerId: string) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    const amount = await P.confirmAll(db, a, installerId);
    return { toast: tt('confirmed', { amount: eur(amount) }) };
  });
}

/* ───────── Opening balances ───────── */

export async function createOpeningAction(f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a, today) => {
    const ob = await B.createOpening(
      db,
      a,
      openingInput(f),
      today,
    );
    return {
      toast: tt(ob.dueDate ? 'openingCreated' : 'openingCreatedUnknown', { name: ob.name, amount: eur(ob.amount) }),
      go: f.get('then') === 'again' ? undefined : `/debts?flash=${ob.id}`,
    };
  });
}

export async function setOpeningDueAction(id: string, f: FormData) {
  return run(async (db, a) => {
    await B.setOpeningDue(db, a, id, s(f, 'due'));
  });
}

export async function openingNoRemindersAction(id: string, value: boolean) {
  return run(async (db, a) => {
    await B.setOpeningNoReminders(db, a, id, value);
  });
}

export async function deleteOpeningAction(id: string) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    await B.deleteOpening(db, a, id);
    return { toast: tt('openingDeleted'), go: '/debts' };
  });
}

const openingInput = (f: FormData): B.OpeningInput => ({
  name: s(f, 'name'),
  phoneCc: s(f, 'phoneCc'),
  phone: s(f, 'phone'),
  amount: s(f, 'amount'),
  forWhat: s(f, 'forWhat'),
  workMode: s(f, 'workMode') as 'date',
  workDate: s(f, 'workDate'),
  workMonth: s(f, 'workMonth'),
  dueMode: s(f, 'dueMode') as 'date',
  dueDate: s(f, 'dueDate'),
  dueMonth: s(f, 'dueMonth'),
  note: s(f, 'note'),
});

export async function editOpeningAction(id: string, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a, today) => {
    const r = await B.editOpening(db, a, id, openingInput(f), today);
    return { toast: r.changed ? tt('openingEdited') : tt('nothingChanged') };
  });
}

/* ───────── Project parts: corrections ───────── */

export async function editPartAction(orderId: string, visitId: string, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a, today) => {
    const r = await O.editPart(db, a, orderId, visitId, { quantity: s(f, 'quantity'), date: s(f, 'date'), installerId: s(f, 'installerId') || undefined, value: s(f, 'value') }, today);
    return { toast: r.changed ? tt('partEdited') : tt('nothingChanged') };
  });
}

export async function deletePartAction(orderId: string, visitId: string) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    await O.deletePart(db, a, orderId, visitId);
    return { toast: tt('partDeleted') };
  });
}

export async function reopenPartAction(orderId: string, visitId: string, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    const r = await O.reopenPart(db, a, orderId, visitId, { reopenOrder: on(f, 'reopenOrder') });
    return { toast: r.reopenedOrder ? tt('partReopenedOrder') : tt('partReopened') };
  });
}

/* ───────── Phase 4: visits ───────── */

const visitInput = (f: FormData): V.VisitInput => ({ type: s(f, 'type'), date: s(f, 'date'), time: s(f, 'time'), exact: s(f, 'exact'), installerId: s(f, 'installerId'), note: s(f, 'note') });

export async function saveVisitAction(orderId: string, visitId: string | null, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    const v = await V.saveVisit(db, a, orderId, visitId, visitInput(f));
    const send = f.get('then') === 'send';
    return { toast: visitId ? tt('visitSaved') : tt('visitPlanned'), go: send ? `/send/visit/${orderId}/${v.id}` : undefined };
  });
}

export async function removeVisitAction(orderId: string, visitId: string) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    await V.removeVisit(db, a, orderId, visitId);
    return { toast: tt('visitRemoved') };
  });
}

export async function editDoneVisitAction(orderId: string, visitId: string, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a, today) => {
    const r = await V.editDoneVisit(db, a, orderId, visitId, { date: s(f, 'date'), installerId: s(f, 'installerId'), note: s(f, 'note') }, today);
    return { toast: r.changed ? tt('doneVisitSaved') : tt('nothingChanged') };
  });
}

export async function reopenVisitAction(orderId: string, visitId: string, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a, today) => {
    const r = await V.reopenVisit(db, a, orderId, visitId, { reopenOrder: on(f, 'reopenOrder'), restoreRemaining: on(f, 'restoreRemaining'), remainingNote: s(f, 'remainingNote'), pause: on(f, 'pause') }, today);
    return { toast: r.reopenedOrder ? tt('visitReopenedOrder') : r.restoredRemaining ? tt('visitReopenedRemaining') : tt('visitReopened') };
  });
}

export async function completeVisitAction(orderId: string, visitId: string, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a, today) => {
    const r = await V.completeVisit(
      db,
      a,
      orderId,
      visitId,
      {
        pay: (s(f, 'pay') || 'no') as 'no',
        amount: s(f, 'amount'),
        holder: s(f, 'holder'),
        method: s(f, 'method'),
        term: s(f, 'term'),
        termDate: s(f, 'termDate'),
        close: on(f, 'close'),
        quantity: s(f, 'quantity'),
        value: s(f, 'value'),
        finish: on(f, 'finish'),
        finishRemaining: on(f, 'finishRemaining'),
        note: s(f, 'note'),
      },
      today,
    );
    if (r.kind === 'part') return { toast: tt('part', { installed: r.installed, owed: eur(r.owed) }) };
    if (r.kind === 'measure') return { toast: tt('measureDone') };
    if (r.kind === 'repair') return { toast: tt('repairDone') };
    return { toast: r.held && r.left <= 0 ? tt('doneHeld') : !r.closed ? tt('visitDone') : r.left > 0 ? tt('doneLeft', { left: eur(r.left) }) : tt('done') };
  });
}

/* ───────── Phase 4: messages ("U dërgua?" → Po) ───────── */

export async function logCustomerMessageAction(kind: 'order' | 'opening', id: string, input: M.SentInput) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    await M.logCustomerMessage(db, a, kind === 'order' ? { orderId: id } : { openingId: id }, input, await appNow());
    return { toast: tt('messageLogged'), go: kind === 'order' ? `/orders/${id}` : `/debts/${id}` };
  });
}

export async function logInstallerMessageAction(input: M.InstallerSentInput, back: string) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    await M.logInstallerMessage(db, a, input, await appNow());
    return { toast: tt('installerLogged'), go: back.startsWith('/') ? back : '/schedule' };
  });
}

export async function newLinkAction(orderId: string) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    await M.newTrackingLink(db, a, orderId);
    return { toast: tt('newLink') };
  });
}

export async function clientContactAction(clientId: string, input: { language?: string; channel?: string }) {
  return run(async (db, a) => {
    await M.setClientContact(db, a, clientId, input);
  });
}

export async function openingContactAction(id: string, input: { language?: string; channel?: string }) {
  return run(async (db, a) => {
    await M.setOpeningContact(db, a, id, input);
  });
}

export async function saveInstallerAction(id: string | null, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    await M.saveInstaller(db, a, id, { name: s(f, 'name'), phoneCc: s(f, 'phoneCc'), phone: s(f, 'phone'), channel: s(f, 'channel'), active: id ? f.get('active') !== '0' : true });
    return { toast: id ? tt('installerSaved') : tt('installerAdded') };
  });
}

export async function saveTemplatesAction(lang: string, f: FormData) {
  const tt = await getTranslations('toast');
  return run(async (db, a) => {
    const input: Record<string, string> = {};
    for (const [k, v] of f.entries()) if (typeof v === 'string' && k.startsWith('t_')) input[k.slice(2)] = v;
    await M.saveTemplates(db, a, lang, input);
    return { toast: tt('templatesSaved') };
  });
}
