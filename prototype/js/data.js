/* Fake, fictional demo data. Dates are relative to today, so the prototype
 * always looks current. Every key case from PHASES.md Phase 1 is hand-written;
 * the rest is deterministic filler, loaded only in the 30-order test set. */
(function () {
  const OT = window.OT;

  function rng(seed) { // mulberry32
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  /** opts.full: the 30-order stress set; default is the curated story set. */
  OT.buildSeed = function (brand, opts = {}) {
    const today = OT.realToday();
    const d = n => OT.addDays(today, n);
    const r = rng(brand.slug.length * 7919 + 17);
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const hex = () => Array.from({ length: 32 }, () => Math.floor(r() * 16).toString(16)).join('');
    const cat = brand.catalog;
    const eur = e => Math.round(e * cat.scale / 50) * 50 * 100; // scaled, rounded to €50, in cents
    const P = brand.people;

    const users = [
      { id: 'u-owner', name: P.owner, role: 'owner' },
      { id: 'u-office', name: P.office, role: 'office' },
      ...P.installers.map((n, i) => ({ id: `u-f${i + 1}`, name: n, role: 'field', teamId: `t${i + 1}` }))
    ];
    const teams = P.installers.map((n, i) => ({ id: `t${i + 1}`, name: `Ekipi ${i + 1} · ${n}`, leadId: `u-f${i + 1}` }));
    const [F1, F2, F3] = ['u-f1', 'u-f2', 'u-f3'];

    /* Customers */
    let cid = 0, ph = 0;
    const phone = (cc = '383') => {
      ph++;
      if (cc === '383') return `+383${pick(['44', '45', '49'])}${String(100000 + Math.floor(r() * 899999))}`;
      if (cc === '49') return `+49151${String(10000000 + Math.floor(r() * 89999999))}`;
      if (cc === '41') return `+4179${String(1000000 + Math.floor(r() * 8999999))}`;
      return `+43664${String(1000000 + Math.floor(r() * 8999999))}`;
    };
    const CITY = { 'Prishtinë': [42.663, 21.164], 'Podujevë': [42.911, 21.193], 'Ferizaj': [42.370, 21.155], 'Pejë': [42.659, 20.288], 'Gjakovë': [42.380, 20.430], 'Prizren': [42.215, 20.741], 'Gjilan': [42.464, 21.469], 'Mitrovicë': [42.891, 20.866], 'Vushtrri': [42.823, 20.968], 'Suharekë': [42.359, 20.825] };
    const VILLAGE = { 'Prishtinë': 'Lagjja Arbëria', 'Podujevë': 'Orllan', 'Ferizaj': 'Nerodime e Epërme', 'Pejë': 'Vitomiricë', 'Gjakovë': 'Rogovë', 'Prizren': 'Landovicë', 'Gjilan': 'Livoç i Epërm', 'Mitrovicë': 'Shipol', 'Vushtrri': 'Pantinë', 'Suharekë': 'Mushtisht' };
    const VILLAGE_DIRS = [
      'Te xhamia e vjetër, kthesa e dytë djathtas, shtëpia me fasadë të bardhë',
      'Pas shkollës fillore, rruga e asfaltuar deri në fund, porta e gjelbër',
      'Përballë pompës së benzinës, shtëpia trekatëshe me tulla të kuqe',
      'Te dyqani “Market Besa”, 200 m majtas, shtëpia e re pa fasadë',
      'Pas urës së lumit, shtëpia e tretë djathtas me çati të kuqe'
    ];
    const CITY_DIRS = ['Hyrja nga oborri, kati i dytë', 'Pranë shkollës, hyrja B, kati 4', 'Shtëpi private, porta e zezë', 'Banesa mbi farmaci, hyrja nga pas'];
    const pin = city => { const [la, lo] = CITY[city]; return `https://maps.google.com/?q=${(la + (r() - .5) * .02).toFixed(5)},${(lo + (r() - .5) * .02).toFixed(5)}`; };
    const customers = [];
    const cust = (name, city, o = {}) => {
      const c = {
        id: `c${++cid}`, name, city, phone: phone(o.cc), channel: o.channel || pick(['whatsapp', 'whatsapp', 'whatsapp', 'viber']),
        // About a third live in villages: reference-point directions only, no street, no pin.
        loc: (o.village != null ? o.village : (cid % 3 === 0))
          ? { city, village: VILLAGE[city], street: '', directions: o.directions || pick(VILLAGE_DIRS), pin: null }
          : { city, village: pick(['Qendër', 'Lagjja e Re', 'Dardania', 'Bregu i Diellit', 'Kodra e Diellit']), street: `${pick(['Rr. Dëshmorët', 'Rr. Skënderbeu', 'Rr. Nëna Terezë', 'Rr. Fehmi Agani', 'Rr. Ismail Qemali'])} ${1 + Math.floor(r() * 80)}`, directions: pick(CITY_DIRS), pin: pin(city) },
        noReminders: !!o.noReminders, note: o.note || '', country: o.country || null, lang: 'sq'
      };
      customers.push(c);
      return c;
    };

    const orders = [];
    let oid = 0, pid = 0;
    const pay = (amount, date, method, receivedBy, status = 'confirmed', extra = {}) =>
      ({ id: `p${++pid}`, amount, date, time: `${9 + Math.floor(r() * 8)}:${pick(['05', '20', '35', '50'])}`, method, receivedBy, status, ...extra });
    const order = (c, o) => {
      const role = cat[o.role || 'main'];
      const base = {
        id: `o${++oid}`, customerId: c.id, productType: role.type, description: o.desc || pick(role.descs),
        price: o.price != null ? o.price : eur(role.min + r() * (role.max - role.min)),
        discount: 0, adjustments: [], fulfilment: 'installation', stage: 'new', skipped: [],
        createdAt: d(-10), stageDates: {}, measurementDate: null, measurementWindow: null, measuredAt: null,
        promisedDate: null, teamId: null, scheduledDate: null, arrivalWindow: null, fulfilledAt: null,
        dueDate: null, collectAt: 'office', payments: [], remainingWork: null, pause: null, delay: null,
        photos: [], token: hex(), onSite: null, payer: null, notes: '', events: [], measurementNote: ''
      };
      const x = Object.assign(base, o);
      delete x.role; delete x.desc;
      orders.push(x);
      return x;
    };
    const photoKind = cat.photo;

    /* ── Key cases ─────────────────────────────────────────────── */

    // 1. The €800 case (live): installation today, installers collect the last €800.
    const cK1 = cust('Fatmir Krasniqi', 'Podujevë', { channel: 'whatsapp', village: true, directions: 'Te xhamia e vjetër, kthesa e dytë djathtas, shtëpia me fasadë të bardhë' });
    const k1 = order(cK1, { role: 'main', price: eur(5000), createdAt: d(-52), stage: 'scheduled', teamId: 't1', scheduledDate: d(0), arrivalWindow: '08:00–10:00', measurementDate: d(-45), measuredAt: d(-45), promisedDate: d(0), dueDate: d(0), collectAt: 'installers' });
    k1.discount = eur(200);
    k1.adjustments = [{ id: 'a1', amount: eur(200), reason: '+1 dollap i sipërm', date: d(-30), by: 'u-office' }];
    k1.payer = { name: 'Arianit Krasniqi', phone: '+4915174412290', channel: 'whatsapp', country: 'Gjermani', relation: 'djali, paguan nga Gjermania' };
    k1.onSite = { name: 'Fatmir Krasniqi', phone: cK1.phone, channel: 'viber', relation: 'babai, në shtëpi' };
    { const t = k1.price - k1.discount + eur(200); const dep = Math.round(t / 2 / 10000) * 10000; k1.payments = [pay(dep, d(-52), 'cash', 'u-owner'), pay(t - dep - 80000, d(-6), 'bank', 'u-office')]; }
    k1.stageDates = { new: d(-52), measurement: d(-45), production: d(-40), ready: d(-4), scheduled: d(-3) };
    k1.photos = [{ id: 'ph1', src: OT.photo('notebook', 1), label: 'Matjet', kind: 'measure', share: false }];
    k1.notes = 'Hyrja nga oborri. Babai është në shtëpi gjithë ditën.';
    k1.revokedNote = true;

    // 2. Overdue normal (eligible for reminder #3)
    const k2 = order(cust('Valbona Gashi', 'Prishtinë'), { role: 'second', price: eur(1850), createdAt: d(-70), stage: 'fulfilled', teamId: 't2', scheduledDate: d(-24), arrivalWindow: '10:00–12:00', fulfilledAt: d(-24), dueDate: d(-21), promisedDate: d(-24) });
    k2.payments = [pay(eur(1200), d(-70), 'cash', 'u-office')];
    k2.stageDates = { new: d(-70), measurement: d(-66), production: d(-50), ready: d(-28), scheduled: d(-27), fulfilled: d(-24) };
    k2.photos = [{ id: 'ph2', src: OT.photo(photoKind, 2), label: 'Pas montimit', kind: 'after', share: true }];

    // 3. Large overdue
    const k3 = order(cust('Shpend Berisha', 'Ferizaj'), { role: 'main', price: eur(7200), createdAt: d(-95), stage: 'fulfilled', teamId: 't3', scheduledDate: d(-40), arrivalWindow: '08:00–10:00', fulfilledAt: d(-40), dueDate: d(-35), promisedDate: d(-42) });
    k3.payments = [pay(eur(3000), d(-95), 'cash', 'u-owner'), pay(eur(2000), d(-40), 'cash', F3, 'confirmed', { confirmedBy: 'u-office', confirmedAt: d(-39) })];
    k3.stageDates = { new: d(-95), measurement: d(-90), production: d(-80), ready: d(-44), scheduled: d(-43), fulfilled: d(-40) };
    k3.photos = [
      { id: 'ph3', src: OT.photo('notebook', 0), label: 'Matjet', kind: 'measure', share: false },
      { id: 'ph4', src: OT.photo(photoKind, 0), label: 'Pas montimit', kind: 'after', share: true },
      { id: 'ph5', src: OT.photo(photoKind, 1), label: 'Detaj', kind: 'after', share: true }
    ];

    // 4. Remaining work + paused reminders
    const k4 = order(cust('Mimoza Hoxha', 'Pejë'), { role: 'main', price: eur(4300), createdAt: d(-60), stage: 'fulfilled', teamId: 't2', scheduledDate: d(-10), arrivalWindow: '08:00–10:00', fulfilledAt: d(-10), dueDate: d(-8), promisedDate: d(-12) });
    { const t = k4.price; k4.payments = [pay(eur(2000), d(-60), 'cash', 'u-owner'), pay(t - eur(2000) - 15000, d(-10), 'cash', F2, 'confirmed', { confirmedBy: 'u-owner', confirmedAt: d(-9) })]; }
    k4.remainingWork = { note: 'Një derë duhet rregulluar; klienti paguan €150 e fundit pas rregullimit.', visitDate: d(3), window: '14:00–15:00', teamId: 't2', since: d(-10) };
    k4.pause = { until: d(5), reason: 'Punë të mbetura' };
    k4.stageDates = { new: d(-60), measurement: d(-57), production: d(-45), ready: d(-13), scheduled: d(-12), fulfilled: d(-10) };

    // 5. Partially reported cash (badge "€X raportuar")
    const k5 = order(cust('Agron Morina', 'Gjakovë'), { role: 'second', price: eur(2400), createdAt: d(-50), stage: 'fulfilled', teamId: 't2', scheduledDate: d(-8), arrivalWindow: '12:00–14:00', fulfilledAt: d(-8), dueDate: d(-6), collectAt: 'installers', promisedDate: d(-8) });
    { const t = k5.price; k5.payments = [pay(t - 120000, d(-50), 'cash', 'u-office'), pay(50000, d(-2), 'cash', F2, 'reported', { reportedBy: F2 })]; }
    k5.stageDates = { new: d(-50), production: d(-40), ready: d(-10), scheduled: d(-9), fulfilled: d(-8) };
    k5.skipped = ['measurement'];

    // 6. Reported cash = full balance, never handed over (23 days)
    const k6 = order(cust('Lindita Bytyqi', 'Prizren'), { role: 'small', price: eur(900), createdAt: d(-55), stage: 'fulfilled', teamId: 't3', scheduledDate: d(-23), arrivalWindow: '10:00–12:00', fulfilledAt: d(-23), dueDate: d(-23), collectAt: 'installers', promisedDate: d(-23) });
    { const t = k6.price; k6.payments = [pay(t - 35000, d(-55), 'cash', 'u-office'), pay(35000, d(-23), 'cash', F3, 'reported', { reportedBy: F3 })]; }
    k6.stageDates = { new: d(-55), measurement: d(-50), production: d(-40), ready: d(-25), scheduled: d(-24), fulfilled: d(-23) };

    // 7. "Mos sugjero kujtesa" (relative)
    const k7 = order(cust('Bekim Rexhepi', 'Prishtinë', { noReminders: true, note: 'Kushëri i pronarit' }), { role: 'second', price: eur(1600), createdAt: d(-80), stage: 'fulfilled', teamId: 't1', scheduledDate: d(-34), arrivalWindow: '16:00–18:00', fulfilledAt: d(-34), dueDate: d(-30), promisedDate: d(-34) });
    k7.payments = [pay(eur(700), d(-80), 'cash', 'u-owner')];
    k7.stageDates = { new: d(-80), measurement: d(-75), production: d(-60), ready: d(-36), scheduled: d(-35), fulfilled: d(-34) };

    // 8. Pickup that skips steps: new → ready (→ fulfilled)
    const k8 = order(cust('Ardita Shala', 'Prishtinë'), { role: 'pickup', createdAt: d(-2), stage: 'ready', fulfilment: 'pickup', skipped: ['measurement', 'production'], promisedDate: d(1), dueDate: d(1) });
    k8.payments = [pay(Math.round(k8.price * 0.3 / 1000) * 1000, d(-2), 'card', 'u-office')];
    k8.stageDates = { new: d(-2), ready: d(-1) };

    // 9. Delivery tomorrow (day-before message)
    const k9 = order(cust('Kujtim Halili', 'Gjilan'), { role: 'delivery', createdAt: d(-20), stage: 'scheduled', fulfilment: 'delivery', skipped: ['measurement'], teamId: 't3', scheduledDate: d(1), arrivalWindow: '09:00–11:00', promisedDate: d(1), dueDate: d(1) });
    k9.payments = [pay(Math.round(k9.price * 0.5 / 1000) * 1000, d(-20), 'bank', 'u-office')];
    k9.stageDates = { new: d(-20), production: d(-18), ready: d(-3), scheduled: d(-2) };

    // 10. Delayed (waiting for supplier) → delay message + at risk
    const k10 = order(cust('Granit Kastrati', 'Mitrovicë'), { role: 'main', createdAt: d(-30), stage: 'production', teamId: 't1', measurementDate: d(-26), measuredAt: d(-26), promisedDate: d(2) });
    k10.delay = { reason: 'Pritet materiali nga furnitori', newDate: d(12), setAt: d(-1) };
    k10.payments = [pay(Math.round(k10.price * 0.4 / 10000) * 10000, d(-30), 'cash', 'u-owner')];
    k10.stageDates = { new: d(-30), measurement: d(-26), production: d(-22) };

    // 11. New with deposit yesterday → deposit message
    const k11 = order(cust('Elira Sopi', 'Suharekë'), { role: 'main', createdAt: d(-1), stage: 'new', promisedDate: d(40) });
    k11.payments = [pay(Math.round(k11.price * 0.4 / 10000) * 10000, d(-1), 'cash', 'u-owner')];
    k11.stageDates = { new: d(-1) };

    // 12. Reversed payment (registered twice by mistake)
    const k12 = order(cust('Naim Kelmendi', 'Mitrovicë'), { role: 'main', price: eur(5600), createdAt: d(-25), stage: 'production', measurementDate: d(-20), measuredAt: d(-20), promisedDate: d(18), teamId: 't3' });
    k12.payments = [
      pay(eur(1500), d(-25), 'cash', 'u-office'),
      pay(eur(1500), d(-25), 'cash', 'u-office', 'confirmed', { reversedBy: 'p-rev' }),
      { id: 'p-rev', amount: -eur(1500), date: d(-24), time: '09:12', method: 'cash', receivedBy: 'u-owner', status: 'reversal', reverses: null, reason: 'E regjistruar dy herë gabimisht' }
    ];
    k12.payments[2].reverses = k12.payments[1].id;
    k12.stageDates = { new: d(-25), measurement: d(-20), production: d(-4) };

    // 13. Installed 2 days ago, fully paid → thank-you message
    const k13 = order(cust('Drita Osmani', 'Vushtrri'), { role: 'second', createdAt: d(-40), stage: 'fulfilled', teamId: 't1', scheduledDate: d(-2), arrivalWindow: '10:00–12:00', fulfilledAt: d(-2), dueDate: d(-2), promisedDate: d(-2) });
    k13.payments = [pay(Math.round(k13.price / 2 / 100) * 100, d(-40), 'cash', 'u-office'), pay(k13.price - Math.round(k13.price / 2 / 100) * 100, d(-2), 'cash', F1, 'confirmed', { confirmedBy: 'u-office', confirmedAt: d(-1) })];
    k13.stageDates = { new: d(-40), measurement: d(-37), production: d(-30), ready: d(-4), scheduled: d(-3), fulfilled: d(-2) };
    k13.photos = [{ id: 'ph6', src: OT.photo(photoKind, 1), label: 'Pas montimit', kind: 'after', share: true }];

    // 14. Measurement visit today for team 1
    const k14 = order(cust('Rinor Avdiu', 'Prishtinë'), { role: 'main', price: eur(0), createdAt: d(-3), stage: 'measurement', teamId: 't1', measurementDate: d(0), measurementWindow: '11:30–12:30', promisedDate: d(45) });
    k14.price = eur(6000); k14.notes = 'Çmimi paraprak, konfirmohet pas matjes.';
    k14.stageDates = { new: d(-3), measurement: d(-2) };

    // 15. Installation in 2 days, team 1, office collects
    const k15 = order(cust('Besa Zeka', 'Prishtinë'), { role: 'second', createdAt: d(-35), stage: 'scheduled', teamId: 't1', scheduledDate: d(2), arrivalWindow: '13:00–15:00', measurementDate: d(-31), measuredAt: d(-31), promisedDate: d(2), dueDate: d(9) });
    k15.payments = [pay(Math.round(k15.price * 0.5 / 1000) * 1000, d(-35), 'bank', 'u-office')];
    k15.stageDates = { new: d(-35), measurement: d(-31), production: d(-25), ready: d(-3), scheduled: d(-1) };

    // 16. Diaspora customer, Switzerland, overdue, reminders paused by promise
    const k16 = order(cust('Flamur Ajeti', 'Ferizaj', { cc: '41', country: 'Zvicër', channel: 'whatsapp' }), { role: 'main', price: eur(6400), createdAt: d(-120), stage: 'fulfilled', teamId: 't2', scheduledDate: d(-60), arrivalWindow: '08:00–10:00', fulfilledAt: d(-60), dueDate: d(-45), promisedDate: d(-60) });
    k16.payments = [pay(eur(3000), d(-120), 'bank', 'u-office'), pay(eur(1800), d(-60), 'bank', 'u-office')];
    k16.pause = { until: d(9), reason: 'Klienti premtoi të paguajë kur vjen në Kosovë' };
    k16.stageDates = { new: d(-120), measurement: d(-115), production: d(-100), ready: d(-63), scheduled: d(-62), fulfilled: d(-60) };

    /* ── Filler ─────────────────────────────────────────────── */
    const names = ['Arbnor Hajdari', 'Liridona Musliu', 'Vesa Kryeziu', 'Mentor Bajrami', 'Albana Ismaili', 'Dardan Hyseni', 'Rrezarta Haliti', 'Leotrim Maloku', 'Endrit Shabani', 'Saranda Gjoka', 'Kreshnik Dema', 'Mirlinda Beqiri', 'Ylber Sylejmani', 'Shkurte Bislimi'];
    const cities = ['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Ferizaj', 'Gjilan', 'Mitrovicë', 'Podujevë', 'Vushtrri', 'Suharekë'];
    const plan = ['new', 'measurement', 'production', 'production', 'production', 'ready', 'ready', 'scheduled', 'fulfilled', 'fulfilled', 'fulfilled', 'production', 'new', 'fulfilled'];
    plan.forEach((stage, i) => {
      const diaspora = i === 13;
      const c = cust(names[i], cities[i % cities.length], diaspora ? { cc: '43', country: 'Austri', village: false } : {});
      const age = { new: 4, measurement: 8, production: 20 + i, ready: 34, scheduled: 40, fulfilled: 50 + i * 3 }[stage];
      const role = i % 4 === 3 ? 'second' : i % 5 === 4 ? 'small' : 'main';
      const o = order(c, { role, createdAt: d(-age), stage, teamId: `t${(i % 3) + 1}`, promisedDate: d(stage === 'fulfilled' ? -age + 30 : 10 + i * 2) });
      if (diaspora) o.location = { city: c.city, village: VILLAGE[c.city], street: '', directions: 'Shtëpia e prindërve: te varrezat e fshatit, rruga e parë majtas, shtëpia e fundit', pin: null, note: 'Shtëpia e prindërve, jo adresa e klientit' };
      const dep = Math.round(o.price * 0.4 / 10000) * 10000;
      o.payments = [pay(dep, d(-age), pick(['cash', 'bank']), 'u-office')];
      o.stageDates = { new: d(-age) };
      if (stage === 'measurement') { o.measurementDate = d(1 + (i % 3)); o.measurementWindow = '09:00–10:00'; }
      if (OT.stageIndex(stage) >= 2) { o.measurementDate = d(-age + 4); o.measuredAt = o.measurementDate; o.stageDates.measurement = o.measurementDate; o.stageDates.production = d(-age + 8); }
      if (OT.stageIndex(stage) >= 3) o.stageDates.ready = d(-3);
      if (stage === 'scheduled') { o.scheduledDate = d(0); o.arrivalWindow = '12:00–14:00'; o.teamId = 't2'; o.stageDates.scheduled = d(-2); o.dueDate = d(7); }
      if (stage === 'fulfilled') {
        const fd = d(-age + 30);
        o.scheduledDate = fd; o.fulfilledAt = fd; o.arrivalWindow = '10:00–12:00'; o.stageDates.fulfilled = fd; o.stageDates.scheduled = OT.addDays(fd, -2); o.stageDates.ready = OT.addDays(fd, -4);
        o.dueDate = OT.addDays(fd, 5);
        if (i === 10) { o.dueDate = d(6); o.fulfilledAt = d(-1); o.scheduledDate = d(-1); o.stageDates.fulfilled = d(-1); o.payments.push(pay(Math.round((o.price - dep) / 2 / 100) * 100, d(-1), 'cash', 'u-office')); o.msgSeeded = true; }
        else o.payments.push(pay(o.price - dep, fd, pick(['cash', 'bank']), 'u-office'));
      }
    });

    /* Order numbers in creation order */
    [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .forEach((o, i) => { o.number = `2026-${String(14 + i).padStart(3, '0')}`; });

    /* Audit events derived from the seed */
    const officeId = 'u-office';
    for (const o of orders) {
      const ev = (date, text, kind, by = officeId, time) => o.events.push({ date, time: time || `${9 + Math.floor(r() * 8)}:${pick(['02', '14', '27', '41', '58'])}`, by, text, kind });
      ev(o.createdAt, `Porosia u krijua · ${OT.eur(o.price)}`, 'stage');
      if (o.discount) ev(o.createdAt, `Zbritje ${OT.eur(o.discount)}`, 'money', 'u-owner');
      for (const a of o.adjustments) ev(a.date, `Shtesë ${OT.eur(a.amount)}: ${a.reason}`, 'money', a.by);
      for (const k of OT.STAGE_KEYS) if (k !== 'new' && o.stageDates[k]) {
        const lbl = OT.stageLabel(k, o.fulfilment, brand);
        ev(o.stageDates[k], k === 'scheduled' ? `${lbl}: ${OT.fmtDate(o.scheduledDate)}, ${o.arrivalWindow}, ${teams.find(t => t.id === o.teamId).name}` : `Faza: ${lbl}`, 'stage', k === 'fulfilled' ? users.find(u => u.teamId === o.teamId).id : officeId);
        if (k === 'measurement' && o.measuredAt) ev(o.measuredAt, 'Matja u krye · foto e fletores', 'stage', users.find(u => u.teamId === o.teamId).id);
      }
      if (o.skipped.length) ev(o.stageDates.ready || o.stageDates.production || o.createdAt, `Hapa të kaluar: ${o.skipped.map(k => OT.stageLabel(k, o.fulfilment, brand)).join(', ')}`, 'warn');
      for (const p of o.payments) {
        const m = { cash: 'kesh', bank: 'bankë', card: 'kartelë' }[p.method];
        const who = users.find(u => u.id === p.receivedBy).name;
        if (p.status === 'reported') ev(p.date, `${who} raportoi ${OT.eur(p.amount)} kesh nga klienti`, 'warn', p.receivedBy, p.time);
        else if (p.status === 'reversal') ev(p.date, `Storno ${OT.eur(p.amount)}: ${p.reason}`, 'danger', 'u-owner', p.time);
        else ev(p.date, `Pagesë ${OT.eur(p.amount)} (${m}), mori ${who}`, 'money', p.receivedBy, p.time);
        if (p.confirmedBy) ev(p.confirmedAt, `Konfirmuar: ${users.find(u => u.id === p.confirmedBy).name} i mori paratë nga ${who}`, 'money', p.confirmedBy);
      }
      if (o.remainingWork) ev(o.remainingWork.since, `Ka punë të mbetura: ${o.remainingWork.note}`, 'warn', users.find(u => u.teamId === o.teamId).id);
      if (o.pause) ev(o.remainingWork ? o.remainingWork.since : d(-3), `Kujtesat në pauzë deri më ${OT.fmtDate(o.pause.until)}: ${o.pause.reason}`, 'warn', 'u-owner');
      if (o.delay) ev(o.delay.setAt, `Vonesë: ${o.delay.reason}. Data e re ${OT.fmtDate(o.delay.newDate)}`, 'danger');
    }

    /* Opening balances (borxh i bartur) */
    let obid = 0;
    const ob = (name, amount, o = {}) => ({ id: `ob${++obid}`, name, phone: phone(o.cc), channel: o.channel || 'whatsapp', amount: eur(amount / cat.scale), forWhat: o.forWhat || '', workDone: o.workDone || null, dueDate: o.dueDate || null, dueApprox: !!o.dueApprox, note: o.note || '', payments: [], createdAt: d(-14), events: [{ date: d(-14), time: '18:40', by: 'u-owner', text: `Borxh i bartur u shtua: ${OT.eur(eur(amount / cat.scale))}${o.dueDate ? '' : ' · afat i panjohur'}`, kind: 'money' }] });
    const openings = [
      ob('Blerim Hasani', 450, { forWhat: cat.small.type, workDone: { mode: 'unknown' } }),
      ob('Kadri Mustafa', 1200, { forWhat: `${cat.main.type}, 2025`, workDone: { mode: 'month', value: '2025-03' }, dueDate: '2025-04-30', dueApprox: true }),
      ob('Hysen Zeqiri', 300, { forWhat: 'Riparim', workDone: { mode: 'date', value: d(-60) }, dueDate: d(-45) }),
      ob('Shqipe Ramadani', 650, { forWhat: cat.second.type, workDone: { mode: 'unknown' }, note: 'Tha që paguan pas verës' }),
      ob('Fadil Ahmeti', 2100, { forWhat: `${cat.main.type} + ${cat.second.type.toLowerCase()}`, workDone: { mode: 'month', value: '2025-11' }, dueDate: '2025-12-31', dueApprox: true }),
      ob('Arta Dauti', 250, { forWhat: cat.small.type, workDone: { mode: 'date', value: d(-20) }, dueDate: d(10) })
    ];
    openings[4].payments = [pay(eur(400 / cat.scale), d(-7), 'cash', 'u-owner')];
    openings[4].events.push({ date: d(-7), time: '11:15', by: 'u-owner', text: `Pagesë ${OT.eur(eur(400 / cat.scale))} (kesh), mori ${P.owner}`, kind: 'money' });

    /* Message history (already sent) */
    const messageLog = [
      { id: 'm1', date: d(-3), time: '17:20', type: 'scheduled', channel: 'whatsapp', to: k1.onSite.name, orderId: k1.id, by: 'u-office', text: 'Montimi u planifikua…' },
      { id: 'm2', date: d(-4), time: '10:02', type: 'reminder', channel: 'whatsapp', to: 'Valbona Gashi', orderId: k2.id, by: 'u-office', text: 'Kujtesë e parë…' },
      { id: 'm3', date: d(-11), time: '09:45', type: 'reminder', channel: 'viber', to: 'Valbona Gashi', orderId: k2.id, by: 'u-office', text: 'Kujtesë…' }
    ];
    const msgDone = [`scheduled:${k1.id}`, `reminder:${k2.id}:1`, `reminder:${k2.id}:2`];
    k1.events.push({ date: d(-3), time: '17:20', by: 'u-office', text: `Mesazh WhatsApp: Montimi u planifikua → ${k1.onSite.name}`, kind: 'msg' });
    k2.events.push({ date: d(-11), time: '09:45', by: 'u-office', text: 'Mesazh Viber: Kujtesë për pagesë → Valbona Gashi', kind: 'msg' });
    k2.events.push({ date: d(-4), time: '10:02', by: 'u-office', text: 'Mesazh WhatsApp: Kujtesë për pagesë → Valbona Gashi', kind: 'msg' });

    /* A previously revoked link for the €800 order (sent to a wrong number) */
    const oldToken = hex();
    k1.events.push({ date: d(-5), time: '12:30', by: 'u-owner', text: 'Linku i ndjekjes u zëvendësua (u dërgua në numër të gabuar)', kind: 'danger' });

    /* Default demo set: one story per person (≈ the PHASES.md Phase 3/4 fixtures).
     * Everything is generated in both modes, so numbers, phones and tracking
     * tokens are the same whichever set is loaded. */
    let keep = { customers, orders, openings, messageLog };
    if (!opts.full) {
      const story = [k1, k3, k15, k10, k4, k7, k8, k12, k14];
      const os = orders.filter(o => story.includes(o)), cids = new Set(os.map(o => o.customerId));
      keep = {
        orders: os, customers: customers.filter(c => cids.has(c.id)),
        openings: [openings[0], openings[1]],
        messageLog: messageLog.filter(m => os.some(o => o.id === m.orderId))
      };
    }

    return {
      version: OT.STORE_VERSION, brandSlug: brand.slug, seededOn: today, dayOffset: 0, full: !!opts.full,
      role: 'owner', fieldUserId: 'u-f1',
      settings: { reminderDays: [3, 10, 20], showBalanceOnTracking: false, depositWord: brand.depositWord || 'Avans' },
      users, teams, ...keep, msgDone,
      revokedTokens: { [oldToken]: k1.id },
      keyIds: { k800: k1.id, detail: k3.id, pickup: k8.id, revoked: oldToken, track: k15.id, remaining: k4.id }
    };
  };
})();
