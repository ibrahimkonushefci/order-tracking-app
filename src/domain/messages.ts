/**
 * Prepared messages (spec §5, §7). Nothing here sends anything: it writes the text a person
 * reviews and sends by hand, and decides when the green "Kujtesë" is reasonable.
 *
 * - Customer templates in sq/en/de, editable per company (Cilësimet → Mesazhet), filled with
 *   {customerName}, {orderNumber}, {product}, {date}, {time}, {visitType}, {balance}, {what},
 *   {amount}, {depositWord}, {trackingLink}, {reviewLink}, {companyName}, {companyPhone}, {staffName}.
 * - Installer messages are Albanian only and never include the internal note.
 */
import { diffDays, fmtDate, WEEKDAYS, WEEKDAYS_ON } from '@/lib/dates';
import { eur } from '@/lib/money';
import { fmtPhone } from '@/lib/phone';
import { lastReminder, type MessageLite } from './debts';
import { installedQty, isProject, orderTotals } from './balances';
import { collectsCash, nextVisit, toCollect, visitSort, type VisitLite, type VisitOrder } from './visits';

export type Lang = 'sq' | 'en' | 'de';
export const LANGS: readonly Lang[] = ['sq', 'en', 'de'];
export type TemplateType = 'deposit' | 'visit' | 'link' | 'thanks' | 'reminder' | 'reminderAgain' | 'free';
export const TEMPLATE_TYPES: readonly TemplateType[] = ['deposit', 'visit', 'link', 'thanks', 'reminder', 'reminderAgain', 'free'];
/** What the staff picks on the compose screen; "reminder" becomes "reminderAgain" after the first one. */
export type MessageKind = Exclude<TemplateType, 'reminderAgain'>;

const SIGN = '\n\n{staffName}, {companyName}';

export const DEFAULT_TEMPLATES: Record<Lang, Record<TemplateType, string>> = {
  sq: {
    deposit: `Përshëndetje {customerName}, faleminderit për {depositWord}in prej {amount}. Porosia juaj {orderNumber} ({product}) u regjistrua. Gjendjen e porosisë mund ta ndiqni këtu:\n{trackingLink}${SIGN}`,
    visit: `Përshëndetje {customerName}, ekipi ynë vjen për {visitType} {date}, {time}. Nëse nuk ju përshtatet, na shkruani dhe e rregullojmë.\n{trackingLink}${SIGN}`,
    link: `Përshëndetje {customerName}, këtu mund ta ndiqni gjendjen e porosisë suaj {orderNumber}:\n{trackingLink}${SIGN}`,
    thanks: `Faleminderit {customerName}! Shpresojmë që t’ju pëlqejë {product}. Nëse jeni të kënaqur, një vlerësim i shkurtër na ndihmon shumë:\n{reviewLink}${SIGN}`,
    reminder: `Përshëndetje {customerName}, shpresojmë që jeni mirë. Ju kujtojmë me mirësjellje që {what} ka mbetur për t’u paguar {balance}. Nëse e keni paguar tashmë, ju lutem mos e merrni parasysh këtë mesazh. Faleminderit!${SIGN}`,
    reminderAgain: `Përshëndetje {customerName}, vetëm një kujtesë e vogël për {balance} që ka mbetur {what}. Nëse ju përshtatet më mirë një datë tjetër, na tregoni dhe e rregullojmë bashkë. Faleminderit për mirëkuptimin!${SIGN}`,
    free: `Përshëndetje {customerName},\n${SIGN}`,
  },
  en: {
    deposit: `Hello {customerName}, thank you for your deposit of {amount}. Your order {orderNumber} ({product}) is registered. You can follow its progress here:\n{trackingLink}${SIGN}`,
    visit: `Hello {customerName}, our team is coming {date}, {time} for the {visitType}. If that doesn’t suit you, just write to us and we’ll find another time.\n{trackingLink}${SIGN}`,
    link: `Hello {customerName}, you can follow the progress of your order {orderNumber} here:\n{trackingLink}${SIGN}`,
    thanks: `Thank you, {customerName}! We hope you enjoy your {product}. If you are happy with our work, a short review helps us a lot:\n{reviewLink}${SIGN}`,
    reminder: `Hello {customerName}, we hope you are well. This is a friendly reminder that {balance} is still open {what}. If you have already paid, please ignore this message. Thank you!${SIGN}`,
    reminderAgain: `Hello {customerName}, just a small reminder about the {balance} still open {what}. If another date suits you better, let us know and we’ll sort it out together. Thank you for your understanding!${SIGN}`,
    free: `Hello {customerName},\n${SIGN}`,
  },
  de: {
    deposit: `Guten Tag {customerName}, vielen Dank für Ihre Anzahlung von {amount}. Ihr Auftrag {orderNumber} ({product}) ist erfasst. Den Stand können Sie hier verfolgen:\n{trackingLink}${SIGN}`,
    visit: `Guten Tag {customerName}, unser Team kommt {date}, {time} {visitType}. Falls es Ihnen nicht passt, schreiben Sie uns einfach und wir finden einen anderen Termin.\n{trackingLink}${SIGN}`,
    link: `Guten Tag {customerName}, hier können Sie den Stand Ihres Auftrags {orderNumber} verfolgen:\n{trackingLink}${SIGN}`,
    thanks: `Vielen Dank, {customerName}! Wir hoffen, dass Ihnen {product} gefällt. Wenn Sie zufrieden sind, hilft uns eine kurze Bewertung sehr:\n{reviewLink}${SIGN}`,
    reminder: `Guten Tag {customerName}, wir hoffen, es geht Ihnen gut. Wir möchten Sie freundlich daran erinnern, dass {what} noch {balance} offen sind. Falls Sie bereits bezahlt haben, betrachten Sie diese Nachricht bitte als gegenstandslos. Vielen Dank!${SIGN}`,
    reminderAgain: `Guten Tag {customerName}, nur eine kleine Erinnerung an die noch offenen {balance} {what}. Wenn Ihnen ein anderer Termin besser passt, sagen Sie uns einfach Bescheid. Vielen Dank für Ihr Verständnis!${SIGN}`,
    free: `Guten Tag {customerName},\n${SIGN}`,
  },
};

export const TEMPLATE_VARS = [
  'customerName',
  'orderNumber',
  'product',
  'date',
  'time',
  'visitType',
  'balance',
  'what',
  'amount',
  'depositWord',
  'trackingLink',
  'reviewLink',
  'companyName',
  'companyPhone',
  'staffName',
] as const;
export type TemplateVars = Partial<Record<(typeof TEMPLATE_VARS)[number], string>>;

/** Fills a template; an empty variable leaves no stray comma, colon or double space behind. */
export function fill(template: string, vars: TemplateVars): string {
  const E = '\u0001'; // marks an empty variable, so only the punctuation around it is tidied
  return template
    .replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k as keyof TemplateVars] || E : m))
    .replace(new RegExp(`[ \\t]*,[ \\t]*${E}`, 'g'), '')
    .replace(new RegExp(`:[ \\t]*\\n[ \\t]*${E}`, 'g'), '.')
    .replace(new RegExp(`\\([ \\t]*${E}[ \\t]*\\)`, 'g'), '')
    .replaceAll(E, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,!?])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** The company's own wording wins over the defaults. */
export function templateOf(overrides: Partial<Record<Lang, Partial<Record<string, string>>>> | null | undefined, lang: Lang, type: TemplateType) {
  const o = overrides?.[lang]?.[type];
  return o && o.trim() ? o : DEFAULT_TEMPLATES[lang][type];
}

/** Greeting name: a person's first name, or a company's name without "sh.p.k.". */
export const greetName = (name: string) =>
  /sh\.?\s?p\.?\s?k|l\.?l\.?c/i.test(name) ? name.replace(/\s*(sh\.?\s?p\.?\s?k\.?|l\.?l\.?c\.?)\s*$/i, '').trim() : name.trim().split(/\s+/)[0];

/* ───────── words in the customer's language ───────── */

const WEEKDAY: Record<Exclude<Lang, 'sq'>, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
};
const dow = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

/** "nesër (të enjten, 23.10)" / "tomorrow (Thursday 23.10)" / "morgen (Donnerstag, 23.10.)". */
export function onDay(iso: string, today: string, lang: Lang): string {
  const dm = fmtDate(iso).slice(0, 5);
  const diff = diffDays(iso, today);
  if (lang === 'sq') {
    const base = `${WEEKDAYS_ON[dow(iso)]}, ${dm}`;
    return diff === 0 ? `sot (${base})` : diff === 1 ? `nesër (${base})` : base;
  }
  if (lang === 'en') {
    const base = `${WEEKDAY.en[dow(iso)]} ${dm}`;
    return diff === 0 ? `today (${base})` : diff === 1 ? `tomorrow (${base})` : `on ${base}`;
  }
  const base = `${WEEKDAY.de[dow(iso)]}, ${dm}.`;
  return diff === 0 ? `heute (${base})` : diff === 1 ? `morgen (${base})` : `am ${base}`;
}

const TIME_WORDS: Record<Lang, { morning: string; afternoon: string; at: (t: string) => string }> = {
  sq: { morning: 'paradite', afternoon: 'pasdite', at: t => `ora ${t}` },
  en: { morning: 'in the morning', afternoon: 'in the afternoon', at: t => `at ${t}` },
  de: { morning: 'vormittags', afternoon: 'nachmittags', at: t => `um ${t} Uhr` },
};
export const timeWords = (t: string | null | undefined, lang: Lang) =>
  !t ? '' : t === 'morning' ? TIME_WORDS[lang].morning : t === 'afternoon' ? TIME_WORDS[lang].afternoon : TIME_WORDS[lang].at(t);

const VISIT_WORDS: Record<Lang, Record<VisitLite['type'], string>> = {
  sq: { measure: 'matje', install: 'montim', delivery: 'dërgesë', repair: 'të përfunduar punën' },
  en: { measure: 'measurement', install: 'installation', delivery: 'delivery', repair: 'remaining work' },
  de: { measure: 'zum Aufmessen', install: 'zur Montage', delivery: 'zur Lieferung', repair: 'für die restlichen Arbeiten' },
};

const UNIT_WORDS: Record<Exclude<Lang, 'sq'>, Record<string, string>> = {
  en: { copë: 'pieces', banesa: 'apartments', 'm²': 'm²' },
  de: { copë: 'Stück', banesa: 'Wohnungen', 'm²': 'm²' },
};
const unitIn = (unit: string, lang: Lang) => (lang === 'sq' ? unit : (UNIT_WORDS[lang][unit] ?? unit));

/* ───────── which templates, and when the green "Kujtesë" shows ───────── */

export { reminderCheck, REMINDER_GAP_DAYS, type ReminderCheck } from './debts';

export interface MsgOrder extends VisitOrder {
  productType: string;
  description: string;
  directions: string;
  trackingToken: string;
  client: { name: string; phone: string };
  messages: MessageLite[];
}

/** Templates offered on an order right now, most useful first. */
export function templatesFor(o: MsgOrder, today: string): MessageKind[] {
  const t = orderTotals(o);
  const list: MessageKind[] = [];
  if (t.owed > 0) list.push('reminder');
  if (nextVisit(o.visits, today)) list.push('visit');
  if (o.stage !== 'done' && o.payments.some(p => !p.deletedAt)) list.push('deposit');
  list.push('link');
  if (o.stage === 'done') list.push('thanks');
  list.push('free');
  return list;
}

export interface Sender {
  staffName: string;
  companyName: string;
  companyPhone: string;
  reviewUrl: string;
  depositWord: string;
}

/** The text of a customer message for an order, in the client's language. */
export function orderMessage(
  type: MessageKind,
  o: MsgOrder,
  lang: Lang,
  trackingLink: string,
  s: Sender,
  today: string,
  overrides?: Partial<Record<Lang, Partial<Record<string, string>>>> | null,
): string {
  const t = orderTotals(o);
  const n = installedQty(o);
  const product = lang === 'sq' ? o.productType.toLowerCase() : o.productType;
  const what = isProject(o)
    ? { sq: `për ${n} ${o.unit} të montuara deri tani`, en: `for the ${n} ${unitIn(o.unit ?? '', 'en')} installed so far`, de: `für die bisher montierten ${n} ${unitIn(o.unit ?? '', 'de')}` }[lang]
    : { sq: `për porosinë ${o.number}`, en: `for order ${o.number}`, de: `für den Auftrag ${o.number}` }[lang];
  const v = nextVisit(o.visits, today);
  const firstPay = o.payments.filter(p => !p.deletedAt).sort((a, b) => a.date.localeCompare(b.date))[0];
  const tplType: TemplateType = type === 'reminder' && lastReminder(o.messages) ? 'reminderAgain' : type;
  return fill(templateOf(overrides, lang, tplType), {
    customerName: greetName(o.client.name),
    orderNumber: o.number,
    product,
    date: v ? onDay(v.date, today, lang) : '',
    time: v ? timeWords(v.time, lang) : '',
    visitType: v ? VISIT_WORDS[lang][v.type] : '',
    balance: eur(t.owed),
    what,
    amount: firstPay ? eur(firstPay.amount) : '',
    depositWord: s.depositWord.toLowerCase(),
    trackingLink,
    reviewLink: s.reviewUrl,
    companyName: s.companyName,
    companyPhone: fmtPhone(s.companyPhone),
    staffName: s.staffName,
  });
}

/** The text for an opening balance ("Borxh i bartur"): only a reminder or a free message. */
export function openingMessage(
  type: 'reminder' | 'free',
  ob: { name: string; forWhat: string; messages: MessageLite[] },
  owed: number,
  lang: Lang,
  s: Sender,
  overrides?: Partial<Record<Lang, Partial<Record<string, string>>>> | null,
): string {
  const what = ob.forWhat ? { sq: `për ${ob.forWhat}`, en: `for ${ob.forWhat}`, de: `für ${ob.forWhat}` }[lang] : '';
  const tplType: TemplateType = type === 'reminder' && lastReminder(ob.messages) ? 'reminderAgain' : type;
  return fill(templateOf(overrides, lang, tplType), {
    customerName: greetName(ob.name),
    orderNumber: '',
    product: ob.forWhat,
    date: '',
    time: '',
    visitType: '',
    amount: '',
    trackingLink: '',
    balance: eur(owed),
    what,
    depositWord: s.depositWord.toLowerCase(),
    companyName: s.companyName,
    companyPhone: fmtPhone(s.companyPhone),
    staffName: s.staffName,
    reviewLink: s.reviewUrl,
  });
}

/* ───────── installer messages (Albanian only) ───────── */

export interface JobOrder extends VisitOrder {
  productType: string;
  description: string;
  directions: string;
  client: { name: string; phone: string };
}

const timeSq = (t: string | null) => timeWords(t, 'sq');
const VISIT_SQ: Record<VisitLite['type'], string> = { measure: 'Matje', install: 'Montim', delivery: 'Dërgesë', repair: 'Riparim' };

function jobLines(o: JobOrder, v: VisitLite, collect: boolean) {
  const tl = timeSq(v.time);
  const lines = [`${VISIT_SQ[v.type]}${tl ? ` · ${tl}` : ''}`, `${o.client.name} · ${fmtPhone(o.client.phone)}`, o.city];
  if (o.directions) lines.push(o.directions);
  lines.push(o.description || o.productType);
  if (v.note) lines.push(`Shënim: ${v.note}`);
  const amount = collect && collectsCash(v) ? toCollect(o) : 0;
  if (amount > 0) lines.push(`Mblidh: ${eur(amount)}`);
  lines.push(`Porosia ${o.number}`);
  return lines.filter(Boolean);
}

/** One visit: "Montim · E enjte 23.10 · paradite", client and phone, place, directions, product, "Mblidh €800". */
export function installerJobText(o: JobOrder, v: VisitLite, collect: boolean): string {
  const lines = jobLines(o, v, collect);
  const tl = timeSq(v.time);
  lines[0] = `${VISIT_SQ[v.type]} · ${WEEKDAYS[dow(v.date)]} ${fmtDate(v.date).slice(0, 5)}${tl ? ` · ${tl}` : ''}`;
  return lines.join('\n');
}

/** One installer's whole day, numbered in time order (what owners send the evening before). */
export function installerDayText(jobs: { o: JobOrder; v: VisitLite }[], date: string, today: string, collect: boolean): string {
  const diff = diffDays(date, today);
  const when = diff === 1 ? 'nesër' : diff === 0 ? 'sot' : WEEKDAYS_ON[dow(date)];
  const sorted = [...jobs].sort((a, b) => visitSort(a.v, b.v));
  const head = `Punët për ${when}, ${WEEKDAYS[dow(date)]} ${fmtDate(date).slice(0, 5)} · ${sorted.length} punë`;
  return [head, ...sorted.map(({ o, v }, i) => {
    const l = jobLines(o, v, collect);
    l[0] = `${i + 1}) ${l[0]}`;
    return l.join('\n');
  })].join('\n\n');
}

/* ───────── sending by hand (ClickToSendProvider) ───────── */

export type Channel = 'whatsapp' | 'viber' | 'sms';

/**
 * Where "Dërgo" goes. WhatsApp and SMS can carry the text; Viber can't prefill a chat with
 * a number, so the text is copied and the chat opened. A real API provider can implement
 * the same shape later (spec §7, `MessageProvider`).
 */
export function sendHref(channel: Channel, phone: string, text: string): string {
  const n = phone.replace(/[^\d]/g, '');
  if (channel === 'viber') return `viber://chat?number=%2B${n}`;
  if (channel === 'sms') return `sms:+${n}?body=${encodeURIComponent(text)}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
