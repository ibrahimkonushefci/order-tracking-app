/* Fake, fictional demo data. Dates are relative to today, so the prototype
 * always looks current. Every key case from PHASES.md Phase 1 is hand-written;
 * the rest is deterministic filler, loaded only in the larger test set. */
(function () {
  const OT = window.OT;

  function rng(seed) { // mulberry32
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  /** opts.full: adds ~14 filler orders and more notebook debts; default is the curated story set. */
  OT.buildSeed = function (brand, opts = {}) {
    const today = OT.realToday();
    const d = n => OT.addDays(today, n);
    const r = rng(brand.slug.length * 7919 + 17);
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const hex = () => Array.from({ length: 32 }, () => Math.floor(r() * 16).toString(16)).join('');
    const tm = () => `${9 + Math.floor(r() * 8)}:${pick(['05', '20', '35', '50'])}`;
    const cat = brand.catalog;
    const eur = e => Math.round(e * cat.scale / 50) * 50 * 100; // scaled per business type, rounded to €50, in cents
    const P = brand.people;

    // A realistic week for "Punët e montuesve": on the coming Friday installer 1 has two jobs
    // and installer 2 is free. (On a Thursday or Friday the busy day falls 4 days ahead instead.)
    const fri = (5 - OT.parse(today).getDay() + 7) % 7;
    const busy = fri >= 2 ? fri : 4;
    const [fA, fB] = [2, 3, 5, 6, 1].filter(x => x !== busy);       // installer 2's two days
    const bDay = [5, 6, 3, 2].find(x => x !== busy);                 // installer 3's extra delivery

    const OWNER = 'u-owner', OFFICE = 'u-office';
    const users = [{ id: OWNER, name: P.owner, role: 'owner' }, { id: OFFICE, name: P.office, role: 'office' }];
    const installers = P.installers.map(([name, phone], i) => ({ id: `i${i + 1}`, name, phone, channel: 'whatsapp' }));
    const [I1, I2, I3] = installers.map(i => i.id);

    /* Clients */
    let cid = 0;
    const phone = (cc = '383') => {
      if (cc === '383') return `+383${pick(['44', '45', '49'])}${String(100000 + Math.floor(r() * 899999))}`;
      if (cc === '49') return `+49151${String(10000000 + Math.floor(r() * 89999999))}`;
      if (cc === '41') return `+4179${String(1000000 + Math.floor(r() * 8999999))}`;
      return `+43664${String(1000000 + Math.floor(r() * 8999999))}`;
    };
    const customers = [];
    const cust = (name, o = {}) => {
      const c = { id: `c${++cid}`, name, phone: o.phone || phone(o.cc), channel: o.channel || 'whatsapp', lang: 'sq', noReminders: !!o.noReminders, note: o.note || '', country: o.country || null };
      customers.push(c);
      return c;
    };

    /* Orders, visits, payments */
    const orders = [];
    let oid = 0, pid = 0, vid = 0;
    const pay = (amount, date, method, by, extra = {}) =>
      ({ id: `p${++pid}`, amount, date, time: tm(), method, heldBy: null, handedAt: null, handedBy: null, by, note: '', ...extra });
    const visit = (type, date, installerId, extra = {}) =>
      ({ id: `v${++vid}`, type, date, time: null, installerId, note: '', doneAt: null, qty: null, value: null, sentAt: null, ...extra });
    const msg = (date, type, by, channel = 'whatsapp') => ({ date, time: tm(), type, channel, by });
    const order = (c, o) => {
      const role = cat[o.role || 'main'];
      const x = Object.assign({
        id: `o${++oid}`, customerId: c.id, productType: role.type, description: o.desc || pick(role.descs),
        price: eur(role.min + r() * (role.max - role.min)), stage: 'new', createdAt: d(-10), doneAt: null,
        city: 'Prishtinë', directions: '', notes: '', payTerm: null, dueDate: null, qty: null, unit: null,
        remainingWork: null, pause: null, token: hex(), visits: [], payments: [], photos: [], events: [], messages: []
      }, o);
      delete x.role; delete x.desc;
      orders.push(x);
      return x;
    };
    const ev = (rec, date, text, kind, by, time) => rec.events.push({ date, time: time || tm(), by, text, kind });
    const photoKind = cat.photo;

    /* ── Key cases ─────────────────────────────────────────────── */

    // 1. The €800 case (live): installation today with installer 1, who collects the last €800.
    const k800 = order(cust('Fatmir Krasniqi', { phone: '+38344512330' }), {
      role: 'main', price: eur(5000), createdAt: d(-52), stage: 'active', city: 'Podujevë',
      directions: 'Fshati Orllan: te xhamia e vjetër, kthesa e dytë djathtas, shtëpia me fasadë të bardhë. Babai është në shtëpi gjithë ditën.',
      notes: 'Zbritje €200 sepse e rekomandoi Shpendi.'
    });
    { const t = k800.price, dep = Math.round(t / 2 / 10000) * 10000; k800.payments = [pay(dep, d(-52), 'cash', OWNER), pay(t - dep - 80000, d(-6), 'bank', OFFICE)]; }
    const k800Install = visit('install', d(0), I1, { time: 'morning' });
    k800.visits = [visit('measure', d(-45), I1, { time: 'morning', doneAt: d(-45) }), k800Install];
    k800.photos = [{ id: 'ph1', src: OT.photo('notebook', 1), label: 'Foto e fletores', kind: 'notebook' }];
    k800.messages = [msg(d(-52), 'deposit', OWNER)];

    // 2. Large overdue; last reminder 20 days ago → green "Kujtesë" (the gentler second text)
    const k2 = order(cust('Shpend Berisha'), {
      role: 'main', price: eur(7200), createdAt: d(-95), stage: 'done', doneAt: d(-40), payTerm: 'week', city: 'Ferizaj',
      directions: 'Lagjja Dardania, rruga pas shkollës fillore, shtëpia e tretë majtas, porta e zezë.'
    });
    k2.payments = [pay(eur(3000), d(-95), 'cash', OWNER), pay(eur(2000), d(-40), 'cash', OFFICE, { heldBy: I3, handedAt: d(-39), handedBy: OFFICE })];
    k2.visits = [visit('measure', d(-90), I3, { time: 'afternoon', doneAt: d(-90) }), visit('install', d(-40), I3, { time: 'morning', doneAt: d(-40) })];
    k2.messages = [msg(d(-20), 'reminder', OFFICE)];
    k2.photos = [
      { id: 'ph2', src: OT.photo('notebook', 0), label: 'Foto e fletores', kind: 'notebook' },
      { id: 'ph3', src: OT.photo(photoKind, 0), label: 'Pas montimit', kind: 'after' }
    ];

    // 3. Overdue, but reminded 3 days ago → quiet button, "Kujtesa e fundit: 3 ditë më parë"
    const k3 = order(cust('Valbona Gashi'), {
      role: 'second', price: eur(1850), createdAt: d(-70), stage: 'done', doneAt: d(-24), payTerm: 'date', dueDate: d(-21), city: 'Prishtinë',
      directions: 'Bregu i Diellit, hyrja B, kati 4, banesa 12.'
    });
    k3.payments = [pay(eur(1200), d(-70), 'cash', OFFICE)];
    k3.visits = [visit('install', d(-24), I2, { time: 'afternoon', doneAt: d(-24) })];
    k3.messages = [msg(d(-17), 'reminder', OFFICE, 'viber'), msg(d(-3), 'reminder', OFFICE)];
    k3.photos = [{ id: 'ph4', src: OT.photo(photoKind, 2), label: 'Pas montimit', kind: 'after' }];

    // 4. Remaining work + paused reminders + a repair visit
    const k4 = order(cust('Mimoza Hoxha'), {
      role: 'main', price: eur(4300), createdAt: d(-60), stage: 'done', doneAt: d(-10), payTerm: 'week', city: 'Pejë',
      directions: 'Vitomiricë: pas urës së lumit, shtëpia e tretë djathtas me çati të kuqe.'
    });
    k4.payments = [pay(eur(2000), d(-60), 'cash', OWNER), pay(k4.price - eur(2000) - 15000, d(-10), 'cash', OWNER, { heldBy: I2, handedAt: d(-9), handedBy: OWNER })];
    k4.remainingWork = { note: 'Një derë duhet rregulluar; klienti paguan €150 e fundit pas rregullimit.', since: d(-10) };
    k4.pause = { until: d(5), reason: 'Punë të mbetura' };
    k4.visits = [visit('install', d(-10), I2, { time: 'morning', doneAt: d(-10) }), visit('repair', d(fB), I2, { time: 'afternoon', note: 'Rregullo derën e dollapit të sipërm majtas' })];

    // 5. Cash with an installer for weeks: the customer owes nothing, Besnik still has €350
    const k5 = order(cust('Lindita Bytyqi'), {
      role: 'small', price: eur(900), createdAt: d(-55), stage: 'done', doneAt: d(-23), payTerm: 'week', city: 'Prizren',
      directions: 'Landovicë: përballë pompës së benzinës, shtëpia trekatëshe me tulla të kuqe.'
    });
    k5.payments = [pay(k5.price - 35000, d(-55), 'cash', OFFICE), pay(35000, d(-23), 'cash', OFFICE, { heldBy: I3 })];
    k5.visits = [visit('install', d(-23), I3, { time: 'morning', doneAt: d(-23) })];

    // 6. "Mos sugjero kujtesa" (the owner's cousin), overdue
    const k6 = order(cust('Bekim Rexhepi', { noReminders: true, note: 'Kushëri i pronarit' }), {
      role: 'second', price: eur(1600), createdAt: d(-80), stage: 'done', doneAt: d(-34), payTerm: 'date', dueDate: d(-30), city: 'Prishtinë',
      directions: 'Lagjja Arbëria, Rr. Fehmi Agani 41, kati përdhes.'
    });
    k6.payments = [pay(eur(700), d(-80), 'cash', OWNER)];
    k6.visits = [visit('install', d(-34), I1, { time: 'afternoon', doneAt: d(-34) })];

    // 7. Tracking page story: installation tomorrow with installer 1
    const k7 = order(cust('Besa Zeka'), {
      role: 'second', price: eur(2100), createdAt: d(-35), stage: 'active', city: 'Prishtinë',
      directions: 'Kodra e Diellit, Rr. Ismail Qemali 18, hyrja nga oborri, kati 2.'
    });
    k7.payments = [pay(Math.round(k7.price * 0.5 / 10000) * 10000, d(-35), 'bank', OFFICE)];
    k7.visits = [visit('measure', d(-31), I1, { time: 'morning', doneAt: d(-31) }), visit('install', d(1), I1, { time: 'morning' })];
    k7.messages = [msg(d(-35), 'deposit', OFFICE)];

    // 8. New order, measurement tomorrow afternoon (installer 1's second job tomorrow)
    const k8 = order(cust('Rinor Avdiu'), {
      role: 'main', price: eur(6000), createdAt: d(-3), stage: 'new', city: 'Prishtinë',
      directions: 'Dardania, blloku 3, hyrja 5, kati 6. Interfoni nuk punon, thirrni kur të arrini.',
      notes: 'Çmimi paraprak, konfirmohet pas matjes.'
    });
    k8.visits = [visit('measure', d(1), I1, { time: 'afternoon' })];

    // 9. Measurement yesterday that nobody marked done → "1 punë nga dje: a u krye?"
    const k9 = order(cust('Granit Kastrati'), {
      role: 'main', createdAt: d(-6), stage: 'new', city: 'Mitrovicë',
      directions: 'Shipol: te dyqani “Market Besa”, 200 m majtas, shtëpia e re pa fasadë.'
    });
    k9.payments = [pay(Math.round(k9.price * 0.4 / 10000) * 10000, d(-6), 'cash', OWNER)];
    k9.visits = [visit('measure', d(-1), I2, { time: 'morning' })];
    k9.messages = [msg(d(-6), 'deposit', OWNER)];

    // 10. A payment entered twice and deleted, and an edited price: both visible in Historiku
    const k10 = order(cust('Naim Kelmendi'), {
      role: 'main', price: eur(5600), createdAt: d(-25), stage: 'active', city: 'Mitrovicë',
      directions: 'Lagjja e Re, Rr. Skënderbeu 7, shtëpi private, porta e gjelbër.'
    });
    k10.payments = [pay(eur(1500), d(-25), 'cash', OFFICE)];
    k10.visits = [visit('measure', d(-20), I3, { time: 'afternoon', doneAt: d(-20) }), visit('install', d(busy), I3, { time: 'morning' })];
    ev(k10, d(-25), `Pagesë ${OT.eur(eur(1500))} (kesh) · në zyrë`, 'money', OFFICE, '16:12');
    ev(k10, d(-24), `Pagesa ${OT.eur(eur(1500))} e ${OT.fmtDate(d(-25))} u fshi: u regjistrua dy herë`, 'danger', OWNER, '09:12');
    ev(k10, d(-20), `Çmimi: ${OT.eur(eur(5400))} → ${OT.eur(eur(5600))} · +1 dollap i sipërm`, 'money', OFFICE, '11:40');

    // 11. Diaspora: the son in Switzerland is the client (he pays); the parents' house is in "Si të shkoni"
    const k11 = order(cust('Flamur Ajeti', { cc: '41', country: 'Zvicër' }), {
      role: 'main', price: eur(6400), createdAt: d(-120), stage: 'done', doneAt: d(-60), payTerm: 'month', city: 'Ferizaj',
      directions: 'Shtëpia e prindërve në Nerodime e Epërme: te varrezat e fshatit, rruga e parë majtas, shtëpia e fundit. Nëna Hava është në shtëpi: 044 271 905.'
    });
    k11.payments = [pay(eur(3000), d(-120), 'bank', OFFICE), pay(eur(1800), d(-60), 'bank', OFFICE)];
    k11.pause = { until: d(9), reason: 'Premtoi të paguajë kur vjen në Kosovë' };
    k11.visits = [visit('measure', d(-115), I2, { doneAt: d(-115) }), visit('install', d(-60), I2, { time: 'morning', doneAt: d(-60) })];
    k11.messages = [msg(d(-28), 'reminder', OWNER)];

    // 12. Multi-unit project for a builder: parts installed over weeks, partial bank payments
    const pj = cat.project;
    const k12 = order(cust(pj.client, { noReminders: true, note: 'Investitor; paguan me bankë' }), {
      productType: pj.type, desc: pj.desc, price: pj.qty * pj.unitPrice * 100, qty: pj.qty, unit: pj.unit, payTerm: 'month',
      createdAt: d(-130), stage: 'active', city: 'Prishtinë',
      directions: `${pj.desc.split(' · ')[1]}. Hyrja nga rruga e kantierit; kryepunëtori Ilir: 044 610 228.`
    });
    k12.payments = pj.paid.map(([e, day]) => pay(e * 100, d(day), 'bank', OFFICE));
    k12.visits = [
      visit('measure', d(-125), I1, { doneAt: d(-125) }),
      ...pj.batches.map(([q, day], i) => visit('install', d(day), i % 2 ? I2 : I1, { time: 'morning', doneAt: d(day), qty: q })),
      visit('install', d(fA), I2, { time: 'morning', note: pj.next })
    ];

    // 13–15. The busy day: installer 1 has an installation and a measurement; installer 2 is free
    const k13 = order(cust('Arta Krasniqi'), {
      role: 'second', createdAt: d(-21), stage: 'active', city: 'Fushë Kosovë',
      directions: 'Lagjja Ajvalia, pas xhamisë së re, shtëpia e dytë majtas me portë kafe.'
    });
    k13.payments = [pay(Math.round(k13.price * 0.4 / 10000) * 10000, d(-21), 'cash', OFFICE)];
    k13.visits = [visit('measure', d(-18), I1, { time: 'morning', doneAt: d(-18) }), visit('install', d(busy), I1, { time: 'morning' })];
    const k14 = order(cust('Dardan Hyseni'), {
      role: 'main', createdAt: d(-2), stage: 'new', city: 'Prishtinë',
      directions: 'Ulpiana, Rr. Fehmi Agani 12, kati 3, banesa 9.'
    });
    k14.visits = [visit('measure', d(busy), I1, { time: 'afternoon' })];
    const k15 = order(cust('Kujtim Halili'), {
      role: 'delivery', createdAt: d(-16), stage: 'active', city: 'Gjilan',
      directions: 'Livoç i Epërm: te shkolla e fshatit, rruga e parë djathtas, shtëpia me oborr të madh.'
    });
    k15.payments = [pay(Math.round(k15.price * 0.5 / 10000) * 10000, d(-16), 'bank', OFFICE)];
    k15.visits = [visit('delivery', d(bDay), I3, { time: 'afternoon' })];

    /* ── Filler (test set only) ─────────────────────────────────── */
    const VILLAGE_DIRS = [
      'Te xhamia e vjetër, kthesa e dytë djathtas, shtëpia me fasadë të bardhë',
      'Pas shkollës fillore, rruga e asfaltuar deri në fund, porta e gjelbër',
      'Përballë pompës së benzinës, shtëpia trekatëshe me tulla të kuqe',
      'Pas urës së lumit, shtëpia e tretë djathtas me çati të kuqe'
    ];
    const CITY_DIRS = ['Hyrja nga oborri, kati i dytë', 'Pranë shkollës, hyrja B, kati 4', 'Shtëpi private, porta e zezë', 'Banesa mbi farmaci, hyrja nga pas'];
    const VILLAGE = { 'Prishtinë': 'Lagjja Arbëria', 'Podujevë': 'Orllan', 'Ferizaj': 'Nerodime e Epërme', 'Pejë': 'Vitomiricë', 'Gjakovë': 'Rogovë', 'Prizren': 'Landovicë', 'Gjilan': 'Livoç i Epërm', 'Mitrovicë': 'Shipol', 'Vushtrri': 'Pantinë', 'Suharekë': 'Mushtisht' };
    const names = ['Arbnor Hajdari', 'Liridona Musliu', 'Vesa Kryeziu', 'Mentor Bajrami', 'Albana Ismaili', 'Dardan Hyseni', 'Rrezarta Haliti', 'Leotrim Maloku', 'Endrit Shabani', 'Saranda Gjoka', 'Kreshnik Dema', 'Mirlinda Beqiri', 'Ylber Sylejmani', 'Shkurte Bislimi'];
    const cities = ['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Ferizaj', 'Gjilan', 'Mitrovicë', 'Podujevë', 'Vushtrri', 'Suharekë'];
    const plan = ['new', 'active', 'active', 'active', 'done', 'done', 'done', 'active', 'new', 'done', 'done', 'active', 'done', 'done'];
    const filler = [];
    plan.forEach((stage, i) => {
      const city = cities[i % cities.length], village = i % 3 === 0;
      const c = cust(names[i], i === 13 ? { cc: '43', country: 'Austri' } : {});
      const age = { new: 4 + i, active: 18 + i * 2, done: 50 + i * 3 }[stage];
      const role = i % 4 === 3 ? 'second' : i % 5 === 4 ? 'small' : 'main';
      const o = order(c, {
        role, createdAt: d(-age), stage, city,
        directions: village ? `${VILLAGE[city]}: ${pick(VILLAGE_DIRS).toLowerCase()}.` : `${pick(CITY_DIRS)}.`
      });
      const inst = installers[i % 3].id, dep = Math.round(o.price * 0.4 / 10000) * 10000;
      o.payments = [pay(dep, d(-age), pick(['cash', 'bank']), OFFICE)];
      o.visits.push(visit('measure', d(-age + 3), inst, { doneAt: d(-age + 3), time: pick(['morning', 'afternoon']) }));
      if (stage === 'new') o.visits = [visit('measure', d(1 + (i % 4)), inst, { time: pick(['morning', 'afternoon']) })];
      if (stage === 'active' && i % 2) o.visits.push(visit(i % 5 === 1 ? 'delivery' : 'install', d(i % 6), inst, { time: pick(['morning', 'afternoon', '08:30', null]) }));
      if (stage === 'done') {
        const fd = d(-age + 30);
        o.doneAt = fd; o.payTerm = pick(['week', 'week', 'month']);
        o.visits.push(visit('install', fd, inst, { time: 'morning', doneAt: fd }));
        if (i === 6 || i === 10) o.payments.push(pay(Math.round((o.price - dep) / 2 / 100) * 100, fd, 'cash', OFFICE));
        else o.payments.push(pay(o.price - dep, fd, pick(['cash', 'bank']), OFFICE));
      }
      filler.push(o);
    });

    /* Order numbers in creation order */
    [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .forEach((o, i) => { o.number = `2026-${String(14 + i).padStart(3, '0')}`; });

    /* History derived from the seed (append-only in the app) */
    const uName = id => users.find(u => u.id === id).name;
    const iName = id => installers.find(x => x.id === id).name;
    for (const o of orders) {
      const c = customers.find(x => x.id === o.customerId);
      ev(o, o.createdAt, `Porosia u krijua · ${OT.eur(o.price)}${o.qty ? ` · ${o.qty} ${o.unit}` : ''}`, 'stage', OFFICE);
      if (o.stage !== 'new') {
        const firstDone = o.visits.filter(v => v.doneAt && v.type !== 'measure').map(v => v.doneAt).sort()[0];
        ev(o, firstDone && firstDone < OT.addDays(o.createdAt, 8) ? firstDone : OT.addDays(o.createdAt, 7), 'Faza: E re → Në punë', 'stage', OFFICE);
      }
      for (const v of o.visits) if (v.doneAt) ev(o, v.doneAt, v.qty ? `Montuar ${v.qty} ${o.unit} · ${iName(v.installerId)}` : `${OT.VISIT_DONE[v.type]} · ${iName(v.installerId)}`, 'stage', OFFICE);
      for (const p of o.payments) {
        ev(o, p.date, p.heldBy ? `Pagesë ${OT.eur(p.amount)} kesh · te ${iName(p.heldBy)}` : `Pagesë ${OT.eur(p.amount)} (${OT.METHODS[p.method].toLowerCase()}) · në zyrë`, 'money', p.by, p.time);
        if (p.handedAt) ev(o, p.handedAt, `Konfirmuar: ${uName(p.handedBy)} i mori ${OT.eur(p.amount)} nga ${iName(p.heldBy)}`, 'money', p.handedBy);
      }
      if (o.stage === 'done') ev(o, o.doneAt, `Faza: Në punë → E kryer · pagesa: ${OT.TERMS[o.payTerm].toLowerCase()}${o.payTerm === 'date' ? ' ' + OT.fmtDate(o.dueDate) : ''}`, 'stage', OFFICE);
      for (const m of o.messages) ev(o, m.date, `Mesazh ${m.channel === 'viber' ? 'Viber' : 'WhatsApp'}: ${m.type === 'deposit' ? `${brand.depositWord || 'Avans'}i u pranua` : OT.CUSTOMER_MSG[m.type]} → ${c.name.split(' ')[0]}`, 'msg', m.by, m.time);
      if (o.remainingWork) ev(o, o.remainingWork.since, `Ka punë të mbetura: ${o.remainingWork.note}`, 'warn', OFFICE);
      if (o.pause) ev(o, o.remainingWork ? o.remainingWork.since : d(-3), `Kujtesat në pauzë deri më ${OT.fmtDate(o.pause.until)}: ${o.pause.reason}`, 'warn', OWNER);
    }

    /* A previously replaced tracking link for the €800 order (sent to a wrong number) */
    const oldToken = hex();
    ev(k800, d(-5), 'U krijua link i ri për klientin; linku i vjetër nuk hapet më', 'danger', OWNER, '12:30');

    /* Opening balances (borxh i bartur): real euros, whatever the business type */
    let obid = 0;
    const ob = (name, amount, o = {}) => ({
      id: `ob${++obid}`, name, phone: phone(), channel: 'whatsapp', amount: amount * 100, forWhat: o.forWhat || '', workDone: o.workDone || { mode: 'unknown' },
      dueDate: o.dueDate || null, dueApprox: !!o.dueApprox, note: o.note || '', noReminders: false, pause: null, payments: [], messages: [], createdAt: d(-14),
      events: [{ date: d(-14), time: '18:40', by: OWNER, text: `Borxh i bartur u shtua: ${OT.eur(amount * 100)}${o.dueDate ? '' : ' · afat i panjohur'}`, kind: 'money' }]
    });
    const openings = [
      ob('Blerim Hasani', 450, { forWhat: cat.small.type }),
      ob('Kadri Mustafa', 1200, { forWhat: `${cat.main.type}, 2025`, workDone: { mode: 'month', value: '2025-03' }, dueDate: '2025-04-30', dueApprox: true }),
      ob('Hysen Zeqiri', 300, { forWhat: 'Riparim', workDone: { mode: 'date', value: d(-60) }, dueDate: d(-45) }),
      ob('Shqipe Ramadani', 650, { forWhat: cat.second.type, note: 'Tha që paguan pas verës' }),
      ob('Fadil Ahmeti', 2100, { forWhat: `${cat.main.type} + ${cat.second.type.toLowerCase()}`, workDone: { mode: 'month', value: '2025-11' }, dueDate: '2025-12-31', dueApprox: true }),
      ob('Arta Dauti', 250, { forWhat: cat.small.type, workDone: { mode: 'date', value: d(-20) }, dueDate: d(10) })
    ];
    openings[4].payments = [pay(40000, d(-7), 'cash', OWNER)];
    openings[4].events.push({ date: d(-7), time: '11:15', by: OWNER, text: `Pagesë ${OT.eur(40000)} (kesh) · në zyrë`, kind: 'money' });

    /* Default demo set: the hand-written stories only (≈ the PHASES.md fixtures).
     * Everything is generated in both modes, so numbers, phones and tokens match. */
    let keep = { customers, orders, openings };
    if (!opts.full) {
      const os = orders.filter(o => !filler.includes(o)), cids = new Set(os.map(o => o.customerId));
      keep = { orders: os, customers: customers.filter(c => cids.has(c.id)), openings: openings.slice(0, 2) };
    }

    return {
      version: OT.STORE_VERSION, brandSlug: brand.slug, seededOn: today, dayOffset: 0, full: !!opts.full, role: 'owner',
      settings: { depositWord: brand.depositWord || 'Avans' },
      users, installers, ...keep,
      revokedTokens: { [oldToken]: k800.id },
      keyIds: { k800: k800.id, k800Visit: k800Install.id, project: k12.id, track: k7.id, remaining: k4.id, cousin: k6.id, edited: k10.id, overdue: k2.id, revoked: oldToken, plan: k9.id, busyDay: d(busy) }
    };
  };
})();
