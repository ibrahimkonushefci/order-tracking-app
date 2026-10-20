/**
 * What a demo company sells, per brand.json `businessType` (spec "Seed data adapts to
 * businessType"). Prices are realistic Kosovo prices in euros (2026), installation included.
 * Every role keeps the same story in every business type; only the wording and amounts change.
 */
import type { Brand } from '../../brand/schema';

export interface Role {
  /** The product chip ("Produkti"), one of the catalog's PRODUCTS where possible. */
  type: string;
  descs: string[];
  /** Price range in euros; the seed rounds to €50. */
  min: number;
  max: number;
}

export interface Project {
  client: string;
  clientPhone: string;
  clientNote: string;
  type: string;
  /** "What · Where": the part after " · " is the site, used in the directions. */
  desc: string;
  qty: number;
  unit: 'copë' | 'm²' | 'banesa';
  unitPrice: number;
  city: string;
  site: string;
  /** [quantity, days from today] for each installed part. */
  parts: [number, number][];
  /** [euros, days from today] bank payments. */
  paid: [number, number][];
  /** The note of the next planned part, e.g. "Lamela B, kati 3: 4 kuzhina". */
  next: string;
  nextQty: number;
  created: number;
  /** Short name for the demo panel: "24 kuzhina". */
  short: string;
}

export interface Catalog {
  /** The big product (kitchen, doors for a house, PVC windows for a house). */
  main: Role;
  second: Role;
  small: Role;
  /** Delivered or picked up, without installation. */
  delivery: Role;
  /** 0: owes money and is late · 1: paid ahead · 2: just signed, deposit only. */
  projects: [Project, Project, Project];
  /** Word for the order list in the pitch kit ("kuzhina", "dyer"). */
  noun: string;
}

const kitchens: Catalog = {
  noun: 'kuzhina',
  main: {
    type: 'Kuzhinë',
    descs: [
      'Kuzhinë në formë L, MDF mat, sipërfaqe pune kuarc',
      'Kuzhinë me ishull, fronte arre',
      'Kuzhinë e drejtë 3,6 m, fronte të bardha me shkëlqim',
      'Kuzhinë në formë U, antracit mat',
      'Kuzhinë në kënd, fronte gri, doreza të zeza',
      'Kuzhinë klasike, fronte druri me profil',
    ],
    min: 3200,
    max: 7800,
  },
  second: {
    type: 'Garderobë',
    descs: [
      'Garderobë me dyer rrëshqitëse, 2,4 m',
      'Garderobë në kënd me pasqyrë',
      'Garderobë deri në tavan, 3 m',
      'Garderobë me dyer të bardha mat, 2 m',
    ],
    min: 900,
    max: 2400,
  },
  small: {
    type: 'Dollap banjoje',
    descs: [
      'Dollap banjoje i varur me lavaman',
      'Dollap banjoje me pasqyrë dhe ndriçim',
      'Dollap banjoje 80 cm, i bardhë',
    ],
    min: 450,
    max: 900,
  },
  delivery: {
    type: 'Mobilje dhome ditore',
    descs: ['Njësi TV + raft muri, e montuar në punëtori', 'Komodë dhe raft librash, ngjyrë lisi'],
    min: 650,
    max: 1200,
  },
  projects: [
    {
      client: 'Arbëria Invest sh.p.k.',
      clientPhone: '+38338224500',
      clientNote: 'Z. Agron, menaxheri i projektit · paguan me bankë',
      type: 'Kuzhinë',
      desc: 'Kuzhina për 24 banesa · Kompleksi Arbëria, Lamela B',
      qty: 24,
      unit: 'banesa',
      unitPrice: 2800,
      city: 'Prishtinë',
      site: 'Kompleksi Arbëria, Lamela B. Hyrja nga rruga e kantierit; çelësat te roja',
      parts: [
        [4, -80],
        [6, -60],
        [3, -41],
        [2, -15],
      ],
      paid: [
        [20000, -120],
        [16000, -30],
      ],
      next: 'Lamela B, kati 5: 2 kuzhina',
      nextQty: 2,
      created: -130,
      short: '24 kuzhina',
    },
    {
      client: 'Ndërtimi Rugova sh.p.k.',
      clientPhone: '+38339431200',
      clientNote: 'Kryepunëtori Bekim',
      type: 'Garderobë',
      desc: 'Garderoba për 12 banesa · Rezidenca Rugova, Pejë',
      qty: 12,
      unit: 'copë',
      unitPrice: 1200,
      city: 'Pejë',
      site: 'Rezidenca Rugova, pas stacionit të autobusëve. Kryepunëtori Bekim: 049 611 402',
      parts: [[3, -8]],
      paid: [[5000, -35]],
      next: 'Kati 2: 3 garderoba',
      nextQty: 3,
      created: -35,
      short: '12 garderoba',
    },
    {
      client: 'Hotel Dukagjini sh.p.k.',
      clientPhone: '+38339200310',
      clientNote: 'Zj. Arta, recepsioni',
      type: 'Mobilje dhome ditore',
      desc: 'Mobilje për 16 dhoma hoteli · Hotel Dukagjini, Pejë',
      qty: 16,
      unit: 'copë',
      unitPrice: 1450,
      city: 'Pejë',
      site: 'Hotel Dukagjini, hyrja e furnizimit nga rruga e pasme',
      parts: [],
      paid: [[7000, -6]],
      next: 'Kati 1: 4 dhoma',
      nextQty: 4,
      created: -9,
      short: '16 dhoma hoteli',
    },
  ],
};

const furniture: Catalog = {
  noun: 'mobilje',
  main: {
    type: 'Dhomë gjumi',
    descs: [
      'Dhomë gjumi: shtrat 160, dy komodina, garderobë 2,4 m',
      'Dhomë gjumi e bardhë mat me garderobë rrëshqitëse',
      'Dhomë gjumi lisi, shtrat me sirtarë',
      'Dhomë gjumi për fëmijë me tavolinë studimi',
    ],
    min: 1900,
    max: 4200,
  },
  second: {
    type: 'Garderobë',
    descs: [
      'Garderobë me dyer rrëshqitëse, 2,4 m',
      'Garderobë në kënd me pasqyrë',
      'Garderobë deri në tavan, 3 m',
    ],
    min: 900,
    max: 2200,
  },
  small: {
    type: 'Tavolinë ngrënieje',
    descs: ['Tavolinë lisi 180 cm + 6 karrige', 'Tavolinë e zgjatshme 160–220 cm'],
    min: 600,
    max: 1300,
  },
  delivery: {
    type: 'Mobilje dhome ditore',
    descs: ['Njësi TV + raft muri, e montuar në punëtori', 'Vitrinë dhe komodë, ngjyrë arre'],
    min: 700,
    max: 1400,
  },
  projects: [
    {
      client: 'Arbëria Invest sh.p.k.',
      clientPhone: '+38338224500',
      clientNote: 'Z. Agron, menaxheri i projektit · paguan me bankë',
      type: 'Garderobë',
      desc: 'Garderoba për 30 banesa · Kompleksi Arbëria, Lamela B',
      qty: 30,
      unit: 'banesa',
      unitPrice: 1500,
      city: 'Prishtinë',
      site: 'Kompleksi Arbëria, Lamela B. Hyrja nga rruga e kantierit; çelësat te roja',
      parts: [
        [5, -82],
        [6, -61],
        [6, -40],
        [4, -16],
      ],
      paid: [
        [12000, -120],
        [10500, -30],
      ],
      next: 'Lamela B, kati 5: 3 banesa',
      nextQty: 3,
      created: -130,
      short: '30 banesa',
    },
    {
      client: 'Hotel Dukagjini sh.p.k.',
      clientPhone: '+38339200310',
      clientNote: 'Zj. Arta, recepsioni',
      type: 'Dhomë gjumi',
      desc: 'Mobilje për 20 dhoma hoteli · Hotel Dukagjini, Pejë',
      qty: 20,
      unit: 'copë',
      unitPrice: 1100,
      city: 'Pejë',
      site: 'Hotel Dukagjini, hyrja e furnizimit nga rruga e pasme',
      parts: [[4, -8]],
      paid: [[6000, -35]],
      next: 'Kati 2: 4 dhoma',
      nextQty: 4,
      created: -35,
      short: '20 dhoma hoteli',
    },
    {
      client: 'Shkolla “Ardhmëria”',
      clientPhone: '+38338541120',
      clientNote: 'Drejtori Fehmi',
      type: 'Mobilje dhome ditore',
      desc: 'Rafte dhe tavolina për 10 klasa · Shkolla “Ardhmëria”, Ferizaj',
      qty: 10,
      unit: 'copë',
      unitPrice: 1650,
      city: 'Ferizaj',
      site: 'Shkolla “Ardhmëria”, hyrja anësore te palestra',
      parts: [],
      paid: [[5000, -6]],
      next: 'Kati përdhes: 3 klasa',
      nextQty: 3,
      created: -9,
      short: '10 klasa',
    },
  ],
};

const doorsFloors: Catalog = {
  noun: 'dyer',
  main: {
    type: 'Dyer të brendshme',
    descs: [
      '6 dyer të brendshme, laminat i bardhë, me pragje',
      '5 dyer të brendshme, ngjyrë lisi',
      '7 dyer me xham satinato',
      '8 dyer të brendshme, gri, doreza inoks',
    ],
    min: 1300,
    max: 2600,
  },
  second: {
    type: 'Parket laminat',
    descs: [
      'Parket laminat 8 mm, 85 m², me shtrim',
      'Parket laminat AC5, 120 m², me shtrim',
      'Parket laminat 10 mm, 64 m², me shtrim',
    ],
    min: 1100,
    max: 2400,
  },
  small: {
    type: 'Derë hyrëse',
    descs: ['Derë hyrëse e blinduar, antracit', 'Derë hyrëse me xham anësor'],
    min: 650,
    max: 1200,
  },
  delivery: {
    type: 'Dysheme',
    descs: ['Parket laminat 60 m², vetëm dërgesë', 'Pllaka vinili 40 m², vetëm dërgesë'],
    min: 600,
    max: 1000,
  },
  projects: [
    {
      client: 'Kodra Ndërtim sh.p.k.',
      clientPhone: '+38338601744',
      clientNote: 'Z. Ilir, kryepunëtori · paguan me bankë',
      type: 'Dyer të brendshme',
      desc: '100 dyer të brendshme · Banesat Kodra e Diellit, hyrja 2',
      qty: 100,
      unit: 'copë',
      unitPrice: 250,
      city: 'Prishtinë',
      site: 'Banesat Kodra e Diellit, hyrja 2. Hyrja nga rruga e kantierit; kryepunëtori Ilir: 044 610 228',
      parts: [
        [5, -75],
        [10, -62],
        [8, -50],
        [9, -38],
        [8, -20],
      ],
      paid: [
        [5000, -90],
        [2500, -30],
      ],
      next: 'Kati 4: 10 dyer',
      nextQty: 10,
      created: -100,
      short: '100 dyer',
    },
    {
      client: 'Qendra Albi sh.p.k.',
      clientPhone: '+38338775210',
      clientNote: 'Zj. Mirlinda, administrata',
      type: 'Parket laminat',
      desc: 'Parket laminat 900 m² · Qendra Albi, zyrat kati 3',
      qty: 900,
      unit: 'm²',
      unitPrice: 18,
      city: 'Prishtinë',
      site: 'Qendra Albi, hyrja e furnizimit te parkingu nëntokësor, kati 3',
      parts: [[300, -8]],
      paid: [[7000, -35]],
      next: 'Kati 3, krahu lindor: 250 m²',
      nextQty: 250,
      created: -35,
      short: '900 m² parket',
    },
    {
      client: 'Rezidenca Dardania sh.p.k.',
      clientPhone: '+38338410922',
      clientNote: 'Z. Besnik, investitori',
      type: 'Derë hyrëse',
      desc: '36 dyer hyrëse për banesa · Rezidenca Dardania, Lamela C',
      qty: 36,
      unit: 'copë',
      unitPrice: 420,
      city: 'Ferizaj',
      site: 'Rezidenca Dardania, Lamela C. Roja e kantierit: 049 330 118',
      parts: [],
      paid: [[4000, -6]],
      next: 'Kati 1–2: 8 dyer',
      nextQty: 8,
      created: -9,
      short: '36 dyer hyrëse',
    },
  ],
};

const doorsWindows: Catalog = {
  noun: 'dritare',
  main: {
    type: 'Dritare PVC',
    descs: [
      '10 dritare PVC me xham të trefishtë, ngjyrë antracit',
      '8 dritare PVC të bardha + derë ballkoni',
      '12 dritare PVC, profil 7 dhoma, roleta',
      '6 dritare PVC me imitim druri',
    ],
    min: 2200,
    max: 4800,
  },
  second: {
    type: 'Dritare alumini',
    descs: [
      'Fasadë alumini për dyqan, 4 m',
      'Derë rrëshqitëse alumini për ballkon, 3 m',
      '5 dritare alumini me ndërprerje termike',
    ],
    min: 1400,
    max: 3200,
  },
  small: {
    type: 'Derë hyrëse',
    descs: ['Derë hyrëse PVC me xham anësor', 'Derë hyrëse alumini, antracit'],
    min: 750,
    max: 1400,
  },
  delivery: {
    type: 'Grilla',
    descs: ['Grilla alumini për 6 dritare, vetëm dërgesë', 'Rrjeta kundër insekteve për 8 dritare'],
    min: 400,
    max: 900,
  },
  projects: [
    {
      client: 'Kompleksi Dardania sh.p.k.',
      clientPhone: '+38338410922',
      clientNote: 'Z. Besnik, investitori · paguan me bankë',
      type: 'Dritare PVC',
      desc: '180 dritare PVC · Kompleksi Dardania, Lamela A',
      qty: 180,
      unit: 'copë',
      unitPrice: 220,
      city: 'Prishtinë',
      site: 'Kompleksi Dardania, Lamela A. Hyrja nga rruga e kantierit; kryepunëtori Ilir: 044 610 228',
      parts: [
        [30, -78],
        [35, -60],
        [30, -42],
        [25, -18],
      ],
      paid: [
        [12000, -100],
        [7000, -30],
      ],
      next: 'Kati 6: 20 dritare',
      nextQty: 20,
      created: -110,
      short: '180 dritare',
    },
    {
      client: 'Shkolla “Ardhmëria”',
      clientPhone: '+38338541120',
      clientNote: 'Drejtori Fehmi',
      type: 'Dritare alumini',
      desc: '48 dritare alumini · Shkolla “Ardhmëria”, Ferizaj',
      qty: 48,
      unit: 'copë',
      unitPrice: 300,
      city: 'Ferizaj',
      site: 'Shkolla “Ardhmëria”, hyrja anësore te palestra',
      parts: [[12, -8]],
      paid: [[5000, -35]],
      next: 'Kati 1: 12 dritare',
      nextQty: 12,
      created: -35,
      short: '48 dritare alumini',
    },
    {
      client: 'Rezidenca Rugova sh.p.k.',
      clientPhone: '+38339431200',
      clientNote: 'Kryepunëtori Bekim',
      type: 'Derë hyrëse',
      desc: '24 dyer hyrëse · Rezidenca Rugova, Pejë',
      qty: 24,
      unit: 'banesa',
      unitPrice: 900,
      city: 'Pejë',
      site: 'Rezidenca Rugova, pas stacionit të autobusëve. Kryepunëtori Bekim: 049 611 402',
      parts: [],
      paid: [[6000, -6]],
      next: 'Hyrja 1: 6 dyer',
      nextQty: 6,
      created: -9,
      short: '24 dyer hyrëse',
    },
  ],
};

export const CATALOGS: Record<Brand['businessType'], Catalog> = {
  kitchens,
  furniture,
  doors_floors: doorsFloors,
  doors_windows: doorsWindows,
};
