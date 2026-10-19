/* Business rules for the prototype. Mirrors the spec so the app's tests can be
 * written against the same behaviour. Money is integer cents everywhere. */
(function () {
  const OT = window.OT = window.OT || {};

  /* ───────── Dates (stored as 'YYYY-MM-DD'; Europe/Belgrade ≈ device local) ───────── */
  const pad = n => String(n).padStart(2, '0');
  OT.iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  OT.parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  OT.realToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return OT.iso(d); };
  OT.today = () => OT.addDays(OT.realToday(), (OT.state && OT.state.dayOffset) || 0);
  OT.addDays = (iso, n) => { const d = OT.parse(iso); d.setDate(d.getDate() + n); return OT.iso(d); };
  OT.diffDays = (a, b) => Math.round((OT.parse(a) - OT.parse(b)) / 864e5);
  OT.fmtDate = iso => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; };
  OT.WEEKDAYS = ['E diel', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë'];
  OT.MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];
  OT.fmtDay = iso => {
    if (!iso) return '—';
    const t = OT.today(), diff = OT.diffDays(iso, t);
    if (diff === 0) return 'Sot';
    if (diff === 1) return 'Nesër';
    if (diff === -1) return 'Dje';
    return `${OT.WEEKDAYS[OT.parse(iso).getDay()]} ${OT.fmtDate(iso).slice(0, 5)}`;
  };
  OT.fmtLong = iso => `${OT.WEEKDAYS[OT.parse(iso).getDay()]}, ${OT.fmtDate(iso)}`;
  OT.fmtMonth = ym => { const [y, m] = ym.split('-').map(Number); return `${OT.MONTHS[m - 1]} ${y}`; };
  OT.nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  /* ───────── Money ───────── */
  OT.eur = cents => {
    const neg = cents < 0, v = Math.abs(Math.round(cents));
    const e = Math.floor(v / 100), c = v % 100;
    return (neg ? '−' : '') + '€' + String(e).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (c ? ',' + pad(c) : '');
  };
  /** "800", "1.250", "1250,50", "€ 1 250" → cents, or null */
  OT.parseEur = s => {
    if (s == null) return null;
    let t = String(s).replace(/[€\s]/g, '');
    if (!t) return null;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
    return Math.round(parseFloat(t) * 100);
  };

  /* ───────── Stages: fixed keys, fixed order; labels may be renamed ───────── */
  OT.STAGE_KEYS = ['new', 'measurement', 'production', 'ready', 'scheduled', 'fulfilled'];
  OT.METHODS = { installation: 'Montim', delivery: 'Dërgesë', pickup: 'Tërheqje nga dyqani' };
  OT.stageLabel = (key, method, brand) => {
    const custom = brand && brand.stageLabels && brand.stageLabels[key];
    if (custom) return custom;
    if (key === 'scheduled') return method === 'delivery' ? 'Dërgesë e planifikuar' : 'Montim i planifikuar';
    if (key === 'fulfilled') return { installation: 'Montuar', delivery: 'Dorëzuar', pickup: 'Tërhequr' }[method];
    return { new: 'E re', measurement: 'Matje', production: 'Në prodhim', ready: 'Gati', cancelled: 'Anuluar' }[key];
  };
  /** Stages this order can pass through (pickup skips `scheduled`; hidden stages removed). */
  OT.flow = (o, brand) => OT.STAGE_KEYS.filter(k =>
    !(o.fulfilment === 'pickup' && k === 'scheduled') && !((brand.hiddenStages || []).includes(k)));
  OT.stageIndex = k => OT.STAGE_KEYS.indexOf(k);

  /* ───────── Balances ───────── */
  OT.orderTotals = o => {
    const adj = (o.adjustments || []).reduce((s, a) => s + a.amount, 0);
    const total = o.price - (o.discount || 0) + adj;
    return { adj, total, ...OT.paidOf(o.payments || [], total) };
  };
  OT.openingTotals = ob => ({ adj: 0, total: ob.amount, ...OT.paidOf(ob.payments || [], ob.amount) });
  OT.paidOf = (payments, total) => {
    let confirmed = 0, reported = 0;
    for (const p of payments) {
      if (p.status === 'confirmed' || p.status === 'reversal') confirmed += p.amount;
      else if (p.status === 'reported') reported += p.amount;
      // rejected → ignored
    }
    const paid = confirmed + reported;              // customer has paid
    return { confirmed, reported, paid, remaining: total - paid, inOffice: confirmed };
  };
  OT.PAY_STATUS = { unpaid: 'Pa paguar', deposit: 'Avans', partial: 'Pjesërisht', paid: 'Paguar' };
  /** Company setting: some regions say "avans", others "kapar". */
  OT.depositWord = () => (OT.state && OT.state.settings.depositWord) || 'Avans';
  OT.payLabel = st => st === 'deposit' ? OT.depositWord() : OT.PAY_STATUS[st];
  OT.payStatus = (o, t) => t.paid <= 0 ? 'unpaid' : t.remaining <= 0 ? 'paid' : (o.stage === 'fulfilled' ? 'partial' : 'deposit');

  /* ───────── Reminder suggestion rules (spec §6) ───────── */
  OT.reminderCheck = ({ remaining, dueDate, reported, pause, noReminders }) => {
    const today = OT.today();
    if (remaining <= 0) return { ok: false, reason: 'Nuk ka borxh' };
    if (!dueDate) return { ok: false, reason: 'Afat i panjohur: nuk sugjerohen kujtesa' };
    const late = OT.diffDays(today, dueDate);
    if (late <= 0) return { ok: false, reason: `Afati i pagesës: ${OT.fmtDate(dueDate)}`, notDue: true };
    if (reported > 0) return { ok: false, reason: `${OT.eur(reported)} raportuar nga montuesi, pa konfirmuar` };
    if (pause && pause.until >= today) return { ok: false, reason: `Kujtesat në pauzë deri më ${OT.fmtDate(pause.until)}` };
    if (noReminders) return { ok: false, reason: 'Klienti është shënuar “Mos sugjero kujtesa”' };
    const days = OT.state.settings.reminderDays;
    const step = days.filter(d => late >= d).length;
    if (step === 0) return { ok: false, reason: `Kujtesa e parë sugjerohet ${days[0]} ditë pas afatit` };
    return { ok: true, step, late };
  };

  OT.customer = id => OT.state.customers.find(c => c.id === id);
  /** Where the job happens: the order's own location (e.g. parents' house) or the customer's. */
  OT.locOf = o => o.location || OT.customer(o.customerId).loc;
  OT.locLine = l => [l.street, l.village, l.city].filter(Boolean).join(', ');
  OT.order = id => OT.state.orders.find(o => o.id === id);
  OT.opening = id => OT.state.openings.find(o => o.id === id);
  OT.team = id => OT.state.teams.find(t => t.id === id);
  OT.user = id => OT.state.users.find(u => u.id === id);

  /** Who the rest of the money is collected from / the person reminders go to. */
  OT.payerOf = o => o.payer || OT.contactFromCustomer(OT.customer(o.customerId));
  OT.contactFromCustomer = c => ({ name: c.name, phone: c.phone, channel: c.channel, country: c.country });

  /* ───────── Debts list ───────── */
  OT.debts = () => {
    const S = OT.state, today = OT.today(), rows = [];
    for (const o of S.orders) {
      if (o.stage === 'cancelled') continue;
      const t = OT.orderTotals(o);
      // Money is owed once the job is fulfilled or a payment due date is set; work in progress isn't debt yet.
      if (t.remaining <= 0 || !(o.stage === 'fulfilled' || o.dueDate)) continue;
      const c = OT.customer(o.customerId), payer = OT.payerOf(o);
      const rem = OT.reminderCheck({ remaining: t.remaining, dueDate: o.dueDate, reported: t.reported, pause: o.pause, noReminders: c.noReminders });
      const late = o.dueDate ? OT.diffDays(today, o.dueDate) : null;
      // Every spec context is computed, most decisive first; a row shows only the first one.
      const contexts = [];
      if (t.reported > 0) contexts.push(['warning', 'cash', `${OT.eur(t.reported)} raportuar, pa konfirmuar`]);
      if (c.noReminders) contexts.push(['neutral', 'bellOff', 'Mos sugjero kujtesa']);
      if (o.pause && o.pause.until >= today) contexts.push(['neutral', 'pause', `Kujtesat në pauzë deri më ${OT.fmtDate(o.pause.until)} · ${o.pause.reason.toLowerCase()}`]);
      if (o.remainingWork) contexts.push(['neutral', 'tool', `Ka punë të mbetura: ${o.remainingWork.note}`]);
      if (o.collectAt === 'installers' && o.stage !== 'fulfilled') contexts.push(['neutral', 'truck', 'Mblidhet nga montuesit']);
      const sinceFul = o.fulfilledAt ? OT.diffDays(today, o.fulfilledAt) : null;
      const metaBits = [o.number, o.productType];
      if (sinceFul > 0) metaBits.push(`${sinceFul} ditë nga ${o.fulfilment === 'installation' ? 'montimi' : 'dorëzimi'}`);
      if (payer.country) metaBits.push(payer.name === c.name ? payer.country : `paguan ${payer.name.split(' ')[0]} (${payer.country})`);
      rows.push({
        kind: 'order', id: o.id, name: c.name, phone: payer.phone, channel: payer.channel,
        meta: metaBits.join(' · '),
        amount: t.remaining, dueDate: o.dueDate, late, overdue: late != null && late > 0,
        unknownDue: !o.dueDate, contexts, status: contexts[0] || null, rem, fulfilledAt: o.fulfilledAt, href: `#/order/${o.id}`
      });
    }
    for (const ob of S.openings) {
      const t = OT.openingTotals(ob);
      if (t.remaining <= 0) continue;
      const late = ob.dueDate ? OT.diffDays(today, ob.dueDate) : null;
      const rem = OT.reminderCheck({ remaining: t.remaining, dueDate: ob.dueDate, reported: t.reported, pause: ob.pause, noReminders: ob.noReminders });
      // "Borxh i bartur" is in the meta line; "Afat i panjohur" is its own group.
      const contexts = [];
      if (t.reported > 0) contexts.push(['warning', 'cash', `${OT.eur(t.reported)} raportuar, pa konfirmuar`]);
      if (ob.pause && ob.pause.until >= today) contexts.push(['neutral', 'pause', `Kujtesat në pauzë deri më ${OT.fmtDate(ob.pause.until)}`]);
      rows.push({
        kind: 'opening', id: ob.id, name: ob.name, phone: ob.phone, channel: ob.channel || 'whatsapp',
        meta: ob.forWhat ? `Borxh i bartur · ${ob.forWhat}` : 'Borxh i bartur',
        amount: t.remaining, dueDate: ob.dueDate, late, overdue: late != null && late > 0,
        unknownDue: !ob.dueDate, contexts, status: contexts[0] || null, rem, href: `#/opening/${ob.id}`, approx: ob.dueApprox
      });
    }
    return rows;
  };

  OT.dashboard = () => {
    const S = OT.state, today = OT.today(), debts = OT.debts();
    const total = debts.reduce((s, d) => s + d.amount, 0);
    const overdue = debts.filter(d => d.overdue);
    const unknown = debts.filter(d => d.unknownDue);
    const jobs = OT.fieldJobs(null, today, 6);
    const installs = jobs.filter(j => j.type === 'installation' || j.type === 'delivery' || j.type === 'visit');
    const cash = OT.cashWithInstallers();
    const atRisk = S.orders.filter(o => OT.atRisk(o));
    return {
      total, count: debts.length, overdue, overdueSum: overdue.reduce((s, d) => s + d.amount, 0),
      unknownSum: unknown.reduce((s, d) => s + d.amount, 0),
      installsToday: installs.filter(j => j.date === today), installsWeek: installs,
      cash, cashSum: cash.reduce((s, g) => s + g.sum, 0),
      msgCount: OT.suggestions().ready.length, atRisk
    };
  };

  OT.atRisk = o => {
    if (['fulfilled', 'cancelled'].includes(o.stage) || !o.promisedDate) return false;
    const days = OT.diffDays(o.promisedDate, OT.today());
    return !!o.delay || (days <= 3 && OT.stageIndex(o.stage) < OT.stageIndex('ready'));
  };

  /** Reported cash not handed over yet, grouped by installer. */
  OT.cashWithInstallers = () => {
    const S = OT.state, groups = {};
    const add = (p, rec) => {
      const g = groups[p.receivedBy] || (groups[p.receivedBy] = { userId: p.receivedBy, name: OT.user(p.receivedBy).name, items: [], sum: 0 });
      g.items.push({ p, rec, days: OT.diffDays(OT.today(), p.date) });
      g.sum += p.amount;
    };
    for (const o of S.orders) for (const p of o.payments) if (p.status === 'reported') add(p, { kind: 'order', o });
    for (const ob of S.openings) for (const p of ob.payments) if (p.status === 'reported') add(p, { kind: 'opening', o: ob });
    return Object.values(groups).sort((a, b) => b.sum - a.sum);
  };

  /* ───────── Field jobs ───────── */
  OT.fieldJobs = (teamId, from, spanDays) => {
    const S = OT.state, to = OT.addDays(from, spanDays), jobs = [];
    const inRange = d => d && d >= from && d <= to;
    for (const o of S.orders) {
      if (o.stage === 'cancelled') continue;
      if (o.stage === 'measurement' && inRange(o.measurementDate))
        jobs.push({ o, type: 'measurement', date: o.measurementDate, window: o.measurementWindow, teamId: o.teamId, done: !!o.measuredAt });
      if (o.scheduledDate && inRange(o.scheduledDate) && (o.stage === 'scheduled' || (o.stage === 'fulfilled' && o.fulfilledAt === o.scheduledDate)))
        jobs.push({ o, type: o.fulfilment === 'delivery' ? 'delivery' : 'installation', date: o.scheduledDate, window: o.arrivalWindow, teamId: o.teamId, done: o.stage === 'fulfilled' });
      if (o.remainingWork && inRange(o.remainingWork.visitDate))
        jobs.push({ o, type: 'visit', date: o.remainingWork.visitDate, window: o.remainingWork.window, teamId: o.remainingWork.teamId, done: false });
    }
    return jobs.filter(j => !teamId || j.teamId === teamId)
      .sort((a, b) => (a.date + (a.window || '')).localeCompare(b.date + (b.window || '')));
  };
  OT.JOB_TYPES = { measurement: 'Matje', installation: 'Montim', delivery: 'Dërgesë', visit: 'Vizitë plotësuese' };
  /** Field sees "Mblidh €X" only when installers are supposed to collect. */
  OT.toCollect = o => {
    if (o.collectAt !== 'installers') return 0;
    return Math.max(0, OT.orderTotals(o).remaining);
  };

  /* ───────── Customer tracking timeline (3–5 steps) ───────── */
  OT.trackingSteps = (o, brand) => {
    const flow = OT.flow(o, brand);
    const keys = flow.filter(k => k !== 'new' && !(o.skipped || []).includes(k));
    const cur = OT.stageIndex(o.stage);
    const label = k => ({
      measurement: 'Matja', production: 'Në prodhim', ready: 'Gati',
      scheduled: o.fulfilment === 'delivery' ? 'Dërgesa' : 'Montimi',
      fulfilled: o.fulfilment === 'pickup' ? 'Tërhequr' : 'Përfunduar'
    }[k]);
    return keys.map(k => {
      const i = OT.stageIndex(k);
      let state = i < cur ? 'done' : i === cur ? 'current' : 'future';
      if (k === 'fulfilled' && o.stage === 'fulfilled') state = o.remainingWork ? 'current' : 'done';
      if (k === 'measurement' && o.stage === 'measurement' && o.measuredAt) state = 'done';
      return { key: k, label: label(k), state };
    });
  };
  OT.trackingHeadline = o => {
    const m = o.fulfilment;
    if (o.stage === 'fulfilled' && o.remainingWork) return 'Po përfundojmë detajet e fundit';
    return {
      new: 'Porosia juaj u regjistrua',
      measurement: o.measuredAt ? 'Matjet u kryen' : 'Matja është planifikuar',
      production: 'Porosia juaj është në prodhim',
      ready: m === 'pickup' ? 'Porosia juaj është gati për t’u tërhequr' : 'Porosia juaj është gati',
      scheduled: m === 'delivery' ? 'Dërgesa është planifikuar' : 'Montimi është planifikuar',
      fulfilled: m === 'pickup' ? 'Porosia u tërhoq. Faleminderit!' : m === 'delivery' ? 'Porosia u dorëzua. Faleminderit!' : 'Montimi përfundoi. Faleminderit!'
    }[o.stage];
  };

  /* ───────── Prepared messages ───────── */
  OT.MSG_TYPES = {
    deposit: { label: 'Paradhënia u pranua', icon: 'check', tone: 'ok' },
    production: { label: 'Në prodhim', icon: 'package', tone: '' },
    scheduled: { label: 'Montimi u planifikua', icon: 'calendar', tone: '' },
    dayBefore: { label: 'Kujtesë: nesër', icon: 'clock', tone: '' },
    fulfilled: { label: 'Faleminderit + vlerësim', icon: 'star', tone: 'ok' },
    delay: { label: 'Njoftim për vonesë', icon: 'alert', tone: 'late' },
    reminder: { label: 'Kujtesë për pagesë', icon: 'wallet', tone: 'money' },
    manual: { label: 'Mesazh i shkruar me dorë', icon: 'message', tone: '' }
  };
  /** Label for a message type; the deposit one follows the company's Avans/Kapar setting. */
  OT.msgLabel = type => type === 'deposit' ? `${OT.depositWord()}i u pranua` : OT.MSG_TYPES[type].label;

  OT.trackingUrl = token => `https://${OT.brand.slug}.example/t/${token}`;

  OT.messageText = (type, rec, extra = {}) => {
    const S = OT.state, B = OT.brand, staff = OT.currentUser().name;
    const sign = `\n\n${staff}, ${B.companyName}`;
    if (rec.kind === 'opening') {
      const ob = rec.o, t = OT.openingTotals(ob), first = ob.name.split(' ')[0];
      return `Përshëndetje ${first}, shpresojmë që jeni mirë. Ju kujtojmë me mirësjellje për shumën e mbetur prej ${OT.eur(t.remaining)}${ob.forWhat ? ` (${ob.forWhat.toLowerCase()})` : ''}. Nëse ju përshtatet, na tregoni kur mund ta rregullojmë. Faleminderit!` + sign;
    }
    const o = rec.o, c = OT.customer(o.customerId), t = OT.orderTotals(o);
    const to = type === 'reminder' ? OT.payerOf(o) : (o.onSite || OT.contactFromCustomer(c));
    const first = to.name.split(' ')[0];
    const prod = o.productType.toLowerCase();
    const link = OT.trackingUrl(o.token);
    const isDel = o.fulfilment === 'delivery';
    switch (type) {
      case 'deposit': {
        const dep = [...o.payments].reverse().find(p => p.status === 'confirmed' && p.amount > 0);
        return `Përshëndetje ${first}, faleminderit për ${OT.depositWord().toLowerCase()}in prej ${OT.eur(dep ? dep.amount : 0)}. Porosia juaj ${o.number} (${prod}) u regjistrua. Gjendjen e porosisë mund ta ndiqni këtu:\n${link}` + sign;
      }
      case 'production':
        return `Përshëndetje ${first}, porosia juaj ${o.number} (${prod}) ka hyrë në prodhim. Data e pritshme: ${OT.fmtDate(o.promisedDate)}. Ndiqeni këtu:\n${link}` + sign;
      case 'scheduled':
        return `Përshëndetje ${first}, ${isDel ? 'dërgesa' : 'montimi'} për ${prod} është planifikuar më ${OT.fmtLong(o.scheduledDate)}, ora ${o.arrivalWindow}. Nëse data nuk ju përshtatet, na shkruani.\n${link}` + sign;
      case 'dayBefore':
        return `Përshëndetje ${first}, ju kujtojmë që nesër (${OT.fmtDate(o.scheduledDate)}) ekipi ynë vjen për ${isDel ? 'dërgesë' : 'montim'}, ora ${o.arrivalWindow}. Për çdo gjë: ${B.contact.phone}.` + sign;
      case 'fulfilled':
        return `Faleminderit ${first}! Shpresojmë që t’ju pëlqejë ${prod} e re. Nëse jeni të kënaqur, një vlerësim i shkurtër na ndihmon shumë:\n${B.contact.googleReviewUrl}` + sign;
      case 'delay':
        return `Përshëndetje ${first}, ju njoftojmë me keqardhje që porosia ${o.number} do të vonohet pak (${o.delay.reason.toLowerCase()}). Data e re e pritshme: ${OT.fmtDate(o.delay.newDate)}. Ju kërkojmë ndjesë për pritjen dhe ju falënderojmë për durimin.\n${link}` + sign;
      case 'reminder': {
        const step = extra.step || 1;
        if (step === 1)
          return `Përshëndetje ${first}, shpresojmë që jeni mirë dhe që ${prod} po ju shërben mirë. Ju kujtojmë me mirësjellje që për porosinë ${o.number} ka mbetur për t’u paguar ${OT.eur(t.remaining)}. Nëse e keni paguar tashmë, ju lutem mos e merrni parasysh këtë mesazh. Faleminderit!` + sign;
        return `Përshëndetje ${first}, vetëm një kujtesë e vogël për ${OT.eur(t.remaining)} që ka mbetur për porosinë ${o.number}. Nëse ju përshtatet më mirë një datë tjetër, na tregoni dhe e rregullojmë bashkë. Faleminderit për mirëkuptimin!` + sign;
      }
      default:
        return `Përshëndetje ${first},` + sign;
    }
  };

  /** Computed on page load: no scheduler. Returns ready + suppressed (with reasons). */
  OT.suggestions = () => {
    const S = OT.state, today = OT.today(), tomorrow = OT.addDays(today, 1), ready = [], suppressed = [];
    const done = id => S.msgDone.includes(id);
    const push = (id, type, rec, why, extra) => { if (!done(id)) ready.push({ id, type, rec, why, extra }); };
    for (const o of S.orders) {
      if (o.stage === 'cancelled') continue;
      const rec = { kind: 'order', o }, c = OT.customer(o.customerId);
      const skipped = o.skipped || [];
      const since = k => o.stageDates && o.stageDates[k] ? OT.diffDays(today, o.stageDates[k]) : 99;
      if (o.stage === 'new' && o.payments.some(p => p.status === 'confirmed' && OT.diffDays(today, p.date) <= 3))
        push(`deposit:${o.id}`, 'deposit', rec, `${OT.depositWord()} i regjistruar së fundi`);
      if (o.stage === 'production' && !skipped.includes('production') && since('production') <= 5)
        push(`production:${o.id}`, 'production', rec, 'Porosia hyri në prodhim');
      if (o.stage === 'scheduled' && o.scheduledDate > tomorrow)
        push(`scheduled:${o.id}`, 'scheduled', rec, `${o.fulfilment === 'delivery' ? 'Dërgesë' : 'Montim'}: ${OT.fmtDay(o.scheduledDate)}`);
      if (o.stage === 'scheduled' && o.scheduledDate === tomorrow)
        push(`dayBefore:${o.id}`, 'dayBefore', rec, `${o.fulfilment === 'delivery' ? 'Dërgesa' : 'Montimi'} është nesër`);
      if (o.stage === 'fulfilled' && since('fulfilled') <= 3 && !o.remainingWork)
        push(`fulfilled:${o.id}`, 'fulfilled', rec, `${OT.stageLabel('fulfilled', o.fulfilment)} ${OT.fmtDay(o.fulfilledAt).toLowerCase()}`);
      if (o.delay && !done(`delay:${o.id}:${o.delay.newDate}`))
        push(`delay:${o.id}:${o.delay.newDate}`, 'delay', rec, `Vonesë: ${o.delay.reason}`);
      const t = OT.orderTotals(o);
      if (t.remaining > 0) {
        const r = OT.reminderCheck({ remaining: t.remaining, dueDate: o.dueDate, reported: t.reported, pause: o.pause, noReminders: c.noReminders });
        if (r.ok) push(`reminder:${o.id}:${r.step}`, 'reminder', rec, `${r.late} ditë pas afatit · ${OT.eur(t.remaining)}`, { step: r.step });
        else if (!r.notDue) suppressed.push({ rec, name: c.name, label: `${o.number} · ${OT.eur(t.remaining)}`, reason: r.reason });
      }
    }
    for (const ob of S.openings) {
      const t = OT.openingTotals(ob);
      if (t.remaining <= 0) continue;
      const rec = { kind: 'opening', o: ob };
      const r = OT.reminderCheck({ remaining: t.remaining, dueDate: ob.dueDate, reported: t.reported, pause: ob.pause, noReminders: ob.noReminders });
      if (r.ok) push(`reminder:${ob.id}:${r.step}`, 'reminder', rec, `Borxh i bartur · ${r.late} ditë pas afatit`, { step: r.step });
      else if (!r.notDue) suppressed.push({ rec, name: ob.name, label: `Borxh i bartur · ${OT.eur(t.remaining)}`, reason: r.reason });
    }
    const order = { dayBefore: 0, delay: 1, reminder: 2, scheduled: 3, deposit: 4, production: 5, fulfilled: 6 };
    ready.sort((a, b) => order[a.type] - order[b.type]);
    return { ready, suppressed };
  };

  OT.recipientOf = (type, rec) => {
    if (rec.kind === 'opening') return { name: rec.o.name, phone: rec.o.phone, channel: rec.o.channel || 'whatsapp' };
    const o = rec.o, c = OT.customer(o.customerId);
    if (type === 'reminder') return OT.payerOf(o);
    return o.onSite || OT.contactFromCustomer(c);
  };

  OT.currentUser = () => {
    const S = OT.state;
    return S.users.find(u => u.role === S.role && (S.role !== 'field' || u.id === S.fieldUserId)) || S.users[0];
  };

  OT.newToken = () => {
    const a = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  };

  OT.fmtPhone = p => {
    if (!p) return '';
    const m = p.match(/^\+(383|49|41|43|33|46|1)(\d+)$/);
    if (!m) return p;
    const rest = m[2].replace(/(\d{2})(\d{3})(\d+)/, '$1 $2 $3');
    return `+${m[1]} ${rest}`;
  };

  /* ───────── Placeholder photo illustrations (inline SVG → data URI) ───────── */
  OT.photo = (kind, seed = 0) => {
    const wood = ['#B98A5A', '#9A6B3F', '#C9A27A'][seed % 3];
    const wall = ['#E9E4DC', '#DDE3E6', '#ECE7E1'][seed % 3];
    let s;
    if (kind === 'notebook') {
      const lines = Array.from({ length: 11 }, (_, i) => `<line x1="34" x2="290" y1="${54 + i * 22}" y2="${54 + i * 22}" stroke="#B7C7DA" stroke-width="1"/>`).join('');
      const scrib = [
        'M60 70 h80 M60 70 v60 h120', 'M200 66 l12 -8 M200 66 h40',
        'M70 160 c20 -10 40 10 60 0 s40 -10 60 0', 'M70 205 h40 m10 0 h30 m10 0 h50'
      ].map(d => `<path d="${d}" fill="none" stroke="#2B3F73" stroke-width="2.4" stroke-linecap="round"/>`).join('');
      s = `<rect width="320" height="320" fill="#5B4636"/><g transform="rotate(${seed % 2 ? -4 : 3} 160 160)"><rect x="22" y="24" width="276" height="276" rx="6" fill="#FBFAF4"/><line x1="56" x2="56" y1="24" y2="300" stroke="#E7A0A0" stroke-width="1.5"/>${lines}${scrib}<text x="70" y="128" font-family="Comic Sans MS, cursive" font-size="17" fill="#2B3F73">360 × 60</text><text x="190" y="104" font-family="Comic Sans MS, cursive" font-size="15" fill="#2B3F73">h 245</text><text x="80" y="250" font-family="Comic Sans MS, cursive" font-size="15" fill="#2B3F73">priza 2×, ujë majtas</text></g>`;
    } else if (kind === 'door') {
      s = `<rect width="320" height="320" fill="${wall}"/><rect x="0" y="262" width="320" height="58" fill="${wood}"/><g opacity=".25">${Array.from({ length: 6 }, (_, i) => `<line x1="${i * 60}" x2="${i * 60 + 40}" y1="262" y2="320" stroke="#5a3d22"/>`).join('')}</g><rect x="102" y="52" width="116" height="212" rx="3" fill="#FAFAF8" stroke="#C9CBCD" stroke-width="6"/><rect x="120" y="72" width="80" height="80" rx="2" fill="none" stroke="#E1E3E5" stroke-width="3"/><rect x="120" y="168" width="80" height="78" rx="2" fill="none" stroke="#E1E3E5" stroke-width="3"/><rect x="196" y="156" width="16" height="5" rx="2" fill="#8A8F94"/>`;
    } else if (kind === 'site') {
      s = `<rect width="320" height="320" fill="${wall}"/><rect x="0" y="250" width="320" height="70" fill="#C8C2B8"/><rect x="40" y="90" width="110" height="160" fill="#fff" stroke="#bbb" stroke-dasharray="6 6" stroke-width="3"/><rect x="180" y="120" width="70" height="130" fill="#D6D0C6"/><circle cx="250" cy="70" r="22" fill="#F2C14E" opacity=".6"/>`;
    } else { // kitchen / wardrobe
      const fr = ['#F4F4F2', '#2F3A44', '#E9DFD0'][seed % 3];
      const doors = (y, h, n, x0 = 30, w = 260) => Array.from({ length: n }, (_, i) => `<rect x="${x0 + i * (w / n) + 2}" y="${y}" width="${w / n - 4}" height="${h}" rx="3" fill="${fr}" stroke="rgba(0,0,0,.12)"/><rect x="${x0 + i * (w / n) + w / n / 2 - 10}" y="${y + 8}" width="20" height="3" rx="1.5" fill="#9AA0A6"/>`).join('');
      s = `<rect width="320" height="320" fill="${wall}"/><rect x="0" y="268" width="320" height="52" fill="#CFC6B8"/>${doors(48, 70, 4)}<rect x="24" y="168" width="272" height="10" fill="${wood}"/><rect x="40" y="128" width="240" height="40" fill="#fff" opacity=".55"/>${doors(178, 90, 4)}<circle cx="232" cy="160" r="6" fill="#B0B6BB"/>`;
    }
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">${s}</svg>`);
  };
})();
