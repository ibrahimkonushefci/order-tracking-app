/**
 * The realistic demo dataset (spec "Demo mode & seed data", PHASES.md Phase 5). All fictional.
 * Built in memory from the brand (business type, deposit word, company name, city) and today's
 * date, then bulk-inserted by load.ts. Everything is dated relative to `today`, so overdue days,
 * "for weeks" and the week's visits stay true on any day. Choices come from a seeded random
 * generator, so the same brand on the same day always gives the same data.
 *
 * The key cases (`keys`, used by the demo panel shortcuts and the QR):
 *  k800      Fatmir Krasniqi: installation today with Driton, €800 left (moment 4)
 *  track     Besa Zeka: installation tomorrow, paradite, with Driton (moment 2, the QR)
 *            Driton's tomorrow: Besa + Rinor's measurement (moment 3)
 *  overdue   Shpend Berisha: overdue, last reminder 20 days ago → green "Kujtesë" (moment 1)
 *  project   the builder's project that owes money and is late
 *  ahead     the project paid ahead ("Paguar përpara")
 *  remaining Mimoza Hoxha: remaining work, reminders paused, a repair visit this week
 *  cousin    Bekim Rexhepi: "Mos sugjero kujtesa"
 *  edited    Naim Kelmendi: a deleted duplicate payment and an edited price
 *  revoked   Liridona Shala (German): the tracking link was replaced
 *  plan      Granit Kastrati: yesterday's measurement not marked done
 *  Cash with installers: Lindita €350 with Besnik for 23 days; Arbnor €1.150 with Faton since
 *  yesterday (exactly the balance). The busy day: Driton has 2 jobs, Besnik 1, Faton is free.
 */
import { createHash, randomUUID } from 'node:crypto';
import type { Brand } from '../../brand/schema';
import { termDue } from '../../domain/balances';
import { addDays, weekday } from '../../lib/dates';
import type {
  client,
  history,
  installer,
  message,
  openingBalance,
  orders,
  payment,
  visit,
} from '../schema';
import { CATALOGS, type Project, type Role } from './catalog';

export interface DemoPeople {
  owner: { name: string; firstName: string };
  office: { name: string; firstName: string };
}

export const DEFAULT_PEOPLE: DemoPeople = {
  owner: { name: 'Arben Gashi', firstName: 'Arben' },
  office: { name: 'Teuta Berisha', firstName: 'Teuta' },
};

/** The same three crew leads in every demo brand, so the script ("Dërgoja Dritonit") never changes. */
export const DEMO_INSTALLERS = [
  { key: 'Driton', name: 'Driton', phone: '+38344281734', channel: 'whatsapp' as const },
  { key: 'Faton', name: 'Faton', phone: '+38349660218', channel: 'whatsapp' as const },
  { key: 'Besnik', name: 'Besnik', phone: '+38345117390', channel: 'viber' as const },
];

/**
 * Demo tracking tokens are derived from the brand and the case, so the laptop (PGlite) and the
 * online demo (Neon) give the same order the same link: a QR made offline opens online.
 * Demo data only; real orders always get 128 random bits.
 */
export function demoToken(slug: string, key: string): string {
  return createHash('sha256')
    .update(`order-tracking-demo:${slug}:${key}`)
    .digest('hex')
    .slice(0, 32);
}

type Ins<T extends { $inferInsert: unknown }> = T['$inferInsert'];
export interface DemoRows {
  installers: Ins<typeof installer>[];
  clients: Ins<typeof client>[];
  openings: Ins<typeof openingBalance>[];
  orders: Ins<typeof orders>[];
  visits: Ins<typeof visit>[];
  payments: Ins<typeof payment>[];
  messages: Ins<typeof message>[];
  history: Ins<typeof history>[];
  keys: Record<string, string>;
  orderSeq: number;
  orderSeqYear: number;
  busyDay: string;
}

function rng(seed: number) {
  // mulberry32, as in the prototype's data.js
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const eur = (n: number) => Math.round(n * 100);
const money = (c: number) =>
  '€' + String(Math.round(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const dmy = (iso: string) => iso.split('-').reverse().join('.');
const METHOD = { cash: 'kesh', bank: 'bankë', card: 'kartelë' } as const;
const TERM = {
  week: 'brenda javës',
  month: 'brenda muajit',
  date: 'në një datë',
  unknown: 'nuk e di',
} as const;
const VISIT = {
  measure: 'Matje',
  install: 'Montim',
  delivery: 'Dërgesë',
  repair: 'Riparim',
} as const;
const VISIT_DONE = {
  measure: 'Matja u krye',
  install: 'Montimi u krye',
  delivery: 'Dërgesa u krye',
  repair: 'Riparimi u krye',
} as const;
const timeWord = (t: string | null | undefined) =>
  t === 'morning' ? ' · paradite' : t === 'afternoon' ? ' · pasdite' : t ? ` · ${t}` : '';
const first = (name: string) => name.split(' ')[0];

type Who = 'owner' | 'office';
type InstKey = 'Driton' | 'Faton' | 'Besnik';
type VisitType = keyof typeof VISIT;
type Method = keyof typeof METHOD;

export function buildDemo(opts: {
  companyId: string;
  slug: string;
  brand: Pick<Brand, 'businessType' | 'depositWord' | 'companyName' | 'contact'>;
  users: Record<Who, { id: string; firstName: string }>;
  today: string;
}): DemoRows {
  const { companyId, slug, brand, users, today } = opts;
  const cat = CATALOGS[brand.businessType] ?? CATALOGS.kitchens;
  const word = brand.depositWord ?? 'Avans';
  const sign = (by: Who) => `${users[by].firstName}, ${brand.companyName}`;
  const r = rng([...slug].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7));
  const pick = <T>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const d = (n: number) => addDays(today, n);
  const at = (iso: string, hm = '10:00') => new Date(`${iso}T${hm}:00+02:00`);
  const hm = () =>
    `${String(9 + Math.floor(r() * 9)).padStart(2, '0')}:${pick(['05', '20', '35', '50'])}`;
  const priceOf = (role: Role, f = r()) =>
    eur(Math.round((role.min + f * (role.max - role.min)) / 50) * 50);

  const rows: DemoRows = {
    installers: [],
    clients: [],
    openings: [],
    orders: [],
    visits: [],
    payments: [],
    messages: [],
    history: [],
    keys: {},
    orderSeq: 0,
    orderSeqYear: 0,
    busyDay: '',
  };

  const I = {} as Record<InstKey, string>;
  DEMO_INSTALLERS.forEach((x, n) => {
    const id = randomUUID();
    I[x.key as InstKey] = id;
    const t = new Date(Date.now() - 1000 * (10 - n));
    rows.installers.push({
      id,
      companyId,
      name: x.name,
      phone: x.phone,
      channel: x.channel,
      createdAt: t,
      updatedAt: t,
    });
  });
  const iname = (id: string) => DEMO_INSTALLERS.find(x => I[x.key as InstKey] === id)!.name;

  // History lines written at the same minute keep their order: each one is a second later.
  let tick = 0;
  const hist = (
    recordType: 'order' | 'opening' | 'client',
    recordId: string,
    when: string,
    by: Who,
    text: string,
    time = '10:00',
  ) =>
    rows.history.push({
      companyId,
      recordType,
      recordId,
      userId: users[by].id,
      at: new Date(at(when, time).getTime() + ++tick * 1000),
      text,
    });

  /* ── Clients ── */
  const phoneKs = () =>
    `+383${pick(['44', '45', '49', '43'])}${String(100000 + Math.floor(r() * 899999))}`;
  const phoneAbroad = (cc: '49' | '41' | '43') =>
    cc === '49'
      ? `+49151${String(10000000 + Math.floor(r() * 89999999))}`
      : cc === '41'
        ? `+4179${String(1000000 + Math.floor(r() * 8999999))}`
        : `+43664${String(1000000 + Math.floor(r() * 8999999))}`;
  const usedPhones = new Set<string>();
  function cust(name: string, o: Partial<Ins<typeof client>> & { cc?: '49' | '41' | '43' } = {}) {
    const { cc, ...rest } = o;
    let phone = rest.phone ?? (cc ? phoneAbroad(cc) : phoneKs());
    while (usedPhones.has(phone)) phone = cc ? phoneAbroad(cc) : phoneKs();
    usedPhones.add(phone);
    const c = {
      id: randomUUID(),
      companyId,
      name,
      phone,
      channel: 'whatsapp' as const,
      language: 'sq' as const,
      ...rest,
    };
    rows.clients.push(c);
    return c;
  }

  /* ── Orders ── */
  type O = Ins<typeof orders> & { id: string; created: number; clientName: string };
  const all: O[] = [];
  function order(
    c: { id: string; name: string },
    o: Partial<Ins<typeof orders>> & { role?: Role; created: number; key?: string; by?: Who },
  ) {
    const { role, created, key, by = 'office', ...rest } = o;
    const id = randomUUID();
    const row: O = {
      id,
      companyId,
      number: '',
      clientId: c.id,
      clientName: c.name,
      productType: role?.type ?? cat.main.type,
      description: role ? pick(role.descs) : '',
      price: role ? priceOf(role) : 0,
      city: brand.contact.city || 'Prishtinë',
      trackingToken: demoToken(slug, key ?? `order-${all.length}`),
      createdBy: users[by].id,
      createdAt: at(d(created), '09:30'),
      created,
      ...rest,
    };
    all.push(row);
    if (key) rows.keys[key] = id;
    const project = row.quantity ? ` · ${row.quantity} ${row.unit}` : '';
    hist('order', id, d(created), by, `Porosia u krijua · ${money(row.price)}${project}`, '09:30');
    return row;
  }

  function pay(
    o: O | { id: string; opening: true },
    amount: number,
    day: number,
    by: Who,
    extra: Partial<Ins<typeof payment>> & { deposit?: boolean } = {},
  ) {
    const { deposit, ...rest } = extra;
    const method = (rest.method ?? 'cash') as Method;
    const isOpening = 'opening' in o;
    const date = d(day);
    const time = hm();
    const p = {
      id: randomUUID(),
      companyId,
      ...(isOpening ? { openingId: o.id } : { orderId: o.id }),
      amount,
      date,
      method,
      createdBy: users[by].id,
      createdAt: at(date, time),
      ...rest,
    };
    rows.payments.push(p);
    const rt = isOpening ? 'opening' : 'order';
    const text = rest.heldBy
      ? `Pagesë ${money(amount)} kesh · te ${iname(rest.heldBy)}`
      : deposit
        ? `${word} ${money(amount)} (${METHOD[method]}) · në zyrë`
        : `Pagesë ${money(amount)} (${METHOD[method]}) · në zyrë`;
    hist(rt, o.id, date, by, text, time);
    if (rest.handedAt)
      hist(
        rt,
        o.id,
        d(day + 1),
        by,
        `Konfirmuar: ${users[by].firstName} i mori ${money(amount)} nga ${iname(rest.heldBy!)}`,
        '09:10',
      );
    return p;
  }

  function plan(
    o: O,
    type: VisitType,
    day: number,
    inst: InstKey | null,
    extra: Partial<Ins<typeof visit>> & { plannedOn?: number } = {},
  ) {
    const { plannedOn, ...rest } = extra;
    const v = {
      id: randomUUID(),
      companyId,
      orderId: o.id,
      type,
      date: d(day),
      installerId: inst ? I[inst] : null,
      note: '',
      ...rest,
    };
    rows.visits.push(v);
    const on = Math.max(o.created, plannedOn ?? Math.min(day - 2, -1));
    hist(
      'order',
      o.id,
      d(on),
      'office',
      `Vizitë e planifikuar: ${VISIT[type]} · ${dmy(v.date)}${timeWord(v.time)} · ${inst ?? 'Pa montues'}`,
      '12:00',
    );
    if (v.doneAt)
      hist(
        'order',
        o.id,
        v.doneAt,
        'office',
        `${VISIT_DONE[type]}${inst ? ` · ${inst}` : ''}`,
        '17:00',
      );
    return v;
  }

  function part(o: O, qty: number, day: number, inst: InstKey) {
    rows.visits.push({
      id: randomUUID(),
      companyId,
      orderId: o.id,
      type: 'install',
      date: d(day),
      time: 'morning',
      installerId: I[inst],
      doneAt: d(day),
      quantity: qty,
      note: '',
    });
    hist(
      'order',
      o.id,
      d(day),
      'office',
      `Montuar ${qty} ${o.unit} · ${inst} · ${dmy(d(day))}`,
      '16:05',
    );
  }

  function toActive(o: O, day: number) {
    o.stage = 'active';
    hist('order', o.id, d(day), 'office', 'Faza: E re → Në punë', '08:45');
  }
  function toDone(
    o: O,
    day: number,
    term: 'week' | 'month' | 'date' | 'unknown',
    date?: string,
    by: Who = 'office',
  ) {
    o.stage = 'done';
    o.doneAt = d(day);
    o.payTerm = term;
    o.dueDate = termDue(o.doneAt, term, date);
    hist(
      'order',
      o.id,
      d(day),
      by,
      `Faza: Në punë → E kryer · pagesa: ${TERM[term]}${term === 'date' && date ? ` ${dmy(date)}` : ''}`,
      '17:20',
    );
  }

  const greet = { sq: 'Përshëndetje', de: 'Guten Tag', en: 'Hello' };
  function msg(
    o: O | { id: string; opening: true },
    name: string,
    type: 'reminder' | 'deposit' | 'visit' | 'link',
    day: number,
    by: Who,
    channel: 'whatsapp' | 'viber' = 'whatsapp',
    lang: 'sq' | 'de' = 'sq',
    amount = 0,
  ) {
    const isOpening = 'opening' in o;
    const time = `${17 + Math.floor(r() * 3)}:${pick(['10', '25', '40'])}`;
    const n = first(name);
    const text =
      lang === 'de'
        ? type === 'deposit'
          ? `${greet.de} ${n}, vielen Dank für Ihre Anzahlung von ${money(amount)}. Den Stand Ihres Auftrags sehen Sie jederzeit über Ihren Link. ${sign(by)}`
          : `${greet.de} ${n}, nur eine kurze Erinnerung an die offene Zahlung von ${money(amount)}. Vielen Dank! ${sign(by)}`
        : type === 'deposit'
          ? `${greet.sq} ${n}, faleminderit për ${word.toLowerCase()}in prej ${money(amount)}. Gjendjen e porosisë e shihni në linkun tuaj. ${sign(by)}`
          : type === 'reminder'
            ? `${greet.sq} ${n}, ju kujtojmë me respekt për pagesën e mbetur prej ${money(amount)}. Faleminderit! ${sign(by)}`
            : `${greet.sq} ${n}, vijmë për montim sipas marrëveshjes. ${sign(by)}`;
    rows.messages.push({
      companyId,
      ...(isOpening ? { openingId: o.id } : { orderId: o.id }),
      recipient: 'client',
      type,
      channel,
      language: lang,
      text,
      sentBy: users[by].id,
      sentAt: at(d(day), time),
    });
    const label =
      type === 'deposit'
        ? `${word}i u pranua`
        : type === 'reminder'
          ? 'Kujtesë për pagesë'
          : type === 'visit'
            ? 'Vijmë për …'
            : 'Linku i porosisë';
    hist(
      isOpening ? 'opening' : 'order',
      o.id,
      d(day),
      by,
      `Mesazh ${channel === 'viber' ? 'Viber' : 'WhatsApp'}: ${label} → ${n}`,
      time,
    );
  }

  const deposit = (price: number, share = 0.5) => Math.round((price * share) / 10000) * 10000;

  /* The week: the busy day is the coming Friday when it is 2+ days away, else 4 days ahead. */
  const fri = [1, 2, 3, 4, 5, 6, 7].find(n => weekday(d(n)) === 5)!;
  const busy = fri >= 2 && fri <= 6 ? fri : 4;
  const otherDays = [2, 3, 4, 5, 6].filter(x => x !== busy);
  rows.busyDay = d(busy);

  /* A returning client: Besa (moment 2) also has an older, paid order, shown under "Porositë e tjera të klientit". */
  let returning: { client: ReturnType<typeof cust>; directions: string } | null = null;

  /* ═══════════ Key cases ═══════════ */

  // 1. The €800 case (live): installation today with Driton, who will collect the last €800.
  {
    const c = cust('Fatmir Krasniqi', { phone: '+38344512330' });
    const o = order(c, {
      role: cat.main,
      key: 'k800',
      created: -52,
      by: 'owner',
      price: priceOf(cat.main, 0.4),
      stage: 'active',
      city: 'Podujevë',
      directions:
        'Fshati Orllan: te xhamia e vjetër, kthesa e dytë djathtas, shtëpia me fasadë të bardhë. Babai Fatmir është në shtëpi gjithë ditën: 044 512 330',
      internalNote: 'Zbritje €200 sepse e rekomandoi Shpendi.',
    });
    o.description = cat.main.descs[0];
    const dep = deposit(o.price);
    pay(o, dep, -52, 'owner', { deposit: true });
    msg(o, c.name, 'deposit', -52, 'owner', 'whatsapp', 'sq', dep);
    plan(o, 'measure', -45, 'Driton', { time: 'morning', doneAt: d(-45), plannedOn: -50 });
    toActive(o, -44);
    pay(o, o.price - dep - eur(800), -6, 'office', { method: 'bank' });
    const v = plan(o, 'install', 0, 'Driton', { time: 'morning', plannedOn: -5 });
    rows.keys.k800Visit = v.id;
  }

  // 2. The tracking page: installation tomorrow, paradite, with Driton (+ "Mblidh" in his list).
  {
    const c = cust('Besa Zeka');
    const directions = 'Rr. Ismail Qemali 18, hyrja nga oborri, kati 2. Zilja: Zeka.';
    returning = { client: c, directions };
    const o = order(c, {
      role: cat.second,
      key: 'track',
      created: -35,
      stage: 'active',
      directions,
    });
    const dep = deposit(o.price);
    pay(o, dep, -35, 'office', { method: 'bank', deposit: true });
    msg(o, c.name, 'deposit', -35, 'office', 'whatsapp', 'sq', dep);
    plan(o, 'measure', -31, 'Driton', { time: 'morning', doneAt: d(-31) });
    toActive(o, -30);
    plan(o, 'install', 1, 'Driton', { time: 'morning', plannedOn: -3 });
  }

  // 3. New order, measurement tomorrow afternoon: Driton's second job tomorrow.
  {
    const c = cust('Rinor Avdiu');
    const o = order(c, {
      role: cat.main,
      created: -3,
      directions: 'Blloku 3, hyrja 5, kati 6. Interfoni nuk punon, thirrni kur të arrini.',
      internalNote: 'Çmimi paraprak, konfirmohet pas matjes.',
    });
    plan(o, 'measure', 1, 'Driton', { time: 'afternoon', plannedOn: -3 });
  }

  // 4. Big overdue, last reminder 20 days ago: the green "Kujtesë" (the gentler second text).
  {
    const c = cust('Shpend Berisha');
    const o = order(c, {
      role: cat.main,
      key: 'overdue',
      created: -95,
      price: priceOf(cat.main, 0.85),
      city: 'Ferizaj',
      directions:
        'Lagjja Dardania, rruga pas shkollës fillore, shtëpia e tretë majtas, porta e zezë.',
    });
    const owed = Math.round((o.price * 0.3) / 5000) * 5000;
    const dep = deposit(o.price, 0.4);
    pay(o, dep, -95, 'owner', { deposit: true });
    plan(o, 'measure', -90, 'Besnik', { time: 'afternoon', doneAt: d(-90) });
    toActive(o, -88);
    plan(o, 'install', -40, 'Besnik', { time: 'morning', doneAt: d(-40) });
    pay(o, o.price - dep - owed, -40, 'office', {
      heldBy: I.Besnik,
      handedAt: at(d(-39), '09:10'),
      handedBy: users.office.id,
    });
    toDone(o, -40, 'week');
    msg(o, c.name, 'reminder', -26, 'office', 'whatsapp', 'sq', owed);
    msg(o, c.name, 'reminder', -20, 'office', 'whatsapp', 'sq', owed);
  }

  // 5. Overdue, reminded 3 days ago: quiet button, "Kujtesa e fundit: 3 ditë më parë".
  {
    const c = cust('Valbona Gashi', { channel: 'viber' });
    const o = order(c, {
      role: cat.second,
      created: -70,
      directions: 'Rr. Agim Ramadani 30, hyrja B, kati 4, banesa 12.',
    });
    const dep = deposit(o.price, 0.6);
    pay(o, dep, -70, 'office', { deposit: true });
    toActive(o, -60);
    plan(o, 'install', -24, 'Faton', { time: 'afternoon', doneAt: d(-24) });
    toDone(o, -24, 'date', d(-21));
    msg(o, c.name, 'reminder', -17, 'office', 'viber', 'sq', o.price - dep);
    msg(o, c.name, 'reminder', -3, 'office', 'whatsapp', 'sq', o.price - dep);
  }

  // 6. Remaining work + paused reminders + a repair visit this week.
  {
    const c = cust('Mimoza Hoxha');
    const note = 'Një derë duhet rregulluar; klienti paguan €150 e fundit pas rregullimit.';
    const o = order(c, {
      role: cat.main,
      key: 'remaining',
      created: -60,
      by: 'owner',
      city: 'Pejë',
      directions: 'Vitomiricë: pas urës së lumit, shtëpia e tretë djathtas me çati të kuqe.',
    });
    o.description = cat.main.descs[3];
    const dep = deposit(o.price, 0.45);
    pay(o, dep, -60, 'owner', { deposit: true });
    toActive(o, -50);
    plan(o, 'install', -10, 'Faton', { time: 'morning', doneAt: d(-10) });
    pay(o, o.price - dep - eur(150), -10, 'owner', {
      heldBy: I.Faton,
      handedAt: at(d(-9), '09:10'),
      handedBy: users.owner.id,
    });
    toDone(o, -10, 'week');
    o.remainingWork = note;
    o.pausedUntil = d(5);
    o.pauseReason = 'Punë të mbetura';
    hist('order', o.id, d(-10), 'office', `Ka punë të mbetura: ${note}`, '17:30');
    hist(
      'order',
      o.id,
      d(-10),
      'owner',
      `Kujtesat në pauzë deri më ${dmy(d(5))}: Punë të mbetura`,
      '17:31',
    );
    plan(o, 'repair', otherDays[1], 'Faton', {
      time: 'afternoon',
      note: 'Rregullo derën e dollapit të sipërm majtas',
      plannedOn: -8,
    });
  }

  // 7. Cash with an installer for weeks: the customer owes nothing, Besnik still has €350.
  {
    const c = cust('Lindita Bytyqi');
    const o = order(c, {
      role: cat.small,
      created: -55,
      city: 'Prizren',
      directions: 'Landovicë: përballë pompës së benzinës, shtëpia trekatëshe me tulla të kuqe.',
    });
    pay(o, o.price - eur(350), -55, 'office', { deposit: true });
    toActive(o, -40);
    plan(o, 'install', -23, 'Besnik', { time: 'morning', doneAt: d(-23) });
    pay(o, eur(350), -23, 'office', { heldBy: I.Besnik });
    toDone(o, -23, 'week');
  }

  // 8. The owner's cousin: "Mos sugjero kujtesa", overdue.
  {
    const c = cust('Bekim Rexhepi', { noReminders: true, note: 'Kushëri i pronarit' });
    hist('client', c.id, d(-80), 'owner', 'Mos sugjero kujtesa për borxh: po', '09:31');
    const o = order(c, {
      role: cat.second,
      key: 'cousin',
      created: -80,
      by: 'owner',
      directions: 'Rr. Fehmi Agani 41, kati përdhes, dera majtas.',
    });
    pay(o, eur(700), -80, 'owner', { deposit: true });
    toActive(o, -70);
    plan(o, 'install', -34, 'Driton', { time: 'afternoon', doneAt: d(-34) });
    toDone(o, -34, 'date', d(-30), 'owner');
  }

  // 9. Yesterday's measurement that nobody marked done → "1 punë nga dje: a u krye?".
  {
    const c = cust('Granit Kastrati');
    const o = order(c, {
      role: cat.main,
      key: 'plan',
      created: -6,
      by: 'owner',
      city: 'Mitrovicë',
      directions: 'Shipol: te dyqani “Market Besa”, 200 m majtas, shtëpia e re pa fasadë.',
    });
    const dep = deposit(o.price, 0.4);
    pay(o, dep, -6, 'owner', { deposit: true });
    msg(o, c.name, 'deposit', -6, 'owner', 'whatsapp', 'sq', dep);
    plan(o, 'measure', -1, 'Faton', { time: 'morning', plannedOn: -5 });
  }

  // 10. A payment entered twice and deleted, and an edited price: both in Historiku.
  {
    const c = cust('Naim Kelmendi');
    const o = order(c, {
      role: cat.main,
      key: 'edited',
      created: -25,
      city: 'Mitrovicë',
      directions: 'Lagjja e Re, Rr. Skënderbeu 7, shtëpi private, porta e gjelbër.',
    });
    const before = o.price - eur(200);
    rows.history.at(-1)!.text = `Porosia u krijua · ${money(before)}`;
    pay(o, eur(1500), -25, 'office', { deposit: true });
    pay(o, eur(1500), -25, 'office', { deletedAt: at(d(-24), '09:12') });
    hist(
      'order',
      o.id,
      d(-24),
      'owner',
      `Pagesa ${money(eur(1500))} e ${dmy(d(-25))} u fshi: U regjistrua dy herë`,
      '09:12',
    );
    plan(o, 'measure', -20, 'Besnik', { time: 'afternoon', doneAt: d(-20) });
    hist(
      'order',
      o.id,
      d(-20),
      'office',
      `Çmimi: ${money(before)} → ${money(o.price)} · +1 dollap i sipërm`,
      '11:40',
    );
    toActive(o, -19);
    plan(o, 'install', busy, 'Besnik', { time: 'morning', plannedOn: -4 });
  }

  // 11. Diaspora: the son in Switzerland pays; the parents' house is in "Si të shkoni". Paused.
  {
    const c = cust('Flamur Ajeti', { cc: '41', note: 'Jeton në Zvicër; paguan me bankë' });
    const o = order(c, {
      role: cat.main,
      created: -120,
      price: priceOf(cat.main, 0.7),
      city: 'Ferizaj',
      directions:
        'Shtëpia e prindërve në Nerodime e Epërme: te varrezat e fshatit, rruga e parë majtas, shtëpia e fundit. Nëna Hava është në shtëpi: 044 271 905.',
    });
    const dep = deposit(o.price, 0.45);
    pay(o, dep, -120, 'office', { method: 'bank', deposit: true });
    plan(o, 'measure', -115, 'Faton', { doneAt: d(-115) });
    toActive(o, -110);
    plan(o, 'install', -60, 'Faton', { time: 'morning', doneAt: d(-60) });
    const second = Math.round((o.price - dep) / 2 / 10000) * 10000;
    pay(o, second, -60, 'office', { method: 'bank' });
    toDone(o, -60, 'month');
    msg(o, c.name, 'reminder', -28, 'owner', 'whatsapp', 'sq', o.price - dep - second);
    o.pausedUntil = d(9);
    o.pauseReason = 'Premtoi të paguajë kur vjen në Kosovë';
    hist(
      'order',
      o.id,
      d(-27),
      'owner',
      `Kujtesat në pauzë deri më ${dmy(d(9))}: Premtoi të paguajë kur vjen në Kosovë`,
      '18:40',
    );
  }

  // 12. Diaspora in Germany, German messages; the first tracking link went to a wrong number.
  {
    const c = cust('Liridona Shala', {
      cc: '49',
      language: 'de',
      note: 'Në Gjermani; prindërit në Vushtrri',
    });
    const o = order(c, {
      role: cat.second,
      key: 'revoked',
      created: -20,
      city: 'Vushtrri',
      directions: 'Prindërit e Liridonës: Rr. Skënderbeu 14, kati 2. Nëna Hava: 044 207 118',
    });
    const dep = deposit(o.price);
    pay(o, dep, -20, 'office', { method: 'bank', deposit: true });
    msg(o, c.name, 'deposit', -20, 'office', 'whatsapp', 'de', dep);
    hist(
      'order',
      o.id,
      d(-19),
      'office',
      'U krijua link i ri për klientin; linku i vjetër nuk hapet më',
      '09:05',
    );
    o.trackingToken = demoToken(slug, 'revoked-new');
    rows.keys.revokedToken = demoToken(slug, 'revoked');
    toActive(o, -15);
    plan(o, 'install', 1, 'Faton', { time: 'afternoon', plannedOn: -4 });
  }

  // 13–15. The busy day: Driton has an installation and a measurement, Faton is free.
  {
    const c = cust('Arta Krasniqi');
    const o = order(c, {
      role: cat.second,
      created: -21,
      city: 'Fushë Kosovë',
      directions: 'Lagjja Ajvalia, pas xhamisë së re, shtëpia e dytë majtas me portë kafe.',
    });
    pay(o, deposit(o.price, 0.4), -21, 'office', { deposit: true });
    plan(o, 'measure', -18, 'Driton', { time: 'morning', doneAt: d(-18) });
    toActive(o, -17);
    plan(o, 'install', busy, 'Driton', { time: 'morning', plannedOn: -3 });
  }
  {
    const c = cust('Dardan Hyseni');
    const o = order(c, {
      role: cat.main,
      created: -2,
      directions: 'Rr. Nëna Terezë 12, kati 3, banesa 9.',
    });
    plan(o, 'measure', busy, 'Driton', { time: 'afternoon', plannedOn: -2 });
  }
  {
    const c = cust('Kujtim Halili');
    const o = order(c, {
      role: cat.delivery,
      created: -16,
      city: 'Gjilan',
      directions:
        'Livoç i Epërm: te shkolla e fshatit, rruga e parë djathtas, shtëpia me oborr të madh.',
    });
    pay(o, deposit(o.price), -16, 'office', { method: 'bank', deposit: true });
    toActive(o, -12);
    plan(o, 'delivery', otherDays[2], 'Besnik', { time: 'afternoon', plannedOn: -3 });
  }

  // 16. Cash that exactly matches the balance: Faton collected the rest yesterday.
  {
    const c = cust('Arbnor Hajdari');
    const o = order(c, {
      role: cat.second,
      created: -33,
      city: 'Gjilan',
      directions: 'Rr. Adem Jashari 55, pranë farmacisë “Hygjea”, kati 1.',
    });
    const dep = deposit(o.price, 0.4);
    pay(o, dep, -33, 'office', { deposit: true });
    toActive(o, -25);
    plan(o, 'install', -1, 'Faton', { time: 'afternoon', doneAt: d(-1) });
    pay(o, o.price - dep, -1, 'office', { heldBy: I.Faton });
    toDone(o, -1, 'week');
  }

  /* ── Projects: owes and is late · paid ahead · just signed ── */
  const projectKeys = ['project', 'ahead', 'project3'];
  cat.projects.forEach((p: Project, n) => {
    const c = cust(p.client, { phone: p.clientPhone, note: p.clientNote });
    const o = order(c, {
      key: projectKeys[n],
      created: p.created,
      by: 'owner',
      productType: p.type,
      description: p.desc,
      price: eur(p.qty * p.unitPrice),
      quantity: p.qty,
      unit: p.unit,
      projectPayTerm: 'month',
      city: p.city,
      directions: `${p.site}.`,
    });
    hist('order', o.id, d(p.created), 'owner', 'Çdo montim paguhet: brenda muajit', '09:31');
    p.paid.forEach(([e, day], i) =>
      pay(o, eur(e), day, i ? 'office' : 'owner', { method: 'bank', deposit: i === 0 }),
    );
    if (n !== 2)
      plan(o, 'measure', p.created + 5, 'Driton', {
        doneAt: d(p.created + 5),
        plannedOn: p.created + 1,
      });
    p.parts.forEach(([q, day], i) => {
      if (i === 0) {
        o.stage = 'active';
        hist('order', o.id, d(day), 'office', 'Faza: E re → Në punë', '16:00');
      }
      part(o, q, day, (['Driton', 'Faton', 'Besnik'] as InstKey[])[(i + n) % 3]);
    });
    const nextDay = n === 0 ? otherDays[0] : n === 1 ? 1 : otherDays[3];
    plan(
      o,
      n === 2 ? 'measure' : 'install',
      nextDay,
      n === 1 ? 'Besnik' : n === 0 ? 'Besnik' : 'Driton',
      {
        time: n === 1 ? '08:30' : 'morning',
        note: n === 2 ? 'Matje në objekt me investitorin' : p.next,
        plannedOn: -3,
      },
    );
  });

  /* ═══════════ Filler: the rest of a normal season ═══════════ */
  const VILLAGES: Record<string, string[]> = {
    Prishtinë: ['Graçanicë', 'Llukar', 'Bërnicë e Poshtme'],
    Podujevë: ['Orllan', 'Lupç i Poshtëm', 'Sfeçël'],
    Ferizaj: ['Nerodime e Epërme', 'Talinoc i Muhaxherëve', 'Softaj'],
    Pejë: ['Vitomiricë', 'Gllogjan', 'Raushiq'],
    Gjakovë: ['Rogovë', 'Bec', 'Ponoshec'],
    Prizren: ['Landovicë', 'Zhur', 'Gjonaj'],
    Gjilan: ['Livoç i Epërm', 'Pogragjë', 'Malishevë e Gjilanit'],
    Mitrovicë: ['Shipol', 'Vaganicë', 'Shupkovc'],
    Vushtrri: ['Pantinë', 'Stanoc i Poshtëm', 'Smrekoc'],
    Suharekë: ['Mushtisht', 'Reshtan', 'Sopijë'],
  };
  const VILLAGE_REF = [
    'te xhamia e vjetër, kthesa e dytë djathtas, shtëpia me fasadë të bardhë',
    'pas shkollës fillore, rruga e asfaltuar deri në fund, porta e gjelbër',
    'përballë pompës së benzinës, shtëpia trekatëshe me tulla të kuqe',
    'pas urës së lumit, shtëpia e tretë djathtas me çati të kuqe',
    'te dyqani i fshatit, 300 m majtas, shtëpia e re me oborr të madh',
    'te varrezat e fshatit, rruga e parë majtas, shtëpia e fundit',
  ];
  const CITY_REF = [
    'Hyrja nga oborri, kati i dytë',
    'Pranë shkollës, hyrja B, kati 4',
    'Shtëpi private, porta e zezë',
    'Banesa mbi farmaci, hyrja nga pas',
    'Lagjja Kalabria, hyrja 3, kati 5',
    'Rruga kryesore, pranë bankës, kati 1',
  ];
  const SITE_PEOPLE = [
    'Babai Rexhep',
    'Nëna Shqipe',
    'Vëllai Agim',
    'Xhaxhai Ramadan',
    'Gjyshja Zade',
    'Motra Vlora',
  ];

  const KS = [
    'Arbër Hoxha',
    'Vesa Kryeziu',
    'Mentor Bajrami',
    'Albana Ismaili',
    'Rrezarta Haliti',
    'Leotrim Maloku',
    'Endrit Shabani',
    'Saranda Gjoka',
    'Kreshnik Dema',
    'Mirlinda Beqiri',
    'Ylber Sylejmani',
    'Shkurte Bislimi',
    'Agim Thaçi',
    'Drita Selimi',
    'Blerim Krasniqi',
    'Diellza Morina',
    'Fitore Rama',
    'Gëzim Berisha',
    'Lumnije Hasani',
    'Bujar Mehmeti',
    'Arlinda Zeqiri',
    'Valdet Kastrati',
    'Nora Avdiu',
    'Ermal Gashi',
    'Fjolla Statovci',
    'Besart Shala',
    'Qëndresa Sopi',
    'Ardian Limani',
    'Hana Musliu',
    'Shkelzen Rexha',
  ];
  const ABROAD: [string, '49' | '41' | '43', string, 'sq' | 'de'][] = [
    ['Fisnik Bytyçi', '49', 'Gjermani', 'de'],
    ['Merita Jashari', '41', 'Zvicër', 'sq'],
    ['Ilir Hajrizi', '43', 'Austri', 'de'],
    ['Labinot Gjocaj', '49', 'Gjermani', 'sq'],
    ['Edona Kelmendi', '41', 'Zvicër', 'de'],
    ['Adem Hoti', '49', 'Gjermani', 'sq'],
    ['Fatime Rugova', '43', 'Austri', 'sq'],
    ['Petrit Llapashtica', '41', 'Zvicër', 'sq'],
  ];
  const CITIES = Object.keys(VILLAGES);

  // [stage, age in days, role, payment pattern]
  type Pattern = 'paid' | 'late' | 'inTerm' | 'unknown' | 'deposit' | 'none' | 'remaining';
  const PLAN: [
    string,
    number,
    keyof Pick<typeof cat, 'main' | 'second' | 'small' | 'delivery'>,
    Pattern,
  ][] = [
    ['done', 150, 'main', 'paid'],
    ['done', 140, 'second', 'paid'],
    ['done', 132, 'main', 'paid'],
    ['done', 126, 'small', 'paid'],
    ['done', 118, 'main', 'paid'],
    ['done', 110, 'delivery', 'paid'],
    ['done', 104, 'second', 'paid'],
    ['done', 97, 'main', 'late'],
    ['done', 92, 'small', 'paid'],
    ['done', 88, 'main', 'paid'],
    ['done', 84, 'second', 'late'],
    ['done', 79, 'main', 'paid'],
    ['done', 75, 'small', 'paid'],
    ['done', 70, 'main', 'unknown'],
    ['done', 66, 'second', 'paid'],
    ['done', 62, 'main', 'late'],
    ['done', 58, 'delivery', 'paid'],
    ['done', 54, 'small', 'paid'],
    ['done', 49, 'main', 'remaining'],
    ['done', 45, 'second', 'paid'],
    ['done', 41, 'main', 'late'],
    ['done', 36, 'small', 'inTerm'],
    ['done', 33, 'second', 'inTerm'],
    ['done', 30, 'main', 'paid'],
    ['active', 40, 'main', 'deposit'],
    ['active', 34, 'second', 'deposit'],
    ['active', 28, 'main', 'deposit'],
    ['active', 24, 'delivery', 'deposit'],
    ['active', 19, 'main', 'deposit'],
    ['active', 15, 'second', 'deposit'],
    ['active', 12, 'small', 'deposit'],
    ['active', 10, 'main', 'deposit'],
    ['new', 9, 'main', 'deposit'],
    ['new', 7, 'second', 'none'],
    ['new', 5, 'main', 'deposit'],
    ['new', 4, 'small', 'none'],
    ['new', 2, 'main', 'none'],
    ['new', 1, 'second', 'deposit'],
  ];
  const fillerClients = [
    ...KS.map(n => ({ n, abroad: null as null | (typeof ABROAD)[number] })),
    ...ABROAD.map(a => ({ n: a[0], abroad: a })),
  ];
  // Diaspora clients spread through the season (every fourth order), Kosovo clients in between.
  const order38 = PLAN.map((_, i) =>
    i % 4 === 2 && i / 4 < ABROAD.length ? fillerClients[KS.length + Math.floor(i / 4)] : null,
  );
  let ksNext = 0;
  const installersByTurn: InstKey[] = ['Driton', 'Faton', 'Besnik'];
  let lateMsg = 0;
  PLAN.forEach(([stage, age, roleKey, pat], i) => {
    const pickC = order38[i] ?? fillerClients[ksNext++ % KS.length];
    const abroad = pickC.abroad;
    const village = i % 3 === 0 || !!abroad;
    const city = CITIES[(i * 7) % CITIES.length];
    const vname = VILLAGES[city][i % 3];
    const person = `${pick(SITE_PEOPLE)}: 04${4 + (i % 6)} ${String(100 + ((i * 37) % 900))} ${String(100 + ((i * 53) % 900))}`;
    const directions = abroad
      ? `Shtëpia e familjes në ${vname}: ${pick(VILLAGE_REF)}. ${person}`
      : village
        ? `${vname}: ${pick(VILLAGE_REF)}.${i % 2 ? ` ${person}` : ''}`
        : `${pick(CITY_REF)}.`;
    // The oldest order (done and paid five months ago) is Besa's first one with the workshop.
    const repeat = i === 0 ? returning : null;
    const c =
      repeat?.client ??
      cust(
        pickC.n,
        abroad
          ? {
              cc: abroad[1],
              language: abroad[3],
              note: `Jeton në ${abroad[2]}; puna në shtëpinë e familjes`,
            }
          : {},
      );
    const role = cat[roleKey];
    const o = order(c, {
      role,
      created: -age,
      stage: stage === 'new' ? 'new' : 'active',
      city: repeat ? brand.contact.city || 'Prishtinë' : city,
    });
    o.directions = repeat?.directions ?? directions;
    const inst = installersByTurn[i % 3];
    const share = 0.3 + r() * 0.3;
    const dep = pat === 'none' ? 0 : deposit(o.price, share) || eur(200);
    if (dep)
      pay(o, dep, -age, i % 4 === 0 ? 'owner' : 'office', {
        method: i === 3 ? 'cash' : pick(['cash', 'cash', 'bank'] as Method[]),
        deposit: true,
      });
    if (i === 3) {
      // An edited payment: the deposit was first typed €100 too low, then corrected.
      rows.history.at(-1)!.text = `${word} ${money(dep - eur(100))} (kesh) · në zyrë`;
      hist(
        'order',
        o.id,
        d(-age + 1),
        'owner',
        `Pagesa u ndryshua: ${money(dep - eur(100))} → ${money(dep)}`,
        '08:40',
      );
    }
    if (abroad && dep) msg(o, c.name, 'deposit', -age, 'office', 'whatsapp', abroad[3], dep);
    if (stage === 'new') {
      // Measurements this week: one today, the rest on days other than the busy one.
      const day = { 32: 0, 34: otherDays[0], 36: otherDays[2] }[i];
      if (day != null)
        plan(o, 'measure', day, day === 0 ? 'Faton' : inst, {
          time: day === 0 ? 'afternoon' : pick(['morning', 'afternoon']),
          plannedOn: -age,
        });
      return;
    }
    if (roleKey !== 'delivery')
      plan(o, 'measure', -age + 3, inst, {
        time: pick(['morning', 'afternoon']),
        doneAt: d(-age + 3),
      });
    toActive(o, -age + 6);
    if (stage === 'active') {
      // About half of the active orders have their installation or delivery planned this week.
      if (i % 2 === 0)
        plan(
          o,
          roleKey === 'delivery' ? 'delivery' : 'install',
          otherDays[(i / 2) % otherDays.length],
          inst === 'Driton' ? 'Besnik' : inst,
          { time: pick(['morning', 'afternoon', '08:30', null]) },
        );
      return;
    }
    const doneDay = -age + 30;
    plan(o, roleKey === 'delivery' ? 'delivery' : 'install', doneDay, inst, {
      time: 'morning',
      doneAt: d(doneDay),
    });
    const rest = o.price - dep;
    if (pat === 'paid') {
      const held = i % 5 === 1;
      pay(
        o,
        rest,
        doneDay,
        'office',
        held
          ? { heldBy: I[inst], handedAt: at(d(doneDay + 1), '09:10'), handedBy: users.office.id }
          : { method: pick(['cash', 'bank'] as Method[]) },
      );
      toDone(o, doneDay, pick(['week', 'week', 'month'] as const));
      return;
    }
    if (pat === 'late') {
      // The customer paid part of the rest at the installation; €300–1.500 is still open.
      const open = Math.max(
        eur(300),
        Math.min(eur(1500), Math.round((rest * (0.35 + r() * 0.25)) / 5000) * 5000),
      );
      const part = rest - open;
      if (part > 0) pay(o, part, doneDay, 'office', { method: 'cash' });
      toDone(o, doneDay, lateMsg % 2 ? 'month' : 'week');
      // Reminder history: one 9 days ago (green again), one 2 days ago (quiet), one never.
      if (lateMsg === 0)
        msg(
          o,
          c.name,
          'reminder',
          -9,
          'office',
          'whatsapp',
          c.language === 'de' ? 'de' : 'sq',
          rest - part,
        );
      if (lateMsg === 1)
        msg(
          o,
          c.name,
          'reminder',
          -2,
          'owner',
          'viber',
          c.language === 'de' ? 'de' : 'sq',
          rest - part,
        );
      lateMsg++;
      return;
    }
    if (pat === 'inTerm') {
      toDone(o, doneDay, 'week');
      return;
    }
    if (pat === 'unknown') {
      pay(o, Math.round(rest / 2 / 10000) * 10000, doneDay, 'office', { method: 'bank' });
      toDone(o, doneDay, 'unknown', undefined, 'owner');
      return;
    }
    if (pat === 'remaining') {
      const note = `Mungojnë ${cat.noun === 'dyer' ? '2 pragje' : cat.noun === 'dritare' ? '2 doreza dritaresh' : '2 doreza dhe një raft'}; i çojmë kur të vijnë nga furnitori.`;
      pay(o, rest - eur(250), doneDay, 'office', { method: 'cash' });
      toDone(o, doneDay, 'week');
      o.remainingWork = note;
      o.pausedUntil = d(12);
      o.pauseReason = 'Punë të mbetura';
      hist('order', o.id, d(doneDay), 'office', `Ka punë të mbetura: ${note}`, '17:40');
      hist(
        'order',
        o.id,
        d(doneDay),
        'office',
        `Kujtesat në pauzë deri më ${dmy(d(12))}: Punë të mbetura`,
        '17:41',
      );
    }
  });

  /* ═══════════ Opening balances ("Borxh i bartur") from the notebook ═══════════ */
  type OB = Ins<typeof openingBalance> & { id: string };
  function opening(
    name: string,
    amount: number,
    o: Partial<Ins<typeof openingBalance>> = {},
    created = -14,
  ) {
    const ob: OB = {
      id: randomUUID(),
      companyId,
      name,
      phone: phoneKs(),
      amount: eur(amount),
      createdBy: users.owner.id,
      createdAt: at(d(created), '18:40'),
      ...o,
    };
    rows.openings.push(ob);
    hist(
      'opening',
      ob.id,
      d(created),
      'owner',
      `Borxh i bartur u shtua: ${money(ob.amount)} · ${ob.dueDate ? `afati ${dmy(ob.dueDate)}` : 'afat i panjohur'}`,
      '18:40',
    );
    return { ...ob, opening: true as const };
  }
  const year = Number(today.slice(0, 4));
  const blerim = opening('Blerim Hasani', 450, {
    forWhat: `${cat.small.type}, ${year - 2}`,
    workDone: `${year - 2}-05`,
    dueDate: d(-60),
    note: 'Nga fletorja e vjetër',
  });
  msg(blerim, 'Blerim Hasani', 'reminder', -3, 'owner', 'whatsapp', 'sq', eur(450));
  opening('Kadri Mustafa', 1200, {
    forWhat: `${cat.main.type}, ${year - 1}`,
    workDone: `${year - 1}-03`,
    dueDate: `${year - 1}-04-30`,
    dueApprox: true,
  });
  opening('Hysen Zeqiri', 300, { forWhat: 'Riparim', workDone: d(-60), dueDate: d(-45) });
  opening('Shqipe Ramadani', 650, { forWhat: cat.second.type, note: 'Tha që paguan pas verës' });
  const fadil = opening('Fadil Ahmeti', 2100, {
    forWhat: `${cat.main.type} + ${cat.second.type.toLowerCase()}`,
    workDone: `${year - 1}-11`,
    dueDate: `${year - 1}-12-31`,
    dueApprox: true,
  });
  pay(fadil, eur(400), -7, 'owner', {});
  opening('Arta Dauti', 250, { forWhat: cat.small.type, workDone: d(-20), dueDate: d(10) });
  opening('Remzi Uka', 900, {
    forWhat: cat.main.type,
    note: 'Xhaxhai i Teutës',
    noReminders: true,
  });
  const sabri = opening('Sabri Gërguri', 1500, {
    forWhat: cat.second.type,
    workDone: `${year - 1}-08`,
    dueDate: `${year - 1}-09-30`,
    dueApprox: true,
    pausedUntil: d(20),
    pauseReason: 'Premtoi të paguajë pas pensionit',
  });
  hist(
    'opening',
    sabri.id,
    d(-5),
    'owner',
    `Kujtesat në pauzë deri më ${dmy(d(20))}: Premtoi të paguajë pas pensionit`,
    '11:00',
  );

  /* Order numbers in creation order; the sequence restarts each year. */
  const sorted = [...all].sort(
    (a, b) => a.created - b.created || a.clientName.localeCompare(b.clientName),
  );
  const seqByYear: Record<number, number> = {};
  for (const o of sorted) {
    const y = Number(d(o.created).slice(0, 4));
    seqByYear[y] = (seqByYear[y] ?? (y === year ? 40 : 180)) + 1;
    o.number = `${y}-${String(seqByYear[y]).padStart(3, '0')}`;
  }
  rows.orderSeqYear = year;
  rows.orderSeq = seqByYear[year] ?? 40;
  rows.orders = sorted.map(o => {
    const row: Partial<O> = { ...o };
    delete row.created;
    delete row.clientName;
    return row as Ins<typeof orders>;
  });
  return rows;
}
