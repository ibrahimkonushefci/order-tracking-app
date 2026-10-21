/**
 * Phase 3 fixtures (PHASES.md "Test fixtures"): the order and money cases, all fictional
 * and dated relative to `today`, so overdue days and "for weeks" stay true on any day.
 *
 *  2026-001  Arbëria Invest sh.p.k.  project, 24 banesa, 18 installed, owes 10,800€ (overdue)
 *  2026-002  Valon Hoxha             overdue 1,200€; avans edited 500€ → 600€
 *  2026-003  Mimoza Rexhepi          done, remaining work, reminders paused, owes 150€
 *  2026-004  Fatmir Krasniqi         the 800€ case: recorded "Te Driton" today, owes 0€
 *  2026-005  Ilir Gashi              "Mos sugjero kujtesa" (a cousin), owes 900€
 *  2026-006  Ndërtimi Rugova sh.p.k. project, 12 garderoba, 3 installed, paid ahead 1,400€
 *  2026-007  Besa Morina             750€ with Faton for 24 days, owes 0€
 *  2026-008  Liridona Shala          active; a 1,500€ payment recorded twice and deleted
 *  2026-009  Naim Berisha            village job with only a "Si të shkoni" description
 *  2026-010  Dritë Hyseni            done 3 days ago, still within the week
 *  2026-011  Arta Krasniqi           new, with avans: walk it through the three stages
 *  Borxh i bartur: Blerim Hasani 450€ (due 60 days ago) · Shpresa Leka 1,100€ ("Nuk e di")
 */
import { eq } from 'drizzle-orm';
import { addDays } from '../lib/dates';
import { client, company, history, openingBalance, orders, payment, visit } from './schema';
import type { Db } from './connect';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Installers = Record<'Driton' | 'Faton' | 'Besnik', string>;

const eur = (n: number) => Math.round(n * 100);
const fmt = (c: number) => String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '€';
const dmy = (iso: string) => iso.split('-').reverse().join('.');

export async function loadPhase3(
  tx: Tx,
  ctx: { companyId: string; users: Record<'owner' | 'office', string>; installers: Installers; today: string },
) {
  const { companyId, users, installers: I, today } = ctx;
  const d = (n: number) => addDays(today, n);
  const at = (iso: string, hm = '10:00') => new Date(`${iso}T${hm}:00+02:00`);
  const year = Number(today.slice(0, 4));
  let seq = 0;
  const token = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');

  // Lines written in the same minute keep their order: each one is a second later.
  let tick = 0;
  const hist = (recordType: 'order' | 'opening' | 'client', recordId: string, when: string, by: 'owner' | 'office', text: string, hm = '10:00') =>
    tx.insert(history).values({ companyId, recordType, recordId, userId: users[by], at: new Date(at(when, hm).getTime() + ++tick * 1000), text });

  async function cust(name: string, phone: string, extra: Partial<typeof client.$inferInsert> = {}) {
    const [c] = await tx.insert(client).values({ companyId, name, phone, ...extra }).returning();
    return c.id;
  }

  async function order(clientId: string, o: Partial<typeof orders.$inferInsert> & { productType: string; price: number; created: number }) {
    const { created, ...rest } = o;
    const number = `${year}-${String(++seq).padStart(3, '0')}`;
    const [row] = await tx
      .insert(orders)
      .values({ companyId, number, clientId, city: 'Prishtinë', trackingToken: token(), createdBy: users.office, createdAt: at(d(created), '09:30'), ...rest })
      .returning();
    return row.id;
  }

  async function pay(
    target: { orderId: string } | { openingId: string },
    amount: number,
    date: string,
    by: 'owner' | 'office',
    extra: Partial<typeof payment.$inferInsert> = {},
  ) {
    const [p] = await tx
      .insert(payment)
      .values({ companyId, ...target, amount, date, method: 'cash', createdBy: users[by], createdAt: at(date, '11:00'), ...extra })
      .returning();
    return p.id;
  }

  const part = (orderId: string, qty: number, date: string, installerId: string) =>
    tx.insert(visit).values({ companyId, orderId, type: 'install', date, installerId, doneAt: date, quantity: qty });

  /* 1. Project that owes money: 24 kitchens for a builder, paid in two transfers. */
  {
    const c = await cust('Arbëria Invest sh.p.k.', '+38338224500', { note: 'Z. Agron, menaxheri i projektit' });
    const id = await order(c, {
      productType: 'Kuzhinë',
      description: 'Kuzhina për 24 banesa · Kompleksi Arbëria, Lamela B',
      price: eur(67200),
      quantity: 24,
      unit: 'banesa',
      projectPayTerm: 'month',
      stage: 'active',
      directions: 'Kompleksi Arbëria, Lamela B. Hyrja nga rruga e pasme; çelësat te roja.',
      created: -130,
    });
    await hist('order', id, d(-130), 'owner', `Porosia u krijua · ${fmt(eur(67200))} · 24 banesa`);
    await pay({ orderId: id }, eur(20000), d(-120), 'owner', { method: 'bank' });
    await hist('order', id, d(-120), 'owner', 'Pagesë 20,000€ (bankë) · në zyrë');
    const parts: [number, number, string][] = [[4, -80, I.Driton], [6, -60, I.Faton], [5, -41, I.Driton], [3, -15, I.Besnik]];
    let first = true;
    for (const [qty, day, inst] of parts) {
      await part(id, qty, d(day), inst);
      if (first) await hist('order', id, d(day), 'office', 'Faza: E re → Në punë', '16:00');
      first = false;
      await hist('order', id, d(day), 'office', `Montuar ${qty} banesa · ${inst === I.Driton ? 'Driton' : inst === I.Faton ? 'Faton' : 'Besnik'} · ${dmy(d(day))}`, '16:05');
    }
    await pay({ orderId: id }, eur(19600), d(-30), 'office', { method: 'bank' });
    await hist('order', id, d(-30), 'office', 'Pagesë 19,600€ (bankë) · në zyrë');
  }

  /* 2. Overdue order, with an edited payment (avans 500€ → 600€). */
  {
    const c = await cust('Valon Hoxha', '+38344318902');
    const id = await order(c, {
      productType: 'Garderobë',
      description: 'Garderobë me dyer rrëshqitëse, 2,4 m',
      price: eur(1800),
      stage: 'done',
      doneAt: d(-40),
      payTerm: 'week',
      dueDate: d(-33),
      city: 'Fushë Kosovë',
      created: -60,
    });
    await hist('order', id, d(-60), 'office', `Porosia u krijua · ${fmt(eur(1800))}`);
    await pay({ orderId: id }, eur(600), d(-60), 'office', { note: 'Avans' });
    await hist('order', id, d(-60), 'office', 'Avans 500€ (kesh) · në zyrë', '09:35');
    await hist('order', id, d(-59), 'owner', 'Pagesa u ndryshua: 500€ → 600€', '08:40');
    await hist('order', id, d(-50), 'office', 'Faza: E re → Në punë');
    await hist('order', id, d(-40), 'office', 'Faza: Në punë → E kryer · pagesa: brenda javës', '17:10');
  }

  /* 3. Done, remaining work, reminders paused. */
  {
    const c = await cust('Mimoza Rexhepi', '+38345220781');
    const note = 'Një derë duhet rregulluar; klienti paguan 150€ e fundit pas rregullimit.';
    const id = await order(c, {
      productType: 'Kuzhinë',
      description: 'Kuzhinë në formë U, antracit mat',
      price: eur(6000),
      stage: 'done',
      doneAt: d(-12),
      payTerm: 'week',
      dueDate: d(-5),
      remainingWork: note,
      pausedUntil: d(10),
      pauseReason: 'Punë të mbetura',
      city: 'Prishtinë',
      created: -70,
    });
    await hist('order', id, d(-70), 'owner', `Porosia u krijua · ${fmt(eur(6000))}`);
    await pay({ orderId: id }, eur(3000), d(-70), 'owner');
    await hist('order', id, d(-70), 'owner', 'Avans 3,000€ (kesh) · në zyrë');
    await hist('order', id, d(-45), 'office', 'Faza: E re → Në punë');
    await pay({ orderId: id }, eur(2850), d(-12), 'office', { method: 'bank' });
    await hist('order', id, d(-12), 'office', 'Pagesë 2,850€ (bankë) · në zyrë', '15:00');
    await hist('order', id, d(-12), 'office', 'Faza: Në punë → E kryer · pagesa: brenda javës', '15:02');
    await hist('order', id, d(-11), 'owner', `Ka punë të mbetura: ${note}`);
    await hist('order', id, d(-11), 'owner', `Kujtesat në pauzë deri më ${dmy(d(10))}: Punë të mbetura`, '10:01');
  }

  /* 4. The 800€ case: Driton phoned "Mora 800€" today. */
  {
    const c = await cust('Fatmir Krasniqi', '+38344512330');
    const id = await order(c, {
      productType: 'Kuzhinë',
      description: 'Kuzhinë në formë L, MDF mat, sipërfaqe pune kuarc',
      price: eur(5000),
      stage: 'done',
      doneAt: today,
      payTerm: 'week',
      dueDate: d(7),
      city: 'Podujevë',
      directions:
        'Fshati Orllan: te xhamia e vjetër, kthesa e dytë djathtas, shtëpia me fasadë të bardhë. Babai është në shtëpi gjithë ditën: 044 512 330',
      internalNote: 'Zbritje 200€ sepse e rekomandoi Shpendi.',
      created: -52,
    });
    await hist('order', id, d(-52), 'owner', `Porosia u krijua · ${fmt(eur(5000))}`);
    await pay({ orderId: id }, eur(4200), d(-52), 'owner');
    await hist('order', id, d(-52), 'owner', 'Avans 4,200€ (kesh) · në zyrë');
    await hist('order', id, d(-30), 'office', 'Faza: E re → Në punë');
    await tx.insert(visit).values({ companyId, orderId: id, type: 'install', date: today, time: 'morning', installerId: I.Driton, doneAt: today });
    await pay({ orderId: id }, eur(800), today, 'owner', { heldBy: I.Driton });
    await hist('order', id, today, 'owner', 'Pagesë 800€ kesh · te Driton', '14:20');
    await hist('order', id, today, 'owner', 'Faza: Në punë → E kryer', '14:21');
  }

  /* 5. A cousin: "Mos sugjero kujtesa". */
  {
    const c = await cust('Ilir Gashi', '+38349204611', { noReminders: true, note: 'Kushëri i Arbenit' });
    const id = await order(c, {
      productType: 'Garderobë',
      description: 'Garderobë në kënd me pasqyrë',
      price: eur(900),
      stage: 'done',
      doneAt: d(-30),
      payTerm: 'week',
      dueDate: d(-23),
      city: 'Prishtinë',
      created: -45,
    });
    await hist('order', id, d(-45), 'owner', `Porosia u krijua · ${fmt(eur(900))}`);
    await hist('client', c, d(-45), 'owner', 'Mos sugjero kujtesa për borxh: po', '09:31');
    await hist('order', id, d(-30), 'owner', 'Faza: E re → E kryer · pagesa: brenda javës');
  }

  /* 6. Project paid ahead: 12 wardrobes, avans 5,000€, 3 installed (3,600€). */
  {
    const c = await cust('Ndërtimi Rugova sh.p.k.', '+38339431200');
    const id = await order(c, {
      productType: 'Garderobë',
      description: 'Garderoba për 12 banesa · Rezidenca Rugova, Pejë',
      price: eur(14400),
      quantity: 12,
      unit: 'copë',
      projectPayTerm: 'month',
      stage: 'active',
      city: 'Pejë',
      directions: 'Rezidenca Rugova, pas stacionit të autobusëve. Kryepunëtori Bekim: 049 611 402',
      created: -35,
    });
    await hist('order', id, d(-35), 'owner', `Porosia u krijua · ${fmt(eur(14400))} · 12 copë`);
    await pay({ orderId: id }, eur(5000), d(-35), 'owner', { method: 'bank' });
    await hist('order', id, d(-35), 'owner', 'Avans 5,000€ (bankë) · në zyrë');
    await part(id, 3, d(-8), I.Besnik);
    await hist('order', id, d(-8), 'office', 'Faza: E re → Në punë', '16:00');
    await hist('order', id, d(-8), 'office', `Montuar 3 copë · Besnik · ${dmy(d(-8))}`, '16:05');
  }

  /* 7. Cash with Faton for 24 days: the customer has paid and is never asked again. */
  {
    const c = await cust('Besa Morina', '+38344770512');
    const id = await order(c, {
      productType: 'Dollap banjoje',
      description: 'Dollap banjoje i varur me lavaman',
      price: eur(750),
      stage: 'done',
      doneAt: d(-24),
      payTerm: 'week',
      dueDate: d(-17),
      city: 'Lipjan',
      created: -40,
    });
    await hist('order', id, d(-40), 'office', `Porosia u krijua · ${fmt(eur(750))}`);
    await tx.insert(visit).values({ companyId, orderId: id, type: 'install', date: d(-24), time: 'afternoon', installerId: I.Faton, doneAt: d(-24) });
    await pay({ orderId: id }, eur(750), d(-24), 'office', { heldBy: I.Faton });
    await hist('order', id, d(-24), 'office', 'Pagesë 750€ kesh · te Faton', '17:30');
    await hist('order', id, d(-24), 'office', 'Faza: E re → E kryer', '17:31');
  }

  /* 8. A payment recorded twice, then deleted by the owner. */
  {
    const c = await cust('Liridona Shala', '+4915112345678', { language: 'de', note: 'Në Gjermani; prindërit në Vushtrri' });
    const id = await order(c, {
      productType: 'Garderobë',
      description: 'Garderobë deri në tavan, 3 m',
      price: eur(2400),
      stage: 'active',
      city: 'Vushtrri',
      directions: 'Prindërit e Liridonës: Rr. Skënderbeu 14, kati 2. Nëna Hava: 044 207 118',
      created: -20,
    });
    await hist('order', id, d(-20), 'office', `Porosia u krijua · ${fmt(eur(2400))}`);
    await pay({ orderId: id }, eur(1500), d(-20), 'office', { method: 'bank' });
    await hist('order', id, d(-20), 'office', 'Avans 1,500€ (bankë) · në zyrë');
    await hist('order', id, d(-15), 'office', 'Faza: E re → Në punë');
    await pay({ orderId: id }, eur(1500), d(-9), 'office', { method: 'bank', deletedAt: at(d(-8), '09:12') });
    await hist('order', id, d(-9), 'office', 'Pagesë 1,500€ (bankë) · në zyrë', '12:00');
    await hist('order', id, d(-8), 'owner', `Pagesa 1,500€ e ${dmy(d(-9))} u fshi: U regjistrua dy herë`, '09:12');
  }

  /* 9. Village job: only a "Si të shkoni" description. */
  {
    const c = await cust('Naim Berisha', '+38349318220');
    const id = await order(c, {
      productType: 'Kuzhinë',
      description: 'Kuzhinë e drejtë 3,6 m, fronte të bardha me shkëlqim',
      price: eur(3800),
      stage: 'active',
      city: 'Gjilan',
      directions: 'Fshati Livoç i Poshtëm: pas shkollës fillore, rruga e tretë majtas, shtëpia e dytë me portë jeshile. Djali Arianit: 049 318 221',
      created: -14,
    });
    await hist('order', id, d(-14), 'office', `Porosia u krijua · ${fmt(eur(3800))}`);
    await pay({ orderId: id }, eur(1000), d(-14), 'office');
    await hist('order', id, d(-14), 'office', 'Avans 1,000€ (kesh) · në zyrë');
    await hist('order', id, d(-6), 'office', 'Faza: E re → Në punë');
  }

  /* 10. Done 3 days ago, payable within the week: "Ende në afat". */
  {
    const c = await cust('Dritë Hyseni', '+38345610233');
    const id = await order(c, {
      productType: 'Dollap banjoje',
      description: 'Dollap banjoje me pasqyrë dhe ndriçim',
      price: eur(650),
      stage: 'done',
      doneAt: d(-3),
      payTerm: 'week',
      dueDate: d(4),
      city: 'Prishtinë',
      created: -18,
    });
    await hist('order', id, d(-18), 'office', `Porosia u krijua · ${fmt(eur(650))}`);
    await hist('order', id, d(-3), 'office', 'Faza: E re → E kryer · pagesa: brenda javës');
  }

  /* 11. New, with avans: the order to walk through the three stages. */
  {
    const c = await cust('Arta Krasniqi', '+38344600700');
    const id = await order(c, {
      productType: 'Kuzhinë',
      description: 'Kuzhinë me ishull, fronte arre',
      price: eur(4500),
      city: 'Prishtinë',
      directions: 'Lagjja Arbëria, Rr. Fehmi Agani 22, hyrja 3, kati 4.',
      created: -3,
    });
    await hist('order', id, d(-3), 'office', `Porosia u krijua · ${fmt(eur(4500))}`);
    await pay({ orderId: id }, eur(1500), d(-3), 'office', { method: 'card' });
    await hist('order', id, d(-3), 'office', 'Avans 1,500€ (kartelë) · në zyrë');
  }

  /* Opening balances from the notebook. */
  {
    const [ob] = await tx
      .insert(openingBalance)
      .values({
        companyId,
        name: 'Blerim Hasani',
        phone: '+38344901223',
        amount: eur(450),
        forWhat: 'Garderobë, 2024',
        workDone: '2024-05',
        dueDate: d(-60),
        note: 'Nga fletorja e vjetër',
        createdBy: users.owner,
        createdAt: at(d(-2)),
      })
      .returning();
    await hist('opening', ob.id, d(-2), 'owner', `Borxh i bartur u shtua: 450€ · afati ${dmy(d(-60))}`);
    const [ob2] = await tx
      .insert(openingBalance)
      .values({
        companyId,
        name: 'Shpresa Leka',
        phone: '+38349770114',
        amount: eur(1100),
        forWhat: 'Kuzhinë',
        note: 'Tha që paguan pas verës',
        createdBy: users.owner,
        createdAt: at(d(-2), '10:05'),
      })
      .returning();
    await hist('opening', ob2.id, d(-2), 'owner', 'Borxh i bartur u shtua: 1,100€ · afat i panjohur', '10:05');
  }

  await tx.update(company).set({ orderSeqYear: year, orderSeq: seq }).where(eq(company.id, companyId));
}
