/* Prototype app: hash router, screens, bottom sheets, prototype controls. */
(function () {
  const OT = window.OT;
  OT.STORE_VERSION = 6;
  const PREF_KEY = 'ot-proto-prefs';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = OT.eur, fmtDate = OT.fmtDate, fmtDay = OT.fmtDay;

  /* ───────── Icons (24px stroke) ───────── */
  const P = {
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
    wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2"/><path d="M21 7h-6a3 3 0 0 0 0 6h6z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    message: '<path d="M21 12a8.5 8.5 0 0 1-12.3 7.6L3 21l1.4-5.4A8.5 8.5 0 1 1 21 12z"/>',
    truck: '<path d="M1 4h14v12H1zM15 9h4l3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2.2"/><circle cx="18" cy="18.5" r="2.2"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    map: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>',
    tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    bellOff: '<path d="M13.7 21a2 2 0 0 1-3.4 0M18.6 13A17.9 17.9 0 0 1 18 8M6.3 6.3A6 6 0 0 0 6 8c0 7-3 9-3 9h14M18 8a6 6 0 0 0-9.3-5M1 1l22 22"/>',
    globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5a14.5 14.5 0 0 1 0 19 14.5 14.5 0 0 1 0-19z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    package: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.9 17.9A10.7 10.7 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M1 1l22 22"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    kanban: '<rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="4" height="8" rx="1.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    nav: '<path d="m3 11 19-9-9 19-2-8z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };
  const WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';
  const VB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11.4 1.6C8.3 1.7 4.3 2.4 2.7 5.6c-1.2 2.4-1.1 6-.9 8.2.3 2.6 1.4 4.6 3.6 5.6v3c0 .6.7.9 1.1.5l2.7-2.8c3.3.3 6.8-.1 9.1-1.8 2.6-1.9 3.3-5.6 3-9C20.9 4.2 16.4 1.5 11.4 1.6zm.2 1.9c4.3-.1 7.9 2 8.2 6.2.3 3-.4 5.7-2.3 7.1-1.8 1.4-4.9 1.6-7.7 1.4l-2 2v-2.6c-2-.7-2.9-2.3-3.2-4.5-.2-2-.2-5 .7-6.9 1.2-2.2 4.2-2.7 6.3-2.7zm-2.7 3c-.4 0-.9.4-1.1.8-.4.8.1 1.9.7 2.9 1.2 2 2.9 3.7 5 4.7.8.4 1.8.7 2.4.1l.6-.7c.3-.4.2-.9-.2-1.2l-1.4-1c-.4-.3-.9-.2-1.2.2l-.4.5c-1.2-.5-2.3-1.6-2.9-2.8l.5-.4c.4-.3.5-.8.2-1.2l-.9-1.4c-.3-.4-.7-.5-1.3-.5zM12 5.2a.5.5 0 0 0 0 1 4.5 4.5 0 0 1 4.4 4.4.5.5 0 0 0 1 0A5.5 5.5 0 0 0 12 5.2zm.2 1.9a.5.5 0 0 0 0 1 2.4 2.4 0 0 1 2.3 2.3.5.5 0 0 0 1 0 3.4 3.4 0 0 0-3.3-3.3z"/></svg>';
  const ic = (name, cls = '') => name === 'whatsapp' ? WA : name === 'viber' ? VB :
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.help}</svg>`;

  /* ───────── State & persistence ───────── */
  let S, B, prefs = {};
  const ui = { channel: null, sim: null, sheet: null, filters: { s: '', stage: '', pay: '', team: '', city: '', risk: false }, pending: [], flash: null, lastRoute: '', stack: [location.hash.split('?')[0]], open: new Set() };
  const storeKey = slug => `ot-proto-v${OT.STORE_VERSION}:${slug}`;
  const tryGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const trySet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  function loadPrefs() { try { return JSON.parse(tryGet(PREF_KEY)) || {}; } catch (e) { return {}; } }
  function savePrefs() { trySet(PREF_KEY, JSON.stringify(prefs)); }
  function save() { if (!trySet(storeKey(S.brandSlug), JSON.stringify(S))) toast('Ndryshimet nuk u ruajtën lokalisht (memoria e shfletuesit plot).'); }

  function setBrand(slug, reseed) {
    B = OT.brand = OT.brands[slug] || OT.brands[OT.defaultBrand];
    let st = null;
    if (!reseed) { try { st = JSON.parse(tryGet(storeKey(B.slug))); } catch (e) { st = null; } }
    if (!st || st.version !== OT.STORE_VERSION || st.seededOn !== OT.realToday() || st.full !== !!prefs.full) {
      const role = S ? S.role : (prefs.role || 'owner');
      st = OT.buildSeed(B, { full: !!prefs.full }); st.role = role;
    }
    S = OT.state = st;
    prefs.brand = B.slug; savePrefs();
    applyTheme();
    save();
  }
  function contrast(hex) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const L = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
    return (0.2126 * L(r) + 0.7152 * L(g) + 0.0722 * L(b)) > 0.45 ? '#1A1A1A' : '#FFFFFF';
  }
  function applyTheme() {
    const s = document.documentElement.style, c = B.colors;
    s.setProperty('--brand-primary', c.primary);
    s.setProperty('--brand-primary-contrast', contrast(c.primary));
    s.setProperty('--brand-accent', c.accent);
    s.setProperty('--brand-accent-contrast', contrast(c.accent));
    s.setProperty('--brand-background', c.background);
    s.setProperty('--brand-text', c.text);
    document.title = `${B.companyName} · Porositë (prototip)`;
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = c.primary;
  }

  const me = () => OT.currentUser();
  const isOwner = () => S.role === 'owner';
  const isField = () => S.role === 'field';
  const log = (rec, text, kind = '') => rec.events.push({ date: OT.today(), time: OT.nowTime(), by: me().id, text, kind });
  const userName = id => (OT.user(id) || { name: '—' }).name;
  const teamName = id => (OT.team(id) || { name: '—' }).name;
  const stageLabel = (k, o) => OT.stageLabel(k, o.fulfilment, B);

  /* ───────── Router ───────── */
  const $view = () => document.getElementById('view');
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), q: new URLSearchParams(qs || '') };
  }
  const go = h => { if (location.hash === h) render(); else location.hash = h; };

  const FIELD_ROUTES = ['field', 'job', 't'];
  function render() {
    const { parts, q } = route();
    let name = parts[0] || (isField() ? 'field' : 'dashboard');
    if (isField() && !FIELD_ROUTES.includes(name)) name = 'field';
    const fn = SCREENS[name] || SCREENS.dashboard;
    const out = fn(parts.slice(1), q);
    const key = location.hash.split('?')[0];
    const main = document.querySelector('.main');
    const keepScroll = key === ui.lastRoute && main ? main.scrollTop : 0;
    $view().innerHTML = out.bare ? out.html : shell(out);
    // Folds stay open across re-renders (e.g. after toggling a photo inside one).
    $view().querySelectorAll('details[data-fold]').forEach(d => { if (ui.open.has(d.dataset.fold)) d.open = true; });
    if (ui.sim) $view().insertAdjacentHTML('beforeend', simHtml());
    setFrame(out.frame || 'phone');
    const m2 = document.querySelector('.main'); if (m2) m2.scrollTop = keepScroll;
    ui.lastRoute = key;
    updateProtoBar();
    if (out.after) out.after();
  }

  function shell(out) {
    const role = { owner: 'Pronari', office: 'Zyra', field: 'Terreni' }[S.role];
    // "Terreni" is the installers' role; for the owner the same jobs are the schedule ("Orari").
    const tabs = isField() ? '' : `<nav class="tabbar" aria-label="Navigimi">${[
      ['dashboard', 'home', 'Sot'], ['debts', 'wallet', 'Borxhet'], ['orders', 'list', 'Porositë'],
      ['messages', 'message', 'Mesazhet', OT.suggestions().ready.length], ['field', 'calendar', 'Orari']
    ].map(([k, i, l, n]) => `<a class="tab" href="#/${k}" ${out.nav === k ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${n ? `<span class="tab__count">${n}</span>` : ''}</a>`).join('')}</nav>`;
    return `<div class="shell">
      <header class="app-header">
        <a class="app-header__brand" href="#/${isField() ? 'field' : 'dashboard'}">
          <span class="app-header__logo">${B.logo.svg}</span>
          <span class="app-header__titles"><span class="app-header__title">${esc(B.companyName)}</span><span class="app-header__sub" style="display:block">${role} · ${esc(me().name)}${S.dayOffset ? ` · <b style="color:var(--color-warning)">data e demos +${S.dayOffset} ditë</b>` : ''}</span></span>
        </a>
        <button class="avatar" data-act="panel" aria-label="Paneli i prototipit">${esc(me().name[0])}</button>
      </header>
      <main class="main"><div class="content">${out.html}</div></main>
      ${tabs}
    </div>`;
  }

  const pageHead = (title, back, sub = '', right = '') => {
    const smart = back && back.startsWith('back:'), href = smart ? back.slice(5) : back;
    return `<div class="page-head">${back ? `<a class="back" href="${href}"${smart ? ' data-act="back"' : ''} aria-label="Kthehu">${ic('left')}</a>` : ''}<div class="grow"><h1>${title}</h1>${sub ? `<div class="page-head__sub">${sub}</div>` : ''}</div>${right}</div>`;
  };
  const badge = (tone, icon, text) => `<span class="badge badge--${tone}">${icon ? ic(icon) : ''}<span class="ellipsis">${esc(text)}</span></span>`;
  const payBadge = st => badge({ unpaid: 'danger', deposit: 'info', partial: 'warning', paid: 'success' }[st], '', OT.payLabel(st));
  const progress = t => {
    const tot = Math.max(t.total, 1);
    return `<div class="progress" title="Konfirmuar ${eur(t.confirmed)} · Raportuar ${eur(t.reported)}"><span class="progress__confirmed" style="width:${Math.max(0, Math.min(100, t.confirmed / tot * 100))}%"></span><span class="progress__reported" style="width:${Math.max(0, Math.min(100, t.reported / tot * 100))}%"></span></div>`;
  };
  const lateSpan = n => n > 60 ? `${Math.floor(n / 30)} muaj` : `${n} ditë`;
  const lateText = d => d.overdue ? `<span class="debt__late debt__late--danger">Vonesë ${lateSpan(d.late)}</span>` : d.unknownDue ? `<span class="debt__late subtle">Afat i panjohur</span>` : d.late === 0 ? `<span class="debt__late">Afati sot</span>` : `<span class="debt__late subtle">Afati ${fmtDay(d.dueDate).toLowerCase()}</span>`;
  const chIcon = ch => ch === 'viber' ? VB : ch === 'sms' ? ic('message') : WA;
  const chOf = ch => ch === 'viber' ? 'viber' : 'whatsapp';
  /* "Kujtesë" is a green labelled button only where a reminder is suggested;
   * elsewhere a quiet icon still lets staff write by hand (spec: never automatic). */
  const reminderBtn = (rem, ch, href, label = 'Kujtesë') => rem.ok
    ? `<a class="btn btn--${chOf(ch)} btn--sm" href="${href}">${chIcon(chOf(ch))} ${label}</a>`
    : `<a class="icon-btn icon-btn--quiet" href="${href}" aria-label="Shkruaj mesazh me dorë">${chIcon(chOf(ch))}</a>`;
  const foldSummary = (icon, title, sum) => `<summary>${icon ? ic(icon) : ''}<span class="grow"><span class="fold__title">${title}</span>${sum ? `<span class="fold__sum">${sum}</span>` : ''}</span>${ic('right', 'chev')}</summary>`;

  /* ═══════════════════════ SCREENS ═══════════════════════ */
  const SCREENS = {};

  /* 1. Owner dashboard ("Sot"): summaries that link to the one place each list lives. */
  SCREENS.dashboard = () => {
    const D = OT.dashboard(), today = OT.today();
    const overdue = [...D.overdue].sort((a, b) => b.amount - a.amount);
    const hour = new Date().getHours();
    const hello = hour < 11 ? 'Mirëmëngjes' : hour < 18 ? 'Mirëdita' : 'Mirëmbrëma';
    const jobs = OT.fieldJobs(null, today, 0);

    const headline = `<a class="headline" href="#/debts">
      <span class="headline__label">Kush më ka borxh ${ic('right', 'chev')}</span>
      ${overdue.length
        ? `<span class="headline__value num">${eur(D.overdueSum)}</span><span class="headline__sub">me vonesë · ${overdue.length} klientë · gjithsej për t’u mbledhur ${eur(D.total)}</span>`
        : `<span class="headline__value num">${eur(D.total)}</span><span class="headline__sub">për t’u mbledhur · asnjë me vonesë</span>`}
      ${overdue.length ? `<span class="headline__list">${overdue.slice(0, 3).map(d => `<span class="headline__row"><span class="grow ellipsis">${esc(d.name)}</span><span class="num">${eur(d.amount)}</span><span class="headline__late">${lateSpan(d.late)}</span></span>`).join('')}</span>` : ''}
    </a>`;

    // At most four things that need the owner, each linking to its own screen.
    const attention = [];
    for (const g of D.cash) attention.push(['warning', 'cash', `#/cash`, `${g.name}: ${eur(g.sum)} për t’u dorëzuar`, 'Para te montuesit, pa dorëzuar në zyrë']);
    if (D.msgCount) attention.push(['brand', 'message', '#/messages', `${D.msgCount} mesazhe gati për dërgim`, 'Përgatitur nga aplikacioni, i dërgoni ju']);
    if (D.atRisk.length === 1) { const o = D.atRisk[0]; attention.push(['danger', 'clock', `#/order/${o.id}`, `${OT.customer(o.customerId).name}: porosi në rrezik`, o.delay ? o.delay.reason : `premtuar ${fmtDate(o.promisedDate)}`]); }
    else if (D.atRisk.length) attention.push(['danger', 'clock', '#/orders?risk=1', `${D.atRisk.length} porosi në rrezik`, 'afati afër ose vonesë']);

    const html = `
      <div class="today-line">${hello}, ${esc(me().name)} · ${OT.fmtLong(today)}</div>
      ${headline}
      ${attention.length ? `<section class="card"><div class="card__head"><h2 class="card__title">Kërkon vëmendje</h2></div><div class="list">${attention.slice(0, 4).map(([tone, icon, href, title, sub]) => `<a class="list-row" href="${href}"><span class="list-row__icon tone--${tone}">${ic(icon)}</span><span class="grow"><b>${esc(title)}</b><br><span class="small muted">${esc(sub)}</span></span>${ic('right', 'chev')}</a>`).join('')}</div></section>` : ''}
      <section class="card"><div class="card__head"><h2 class="card__title">Sot në terren <span class="subtle small">· ${D.installsWeek.length} montime këtë javë</span></h2><a class="card__link" href="#/field">Orari ${ic('right', 'chev')}</a></div>
        <div class="list">${jobs.map(j => `<a class="list-row" href="#/order/${j.o.id}"><span class="job-time num">${esc((j.window || '').split('–')[0])}</span><span class="grow"><b>${esc(OT.customer(j.o.customerId).name)}</b><br><span class="small muted">${OT.JOB_TYPES[j.type]} · ${esc(userName((S.users.find(u => u.teamId === j.teamId) || {}).id))}</span></span>${j.done ? badge('success', 'check', 'Kryer') : ''}</a>`).join('') || '<div class="empty small">Sot nuk ka punë në terren.</div>'}</div></section>
      <div class="quick">
        <a class="btn btn--soft" href="#/order/new">${ic('plus')} Porosi e re</a>
        <a class="btn btn--soft" href="#/opening/new">${ic('book')} Borxh i bartur</a>
      </div>
    `;
    return { html, nav: 'dashboard' };
  };

  /* 2. Kush më ka borxh */
  /* One row = name, amount, one status line, one message button (the payer's channel) and call. */
  function debtRow(d) {
    const flash = ui.flash === d.id ? ' debt--new' : '';
    const st = d.status;
    return `<div class="debt${flash}" id="debt-${d.id}">
      <a class="debt__top" href="${d.href}">
        <div class="grow"><div class="debt__name">${esc(d.name)}</div><div class="debt__meta">${esc(d.meta)}</div></div>
        <div class="debt__amount"><b>${eur(d.amount)}</b>${lateText(d)}</div>
      </a>
      <div class="debt__foot">
        ${st ? `<span class="debt__status debt__status--${st[0]}">${ic(st[1])}<span class="clamp2">${esc(st[2])}</span></span>` : '<span class="grow"></span>'}
        ${reminderBtn(d.rem, d.channel, `#/compose/${d.kind}/${d.id}?ch=${chOf(d.channel)}`)}
        <a class="icon-btn icon-btn--call" href="tel:${esc(d.phone)}" aria-label="Thirr ${esc(d.name)}">${ic('phone')}</a>
      </div>
    </div>`;
  }

  SCREENS.debts = (p, q) => {
    const sort = q.get('sort') || 'amount';
    const all = OT.debts();
    const sum = rows => rows.reduce((s, d) => s + d.amount, 0);
    const cmp = sort === 'late' ? (a, b) => (b.late ?? -1e9) - (a.late ?? -1e9) || b.amount - a.amount : (a, b) => b.amount - a.amount;
    const overdue = all.filter(d => d.overdue), unknown = all.filter(d => d.unknownDue), upcoming = all.filter(d => !d.overdue && !d.unknownDue);
    if (ui.flash && upcoming.some(d => d.id === ui.flash)) ui.open.add('debts-upcoming');
    const rows = list => `<div class="card list">${[...list].sort(cmp).map(debtRow).join('')}</div>`;
    const title = (t, list) => `${t} <span class="count">${list.length} · ${eur(sum(list))}</span>`;
    const html = `
      ${pageHead('Kush më ka borxh', '', '', `<a class="btn btn--soft btn--sm" href="#/opening/new">${ic('plus')} Borxh i bartur</a>`)}
      <div class="summary card">
        <div class="summary__row"><span>Me vonesë</span><b class="num${overdue.length ? ' danger' : ''}">${eur(sum(overdue))}</b></div>
        <div class="summary__row"><span>Gjithsej për t’u mbledhur</span><b class="num">${eur(sum(all))}</b></div>
      </div>
      <div class="seg" role="group" aria-label="Rendit">
        <a href="#/debts?sort=amount" ${sort === 'amount' ? 'aria-current="page"' : ''}>Sipas shumës</a>
        <a href="#/debts?sort=late" ${sort === 'late' ? 'aria-current="page"' : ''}>Sipas vonesës</a>
      </div>
      ${overdue.length ? `<h2 class="section-title">${title('Me vonesë', overdue)}</h2>${rows(overdue)}` : ''}
      ${unknown.length ? `<h2 class="section-title">${title('Afat i panjohur', unknown)}</h2>
        <p class="group-help">Nga fletorja, pa afat pagese. Llogariten në total, jo te vonesat, dhe nuk sugjerohen kujtesa.</p>${rows(unknown)}` : ''}
      ${upcoming.length ? `<details class="group" data-fold="debts-upcoming"><summary class="section-title">${ic('right', 'chev')}${title('Ende në afat', upcoming)}</summary>${rows(upcoming)}</details>` : ''}
      ${!all.length ? `<div class="card"><div class="empty">${ic('check')}<b>Askush nuk ju ka borxh.</b></div></div>` : ''}
    `;
    return {
      html, nav: 'debts', after: () => {
        if (ui.flash) { const el = document.getElementById('debt-' + ui.flash); if (el) el.scrollIntoView({ block: 'center' }); ui.flash = null; }
      }
    };
  };

  /* Para te montuesit, pa dorëzuar */
  SCREENS.cash = () => {
    const groups = OT.cashWithInstallers();
    const html = `
      ${pageHead('Para te montuesit', 'back:#/dashboard', 'Pa dorëzuar në zyrë')}
      <p class="group-help">Klienti i ka paguar këto para montuesit, prandaj nuk ka më borxh për to. Konfirmo kur t’i marrësh paratë në dorë.</p>
      ${groups.map(g => `
        <div class="card"><div class="card__head"><h2 class="card__title">${esc(g.name)}</h2><b class="num">${eur(g.sum)}</b></div>
        <div class="card__body">${g.items.map(({ p, rec, days }) => {
          const o = rec.o, name = rec.kind === 'order' ? OT.customer(o.customerId).name : o.name;
          const ctx = `data-kind="${rec.kind}" data-id="${o.id}" data-pid="${p.id}"`;
          return `<div class="pay"><div class="pay__top"><div class="grow"><a href="#/${rec.kind}/${o.id}" style="color:inherit"><b>${esc(name)}</b></a><div class="small muted">${rec.kind === 'order' ? o.number : 'Borxh i bartur'} · raportuar ${fmtDay(p.date).toLowerCase()} ${p.time}</div></div><div style="text-align:right"><div class="pay__amount">${eur(p.amount)}</div>${badge(days >= 7 ? 'danger' : 'warning', 'clock', days === 0 ? 'sot' : `${days} ditë`)}</div></div>
            <div class="btn-row"><button class="btn btn--success btn--sm" data-act="sheet" data-sheet="confirmCash" ${ctx}>${ic('check')} Konfirmo: i mora paratë nga ${esc(g.name)}</button><button class="btn btn--ghost-danger btn--sm btn--fit" data-act="sheet" data-sheet="rejectCash" ${ctx}>Refuzo</button></div></div>`;
        }).join('')}</div></div>`).join('') || `<div class="card"><div class="empty">${ic('check')}<b>Të gjitha paratë janë dorëzuar.</b></div></div>`}
    `;
    return { html, nav: 'dashboard' };
  };

  /* 3 + 4. Order detail (incl. the €800 case). Always visible: one alert, the stage
   * and the money. Everything else is a quiet row that opens in place. */
  SCREENS.order = ([id]) => {
    if (id === 'new') return newOrderForm();
    const o = OT.order(id);
    if (!o) return { html: pageHead('Porosia nuk u gjet', '#/orders'), nav: 'orders' };
    const c = OT.customer(o.customerId), t = OT.orderTotals(o), st = OT.payStatus(o, t);
    const flow = OT.flow(o, B), ci = flow.indexOf(o.stage), next = flow[ci + 1];
    const late = o.dueDate ? OT.diffDays(OT.today(), o.dueDate) : null;
    const reported = o.payments.filter(p => p.status === 'reported');
    const pauseOn = o.pause && o.pause.until >= OT.today();
    const ready = OT.suggestions().ready.find(s => s.rec.kind === 'order' && s.rec.o.id === o.id);
    const lead = S.users.find(u => u.teamId === o.teamId);
    const fold = (key, icon, title, sum, body) => `<details class="fold" data-fold="${key}-${o.id}">${foldSummary(icon, title, sum)}<div class="fold__body">${body}</div></details>`;

    /* One alert at a time, most urgent first. The reported-cash wording is the spec's. */
    let alert = '', alertKind = '';
    if (reported.length) {
      alertKind = 'cash';
      alert = `<section class="alert alert--warning">
        <div class="alert__title">${ic('cash')}<span>${eur(t.reported)} raportuar si të mbledhura · në pritje të konfirmimit</span></div>
        <div class="alert__line">Për t’u mbledhur shtesë: <b class="num">${eur(Math.max(0, t.remaining))}</b></div>
        ${reported.map(p => {
          const who = userName(p.receivedBy), ctx = `data-kind="order" data-id="${o.id}" data-pid="${p.id}"`;
          return `<div class="alert__pay"><span class="small">${esc(who)} mori ${eur(p.amount)} kesh nga klienti · ${fmtDay(p.date).toLowerCase()} ${p.time}</span>
            <button class="btn btn--success btn--block" data-act="sheet" data-sheet="confirmCash" ${ctx}>${ic('check')} Konfirmo: i mora paratë nga ${esc(who)}</button>
            <button class="btn btn--ghost-danger btn--sm btn--fit" data-act="sheet" data-sheet="rejectCash" ${ctx}>Refuzo: raporti ishte gabim</button></div>`;
        }).join('')}
      </section>`;
    } else if (o.delay && o.stage !== 'fulfilled') {
      alertKind = 'delay';
      alert = `<section class="alert alert--danger"><div class="alert__title">${ic('clock')}<span>Vonesë: ${esc(o.delay.reason)}</span></div>
        <div class="alert__line">Data e re e pritshme: <b>${fmtDate(o.delay.newDate)}</b>. Faqja e klientit u përditësua.</div></section>`;
    } else if (o.remainingWork) {
      alertKind = 'remaining';
      alert = `<section class="alert alert--info"><div class="alert__title">${ic('tool')}<span>Ka punë të mbetura</span></div>
        <div class="alert__line">${esc(o.remainingWork.note)}</div>
        ${o.remainingWork.visitDate ? `<div class="alert__line small">Vizitë plotësuese: ${fmtDay(o.remainingWork.visitDate)} · ${esc(o.remainingWork.window || '')} · ${esc(teamName(o.remainingWork.teamId))}</div>` : ''}
        <div class="alert__line xs">Te klienti hapi i fundit shfaqet “në proces” derisa puna të përfundojë.</div>
        <button class="btn btn--secondary btn--sm btn--fit" data-act="clearRemaining" data-id="${o.id}">${ic('check')} Puna u përfundua</button></section>`;
    }

    const to = ready && OT.recipientOf(ready.type, ready.rec);
    const strip = ready ? `<a class="strip" href="#/msg/${encodeURIComponent(ready.id)}"><span class="strip__icon strip__icon--${chOf(to.channel)}">${chIcon(chOf(to.channel))}</span><span class="grow"><b>Mesazh gati:</b> ${esc(OT.msgLabel(ready.type))} <span class="muted">për ${esc(to.name.split(' ')[0])}</span></span><span class="strip__cta">Shiko ${ic('right')}</span></a>` : '';

    /* Stage */
    const win = (d, w) => `${fmtDay(d)}${w ? ' · ' + w : ''}`;
    let info = '';
    if (o.stage === 'measurement') info = o.measuredAt ? `Matja u krye ${fmtDate(o.measuredAt)}` : o.measurementDate ? `Matja: ${win(o.measurementDate, o.measurementWindow)}` : '';
    else if (o.stage === 'scheduled') info = win(o.scheduledDate, o.arrivalWindow);
    else if (o.stage === 'fulfilled') info = `${stageLabel('fulfilled', o)} ${fmtDate(o.fulfilledAt)}`;
    else if (o.delay) info = `Data e re e pritshme: ${fmtDate(o.delay.newDate)}`;
    else if (o.promisedDate) info = `Data e premtuar: ${fmtDate(o.promisedDate)}`;
    if (lead && o.stage !== 'new' && o.stage !== 'ready') info += `${info ? ' · ' : ''}${esc(lead.name)}`;
    const dots = flow.map((k, i) => {
      let cls = (o.skipped || []).includes(k) ? 'skipped' : i < ci ? 'done' : i === ci ? 'current' : 'future';
      if (k === 'fulfilled' && o.stage === 'fulfilled') cls = 'done';
      return `<span class="dots__d dots__d--${cls}"></span>`;
    }).join('');
    const stepper = `<div class="stepper">${flow.map((k, i) => {
      const skipped = (o.skipped || []).includes(k);
      let cls = skipped ? 'skipped' : i < ci ? 'done' : i === ci ? 'current' : 'future';
      if (k === 'fulfilled' && o.stage === 'fulfilled') cls = 'done';
      const meta = skipped ? 'u kalua' : o.stageDates[k] && i <= ci ? fmtDate(o.stageDates[k]) : (k === 'measurement' && o.measurementDate ? 'planifikuar ' + fmtDay(o.measurementDate).toLowerCase() : '');
      return `<button class="step step--${cls}" ${i === ci ? 'aria-current="step"' : `data-act="sheet" data-sheet="stage" data-id="${o.id}" data-k="${k}"`}><span class="step__dot">${cls === 'done' ? ic('check') : cls === 'skipped' ? '' : i + 1}</span><span class="step__label">${esc(stageLabel(k, o))}</span><span class="step__meta">${meta}</span></button>`;
    }).join('')}</div>`;
    const status = `<section class="card"><div class="card__body">
      <div class="row"><div class="grow"><div class="eyebrow">Faza</div><div class="status__stage">${esc(stageLabel(o.stage, o))}</div></div>
        <button class="chip-btn" data-act="sheet" data-sheet="method" data-id="${o.id}" aria-label="Ndrysho mënyrën e përfundimit">${ic(o.fulfilment === 'pickup' ? 'package' : 'truck')} ${esc(OT.METHODS[o.fulfilment])}</button></div>
      <div class="dots" aria-hidden="true">${dots}</div>
      ${info ? `<div class="small muted">${info}</div>` : ''}
      ${o.remainingWork && alertKind !== 'remaining' ? `<div class="note-line">${ic('tool')}<span>Ka punë të mbetura: ${esc(o.remainingWork.note)}</span></div>` : ''}
      ${next ? `<button class="btn btn--primary btn--block" data-act="sheet" data-sheet="stage" data-id="${o.id}" data-k="${next}">Hapi tjetër: ${esc(stageLabel(next, o))} ${ic('right')}</button>` : ''}
      <details class="fold fold--inline" data-fold="stages-${o.id}">${foldSummary('', 'Të gjitha fazat', '')}<div class="fold__body">${stepper}<div class="xs subtle">Prekni një fazë për të kaluar hapa që nuk vlejnë, ose për t’u kthyer mbrapa me arsye.</div></div></details>
    </div></section>`;

    /* Money: one number first; the arithmetic lives in the fold. */
    const dueBits = [o.dueDate ? `Afati ${fmtDate(o.dueDate)}` : 'Pa afat pagese ende'];
    if (late > 0 && t.remaining > 0) dueBits.push(`<span class="danger">${lateSpan(late)} vonesë</span>`);
    dueBits.push(`paguhet ${o.collectAt === 'installers' ? 'te montuesit' : 'në zyrë'}`);
    const lrow = (l, v, cls = '') => `<div class="ledger__row ${cls}"><span>${l}</span><span class="num">${v}</span></div>`;
    const ledger = `<div class="ledger">
      ${lrow('Çmimi', eur(o.price))}
      ${o.discount ? lrow('Zbritja', '−' + eur(o.discount)) : ''}
      ${o.adjustments.map(a => lrow(`${esc(a.reason)}<small>${fmtDate(a.date)} · ${esc(userName(a.by))}</small>`, (a.amount > 0 ? '+' : '') + eur(a.amount))).join('')}
      ${lrow('Totali i marrë vesh', eur(t.total), 'ledger__row--sum')}
      ${lrow('Klienti ka paguar', eur(t.paid))}
      ${t.reported ? lrow('konfirmuar, në zyrë', eur(t.confirmed), 'ledger__row--sub') + lrow('raportuar nga montuesi', eur(t.reported), 'ledger__row--sub') : ''}
      ${lrow('Mbetur', eur(Math.max(0, t.remaining)), 'ledger__row--sum')}
    </div>`;
    const money = `<section class="card"><div class="card__body">
      <div class="row"><span class="eyebrow grow">Pagesa</span>${payBadge(st)}</div>
      <div class="money"><span class="money__label">Mbetur për t’u paguar</span>
        <span class="money__value num${t.remaining <= 0 ? ' money__value--ok' : ''}">${t.remaining <= 0 ? ic('check') : ''}${eur(Math.max(0, t.remaining))}</span>
        <span class="money__of">nga ${eur(t.total)}</span></div>
      ${progress(t)}
      <div class="small muted">${dueBits.join(' · ')}</div>
      ${t.reported > 0 ? `<div class="small muted">Paratë në zyrë: <b class="num">${eur(t.inOffice)}</b> · ${eur(t.reported)} ende te montuesi</div>` : ''}
      ${pauseOn ? `<div class="note-line">${ic('pause')}<span class="grow">Kujtesat në pauzë deri më ${fmtDate(o.pause.until)}: ${esc(o.pause.reason)}</span><button class="btn btn--ghost btn--sm" data-act="unpause" data-kind="order" data-id="${o.id}">Hiq</button></div>` : ''}
      ${c.noReminders ? `<div class="note-line">${ic('bellOff')}<span>Mos sugjero kujtesa për borxh${c.note ? ' · ' + esc(c.note) : ''}</span></div>` : ''}
      ${t.remaining > 0 ? `<button class="btn btn--secondary btn--block" data-act="sheet" data-sheet="payment" data-kind="order" data-id="${o.id}">${ic('plus')} Regjistro pagesë</button>` : ''}
      <details class="fold fold--inline" data-fold="pay-${o.id}">${foldSummary('', 'Pagesat dhe llogaria', `${o.payments.length} pagesa`)}<div class="fold__body">${ledger}
        ${o.payments.length ? `<div>${o.payments.map(p => paymentRow(p, { kind: 'order', id: o.id })).join('')}</div>` : '<div class="small muted">Asnjë pagesë ende.</div>'}</div></details>
    </div></section>`;

    /* Quiet rows */
    const l = OT.locOf(o);
    const contact = (label, x) => x ? `<div class="contact"><div class="grow"><div class="xs subtle">${label}</div><b>${esc(x.name)}</b>${x.relation ? ` <span class="small muted">· ${esc(x.relation)}</span>` : ''}<div class="small muted">${OT.fmtPhone(x.phone)}${x.country ? ' · ' + esc(x.country) : ''}</div></div><a class="icon-btn icon-btn--call" href="tel:${esc(x.phone)}" aria-label="Thirr ${esc(x.name)}">${ic('phone')}</a></div>` : '';
    const contactSum = [c.name, o.onSite && o.onSite.name !== c.name ? `në vend ${o.onSite.name.split(' ')[0]}` : '', o.payer ? `paguan ${o.payer.name.split(' ')[0]}${o.payer.country ? ` (${o.payer.country})` : ''}` : ''].filter(Boolean).join(' · ');
    const shared = o.photos.filter(p => p.share).length;
    const photoBody = `<div class="photos">
      ${o.photos.map(ph => `<div class="photo"><img src="${ph.src}" alt="${esc(ph.label)}"><span class="photo__label">${esc(ph.label)}</span><button class="photo__share" aria-pressed="${!!ph.share}" aria-label="Shfaq në faqen e klientit" data-act="toggleShare" data-id="${o.id}" data-ph="${ph.id}">${ic(ph.share ? 'eye' : 'eyeOff')}</button></div>`).join('')}
      <label class="photo photo--add">${ic('camera')}<span>Shto foto</span><input type="file" accept="image/*" capture="environment" data-photo="order" data-id="${o.id}" data-kind="other"></label>
    </div><div class="xs subtle">${ic('eye').replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px"')} = shfaqet në faqen e klientit</div>`;
    const linkBody = o.token ? `<div class="mono-box">${ic('link')}<span class="ellipsis grow">${esc(OT.trackingUrl(o.token))}</span></div>
        <div class="btn-row"><a class="btn btn--soft btn--sm" href="#/t/${o.token}">${ic('eye')} Parapamje</a>
        ${isOwner() ? `<button class="btn btn--secondary btn--sm" data-act="sheet" data-sheet="revoke" data-id="${o.id}" data-mode="regenerate">${ic('refresh')} Link i ri</button><button class="btn btn--ghost-danger btn--sm" data-act="sheet" data-sheet="revoke" data-id="${o.id}" data-mode="revoke">Çaktivizo</button>` : ''}</div>
        ${!isOwner() ? '<div class="xs subtle">Vetëm pronari mund ta çaktivizojë ose ta zëvendësojë linkun.</div>' : ''}`
      : `<div class="small muted">Linku është çaktivizuar. Klienti sheh “Ky link nuk është më aktiv”.</div>${isOwner() ? `<button class="btn btn--secondary btn--sm btn--fit" data-act="newLink" data-id="${o.id}">${ic('refresh')} Krijo link të ri</button>` : ''}`;
    const rows = `<section class="card folds">
      ${fold('loc', 'map', 'Vendi i punës', esc(l.directions || OT.locLine(l)), locBody(o))}
      ${fold('contacts', 'user', 'Kontaktet', esc(contactSum), contact('Klienti', OT.contactFromCustomer(c)) + (o.onSite ? contact('Në vend (merr punën)', o.onSite) : '') + (o.payer ? contact('Paguesi', o.payer) : ''))}
      ${fold('photos', 'camera', 'Fotot', o.photos.length ? `${o.photos.length} foto${shared ? ` · ${shared} te klienti` : ''}` : 'Asnjë foto ende', photoBody)}
      ${fold('link', 'link', 'Linku i ndjekjes', o.token ? 'Aktiv' : 'Çaktivizuar', linkBody)}
      ${o.notes ? fold('notes', 'book', 'Shënime të brendshme', esc(o.notes), `<div class="small">${esc(o.notes)}</div>`) : ''}
    </section>`;

    /* Rare actions and the audit log */
    const act = (attrs, icon, label, sub) => `<button class="action" ${attrs}>${ic(icon)}<span class="grow"><span class="action__label">${label}</span>${sub ? `<span class="action__sub">${sub}</span>` : ''}</span>${ic('right', 'chev')}</button>`;
    const more = `<section class="card folds">
      ${fold('more', 'settings', 'Më shumë veprime', '', `<div class="actions">
        ${act(`data-act="sheet" data-sheet="adjust" data-id="${o.id}"`, 'plus', 'Shtesë / zbritje', 'Ndryshon totalin, me arsye')}
        ${o.stage !== 'fulfilled' ? act(`data-act="sheet" data-sheet="delay" data-id="${o.id}"`, 'clock', 'Vonesë', 'Përditëson faqen e klientit dhe përgatit një mesazh') : ''}
        ${t.remaining > 0 && !pauseOn ? act(`data-act="sheet" data-sheet="pause" data-kind="order" data-id="${o.id}"`, 'pause', 'Pauzo kujtesat deri më…', 'p.sh. klienti premtoi një datë') : ''}
        ${o.stage === 'fulfilled' && !o.remainingWork ? act(`data-act="sheet" data-sheet="remainingWork" data-id="${o.id}"`, 'tool', 'Ka punë të mbetura', '') : ''}
        ${act(`data-act="toggleCollect" data-id="${o.id}"`, 'refresh', 'Ku paguhet pjesa e mbetur', o.collectAt === 'installers' ? 'Te montuesit · prekni për “Në zyrë”' : 'Në zyrë · prekni për “Te montuesit”')}
      </div>`)}
      ${fold('hist', 'clock', 'Historiku i veprimeve', `${o.events.length} hyrje · vetëm shtohet, nuk fshihet`, timelineHtml(o.events))}
    </section>`;

    const html = `${pageHead(esc(c.name), 'back:#/orders', `${o.number} · ${esc(o.productType)} · ${esc(c.city)}`)}
      <div class="narrow">${alert}${strip}${status}${money}${rows}${more}</div>`;
    return { html, nav: 'orders', frame: 'phone' };
  };

  function locBody(o) {
    const l = OT.locOf(o);
    return `${l.note ? `<div class="note-line">${ic('help')}<span>${esc(l.note)}</span></div>` : ''}${dirBlock(l)}
      <div class="small muted">${esc(OT.locLine(l))}</div>
      ${l.pin ? `<a class="btn btn--secondary btn--sm btn--fit" href="${esc(l.pin)}" target="_blank" rel="noopener">${ic('map')} Hap në Maps</a>` : `<div class="xs subtle">Pa pin në hartë: ekipi e ruan me “Ruaj vendndodhjen këtu” në vizitën e parë.</div>`}`;
  }

  function paymentRow(p, ref) {
    const m = { cash: 'Kesh', bank: 'Bankë', card: 'Kartelë' }[p.method];
    const ctx = `data-kind="${ref.kind}" data-id="${ref.id}" data-pid="${p.id}"`;
    const who = userName(p.receivedBy);
    let status = '', actions = '', cls = '';
    if (p.status === 'confirmed') {
      status = p.reversedBy ? badge('neutral', '', 'Stornuar') : badge('success', 'check', p.confirmedBy ? `Konfirmuar nga ${userName(p.confirmedBy)}` : 'Konfirmuar');
      cls = p.reversedBy ? 'pay--reversed' : '';
      if (isOwner() && !p.reversedBy) actions = `<button class="btn btn--ghost btn--sm" data-act="sheet" data-sheet="reverse" ${ctx}>Storno</button>`;
    } else if (p.status === 'reported') {
      status = badge('warning', 'clock', 'Raportuar · pa konfirmuar');
      // Order pages confirm from the alert at the top; opening balances confirm here.
      if (ref.kind === 'opening') actions = `<div class="btn-row" style="width:100%"><button class="btn btn--success btn--sm" data-act="sheet" data-sheet="confirmCash" ${ctx}>${ic('check')} Konfirmo: i mora paratë nga ${esc(who)}</button><button class="btn btn--ghost-danger btn--sm btn--fit" data-act="sheet" data-sheet="rejectCash" ${ctx}>Refuzo</button></div>`;
    } else if (p.status === 'rejected') {
      status = badge('danger', 'x', 'Refuzuar'); cls = 'pay--rejected';
    } else if (p.status === 'reversal') {
      status = badge('danger', '', 'Storno'); cls = 'pay--reversal';
    }
    const note = p.status === 'rejected' ? `Arsyeja: ${esc(p.rejectedReason)}` : p.status === 'reversal' ? `Arsyeja: ${esc(p.reason)}` : p.note ? esc(p.note) : '';
    return `<div class="pay ${cls}"><div class="pay__top"><div class="grow"><div class="pay__amount">${eur(p.amount)}</div><div class="small muted">${m} · ${fmtDate(p.date)} ${p.time || ''} · ${p.status === 'reported' ? 'mori' : 'mori'} ${esc(who)}</div>${note ? `<div class="xs subtle">${note}</div>` : ''}</div>${status}</div>${actions ? `<div class="row row--wrap">${actions}</div>` : ''}</div>`;
  }

  /* Audit log: append-only, newest first */
  function timelineHtml(events) {
    const evs = [...events].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const kindCls = { money: 'money', warn: 'warn', danger: 'danger', stage: 'stage', msg: 'msg' };
    return `<div class="timeline">${evs.map(e => `<div class="tl tl--${kindCls[e.kind] || ''}"><span class="tl__dot"></span><div><div class="tl__text">${esc(e.text)}</div><div class="tl__meta">${esc(userName(e.by))} · ${fmtDate(e.date)} ${e.time}</div></div></div>`).join('')}</div>`;
  }

  /* 5. Opening balance: form + detail */
  SCREENS.opening = ([id]) => {
    if (id === 'new') return openingForm();
    const ob = OT.opening(id);
    if (!ob) return { html: pageHead('Nuk u gjet', '#/debts'), nav: 'debts' };
    const t = OT.openingTotals(ob);
    const late = ob.dueDate ? OT.diffDays(OT.today(), ob.dueDate) : null;
    const rem = OT.reminderCheck({ remaining: t.remaining, dueDate: ob.dueDate, reported: t.reported, pause: ob.pause, noReminders: ob.noReminders });
    const wd = ob.workDone || { mode: 'unknown' };
    const html = `${pageHead(esc(ob.name), 'back:#/debts', ob.forWhat ? `Borxh i bartur · ${esc(ob.forWhat)}` : 'Borxh i bartur')}
      <div class="narrow">
      <section class="card"><div class="card__body">
        <div class="row"><span class="eyebrow grow">Borxh i bartur</span>${!ob.dueDate ? badge('neutral', 'help', 'Afat i panjohur') : late > 0 && t.remaining > 0 ? badge('danger', '', `Vonesë ${lateSpan(late)}`) : ''}</div>
        <div class="money"><span class="money__label">Mbetur për t’u paguar</span>
          <span class="money__value num${t.remaining <= 0 ? ' money__value--ok' : ''}">${t.remaining <= 0 ? ic('check') : ''}${eur(Math.max(0, t.remaining))}</span>
          <span class="money__of">${t.paid > 0 ? `nga ${eur(t.total)}` : ''}</span></div>
        <dl class="kv">
          <dt>Kur u bë puna</dt><dd>${wd.mode === 'date' ? fmtDate(wd.value) : wd.mode === 'month' ? OT.fmtMonth(wd.value) : 'Nuk e di'}</dd>
          <dt>Kur duhej paguar</dt><dd>${ob.dueDate ? (ob.dueApprox ? '≈ ' + OT.fmtMonth(ob.dueDate.slice(0, 7)) : fmtDate(ob.dueDate)) : 'Nuk e di'}</dd>
          <dt>Telefoni</dt><dd>${ob.phone ? OT.fmtPhone(ob.phone) : '—'}</dd>
          <dt>Kujtesat</dt><dd>${rem.ok ? 'sugjerohen' : esc(rem.reason)}</dd>
        </dl>
        ${ob.note ? `<div class="note-line">${ic('book')}<span>${esc(ob.note)}</span></div>` : ''}
        ${ob.phone ? `<div class="row"><span class="grow small muted">Kontakto ${esc(ob.name.split(' ')[0])}</span>${reminderBtn(rem, ob.channel, `#/compose/opening/${ob.id}?ch=${chOf(ob.channel)}`)}<a class="icon-btn icon-btn--call" href="tel:${esc(ob.phone)}" aria-label="Thirr">${ic('phone')}</a></div>` : ''}
        <div class="btn-row">
          ${t.remaining > 0 ? `<button class="btn btn--secondary" data-act="sheet" data-sheet="payment" data-kind="opening" data-id="${ob.id}">${ic('plus')} Regjistro pagesë</button>` : ''}
          ${!ob.dueDate ? `<button class="btn btn--secondary" data-act="sheet" data-sheet="setDue" data-id="${ob.id}">${ic('calendar')} Vendos afatin</button>` : ''}
        </div>
        ${ob.payments.length ? `<div>${ob.payments.map(p => paymentRow(p, { kind: 'opening', id: ob.id })).join('')}</div>` : ''}
        <p class="xs subtle" style="margin:0">Borxh nga para aplikacionit. Nuk është porosi: s’ka faza, montim apo link ndjekjeje.</p>
      </div></section>
      <section class="card folds"><details class="fold" data-fold="hist-${ob.id}">${foldSummary('clock', 'Historiku i veprimeve', `${ob.events.length} hyrje · vetëm shtohet, nuk fshihet`)}<div class="fold__body">${timelineHtml(ob.events)}</div></details></section>
      </div>`;
    return { html, nav: 'debts' };
  };

  const PHONE_CODES = ['+383', '+49', '+41', '+43', '+33', '+46', '+1'];
  function openingForm() {
    const html = `${pageHead('Borxh i bartur', 'back:#/debts', 'Nga fletorja · shkruani vetëm atë që dini')}
      <form class="card narrow" data-form="opening" novalidate><div class="card__body form">
        <div class="field" data-f="name"><label class="label" for="ob-name">Emri i klientit <span class="req">*</span></label><input class="input" id="ob-name" name="name" autocomplete="off" placeholder="p.sh. Blerim Hasani"></div>
        <div class="field" data-f="phone"><label class="label" for="ob-phone">Telefoni <span class="opt">(opsional)</span></label>
          <div class="input-group"><select class="select" name="cc" aria-label="Prefiksi">${PHONE_CODES.map(c => `<option>${c}</option>`).join('')}</select><input class="input" id="ob-phone" name="phone" inputmode="tel" placeholder="44 123 456"></div></div>
        <div class="field" data-f="amount"><label class="label" for="ob-amount">Sa ka borxh? <span class="req">*</span></label><div class="money-wrap"><input class="input input--money" id="ob-amount" name="amount" inputmode="decimal" placeholder="0"></div></div>
        <div class="field"><label class="label" for="ob-for">Për çfarë ishte? <span class="opt">(opsional)</span></label><input class="input" id="ob-for" name="forWhat" placeholder="p.sh. ${esc(B.catalog.main.type)}, 2024"></div>
        <div class="field"><span class="label">Kur u bë puna? <span class="opt">(opsional)</span></span>
          <div class="seg">${[['date', 'Data'], ['month', 'Muaj / vit'], ['unknown', 'Nuk e di']].map(([v, l]) => `<label><input type="radio" name="workMode" value="${v}" ${v === 'unknown' ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
          <input class="input" type="date" name="workDate" data-show-if="workMode=date" max="${OT.today()}">
          <input class="input" type="month" name="workMonth" data-show-if="workMode=month">
        </div>
        <div class="field" data-f="dueMode"><span class="label">Kur duhej paguar? <span class="req">*</span></span>
          <div class="seg">${[['date', 'Në një datë'], ['month', 'Afërsisht'], ['unknown', 'Nuk e di']].map(([v, l]) => `<label><input type="radio" name="dueMode" value="${v}"><span>${l}</span></label>`).join('')}</div>
          <div class="help" data-show-if="dueMode=">Zgjidhni një. Nga kjo varet nëse borxhi llogaritet me vonesë.</div>
          <div class="field" data-f="dueDate" data-show-if="dueMode=date"><input class="input" type="date" name="dueDate" aria-label="Data e pagesës"><div class="help">Ditët e vonesës llogariten nga kjo datë.</div></div>
          <div class="field" data-f="dueMonth" data-show-if="dueMode=month"><input class="input" type="month" name="dueMonth" aria-label="Muaji i pagesës"><div class="help">Përdoret fundi i muajit. Shfaqet si “≈ muaji vit”.</div></div>
          <div class="callout callout--neutral" data-show-if="dueMode=unknown">${ic('help')}<span>Do të shfaqet si <b>“Afat i panjohur”</b>: llogaritet në totalin e borxhit, por jo te vonesat, dhe nuk sugjerohen kujtesa. Datën mund ta vendosni më vonë.</span></div>
        </div>
        <div class="field"><label class="label" for="ob-note">Shënim <span class="opt">(opsional)</span></label><textarea class="textarea" id="ob-note" name="note" placeholder="p.sh. Tha që paguan pas verës"></textarea></div>
        <div class="btn-row"><button class="btn btn--primary" type="submit" name="then" value="list">Ruaj borxhin</button><button class="btn btn--secondary" type="submit" name="then" value="again">Ruaj dhe shto tjetër</button></div>
      </div></form>`;
    return { html, nav: 'debts', after: () => { const f = document.querySelector('[data-form="opening"]'); updateConditionals(f); } };
  }

  /* + Porosi e re: the basics on one screen, the rest folded. Lands on the new
   * order with the deposit message ready to send. */
  const CITIES = ['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Ferizaj', 'Gjilan', 'Mitrovicë', 'Podujevë', 'Vushtrri', 'Suharekë'];
  const COUNTRY = { '+49': 'Gjermani', '+41': 'Zvicër', '+43': 'Austri', '+33': 'Francë', '+46': 'Suedi', '+1': 'SHBA' };
  const phoneField = (name, label, req) => `<div class="field" data-f="${name}"><label class="label" for="f-${name}">${label} ${req ? '<span class="req">*</span>' : '<span class="opt">(opsional)</span>'}</label>
    <div class="input-group"><select class="select" name="${name}Cc" aria-label="Prefiksi">${PHONE_CODES.map(c => `<option>${c}</option>`).join('')}</select><input class="input" id="f-${name}" name="${name}" inputmode="tel" placeholder="44 123 456" autocomplete="off"></div></div>`;
  function newOrderForm() {
    const cat = B.catalog, types = [cat.main.type, cat.second.type, cat.small.type];
    const dw = OT.depositWord();
    const html = `${pageHead('Porosi e re', 'back:#/orders', 'Vetëm bazat. Të tjerat i shtoni kur t’i dini.')}
      <form class="card narrow" data-form="order" novalidate><div class="card__body form">
        <div class="field" data-f="name"><label class="label" for="no-name">Klienti <span class="req">*</span></label><input class="input" id="no-name" name="name" autocomplete="off" placeholder="p.sh. Arta Krasniqi"></div>
        ${phoneField('phone', 'Telefoni', true)}
        <div class="field"><span class="label">Mesazhet i merr në</span>${radios('channel', [['whatsapp', 'WhatsApp'], ['viber', 'Viber']], 'whatsapp')}</div>
        <div class="field" data-f="type"><span class="label">Produkti <span class="req">*</span></span>${radios('type', types.map(x => [x, x]), types[0])}
          <input class="input" name="desc" placeholder="Përshkrim i shkurtër (opsional)" autocomplete="off"></div>
        ${money('price', 'Çmimi i marrë vesh <span class="req">*</span>')}
        ${money('deposit', `${dw} <span class="opt">(opsional)</span>`)}
        <div class="field"><span class="label">${dw} u pagua me</span>${radios('method', [['cash', 'Kesh'], ['bank', 'Bankë'], ['card', 'Kartelë']], 'cash')}</div>
        <div class="field"><label class="label" for="no-city">Qyteti</label><select class="select" id="no-city" name="city">${CITIES.map(x => `<option ${x === B.contact.city ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <details class="fold fold--inline" data-fold="new-order-more">${foldSummary('', 'Më shumë detaje', 'vendi, mënyra, data, paguesi')}<div class="fold__body form">
          <div class="field"><label class="label" for="no-village">Fshati / Lagjja</label><input class="input" id="no-village" name="village" autocomplete="off"></div>
          <div class="field"><label class="label" for="no-dir">Shpjegimi i rrugës / Pikë referimi</label><textarea class="textarea" id="no-dir" name="directions" placeholder="p.sh. Te xhamia e vjetër, kthesa e dytë djathtas, shtëpia me fasadë të bardhë"></textarea></div>
          <div class="field"><span class="label">Mënyra e përfundimit</span>${radios('fulfilment', Object.entries(OT.METHODS), 'installation')}</div>
          <div class="field"><label class="label" for="no-promised">Data e premtuar</label><input class="input" type="date" id="no-promised" name="promised" min="${OT.today()}"></div>
          <div class="field"><label class="label" for="no-payer">Paguan dikush tjetër? <span class="opt">(p.sh. djali nga Gjermania)</span></label><input class="input" id="no-payer" name="payerName" placeholder="Emri" autocomplete="off"></div>
          ${phoneField('payerPhone', 'Telefoni i paguesit', false)}
          <div class="field"><label class="label" for="no-note">Shënim i brendshëm</label><textarea class="textarea" id="no-note" name="note"></textarea></div>
        </div></details>
        <button class="btn btn--primary btn--lg btn--block" type="submit">Ruaj porosinë</button>
      </div></form>`;
    return { html, nav: 'orders', frame: 'phone' };
  }
  const digitsOf = v => (v || '').replace(/\D/g, '').replace(/^0+/, '');
  function submitOrder(form) {
    const fd = new FormData(form), err = {}, dw = OT.depositWord();
    const name = (fd.get('name') || '').trim(), phone = digitsOf(fd.get('phone'));
    const price = OT.parseEur(fd.get('price')), depRaw = (fd.get('deposit') || '').trim(), dep = depRaw ? OT.parseEur(depRaw) : 0;
    const payerName = (fd.get('payerName') || '').trim(), payerPhone = digitsOf(fd.get('payerPhone'));
    if (!name) err.name = 'Shkruani emrin e klientit.';
    if (!phone) err.phone = 'Shkruani telefonin: mesazhet shkojnë këtu.';
    else if (phone.length < 6 || phone.length > 12) err.phone = 'Numri i telefonit duket i paplotë.';
    if (!price || price <= 0) err.price = fd.get('price') ? 'Shuma nuk është e saktë. Shembull: 4500 ose 4.500' : 'Shkruani çmimin e marrë vesh.';
    if (depRaw && (dep == null || dep <= 0)) err.deposit = 'Shuma nuk është e saktë. Shembull: 1500 ose 1.500';
    else if (price && dep > price) err.deposit = `${dw} nuk mund të jetë më i madh se çmimi.`;
    if (payerName && !payerPhone) err.payerPhone = 'Shkruani telefonin e paguesit.';
    if (Object.keys(err).length) {
      if (err.payerPhone) { ui.open.add('new-order-more'); form.querySelector('[data-fold="new-order-more"]').open = true; }
      return showErrors(form, err);
    }
    const today = OT.today(), cc = fd.get('phoneCc'), city = fd.get('city');
    const loc = { city, village: (fd.get('village') || '').trim(), street: '', directions: (fd.get('directions') || '').trim(), pin: null };
    const c = { id: 'c' + Date.now(), name, city, phone: cc + phone, channel: fd.get('channel'), loc, noReminders: false, note: '', country: COUNTRY[cc] || null, lang: 'sq' };
    const max = Math.max(0, ...S.orders.map(x => +x.number.split('-')[1] || 0));
    const pcc = fd.get('payerPhoneCc');
    const o = {
      id: 'o' + Date.now(), number: `${today.slice(0, 4)}-${String(max + 1).padStart(3, '0')}`, customerId: c.id,
      productType: fd.get('type'), description: (fd.get('desc') || '').trim() || fd.get('type'), price, discount: 0, adjustments: [],
      fulfilment: fd.get('fulfilment') || 'installation', stage: 'new', skipped: [], createdAt: today, stageDates: { new: today },
      measurementDate: null, measurementWindow: null, measuredAt: null, promisedDate: fd.get('promised') || null, teamId: null,
      scheduledDate: null, arrivalWindow: null, fulfilledAt: null, dueDate: null, collectAt: 'office', payments: [],
      remainingWork: null, pause: null, delay: null, photos: [], token: OT.newToken(), onSite: null,
      payer: payerName ? { name: payerName, phone: pcc + payerPhone, channel: 'whatsapp', country: COUNTRY[pcc] || null, relation: 'paguesi' } : null,
      notes: (fd.get('note') || '').trim(), events: [], measurementNote: ''
    };
    log(o, `Porosia u krijua · ${eur(price)}`, 'stage');
    if (dep) {
      o.payments.push({ id: 'p' + Date.now(), amount: dep, date: today, time: OT.nowTime(), method: fd.get('method'), receivedBy: me().id, status: 'confirmed' });
      log(o, `${dw} ${eur(dep)} (${{ cash: 'kesh', bank: 'bankë', card: 'kartelë' }[fd.get('method')]}), mori ${me().name}`, 'money');
    }
    S.customers.push(c); S.orders.push(o); save();
    ui.open.delete('new-order-more');
    toast(dep ? `Porosia ${o.number} u krijua. Mesazhi për klientin është gati.` : `Porosia ${o.number} u krijua.`);
    go('#/order/' + o.id);
  }

  /* 6. Orders: list + kanban */
  SCREENS.orders = (p, q) => {
    const view = q.get('view') || 'list';
    if (q.get('risk')) ui.filters.risk = true;
    const F = ui.filters;
    const opt = (name, label, opts) => `<select class="select" data-filter="${name}" aria-label="${label}"><option value="">${label}</option>${opts.map(([v, l]) => `<option value="${v}" ${F[name] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const cities = [...new Set(S.customers.map(c => c.city))].sort();
    const html = `${pageHead('Porositë', '', `${S.orders.length} porosi`, `<a class="btn btn--primary btn--sm" href="#/order/new">${ic('plus')} Porosi e re</a>`)}
      <div class="search">${ic('search')}<input class="input" type="search" data-search placeholder="Kërko emër, telefon ose numër porosie" value="${esc(F.s)}" aria-label="Kërko"></div>
      <div class="filters">
        <div class="seg seg--inline"><a href="#/orders?view=list" ${view === 'list' ? 'aria-current="page"' : ''}>Lista</a><a href="#/orders?view=kanban" ${view === 'kanban' ? 'aria-current="page"' : ''}>Tabela</a></div>
        ${opt('stage', 'Faza', OT.STAGE_KEYS.map(k => [k, OT.stageLabel(k, 'installation', B).replace('Montim i planifikuar', 'Montim / dërgesë e planifikuar')]))}
        ${opt('pay', 'Pagesa', Object.keys(OT.PAY_STATUS).map(k => [k, OT.payLabel(k)]))}
        ${opt('team', 'Ekipi', S.teams.map(t => [t.id, t.name]))}
        ${opt('city', 'Qyteti', cities.map(c => [c, c]))}
        ${F.risk ? `<button class="chip" aria-pressed="true" data-act="clearRisk">Në rrezik ${ic('x').replace('<svg', '<svg style="width:14px;height:14px"')}</button>` : ''}
      </div>
      <div id="order-results" data-view="${view}">${orderResults(view)}</div>`;
    return { html, nav: 'orders', frame: 'tablet' };
  };

  function filteredOrders() {
    const F = ui.filters, s = F.s.trim().toLowerCase(), digits = s.replace(/\D/g, '');
    const depositQuery = /^(avans|kapar)/.test(s); // both words work, whatever the setting
    return S.orders.filter(o => {
      const c = OT.customer(o.customerId), t = OT.orderTotals(o);
      if (depositQuery) { if (OT.payStatus(o, t) !== 'deposit') return false; }
      else if (s && !(c.name.toLowerCase().includes(s) || o.number.includes(s) || (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)))) return false;
      if (F.stage && o.stage !== F.stage) return false;
      if (F.pay && OT.payStatus(o, t) !== F.pay) return false;
      if (F.team && o.teamId !== F.team) return false;
      if (F.city && c.city !== F.city) return false;
      if (F.risk && !OT.atRisk(o)) return false;
      return true;
    }).sort((a, b) => b.number.localeCompare(a.number));
  }

  function orderResults(view) {
    const list = filteredOrders();
    if (!list.length) return `<div class="card"><div class="empty">${ic('search')}<b>Asnjë porosi nuk përputhet.</b></div></div>`;
    if (view === 'kanban') return kanban(list);
    const dateOf = o => o.scheduledDate && o.stage === 'scheduled' ? fmtDay(o.scheduledDate) : o.fulfilledAt ? fmtDate(o.fulfilledAt) : o.promisedDate ? fmtDate(o.promisedDate) : '—';
    const rows = list.map(o => {
      const c = OT.customer(o.customerId), t = OT.orderTotals(o), st = OT.payStatus(o, t);
      return { o, c, t, st };
    });
    return `<div class="card only-wide table-wrap"><table class="orders-table"><thead><tr><th>Nr.</th><th>Klienti</th><th>Produkti</th><th>Faza</th><th>Pagesa</th><th>Ekipi</th><th>Data</th><th class="right">Mbetur</th></tr></thead><tbody>
      ${rows.map(({ o, c, t, st }) => `<tr data-act="open" data-href="#/order/${o.id}"><td class="num strong">${o.number}</td><td><b>${esc(c.name)}</b><div class="xs subtle">${esc(c.city)}</div></td><td>${esc(o.productType)}${o.fulfilment !== 'installation' ? `<div class="xs subtle">${OT.METHODS[o.fulfilment]}</div>` : ''}</td><td>${esc(stageLabel(o.stage, o))}${o.skipped.length ? `<div class="xs subtle">kaloi: ${o.skipped.map(k => stageLabel(k, o)).join(', ')}</div>` : ''}${o.delay ? `<div>${badge('danger', 'clock', 'Vonesë')}</div>` : ''}</td><td style="min-width:120px">${payBadge(st)}<div style="margin-top:6px">${progress(t)}</div></td><td class="small">${o.teamId ? esc(teamName(o.teamId).split(' · ')[1]) : '—'}</td><td class="small">${dateOf(o)}</td><td class="right num strong">${t.remaining > 0 ? eur(t.remaining) : '—'}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="card list only-narrow">${rows.map(({ o, c, t, st }) => `<a class="order-card" href="#/order/${o.id}"><div class="row"><span class="num xs subtle strong">${o.number}</span><span class="grow"></span>${payBadge(st)}</div><div class="row"><b class="grow ellipsis">${esc(c.name)}</b>${t.remaining > 0 ? `<b class="num">${eur(t.remaining)}</b>` : ''}</div><div class="small muted">${esc(o.productType)} · ${esc(stageLabel(o.stage, o))}${o.skipped.length ? ' · kaloi ' + o.skipped.length + ' hapa' : ''}</div>${progress(t)}</a>`).join('')}</div>`;
  }

  function kanban(list) {
    const cols = OT.STAGE_KEYS.map(k => ({ k, items: list.filter(o => o.stage === k) }));
    return `<div class="kanban">${cols.map(({ k, items }) => {
      const shown = k === 'fulfilled' ? items.filter(o => OT.diffDays(OT.today(), o.fulfilledAt || OT.today()) <= 30) : items;
      return `<section class="kcol"><div class="kcol__head">${esc(k === 'scheduled' ? 'Montim / dërgesë e planifikuar' : k === 'fulfilled' ? 'Përfunduar' : OT.stageLabel(k, 'installation', B))}<span class="count">${items.length}</span></div>
        ${shown.map(o => {
          const c = OT.customer(o.customerId), t = OT.orderTotals(o), flow = OT.flow(o, B), next = flow[flow.indexOf(o.stage) + 1];
          // One line of context per card, most useful first.
          const note = o.delay ? badge('danger', 'clock', 'Vonesë') : o.remainingWork ? badge('neutral', 'tool', 'Punë të mbetura')
            : o.stage === 'scheduled' ? badge('brand', 'calendar', fmtDay(o.scheduledDate) + ' ' + (o.arrivalWindow || ''))
            : o.skipped.length ? badge('outline', '', 'kaloi: ' + o.skipped.map(x => stageLabel(x, o)).join(', ')) : '';
          return `<article class="kcard"><a href="#/order/${o.id}"><div class="row"><span class="kcard__num">${o.number}</span><span class="grow"></span>${payBadge(OT.payStatus(o, t))}</div>
            <div class="kcard__name">${esc(c.name)}</div><div class="xs muted">${esc(o.productType)} · ${esc(c.city)}${o.fulfilment !== 'installation' ? ' · ' + OT.METHODS[o.fulfilment] : ''}</div></a>
            ${note ? `<div class="badges">${note}</div>` : ''}
            ${next ? `<button class="btn btn--soft btn--sm kcard__next" data-act="sheet" data-sheet="stage" data-id="${o.id}" data-k="${next}"><span class="ellipsis">${esc(stageLabel(next, o))}</span>${ic('right')}</button>` : ''}</article>`;
        }).join('')}
        ${items.length > shown.length ? `<div class="xs subtle" style="padding:4px 8px">+${items.length - shown.length} më të vjetra</div>` : ''}
      </section>`;
    }).join('')}</div>`;
  }

  /* Location: reference-point directions matter more than street names */
  const dirBlock = l => l.directions ? `<div class="job__dir">${ic('nav')}<span>${esc(l.directions)}</span></div>` : '';
  const mapsOrSave = o => OT.locOf(o).pin
    ? `<a class="btn btn--secondary btn--lg" href="${esc(OT.locOf(o).pin)}" target="_blank" rel="noopener">${ic('map')} Hap në Maps</a>`
    : `<button class="btn btn--soft btn--lg" data-act="saveLoc" data-id="${o.id}">${ic('map')} Ruaj vendndodhjen këtu</button>`;
  function saveLocation(o) {
    const l = OT.locOf(o);
    const done = (lat, lng, simulated) => {
      l.pin = `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
      log(o, `Vendndodhja u ruajt në hartë${simulated ? ' (simuluar në prototip)' : ''}`, 'stage');
      save(); render();
      toast(simulated ? 'Prototip: GPS-i kërkon HTTPS, prandaj pin-i u simulua.' : 'Vendndodhja u ruajt. Herën tjetër hapet direkt në Maps.');
    };
    const fake = () => done(42.66 + Math.random() * .05, 21.16 + Math.random() * .05, true);
    if (!navigator.geolocation || !window.isSecureContext) return fake();
    navigator.geolocation.getCurrentPosition(p => done(p.coords.latitude, p.coords.longitude, false), fake, { enableHighAccuracy: true, timeout: 8000 });
  }

  /* 7. Field view */
  SCREENS.field = (p, q) => {
    const week = q.get('w') === 'week', today = OT.today();
    const u = isField() ? me() : null;
    const teamId = u ? u.teamId : (q.get('team') || '');
    const jobs = OT.fieldJobs(teamId || null, today, week ? 6 : 0);
    const hour = new Date().getHours();
    const html = `
      ${u ? `<div class="hello"><span class="muted small">${OT.fmtLong(today)} · ${esc(teamName(u.teamId))}</span><h1>${hour < 11 ? 'Mirëmëngjes' : 'Mirëdita'}, ${esc(u.name)}</h1></div>` : pageHead('Orari', '', 'Matje, montime, dërgesa dhe vizita sipas ekipit')}
      ${!u ? `<div class="filters">${[['', 'Të gjitha ekipet'], ...S.teams.map(t => [t.id, t.name])].map(([v, l]) => `<a class="chip" href="#/field?team=${v}${week ? '&w=week' : ''}"><span style="${teamId === v ? 'background:var(--color-primary);color:var(--color-primary-contrast);border-color:var(--color-primary)' : ''}">${esc(l)}</span></a>`).join('')}</div>` : ''}
      <div class="seg"><a href="#/field?${teamId && !u ? 'team=' + teamId : ''}" ${!week ? 'aria-current="page"' : ''}>Sot</a><a href="#/field?w=week${teamId && !u ? '&team=' + teamId : ''}" ${week ? 'aria-current="page"' : ''}>Këtë javë</a></div>
      ${jobs.length ? jobs.map(jobCard).join('') : `<div class="card"><div class="empty">${ic('check')}<b>${week ? 'Asnjë punë këtë javë.' : 'Sot nuk ka punë.'}</b><span class="small">Shikoni “Këtë javë”.</span></div></div>`}
    `;
    return { html, nav: 'field' };
  };

  function jobCard(j) {
    const o = j.o, c = OT.customer(o.customerId), who = o.onSite || OT.contactFromCustomer(c);
    const coll = j.type !== 'measurement' ? OT.toCollect(o) : 0;
    const t = OT.orderTotals(o);
    return `<div class="card${j.done ? ' job--done' : ''}"><a class="job" href="#/job/${o.id}/${j.type}">
      <div class="row"><span class="job__time">${esc(j.window || '')}</span><span class="grow"></span>${badge(j.done ? 'success' : j.type === 'measurement' ? 'info' : j.type === 'visit' ? 'warning' : 'brand', j.done ? 'check' : '', j.done ? 'Kryer' : OT.JOB_TYPES[j.type])}</div>
      <div><div class="job__name">${esc(who.name)}</div>${dirBlock(OT.locOf(o))}<div class="job__addr">${esc(OT.locLine(OT.locOf(o)))}</div><div class="small muted">${esc(o.productType)} · ${o.number}${j.date !== OT.today() ? ' · ' + fmtDay(j.date) : ''}</div></div>
      ${coll > 0 ? `<div class="collect"><span>Mblidh</span><b>${eur(coll)}</b></div>` : t.reported > 0 && o.collectAt === 'installers' && j.type !== 'measurement' ? `<div class="collect collect--done"><span>${ic('check').replace('<svg', '<svg style="width:18px;height:18px;vertical-align:-3px"')} Raportuar ${eur(t.reported)}</span><b>${eur(0)}</b></div>` : ''}
      </a>
      <div class="job__actions" style="padding:0 var(--space-4) var(--space-4)">
        <a class="btn btn--secondary btn--lg" href="tel:${esc(who.phone)}">${ic('phone')} Thirr</a>
        ${OT.locOf(o).pin ? `<a class="btn btn--secondary btn--lg" href="${esc(OT.locOf(o).pin)}" target="_blank" rel="noopener">${ic('map')} Maps</a>` : ''}
      </div></div>`;
  }

  SCREENS.job = ([id, type]) => {
    const o = OT.order(id);
    if (!o) return { html: pageHead('Nuk u gjet', '#/field'), nav: 'field' };
    const c = OT.customer(o.customerId), who = o.onSite || OT.contactFromCustomer(c), t = OT.orderTotals(o);
    const coll = type !== 'measurement' ? OT.toCollect(o) : 0;
    const done = type === 'measurement' ? !!o.measuredAt : type === 'visit' ? !o.remainingWork : o.stage === 'fulfilled';
    const ful = OT.stageLabel('fulfilled', o.fulfilment);
    const checklist = type === 'measurement' ? ['Fotografo faqen e fletores', 'Shëno prizat dhe ujin', 'Konfirmo ngjyrën me klientin'] : ['Mbro dyshemenë', 'Kontrollo nivelin dhe dyert', 'Fotot pas montimit', 'Pastro pas punës'];
    const html = `${pageHead(esc(who.name), 'back:#/field', `${OT.JOB_TYPES[type]} · ${esc(j_window(o, type))}`)}
      <div class="card"><div class="card__body">
        ${dirBlock(OT.locOf(o))}
        <div class="job__addr" style="font-size:var(--text-md)">${esc(OT.locLine(OT.locOf(o)))}${OT.locOf(o).note ? ` · <b>${esc(OT.locOf(o).note)}</b>` : ''}</div>
        <div class="small muted">${esc(o.productType)} · ${esc(o.description)} · ${o.number}</div>
        ${who.relation ? `<div class="small">Në vend: <b>${esc(who.name)}</b> (${esc(who.relation)})</div>` : ''}
        ${o.notes ? `<div class="callout callout--neutral">${esc(o.notes)}</div>` : ''}
        ${type === 'visit' ? `<div class="callout callout--info">${ic('tool')}<span>${esc(o.remainingWork ? o.remainingWork.note : 'Puna u përfundua.')}</span></div>` : ''}
        <div class="job__actions">
          <a class="btn btn--secondary btn--lg" href="tel:${esc(who.phone)}">${ic('phone')} Thirr</a>
          ${mapsOrSave(o)}
        </div>
        ${OT.locOf(o).pin ? `<button class="btn btn--ghost btn--sm" style="justify-self:start" data-act="saveLoc" data-id="${o.id}">${ic('map')} Përditëso vendndodhjen këtu</button>` : ''}
      </div></div>
      ${coll > 0 ? `<div class="collect"><span>Mblidh nga klienti</span><b>${eur(coll)}</b></div>` : (o.collectAt === 'installers' && type !== 'measurement' && t.reported > 0) ? `<div class="collect collect--done"><span>Raportuar ${eur(t.reported)} · Për t’u mbledhur shtesë</span><b>${eur(0)}</b></div>` : ''}
      <div class="big-actions">
        ${type === 'measurement' ? `<button class="btn btn--primary" data-act="sheet" data-sheet="measured" data-id="${o.id}" ${done ? 'disabled' : ''}>${ic('camera')} ${done ? 'Matja u krye ✓' : 'Matja u krye'}</button>` : ''}
        ${type === 'installation' || type === 'delivery' ? `<button class="btn btn--primary" data-act="sheet" data-sheet="fulfill" data-id="${o.id}" ${done ? 'disabled' : ''}>${ic('check')} ${done ? ful + ' ✓' : ful}</button>` : ''}
        ${type === 'visit' && o.remainingWork ? `<button class="btn btn--success" data-act="clearRemaining" data-id="${o.id}">${ic('check')} Puna u përfundua</button>` : ''}
        ${coll > 0 ? `<button class="btn btn--accent" data-act="sheet" data-sheet="collect" data-id="${o.id}" data-as="${me().role === 'field' ? me().id : (S.users.find(u => u.teamId === o.teamId) || me()).id}">${ic('cash')} Mora ${eur(coll)}</button>` : ''}
        ${type !== 'measurement' && !o.remainingWork ? `<button class="btn btn--secondary" data-act="sheet" data-sheet="remainingWork" data-id="${o.id}" data-field="1">${ic('tool')} Ka punë të mbetura</button>` : ''}
      </div>
      <div class="card"><div class="card__head"><h2 class="card__title">Lista e kontrollit</h2></div><div class="card__body" style="gap:0">${checklist.map((x, i) => `<label class="check"><input type="checkbox" data-act="noop" ${done ? 'checked' : ''}> ${x}</label>`).join('')}</div></div>
      <div class="card"><div class="card__head"><h2 class="card__title">Fotot</h2></div><div class="card__body"><div class="photos">
        ${o.photos.map(ph => `<div class="photo"><img src="${ph.src}" alt=""><span class="photo__label">${esc(ph.label)}</span></div>`).join('')}
        <label class="photo photo--add">${ic('camera')}<span>Bëj foto</span><input type="file" accept="image/*" capture="environment" data-photo="order" data-id="${o.id}" data-kind="${type === 'measurement' ? 'measure' : 'after'}"></label>
      </div></div></div>`;
    return { html, nav: 'field' };
  };
  const j_window = (o, type) => type === 'measurement' ? `${fmtDay(o.measurementDate)} ${o.measurementWindow || ''}` : type === 'visit' && o.remainingWork ? `${fmtDay(o.remainingWork.visitDate)} ${o.remainingWork.window || ''}` : `${fmtDay(o.scheduledDate)} ${o.arrivalWindow || ''}`;

  /* 8. Ready-to-send queue + message preview */
  SCREENS.messages = () => {
    const { ready, suppressed } = OT.suggestions();
    const html = `${pageHead('Gati për dërgim', '', `${ready.length} mesazhe të përgatitura · asgjë nuk dërgohet vetë`)}
      <div class="card list">${ready.map(s => {
        const T = OT.MSG_TYPES[s.type], to = OT.recipientOf(s.type, s.rec);
        return `<a class="msg" href="#/msg/${encodeURIComponent(s.id)}"><span class="msg__icon ${T.tone ? 'msg__icon--' + T.tone : ''}">${ic(T.icon)}</span><span class="grow" style="min-width:0"><span class="row"><b class="grow ellipsis">${esc(to.name)}</b><span class="xs subtle">${esc(OT.msgLabel(s.type))}</span></span><span class="xs muted">${esc(s.why)}</span><span class="msg__preview">${esc(OT.messageText(s.type, s.rec, s.extra).split('\n')[0])}</span></span>${to.channel === 'viber' ? `<span style="color:var(--color-viber);width:20px">${VB}</span>` : `<span style="color:var(--color-whatsapp);width:20px">${WA}</span>`}</a>`;
      }).join('') || `<div class="empty">${ic('check')}<b>Asgjë për t’u dërguar tani.</b><span class="small">Sugjerimet llogariten sa herë hapet faqja.</span></div>`}</div>
      <section class="card folds">
      ${suppressed.length ? `<details class="fold" data-fold="msg-suppressed">${foldSummary('bellOff', 'Kujtesa që nuk sugjerohen', `${suppressed.length} · secila me arsyen`)}
        <div class="fold__body fold__body--flush list">${suppressed.map(x => `<a class="list-row" href="#/${x.rec.kind}/${x.rec.o.id}"><span class="grow"><b>${esc(x.name)}</b> <span class="small muted">${esc(x.label)}</span><br><span class="small muted">${esc(x.reason)}</span></span>${ic('right', 'chev')}</a>`).join('')}</div></details>` : ''}
      <details class="fold" data-fold="msg-sent">${foldSummary('clock', 'Të dërguara së fundi', `${S.messageLog.length} mesazhe`)}
        <div class="fold__body fold__body--flush list">${S.messageLog.slice(0, 12).map(m => `<div class="list-row"><span style="width:22px;color:${m.channel === 'viber' ? 'var(--color-viber)' : m.channel === 'sms' ? 'var(--color-sms)' : 'var(--color-whatsapp)'}">${m.channel === 'viber' ? VB : m.channel === 'sms' ? ic('message') : WA}</span><span class="grow"><b>${esc(m.to)}</b> <span class="small muted">· ${esc(OT.msgLabel(m.type))}</span><br><span class="xs subtle">${esc(userName(m.by))} · ${fmtDate(m.date)} ${m.time}</span></span></div>`).join('') || '<div class="empty small">Asnjë mesazh ende.</div>'}</div></details>
      </section>`;
    return { html, nav: 'messages' };
  };

  SCREENS.msg = ([sid]) => {
    const s = OT.suggestions().ready.find(x => x.id === sid);
    if (!s) return { html: `${pageHead('Mesazhi', '#/messages')}<div class="card"><div class="empty">${ic('check')}<b>Ky mesazh u dërgua ose u anashkalua.</b><a class="btn btn--secondary" href="#/messages">Kthehu te lista</a></div></div>`, nav: 'messages' };
    return composeScreen({ type: s.type, rec: s.rec, sid: s.id, why: s.why, extra: s.extra });
  };

  SCREENS.compose = ([kind, id], q) => {
    const o = kind === 'opening' ? OT.opening(id) : OT.order(id);
    if (!o) return { html: pageHead('Nuk u gjet', '#/debts'), nav: 'debts' };
    const rec = { kind, o };
    const t = kind === 'opening' ? OT.openingTotals(o) : OT.orderTotals(o);
    const r = OT.reminderCheck({ remaining: t.remaining, dueDate: o.dueDate, reported: t.reported, pause: o.pause, noReminders: kind === 'order' ? OT.customer(o.customerId).noReminders : o.noReminders });
    const step = r.ok ? r.step : 1;
    const sid = r.ok ? `reminder:${o.id}:${r.step}` : null;
    return composeScreen({ type: 'reminder', rec, sid, why: r.ok ? `${r.late} ditë pas afatit` : '', warn: r.ok ? '' : r.reason, extra: { step }, channel: q.get('ch') });
  };

  function composeScreen({ type, rec, sid, why, warn, extra, channel }) {
    const to = OT.recipientOf(type, rec);
    const ch = ui.channel || channel || to.channel || 'whatsapp';
    const text = OT.messageText(type, rec, extra);
    const chLabel = { whatsapp: 'WhatsApp', viber: 'Viber', sms: 'SMS' };
    ui.compose = { type, kind: rec.kind, id: rec.o.id, sid, to, extra, ch };
    // WhatsApp first, Viber second, SMS a narrow fallback segment (spec: channels).
    const html = `${pageHead(esc(OT.msgLabel(type)), 'back:#/messages', why ? esc(why) : '')}
      <div class="card narrow"><div class="card__body">
        <div class="contact"><div class="grow"><div class="xs subtle">Për</div><b>${esc(to.name)}</b>${to.relation ? ` <span class="small muted">· ${esc(to.relation)}</span>` : ''}<div class="small muted">${OT.fmtPhone(to.phone)}${to.country ? ' · ' + esc(to.country) : ''}</div></div><a class="icon-btn icon-btn--call" href="tel:${esc(to.phone)}" aria-label="Thirr">${ic('phone')}</a></div>
        <div class="seg seg--channels" role="group" aria-label="Kanali">${['whatsapp', 'viber', 'sms'].map(c => `<button type="button" class="seg__${c}" data-act="channel" data-ch="${c}" aria-pressed="${c === ch}">${chIcon(c)}<span>${chLabel[c]}</span></button>`).join('')}</div>
        ${warn ? `<div class="callout callout--warning">${ic('alert')}<span><b>Nuk sugjerohet automatikisht:</b> ${esc(warn)}. Mund ta dërgoni me dorë nëse vendosni ju.</span></div>` : ''}
        <div class="field"><label class="label" for="msg-text">Teksti <span class="opt">(mund ta ndryshoni)</span></label><textarea class="textarea" id="msg-text" rows="9" style="min-height:220px">${esc(text)}</textarea></div>
        ${ch === 'viber' ? `<div class="help">Viber nuk lejon tekst të parapërgatitur: teksti kopjohet dhe hapet biseda, ju vetëm e ngjitni.</div>` : ch === 'sms' ? `<div class="help">SMS vetëm si rrugëdalje: te numrat e huaj kushton.</div>` : ''}
        <button class="btn btn--${ch} btn--lg btn--block" data-act="simSend">${chIcon(ch)} ${ch === 'viber' ? 'Kopjo dhe hap Viber' : 'Dërgo me ' + chLabel[ch]}</button>
        ${sid ? `<button class="btn btn--ghost btn--sm" style="justify-self:center" data-act="dismissMsg" data-sid="${esc(sid)}">Anashkalo këtë sugjerim</button>` : ''}
      </div></div>`;
    return { html, nav: type === 'reminder' && !sid ? 'debts' : 'messages' };
  }

  function linkify(text) {
    return esc(text).replace(/https?:\/\/[^\s]+/g, u => {
      const m = u.match(/\/t\/([0-9a-f]{32})$/);
      return m ? `<a href="#/t/${m[1]}" data-act="closeSim">${u}</a>` : `<a>${u}</a>`;
    });
  }
  function simHtml() {
    const s = ui.sim, cls = s.channel === 'viber' ? ' chat--viber' : s.channel === 'sms' ? ' chat--sms' : '';
    return `<div class="chat${cls}" role="dialog" aria-label="Parapamje e mesazhit">
      <div class="chat__head"><button class="back" style="color:inherit" data-act="simNo" aria-label="Kthehu">${ic('left')}</button><span class="chat__avatar">${B.logo.svg}</span><div class="grow"><div class="chat__name">${esc(B.companyName)}</div><div class="chat__status">${s.channel === 'sms' ? OT.fmtPhone(B.contact.phone) : 'online'}</div></div></div>
      <div class="chat__body">
        <span class="chat__day">Sot</span>
        <span class="chat__note">Simulim: kështu e sheh <b>${esc(s.to.name)}</b> në telefon. Asgjë nuk u dërgua.${s.channel === 'viber' ? '<br>Në aplikacion: teksti kopjohet dhe hapet Viber.' : ''}</span>
        <div class="bubble">${linkify(s.text)}<span class="bubble__time">${OT.nowTime()}</span></div>
      </div>
      <div class="chat__foot"><b style="text-align:center">U dërgua?</b><div class="btn-row"><button class="btn btn--success btn--lg" data-act="simYes">${ic('check')} Po, u dërgua</button><button class="btn btn--secondary btn--lg" data-act="simNo">Jo</button></div></div>
    </div>`;
  }

  /* 9. Customer tracking page: warm, calm, one clear answer to “when?” */
  const warmDate = iso => { const d = OT.parse(iso); return `${OT.WEEKDAYS[d.getDay()]}, ${d.getDate()} ${OT.MONTHS[d.getMonth()]}`; };
  function trackingReassure(o) {
    const m = o.fulfilment;
    if (o.stage === 'fulfilled' && o.remainingWork) return 'Po kujdesemi për detajet e fundit. Do t’ju njoftojmë sapo të jetë gati.';
    return {
      new: 'Faleminderit për besimin! Do t’ju njoftojmë në çdo hap.',
      measurement: o.measuredAt ? 'Faleminderit! Tani fillojmë përgatitjen e porosisë suaj.' : 'Nëse ora nuk ju përshtatet, na shkruani dhe e rregullojmë.',
      production: 'Po e përgatisim porosinë tuaj me kujdes.',
      ready: m === 'pickup' ? `Ju presim në sallonin tonë në ${B.contact.city}.` : `Së shpejti ju kontaktojmë për datën e ${m === 'delivery' ? 'dërgesës' : 'montimit'}.`,
      scheduled: 'Nëse data nuk ju përshtatet, na shkruani dhe e rregullojmë.',
      fulfilled: 'Shpresojmë që t’ju pëlqejë dhe t’ju shërbejë për shumë vite.'
    }[o.stage];
  }

  SCREENS.t = ([token]) => {
    const o = S.orders.find(x => x.token && x.token === token);
    const back = `<button class="proto-fab" data-act="protoBack" data-href="${o ? '#/order/' + o.id : '#/dashboard'}" aria-label="Kthehu te prototipi">${ic('left')}</button>`;
    const hero = `<header class="trk-hero"><div class="trk-logo">${B.logo.svg}</div><div class="trk-company">${esc(B.companyName)}</div><div class="trk-tagline">${esc(B.tagline.sq)}</div></header>`;
    const help = `<section class="trk-card trk-help"><h2 class="trk-h2">Keni pyetje?</h2><p class="trk-muted">Na shkruani ose na telefononi. Ju përgjigjemi me kënaqësi.</p>
      <a class="btn btn--whatsapp btn--lg btn--block" href="https://wa.me/${B.contact.whatsapp.replace('+', '')}" target="_blank" rel="noopener">${WA} Na shkruani në WhatsApp</a>
      <div class="trk-actions"><a class="btn btn--secondary" href="tel:${B.contact.phone}">${ic('phone')} Thirrni</a><a class="btn btn--secondary" href="viber://chat?number=${encodeURIComponent(B.contact.viber)}"><span style="color:var(--color-viber);display:flex">${VB}</span> Viber</a></div>
      <a class="trk-link" href="${B.contact.mapsUrl}" target="_blank" rel="noopener">${ic('nav')} Si të vini në sallon · ${esc(B.contact.address)}</a></section>`;
    if (!o) {
      return { bare: true, frame: 'phone', html: `<div class="trk">${hero}<main class="trk-body">
        <section class="trk-card trk-status"><div class="trk-gone">${ic('link')}</div><h1 class="trk-title">Ky link nuk është më aktiv.</h1><p class="trk-reassure">Na kontaktoni.</p>
        <a class="btn btn--primary btn--lg btn--block" href="tel:${B.contact.phone}">${ic('phone')} ${OT.fmtPhone(B.contact.phone)}</a></section>
        <footer class="trk-foot">${esc(B.companyName)} · ${esc(B.contact.city)}</footer></main>${back}</div>` };
    }
    const c = OT.customer(o.customerId), who = o.onSite || OT.contactFromCustomer(c), t = OT.orderTotals(o);
    const steps = OT.trackingSteps(o, B);
    let when = null;
    if (o.stage === 'scheduled') when = { label: o.fulfilment === 'delivery' ? 'Dërgesa' : 'Montimi', date: warmDate(o.scheduledDate), time: o.arrivalWindow };
    else if (o.stage === 'measurement' && !o.measuredAt && o.measurementDate) when = { label: 'Matja', date: warmDate(o.measurementDate), time: o.measurementWindow };
    else if (o.stage === 'fulfilled' && o.remainingWork && o.remainingWork.visitDate) when = { label: 'Vizita jonë', date: warmDate(o.remainingWork.visitDate), time: o.remainingWork.window };
    else if (o.stage !== 'fulfilled' && (o.delay || o.promisedDate)) when = { label: 'Data e pritshme', date: warmDate(o.delay ? o.delay.newDate : o.promisedDate) };
    const stepSub = s => s.state !== 'current' ? '' :
      s.key === 'scheduled' ? 'Data është caktuar' :
      s.key === 'fulfilled' && o.remainingWork ? 'Po përfundojmë detajet e fundit' :
      s.key === 'ready' && o.fulfilment === 'pickup' ? 'Mund ta tërhiqni në sallon' : 'Tani';
    const photos = o.photos.filter(p => p.share);
    const html = `<div class="trk">${hero}<main class="trk-body">
      <section class="trk-card trk-status">
        <p class="trk-hello">Përshëndetje, ${esc(who.name.split(' ')[0])}!</p>
        <h1 class="trk-title">${esc(OT.trackingHeadline(o))}</h1>
        <p class="trk-reassure">${esc(trackingReassure(o))}</p>
        ${when ? `<div class="trk-when"><span class="trk-when__icon">${ic('calendar')}</span><div><div class="trk-when__label">${esc(when.label)}</div><div class="trk-when__date">${esc(when.date)}</div>${when.time ? `<div class="trk-when__time">ora ${esc(when.time)}</div>` : ''}</div></div>` : ''}
        ${o.delay && o.stage !== 'fulfilled' ? `<p class="trk-delay">${ic('clock')}<span>Kemi një vonesë të vogël: ${esc(o.delay.reason.toLowerCase())}. Ju kërkojmë ndjesë për pritjen.</span></p>` : ''}
      </section>
      <section class="trk-card"><h2 class="trk-h2">Ecuria e porosisë</h2>
        <div class="trk-steps">${steps.map(s => `<div class="trk-step trk-step--${s.state}"><span class="trk-step__dot">${s.state === 'done' ? ic('check') : ''}</span><div><div class="trk-step__label">${esc(s.label)}</div>${stepSub(s) ? `<div class="trk-step__sub">${esc(stepSub(s))}</div>` : ''}</div></div>`).join('')}</div>
        <p class="trk-ref">Porosia ${o.number} · ${esc(o.productType)}</p></section>
      ${photos.length ? `<section class="trk-card"><h2 class="trk-h2">Nga puna juaj</h2><div class="trk-photos">${photos.map(p => `<img src="${p.src}" alt="${esc(p.label)}">`).join('')}</div></section>` : ''}
      ${S.settings.showBalanceOnTracking ? `<section class="trk-card"><div class="row row--between"><span>${t.remaining > 0 ? 'Mbetur për pagesë' : 'Pagesa'}</span><b class="num">${t.remaining > 0 ? eur(t.remaining) : 'E paguar plotësisht ✓'}</b></div></section>` : ''}
      ${help}
      <footer class="trk-foot"><span>${esc(B.companyName)} · ${esc(B.contact.address)}</span><span>Kjo faqe është vetëm për ju.</span></footer>
    </main>${back}</div>`;
    return { bare: true, frame: 'phone', html };
  };

  /* ═══════════════════════ SHEETS ═══════════════════════ */
  const head = (title, sub) => `<h2 class="sheet__title">${title}</h2>${sub ? `<p class="sheet__sub">${sub}</p>` : '<div style="height:12px"></div>'}`;
  const actions = (label, cls = 'primary', extra = '') => `<div class="btn-row" style="margin-top:4px"><button class="btn btn--${cls} btn--lg" type="submit">${label}</button><button class="btn btn--secondary btn--lg" type="button" data-act="closeSheet">Anulo</button>${extra}</div>`;
  const money = (name, label, value) => `<div class="field" data-f="${name}"><label class="label" for="m-${name}">${label}</label><div class="money-wrap"><input class="input input--money" id="m-${name}" name="${name}" inputmode="decimal" value="${value != null ? (value / 100).toFixed(value % 100 ? 2 : 0).replace('.', ',') : ''}" autocomplete="off"></div></div>`;
  const reasonField = (name, label, chips = [], ph = '') => `<div class="field" data-f="${name}"><label class="label">${label} <span class="req">*</span></label>${chips.length ? `<div class="chips">${chips.map(c => `<button type="button" class="chip" data-act="fillReason" data-target="${name}" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}<input class="input" name="${name}" placeholder="${esc(ph)}" autocomplete="off"></div>`;
  const radios = (name, opts, checked) => `<div class="chips">${opts.map(([v, l]) => `<label class="chip"><input type="radio" name="${name}" value="${v}" ${v === checked ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
  const recOf = ctx => ctx.kind === 'opening' ? OT.opening(ctx.id) : OT.order(ctx.id);
  const totalsOf = (ctx, r) => ctx.kind === 'opening' ? OT.openingTotals(r) : OT.orderTotals(r);
  const windows = ['08:00–10:00', '10:00–12:00', '12:00–14:00', '14:00–16:00', '16:00–18:00'];

  const SHEETS = {
    payment: {
      render(ctx) {
        const r = recOf(ctx), t = totalsOf(ctx, r);
        return head('Regjistro pagesë', `Për t’u mbledhur: ${eur(t.remaining)}. Pagesat nga pronari/zyra konfirmohen menjëherë.`) +
          money('amount', 'Shuma <span class="req">*</span>', Math.max(0, t.remaining)) +
          `<div class="field"><span class="label">Mënyra</span>${radios('method', [['cash', 'Kesh'], ['bank', 'Bankë'], ['card', 'Kartelë']], 'cash')}</div>
           <div class="field"><label class="label">E mori</label><select class="select" name="by">${S.users.map(u => `<option value="${u.id}" ${u.id === me().id ? 'selected' : ''}>${esc(u.name)} · ${{ owner: 'Pronari', office: 'Zyra', field: 'Terreni' }[u.role]}</option>`).join('')}</select></div>
           <div class="field"><label class="label">Data</label><input class="input" type="date" name="date" value="${OT.today()}" max="${OT.today()}"></div>
           <div class="field"><label class="label">Shënim <span class="opt">(opsional)</span></label><input class="input" name="note"></div>` + actions('Ruaj pagesën');
      },
      submit(fd, ctx) {
        const r = recOf(ctx), t = totalsOf(ctx, r), a = OT.parseEur(fd.get('amount'));
        if (!a || a <= 0) return { amount: 'Shkruani një shumë më të madhe se €0.' };
        if (a > t.remaining) return { amount: `Shuma është më e madhe se borxhi (${eur(t.remaining)}).` };
        const p = { id: 'p' + Date.now(), amount: a, date: fd.get('date') || OT.today(), time: OT.nowTime(), method: fd.get('method'), receivedBy: fd.get('by'), status: 'confirmed', note: fd.get('note') };
        r.payments.push(p);
        log(r, `Pagesë ${eur(a)} (${{ cash: 'kesh', bank: 'bankë', card: 'kartelë' }[p.method]}), mori ${userName(p.receivedBy)}`, 'money');
        toast(`Pagesa ${eur(a)} u regjistrua.`);
      }
    },
    adjust: {
      render(ctx) {
        return head('Shtesë ose zbritje', 'Ndryshon totalin e marrë vesh. Ruhet në historik.') +
          `<div class="field"><div class="seg">${[['+', '+ Shtesë'], ['-', '− Zbritje']].map(([v, l], i) => `<label><input type="radio" name="sign" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>` +
          money('amount', 'Shuma <span class="req">*</span>') + reasonField('reason', 'Arsyeja', ['+1 dollap', 'Ndryshim i materialit', 'Marrëveshje'], 'p.sh. +1 dollap i sipërm') + actions('Ruaj');
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id), a = OT.parseEur(fd.get('amount')), reason = (fd.get('reason') || '').trim();
        const err = {};
        if (!a) err.amount = 'Shkruani shumën.';
        if (!reason) err.reason = 'Arsyeja është e detyrueshme.';
        if (Object.keys(err).length) return err;
        const amount = fd.get('sign') === '-' ? -a : a;
        const before = OT.orderTotals(o).total;
        o.adjustments.push({ id: 'a' + Date.now(), amount, reason, date: OT.today(), by: me().id });
        log(o, `${amount > 0 ? 'Shtesë' : 'Zbritje'} ${eur(amount)}: ${reason} · totali ${eur(before)} → ${eur(OT.orderTotals(o).total)}`, 'money');
        toast('Totali u përditësua.');
      }
    },
    stage: {
      render(ctx) {
        const o = OT.order(ctx.id), flow = OT.flow(o, B), ci = flow.indexOf(o.stage), ti = flow.indexOf(ctx.k);
        const back = ti < ci, skipped = flow.slice(ci + 1, ti);
        const teamOpts = S.teams.map(t => `<option value="${t.id}" ${t.id === o.teamId ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
        return head(back ? `Kthe mbrapa te “${esc(stageLabel(ctx.k, o))}”?` : `Kalo te “${esc(stageLabel(ctx.k, o))}”?`, `${o.number} · ${esc(OT.customer(o.customerId).name)}`) +
          (skipped.length ? `<div class="callout callout--warning">${ic('alert')}<span>Do të kalohen: <b>${skipped.map(k => esc(stageLabel(k, o))).join(', ')}</b>. Ruhet në historik dhe nuk shfaqet te klienti.</span></div>` : '') +
          (back ? reasonField('reason', 'Arsyeja e kthimit', ['Gabim në regjistrim', 'Ndryshim nga klienti', 'Rimatje']) : '') +
          (ctx.k === 'scheduled' ? `<div class="field" data-f="date"><label class="label">Data <span class="req">*</span></label><input class="input" type="date" name="date" value="${o.scheduledDate && o.scheduledDate >= OT.today() ? o.scheduledDate : OT.addDays(OT.today(), 2)}" min="${OT.today()}"></div>
            <div class="field"><label class="label">Ekipi</label><select class="select" name="team">${teamOpts}</select></div>
            <div class="field"><span class="label">Ora e mbërritjes</span>${radios('window', windows.map(w => [w, w]), o.arrivalWindow || windows[0])}</div>` : '') +
          (ctx.k === 'fulfilled' ? `<div class="help">Data e përfundimit: sot. Mesazhi “Faleminderit” do të përgatitet.</div>` : '') +
          actions(back ? 'Kthe mbrapa' : 'Po, kalo');
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id), flow = OT.flow(o, B), ci = flow.indexOf(o.stage), ti = flow.indexOf(ctx.k);
        const from = stageLabel(o.stage, o);
        if (ti < ci) {
          const reason = (fd.get('reason') || '').trim();
          if (!reason) return { reason: 'Shkruani arsyen e kthimit.' };
          o.skipped = o.skipped.filter(k => flow.indexOf(k) < ti);
          log(o, `U kthye mbrapa: ${from} → ${stageLabel(ctx.k, o)} · ${reason}`, 'warn');
          if (ti < flow.indexOf('fulfilled')) o.fulfilledAt = null;
        } else {
          const skipped = flow.slice(ci + 1, ti);
          if (ctx.k === 'scheduled') {
            const date = fd.get('date'); if (!date) return { date: 'Zgjidhni datën.' };
            o.scheduledDate = date; o.teamId = fd.get('team'); o.arrivalWindow = fd.get('window');
          }
          if (skipped.length) { o.skipped = [...new Set([...o.skipped, ...skipped])]; log(o, `Hapa të kaluar: ${skipped.map(k => stageLabel(k, o)).join(', ')}`, 'warn'); }
          log(o, ctx.k === 'scheduled' ? `${stageLabel('scheduled', o)}: ${fmtDate(o.scheduledDate)}, ${o.arrivalWindow}, ${teamName(o.teamId)}` : `Faza: ${from} → ${stageLabel(ctx.k, o)}`, 'stage');
          if (ctx.k === 'fulfilled') { o.fulfilledAt = OT.today(); if (!o.dueDate) o.dueDate = OT.today(); }
          if (ti >= flow.indexOf('ready')) o.delay = null;
        }
        o.stage = ctx.k; o.stageDates[ctx.k] = OT.today();
        toast(`${o.number}: ${stageLabel(ctx.k, o)}`);
      }
    },
    method: {
      render(ctx) {
        const o = OT.order(ctx.id);
        return head('Mënyra e përfundimit', 'Ndryshon emrat e fazave, mesazhet dhe faqen e klientit. Tërheqja nuk ka “planifikim”.') +
          `<div class="field">${radios('method', Object.entries(OT.METHODS), o.fulfilment)}</div>` + actions('Ruaj');
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id), m = fd.get('method');
        if (m === o.fulfilment) return;
        if (m === 'pickup' && o.stage === 'scheduled') return { method: 'Kthejeni porosinë te “Gati” para se ta bëni tërheqje.' };
        log(o, `Mënyra: ${OT.METHODS[o.fulfilment]} → ${OT.METHODS[m]}`, 'stage');
        o.fulfilment = m;
      }
    },
    delay: {
      render(ctx) {
        const o = OT.order(ctx.id);
        return head('Vonesë', 'Përditëson faqen e klientit dhe përgatit një mesazh të sjellshëm. Ju vendosni nëse e dërgoni.') +
          `<div class="field" data-f="reason"><span class="label">Arsyeja <span class="req">*</span></span>${radios('reason', [['Pritet materiali nga furnitori', 'Pritet materiali / furnitori'], ['Klienti nuk është gati', 'Klienti nuk është gati'], ['Moti i keq', 'Moti'], ['other', 'Tjetër']], '')}
           <input class="input" name="other" placeholder="Shkruani arsyen" data-show-if="reason=other"></div>
           <div class="field" data-f="date"><label class="label">Data e re e pritshme <span class="req">*</span></label><input class="input" type="date" name="date" min="${OT.today()}" value="${OT.addDays(o.promisedDate && o.promisedDate > OT.today() ? o.promisedDate : OT.today(), 7)}"></div>` + actions('Ruaj vonesën');
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id);
        let reason = fd.get('reason'); if (reason === 'other') reason = (fd.get('other') || '').trim();
        if (!reason) return { reason: 'Zgjidhni arsyen.' };
        const date = fd.get('date'); if (!date) return { date: 'Zgjidhni datën e re.' };
        o.delay = { reason, newDate: date, setAt: OT.today() };
        log(o, `Vonesë: ${reason}. Data e re ${fmtDate(date)}`, 'danger');
        toast('Mesazhi për klientin u përgatit te “Gati për dërgim”.');
      }
    },
    pause: {
      render(ctx) {
        return head('Pauzo kujtesat', 'Kujtesat për borxh nuk sugjerohen deri në këtë datë.') +
          `<div class="field" data-f="until"><label class="label">Deri më <span class="req">*</span></label><input class="input" type="date" name="until" min="${OT.addDays(OT.today(), 1)}" value="${OT.addDays(OT.today(), 14)}"></div>` +
          reasonField('reason', 'Arsyeja', ['Punë të mbetura', 'Klienti premtoi të paguajë më vonë', 'Marrëveshje familjare']) + actions('Pauzo');
      },
      submit(fd, ctx) {
        const r = recOf(ctx), until = fd.get('until'), reason = (fd.get('reason') || '').trim(), err = {};
        if (!until) err.until = 'Zgjidhni datën.';
        if (!reason) err.reason = 'Arsyeja është e detyrueshme.';
        if (Object.keys(err).length) return err;
        r.pause = { until, reason };
        log(r, `Kujtesat në pauzë deri më ${fmtDate(until)}: ${reason}`, 'warn');
      }
    },
    remainingWork: {
      render(ctx) {
        const o = OT.order(ctx.id), field = ctx.field === '1' && isField();
        return head('Ka punë të mbetura', 'p.sh. “Një derë duhet rregulluar; klienti paguan €150 e fundit pas rregullimit.”') +
          `<div class="field" data-f="note"><label class="label">Çfarë ka mbetur? <span class="req">*</span></label><textarea class="textarea" name="note"></textarea></div>` +
          (field ? '' : `<div class="field"><label class="label">Vizitë plotësuese <span class="opt">(opsionale)</span></label><input class="input" type="date" name="visit" min="${OT.today()}"></div>
           <div class="field"><label class="label">Ekipi</label><select class="select" name="team">${S.teams.map(t => `<option value="${t.id}" ${t.id === o.teamId ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>
           <label class="check"><input type="checkbox" name="pause" checked> Pauzo kujtesat për borxh deri në përfundim</label>`) + actions('Ruaj');
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id), note = (fd.get('note') || '').trim();
        if (!note) return { note: 'Përshkruani çfarë ka mbetur.' };
        const visit = fd.get('visit');
        o.remainingWork = { note, visitDate: visit || null, window: visit ? '14:00–16:00' : null, teamId: fd.get('team') || o.teamId, since: OT.today() };
        log(o, `Ka punë të mbetura: ${note}${visit ? ` · vizitë ${fmtDate(visit)}` : ''}`, 'warn');
        if (fd.get('pause')) {
          o.pause = { until: visit ? OT.addDays(visit, 2) : OT.addDays(OT.today(), 14), reason: 'Punë të mbetura' };
          log(o, `Kujtesat në pauzë deri më ${fmtDate(o.pause.until)}: Punë të mbetura`, 'warn');
        }
        toast('U shënua: ka punë të mbetura.');
      }
    },
    confirmCash: {
      render(ctx) {
        const r = recOf(ctx), p = r.payments.find(x => x.id === ctx.pid);
        return head(`Konfirmo: i mora paratë nga ${esc(userName(p.receivedBy))}`, `${eur(p.amount)} kesh · raportuar ${fmtDate(p.date)}.`) +
          `<div class="callout callout--info">${ic('cash')}<span>Konfirmoni vetëm nëse <b>i keni marrë paratë në dorë</b> nga ${esc(userName(p.receivedBy))}. Që klienti ka paguar është regjistruar tashmë.</span></div>` + actions(`Po, i mora ${eur(p.amount)}`, 'success');
      },
      submit(fd, ctx) {
        const r = recOf(ctx), p = r.payments.find(x => x.id === ctx.pid);
        p.status = 'confirmed'; p.confirmedBy = me().id; p.confirmedAt = OT.today();
        log(r, `Konfirmuar: ${me().name} i mori ${eur(p.amount)} nga ${userName(p.receivedBy)}`, 'money');
        toast(`${eur(p.amount)} tani janë në zyrë.`);
      }
    },
    rejectCash: {
      render(ctx) {
        const r = recOf(ctx), p = r.payments.find(x => x.id === ctx.pid);
        return head('Refuzo raportin', `${eur(p.amount)} nga ${esc(userName(p.receivedBy))}`) +
          `<div class="callout callout--warning">${ic('alert')}<span>Vetëm për një raport të gabuar. Shuma kthehet te borxhi i klientit dhe kujtesat rifillojnë. <b>Nëse klienti pagoi, por paratë s’janë dorëzuar, mos refuzoni</b>: ato mbeten te montuesi.</span></div>` +
          reasonField('reason', 'Arsyeja', ['Shuma e gabuar', 'Porosi e gabuar', 'Klienti nuk pagoi']) + actions('Refuzo', 'danger');
      },
      submit(fd, ctx) {
        const r = recOf(ctx), p = r.payments.find(x => x.id === ctx.pid), reason = (fd.get('reason') || '').trim();
        if (!reason) return { reason: 'Arsyeja është e detyrueshme.' };
        p.status = 'rejected'; p.rejectedReason = reason; p.rejectedBy = me().id;
        log(r, `Refuzuar raporti ${eur(p.amount)} nga ${userName(p.receivedBy)}: ${reason}. Shuma u kthye te borxhi.`, 'danger');
        toast('Raporti u refuzua. Shuma u kthye te borxhi.');
      }
    },
    reverse: {
      render(ctx) {
        const r = recOf(ctx), p = r.payments.find(x => x.id === ctx.pid);
        return head('Storno pagesën', `${eur(p.amount)} · ${fmtDate(p.date)}`) +
          `<div class="callout callout--neutral">${ic('help')}<span>Pagesat e konfirmuara nuk ndryshohen e nuk fshihen. Krijohet një hyrje negative e lidhur; të dyja mbeten në historik. Pastaj regjistroni pagesën e saktë nëse duhet.</span></div>` +
          reasonField('reason', 'Arsyeja', ['E regjistruar dy herë', 'Shuma e gabuar', 'Porosi e gabuar']) + actions('Storno', 'danger');
      },
      submit(fd, ctx) {
        const r = recOf(ctx), p = r.payments.find(x => x.id === ctx.pid), reason = (fd.get('reason') || '').trim();
        if (!reason) return { reason: 'Arsyeja është e detyrueshme.' };
        const rev = { id: 'p' + Date.now(), amount: -p.amount, date: OT.today(), time: OT.nowTime(), method: p.method, receivedBy: me().id, status: 'reversal', reverses: p.id, reason };
        p.reversedBy = rev.id; r.payments.push(rev);
        log(r, `Storno ${eur(-p.amount)}: ${reason}`, 'danger');
        toast('Pagesa u stornua.');
      }
    },
    collect: {
      render(ctx) {
        const o = OT.order(ctx.id), a = OT.toCollect(o), u = OT.user(ctx.as);
        return head(`Mora ${eur(a)}?`, `${esc(OT.customer(o.customerId).name)} · ${o.number} · kesh`) +
          money('amount', 'Shuma që more', a) +
          `<div class="help">Ruhet si e raportuar nga ${esc(u.name)}. Zyra e konfirmon kur t’i dorëzosh paratë.</div>` +
          `<div class="btn-row"><button class="btn btn--accent btn--lg btn--block" type="submit">${ic('check')} Po, i mora</button></div>`;
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id), a = OT.parseEur(fd.get('amount')), max = OT.toCollect(o), u = OT.user(ctx.as);
        if (!a || a <= 0) return { amount: 'Shkruani shumën.' };
        if (a > max) return { amount: `Më shumë se sa duhet mbledhur (${eur(max)}).` };
        o.payments.push({ id: 'p' + Date.now(), amount: a, date: OT.today(), time: OT.nowTime(), method: 'cash', receivedBy: u.id, status: 'reported', reportedBy: u.id });
        o.events.push({ date: OT.today(), time: OT.nowTime(), by: u.id, text: `${u.name} raportoi ${eur(a)} kesh nga klienti`, kind: 'warn' });
        toast(`U raportua ${eur(a)}. Zyra do ta konfirmojë.`);
      }
    },
    measured: {
      render(ctx) {
        ui.pending = [];
        return head('Matja u krye', 'Fotografoni faqen e fletores (një ose më shumë).') +
          `<div class="photos" id="pending-photos">${pendingTiles()}</div>
           <div class="field"><label class="label">Shënim i shkurtër <span class="opt">(opsional)</span></label><input class="input" name="note" placeholder="p.sh. priza 2×, uji majtas"></div>` +
          `<div class="btn-row"><button class="btn btn--primary btn--lg btn--block" type="submit">${ic('check')} Ruaj matjet</button></div>`;
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id);
        const imgs = ui.pending.length ? ui.pending : [OT.photo('notebook', Date.now() % 2)];
        imgs.forEach((src, i) => o.photos.push({ id: 'ph' + Date.now() + i, src, label: 'Matjet', kind: 'measure', share: false }));
        o.measuredAt = OT.today(); o.measurementNote = fd.get('note') || '';
        log(o, `Matja u krye · ${imgs.length} foto e fletores${o.measurementNote ? ' · ' + o.measurementNote : ''}`, 'stage');
        ui.pending = [];
        toast('Matjet u ruajtën te porosia.');
      }
    },
    fulfill: {
      render(ctx) {
        const o = OT.order(ctx.id); ui.pending = [];
        const lbl = OT.stageLabel('fulfilled', o.fulfilment);
        return head(`${lbl}?`, 'Shtoni foto pas punës (opsionale).') + `<div class="photos" id="pending-photos">${pendingTiles()}</div>` +
          `<div class="btn-row"><button class="btn btn--primary btn--lg btn--block" type="submit">${ic('check')} Po, ${lbl.toLowerCase()}</button></div>`;
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id), lbl = OT.stageLabel('fulfilled', o.fulfilment);
        ui.pending.forEach((src, i) => o.photos.push({ id: 'ph' + Date.now() + i, src, label: 'Pas montimit', kind: 'after', share: false }));
        log(o, `Faza: ${stageLabel(o.stage, o)} → ${lbl}${ui.pending.length ? ` · ${ui.pending.length} foto` : ''}`, 'stage');
        o.stage = 'fulfilled'; o.fulfilledAt = OT.today(); o.stageDates.fulfilled = OT.today(); if (!o.dueDate) o.dueDate = OT.today();
        ui.pending = [];
        toast(`${o.number}: ${lbl}`);
      }
    },
    revoke: {
      render(ctx) {
        const regen = ctx.mode === 'regenerate';
        return head(regen ? 'Zëvendëso linkun?' : 'Çaktivizo linkun?', regen ? 'p.sh. u dërgua në numër të gabuar.' : '') +
          `<div class="callout callout--neutral">${ic('link')}<span>Linku i vjetër do të tregojë: “Ky link nuk është më aktiv. Na kontaktoni.” me numrin e kompanisë, pa asnjë të dhënë të porosisë.</span></div>` +
          reasonField('reason', 'Arsyeja', ['U dërgua në numër të gabuar', 'Kërkesë e klientit']) + actions(regen ? 'Krijo link të ri' : 'Çaktivizo', 'danger');
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id), reason = (fd.get('reason') || '').trim();
        if (!reason) return { reason: 'Arsyeja është e detyrueshme.' };
        S.revokedTokens[o.token] = o.id;
        ui.lastRevoked = o.token;
        o.token = ctx.mode === 'regenerate' ? OT.newToken() : null;
        log(o, ctx.mode === 'regenerate' ? `Linku i ndjekjes u zëvendësua: ${reason}` : `Linku i ndjekjes u çaktivizua: ${reason}`, 'danger');
        toast(ctx.mode === 'regenerate' ? 'Linku i ri u krijua.' : 'Linku u çaktivizua.');
      }
    },
    setDue: {
      render() {
        return head('Kur duhej paguar?', 'Pas kësaj llogariten ditët e vonesës dhe mund të sugjerohen kujtesa.') +
          `<div class="field" data-f="due"><input class="input" type="date" name="due" max="${OT.addDays(OT.today(), 365)}"></div>` + actions('Ruaj afatin');
      },
      submit(fd, ctx) {
        const ob = OT.opening(ctx.id), due = fd.get('due');
        if (!due) return { due: 'Zgjidhni datën.' };
        ob.dueDate = due; ob.dueApprox = false;
        log(ob, `Afati u vendos: ${fmtDate(due)} (më parë: afat i panjohur)`, 'money');
      }
    },
    panel: { render: () => panelHtml(), submit() { } }
  };

  function pendingTiles() {
    return ui.pending.map(src => `<div class="photo"><img src="${src}" alt=""></div>`).join('') +
      `<label class="photo photo--add">${ic('camera')}<span>${ui.pending.length ? 'Edhe një' : 'Bëj foto'}</span><input type="file" accept="image/*" capture="environment" data-photo="pending"></label>`;
  }

  function openSheet(name, ctx = {}) {
    const root = document.getElementById('sheet-root');
    ui.sheet = { name, ctx };
    root.innerHTML = `<div class="sheet-backdrop" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true"><form class="form" data-sheet="${name}" novalidate>${SHEETS[name].render(ctx)}</form></div>`;
    root.classList.add('open');
    const f = root.querySelector('form'); updateConditionals(f);
    const first = f.querySelector('.input--money, textarea, input:not([type=radio]):not([type=checkbox]):not([type=file]):not([type=date])');
    if (first && window.matchMedia('(hover: hover)').matches) first.focus();
  }
  function closeSheet() {
    const root = document.getElementById('sheet-root');
    root.innerHTML = ''; root.classList.remove('open'); ui.sheet = null;
  }
  function showErrors(form, errs) {
    form.querySelectorAll('.error').forEach(e => e.remove());
    form.querySelectorAll('.has-error').forEach(e => e.classList.remove('has-error'));
    let first = null;
    for (const [k, msg] of Object.entries(errs)) {
      const f = form.querySelector(`[data-f="${k}"]`) || form.querySelector(`[name="${k}"]`)?.closest('.field') || form;
      f.classList.add('has-error');
      f.insertAdjacentHTML('beforeend', `<div class="error" role="alert">${esc(msg)}</div>`);
      first = first || f;
    }
    if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function updateConditionals(form) {
    if (!form) return;
    form.querySelectorAll('[data-show-if]').forEach(el => {
      const [name, val] = el.dataset.showIf.split('=');
      const checked = form.querySelector(`input[name="${name}"]:checked`);
      el.hidden = (checked ? checked.value : '') !== val;
    });
  }

  /* ───────── Opening balance submit ───────── */
  function submitOpening(form, then) {
    const fd = new FormData(form), err = {};
    const name = (fd.get('name') || '').trim(), amount = OT.parseEur(fd.get('amount'));
    const dueMode = fd.get('dueMode');
    if (!name) err.name = 'Shkruani emrin e klientit.';
    if (!amount || amount <= 0) err.amount = fd.get('amount') ? 'Shuma nuk është e saktë. Shembull: 450 ose 1.250,50' : 'Shkruani shumën e borxhit.';
    if (!dueMode) err.dueMode = 'Zgjidhni: kur duhej paguar?';
    let dueDate = null, dueApprox = false;
    if (dueMode === 'date') { dueDate = fd.get('dueDate'); if (!dueDate) err.dueDate = 'Zgjidhni datën.'; }
    if (dueMode === 'month') {
      const m = fd.get('dueMonth'); if (!m) err.dueMonth = 'Zgjidhni muajin.';
      else { const [y, mm] = m.split('-').map(Number); dueDate = OT.iso(new Date(y, mm, 0)); dueApprox = true; }
    }
    const digits = (fd.get('phone') || '').replace(/\D/g, '').replace(/^0+/, '');
    if (digits && (digits.length < 6 || digits.length > 12)) err.phone = 'Numri i telefonit duket i paplotë.';
    if (Object.keys(err).length) return showErrors(form, err);
    const wm = fd.get('workMode');
    const ob = {
      id: 'ob' + Date.now(), name, phone: digits ? fd.get('cc') + digits : '', channel: 'whatsapp', amount,
      forWhat: (fd.get('forWhat') || '').trim(), note: (fd.get('note') || '').trim(),
      workDone: wm === 'date' && fd.get('workDate') ? { mode: 'date', value: fd.get('workDate') } : wm === 'month' && fd.get('workMonth') ? { mode: 'month', value: fd.get('workMonth') } : { mode: 'unknown' },
      dueDate, dueApprox, payments: [], createdAt: OT.today(), events: []
    };
    log(ob, `Borxh i bartur u shtua: ${eur(amount)}${dueDate ? ` · afati ${dueApprox ? '≈ ' + OT.fmtMonth(dueDate.slice(0, 7)) : fmtDate(dueDate)}` : ' · afat i panjohur'}`, 'money');
    S.openings.push(ob); save();
    toast(`${name}: ${eur(amount)} u shtua${dueDate ? '' : ' · Afat i panjohur'}.`);
    if (then === 'again') { form.reset(); updateConditionals(form); form.querySelectorAll('.error').forEach(e => e.remove()); form.querySelector('[name=name]').focus(); document.querySelector('.main').scrollTop = 0; }
    else { ui.flash = ob.id; go('#/debts'); }
  }

  /* ───────── Photos (compressed in the browser, like the app will) ───────── */
  function compress(file, max = 1200, q = 0.75) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => { const img = new Image(); img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', q));
      }; img.onerror = rej; img.src = fr.result; };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }

  /* ───────── Toast ───────── */
  let toastTimer;
  function toast(msg) {
    const root = document.getElementById('toast-root'); if (!root) return;
    root.innerHTML = `<div class="toast" role="status">${ic('check')}<span>${esc(msg)}</span></div>`;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { root.innerHTML = ''; }, 3200);
  }

  /* ───────── Prototype panel / bar ───────── */
  /** The sales demo, in order (spec: the three moments + the installer story). */
  function moments() {
    const K = S.keyIds, k800 = OT.order(K.k800), lead = S.users.find(u => u.teamId === k800.teamId);
    const track = [OT.order(K.track), k800].find(o => o && o.token);
    const ready = OT.suggestions().ready, msg = ready.find(s => s.id === `scheduled:${K.track}`) || ready[0];
    const amt = OT.toCollect(k800) || OT.orderTotals(k800).reported;
    return [
      ['1', 'Kush më ka borxh', '#/debts', 'owner'],
      ['2', 'Faqja e klientit', track ? `#/t/${track.token}` : `#/t/${K.revoked}`, 'client'],
      ['3', 'Mesazhi në WhatsApp', msg ? `#/msg/${encodeURIComponent(msg.id)}` : '#/messages', 'owner'],
      ['4', `${lead.name}: “Mora ${eur(amt)}”`, `#/job/${k800.id}/${k800.fulfilment === 'delivery' ? 'delivery' : 'installation'}`, `field:${lead.id}`]
    ];
  }
  /** Every Phase 1 case, for review (PHASES.md "Done when"). */
  function jumps() {
    const K = S.keyIds, k800 = OT.order(K.k800), track = (OT.order(K.track) || {}).token || k800.token;
    return [
      ['1', 'Sot (pronari)', '#/dashboard', 'owner'],
      ['2', 'Kush më ka borxh', '#/debts', 'owner'],
      ['3', 'Detajet e porosisë', `#/order/${K.detail}`, 'owner'],
      ['4', `Rasti €800 (${k800.number})`, `#/order/${K.k800}`, 'owner'],
      ['5', 'Borxh i bartur: formulari', '#/opening/new', 'owner'],
      ['6', 'Porositë + tabela (tablet)', '#/orders?view=kanban', 'owner'],
      ['7', 'Pamja e terrenit', '#/field', 'field'],
      ['8', 'Gati për dërgim', '#/messages', 'owner'],
      ['9', 'Faqja e klientit', `#/t/${track}`, 'client'],
      ['9', 'Link jo më aktiv', `#/t/${ui.lastRevoked || K.revoked}`, 'client'],
      ['+', 'Para te montuesit', '#/cash', 'owner'],
      ['+', 'Punë të mbetura + pauzë', `#/order/${K.remaining}`, 'owner'],
      ['+', 'Tërheqje me hapa të kaluar', `#/order/${K.pickup}`, 'owner'],
      ['+', 'Porosi e re', '#/order/new', 'owner']
    ];
  }
  const fieldUser = () => S.users.find(u => u.id === S.fieldUserId) || S.users.find(u => u.role === 'field');
  const linkList = list => `<div class="panel-links">${list.map(([n, l, h, r]) => `<a href="${h}" data-act="jump" data-role="${r || ''}"><b>${n}</b>${esc(l)}</a>`).join('')}</div>`;
  function panelHtml() {
    const owner = S.users.find(u => u.role === 'owner'), office = S.users.find(u => u.role === 'office');
    const wide = window.matchMedia('(min-width: 701px)').matches;
    return head('Prototipi', 'Kontrollet e demos, jo pjesë e aplikacionit.') + `<div class="panel-grid">
      <div class="field"><span class="label">Momentet e demos</span>${linkList(moments())}</div>
      <div class="field"><span class="label">Shiko si</span><div class="seg">${[['owner', `${owner.name} · Pronari`], ['office', `${office.name} · Zyra`], ['field', `${fieldUser().name} · Terreni`]].map(([r, l]) => `<button type="button" data-act="role" data-role="${r}" aria-pressed="${S.role === r}">${esc(l)}</button>`).join('')}</div>
        ${isField() ? `<select class="select" data-act-change="fieldUser">${S.users.filter(u => u.role === 'field').map(u => `<option value="${u.id}" ${u.id === S.fieldUserId ? 'selected' : ''}>${esc(u.name)} · ${esc(teamName(u.teamId))}</option>`).join('')}</select>` : ''}</div>
      <div class="field"><span class="label">Marka</span><div class="seg">${Object.values(OT.brands).map(b => `<button type="button" data-act="brand" data-slug="${b.slug}" aria-pressed="${b.slug === B.slug}">${esc(b.shortName)}</button>`).join('')}</div></div>
      <div class="field"><span class="label">Të dhënat</span><div class="seg">${[['0', 'Demo · 9 porosi'], ['1', 'Test · 30 porosi']].map(([v, l]) => `<button type="button" data-act="fullData" data-v="${v}" aria-pressed="${!!S.full === (v === '1')}">${l}</button>`).join('')}</div></div>
      <details class="fold fold--inline" data-fold="panel-cases">${foldSummary('', 'Të gjitha rastet', `${jumps().length} ekrane për kontroll`)}<div class="fold__body">${linkList(jumps())}</div></details>
      <div class="field"><span class="label">Data e demos${S.dayOffset ? `: +${S.dayOffset} ditë` : ''}</span><div class="btn-row"><button type="button" class="btn btn--secondary btn--sm" data-act="day" data-n="1">+1 ditë</button><button type="button" class="btn btn--secondary btn--sm" data-act="day" data-n="7">+7 ditë</button><button type="button" class="btn btn--secondary btn--sm" data-act="day" data-n="0">Sot</button></div></div>
      <div class="field"><span class="label">Fjala për paradhënien</span><div class="seg">${['Avans', 'Kapar'].map(wd => `<button type="button" data-act="depositWord" data-w="${wd}" aria-pressed="${OT.depositWord() === wd}">${wd}</button>`).join('')}</div></div>
      <label class="check"><input type="checkbox" data-act-change="showBalance" ${S.settings.showBalanceOnTracking ? 'checked' : ''}> Shfaq bilancin në faqen e klientit</label>
      ${wide ? `<div class="field"><span class="label">Korniza</span><div class="seg">${[['auto', 'Auto'], ['phone', 'Telefon'], ['tablet', 'Tablet'], ['none', 'Pa kornizë']].map(([f, l]) => `<button type="button" data-act="frame" data-f="${f}" aria-pressed="${(prefs.frame || 'auto') === f}">${l}</button>`).join('')}</div></div>` : ''}
      <button type="button" class="btn btn--ghost-danger" data-act="reset">${ic('refresh')} Rivendos të dhënat e demos</button>
    </div>`;
  }

  function updateProtoBar() {
    const bar = document.getElementById('proto-bar'); if (!bar) return;
    const persona = location.hash.startsWith('#/t/') ? 'client' : isField() ? 'field' : S.role === 'owner' ? 'owner' : '';
    const owner = S.users.find(u => u.role === 'owner');
    bar.innerHTML = `<span class="proto-bar__title">Prototip</span>
      <select data-pb="brand" aria-label="Marka">${Object.values(OT.brands).map(b => `<option value="${b.slug}" ${b.slug === B.slug ? 'selected' : ''}>${esc(b.shortName)}</option>`).join('')}</select>
      <span class="proto-bar__label">Shiko si</span>
      <span class="proto-seg" role="group" aria-label="Shiko si">${[['owner', owner.name], ['field', fieldUser().name], ['client', 'Klienti']].map(([p, l]) => `<button data-pb-persona="${p}" aria-pressed="${persona === p}">${esc(l)}</button>`).join('')}</span>
      <span class="proto-bar__moments">${moments().map(([n, l, h, r]) => `<button data-pb-jump="${esc(h)}|${r}"><b>${n}</b>${esc(l)}</button>`).join('')}</span>
      <span class="proto-bar__spacer"></span>
      ${S.dayOffset ? `<span class="proto-bar__note">Data e demos +${S.dayOffset} ditë</span>` : ''}
      <button data-pb="more">Më shumë…</button>`;
  }
  function setFrame(screenFrame) {
    const dev = document.getElementById('device');
    const f = (prefs.frame && prefs.frame !== 'auto') ? prefs.frame : screenFrame;
    dev.className = `device device--${f}`;
  }
  function setRole(role) {
    S.role = role; prefs.role = role; savePrefs(); save();
    ui.channel = null;
  }
  /** role: 'owner' | 'field' | 'field:<userId>' | 'client' (no role change) | '' */
  function doJump(href, role) {
    if (role && role.startsWith('field')) { const id = role.split(':')[1]; if (id) S.fieldUserId = id; if (!isField()) setRole('field'); else save(); }
    else if (role === 'owner' && S.role !== 'owner') setRole('owner');
    closeSheet(); ui.sim = null; go(href);
  }
  function persona(p) {
    if (p === 'client') return doJump(moments()[1][2], 'client');
    if (p === 'field') return doJump('#/field', 'field');
    doJump('#/dashboard', 'owner');
  }

  /* ═══════════════════════ EVENTS ═══════════════════════ */
  const ACT = {
    sheet: el => openSheet(el.dataset.sheet, { ...el.dataset }),
    closeSheet: () => closeSheet(),
    panel: () => openSheet('panel'),
    open: el => go(el.dataset.href),
    fillReason: el => { const i = el.closest('form').querySelector(`[name="${el.dataset.target}"]`); i.value = el.dataset.v; i.focus(); },
    toggleShare: el => { const o = OT.order(el.dataset.id), ph = o.photos.find(p => p.id === el.dataset.ph); ph.share = !ph.share; log(o, `Foto “${ph.label}” ${ph.share ? 'shfaqet' : 'nuk shfaqet më'} në faqen e klientit`); save(); render(); },
    toggleCollect: el => { const o = OT.order(el.dataset.id); o.collectAt = o.collectAt === 'installers' ? 'office' : 'installers'; log(o, `Pjesa e mbetur paguhet: ${o.collectAt === 'installers' ? 'te montuesit' : 'në zyrë'}`); save(); render(); },
    unpause: el => { const r = recOf(el.dataset); log(r, 'Pauza e kujtesave u hoq', 'warn'); r.pause = null; save(); render(); },
    clearRemaining: el => { const o = OT.order(el.dataset.id); log(o, `Puna u përfundua (punë të mbetura: ${o.remainingWork.note})`, 'stage'); o.remainingWork = null; if (o.pause && o.pause.reason === 'Punë të mbetura') { o.pause = null; log(o, 'Pauza e kujtesave u hoq', 'warn'); } save(); toast('Puna u përfundua.'); render(); },
    newLink: el => { const o = OT.order(el.dataset.id); o.token = OT.newToken(); log(o, 'U krijua link i ri ndjekjeje', 'stage'); save(); render(); },
    clearRisk: () => { ui.filters.risk = false; go('#/orders'); },
    channel: el => { ui.channel = el.dataset.ch; const ta = document.getElementById('msg-text'); const keep = ta ? ta.value : null; render(); if (keep != null) document.getElementById('msg-text').value = keep; },
    simSend: () => { const C = ui.compose, ta = document.getElementById('msg-text'); ui.sim = { ...C, text: ta.value, channel: C.ch }; if (ui.sim.channel === 'viber' && navigator.clipboard) navigator.clipboard.writeText(ta.value).catch(() => { }); $view().insertAdjacentHTML('beforeend', simHtml()); },
    simNo: () => { ui.sim = null; const ch = document.querySelector('.chat'); if (ch) ch.remove(); },
    closeSim: () => { ui.sim = null; },
    simYes: () => {
      const s = ui.sim, r = s.kind === 'opening' ? OT.opening(s.id) : OT.order(s.id);
      const chName = { whatsapp: 'WhatsApp', viber: 'Viber', sms: 'SMS' }[s.channel];
      S.messageLog.unshift({ id: 'm' + Date.now(), date: OT.today(), time: OT.nowTime(), type: s.type, channel: s.channel, to: s.to.name, orderId: s.id, by: me().id, text: s.text });
      if (s.sid) S.msgDone.push(s.sid);
      log(r, `Mesazh ${chName}: ${OT.msgLabel(s.type)} → ${s.to.name}`, 'msg');
      ui.sim = null; ui.channel = null; save();
      toast('U regjistrua në historikun e klientit.');
      go(s.type === 'reminder' && !s.sid ? '#/debts' : '#/messages');
    },
    dismissMsg: el => { S.msgDone.push(el.dataset.sid); save(); toast('Sugjerimi u anashkalua.'); go('#/messages'); },
    protoBack: el => { if (history.length > 1) history.back(); else go(el.dataset.href); },
    brand: el => { setBrand(el.dataset.slug); closeSheet(); ui.filters = { s: '', stage: '', pay: '', team: '', city: '', risk: false }; go(isField() ? '#/field' : '#/dashboard'); },
    role: el => { setRole(el.dataset.role); closeSheet(); go(el.dataset.role === 'field' ? '#/field' : '#/dashboard'); },
    jump: (el, e) => { e.preventDefault(); doJump(el.getAttribute('href'), el.dataset.role); },
    day: el => { const n = +el.dataset.n; S.dayOffset = n === 0 ? 0 : (S.dayOffset || 0) + n; save(); closeSheet(); render(); toast(S.dayOffset ? `Data e demos: +${S.dayOffset} ditë. Sugjerimet u rillogaritën.` : 'Data e demos: sot.'); },
    reset: () => { setBrand(B.slug, true); closeSheet(); ui.sim = null; ui.lastRevoked = null; toast('Të dhënat e demos u rivendosën.'); go(isField() ? '#/field' : '#/dashboard'); },
    back: (el, e) => { e.preventDefault(); if (ui.stack.length > 1) history.back(); else go(el.getAttribute('href')); },
    fullData: el => { prefs.full = el.dataset.v === '1'; savePrefs(); setBrand(B.slug, true); closeSheet(); ui.open.clear(); toast(prefs.full ? 'Test: 30 porosi.' : 'Demo: rastet kryesore.'); go(isField() ? '#/field' : '#/dashboard'); },
    frame: el => { prefs.frame = el.dataset.f; savePrefs(); closeSheet(); render(); },
    depositWord: el => { S.settings.depositWord = el.dataset.w; save(); closeSheet(); render(); toast(`Fjala: “${el.dataset.w}” (kërkimi pranon të dyja).`); },
    saveLoc: el => saveLocation(OT.order(el.dataset.id)),
    noop: () => { }
  };

  function bind() {
    const app = document.getElementById('app');
    app.addEventListener('click', e => {
      const el = e.target.closest('[data-act]');
      if (!el || !app.contains(el)) return;
      const a = el.dataset.act;
      if (a === 'noop') return;
      if (a !== 'jump' && a !== 'closeSim' && el.tagName === 'A' && !el.getAttribute('href')?.startsWith('#')) return;
      if (a === 'closeSim') { ACT.closeSim(); return; } // let the link navigate
      if (ACT[a]) { if (el.tagName === 'BUTTON' || a === 'jump') e.preventDefault(); ACT[a](el, e); }
    });
    app.addEventListener('submit', e => {
      const form = e.target;
      e.preventDefault();
      if (form.dataset.form === 'opening') return submitOpening(form, e.submitter ? e.submitter.value : 'list');
      if (form.dataset.form === 'order') return submitOrder(form);
      const name = form.dataset.sheet; if (!name || !ui.sheet) return;
      const err = SHEETS[name].submit(new FormData(form), ui.sheet.ctx, form);
      if (err) return showErrors(form, err);
      closeSheet(); save(); render();
    });
    app.addEventListener('change', async e => {
      const el = e.target;
      const form = el.closest('form'); if (form) updateConditionals(form);
      if (el.matches('[data-filter]')) { ui.filters[el.dataset.filter] = el.value; refreshOrders(); }
      if (el.dataset.actChange === 'fieldUser') { S.fieldUserId = el.value; save(); closeSheet(); go('#/field'); }
      if (el.dataset.actChange === 'showBalance') { S.settings.showBalanceOnTracking = el.checked; save(); render(); }
      if (el.matches('input[type=file][data-photo]') && el.files && el.files[0]) {
        let src;
        try { src = await compress(el.files[0]); } catch (err) { toast('Foto nuk u lexua.'); return; }
        if (el.dataset.photo === 'pending') { ui.pending.push(src); document.getElementById('pending-photos').innerHTML = pendingTiles(); return; }
        const o = OT.order(el.dataset.id), kind = el.dataset.kind;
        o.photos.push({ id: 'ph' + Date.now(), src, label: kind === 'measure' ? 'Matjet' : kind === 'after' ? 'Pas montimit' : 'Foto', kind, share: false });
        log(o, 'U shtua një foto'); save(); render(); toast('Foto u shtua (e kompresuar në telefon).');
      }
      if (el.closest('.field.has-error')) { const f = el.closest('.field.has-error'); f.classList.remove('has-error'); f.querySelectorAll('.error').forEach(x => x.remove()); }
    });
    app.addEventListener('input', e => {
      if (e.target.matches('[data-search]')) { ui.filters.s = e.target.value; refreshOrders(); }
      const f = e.target.closest('.field.has-error'); if (f) { f.classList.remove('has-error'); f.querySelectorAll('.error').forEach(x => x.remove()); }
    });
    window.addEventListener('hashchange', () => {
      const h = location.hash.split('?')[0];
      if (ui.stack[ui.stack.length - 2] === h) ui.stack.pop(); else ui.stack.push(h);
      ui.channel = null; closeSheet(); if (!location.hash.startsWith('#/t/')) ui.sim = null; render(); });

    // Folds remember being open (toggle doesn't bubble, so listen while capturing).
    app.addEventListener('toggle', e => {
      const d = e.target;
      if (d.matches && d.matches('details[data-fold]')) d.open ? ui.open.add(d.dataset.fold) : ui.open.delete(d.dataset.fold);
    }, true);

    // Laptop prototype bar (re-rendered by updateProtoBar, so events are delegated)
    const bar = document.getElementById('proto-bar');
    bar.addEventListener('change', e => { if (e.target.dataset.pb === 'brand') ACT.brand({ dataset: { slug: e.target.value } }); });
    bar.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pbPersona) persona(b.dataset.pbPersona);
      if (b.dataset.pbJump) { const [h, r] = b.dataset.pbJump.split('|'); doJump(h, r); }
      if (b.dataset.pb === 'more') openSheet('panel');
    });
  }

  function refreshOrders() {
    const box = document.getElementById('order-results');
    if (box) box.innerHTML = orderResults(box.dataset.view);
  }

  /* ───────── Boot ───────── */
  prefs = loadPrefs();
  const qp = new URLSearchParams(location.search);
  setBrand(OT.brands[qp.get('brand')] ? qp.get('brand') : prefs.brand || OT.defaultBrand);
  if (prefs.role && !S.role) S.role = prefs.role;
  bind();
  render();
})();
