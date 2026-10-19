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
  OT.WEEKDAYS_ON = ['të dielën', 'të hënën', 'të martën', 'të mërkurën', 'të enjten', 'të premten', 'të shtunën'];
  OT.MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];
  OT.fmtDay = iso => {
    if (!iso) return '—';
    const diff = OT.diffDays(iso, OT.today());
    if (diff === 0) return 'Sot';
    if (diff === 1) return 'Nesër';
    if (diff === -1) return 'Dje';
    return `${OT.WEEKDAYS[OT.parse(iso).getDay()]} ${OT.fmtDate(iso).slice(0, 5)}`;
  };
  OT.fmtLong = iso => `${OT.WEEKDAYS[OT.parse(iso).getDay()]}, ${OT.fmtDate(iso)}`;
  OT.fmtMonth = ym => { const [y, m] = ym.split('-').map(Number); return `${OT.MONTHS[m - 1]} ${y}`; };
  OT.nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  /** "sot", "dje", "12 ditë më parë", "3 muaj më parë" */
  OT.ago = iso => {
    const n = OT.diffDays(OT.today(), iso);
    if (n <= 0) return 'sot';
    if (n === 1) return 'dje';
    return n > 60 ? `${Math.floor(n / 30)} muaj më parë` : `${n} ditë më parë`;
  };

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

  /* ───────── Stages: three fixed keys; labels may be renamed ───────── */
  OT.STAGES = ['new', 'active', 'done'];
  const STAGE_LABEL = { new: 'E re', active: 'Në punë', done: 'E kryer', cancelled: 'Anuluar' };
  OT.TRACK_LABEL = { new: 'Porosia u pranua', active: 'Në punë', done: 'E kryer' };
  OT.stageLabel = (key, brand) => (brand && brand.stageLabels && brand.stageLabels[key]) || STAGE_LABEL[key];

  /* ───────── Visits: the only dates in the app ───────── */
  OT.VISIT = { measure: 'Matje', install: 'Montim', delivery: 'Dërgesë', repair: 'Riparim' };
  OT.VISIT_DONE = { measure: 'Matja u krye', install: 'Montimi u krye', delivery: 'Dërgesa u krye', repair: 'Riparimi u krye' };
  OT.VISIT_ICON = { measure: 'ruler', install: 'tool', delivery: 'truck', repair: 'tool' };
  OT.timeLabel = t => !t ? '' : t === 'morning' ? 'paradite' : t === 'afternoon' ? 'pasdite' : t;
  const timeSort = t => !t ? '12:30' : t === 'morning' ? '08:00' : t === 'afternoon' ? '13:00' : t;
  OT.visitSort = (a, b) => (a.date + timeSort(a.time)).localeCompare(b.date + timeSort(b.time));
  /** Visit types where installers usually take the rest of the money. */
  OT.collectsCash = v => v.type === 'install' || v.type === 'delivery';

  /* ───────── Payment terms (when a done order / an installed part must be paid) ───────── */
  OT.TERMS = { week: 'Brenda javës', month: 'Brenda muajit', date: 'Në një datë', unknown: 'Nuk e di' };
  const TERM_DAYS = { week: 7, month: 30 };
  const termDue = (from, term, date) => term === 'date' ? (date || null) : TERM_DAYS[term] ? OT.addDays(from, TERM_DAYS[term]) : null;

  OT.UNITS = ['copë', 'm²', 'banesa'];
  OT.METHODS = { cash: 'Kesh', bank: 'Bankë', card: 'Kartelë' };

  /* ───────── Lookups ───────── */
  OT.customer = id => OT.state.customers.find(c => c.id === id);
  OT.order = id => OT.state.orders.find(o => o.id === id);
  OT.opening = id => OT.state.openings.find(o => o.id === id);
  OT.installer = id => OT.state.installers.find(i => i.id === id);
  OT.user = id => OT.state.users.find(u => u.id === id);
  OT.currentUser = () => OT.state.users.find(u => u.role === OT.state.role) || OT.state.users[0];
  OT.isProject = o => !!o.qty;
  OT.recOf = (kind, id) => kind === 'opening' ? OT.opening(id) : OT.order(id);
  OT.nameOf = (kind, r) => kind === 'opening' ? r.name : OT.customer(r.customerId).name;

  /* ───────── Balances ───────── */
  /** paid = everything the customer handed over; held = still with an installer. */
  OT.paidOf = payments => {
    let paid = 0, held = 0;
    for (const p of payments) { paid += p.amount; if (p.heldBy && !p.handedAt) held += p.amount; }
    return { paid, held, inOffice: paid - held };
  };
  OT.unitPrice = o => Math.round(o.price / o.qty);
  /** Installed parts of a project: done visits with a quantity, oldest first. */
  OT.batches = o => o.visits.filter(v => v.doneAt && v.qty > 0).sort((a, b) => a.doneAt.localeCompare(b.doneAt));
  OT.batchValue = (o, v) => v.value != null ? v.value : v.qty * OT.unitPrice(o);
  OT.installedQty = o => OT.batches(o).reduce((s, v) => s + v.qty, 0);

  /**
   * What the customer owes right now, and since when.
   * - Normal order: nothing until it is done; then price − paid, due by the chosen term.
   * - Project: value of installed parts − paid (the whole contract once done).
   *   Payments cover the oldest parts first; the oldest part not yet paid sets the due date.
   */
  OT.orderTotals = o => {
    const { paid, held, inOffice } = OT.paidOf(o.payments);
    const total = o.price, chunks = [];
    if (o.stage !== 'cancelled') {
      if (OT.isProject(o)) {
        for (const b of OT.batches(o)) chunks.push({ value: OT.batchValue(o, b), due: termDue(b.doneAt, o.payTerm) });
        const sum = chunks.reduce((s, c) => s + c.value, 0);
        if (o.stage === 'done' && total > sum) chunks.push({ value: total - sum, due: termDue(o.doneAt, o.payTerm, o.dueDate) });
      } else if (o.stage === 'done') chunks.push({ value: total, due: termDue(o.doneAt, o.payTerm, o.dueDate) });
    }
    // The contract is the ceiling until the owner edits it.
    let earned = 0;
    for (const c of chunks) { c.value = Math.min(c.value, total - earned); earned += c.value; }
    let left = paid, dueDate, found = false;
    for (const c of chunks) {
      const covered = Math.min(c.value, Math.max(0, left)); left -= covered;
      if (covered < c.value && !found) { dueDate = c.due; found = true; }
    }
    const owed = Math.max(0, earned - paid);
    return {
      total, paid, held, inOffice, remaining: total - paid, earned, owed,
      paidAhead: OT.isProject(o) && o.stage !== 'done' ? Math.max(0, paid - earned) : 0,
      dueDate: owed > 0 ? dueDate || null : null, dueUnknown: owed > 0 && !dueDate
    };
  };
  OT.openingTotals = ob => {
    const { paid, held, inOffice } = OT.paidOf(ob.payments);
    const owed = Math.max(0, ob.amount - paid);
    return { total: ob.amount, paid, held, inOffice, remaining: ob.amount - paid, earned: ob.amount, owed, paidAhead: 0, dueDate: owed > 0 ? ob.dueDate : null, dueUnknown: owed > 0 && !ob.dueDate };
  };
  OT.totalsOf = (kind, r) => kind === 'opening' ? OT.openingTotals(r) : OT.orderTotals(r);

  OT.PAY_STATUS = { unpaid: 'Pa paguar', deposit: 'Avans', partial: 'Pjesërisht', paid: 'Paguar' };
  /** Company setting: some regions say "avans", others "kapar". */
  OT.depositWord = () => (OT.state && OT.state.settings.depositWord) || 'Avans';
  OT.payLabel = st => st === 'deposit' ? OT.depositWord() : OT.PAY_STATUS[st];
  OT.payStatus = (o, t) => t.paid <= 0 ? 'unpaid' : t.remaining <= 0 ? 'paid' : (o.stage === 'done' ? 'partial' : 'deposit');

  /* ───────── Reminder rule (spec §7): no schedule, just "is it reasonable now?" ───────── */
  OT.REMINDER_GAP = 7;
  OT.lastReminder = r => (r.messages || []).filter(m => m.type === 'reminder').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0] || null;
  OT.noReminders = (kind, r) => kind === 'opening' ? !!r.noReminders : !!OT.customer(r.customerId).noReminders;
  OT.reminderCheck = (kind, r) => {
    const t = OT.totalsOf(kind, r), today = OT.today();
    if (t.owed <= 0) return { ok: false, reason: 'Nuk ka borxh' };
    if (!t.dueDate) return { ok: false, reason: 'Afat i panjohur' };
    const late = OT.diffDays(today, t.dueDate);
    if (late <= 0) return { ok: false, reason: `Afati i pagesës: ${OT.fmtDate(t.dueDate)}`, notDue: true };
    if (r.pause && r.pause.until >= today) return { ok: false, reason: `Kujtesat në pauzë deri më ${OT.fmtDate(r.pause.until)}` };
    if (OT.noReminders(kind, r)) return { ok: false, reason: 'Mos sugjero kujtesa' };
    const last = OT.lastReminder(r);
    if (last && OT.diffDays(today, last.date) < OT.REMINDER_GAP) return { ok: false, reason: `Kujtesa e fundit ${OT.ago(last.date)}` };
    return { ok: true, late, sent: (r.messages || []).filter(m => m.type === 'reminder').length };
  };

  /* ───────── Debts list ───────── */
  OT.installerName = id => (OT.installer(id) || { name: '—' }).name;
  const heldLine = payments => {
    const by = {};
    for (const p of payments) if (p.heldBy && !p.handedAt) by[p.heldBy] = (by[p.heldBy] || 0) + p.amount;
    return Object.entries(by).map(([id, a]) => `${OT.eur(a)} te ${OT.installerName(id)}`).join(', ');
  };
  OT.debts = () => {
    const S = OT.state, today = OT.today(), rows = [];
    const row = (kind, r, t, base) => {
      const late = t.dueDate ? OT.diffDays(today, t.dueDate) : null;
      const rem = OT.reminderCheck(kind, r), last = OT.lastReminder(r);
      // Every context is computed, most decisive first; a row shows only the first one.
      const contexts = [];
      if (t.held > 0) contexts.push(['warning', 'cash', `${heldLine(r.payments)}, pa dorëzuar`]);
      if (OT.noReminders(kind, r)) contexts.push(['neutral', 'bellOff', 'Mos sugjero kujtesa']);
      if (r.pause && r.pause.until >= today) contexts.push(['neutral', 'pause', `Kujtesat në pauzë deri më ${OT.fmtDate(r.pause.until)} · ${r.pause.reason}`]);
      if (r.remainingWork) contexts.push(['neutral', 'tool', `Ka punë të mbetura: ${r.remainingWork.note}`]);
      if (last) contexts.push(['neutral', 'message', `Kujtesa e fundit: ${OT.ago(last.date)}`]);
      rows.push(Object.assign({
        kind, id: r.id, amount: t.owed, dueDate: t.dueDate, late, overdue: late != null && late > 0,
        unknownDue: t.dueUnknown, contexts, status: contexts[0] || null, rem, href: `#/${kind}/${r.id}`
      }, base));
    };
    for (const o of S.orders) {
      if (o.stage === 'cancelled') continue;
      const t = OT.orderTotals(o);
      if (t.owed <= 0) continue;
      const c = OT.customer(o.customerId);
      const meta = [o.number, OT.isProject(o) ? `${OT.installedQty(o)} / ${o.qty} ${o.unit}` : o.productType];
      if (!OT.isProject(o) && o.doneAt) { const n = OT.diffDays(today, o.doneAt); if (n > 0) meta.push(`${n} ditë nga përfundimi`); }
      if (c.country) meta.push(c.country);
      row('order', o, t, { name: c.name, phone: c.phone, channel: c.channel, meta: meta.join(' · ') });
    }
    for (const ob of S.openings) {
      const t = OT.openingTotals(ob);
      if (t.owed <= 0) continue;
      row('opening', ob, t, { name: ob.name, phone: ob.phone, channel: ob.channel || 'whatsapp', meta: ob.forWhat ? `Borxh i bartur · ${ob.forWhat}` : 'Borxh i bartur', approx: ob.dueApprox });
    }
    return rows;
  };

  /** Cash an installer took from a customer and hasn't handed over yet, grouped by installer. */
  OT.cashWithInstallers = () => {
    const S = OT.state, groups = {};
    const add = (p, kind, r) => {
      const g = groups[p.heldBy] || (groups[p.heldBy] = { installerId: p.heldBy, name: OT.installerName(p.heldBy), items: [], sum: 0 });
      g.items.push({ p, kind, r, days: OT.diffDays(OT.today(), p.date) });
      g.sum += p.amount;
    };
    for (const o of S.orders) for (const p of o.payments) if (p.heldBy && !p.handedAt) add(p, 'order', o);
    for (const ob of S.openings) for (const p of ob.payments) if (p.heldBy && !p.handedAt) add(p, 'opening', ob);
    return Object.values(groups).sort((a, b) => b.sum - a.sum);
  };

  /* ───────── Visits across orders (Orari) ───────── */
  OT.allVisits = () => {
    const out = [];
    for (const o of OT.state.orders) if (o.stage !== 'cancelled') for (const v of o.visits) out.push({ o, v });
    return out.sort((a, b) => OT.visitSort(a.v, b.v));
  };
  OT.visitsOn = date => OT.allVisits().filter(x => x.v.date === date);
  /** Planned visits from the last two weeks that nobody marked done. */
  OT.pastUndone = () => { const t = OT.today(), from = OT.addDays(t, -14); return OT.allVisits().filter(x => !x.v.doneAt && x.v.date < t && x.v.date >= from); };
  OT.nextVisit = o => o.visits.filter(v => !v.doneAt && v.date >= OT.today()).sort(OT.visitSort)[0] || null;
  /** A visit that should have happened by now and isn't marked done. */
  OT.dueVisit = o => o.visits.filter(v => !v.doneAt && v.date <= OT.today()).sort(OT.visitSort)[0] || null;
  /* ───────── Punët e montuesve: who is free, who did what ───────── */
  OT.WEEKDAYS_SHORT = ['Di', 'Hë', 'Ma', 'Më', 'En', 'Pr', 'Sh'];
  /** Albanian definite form of a first name: "Dritoni", "Besniku", "Besa". */
  OT.definite = n => /[kgh]$/.test(n) ? n + 'u' : /[aeë]$/.test(n) ? n : n + 'i';
  /** Every visit an installer has on a date (planned or done), except the one being edited. */
  OT.jobsOn = (installerId, date, exceptId) => OT.allVisits().filter(x => x.v.installerId === installerId && x.v.date === date && x.v.id !== exceptId);
  OT.loadTone = n => n === 0 ? 'free' : n === 1 ? 'one' : 'busy';
  /** The helper box under the installer chips in "Planifiko vizitë". */
  OT.dayLine = (installer, date, exceptId) => {
    const jobs = OT.jobsOn(installer.id, date, exceptId), d = OT.parse(date);
    const cap = s => s[0].toUpperCase() + s.slice(1);
    if (!jobs.length) return { free: true, head: `${installer.name} është i lirë në këtë datë.`, items: [] };
    const when = `${cap(OT.WEEKDAYS_ON[d.getDay()])}, ${d.getDate()} ${OT.MONTHS[d.getMonth()]}`;
    const at = v => { const l = OT.timeLabel(v.time); return l ? cap(l) : 'Pa orë'; };
    return {
      free: false, n: jobs.length, head: `${when}, ${OT.definite(installer.name)} ka ${jobs.length} punë:`,
      items: jobs.map(({ o, v }) => `${at(v)} — ${OT.VISIT[v.type]} te ${OT.firstName(OT.customer(o.customerId).name)} (${o.city})`)
    };
  };
  OT.installerSummary = id => {
    const today = OT.today(), mine = OT.allVisits().filter(x => x.v.installerId === id);
    const done = { install: 0, delivery: 0, measure: 0, repair: 0 }, units = {};
    for (const { o, v } of mine) if (v.doneAt) { done[v.type]++; if (v.qty) units[o.unit] = (units[o.unit] || 0) + v.qty; }
    const g = OT.cashWithInstallers().find(x => x.installerId === id);
    return {
      upcoming: mine.filter(x => !x.v.doneAt && x.v.date >= today), unmarked: mine.filter(x => !x.v.doneAt && x.v.date < today),
      done, doneTotal: Object.values(done).reduce((a, b) => a + b, 0), units, held: g ? g.sum : 0, heldItems: g ? g.items.length : 0
    };
  };

  /** "Mblidh €X" for an installer: only normal orders, only what remains. */
  OT.toCollect = o => OT.isProject(o) ? 0 : Math.max(0, OT.orderTotals(o).remaining);

  OT.dashboard = () => {
    const debts = OT.debts(), overdue = debts.filter(d => d.overdue);
    const cash = OT.cashWithInstallers(), sum = rows => rows.reduce((s, d) => s + d.amount, 0);
    return {
      total: sum(debts), overdue, overdueSum: sum(overdue),
      // Where the money not yet in the office is: the Sot headline's stacked bar
      upcomingSum: sum(debts.filter(d => !d.overdue && !d.unknownDue)), unknownSum: sum(debts.filter(d => d.unknownDue)), cashSum: cash.reduce((s, g) => s + g.sum, 0),
      cash, past: OT.pastUndone(), remindable: debts.filter(d => d.rem.ok), today: OT.visitsOn(OT.today())
    };
  };

  /* ───────── Customer tracking page: three steps + the next visit ───────── */
  OT.trackingSteps = o => OT.STAGES.map(k => {
    const i = OT.STAGES.indexOf(k), cur = OT.STAGES.indexOf(o.stage);
    let state = i < cur ? 'done' : i === cur ? 'current' : 'future';
    if (k === 'done' && o.stage === 'done') state = o.remainingWork ? 'current' : 'done';
    if (k === 'new' && o.stage === 'new') state = 'done'; // "Porosia u pranua" is a fact, not a step in progress
    return { key: k, label: OT.TRACK_LABEL[k], state };
  });
  OT.trackingHeadline = o => {
    if (o.stage === 'done') return o.remainingWork ? 'Po përfundojmë detajet e fundit' : 'Puna përfundoi. Faleminderit!';
    if (o.stage === 'active') return OT.isProject(o) ? 'Montimi është në vazhdim' : 'Porosia juaj është në punë';
    return 'Porosia juaj u pranua';
  };

  /* ───────── Prepared messages ───────── */
  OT.trackingUrl = token => `https://${OT.brand.slug}.example/t/${token}`;
  /** Greeting name: a person's first name, or a company's name without "sh.p.k.". */
  const first = name => /sh\.?p\.?k|l\.?l\.?c/i.test(name) ? name.replace(/\s*(sh\.?p\.?k\.?|l\.?l\.?c\.?)\s*$/i, '') : name.split(' ')[0];
  OT.firstName = first;
  const sign = () => `\n\n${first(OT.currentUser().name)}, ${OT.brand.companyName}`;
  /** "të enjten, 23.10" / "nesër (të enjten, 23.10)" */
  OT.onDay = iso => {
    const d = OT.parse(iso), base = `${OT.WEEKDAYS_ON[d.getDay()]}, ${OT.fmtDate(iso).slice(0, 5)}`;
    const diff = OT.diffDays(iso, OT.today());
    return diff === 0 ? `sot (${base})` : diff === 1 ? `nesër (${base})` : base;
  };
  OT.CUSTOMER_MSG = {
    deposit: 'Avansi u pranua', visit: 'Vijmë për', link: 'Linku i porosisë', thanks: 'Faleminderit', reminder: 'Kujtesë për pagesë', free: 'Mesazh i lirë'
  };
  OT.msgLabel = type => type === 'deposit' ? `${OT.depositWord()}i u pranua` : type === 'job' || type === 'day' ? 'Detajet e punës' : OT.CUSTOMER_MSG[type];
  /** Templates available on an order right now, most useful first. */
  OT.templatesFor = (kind, r) => {
    if (kind === 'opening') return ['reminder', 'free'];
    const t = OT.orderTotals(r), list = [];
    if (t.owed > 0) list.push('reminder');
    if (OT.nextVisit(r)) list.push('visit');
    if (r.stage !== 'done' && r.payments.length) list.push('deposit');
    list.push('link');
    if (r.stage === 'done') list.push('thanks');
    list.push('free');
    return list;
  };
  OT.customerText = (type, kind, r) => {
    const B = OT.brand;
    if (kind === 'opening') {
      const t = OT.openingTotals(r), name = first(r.name);
      if (type === 'free') return `Përshëndetje ${name},` + sign();
      return (OT.lastReminder(r)
        ? `Përshëndetje ${name}, vetëm një kujtesë e vogël për ${OT.eur(t.owed)} që ka mbetur${r.forWhat ? ` (${r.forWhat.toLowerCase()})` : ''}. Nëse ju përshtatet më mirë një datë tjetër, na tregoni dhe e rregullojmë bashkë. Faleminderit!`
        : `Përshëndetje ${name}, shpresojmë që jeni mirë. Ju kujtojmë me mirësjellje për shumën e mbetur prej ${OT.eur(t.owed)}${r.forWhat ? ` (${r.forWhat.toLowerCase()})` : ''}. Nëse ju përshtatet, na tregoni kur mund ta rregullojmë. Faleminderit!`) + sign();
    }
    const o = r, c = OT.customer(o.customerId), t = OT.orderTotals(o), name = first(c.name);
    const prod = o.productType.toLowerCase(), link = OT.trackingUrl(o.token);
    const what = OT.isProject(o) ? `për ${OT.installedQty(o)} ${o.unit} të montuara deri tani` : `për porosinë ${o.number}`;
    switch (type) {
      case 'deposit': {
        const dep = o.payments[0];
        return `Përshëndetje ${name}, faleminderit për ${OT.depositWord().toLowerCase()}in prej ${OT.eur(dep ? dep.amount : 0)}. Porosia juaj ${o.number} (${prod}) u regjistrua. Gjendjen e porosisë mund ta ndiqni këtu:\n${link}` + sign();
      }
      case 'visit': {
        const v = OT.nextVisit(o);
        if (!v) return `Përshëndetje ${name},` + sign();
        const kindTxt = { measure: 'matje', install: 'montim', delivery: 'dërgesë', repair: 'të përfunduar punën' }[v.type];
        const tl = OT.timeLabel(v.time);
        return `Përshëndetje ${name}, ekipi ynë vjen për ${kindTxt} ${OT.onDay(v.date)}${tl ? `, ${/^\d/.test(tl) ? 'ora ' + tl : tl}` : ''}. Nëse nuk ju përshtatet, na shkruani dhe e rregullojmë.\n${link}` + sign();
      }
      case 'link':
        return `Përshëndetje ${name}, këtu mund ta ndiqni gjendjen e porosisë suaj ${o.number}:\n${link}` + sign();
      case 'thanks':
        return `Faleminderit ${name}! Shpresojmë që t’ju pëlqejë ${prod}. Nëse jeni të kënaqur, një vlerësim i shkurtër na ndihmon shumë:\n${B.contact.googleReviewUrl}` + sign();
      case 'reminder':
        return (OT.lastReminder(o)
          ? `Përshëndetje ${name}, vetëm një kujtesë e vogël për ${OT.eur(t.owed)} që ka mbetur ${what}. Nëse ju përshtatet më mirë një datë tjetër, na tregoni dhe e rregullojmë bashkë. Faleminderit për mirëkuptimin!`
          : `Përshëndetje ${name}, shpresojmë që jeni mirë${OT.isProject(o) ? '' : ` dhe që ${prod} po ju shërben mirë`}. Ju kujtojmë me mirësjellje që ${what} ka mbetur për t’u paguar ${OT.eur(t.owed)}. Nëse e keni paguar tashmë, ju lutem mos e merrni parasysh këtë mesazh. Faleminderit!`) + sign();
      default:
        return `Përshëndetje ${name},` + sign();
    }
  };

  /* Installer messages: plain, scannable, numbers tappable in WhatsApp. Never the internal note. */
  const jobLines = (o, v, collect) => {
    const c = OT.customer(o.customerId), tl = OT.timeLabel(v.time);
    const lines = [`${OT.VISIT[v.type]}${tl ? ' · ' + tl : ''}`, `${c.name} · ${OT.fmtPhone(c.phone)}`, o.city];
    if (o.directions) lines.push(o.directions);
    lines.push(o.description || o.productType);
    if (v.note) lines.push(`Shënim: ${v.note}`);
    const amount = collect && OT.collectsCash(v) ? OT.toCollect(o) : 0;
    if (amount > 0) lines.push(`Mblidh: ${OT.eur(amount)}`);
    lines.push(`Porosia ${o.number}`);
    return lines;
  };
  OT.installerJobText = (o, v, collect) => {
    const lines = jobLines(o, v, collect);
    lines[0] = `${lines[0].split(' · ')[0]} · ${OT.WEEKDAYS[OT.parse(v.date).getDay()]} ${OT.fmtDate(v.date).slice(0, 5)}${OT.timeLabel(v.time) ? ' · ' + OT.timeLabel(v.time) : ''}`;
    return lines.join('\n');
  };
  OT.installerDayText = (installer, date, items, collect) => {
    const diff = OT.diffDays(date, OT.today());
    const when = diff === 1 ? 'nesër' : diff === 0 ? 'sot' : OT.WEEKDAYS_ON[OT.parse(date).getDay()];
    const head = `Punët për ${when}, ${OT.WEEKDAYS[OT.parse(date).getDay()]} ${OT.fmtDate(date).slice(0, 5)} · ${items.length} punë`;
    return [head, ...items.map(({ o, v }, i) => { const l = jobLines(o, v, collect); l[0] = `${i + 1}) ${l[0]}`; return l.join('\n'); })].join('\n\n');
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
    } else { // kitchen / wardrobe
      const fr = ['#F4F4F2', '#2F3A44', '#E9DFD0'][seed % 3];
      const doors = (y, h, n, x0 = 30, w = 260) => Array.from({ length: n }, (_, i) => `<rect x="${x0 + i * (w / n) + 2}" y="${y}" width="${w / n - 4}" height="${h}" rx="3" fill="${fr}" stroke="rgba(0,0,0,.12)"/><rect x="${x0 + i * (w / n) + w / n / 2 - 10}" y="${y + 8}" width="20" height="3" rx="1.5" fill="#9AA0A6"/>`).join('');
      s = `<rect width="320" height="320" fill="${wall}"/><rect x="0" y="268" width="320" height="52" fill="#CFC6B8"/>${doors(48, 70, 4)}<rect x="24" y="168" width="272" height="10" fill="${wood}"/><rect x="40" y="128" width="240" height="40" fill="#fff" opacity=".55"/>${doors(178, 90, 4)}<circle cx="232" cy="160" r="6" fill="#B0B6BB"/>`;
    }
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">${s}</svg>`);
  };
})();
