/**
 * The customer tracking page (spec §6): three steps by stage key, one warm headline,
 * the next planned visit and project progress. No prices, no balance, no photos.
 * Texts are in the client's language (sq/en/de), independent of the staff UI.
 */
import { diffDays } from '@/lib/dates';
import type { Lang } from './messages';
import type { VisitLite } from './visits';

export const TRACK_STAGES = ['new', 'active', 'done'] as const;
export type TrackStage = (typeof TRACK_STAGES)[number];
export type StepState = 'done' | 'current' | 'future';

/** "Porosia u pranua" is a fact, not a step in progress; the last step stays open while work remains. */
export function trackingSteps(stage: TrackStage, remainingWork: boolean): { key: TrackStage; state: StepState }[] {
  const cur = TRACK_STAGES.indexOf(stage);
  return TRACK_STAGES.map((key, i) => {
    let state: StepState = i < cur ? 'done' : i === cur ? 'current' : 'future';
    if (key === 'done' && stage === 'done') state = remainingWork ? 'current' : 'done';
    if (key === 'new' && stage === 'new') state = 'done';
    return { key, state };
  });
}

export type HeadlineKey = 'doneRemaining' | 'done' | 'activeProject' | 'active' | 'new';
export const headlineKey = (stage: TrackStage, remainingWork: boolean, project: boolean): HeadlineKey =>
  stage === 'done' ? (remainingWork ? 'doneRemaining' : 'done') : stage === 'active' ? (project ? 'activeProject' : 'active') : 'new';

type Dict = {
  steps: Record<TrackStage, string>;
  headline: Record<HeadlineKey, string>;
  reassure: Record<HeadlineKey | 'newProject', string>;
  hello: (name: string) => string;
  now: string;
  finishing: string;
  visitLabel: Record<VisitLite['type'], string>;
  today: string;
  tomorrow: string;
  weekdays: string[];
  months: string[];
  morning: string;
  afternoon: string;
  at: (t: string) => string;
  progressTitle: string;
  progress: (n: number, total: number, unit: string) => string;
  stepsTitle: string;
  ref: (number: string, product: string) => string;
  helpTitle: string;
  helpText: string;
  whatsapp: string;
  call: string;
  viber: string;
  directions: (address: string) => string;
  onlyYou: string;
  inactive: string;
  contactUs: string;
  units: Record<string, string>;
};

export const TRACKING_TEXT: Record<Lang, Dict> = {
  sq: {
    steps: { new: 'Porosia u pranua', active: 'Në punë', done: 'E kryer' },
    headline: { new: 'Porosia juaj u pranua', active: 'Porosia juaj është në punë', activeProject: 'Montimi është në vazhdim', done: 'Puna përfundoi. Faleminderit!', doneRemaining: 'Po përfundojmë detajet e fundit' },
    reassure: {
      new: 'Faleminderit për besimin! Do t’ju njoftojmë kur të fillojmë.',
      newProject: 'Faleminderit për besimin! Do t’ju njoftojmë kur të fillojmë.',
      active: 'Po e përgatisim porosinë tuaj me kujdes.',
      activeProject: 'Po montojmë hap pas hapi. Këtu e shihni ecurinë.',
      done: 'Shpresojmë që t’ju pëlqejë dhe t’ju shërbejë për shumë vite.',
      doneRemaining: 'Po kujdesemi për detajet e fundit. Do t’ju njoftojmë sapo të jetë gati.',
    },
    hello: n => `Përshëndetje, ${n}!`,
    now: 'Tani',
    finishing: 'Po përfundojmë detajet e fundit',
    visitLabel: { measure: 'Matja', install: 'Montimi', delivery: 'Dërgesa', repair: 'Vizita jonë' },
    today: 'Sot',
    tomorrow: 'Nesër',
    weekdays: ['E diel', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë'],
    months: ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'],
    morning: 'paradite',
    afternoon: 'pasdite',
    at: t => `ora ${t}`,
    progressTitle: 'Ecuria e montimit',
    progress: (n, total, unit) => `${n} nga ${total} ${unit} të montuara`,
    stepsTitle: 'Ecuria e porosisë',
    ref: (num, p) => `Porosia ${num} · ${p}`,
    helpTitle: 'Keni pyetje?',
    helpText: 'Na shkruani ose na telefononi. Ju përgjigjemi me kënaqësi.',
    whatsapp: 'Na shkruani në WhatsApp',
    call: 'Thirrni',
    viber: 'Viber',
    directions: a => `Si të vini në sallon · ${a}`,
    onlyYou: 'Kjo faqe është vetëm për ju.',
    inactive: 'Ky link nuk është më aktiv.',
    contactUs: 'Na kontaktoni.',
    units: {},
  },
  en: {
    steps: { new: 'Order received', active: 'In progress', done: 'Completed' },
    headline: { new: 'Your order has been received', active: 'Your order is in progress', activeProject: 'Installation is under way', done: 'All done. Thank you!', doneRemaining: 'We are finishing the last details' },
    reassure: {
      new: 'Thank you for your trust! We will let you know when we start.',
      newProject: 'Thank you for your trust! We will let you know when we start.',
      active: 'We are preparing your order with care.',
      activeProject: 'We are installing step by step. You can follow the progress here.',
      done: 'We hope you enjoy it for many years.',
      doneRemaining: 'We are taking care of the last details and will let you know as soon as everything is ready.',
    },
    hello: n => `Hello, ${n}!`,
    now: 'Now',
    finishing: 'Finishing the last details',
    visitLabel: { measure: 'Measurement', install: 'Installation', delivery: 'Delivery', repair: 'Our visit' },
    today: 'Today',
    tomorrow: 'Tomorrow',
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    morning: 'in the morning',
    afternoon: 'in the afternoon',
    at: t => `at ${t}`,
    progressTitle: 'Installation progress',
    progress: (n, total, unit) => `${n} of ${total} ${unit} installed`,
    stepsTitle: 'Order progress',
    ref: (num, p) => `Order ${num} · ${p}`,
    helpTitle: 'Any questions?',
    helpText: 'Write to us or give us a call. We are happy to help.',
    whatsapp: 'Write to us on WhatsApp',
    call: 'Call',
    viber: 'Viber',
    directions: a => `Directions to the showroom · ${a}`,
    onlyYou: 'This page is just for you.',
    inactive: 'This link is no longer active.',
    contactUs: 'Please contact us.',
    units: { copë: 'pieces', banesa: 'apartments' },
  },
  de: {
    steps: { new: 'Auftrag erhalten', active: 'In Arbeit', done: 'Fertig' },
    headline: { new: 'Ihr Auftrag ist bei uns eingegangen', active: 'Ihr Auftrag ist in Arbeit', activeProject: 'Die Montage läuft', done: 'Alles fertig. Vielen Dank!', doneRemaining: 'Wir erledigen die letzten Details' },
    reassure: {
      new: 'Vielen Dank für Ihr Vertrauen! Wir melden uns, sobald wir beginnen.',
      newProject: 'Vielen Dank für Ihr Vertrauen! Wir melden uns, sobald wir beginnen.',
      active: 'Wir bereiten Ihren Auftrag mit Sorgfalt vor.',
      activeProject: 'Wir montieren Schritt für Schritt. Hier sehen Sie den Fortschritt.',
      done: 'Wir wünschen Ihnen viele Jahre Freude daran.',
      doneRemaining: 'Wir kümmern uns um die letzten Details und melden uns, sobald alles fertig ist.',
    },
    hello: n => `Guten Tag, ${n}!`,
    now: 'Jetzt',
    finishing: 'Die letzten Details werden erledigt',
    visitLabel: { measure: 'Aufmaß', install: 'Montage', delivery: 'Lieferung', repair: 'Unser Besuch' },
    today: 'Heute',
    tomorrow: 'Morgen',
    weekdays: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    morning: 'vormittags',
    afternoon: 'nachmittags',
    at: t => `um ${t} Uhr`,
    progressTitle: 'Fortschritt der Montage',
    progress: (n, total, unit) => `${n} von ${total} ${unit} montiert`,
    stepsTitle: 'Stand des Auftrags',
    ref: (num, p) => `Auftrag ${num} · ${p}`,
    helpTitle: 'Haben Sie Fragen?',
    helpText: 'Schreiben Sie uns oder rufen Sie an. Wir helfen gerne.',
    whatsapp: 'Auf WhatsApp schreiben',
    call: 'Anrufen',
    viber: 'Viber',
    directions: a => `Weg zum Ausstellungsraum · ${a}`,
    onlyYou: 'Diese Seite ist nur für Sie.',
    inactive: 'Dieser Link ist nicht mehr aktiv.',
    contactUs: 'Bitte kontaktieren Sie uns.',
    units: { copë: 'Stück', banesa: 'Wohnungen' },
  },
};

/** "Nesër · e enjte, 23 tetor" / "Tomorrow · Thursday, 23 October" / "Morgen · Donnerstag, 23. Oktober". */
export function warmDate(iso: string, today: string, lang: Lang): string {
  const d = TRACKING_TEXT[lang];
  const [y, m, day] = iso.split('-').map(Number);
  const wd = d.weekdays[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  const base = lang === 'de' ? `${wd}, ${day}. ${d.months[m - 1]}` : `${wd}, ${day} ${d.months[m - 1]}`;
  const diff = diffDays(iso, today);
  const low = lang === 'sq' ? base.toLowerCase() : base;
  return diff === 0 ? `${d.today} · ${low}` : diff === 1 ? `${d.tomorrow} · ${low}` : base;
}

export const trackTime = (t: string | null, lang: Lang) => {
  const d = TRACKING_TEXT[lang];
  return !t ? '' : t === 'morning' ? d.morning : t === 'afternoon' ? d.afternoon : d.at(t);
};
