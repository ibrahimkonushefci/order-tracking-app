/* Prototype app: hash router, screens, bottom sheets, prototype controls. */
(function () {
  const OT = window.OT;
  OT.STORE_VERSION = 9;
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
    ruler: '<path d="M21.3 15.3 8.7 2.7a1 1 0 0 0-1.4 0L2.7 7.3a1 1 0 0 0 0 1.4l12.6 12.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z"/><path d="m7.5 10.5 2-2M10.5 13.5l2-2M13.5 16.5l2-2"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    bellOff: '<path d="M13.7 21a2 2 0 0 1-3.4 0M18.6 13A17.9 17.9 0 0 1 18 8M6.3 6.3A6 6 0 0 0 6 8c0 7-3 9-3 9h14M18 8a6 6 0 0 0-9.3-5M1 1l22 22"/>',
    help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    nav: '<path d="m3 11 19-9-9 19-2-8z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    kitchen: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 10h18M7.5 6.5h.01M11.5 6.5h.01M9 14v3M15 14v3"/>',
    wardrobe: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M12 2.5v19M9.5 11v2M14.5 11v2"/>',
    door: '<path d="M5 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18"/><path d="M13.5 12.5h.01"/>',
    layers: '<path d="m12 2.5 9.5 5-9.5 5-9.5-5z"/><path d="m2.5 12.5 9.5 5 9.5-5M2.5 17l9.5 5 9.5-5"/>',
    sofa: '<path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z"/><path d="M5 18v2M19 18v2"/>',
    filePlus: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/>',
    flag: '<path d="M4 22V4M4 4h13l-2.5 4L17 12H4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };
  const WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';
  const VB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11.4 1.6C8.3 1.7 4.3 2.4 2.7 5.6c-1.2 2.4-1.1 6-.9 8.2.3 2.6 1.4 4.6 3.6 5.6v3c0 .6.7.9 1.1.5l2.7-2.8c3.3.3 6.8-.1 9.1-1.8 2.6-1.9 3.3-5.6 3-9C20.9 4.2 16.4 1.5 11.4 1.6zm.2 1.9c4.3-.1 7.9 2 8.2 6.2.3 3-.4 5.7-2.3 7.1-1.8 1.4-4.9 1.6-7.7 1.4l-2 2v-2.6c-2-.7-2.9-2.3-3.2-4.5-.2-2-.2-5 .7-6.9 1.2-2.2 4.2-2.7 6.3-2.7zm-2.7 3c-.4 0-.9.4-1.1.8-.4.8.1 1.9.7 2.9 1.2 2 2.9 3.7 5 4.7.8.4 1.8.7 2.4.1l.6-.7c.3-.4.2-.9-.2-1.2l-1.4-1c-.4-.3-.9-.2-1.2.2l-.4.5c-1.2-.5-2.3-1.6-2.9-2.8l.5-.4c.4-.3.5-.8.2-1.2l-.9-1.4c-.3-.4-.7-.5-1.3-.5zM12 5.2a.5.5 0 0 0 0 1 4.5 4.5 0 0 1 4.4 4.4.5.5 0 0 0 1 0A5.5 5.5 0 0 0 12 5.2zm.2 1.9a.5.5 0 0 0 0 1 2.4 2.4 0 0 1 2.3 2.3.5.5 0 0 0 1 0 3.4 3.4 0 0 0-3.3-3.3z"/></svg>';
  const ic = (name, cls = '') => name === 'whatsapp' ? WA : name === 'viber' ? VB :
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.help}</svg>`;
  const icSm = name => ic(name).replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px"');

  /* ───────── State & persistence ───────── */
  let S, B, prefs = {};
  const ui = { channel: null, sim: null, sheet: null, filters: { s: '', stage: '' }, pending: [], flash: null, lastRoute: '', stack: [location.hash.split('?')[0]], open: new Set(), collect: null, justCreated: null };
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
      st = OT.buildSeed(B, { full: !!prefs.full }); st.role = role === 'office' ? 'office' : 'owner';
    }
    S = OT.state = st;
    prefs.brand = B.slug; savePrefs();
    applyTheme();
    applyMode();
    save();
  }
  function contrast(hex) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const L = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
    return (0.2126 * L(r) + 0.7152 * L(g) + 0.0722 * L(b)) > 0.45 ? '#1A1A1A' : '#FFFFFF';
  }
  /* Night Mode: brand primaries are usually dark, so dark mode derives a light "ink"
   * shade (links, active tabs, icons) and a mid-tone "fill" shade (buttons, chips). */
  const hexToHsl = hex => {
    const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
  };
  const hslToHex = (h, s, l) => {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  OT.darkShades = hex => {
    const [h, s, l] = hexToHsl(hex), sat = Math.min(.72, Math.max(s, .38));
    return { ink: hslToHex(h, sat, Math.max(l, .74)), fill: hslToHex(h, sat, Math.min(.5, Math.max(l, .42))) };
  };
  const themeNow = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  function applyMode() {
    const sys = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const t = prefs.theme === 'dark' || prefs.theme === 'light' ? prefs.theme : sys;
    document.documentElement.dataset.theme = t;
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = t === 'dark' ? '#0B0F17' : B.colors.primary;
  }
  function applyTheme() {
    const s = document.documentElement.style, c = B.colors;
    const ds = OT.darkShades(c.primary);
    s.setProperty('--brand-ink-dark', ds.ink);
    s.setProperty('--brand-fill-dark', ds.fill);
    s.setProperty('--brand-fill-dark-contrast', contrast(ds.fill));
    s.setProperty('--brand-primary', c.primary);
    s.setProperty('--brand-primary-contrast', contrast(c.primary));
    s.setProperty('--brand-accent', c.accent);
    s.setProperty('--brand-accent-contrast', contrast(c.accent));
    s.setProperty('--brand-background', c.background);
    s.setProperty('--brand-text', c.text);
    document.title = `${B.companyName} · Porositë (prototip)`;
  }

  const me = () => OT.currentUser();
  const isOwner = () => S.role === 'owner';
  const ROLE = { owner: 'Pronari', office: 'Zyra' };
  const log = (rec, text, kind = '') => rec.events.push({ date: OT.today(), time: OT.nowTime(), by: me().id, text, kind });
  const userName = id => (OT.user(id) || { name: '—' }).name;
  const instName = id => id ? OT.installerName(id) : 'Pa montues';
  const stageLabel = k => OT.stageLabel(k, B);
  /** Albanian dative for a first name: "Dritonit", "Besnikut", "Besës". */
  const dative = n => /[kgh]$/.test(n) ? n + 'ut' : /a$/.test(n) ? n.slice(0, -1) + 'ës' : /[eë]$/.test(n) ? n + 's' : /i$/.test(n) ? n + 't' : n + 'it';

  /* ───────── Router ───────── */
  const $view = () => document.getElementById('view');
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), q: new URLSearchParams(qs || '') };
  }
  const go = h => { if (location.hash === h) render(); else location.hash = h; };
  const goBack = fallback => { if (ui.stack.length > 1) history.back(); else go(fallback); };

  function render() {
    const { parts, q } = route();
    const fn = SCREENS[parts[0]] || SCREENS.dashboard;
    const out = fn(parts.slice(1), q);
    const key = location.hash.split('?')[0];
    const main = document.querySelector('.main');
    const keepScroll = key === ui.lastRoute && main ? main.scrollTop : 0;
    $view().innerHTML = out.bare ? out.html : shell(out);
    // Folds stay open across re-renders (e.g. after saving inside one).
    $view().querySelectorAll('details[data-fold]').forEach(d => { if (ui.open.has(d.dataset.fold)) d.open = true; });
    if (ui.sim) $view().insertAdjacentHTML('beforeend', simHtml());
    setFrame(out.frame || 'phone');
    const m2 = document.querySelector('.main'); if (m2) m2.scrollTop = keepScroll;
    ui.lastRoute = key;
    updateProtoBar();
    if (out.after) out.after();
  }

  function shell(out) {
    const tabs = `<nav class="tabbar" aria-label="Navigimi">${[
      ['dashboard', 'home', 'Sot'], ['debts', 'wallet', 'Borxhet'], ['orders', 'list', 'Porositë'], ['schedule', 'calendar', 'Orari']
    ].map(([k, i, l]) => `<a class="tab" href="#/${k}" ${out.nav === k ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></a>`).join('')}</nav>`;
    return `<div class="shell">
      <header class="app-header">
        <a class="app-header__brand" href="#/dashboard">
          <span class="app-header__logo">${B.logo.svg}</span>
          <span class="app-header__titles"><span class="app-header__title">${esc(B.companyName)}</span><span class="app-header__sub" style="display:block">${ROLE[S.role]} · ${esc(me().name)}${S.dayOffset ? ` · <b style="color:var(--color-warning)">data e demos +${S.dayOffset} ditë</b>` : ''}</span></span>
        </a>
        <button class="icon-btn icon-btn--bare" data-act="theme" aria-label="${themeNow() === 'dark' ? 'Pamja e ndritshme' : 'Pamja e errët'}" title="Dritë / Errët">${ic(themeNow() === 'dark' ? 'sun' : 'moon')}</button>
        <a class="icon-btn icon-btn--bare" href="#/settings" aria-label="Cilësimet" ${out.nav === 'settings' ? 'aria-current="page"' : ''}>${ic('settings')}</a>
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
  const progress = (t, big) => {
    const tot = Math.max(t.total, 1), pct = v => Math.max(0, Math.min(100, v / tot * 100));
    return `<div class="progress${big ? ' progress--lg' : ''}" title="Në zyrë ${eur(t.inOffice)} · te montuesit ${eur(t.held)}"><span class="progress__confirmed" style="width:${pct(t.inOffice)}%"></span><span class="progress__reported" style="width:${pct(t.held)}%"></span></div>`;
  };
  const projBar = o => {
    const n = OT.installedQty(o);
    return `<div class="proj__bar" role="img" aria-label="${n} nga ${o.qty}"><span style="width:${Math.min(100, n / o.qty * 100)}%"></span></div>`;
  };
  const lateSpan = n => n > 60 ? `${Math.floor(n / 30)} muaj` : `${n} ditë`;
  const lateText = d => d.overdue ? `<span class="debt__late debt__late--danger">Vonesë ${lateSpan(d.late)}</span>` : d.unknownDue ? `<span class="debt__late subtle">Afat i panjohur</span>` : d.late === 0 ? `<span class="debt__late">Afati sot</span>` : `<span class="debt__late subtle">Afati ${fmtDay(d.dueDate).toLowerCase()}</span>`;
  const chIcon = ch => ch === 'viber' ? VB : ch === 'sms' ? ic('message') : WA;
  const chOf = ch => ch === 'viber' ? 'viber' : 'whatsapp';
  const CH_NAME = { whatsapp: 'WhatsApp', viber: 'Viber', sms: 'SMS' };
  /* "Kujtesë" is a green labelled button only where a reminder is reasonable now;
   * elsewhere a quiet icon still lets staff write by hand (spec: never automatic). */
  const reminderBtn = (rem, ch, href, label = 'Kujtesë') => rem.ok
    ? `<a class="btn btn--${chOf(ch)} btn--sm" href="${href}">${chIcon(chOf(ch))} ${label}</a>`
    : `<a class="icon-btn icon-btn--quiet" href="${href}" aria-label="Shkruaj mesazh me dorë">${chIcon(chOf(ch))}</a>`;
  const foldSummary = (icon, title, sum) => `<summary>${icon ? ic(icon) : ''}<span class="grow"><span class="fold__title">${title}</span>${sum ? `<span class="fold__sum">${sum}</span>` : ''}</span>${ic('right', 'chev')}</summary>`;
  const timeText = v => OT.timeLabel(v.time);
  const visitWhen = v => `${fmtDay(v.date)}${timeText(v) ? ' · ' + timeText(v) : ''}`;

  /* Row anchors and visual cues: initials with a status dot, product icons, mini payment bars */
  const initials = name => { const w = OT.firstName(name).split(/\s+/).filter(Boolean); return ((w[0] || '?')[0] + (w[1] ? w[1][0] : (w[0] || '').slice(1, 2))).toUpperCase(); };
  const hueOf = name => 1 + [...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 6;
  const avatar = (name, dot, size) => `<span class="av av--${hueOf(name)}${size ? ' av--' + size : ''}" aria-hidden="true">${esc(initials(name))}${dot ? `<span class="av__dot av__dot--${dot}"></span>` : ''}</span>`;
  const PROD_ICON = [[/kuzhin/i, 'kitchen'], [/garderob|dollap/i, 'wardrobe'], [/der[eë]|dyer/i, 'door'], [/parket|laminat|dysheme/i, 'layers'], [/tavolin|mobilje|dhom/i, 'sofa']];
  const prodIcon = o => OT.isProject(o) ? 'building' : (PROD_ICON.find(([re]) => re.test(o.productType)) || [0, 'package'])[1];
  const prodAnchor = o => `<span class="av ${OT.isProject(o) ? 'av--project' : 'av--prod'}" aria-hidden="true">${ic(prodIcon(o))}</span>`;
  const paidPct = t => Math.max(0, Math.min(100, Math.round(t.paid / Math.max(t.total, 1) * 100)));
  const miniBar = t => `<div class="mini">${progress(t)}<span class="mini__pct">${paidPct(t)}%</span></div>`;
  const payLegend = t => `<div class="legend"><span class="legend__item"><span class="legend__dot ld--office"></span>Në zyrë <b>${eur(t.inOffice)}</b></span>${t.held ? `<span class="legend__item"><span class="legend__dot ld--held"></span>Te montuesit <b>${eur(t.held)}</b></span>` : ''}<span class="legend__item"><span class="legend__dot ld--rest"></span>Mbetur <b>${eur(Math.max(0, t.remaining))}</b></span></div>`;
  /* One visit as a timeline item: time · rail · card with a type-colored left accent */
  function agendaItem(o, v, opt = {}) {
    const c = OT.customer(o.customerId), coll = OT.collectsCash(v) && !v.doneAt ? OT.toCollect(o) : 0;
    const meta = [`<span class="type-tag">${OT.VISIT[v.type]}</span>`, `<span class="pill">${ic('map')}${esc(o.city)}</span>`];
    if (opt.showInstaller) meta.push(`<span>${esc(instName(v.installerId))}</span>`);
    if (coll > 0) meta.push(`<span class="pill pill--money">Mblidh ${eur(coll)}</span>`);
    if (v.sentAt && !v.doneAt) meta.push(`<span class="pill pill--ok">${icSm('check')} dërguar</span>`);
    const action = v.doneAt ? badge('success', 'check', 'Kryer') : opt.doneBtn && v.date <= OT.today() ? `<button class="btn btn--soft btn--sm" data-act="sheet" data-sheet="done" data-id="${o.id}" data-v="${v.id}">U krye</button>` : '';
    return `<div class="agenda__item vt--${v.type}${v.doneAt ? ' agenda__item--done' : ''}">
      <span class="agenda__time">${esc(opt.timeText != null ? opt.timeText : (timeText(v) || '—'))}</span><span class="agenda__rail"><span class="agenda__dot"></span></span>
      <span class="agenda__card"><a class="agenda__body" href="#/order/${o.id}"><span class="agenda__name">${esc(c.name)}</span><span class="agenda__meta">${meta.join('')}</span></a>${action}</span>
    </div>`;
  }

  /* "Si të shkoni": phone numbers and links become tappable; a maps link becomes "Hap në Maps". */
  const URL_RE = /(https?:\/\/[^\s]+)/g;
  const PHONE_RE = /(\+\d{3}\s?\d{2}\s?\d{3}\s?\d{3,4}|\b0\d{2}\s?\d{3}\s?\d{3}\b)/g;
  const telOf = s => { const d = s.replace(/\s/g, ''); return d.startsWith('+') ? d : '+383' + d.slice(1); };
  const linkify = text => String(text || '').split(URL_RE).map((seg, i) => i % 2
    ? `<a href="${esc(seg)}" target="_blank" rel="noopener">${/maps|goo\.gl/.test(seg) ? 'Google Maps' : esc(seg.replace(/^https?:\/\//, '').slice(0, 30))}</a>`
    : esc(seg).replace(PHONE_RE, m => `<a href="tel:${telOf(m)}">${m}</a>`)).join('');
  const mapsIn = text => (String(text || '').match(URL_RE) || []).find(u => /maps|goo\.gl/.test(u));
  const dirBlock = o => o.directions ? `<div class="job__dir">${ic('nav')}<span>${linkify(o.directions)}</span></div>` : '';

  /* ═══════════════════════ SCREENS ═══════════════════════ */
  const SCREENS = {};

  /* 1. Sot: summaries that link to the one place each list lives. */
  SCREENS.dashboard = () => {
    const D = OT.dashboard(), today = OT.today();
    const overdue = [...D.overdue].sort((a, b) => b.amount - a.amount);
    const hour = new Date().getHours();
    const hello = hour < 11 ? 'Mirëmëngjes' : hour < 18 ? 'Mirëdita' : 'Mirëmbrëma';

    // The headline: where the money that isn't in the office yet is, as one stacked bar.
    const parts = [['overdue', 'Jashtë afatit', D.overdueSum], ['term', 'Në afat', D.upcomingSum], ['unknown', 'Pa afat', D.unknownSum], ['held', 'Te montuesit', D.cashSum]].filter(x => x[2] > 0);
    const whole = parts.reduce((s, x) => s + x[2], 0) || 1;
    const hero = `<a class="hero" href="#/debts">
      <span class="hero__top"><span>Kush më ka borxh</span>${ic('right', 'chev')}</span>
      ${overdue.length
        ? `<span class="hero__value">${eur(D.overdueSum)}</span><span class="hero__sub">jashtë afatit · ${overdue.length} klientë · gjithsej ${eur(D.total)} për t’u mbledhur</span>`
        : `<span class="hero__value">${eur(D.total)}</span><span class="hero__sub">për t’u mbledhur · asnjë jashtë afatit</span>`}
      ${parts.length ? `<span class="stackbar" role="img" aria-label="${parts.map(([, l, v]) => `${l} ${eur(v)}`).join(', ')}">${parts.map(([k, l, v]) => `<span class="sb--${k}" style="flex:${(v / whole).toFixed(4)}"></span>`).join('')}</span>
      <span class="legend">${parts.map(([k, l, v]) => `<span class="legend__item"><span class="legend__dot sb--${k}"></span>${l} <b>${eur(v)}</b></span>`).join('')}</span>` : ''}
      ${overdue.length ? `<span class="hero__list">${overdue.slice(0, 3).map(d => `<span class="hero__row"><span class="grow ellipsis">${esc(d.name)}</span><span class="num">${eur(d.amount)}</span><span class="hero__late">${lateSpan(d.late)}</span></span>`).join('')}</span>` : ''}
    </a>`;

    const tiles = `<div class="tiles">
      <a class="tile" href="#/order/new"><span class="tile__icon tone--brand">${ic('plus')}</span><span class="tile__label">Porosi e re<small>Klient i ri</small></span></a>
      <button class="tile" data-act="sheet" data-sheet="payPick"><span class="tile__icon tone--success">${ic('cash')}</span><span class="tile__label">Pagesë<small>Regjistro</small></span></button>
      <a class="tile" href="#/opening/new"><span class="tile__icon tone--info">${ic('book')}</span><span class="tile__label">Borxh i bartur<small>Nga fletorja</small></span></a>
    </div>`;

    // At most four things that need the owner, each linking to its own screen.
    const attention = [];
    for (const g of D.cash) attention.push(['warning', 'cash', '#/cash', `${g.name}: ${eur(g.sum)} për t’u dorëzuar`, 'Para te montuesit, pa dorëzuar në zyrë']);
    if (D.past.length) {
      const allYesterday = D.past.every(x => x.v.date === OT.addDays(today, -1));
      attention.push(['info', 'calendar', '#/schedule', `${D.past.length} punë nga ${allYesterday ? 'dje' : 'ditët e kaluara'}: a ${D.past.length === 1 ? 'u krye' : 'u kryen'}?`, D.past.map(x => `${OT.VISIT[x.v.type]} · ${OT.customer(x.o.customerId).name}`).join(', ')]);
    }
    if (D.remindable.length) attention.push(['success', 'message', '#/debts', `${D.remindable.length} ${D.remindable.length === 1 ? 'klient pret' : 'klientë presin'} një kujtesë`, 'Jashtë afatit dhe pa kujtesë në 7 ditët e fundit']);

    const html = `
      <div class="today-line">${hello}, ${esc(me().name)} · ${OT.fmtLong(today)}</div>
      ${hero}
      ${tiles}
      ${attention.length ? `<section class="card"><div class="card__head"><h2 class="card__title">Kërkon vëmendje</h2></div><div class="list">${attention.slice(0, 4).map(([tone, icon, href, title, sub]) => `<a class="list-row" href="${href}"><span class="list-row__icon tone--${tone}">${ic(icon)}</span><span class="grow"><b>${esc(title)}</b><br><span class="small muted clamp2">${esc(sub)}</span></span>${ic('right', 'chev')}</a>`).join('')}</div></section>` : ''}
      <section class="card"><div class="card__head"><h2 class="card__title">Punët e sotme <span class="subtle small">· ${D.today.length}</span></h2><a class="card__link" href="#/schedule">Orari ${ic('right', 'chev')}</a></div>
        ${D.today.length ? `<div class="agenda">${D.today.map(({ o, v }) => agendaItem(o, v, { showInstaller: true })).join('')}</div>` : '<div class="empty small">Sot nuk ka punë në terren.</div>'}</section>
    `;
    return { html, nav: 'dashboard' };
  };

  /* 2. Kush më ka borxh */
  /* One row = name, amount, one status line, one message button and call. */
  function debtRow(d) {
    const flash = ui.flash === d.id ? ' debt--new' : '';
    // Next to the green button the last-reminder line gets its short form, so it isn't cut off.
    const st = d.status && d.rem.ok && d.status[1] === 'message' ? [d.status[0], d.status[1], d.status[2].replace('Kujtesa e fundit', 'E fundit')] : d.status;
    const t = OT.totalsOf(d.kind, OT.recOf(d.kind, d.id));
    const dot = d.overdue ? 'danger' : t.held > 0 ? 'warning' : d.unknownDue ? '' : 'info';
    return `<div class="debt${flash}" id="debt-${d.id}">
      <a class="debt__top" href="${d.href}">
        ${avatar(d.name, dot || 'neutral')}
        <div class="grow"><div class="debt__name">${esc(d.name)}</div><div class="debt__meta">${esc(d.meta)}</div></div>
        <div class="debt__amount"><b>${eur(d.amount)}</b>${lateText(d)}</div>
      </a>
      <div class="debt__bar">${miniBar(t)}</div>
      <div class="debt__foot">
        ${st ? `<span class="debt__status debt__status--${st[0]}">${ic(st[1])}<span class="clamp2">${esc(st[2])}</span></span>` : '<span class="grow"></span>'}
        ${reminderBtn(d.rem, d.channel, `#/compose/${d.kind}/${d.id}?t=reminder`)}
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
        <p class="group-help">Pa afat pagese. Llogariten në total, jo te vonesat, dhe nuk sugjerohen kujtesa.</p>${rows(unknown)}` : ''}
      ${upcoming.length ? `<details class="group" data-fold="debts-upcoming"><summary class="section-title">${ic('right', 'chev')}${title('Ende në afat', upcoming)}</summary>${rows(upcoming)}</details>` : ''}
      ${!all.length ? `<div class="card"><div class="empty">${ic('check')}<b>Askush nuk ju ka borxh.</b></div></div>` : ''}
      <p class="xs subtle">Një projekt (p.sh. dyer për një ndërtesë) ka borxh vetëm për pjesët e montuara, jo për gjithë kontratën.</p>
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
      <p class="group-help">Klienti ua ka paguar këto para montuesve, prandaj nuk ka më borxh për to. Konfirmo kur t’i marrësh paratë në dorë.</p>
      ${groups.map(g => `
        <div class="card"><div class="card__head"><h2 class="card__title">${esc(g.name)}</h2><b class="num">${eur(g.sum)}</b></div>
        <div class="card__body">${g.items.map(({ p, kind, r, days }) => {
          const ctx = `data-kind="${kind}" data-id="${r.id}" data-pid="${p.id}"`;
          return `<div class="pay"><div class="pay__top"><div class="grow"><a href="#/${kind}/${r.id}" style="color:inherit"><b>${esc(OT.nameOf(kind, r))}</b></a><div class="small muted">${kind === 'order' ? r.number : 'Borxh i bartur'} · mori ${fmtDay(p.date).toLowerCase()}</div></div><div style="text-align:right"><div class="pay__amount">${eur(p.amount)}</div>${badge(days >= 7 ? 'danger' : 'warning', 'clock', days === 0 ? 'sot' : `${days} ditë`)}</div></div>
            ${g.items.length === 1 ? `<button class="btn btn--success btn--sm" data-act="sheet" data-sheet="confirmCash" ${ctx}>${ic('check')} Konfirmo: i mora paratë nga ${esc(g.name)}</button>` : `<button class="btn btn--secondary btn--sm btn--fit" data-act="sheet" data-sheet="confirmCash" ${ctx}>${ic('check')} Konfirmo vetëm këtë</button>`}</div>`;
        }).join('')}
        ${g.items.length > 1 ? `<button class="btn btn--success" data-act="sheet" data-sheet="confirmAll" data-inst="${g.installerId}">${ic('check')} Konfirmo të gjitha (${eur(g.sum)}) nga ${esc(g.name)}</button>` : ''}</div></div>`).join('') || `<div class="card"><div class="empty">${ic('check')}<b>Të gjitha paratë janë dorëzuar.</b></div></div>`}
    `;
    return { html, nav: 'dashboard' };
  };

  /* 3. Order detail. Always visible: one alert, the stage, the money, the visits.
   * Everything else is a quiet row that opens in place. */
  SCREENS.order = ([id], q) => {
    if (id === 'new') return newOrderForm();
    const o = OT.order(id);
    if (!o) return { html: pageHead('Porosia nuk u gjet', '#/orders'), nav: 'orders' };
    const c = OT.customer(o.customerId), t = OT.orderTotals(o), proj = OT.isProject(o), today = OT.today();
    const held = o.payments.filter(p => p.heldBy && !p.handedAt);
    const pauseOn = o.pause && o.pause.until >= today;
    const rem = OT.reminderCheck('order', o), last = OT.lastReminder(o);
    const fold = (key, icon, title, sum, body) => `<details class="fold" data-fold="${key}-${o.id}">${foldSummary(icon, title, sum)}<div class="fold__body">${body}</div></details>`;

    /* One alert at a time, most urgent first. */
    let alert = '';
    if (held.length) {
      const names = [...new Set(held.map(p => OT.installerName(p.heldBy)))].join(', ');
      alert = `<section class="alert alert--warning">
        <div class="alert__title">${ic('cash')}<span>${eur(t.held)} te ${esc(names)} · pa dorëzuar ende</span></div>
        <div class="alert__line">Klienti ka paguar. Për t’u mbledhur shtesë: <b class="num">${eur(proj ? t.owed : Math.max(0, t.remaining))}</b></div>
        ${held.map(p => {
          const who = OT.installerName(p.heldBy), ctx = `data-kind="order" data-id="${o.id}" data-pid="${p.id}"`;
          return `<div class="alert__pay"><span class="small">${esc(who)} mori ${eur(p.amount)} kesh nga klienti · ${fmtDay(p.date).toLowerCase()}</span>
            <button class="btn btn--success btn--block" data-act="sheet" data-sheet="confirmCash" ${ctx}>${ic('check')} Konfirmo: i mora paratë nga ${esc(who)}</button></div>`;
        }).join('')}
      </section>`;
    } else if (o.remainingWork) {
      alert = `<section class="alert alert--info"><div class="alert__title">${ic('tool')}<span>Ka punë të mbetura</span></div>
        <div class="alert__line">${esc(o.remainingWork.note)}</div>
        <div class="alert__line xs">Te faqja e klientit hapi i fundit shfaqet “në proces” derisa puna të përfundojë.</div>
        <button class="btn btn--secondary btn--sm btn--fit" data-act="clearRemaining" data-id="${o.id}">${ic('check')} Puna u përfundua</button></section>`;
    }
    const strip = ui.justCreated === o.id && o.payments.length
      ? `<a class="strip" href="#/compose/order/${o.id}?t=deposit"><span class="strip__icon strip__icon--${chOf(c.channel)}">${chIcon(chOf(c.channel))}</span><span class="grow"><b>Falënderoni për ${OT.depositWord().toLowerCase()}in</b> <span class="muted">dhe dërgoni linkun e porosisë</span></span><span class="strip__cta">Shkruaj ${ic('right')}</span></a>` : '';

    /* Stage: a connected stepper, one tap per step */
    const STEP_ICON = { new: 'filePlus', active: 'tool', done: 'flag' };
    const ci = OT.STAGES.indexOf(o.stage);
    const stages = o.stage === 'cancelled'
      ? `<div class="row"><span class="grow">${badge('neutral', 'x', 'Anuluar')}</span><button class="btn btn--secondary btn--sm" data-act="restore" data-id="${o.id}">Rikthe porosinë</button></div>`
      : `<div class="stepper3" role="group" aria-label="Faza">${OT.STAGES.map((k, i) => {
        const cls = i < ci ? 'is-past' : i === ci ? 'is-current' : 'is-future';
        const node = `<button class="st st--${k} ${cls}" ${i === ci ? 'aria-current="step"' : `data-act="stage" data-id="${o.id}" data-k="${k}"`}><span class="st__node">${ic(i < ci || (k === 'done' && i === ci) ? 'check' : STEP_ICON[k])}</span><span class="st__label">${esc(stageLabel(k))}</span></button>`;
        return node + (i < 2 ? `<span class="st__line${i < ci ? ' is-filled' : ''}" style="--from:var(--stage-${k});--to:var(--stage-${OT.STAGES[i + 1]})"></span>` : '');
      }).join('')}</div>`;
    const nv = OT.nextVisit(o), dv = OT.dueVisit(o);
    let info = '';
    if (o.stage === 'done') info = `${stageLabel('done')} ${fmtDate(o.doneAt)}`;
    if (nv) info += `${info ? ' · ' : ''}Vizita e radhës: ${OT.VISIT[nv.type]} ${visitWhen(nv).toLowerCase()} · ${esc(instName(nv.installerId))}`;
    else if (o.stage !== 'done' && o.stage !== 'cancelled') info = info || 'Pa vizitë të planifikuar. Datat janë opsionale.';
    // Project: installed ring + "Montuar vs Paguar" bars, so the gap (owed now) is visible
    const projBlock = proj ? (() => {
      const n = OT.installedQty(o), pq = Math.round(n / o.qty * 100), C = 2 * Math.PI * 30;
      const pI = Math.min(100, Math.round(t.earned / t.total * 100)), pP = Math.min(100, Math.round(t.paid / t.total * 100));
      return `<div class="proj2">
        <div class="ring" role="img" aria-label="${pq}% e montuar"><svg viewBox="0 0 74 74"><circle class="ring__track" cx="37" cy="37" r="30" fill="none" stroke-width="7"/><circle class="ring__fill" cx="37" cy="37" r="30" fill="none" stroke-width="7" stroke-dasharray="${(C * pq / 100).toFixed(1)} ${C.toFixed(1)}"/></svg><span class="ring__label"><b>${n}/${o.qty}</b><small>${esc(o.unit)}</small></span></div>
        <div class="proj2__bars">
          <div class="bar-row"><span>Montuar</span><b>${eur(t.earned)} · ${pI}%</b></div><div class="bar bar--installed"><span style="width:${pI}%"></span></div>
          <div class="bar-row"><span>Paguar</span><b>${eur(t.paid)} · ${pP}%</b></div><div class="bar bar--paid"><span style="width:${pP}%"></span></div>
          <div class="proj2__gap${t.owed > 0 ? '' : ' proj2__gap--ok'}">${t.owed > 0 ? `E montuar, pa paguar: ${eur(t.owed)}` : t.paidAhead ? `Paguar përpara: ${eur(t.paidAhead)}` : 'E montuara është paguar'}</div>
        </div></div>`;
    })() : '';
    let primary = '';
    if (dv && o.stage !== 'cancelled') primary = `<button class="btn btn--primary btn--block" data-act="sheet" data-sheet="done" data-id="${o.id}" data-v="${dv.id}">${ic('check')} ${OT.VISIT_DONE[dv.type]}${dv.date < today ? ` (${fmtDay(dv.date).toLowerCase()})` : ''}</button>`;
    else if (proj && o.stage !== 'done' && o.stage !== 'cancelled') primary = `<button class="btn btn--soft btn--block" data-act="sheet" data-sheet="done" data-id="${o.id}" data-mode="batch">${ic('plus')} Shëno montim</button>`;
    const status = `<section class="card"><div class="card__body">
      <div class="eyebrow">Faza${proj ? ' · projekt me disa montime' : ''}</div>
      ${stages}
      ${projBlock}
      ${info ? `<div class="small muted">${info}</div>` : ''}
      ${primary}
    </div></section>`;

    /* Money: one number first; the arithmetic lives in the fold. */
    let mLabel, mValue, mOf;
    if (proj) { mLabel = 'Për t’u paguar tani'; mValue = t.owed; mOf = t.paidAhead ? `paguar përpara ${eur(t.paidAhead)}` : `paguar ${eur(t.paid)}`; }
    else if (o.stage === 'done') { mLabel = 'Për t’u paguar'; mValue = t.owed; mOf = `nga ${eur(t.total)}`; }
    else { mLabel = 'Mbetur nga totali'; mValue = Math.max(0, t.remaining); mOf = `nga ${eur(t.total)} · paguhet kur të kryhet`; }
    const late = t.dueDate ? OT.diffDays(today, t.dueDate) : null;
    const dueBits = [];
    if (t.owed > 0) {
      dueBits.push(t.dueDate ? `Afati ${fmtDate(t.dueDate)}` : 'Afat i panjohur');
      if (late > 0) dueBits.push(`<span class="danger">${lateSpan(late)} vonesë</span>`);
    } else if (proj && o.payTerm) dueBits.push(`Çdo montim paguhet ${OT.TERMS[o.payTerm].toLowerCase()}`);
    const ledgerRow = (l, v, cls = '') => `<div class="ledger__row ${cls}"><span>${l}</span><span class="num">${v}</span></div>`;
    const ledger = `<div class="ledger">
      ${ledgerRow(proj ? 'Kontrata' : 'Çmimi i marrë vesh', eur(t.total))}
      ${proj ? ledgerRow(`Montuar: ${OT.installedQty(o)} ${esc(o.unit)} × ${eur(OT.unitPrice(o))}`, eur(t.earned)) : ''}
      ${ledgerRow('Klienti ka paguar', eur(t.paid))}
      ${t.held ? ledgerRow('në zyrë', eur(t.inOffice), 'ledger__row--sub') + ledgerRow('te montuesit, pa dorëzuar', eur(t.held), 'ledger__row--sub') : ''}
      ${proj ? ledgerRow('Për t’u paguar tani', eur(t.owed), 'ledger__row--sum') + ledgerRow('Mbetur nga kontrata', eur(Math.max(0, t.remaining))) : ledgerRow('Mbetur', eur(Math.max(0, t.remaining)), 'ledger__row--sum')}
    </div>`;
    const money = `<section class="card"><div class="card__body">
      <div class="row"><span class="eyebrow grow">Pagesa</span>${proj ? '' : payBadge(OT.payStatus(o, t))}</div>
      <div class="money"><span class="money__label">${mLabel}</span>
        <span class="money__value num${mValue <= 0 ? ' money__value--ok' : ''}">${mValue <= 0 ? ic('check') : ''}${eur(mValue)}</span>
        <span class="money__of">${mOf}</span></div>
      ${progress(t, true)}
      ${payLegend(t)}
      ${dueBits.length ? `<div class="row"><span class="small muted grow">${dueBits.join(' · ')}</span>${(o.stage === 'done' || proj) && o.stage !== 'cancelled' ? `<button class="btn btn--ghost btn--sm" data-act="sheet" data-sheet="due" data-kind="order" data-id="${o.id}">Ndrysho afatin</button>` : ''}</div>` : ''}
      ${pauseOn ? `<div class="note-line">${ic('pause')}<span class="grow">Kujtesat në pauzë deri më ${fmtDate(o.pause.until)}: ${esc(o.pause.reason)}</span><button class="btn btn--ghost btn--sm" data-act="unpause" data-kind="order" data-id="${o.id}">Hiq</button></div>` : ''}
      ${c.noReminders ? `<div class="note-line">${ic('bellOff')}<span>Mos sugjero kujtesa për borxh${c.note ? ' · ' + esc(c.note) : ''}</span></div>` : ''}
      ${last ? `<div class="note-line">${ic('message')}<span>Kujtesa e fundit: ${OT.ago(last.date)} · ${CH_NAME[last.channel]}</span></div>` : ''}
      ${t.remaining > 0 || rem.ok ? `<div class="btn-row">${t.remaining > 0 ? `<button class="btn btn--secondary" data-act="sheet" data-sheet="payment" data-kind="order" data-id="${o.id}">${ic('plus')} Regjistro pagesë</button>` : ''}${rem.ok ? `<a class="btn btn--${chOf(c.channel)}" href="#/compose/order/${o.id}?t=reminder">${chIcon(chOf(c.channel))} Kujtesë</a>` : ''}</div>` : ''}
      <details class="fold fold--inline" data-fold="pay-${o.id}">${foldSummary('', 'Pagesat dhe llogaria', `${o.payments.length} pagesa`)}<div class="fold__body">${ledger}
        ${o.payments.length ? `<div>${[...o.payments].sort((a, b) => b.date.localeCompare(a.date)).map(p => paymentRow(p, 'order', o)).join('')}</div>` : '<div class="small muted">Asnjë pagesë ende.</div>'}</div></details>
    </div></section>`;

    /* Visits */
    const open = o.visits.filter(v => !v.doneAt).sort(OT.visitSort);
    const done = o.visits.filter(v => v.doneAt).sort((a, b) => b.doneAt.localeCompare(a.doneAt));
    const visits = `<section class="card"><div class="card__head"><h2 class="card__title">Vizitat</h2>${o.stage !== 'cancelled' ? `<button class="card__link btn--ghost" style="border:0;background:none;cursor:pointer" data-act="sheet" data-sheet="visit" data-id="${o.id}">${ic('plus')} Planifiko</button>` : ''}</div>
      <div class="card__body">
        ${open.length ? `<div class="list list--flush">${open.map(v => visitRow(o, v)).join('')}</div>` : !done.length ? '<div class="small muted">Asnjë vizitë ende. Planifikoni kur ta dini datën.</div>' : ''}
        ${done.length ? `<details class="fold fold--inline" data-fold="visits-done-${o.id}">${foldSummary('', proj ? `Montimet e kryera (${OT.batches(o).length})` : `Të kryera (${done.length})`, '')}<div class="fold__body"><div class="list list--flush">${done.map(v => visitRow(o, v)).join('')}</div></div></details>` : ''}
      </div></section>`;

    /* Quiet rows */
    const maps = mapsIn(o.directions);
    const locBody = `${dirBlock(o)}<div class="small muted">${esc(o.city)}</div>
      ${maps ? `<a class="btn btn--secondary btn--sm btn--fit" href="${esc(maps)}" target="_blank" rel="noopener">${ic('map')} Hap në Maps</a>` : `<div class="xs subtle">Numrat e telefonit këtu hapen me një prekje. Një link i Google Maps shfaqet si “Hap në Maps”.</div>`}`;
    const clientBody = `<div class="contact"><div class="grow"><b>${esc(c.name)}</b><div class="small muted">${OT.fmtPhone(c.phone)}${c.country ? ' · ' + esc(c.country) : ''} · ${CH_NAME[c.channel]}</div>${c.note ? `<div class="xs subtle">${esc(c.note)}</div>` : ''}</div><a class="icon-btn icon-btn--call" href="tel:${esc(c.phone)}" aria-label="Thirr ${esc(c.name)}">${ic('phone')}</a></div>
      <a class="btn btn--${chOf(c.channel)} btn--sm btn--fit" href="#/compose/order/${o.id}">${chIcon(chOf(c.channel))} Shkruaj klientit</a>
      <label class="check"><input type="checkbox" data-act-change="noReminders" data-id="${c.id}" ${c.noReminders ? 'checked' : ''}> Mos sugjero kujtesa për borxh</label>
      <div class="xs subtle">Klienti është ai që paguan dhe merr kujtesat. Personi në vend shkruhet te “Si të shkoni”.</div>`;
    const linkBody = o.token ? `<div class="mono-box">${ic('link')}<span class="ellipsis grow">${esc(OT.trackingUrl(o.token))}</span></div>
        <div class="btn-row"><a class="btn btn--soft btn--sm" href="#/compose/order/${o.id}?t=link">${WA} Dërgo linkun</a><a class="btn btn--secondary btn--sm" href="#/t/${o.token}">${ic('eye')} Parapamje</a></div>
        <button class="btn btn--ghost btn--sm btn--fit" data-act="sheet" data-sheet="newLink" data-id="${o.id}">${ic('refresh')} Link i ri</button>` : '';
    const photoBody = `<div class="photos">
      ${o.photos.map(ph => `<div class="photo"><img src="${ph.src}" alt="${esc(ph.label)}"><span class="photo__label">${esc(ph.label)}</span></div>`).join('')}
      <label class="photo photo--add">${ic('camera')}<span>Shto foto</span><input type="file" accept="image/*" data-photo="order" data-id="${o.id}" data-kind="other"></label>
    </div><div class="xs subtle">Vetëm për ju (p.sh. fleta e matjeve që ju dërgoi montuesi). Klienti nuk i sheh.</div>`;
    const rows = `<section class="card folds">
      ${fold('loc', 'map', 'Ku & si të shkoni', esc([o.city, o.directions].filter(Boolean).join(' · ')), locBody)}
      ${fold('client', 'user', 'Klienti', esc(`${c.name} · ${OT.fmtPhone(c.phone)}`), clientBody)}
      ${o.stage !== 'cancelled' ? fold('link', 'link', 'Faqja e klientit', 'Hapat dhe vizita e radhës, pa çmime', linkBody) : ''}
      ${fold('photos', 'camera', 'Fotot', o.photos.length ? `${o.photos.length} foto` : 'Asnjë foto ende', photoBody)}
      ${o.notes ? fold('notes', 'book', 'Shënim i brendshëm', esc(o.notes), `<div class="small">${esc(o.notes)}</div><div class="xs subtle">Nuk dërgohet as te montuesi, as te klienti.</div>`) : ''}
    </section>`;

    /* Rare actions and the history */
    const act = (attrs, icon, label, sub) => `<button class="action" ${attrs}>${ic(icon)}<span class="grow"><span class="action__label">${label}</span>${sub ? `<span class="action__sub">${sub}</span>` : ''}</span>${ic('right', 'chev')}</button>`;
    const more = `<section class="card folds">
      ${fold('more', 'settings', 'Më shumë veprime', '', `<div class="actions">
        ${act(`data-act="sheet" data-sheet="editOrder" data-id="${o.id}"`, 'edit', 'Ndrysho porosinë', 'Çmimi, produkti, vendi, sasia; çdo ndryshim ruhet në historik')}
        ${(t.owed > 0 || o.stage === 'done') && !pauseOn ? act(`data-act="sheet" data-sheet="pause" data-kind="order" data-id="${o.id}"`, 'pause', 'Pauzo kujtesat deri më…', 'p.sh. klienti premtoi një datë') : ''}
        ${o.stage === 'done' && !o.remainingWork ? act(`data-act="sheet" data-sheet="remainingWork" data-id="${o.id}"`, 'tool', 'Ka punë të mbetura', '') : ''}
        ${o.stage !== 'cancelled' ? act(`data-act="sheet" data-sheet="cancel" data-id="${o.id}"`, 'x', 'Anulo porosinë', 'Mbetet në listë, del nga totalet') : ''}
        ${isOwner() && !o.payments.length ? act(`data-act="sheet" data-sheet="deleteOrder" data-id="${o.id}"`, 'trash', 'Fshij porosinë', 'Vetëm për porosi të krijuara gabimisht') : ''}
      </div>`)}
      ${fold('hist', 'clock', 'Historiku', `${o.events.length} hyrje · vetëm shtohet, nuk fshihet`, timelineHtml(o.events))}
    </section>`;

    const html = `${pageHead(esc(c.name), 'back:#/orders', `${o.number} · ${esc(proj ? o.description.split(' · ')[0] : o.productType)} · ${esc(o.city)}`)}
      <div class="narrow">${alert}${strip}${status}${money}${visits}${rows}${more}</div>`;
    return {
      html, nav: 'orders', frame: 'phone', after: () => {
        // Demo moment 4 opens straight into the "Montimi u krye" sheet.
        const sv = q.get('sheet') === 'done' && q.get('v') && o.visits.find(v => v.id === q.get('v') && !v.doneAt);
        if (sv) { history.replaceState(null, '', `#/order/${o.id}`); openSheet('done', { id: o.id, v: sv.id }); }
        // "Planifiko për të premten" (panel): opens the visit sheet on a date, to show who is free
        if (q.get('sheet') === 'visit' && o.stage !== 'cancelled') { history.replaceState(null, '', `#/order/${o.id}`); openSheet('visit', { id: o.id, date: q.get('date') || '' }); }
      }
    };
  };

  function visitRow(o, v) {
    const today = OT.today(), proj = OT.isProject(o);
    const sub = [instName(v.installerId)];
    if (v.qty) sub.push(`${v.qty} ${o.unit} · ${eur(OT.batchValue(o, v))}`);
    if (v.note) sub.push(v.note);
    if (v.sentAt && !v.doneAt) sub.push(`dërguar ${OT.ago(v.sentAt)}`);
    const when = v.doneAt ? fmtDate(v.doneAt) : visitWhen(v);
    return `<div class="visit vt--${v.type}${v.doneAt ? ' visit--done' : ''}">
      <button class="visit__main" data-act="sheet" data-sheet="visit" data-id="${o.id}" data-v="${v.id}" aria-label="Ndrysho vizitën">
        <span class="visit__icon visit__icon--${v.type}">${ic(OT.VISIT_ICON[v.type])}</span>
        <span class="grow"><b>${OT.VISIT[v.type]}</b> <span class="muted">· ${esc(when)}</span><span class="visit__sub">${esc(sub.join(' · '))}</span></span>
      </button>
      ${v.doneAt ? badge('success', 'check', 'Kryer') : `${v.date <= today ? `<button class="btn btn--soft btn--sm" data-act="sheet" data-sheet="done" data-id="${o.id}" data-v="${v.id}">U krye</button>` : ''}<a class="icon-btn icon-btn--whatsapp" href="#/send/visit/${o.id}/${v.id}" aria-label="Dërgo te montuesi">${WA}</a>`}
    </div>`;
  }

  function paymentRow(p, kind, r) {
    const where = p.heldBy ? (p.handedAt ? `dorëzuar nga ${OT.installerName(p.heldBy)} ${fmtDate(p.handedAt)}` : `te ${OT.installerName(p.heldBy)}, pa dorëzuar`) : 'në zyrë';
    const status = p.heldBy && !p.handedAt ? badge('warning', 'clock', `Te ${OT.installerName(p.heldBy)}`) : '';
    return `<div class="pay"><div class="pay__top"><div class="grow"><div class="pay__amount">${eur(p.amount)}</div><div class="small muted">${OT.METHODS[p.method]} · ${fmtDate(p.date)} · ${esc(where)}</div>${p.note ? `<div class="xs subtle">${esc(p.note)}</div>` : ''}</div>${status}
      <button class="btn btn--ghost btn--sm" data-act="sheet" data-sheet="payment" data-kind="${kind}" data-id="${r.id}" data-pid="${p.id}" aria-label="Ndrysho pagesën">${ic('edit')} Ndrysho</button></div></div>`;
  }

  /* History: append-only, newest first */
  function timelineHtml(events) {
    const evs = [...events].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const kindCls = { money: 'money', warn: 'warn', danger: 'danger', stage: 'stage', msg: 'msg' };
    return `<div class="timeline">${evs.map(e => `<div class="tl tl--${kindCls[e.kind] || ''}"><span class="tl__dot"></span><div><div class="tl__text">${esc(e.text)}</div><div class="tl__meta">${esc(userName(e.by))} · ${fmtDate(e.date)} ${e.time}</div></div></div>`).join('')}</div>`;
  }

  /* Opening balance: form + detail */
  SCREENS.opening = ([id]) => {
    if (id === 'new') return openingForm();
    const ob = OT.opening(id);
    if (!ob) return { html: pageHead('Nuk u gjet', '#/debts'), nav: 'debts' };
    const t = OT.openingTotals(ob), today = OT.today();
    const late = ob.dueDate ? OT.diffDays(today, ob.dueDate) : null;
    const rem = OT.reminderCheck('opening', ob), last = OT.lastReminder(ob);
    const pauseOn = ob.pause && ob.pause.until >= today;
    const wd = ob.workDone || { mode: 'unknown' };
    const html = `${pageHead(esc(ob.name), 'back:#/debts', ob.forWhat ? `Borxh i bartur · ${esc(ob.forWhat)}` : 'Borxh i bartur')}
      <div class="narrow">
      <section class="card"><div class="card__body">
        <div class="row"><span class="eyebrow grow">Borxh i bartur</span>${!ob.dueDate ? badge('neutral', 'help', 'Afat i panjohur') : late > 0 && t.owed > 0 ? badge('danger', '', `Vonesë ${lateSpan(late)}`) : ''}</div>
        <div class="money"><span class="money__label">Mbetur për t’u paguar</span>
          <span class="money__value num${t.owed <= 0 ? ' money__value--ok' : ''}">${t.owed <= 0 ? ic('check') : ''}${eur(t.owed)}</span>
          <span class="money__of">${t.paid > 0 ? `nga ${eur(t.total)}` : ''}</span></div>
        <dl class="kv">
          <dt>Kur u bë puna</dt><dd>${wd.mode === 'date' ? fmtDate(wd.value) : wd.mode === 'month' ? OT.fmtMonth(wd.value) : 'Nuk e di'}</dd>
          <dt>Kur duhej paguar</dt><dd>${ob.dueDate ? (ob.dueApprox ? '≈ ' + OT.fmtMonth(ob.dueDate.slice(0, 7)) : fmtDate(ob.dueDate)) : 'Nuk e di'}</dd>
          <dt>Telefoni</dt><dd>${ob.phone ? OT.fmtPhone(ob.phone) : '—'}</dd>
          <dt>Kujtesat</dt><dd>${rem.ok ? 'mund të dërgoni një tani' : esc(rem.reason)}</dd>
        </dl>
        ${ob.note ? `<div class="note-line">${ic('book')}<span>${esc(ob.note)}</span></div>` : ''}
        ${pauseOn ? `<div class="note-line">${ic('pause')}<span class="grow">Kujtesat në pauzë deri më ${fmtDate(ob.pause.until)}: ${esc(ob.pause.reason)}</span><button class="btn btn--ghost btn--sm" data-act="unpause" data-kind="opening" data-id="${ob.id}">Hiq</button></div>` : ''}
        ${last ? `<div class="note-line">${ic('message')}<span>Kujtesa e fundit: ${OT.ago(last.date)} · ${CH_NAME[last.channel]}</span></div>` : ''}
        ${ob.phone ? `<div class="row"><span class="grow small muted">Kontakto ${esc(ob.name.split(' ')[0])}</span>${reminderBtn(rem, ob.channel, `#/compose/opening/${ob.id}?t=reminder`)}<a class="icon-btn icon-btn--call" href="tel:${esc(ob.phone)}" aria-label="Thirr">${ic('phone')}</a></div>` : ''}
        <div class="btn-row">
          ${t.owed > 0 ? `<button class="btn btn--secondary" data-act="sheet" data-sheet="payment" data-kind="opening" data-id="${ob.id}">${ic('plus')} Regjistro pagesë</button>` : ''}
          ${!ob.dueDate ? `<button class="btn btn--secondary" data-act="sheet" data-sheet="due" data-kind="opening" data-id="${ob.id}">${ic('calendar')} Vendos afatin</button>` : ''}
        </div>
        ${ob.payments.length ? `<div>${ob.payments.map(p => paymentRow(p, 'opening', ob)).join('')}</div>` : ''}
        <p class="xs subtle" style="margin:0">Borxh nga para aplikacionit. Nuk është porosi: s’ka faza, vizita apo faqe për klientin.</p>
      </div></section>
      <section class="card folds">
        <details class="fold" data-fold="ob-more-${ob.id}">${foldSummary('settings', 'Më shumë veprime', '')}<div class="fold__body"><div class="actions">
          ${t.owed > 0 && !pauseOn ? `<button class="action" data-act="sheet" data-sheet="pause" data-kind="opening" data-id="${ob.id}">${ic('pause')}<span class="grow"><span class="action__label">Pauzo kujtesat deri më…</span></span>${ic('right', 'chev')}</button>` : ''}
          <label class="action"><input type="checkbox" data-act-change="obNoReminders" data-id="${ob.id}" ${ob.noReminders ? 'checked' : ''} style="width:20px;height:20px"><span class="grow"><span class="action__label">Mos sugjero kujtesa për borxh</span></span></label>
          ${isOwner() ? `<button class="action" data-act="sheet" data-sheet="deleteOpening" data-id="${ob.id}">${ic('trash')}<span class="grow"><span class="action__label">Fshij borxhin</span><span class="action__sub">p.sh. u shtua dy herë</span></span>${ic('right', 'chev')}</button>` : ''}
        </div></div></details>
        <details class="fold" data-fold="hist-${ob.id}">${foldSummary('clock', 'Historiku', `${ob.events.length} hyrje · vetëm shtohet, nuk fshihet`)}<div class="fold__body">${timelineHtml(ob.events)}</div></details>
      </section>
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

  /* + Porosi e re: five fields and the place. Lands on the new order. */
  const CITIES = ['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Ferizaj', 'Gjilan', 'Mitrovicë', 'Podujevë', 'Vushtrri', 'Suharekë'];
  const COUNTRY = { '+49': 'Gjermani', '+41': 'Zvicër', '+43': 'Austri', '+33': 'Francë', '+46': 'Suedi', '+1': 'SHBA' };
  const phoneField = (name, label, req) => `<div class="field" data-f="${name}"><label class="label" for="f-${name}">${label} ${req ? '<span class="req">*</span>' : '<span class="opt">(opsional)</span>'}</label>
    <div class="input-group"><select class="select" name="${name}Cc" aria-label="Prefiksi">${PHONE_CODES.map(c => `<option>${c}</option>`).join('')}</select><input class="input" id="f-${name}" name="${name}" inputmode="tel" placeholder="44 123 456" autocomplete="off"></div></div>`;
  const projectFields = (o = {}) => `
    <div class="field" data-f="qty"><label class="label" for="f-qty">Sasia <span class="req">*</span></label>
      <div class="row row--wrap"><input class="input" id="f-qty" name="qty" inputmode="numeric" placeholder="p.sh. 100" value="${o.qty || ''}" style="max-width:120px">${radios('unit', OT.UNITS.map(u => [u, u]), o.unit || 'copë')}</div>
      <div class="help">Çmimi për njësi llogaritet vetë: çmimi ÷ sasia.</div></div>
    <div class="field"><span class="label">Çdo montim paguhet</span>${radios('payTerm', [['week', OT.TERMS.week], ['month', OT.TERMS.month], ['unknown', OT.TERMS.unknown]], o.payTerm || 'month')}
      <div class="help">Borxh bëhet vetëm vlera e pjesëve të montuara, jo gjithë kontrata.</div></div>`;
  function newOrderForm() {
    const cat = B.catalog, types = [cat.main.type, cat.second.type, cat.small.type];
    const dw = OT.depositWord();
    const html = `${pageHead('Porosi e re', 'back:#/orders', 'Vetëm bazat. Datat i shtoni kur t’i dini.')}
      <form class="card narrow" data-form="order" novalidate><div class="card__body form">
        <div class="field" data-f="name"><label class="label" for="no-name">Klienti / Kompania <span class="req">*</span></label><input class="input" id="no-name" name="name" autocomplete="off" placeholder="p.sh. Arta Krasniqi" list="no-clients"><datalist id="no-clients">${S.customers.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist>
          <div class="help">Ai që paguan dhe merr kujtesat.</div></div>
        ${phoneField('phone', 'Telefoni', true)}
        <div class="field" data-f="type"><span class="label">Produkti <span class="req">*</span></span>${radios('type', types.map(x => [x, x]), types[0])}
          <input class="input" name="desc" placeholder="Përshkrim i shkurtër (opsional)" autocomplete="off"></div>
        ${money('price', 'Çmimi i marrë vesh <span class="req">*</span>')}
        ${money('deposit', `${dw} <span class="opt">(opsional)</span>`)}
        <div class="field"><span class="label">${dw} u pagua me</span>${radios('method', Object.entries(OT.METHODS), 'cash')}</div>
        <div class="field"><label class="label" for="no-city">Ku bëhet puna</label><select class="select" id="no-city" name="city">${CITIES.map(x => `<option ${x === B.contact.city ? 'selected' : ''}>${x}</option>`).join('')}</select>
          <textarea class="textarea" name="directions" aria-label="Si të shkoni" placeholder="Si të shkoni / pikë referimi, p.sh. Fshati Orllan: te xhamia e vjetër, kthesa e dytë djathtas. Babai në shtëpi: 044 512 330"></textarea>
          <div class="help">Kjo i shkon montuesit në WhatsApp.</div></div>
        <div class="field"><label class="label" for="no-note">Shënim i brendshëm <span class="opt">(opsional, nuk i dërgohet askujt)</span></label><textarea class="textarea" id="no-note" name="note" style="min-height:64px"></textarea></div>
        <label class="check"><input type="checkbox" name="project" value="1"><span>Montohet në disa herë?<span class="check__sub">p.sh. 100 dyer për një ndërtesë në ndërtim</span></span></label>
        <div class="form" data-show-if="project=1">${projectFields()}</div>
        <button class="btn btn--primary btn--lg btn--block" type="submit">Ruaj porosinë</button>
      </div></form>`;
    return { html, nav: 'orders', frame: 'phone', after: () => updateConditionals(document.querySelector('[data-form="order"]')) };
  }
  const digitsOf = v => (v || '').replace(/\D/g, '').replace(/^0+/, '');
  function submitOrder(form) {
    const fd = new FormData(form), err = {}, dw = OT.depositWord();
    const name = (fd.get('name') || '').trim(), phone = digitsOf(fd.get('phone'));
    const price = OT.parseEur(fd.get('price')), depRaw = (fd.get('deposit') || '').trim(), dep = depRaw ? OT.parseEur(depRaw) : 0;
    const project = fd.get('project') === '1', qty = parseInt(fd.get('qty'), 10);
    if (!name) err.name = 'Shkruani emrin e klientit ose të kompanisë.';
    if (!phone) err.phone = 'Shkruani telefonin: mesazhet shkojnë këtu.';
    else if (phone.length < 6 || phone.length > 12) err.phone = 'Numri i telefonit duket i paplotë.';
    if (!price || price <= 0) err.price = fd.get('price') ? 'Shuma nuk është e saktë. Shembull: 4500 ose 4.500' : 'Shkruani çmimin e marrë vesh.';
    if (depRaw && (dep == null || dep <= 0)) err.deposit = 'Shuma nuk është e saktë. Shembull: 1500 ose 1.500';
    else if (price && dep > price) err.deposit = `${dw} nuk mund të jetë më i madh se çmimi.`;
    if (project && !(qty > 1)) err.qty = 'Shkruani sa copë/banesa ka gjithsej (më shumë se 1).';
    if (Object.keys(err).length) return showErrors(form, err);
    const today = OT.today(), cc = fd.get('phoneCc'), full = cc + phone;
    let c = S.customers.find(x => x.name.toLowerCase() === name.toLowerCase() && x.phone === full);
    if (!c) { c = { id: 'c' + Date.now(), name, phone: full, channel: 'whatsapp', lang: 'sq', noReminders: false, note: '', country: COUNTRY[cc] || null }; S.customers.push(c); }
    const max = Math.max(0, ...S.orders.map(x => +x.number.split('-')[1] || 0));
    const o = {
      id: 'o' + Date.now(), number: `${today.slice(0, 4)}-${String(max + 1).padStart(3, '0')}`, customerId: c.id,
      productType: fd.get('type'), description: (fd.get('desc') || '').trim() || fd.get('type'), price, stage: 'new', createdAt: today, doneAt: null,
      city: fd.get('city'), directions: (fd.get('directions') || '').trim(), notes: (fd.get('note') || '').trim(),
      payTerm: project ? fd.get('payTerm') : null, dueDate: null, qty: project ? qty : null, unit: project ? fd.get('unit') : null,
      remainingWork: null, pause: null, token: OT.newToken(), visits: [], payments: [], photos: [], events: [], messages: []
    };
    log(o, `Porosia u krijua · ${eur(price)}${project ? ` · ${qty} ${o.unit}` : ''}`, 'stage');
    if (dep) {
      o.payments.push({ id: 'p' + Date.now(), amount: dep, date: today, time: OT.nowTime(), method: fd.get('method'), heldBy: null, handedAt: null, handedBy: null, by: me().id, note: '' });
      log(o, `${dw} ${eur(dep)} (${OT.METHODS[fd.get('method')].toLowerCase()}) · në zyrë`, 'money');
    }
    S.orders.push(o); save();
    ui.justCreated = o.id;
    toast(`Porosia ${o.number} u krijua.`);
    go('#/order/' + o.id);
  }

  /* Orders: list + board */
  SCREENS.orders = (p, q) => {
    const view = q.get('view') || 'list';
    const F = ui.filters;
    const counts = { '': S.orders.length, new: 0, active: 0, done: 0, project: 0, cancelled: 0 };
    for (const o of S.orders) { counts[o.stage]++; if (OT.isProject(o)) counts.project++; }
    const chips = [['', 'Të gjitha'], ['new', stageLabel('new')], ['active', stageLabel('active')], ['done', stageLabel('done')], ['project', 'Projekte'], ...(counts.cancelled ? [['cancelled', 'Anuluar']] : [])];
    const html = `${pageHead('Porositë', '', `${S.orders.length} porosi`, `<a class="btn btn--primary btn--sm" href="#/order/new">${ic('plus')} Porosi e re</a>`)}
      <div class="search">${ic('search')}<input class="input" type="search" data-search placeholder="Kërko emër, telefon ose numër porosie" value="${esc(F.s)}" aria-label="Kërko"></div>
      <div class="filters">
        <div class="seg seg--inline"><a href="#/orders?view=list" ${view === 'list' ? 'aria-current="page"' : ''}>Lista</a><a href="#/orders?view=kanban" ${view === 'kanban' ? 'aria-current="page"' : ''}>Tabela</a></div>
        ${chips.map(([k, l]) => `<button class="chip" data-act="stageFilter" data-k="${k}" aria-pressed="${F.stage === k}">${esc(l)} <b class="chip__count">${counts[k]}</b></button>`).join('')}
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
      if (F.stage === 'project') return OT.isProject(o);
      if (F.stage && o.stage !== F.stage) return false;
      return true;
    }).sort((a, b) => b.number.localeCompare(a.number));
  }

  const listNote = o => {
    if (OT.isProject(o)) return `${OT.installedQty(o)} / ${o.qty} ${o.unit}`;
    const nv = OT.nextVisit(o);
    if (nv) return `${OT.VISIT[nv.type]} ${visitWhen(nv).toLowerCase()}`;
    if (o.stage === 'done') return `${stageLabel('done')} ${fmtDate(o.doneAt)}`;
    return '';
  };
  function orderResults(view) {
    const list = filteredOrders();
    if (!list.length) return `<div class="card"><div class="empty">${ic('search')}<b>Asnjë porosi nuk përputhet.</b></div></div>`;
    if (view === 'kanban') return kanban(list);
    const rows = list.map(o => ({ o, c: OT.customer(o.customerId), t: OT.orderTotals(o) }));
    const owedCell = (o, t) => t.owed > 0 ? eur(t.owed) : o.stage !== 'done' && t.remaining > 0 ? `<span class="subtle">${eur(t.remaining)}</span>` : '—';
    const barOf = (o, t) => OT.isProject(o) ? `<div class="mini">${projBar(o)}<span class="mini__pct">${OT.installedQty(o)}/${o.qty}</span></div>` : miniBar(t);
    return `<div class="card only-wide table-wrap"><table class="orders-table"><thead><tr><th>Nr.</th><th>Klienti</th><th>Faza</th><th>Pagesa</th><th>E radhës</th><th class="right">Mbetur</th></tr></thead><tbody>
      ${rows.map(({ o, c, t }) => `<tr data-act="open" data-href="#/order/${o.id}"><td class="num strong">${o.number}</td><td><div class="cell-client">${prodAnchor(o)}<div><b>${esc(c.name)}</b><div class="xs subtle">${esc(OT.isProject(o) ? `projekt · ${o.qty} ${o.unit}` : o.productType)} · ${esc(o.city)}</div></div></div></td><td>${badge({ new: 'info', active: 'brand', done: 'success', cancelled: 'neutral' }[o.stage], '', stageLabel(o.stage))}</td><td style="min-width:130px">${barOf(o, t)}</td><td class="small">${esc(listNote(o)) || '—'}</td><td class="right num strong">${owedCell(o, t)}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="card list only-narrow">${rows.map(({ o, c, t }) => `<a class="order-row" href="#/order/${o.id}">${prodAnchor(o)}<div class="order-row__main">
      <div class="order-row__top"><span class="order-row__name">${esc(c.name)}</span>${t.owed > 0 ? `<span class="order-row__amount">${eur(t.owed)}</span>` : badge({ new: 'info', active: 'brand', done: 'success', cancelled: 'neutral' }[o.stage], '', stageLabel(o.stage))}</div>
      <div class="order-row__meta">${o.number} · ${esc(OT.isProject(o) ? o.description.split(' · ')[0] : o.productType)}${listNote(o) && !OT.isProject(o) ? ' · ' + esc(listNote(o)) : ''}</div>
      ${barOf(o, t)}</div></a>`).join('')}</div>`;
  }

  function kanban(list) {
    const cols = OT.STAGES.map(k => ({ k, items: list.filter(o => o.stage === k) }));
    return `<div class="kanban">${cols.map(({ k, items }) => {
      const shown = k === 'done' ? items.filter(o => OT.diffDays(OT.today(), o.doneAt || OT.today()) <= 45) : items;
      return `<section class="kcol"><div class="kcol__head"><span class="kcol__dot" style="background:var(--stage-${k})"></span>${esc(stageLabel(k))}<span class="count">${items.length}</span></div>
        ${shown.map(o => {
          const c = OT.customer(o.customerId), t = OT.orderTotals(o), nv = OT.nextVisit(o);
          const note = OT.isProject(o) ? badge('brand', 'building', `${OT.installedQty(o)} / ${o.qty} ${o.unit}`) : o.remainingWork ? badge('neutral', 'tool', 'Punë të mbetura') : nv ? badge('brand', 'calendar', `${OT.VISIT[nv.type]} ${visitWhen(nv).toLowerCase()}`) : '';
          const next = k === 'new' ? 'active' : k === 'active' && !OT.isProject(o) ? 'done' : null;
          return `<article class="kcard"><a href="#/order/${o.id}"><div class="row"><span class="kcard__num">${o.number}</span><span class="grow"></span>${t.owed > 0 ? `<b class="num small">${eur(t.owed)}</b>` : payBadge(OT.payStatus(o, t))}</div>
            <div class="kcard__name">${esc(c.name)}</div><div class="xs muted">${esc(o.productType)} · ${esc(o.city)}</div></a>
            ${note ? `<div class="badges">${note}</div>` : ''}
            ${next ? `<button class="btn btn--soft btn--sm kcard__next" data-act="stage" data-id="${o.id}" data-k="${next}"><span class="ellipsis">${esc(stageLabel(next))}</span>${ic('right')}</button>` : ''}</article>`;
        }).join('')}
        ${items.length > shown.length ? `<div class="xs subtle" style="padding:4px 8px">+${items.length - shown.length} më të vjetra</div>` : ''}
      </section>`;
    }).join('')}</div>`;
  }

  /* 5. Orari: visits by day, grouped by installer; "Montuesit" shows who is free and who did what */
  SCREENS.schedule = (p, q) => {
    const today = OT.today(), tomorrow = OT.addDays(today, 1);
    const d = q.get('d') || 'today', only = q.get('i');
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(d);
    const tab = isDate ? 'team' : d; // a single day opened from the grid belongs to "Montuesit"
    const seg = `<div class="seg">${[['today', 'Sot'], ['tomorrow', 'Nesër'], ['week', '7 ditë'], ['team', 'Montuesit']].map(([k, l]) => `<a href="#/schedule${k === 'today' ? '' : '?d=' + k}" ${tab === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</div>`;
    if (tab === 'team' && !isDate) return { html: `${pageHead('Orari', '', 'Kush është i lirë dhe kush sa punë ka kryer')}${seg}${teamView()}`, nav: 'schedule' };
    const days = isDate ? [d] : d === 'today' ? [today] : d === 'tomorrow' ? [tomorrow] : Array.from({ length: 7 }, (_, i) => OT.addDays(today, i));
    const past = isDate ? [] : OT.pastUndone();
    const dayBlock = day => {
      const items = OT.visitsOn(day).filter(x => !only || x.v.installerId === only);
      if (!items.length) return d === 'week' ? '' : `<div class="card"><div class="empty">${ic('check')}<b>${isDate ? `${only ? OT.installerName(only) + ' është i lirë' : 'Asnjë punë'} këtë ditë.` : day === today ? 'Sot nuk ka punë të planifikuara.' : 'Nesër nuk ka punë të planifikuara.'}</b>${isDate ? '' : '<span class="small">Planifikoni një vizitë nga faqja e porosisë.</span>'}</div></div>`;
      const groups = [...S.installers.map(i => ({ id: i.id, name: i.name })), { id: null, name: 'Pa montues' }]
        .map(g => ({ ...g, items: items.filter(x => (x.v.installerId || null) === g.id) })).filter(g => g.items.length);
      return `${isDate ? '' : `<h2 class="section-title">${fmtDay(day)} · ${OT.fmtLong(day)}</h2>`}${groups.map(g => {
        const open = g.items.filter(x => !x.v.doneAt);
        const when = day === tomorrow ? 'punët e nesërme' : day === today ? 'punët e sotme' : 'listën';
        const tone = OT.loadTone(g.items.length);
        return `<section class="card"><div class="group-head">${g.id ? avatar(g.name, tone === 'busy' ? 'warning' : '', 'sm') : `<span class="av av--prod av--sm">${ic('help')}</span>`}<span class="grow"><span class="group-head__name">${esc(g.name)}</span> <span class="group-head__count">· ${g.items.length} punë${g.id && tone === 'busy' ? ' · ditë e ngarkuar' : ''}</span></span></div>
          <div class="agenda">${g.items.map(x => agendaItem(x.o, x.v, { doneBtn: true })).join('')}</div>
          ${g.id && open.length && day >= today ? `<div class="card__foot"><a class="btn btn--whatsapp btn--block" href="#/send/day/${g.id}/${day}">${WA} Dërgo ${esc(dative(g.name))} ${when}</a></div>` : ''}</section>`;
      }).join('')}`;
    };
    const top = isDate
      ? `${pageHead(esc(OT.fmtLong(d)), 'back:#/schedule?d=team', 'Punët e ditës')}${seg}${only ? `<a class="filter-chip" href="#/schedule?d=${d}" aria-label="Hiq filtrin">${esc(OT.installerName(only))} ${ic('x')}</a>` : ''}`
      : `${pageHead('Orari', '', 'Matje, montime, dërgesa dhe riparime')}${seg}`;
    const html = `${top}
      ${past.length ? `<h2 class="section-title">Nga ditët e kaluara <span class="count">${past.length}</span></h2><p class="group-help">Vizita të planifikuara që askush nuk i shënoi. Borxhi llogaritet vetëm kur puna shënohet e kryer.</p><section class="card"><div class="agenda">${past.map(x => agendaItem(x.o, x.v, { doneBtn: true, showInstaller: true, timeText: OT.diffDays(today, x.v.date) === 1 ? 'Dje' : fmtDate(x.v.date).slice(0, 5) })).join('')}</div></section>` : ''}
      ${days.map(dayBlock).join('') || `<div class="card"><div class="empty">${ic('check')}<b>Asnjë punë në 7 ditët e ardhshme.</b></div></div>`}
    `;
    return { html, nav: 'schedule' };
  };

  /* Orari → Montuesit: "Kush është i lirë?" (7-day grid) and "Kush sa punë ka kryer" */
  function teamView() {
    const today = OT.today(), tomorrow = OT.addDays(today, 1), days = Array.from({ length: 7 }, (_, i) => OT.addDays(today, i));
    const headRow = `<div class="avail__row"><span></span>${days.map(day => `<span class="avail__day${day === today ? ' avail__day--today' : ''}">${OT.WEEKDAYS_SHORT[OT.parse(day).getDay()]}<small>${OT.parse(day).getDate()}</small></span>`).join('')}</div>`;
    const rows = S.installers.map(i => `<div class="avail__row"><span class="avail__name">${avatar(i.name, '', 'sm')}<span>${esc(i.name)}</span></span>${days.map(day => {
      const n = OT.jobsOn(i.id, day).length;
      return `<a class="avail__cell avail__cell--${Math.min(n, 2)}" href="#/schedule?d=${day}&i=${i.id}" aria-label="${esc(i.name)}, ${OT.fmtLong(day)}: ${n ? n + ' punë' : 'i lirë'}">${n || '—'}</a>`;
    }).join('')}</div>`).join('');
    const grid = `<section class="card"><div class="card__head"><h2 class="card__title">Kush është i lirë?</h2><span class="xs subtle">sot + 6 ditë</span></div>
      <div class="avail">${headRow}${rows}</div>
      <div class="legend avail-legend"><span class="legend__item"><span class="legend__dot ld--free"></span>I lirë</span><span class="legend__item"><span class="legend__dot ld--one"></span>1 punë</span><span class="legend__item"><span class="legend__dot ld--busy"></span>2+ punë</span><span class="legend__item subtle">Prekni një ditë</span></div></section>`;
    const cards = S.installers.map(i => {
      const s = OT.installerSummary(i.id), next = s.upcoming[0], tom = OT.jobsOn(i.id, tomorrow).filter(x => !x.v.doneAt).length;
      const parts = [['install', 'Montime'], ['delivery', 'Dërgesa'], ['measure', 'Matje'], ['repair', 'Riparime']].filter(([k]) => s.done[k])
        .map(([k, l]) => `<span class="badge vt--${k}" style="background:color-mix(in srgb, var(--vt) 12%, var(--color-surface));color:var(--vt)">${l} <b>${s.done[k]}</b></span>`);
      Object.entries(s.units).forEach(([u, n]) => parts.push(`<span class="badge badge--brand">${ic('building')} <b>${n}</b> ${esc(u)} të montuara</span>`));
      return `<section class="card inst">
        <div class="inst__head">${avatar(i.name)}<span class="grow"><span class="inst__name">${esc(i.name)}</span><br><span class="xs muted">${OT.fmtPhone(i.phone)}</span></span>
          ${tom ? `<a class="icon-btn icon-btn--whatsapp" href="#/send/day/${i.id}/${tomorrow}" aria-label="Dërgo ${esc(dative(i.name))} punët e nesërme">${WA}</a>` : ''}<a class="icon-btn icon-btn--call" href="tel:${esc(i.phone)}" aria-label="Thirr ${esc(i.name)}">${ic('phone')}</a></div>
        <div class="stats">
          <div class="stat"><span class="stat__v">${s.upcoming.length}</span><span class="stat__l">Në pritje</span></div>
          <div class="stat stat--ok"><span class="stat__v">${s.doneTotal}</span><span class="stat__l">Të kryera</span></div>
          ${s.held ? `<a class="stat stat--warn" href="#/cash"><span class="stat__v">${eur(s.held)}</span><span class="stat__l">Para në dorë ›</span></a>` : `<div class="stat"><span class="stat__v">€0</span><span class="stat__l">Para në dorë</span></div>`}
        </div>
        ${parts.length ? `<div class="breakdown">${parts.join('')}</div>` : ''}
        ${next ? `<div class="small muted">Puna e radhës: <b>${OT.VISIT[next.v.type]}</b> ${visitWhen(next.v).toLowerCase()} · ${esc(OT.customer(next.o.customerId).name)}</div>` : '<div class="small muted">Asnjë punë e planifikuar.</div>'}
        ${s.unmarked.length ? `<div class="small" style="color:var(--color-warning)">${s.unmarked.length} punë nga ditët e kaluara pa u shënuar</div>` : ''}
      </section>`;
    }).join('');
    return `${grid}<h2 class="section-title">Kush sa punë ka kryer</h2><div class="inst-grid">${cards}</div>`;
  }

  /* Sending to an installer (one visit, or one installer's whole day) */
  SCREENS.send = ([mode, a, b], q) => {
    if (mode === 'visit') {
      const o = OT.order(a), v = o && o.visits.find(x => x.id === b);
      if (!v) return { html: pageHead('Nuk u gjet', '#/schedule'), nav: 'schedule' };
      const instId = q.get('i') || v.installerId || S.installers[0].id, inst = OT.installer(instId);
      const can = OT.collectsCash(v) && OT.toCollect(o) > 0;
      const collect = can && (ui.collect == null ? true : ui.collect);
      return composeScreen({
        kind: 'installer', mode, to: inst, title: `Dërgo ${dative(inst.name)}`, sub: `${OT.VISIT[v.type]} · ${visitWhen(v)} · ${OT.customer(o.customerId).name}`,
        text: OT.installerJobText(o, v, collect), targets: [{ o, v }], assign: instId !== v.installerId ? instId : null,
        pickInstaller: { current: instId, href: i => `#/send/visit/${o.id}/${v.id}?i=${i}` },
        collectToggle: can ? { on: collect, amount: OT.toCollect(o) } : null, back: `back:#/order/${o.id}`
      });
    }
    const inst = OT.installer(a), date = b;
    if (!inst) return { html: pageHead('Nuk u gjet', '#/schedule'), nav: 'schedule' };
    const items = OT.visitsOn(date).filter(x => x.v.installerId === inst.id && !x.v.doneAt);
    const can = items.some(x => OT.collectsCash(x.v) && OT.toCollect(x.o) > 0);
    const collect = can && (ui.collect == null ? true : ui.collect);
    return composeScreen({
      kind: 'installer', mode, to: inst, title: `Dërgo ${dative(inst.name)}`, sub: `${items.length} punë · ${OT.fmtLong(date)}`,
      text: OT.installerDayText(inst, date, items, collect), targets: items, collectToggle: can ? { on: collect, amount: null } : null, back: 'back:#/schedule'
    });
  };

  /* Messages to customers, written from where the owner already is */
  SCREENS.compose = ([kind, id], q) => {
    const r = OT.recOf(kind, id);
    if (!r) return { html: pageHead('Nuk u gjet', '#/debts'), nav: 'debts' };
    const list = OT.templatesFor(kind, r), type = list.includes(q.get('t')) ? q.get('t') : list[0];
    const to = kind === 'opening' ? { name: r.name, phone: r.phone, channel: r.channel || 'whatsapp' } : OT.customer(r.customerId);
    const rc = OT.reminderCheck(kind, r), last = OT.lastReminder(r);
    return composeScreen({
      kind, type, rec: r, to, title: OT.msgLabel(type), sub: kind === 'order' ? `${r.number} · ${to.name}` : `Borxh i bartur · ${to.name}`,
      text: OT.customerText(type, kind, r), back: `back:#/${kind}/${r.id}`,
      templates: list.length > 1 ? { list, current: type, href: t => `#/compose/${kind}/${r.id}?t=${t}` } : null,
      warn: type === 'reminder' && !rc.ok ? rc.reason : '',
      lastLine: type === 'reminder' && last ? `Kujtesa e fundit: ${OT.ago(last.date)} · ${CH_NAME[last.channel]}` : ''
    });
  };

  function composeScreen(m) {
    const ch = ui.channel || chOf(m.to.channel) || 'whatsapp';
    ui.compose = { ...m, ch };
    const tpl = m.templates ? `<div class="chips chips--scroll">${m.templates.list.map(t => `<a class="chip" href="${m.templates.href(t)}"><span style="${t === m.templates.current ? 'background:var(--color-primary);color:var(--color-primary-contrast);border-color:var(--color-primary)' : ''}">${esc(OT.msgLabel(t))}</span></a>`).join('')}</div>` : '';
    const pick = m.pickInstaller ? `<div class="field"><span class="label">Kujt t’ia dërgoj?</span><div class="chips">${S.installers.map(i => `<a class="chip" href="${m.pickInstaller.href(i.id)}"><span style="${i.id === m.pickInstaller.current ? 'background:var(--color-primary);color:var(--color-primary-contrast);border-color:var(--color-primary)' : ''}">${esc(i.name)}</span></a>`).join('')}</div>${m.assign ? `<div class="help">Vizita do t’i caktohet ${esc(dative(m.to.name))}.</div>` : ''}</div>` : '';
    const html = `${pageHead(esc(m.title), m.back, esc(m.sub))}
      <div class="card narrow"><div class="card__body">
        <div class="contact"><div class="grow"><div class="xs subtle">${m.kind === 'installer' ? 'Montuesi' : 'Për'}</div><b>${esc(m.to.name)}</b><div class="small muted">${OT.fmtPhone(m.to.phone)}${m.to.country ? ' · ' + esc(m.to.country) : ''}</div></div><a class="icon-btn icon-btn--call" href="tel:${esc(m.to.phone)}" aria-label="Thirr">${ic('phone')}</a></div>
        ${pick}${tpl}
        ${m.lastLine ? `<div class="note-line">${ic('message')}<span>${esc(m.lastLine)}</span></div>` : ''}
        ${m.warn ? `<div class="callout callout--warning">${ic('alert')}<span><b>Nuk sugjerohet tani:</b> ${esc(m.warn)}. Mund ta dërgoni me dorë nëse vendosni ju.</span></div>` : ''}
        ${m.collectToggle ? `<label class="check"><input type="checkbox" data-act-change="collect" ${m.collectToggle.on ? 'checked' : ''}> Shto “Mblidh${m.collectToggle.amount ? ' ' + eur(m.collectToggle.amount) : ''}” në mesazh</label>` : ''}
        <div class="seg seg--channels" role="group" aria-label="Kanali">${['whatsapp', 'viber', 'sms'].map(c => `<button type="button" class="seg__${c}" data-act="channel" data-ch="${c}" aria-pressed="${c === ch}">${chIcon(c)}<span>${CH_NAME[c]}</span></button>`).join('')}</div>
        <div class="field"><label class="label" for="msg-text">Teksti <span class="opt">(mund ta ndryshoni)</span></label><textarea class="textarea" id="msg-text" rows="10" style="min-height:${m.mode === 'day' ? 320 : 230}px">${esc(m.text)}</textarea></div>
        ${ch === 'viber' ? `<div class="help">Viber nuk lejon tekst të parapërgatitur: teksti kopjohet dhe hapet biseda, ju vetëm e ngjitni.</div>` : ch === 'sms' ? `<div class="help">SMS vetëm si rrugëdalje: te numrat e huaj kushton.</div>` : ''}
        ${m.kind === 'installer' ? `<div class="xs subtle">${icSm('book')} Shënimi i brendshëm i porosisë nuk përfshihet kurrë.</div>` : ''}
        <button class="btn btn--${ch} btn--lg btn--block" data-act="simSend">${chIcon(ch)} ${ch === 'viber' ? 'Kopjo dhe hap Viber' : 'Dërgo me ' + CH_NAME[ch]}</button>
      </div></div>`;
    return { html, nav: m.kind === 'installer' ? 'schedule' : m.kind === 'opening' || m.type === 'reminder' ? 'debts' : 'orders' };
  }

  function linkifyBubble(text) {
    return esc(text).replace(/https?:\/\/[^\s]+/g, u => {
      const m = u.match(/\/t\/([0-9a-f]{32})$/);
      return m ? `<a href="#/t/${m[1]}" data-act="closeSim">${u}</a>` : `<a>${u}</a>`;
    }).replace(PHONE_RE, n => `<a>${n}</a>`);
  }
  function simHtml() {
    const s = ui.sim, cls = s.channel === 'viber' ? ' chat--viber' : s.channel === 'sms' ? ' chat--sms' : '';
    const fromStaff = s.kind === 'installer';
    const avatar = fromStaff ? `<span class="chat__avatar chat__avatar--initial">${esc(me().name[0])}</span>` : `<span class="chat__avatar">${B.logo.svg}</span>`;
    return `<div class="chat${cls}" role="dialog" aria-label="Parapamje e mesazhit">
      <div class="chat__head"><button class="back" style="color:inherit" data-act="simNo" aria-label="Kthehu">${ic('left')}</button>${avatar}<div class="grow"><div class="chat__name">${fromStaff ? `${esc(me().name)} · ${esc(B.shortName)}` : esc(B.companyName)}</div><div class="chat__status">${s.channel === 'sms' ? OT.fmtPhone(B.contact.phone) : 'online'}</div></div></div>
      <div class="chat__body">
        <span class="chat__day">Sot</span>
        <span class="chat__note">Simulim: kështu e sheh <b>${esc(s.to.name)}</b> në telefon. Asgjë nuk u dërgua.${s.channel === 'viber' ? '<br>Në aplikacion: teksti kopjohet dhe hapet Viber.' : ''}</span>
        <div class="bubble">${linkifyBubble(s.text)}<span class="bubble__time">${OT.nowTime()}</span></div>
      </div>
      <div class="chat__foot"><b style="text-align:center">U dërgua?</b><div class="btn-row"><button class="btn btn--success btn--lg" data-act="simYes">${ic('check')} Po, u dërgua</button><button class="btn btn--secondary btn--lg" data-act="simNo">Jo</button></div></div>
    </div>`;
  }

  /* Cilësimet: installers, deposit word, export */
  SCREENS.settings = () => {
    const html = `${pageHead('Cilësimet', '', esc(B.companyName))}
      <section class="card"><div class="card__head"><h2 class="card__title">Përdoruesit</h2></div><div class="card__body">
        <div class="list list--flush">${S.users.map(u => `<div class="list-row list-row--tight"><span class="list-row__icon">${ic('user')}</span><span class="grow"><b>${esc(u.name)}</b> <span class="muted small">· ${ROLE[u.role]}${u.role === S.role ? ' (ju)' : ''}</span></span></div>`).join('')}</div>
        <div class="help">Të dy përdorin të njëjtat ekrane. Vetëm pronari mund të fshijë pagesa, porosi e borxhe, të eksportojë të dhënat dhe të shtojë përdorues.</div>
      </div></section>
      <section class="card"><div class="card__head"><h2 class="card__title">Montuesit</h2><button class="card__link" style="border:0;background:none;cursor:pointer" data-act="sheet" data-sheet="installer">${ic('plus')} Shto</button></div><div class="card__body">
        <div class="list list--flush">${S.installers.map(i => `<div class="list-row list-row--tight"><span class="list-row__icon">${ic('tool')}</span><span class="grow"><b>${esc(i.name)}</b><br><span class="small muted">${OT.fmtPhone(i.phone)} · ${CH_NAME[i.channel]}</span></span><a class="icon-btn icon-btn--call" href="tel:${esc(i.phone)}" aria-label="Thirr ${esc(i.name)}">${ic('phone')}</a></div>`).join('')}</div>
        <div class="help">Montuesit nuk hyjnë në aplikacion: ua dërgoni punët në WhatsApp, ata ju telefonojnë kur mbarojnë.</div>
      </div></section>
      <section class="card"><div class="card__head"><h2 class="card__title">Pamja</h2></div><div class="card__body">
        <div class="seg">${[['light', 'sun', 'Dritë'], ['dark', 'moon', 'Errët']].map(([t, i, l]) => `<button type="button" data-act="setTheme" data-t="${t}" aria-pressed="${themeNow() === t}">${ic(i)} ${l}</button>`).join('')}</div>
        <div class="help">Ruhet në këtë pajisje. Pa zgjedhje, ndjek cilësimin e telefonit.</div>
      </div></section>
      <section class="card"><div class="card__head"><h2 class="card__title">Fjala për paradhënien</h2></div><div class="card__body">
        <div class="seg">${['Avans', 'Kapar'].map(wd => `<button type="button" data-act="depositWord" data-w="${wd}" aria-pressed="${OT.depositWord() === wd}">${wd}</button>`).join('')}</div>
        <div class="help">Përdoret në etiketa dhe mesazhe. Kërkimi pranon të dyja.</div>
      </div></section>
      <section class="card"><div class="card__head"><h2 class="card__title">Eksporto të dhënat</h2></div><div class="card__body">
        ${isOwner() ? `<div class="help">Një skedar Excel me porositë, pagesat, vizitat, borxhet e bartura dhe klientët. Ruajeni ku të doni: është kopja juaj, edhe pa aplikacionin.</div>
          <div class="btn-row"><button class="btn btn--primary" data-act="export" data-f="xlsx">${ic('download')} Excel (.xlsx)</button><button class="btn btn--secondary" data-act="export" data-f="json">${ic('download')} Kopje e plotë (.json)</button></div>`
        : `<div class="callout callout--neutral">${ic('help')}<span>Vetëm pronari mund t’i eksportojë të gjitha të dhënat.</span></div>`}
      </div></section>`;
    return { html, nav: 'settings' };
  };

  /* Customer tracking page: warm, calm, one clear answer to “where is it?” */
  const warmDate = iso => {
    const d = OT.parse(iso), diff = OT.diffDays(iso, OT.today()), base = `${OT.WEEKDAYS[d.getDay()]}, ${d.getDate()} ${OT.MONTHS[d.getMonth()]}`;
    return diff === 0 ? `Sot · ${base.toLowerCase()}` : diff === 1 ? `Nesër · ${base.toLowerCase()}` : base;
  };
  function trackingReassure(o) {
    if (o.stage === 'done') return o.remainingWork ? 'Po kujdesemi për detajet e fundit. Do t’ju njoftojmë sapo të jetë gati.' : 'Shpresojmë që t’ju pëlqejë dhe t’ju shërbejë për shumë vite.';
    if (o.stage === 'active') return OT.isProject(o) ? 'Po montojmë hap pas hapi. Këtu e shihni ecurinë.' : 'Po e përgatisim porosinë tuaj me kujdes.';
    return 'Faleminderit për besimin! Do t’ju njoftojmë kur të fillojmë.';
  }
  SCREENS.t = ([token]) => {
    const o = S.orders.find(x => x.token && x.token === token && x.stage !== 'cancelled');
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
    const c = OT.customer(o.customerId), steps = OT.trackingSteps(o), nv = OT.nextVisit(o);
    const whenLabel = { measure: 'Matja', install: 'Montimi', delivery: 'Dërgesa', repair: 'Vizita jonë' };
    const tl = nv ? OT.timeLabel(nv.time) : '';
    const when = nv ? `<div class="trk-when"><span class="trk-when__icon">${ic('calendar')}</span><div><div class="trk-when__label">${whenLabel[nv.type]}</div><div class="trk-when__date">${esc(warmDate(nv.date))}</div>${tl ? `<div class="trk-when__time">${/^\d/.test(tl) ? 'ora ' + tl : tl}</div>` : ''}</div></div>` : '';
    const stepSub = s => s.state !== 'current' ? '' : s.key === 'done' && o.remainingWork ? 'Po përfundojmë detajet e fundit' : s.key === 'active' && nv ? `${whenLabel[nv.type]}: ${warmDate(nv.date).toLowerCase()}` : 'Tani';
    const n = OT.isProject(o) ? OT.installedQty(o) : 0;
    const html = `<div class="trk">${hero}<main class="trk-body">
      <section class="trk-card trk-status">
        <p class="trk-hello">Përshëndetje, ${esc(OT.firstName(c.name))}!</p>
        <h1 class="trk-title">${esc(OT.trackingHeadline(o))}</h1>
        <p class="trk-reassure">${esc(trackingReassure(o))}</p>
        ${when}
      </section>
      ${OT.isProject(o) ? `<section class="trk-card"><div class="row row--between"><h2 class="trk-h2">Ecuria e montimit</h2><b class="num">${n} / ${o.qty}</b></div><div class="proj__bar proj__bar--lg"><span style="width:${Math.min(100, n / o.qty * 100)}%"></span></div><p class="trk-muted">${n} nga ${o.qty} ${esc(o.unit)} të montuara</p></section>` : ''}
      <section class="trk-card"><h2 class="trk-h2">Ecuria e porosisë</h2>
        <div class="trk-steps">${steps.map(s => `<div class="trk-step trk-step--${s.state}"><span class="trk-step__dot">${s.state === 'done' ? ic('check') : ''}</span><div><div class="trk-step__label">${esc(s.label)}</div>${stepSub(s) ? `<div class="trk-step__sub">${esc(stepSub(s))}</div>` : ''}</div></div>`).join('')}</div>
        <p class="trk-ref">Porosia ${o.number} · ${esc(o.productType)}</p></section>
      ${help}
      <footer class="trk-foot"><span>${esc(B.companyName)} · ${esc(B.contact.address)}</span><span>Kjo faqe është vetëm për ju.</span></footer>
    </main>${back}</div>`;
    return { bare: true, frame: 'phone', html };
  };

  /* ═══════════════════════ SHEETS ═══════════════════════ */
  const head = (title, sub) => `<h2 class="sheet__title">${title}</h2>${sub ? `<p class="sheet__sub">${sub}</p>` : '<div style="height:12px"></div>'}`;
  const actions = (label, cls = 'primary', extra = '') => `<div class="btn-row" style="margin-top:4px"><button class="btn btn--${cls} btn--lg" type="submit">${label}</button><button class="btn btn--secondary btn--lg" type="button" data-act="closeSheet">Anulo</button>${extra}</div>`;
  const money = (name, label, value) => `<div class="field" data-f="${name}"><label class="label" for="m-${name}">${label}</label><div class="money-wrap"><input class="input input--money" id="m-${name}" name="${name}" inputmode="decimal" value="${value != null && value > 0 ? (value / 100).toFixed(value % 100 ? 2 : 0).replace('.', ',') : ''}" autocomplete="off"></div></div>`;
  const reasonField = (name, label, chips = [], ph = '', req = true) => `<div class="field" data-f="${name}"><label class="label">${label} ${req ? '<span class="req">*</span>' : '<span class="opt">(opsionale)</span>'}</label>${chips.length ? `<div class="chips">${chips.map(c => `<button type="button" class="chip" data-act="fillReason" data-target="${name}" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}<input class="input" name="${name}" placeholder="${esc(ph)}" autocomplete="off"></div>`;
  const radios = (name, opts, checked) => `<div class="chips">${opts.map(([v, l]) => `<label class="chip"><input type="radio" name="${name}" value="${v}" ${v === checked ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
  const holderField = (checked, show) => `<div class="field" ${show ? `data-show-if="${show}"` : ''}><span class="label">Ku janë paratë?</span>${radios('holder', [...S.installers.map(i => [i.id, `Te ${i.name}`]), ['office', 'Në zyrë']], checked)}
    <div class="help" data-show-if="holder=office">Në zyrë: i keni marrë ju.</div><div class="help" data-show-if-not="holder=office">Klienti ka paguar. Paratë presin te “Para te montuesit” derisa t’i dorëzojë.</div></div>`;
  const recOf = ctx => OT.recOf(ctx.kind || 'order', ctx.id);
  const termField = (name, checked, withDate, show) => `<div class="field" data-f="${name}" ${show ? `data-show-if="${show}"` : ''}><span class="label">Kur paguan pjesën tjetër?</span>${radios(name, Object.entries(OT.TERMS).filter(([k]) => withDate || k !== 'date'), checked)}
    ${withDate ? `<input class="input" type="date" name="${name}Date" data-show-if="${name}=date" aria-label="Data e pagesës">` : ''}</div>`;
  const newPayment = (amount, holder, method, date) => ({ id: 'p' + Date.now() + Math.floor(Math.random() * 1e3), amount, date: date || OT.today(), time: OT.nowTime(), method: holder && holder !== 'office' ? 'cash' : method || 'cash', heldBy: holder && holder !== 'office' ? holder : null, handedAt: null, handedBy: null, by: me().id, note: '' });
  const payLog = p => p.heldBy ? `Pagesë ${eur(p.amount)} kesh · te ${OT.installerName(p.heldBy)}` : `Pagesë ${eur(p.amount)} (${OT.METHODS[p.method].toLowerCase()}) · në zyrë`;
  /* Installer chips with that date's load, and the helper box under them ("Punët e montuesve") */
  const instChips = (date, selected, exceptId) => `<div class="chips" id="inst-chips">${[...S.installers.map(i => {
    const n = date ? OT.jobsOn(i.id, date, exceptId).length : 0;
    return [i.id, `${esc(i.name)}${date ? ` <span class="load load--${OT.loadTone(n)}">${n ? n + ' punë' : 'i lirë'}</span>` : ''}`];
  }), ['none', 'Pa montues']].map(([v, l]) => `<label class="chip"><input type="radio" name="installer" value="${v}" ${v === selected ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
  const availHelp = (date, selected, exceptId) => {
    if (!date) return '';
    if (!selected || selected === 'none') return `<div class="avail-help"><b>${ic('help')} Pa montues</b><span class="muted">Vizita mbetet e pacaktuar derisa t’ia caktoni dikujt.</span></div>`;
    const l = OT.dayLine(OT.installer(selected), date, exceptId);
    if (l.free) return `<div class="avail-help avail-help--free"><b>${ic('check')} ${esc(l.head)}</b></div>`;
    return `<div class="avail-help avail-help--${OT.loadTone(l.n)}"><b>${ic('calendar')} ${esc(l.head)}</b><ul>${l.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  };
  function refreshAvailability(form, dateChanged) {
    const ctx = (ui.sheet && ui.sheet.ctx) || {}, date = form.querySelector('[name=date]').value;
    const sel = (form.querySelector('[name=installer]:checked') || {}).value;
    if (dateChanged) form.querySelector('#inst-chips').outerHTML = instChips(date, sel, ctx.v);
    form.querySelector('#avail-help').innerHTML = availHelp(date, sel, ctx.v);
  }
  /* + Pagesë from Sot: pick the client, then the payment sheet */
  function pickRows(qs) {
    const s = (qs || '').trim().toLowerCase();
    const rows = [
      ...S.orders.filter(o => o.stage !== 'cancelled').map(o => ({ kind: 'order', r: o, name: OT.customer(o.customerId).name, meta: `${o.number} · ${OT.isProject(o) ? 'projekt' : o.productType}`, t: OT.orderTotals(o) })),
      ...S.openings.map(ob => ({ kind: 'opening', r: ob, name: ob.name, meta: 'Borxh i bartur', t: OT.openingTotals(ob) }))
    ].filter(x => x.t.remaining > 0 && (!s || x.name.toLowerCase().includes(s) || (x.r.number || '').includes(s)))
      .sort((a, b) => b.t.owed - a.t.owed || b.t.remaining - a.t.remaining).slice(0, 30);
    return rows.map(x => `<button type="button" class="list-row" data-act="sheet" data-sheet="payment" data-kind="${x.kind}" data-id="${x.r.id}">${avatar(x.name, x.t.owed > 0 ? 'danger' : '')}<span class="grow"><b>${esc(x.name)}</b><br><span class="small muted">${esc(x.meta)}</span></span><span style="text-align:right"><b class="num">${eur(x.t.owed > 0 ? x.t.owed : x.t.remaining)}</b><br><span class="xs subtle">${x.t.owed > 0 ? 'për t’u paguar' : 'mbetur'}</span></span></button>`).join('') || '<div class="empty small">Askush me pagesë të mbetur.</div>';
  }
  const timeChoice = v => !v || !v.time ? (v ? 'none' : 'morning') : v.time === 'morning' || v.time === 'afternoon' ? v.time : 'exact';

  const SHEETS = {
    payment: {
      render(ctx) {
        const r = recOf(ctx), kind = ctx.kind || 'order', t = OT.totalsOf(kind, r), p = ctx.pid ? r.payments.find(x => x.id === ctx.pid) : null;
        const suggest = p ? p.amount : kind === 'order' && OT.isProject(r) ? (t.owed || 0) : Math.max(0, t.remaining);
        const holder = p ? (p.heldBy || 'office') : 'office', method = p ? p.method : 'cash';
        return head(p ? 'Ndrysho pagesën' : 'Regjistro pagesë', p ? `${eur(p.amount)} · ${fmtDate(p.date)}. Ndryshimi ruhet në historik.` : `Për t’u paguar: ${eur(kind === 'order' && OT.isProject(r) ? t.owed : Math.max(0, t.remaining))}`) +
          money('amount', 'Shuma <span class="req">*</span>', suggest) +
          `<div class="field"><span class="label">Mënyra</span>${radios('method', Object.entries(OT.METHODS), method)}</div>` +
          holderField(holder, 'method=cash') +
          `<div class="field"><label class="label">Data</label><input class="input" type="date" name="date" value="${p ? p.date : OT.today()}" max="${OT.today()}"></div>
           <div class="field"><label class="label">Shënim <span class="opt">(opsional)</span></label><input class="input" name="note" value="${esc(p ? p.note : '')}"></div>` +
          actions(p ? 'Ruaj ndryshimet' : 'Ruaj pagesën') +
          (p ? (isOwner() ? `<button type="button" class="btn btn--ghost-danger btn--sm btn--fit" style="margin-top:8px" data-act="sheet" data-sheet="deletePayment" data-kind="${kind}" data-id="${r.id}" data-pid="${p.id}">${ic('trash')} Fshij pagesën</button>` : `<p class="xs subtle" style="margin:8px 0 0">Vetëm pronari mund ta fshijë një pagesë.</p>`) : '');
      },
      submit(fd, ctx) {
        const r = recOf(ctx), kind = ctx.kind || 'order', t = OT.totalsOf(kind, r), p = ctx.pid ? r.payments.find(x => x.id === ctx.pid) : null;
        const a = OT.parseEur(fd.get('amount')), method = fd.get('method'), holder = method === 'cash' ? fd.get('holder') : 'office';
        const room = t.remaining + (p ? p.amount : 0);
        if (!a || a <= 0) return { amount: 'Shkruani një shumë më të madhe se €0.' };
        if (a > room) return { amount: `Shuma është më e madhe se sa ka mbetur (${eur(room)}).` };
        if (p) {
          const before = { amount: p.amount, method: p.method, heldBy: p.heldBy, date: p.date };
          p.amount = a; p.method = method; p.date = fd.get('date') || p.date; p.note = fd.get('note') || '';
          const newHeld = holder && holder !== 'office' ? holder : null;
          if (newHeld !== p.heldBy) { p.heldBy = newHeld; p.handedAt = null; p.handedBy = null; }
          const ch = [];
          if (before.amount !== p.amount) ch.push(`${eur(before.amount)} → ${eur(p.amount)}`);
          if (before.method !== p.method) ch.push(`${OT.METHODS[before.method].toLowerCase()} → ${OT.METHODS[p.method].toLowerCase()}`);
          if (before.heldBy !== p.heldBy) ch.push(`${before.heldBy ? 'te ' + OT.installerName(before.heldBy) : 'në zyrë'} → ${p.heldBy ? 'te ' + OT.installerName(p.heldBy) : 'në zyrë'}`);
          if (before.date !== p.date) ch.push(`${fmtDate(before.date)} → ${fmtDate(p.date)}`);
          if (ch.length) log(r, `Pagesa u ndryshua: ${ch.join(' · ')}`, 'money');
          toast('Pagesa u ndryshua.');
          return;
        }
        const np = newPayment(a, holder, method, fd.get('date')); np.note = fd.get('note') || '';
        r.payments.push(np);
        log(r, payLog(np), 'money');
        toast(np.heldBy ? `${eur(a)} te ${OT.installerName(np.heldBy)}. Klienti i ka paguar.` : `Pagesa ${eur(a)} u regjistrua.`);
      }
    },
    deletePayment: {
      render(ctx) {
        const r = recOf(ctx), p = r.payments.find(x => x.id === ctx.pid);
        return head('Fshij pagesën?', `${eur(p.amount)} · ${fmtDate(p.date)}`) +
          `<div class="callout callout--neutral">${ic('help')}<span>Pagesa hiqet nga llogaria dhe borxhi rritet përsëri. Në historik mbetet një rresht që tregon se kush e fshiu dhe kur.</span></div>` +
          reasonField('reason', 'Pse?', ['U regjistrua dy herë', 'Shuma e gabuar', 'Porosi e gabuar', 'Klienti nuk pagoi'], '', false) + actions('Fshij', 'danger');
      },
      submit(fd, ctx) {
        if (!isOwner()) return { reason: 'Vetëm pronari mund ta fshijë një pagesë.' };
        const r = recOf(ctx), p = r.payments.find(x => x.id === ctx.pid), reason = (fd.get('reason') || '').trim();
        r.payments = r.payments.filter(x => x !== p);
        log(r, `Pagesa ${eur(p.amount)} e ${fmtDate(p.date)} u fshi${reason ? ': ' + reason : ''}`, 'danger');
        toast('Pagesa u fshi. Ruhet në historik.');
      }
    },
    /* "U krye": the installer's phone call in one sheet. Variants: measurement, repair,
     * a project part, finishing a project, or a normal job (stage → E kryer). */
    done: {
      render(ctx) {
        const o = OT.order(ctx.id), v = ctx.v ? o.visits.find(x => x.id === ctx.v) : null, proj = OT.isProject(o), t = OT.orderTotals(o);
        const c = OT.customer(o.customerId), who = v && v.installerId ? OT.installerName(v.installerId) : '';
        ui.pending = [];
        if (v && v.type === 'measure') {
          return head('Matja u krye?', `${esc(c.name)}${who ? ' · ' + esc(who) : ''}`) +
            `<div class="field"><span class="label">Foto e fletores <span class="opt">(zakonisht jua dërgon montuesi në WhatsApp)</span></span><div class="photos" id="pending-photos">${pendingTiles()}</div></div>
             <div class="field"><label class="label">Shënim i shkurtër <span class="opt">(opsional)</span></label><input class="input" name="note" placeholder="p.sh. priza 2×, uji majtas"></div>` + actions('Po, u krye');
        }
        if (v && v.type === 'repair') {
          return head('Riparimi u krye?', `${esc(c.name)}${who ? ' · ' + esc(who) : ''}`) +
            (o.remainingWork ? `<label class="check"><input type="checkbox" name="finish" value="1" checked><span>Puna u përfundua<span class="check__sub">“Ka punë të mbetura” hiqet</span></span></label>` : '') + actions('Po, u krye');
        }
        if (proj && ctx.mode === 'finish') {
          return head('Projekti përfundoi?', esc(o.description)) +
            `<div class="callout callout--info">${ic('building')}<span>Montuar ${OT.installedQty(o)} nga ${o.qty} ${esc(o.unit)}. Pjesa tjetër e kontratës (${eur(Math.max(0, t.total - t.earned))}) bëhet e pagueshme ${OT.TERMS[o.payTerm || 'month'].toLowerCase()}.</span></div>` + actions('Po, përfundoi');
        }
        if (proj) {
          const left = o.qty - OT.installedQty(o);
          return head(v ? 'Montimi u krye?' : 'Shëno montim', `${esc(o.description)} · montuar ${OT.installedQty(o)} / ${o.qty}`) +
            `<div class="field" data-f="qty"><label class="label" for="s-qty">Sa ${o.unit === 'banesa' ? 'banesa' : o.unit} u montuan? <span class="req">*</span></label><input class="input input--money" id="s-qty" name="qty" inputmode="numeric" placeholder="0" style="max-width:160px"><div class="help">${eur(OT.unitPrice(o))} për ${o.unit === 'banesa' ? 'banesë' : o.unit} · kanë mbetur ${left}</div></div>` +
            (v ? '' : `<div class="field"><label class="label">Data</label><input class="input" type="date" name="date" value="${OT.today()}" max="${OT.today()}"></div>
               <div class="field"><span class="label">Montuesi</span>${radios('installer', S.installers.map(i => [i.id, i.name]), S.installers[0].id)}</div>`) +
            `<details class="fold fold--inline">${foldSummary('', 'Vlerë tjetër për këtë pjesë', 'p.sh. kur dyert kanë çmime të ndryshme')}<div class="fold__body">${money('value', 'Vlera e kësaj pjese')}</div></details>
             <div class="field"><span class="label">A pagoi diçka tani?</span>${radios('pay', [['no', 'Jo'], ['part', 'Po']], 'no')}</div>
             <div class="form" data-show-if="pay=part">${money('amount', 'Shuma')}<div class="field"><span class="label">Mënyra</span>${radios('method', Object.entries(OT.METHODS), 'bank')}</div>${holderField(v && v.installerId ? v.installerId : 'office', 'method=cash')}</div>
             <label class="check"><input type="checkbox" name="finish" value="1"><span>Projekti përfundoi<span class="check__sub">E gjithë kontrata bëhet e pagueshme</span></span></label>` + actions('Ruaj');
        }
        const rem = Math.max(0, t.remaining);
        const title = v ? `${OT.VISIT_DONE[v.type]}?` : `${stageLabel('done')}?`;
        return head(title, `${esc(c.name)} · ${o.number}${who ? ' · ' + esc(who) : ''}`) +
          (rem > 0
            ? `<div class="field" data-f="pay"><span class="label">A pagoi klienti? <span class="muted">Mbetur ${eur(rem)}</span></span>${radios('pay', [['no', 'Jo ende'], ['all', `Po, të gjitha ${eur(rem)}`], ['part', 'Një pjesë']], 'no')}</div>
               <div data-show-if="pay=part">${money('amount', 'Sa pagoi?')}</div>
               ${holderField(v && v.installerId ? v.installerId : 'office', 'pay=all|part')}
               <div class="field" data-show-if="pay=all|part"><div data-show-if="holder=office"><span class="label">Mënyra</span>${radios('method', Object.entries(OT.METHODS), 'cash')}</div></div>
               ${termField('term', 'week', true, 'pay=no|part')}`
            : `<div class="callout callout--success">${ic('check')}<span>Klienti ka paguar gjithçka.</span></div>`) +
          (v ? `<label class="check"><input type="checkbox" name="close" value="1" checked> Porosia është e kryer</label>` : '') +
          actions(v ? 'Ruaj' : 'Po, u krye');
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id), v = ctx.v ? o.visits.find(x => x.id === ctx.v) : null, proj = OT.isProject(o), today = OT.today();
        const who = id => OT.installerName(id);
        if (v && v.type === 'measure') {
          const imgs = ui.pending;
          imgs.forEach((src, i) => o.photos.push({ id: 'ph' + Date.now() + i, src, label: 'Foto e fletores', kind: 'notebook' }));
          v.doneAt = today; const note = (fd.get('note') || '').trim(); if (note) v.note = v.note ? `${v.note} · ${note}` : note;
          log(o, `Matja u krye${v.installerId ? ' · ' + who(v.installerId) : ''}${imgs.length ? ` · ${imgs.length} foto e fletores` : ''}${note ? ' · ' + note : ''}`, 'stage');
          ui.pending = [];
          toast('Matja u shënua e kryer.');
          return;
        }
        if (v && v.type === 'repair') {
          v.doneAt = today; log(o, `Riparimi u krye${v.installerId ? ' · ' + who(v.installerId) : ''}`, 'stage');
          if (fd.get('finish') && o.remainingWork) clearRemaining(o);
          toast('Riparimi u shënua i kryer.');
          return;
        }
        if (proj && ctx.mode === 'finish') {
          o.stage = 'done'; o.doneAt = today; o.payTerm = o.payTerm || 'month';
          log(o, `Faza: ${stageLabel('active')} → ${stageLabel('done')} · projekti përfundoi (${OT.installedQty(o)} / ${o.qty} ${o.unit})`, 'stage');
          toast('Projekti u shënua i kryer.');
          return;
        }
        if (proj) {
          const qty = parseInt(fd.get('qty'), 10), left = o.qty - OT.installedQty(o);
          if (!(qty > 0)) return { qty: 'Shkruani sa u montuan.' };
          if (qty > left) return { qty: `Kanë mbetur vetëm ${left}. Nëse kontrata u rrit, ndryshoni porosinë.` };
          const value = fd.get('value') ? OT.parseEur(fd.get('value')) : null;
          const target = v || (() => { const nv = { id: 'v' + Date.now(), type: 'install', date: fd.get('date') || today, time: null, installerId: fd.get('installer') || null, note: '', doneAt: null, qty: null, value: null, sentAt: null }; o.visits.push(nv); return nv; })();
          target.doneAt = v ? today : target.date; target.qty = qty; target.value = value;
          if (o.stage === 'new') { o.stage = 'active'; log(o, `Faza: ${stageLabel('new')} → ${stageLabel('active')}`, 'stage'); }
          log(o, `Montuar ${qty} ${o.unit}${target.installerId ? ' · ' + who(target.installerId) : ''}${value != null ? ' · vlera ' + eur(value) : ''}`, 'stage');
          if (fd.get('pay') === 'part') {
            const a = OT.parseEur(fd.get('amount'));
            if (!a || a <= 0) return { amount: 'Shkruani shumën.' };
            const np = newPayment(a, fd.get('method') === 'cash' ? fd.get('holder') : 'office', fd.get('method'));
            o.payments.push(np); log(o, payLog(np), 'money');
          }
          if (fd.get('finish')) { o.stage = 'done'; o.doneAt = today; log(o, `Faza: ${stageLabel('active')} → ${stageLabel('done')} · projekti përfundoi`, 'stage'); }
          const t = OT.orderTotals(o);
          toast(`${OT.installedQty(o)} / ${o.qty} ${o.unit} të montuara. Për t’u paguar tani: ${eur(t.owed)}`);
          return;
        }
        // Normal job
        const t0 = OT.orderTotals(o), rem = Math.max(0, t0.remaining), pay = rem > 0 ? fd.get('pay') : 'none';
        let amount = pay === 'all' ? rem : 0;
        if (pay === 'part') {
          amount = OT.parseEur(fd.get('amount'));
          if (!amount || amount <= 0) return { amount: 'Shkruani sa pagoi.' };
          if (amount > rem) return { amount: `Më shumë se sa ka mbetur (${eur(rem)}).` };
        }
        const close = v ? !!fd.get('close') : true, term = fd.get('term') || 'week';
        if (close && rem - amount > 0 && term === 'date' && !fd.get('termDate')) return { term: 'Zgjidhni datën e pagesës.' };
        let np = null;
        if (amount > 0) { np = newPayment(amount, fd.get('holder'), fd.get('method')); o.payments.push(np); log(o, payLog(np), 'money'); }
        if (v) { v.doneAt = today; log(o, `${OT.VISIT_DONE[v.type]}${v.installerId ? ' · ' + who(v.installerId) : ''}`, 'stage'); }
        if (close && o.stage !== 'done') {
          const from = stageLabel(o.stage);
          o.stage = 'done'; o.doneAt = today;
          const left = rem - amount;
          o.payTerm = left > 0 ? term : 'week'; o.dueDate = left > 0 && term === 'date' ? fd.get('termDate') : null;
          log(o, `Faza: ${from} → ${stageLabel('done')}${left > 0 ? ` · pagesa: ${OT.TERMS[o.payTerm].toLowerCase()}${o.dueDate ? ' ' + fmtDate(o.dueDate) : ''}` : ''}`, 'stage');
        }
        const left = OT.orderTotals(o).remaining;
        toast(np && np.heldBy && left <= 0 ? `U ruajt. Klienti ka paguar; ${eur(np.amount)} janë te ${who(np.heldBy)} derisa t’i dorëzojë.` : close ? `${o.number}: ${stageLabel('done')}${left > 0 ? ` · mbetur ${eur(left)}` : ''}` : 'U ruajt.');
      }
    },
    visit: {
      render(ctx) {
        const o = OT.order(ctx.id), v = ctx.v ? o.visits.find(x => x.id === ctx.v) : null;
        const measured = o.visits.some(x => x.type === 'measure');
        const lastInst = (o.visits.filter(x => x.installerId).slice(-1)[0] || {}).installerId || S.installers[0].id;
        const tc = timeChoice(v), date = ctx.date || (v ? v.date : OT.addDays(OT.today(), 1)), sel = v ? (v.installerId || 'none') : lastInst;
        return head(v ? (v.doneAt ? 'Vizita' : 'Ndrysho vizitën') : 'Planifiko vizitë', `${esc(OT.customer(o.customerId).name)} · ${o.number}`) +
          `<div class="field"><span class="label">Çfarë?</span>${radios('type', Object.entries(OT.VISIT), v ? v.type : (o.stage === 'new' && !measured ? 'measure' : 'install'))}</div>
           <div class="field" data-f="date"><label class="label">Data <span class="req">*</span></label><input class="input" type="date" name="date" value="${date}"></div>
           <div class="field"><span class="label">Ora <span class="opt">(opsionale)</span></span>${radios('time', [['morning', 'Paradite'], ['afternoon', 'Pasdite'], ['exact', 'Ora…'], ['none', 'Pa orë']], tc)}
             <input class="input" type="time" name="exact" data-show-if="time=exact" value="${tc === 'exact' ? v.time : '08:00'}" style="max-width:160px"></div>
           <div class="field"><span class="label">Montuesi <span class="opt">· punët në këtë datë</span></span>${instChips(date, sel, v && v.id)}<div id="avail-help">${availHelp(date, sel, v && v.id)}</div></div>
           <div class="field"><label class="label">Shënim për montuesin <span class="opt">(opsional)</span></label><input class="input" name="note" value="${esc(v ? v.note : '')}" placeholder="${OT.isProject(o) ? 'p.sh. Kati 4: 10 dyer' : 'p.sh. Merrni silikon të bardhë'}"></div>` +
          `<div class="btn-row" style="margin-top:4px"><button class="btn btn--primary btn--lg" type="submit" name="then" value="save">Ruaj</button><button class="btn btn--whatsapp btn--lg" type="submit" name="then" value="send">${WA} Ruaj dhe dërgo</button></div>` +
          (v ? `<button type="button" class="btn btn--ghost-danger btn--sm btn--fit" style="margin-top:8px" data-act="removeVisit" data-id="${o.id}" data-v="${v.id}">${ic('trash')} Hiq vizitën</button>` : '');
      },
      submit(fd, ctx, form, submitter) {
        const o = OT.order(ctx.id), v = ctx.v ? o.visits.find(x => x.id === ctx.v) : null;
        const date = fd.get('date'); if (!date) return { date: 'Zgjidhni datën.' };
        const tc = fd.get('time'), time = tc === 'exact' ? fd.get('exact') || null : tc === 'none' ? null : tc;
        const inst = fd.get('installer') === 'none' ? null : fd.get('installer');
        const desc = x => `${OT.VISIT[x.type]} · ${fmtDate(x.date)}${x.time ? ' · ' + OT.timeLabel(x.time) : ''} · ${instName(x.installerId)}`;
        const target = v || { id: 'v' + Date.now(), doneAt: null, qty: null, value: null, sentAt: null };
        const before = v ? desc(v) : '';
        Object.assign(target, { type: fd.get('type'), date, time, installerId: inst, note: (fd.get('note') || '').trim() });
        if (!v) { o.visits.push(target); log(o, `Vizitë e planifikuar: ${desc(target)}`, 'stage'); }
        else if (before !== desc(target)) { target.sentAt = null; log(o, `Vizita u ndryshua: ${before} → ${desc(target)}`, 'stage'); }
        toast(v ? 'Vizita u ruajt.' : `${OT.VISIT[target.type]} u planifikua: ${fmtDay(date).toLowerCase()}.`);
        if (submitter && submitter.value === 'send') return { go: `#/send/visit/${o.id}/${target.id}` };
      }
    },
    editOrder: {
      render(ctx) {
        const o = OT.order(ctx.id), c = OT.customer(o.customerId), cat = B.catalog;
        const types = [...new Set([cat.main.type, cat.second.type, cat.small.type, o.productType])];
        return head('Ndrysho porosinë', `${o.number} · çdo ndryshim ruhet në historik`) +
          `<div class="field" data-f="name"><label class="label">Klienti / Kompania</label><input class="input" name="name" value="${esc(c.name)}"></div>
           <div class="field" data-f="phone"><label class="label">Telefoni</label><input class="input" name="phone" inputmode="tel" value="${esc(OT.fmtPhone(c.phone))}"></div>
           <div class="field"><span class="label">Produkti</span>${radios('type', types.map(x => [x, x]), o.productType)}<input class="input" name="desc" value="${esc(o.description)}"></div>
           ${money('price', OT.isProject(o) ? 'Çmimi i kontratës' : 'Çmimi i marrë vesh', o.price)}
           <div class="field"><label class="label">Arsyeja e ndryshimit të çmimit <span class="opt">(opsionale)</span></label><input class="input" name="priceNote" placeholder="p.sh. +1 dollap"></div>
           <div class="field"><label class="label">Ku bëhet puna</label><select class="select" name="city">${[...new Set([o.city, ...CITIES])].map(x => `<option ${x === o.city ? 'selected' : ''}>${x}</option>`).join('')}</select>
             <textarea class="textarea" name="directions" aria-label="Si të shkoni">${esc(o.directions)}</textarea></div>
           <div class="field"><label class="label">Shënim i brendshëm</label><textarea class="textarea" name="note" style="min-height:64px">${esc(o.notes)}</textarea></div>
           ${OT.isProject(o) ? `<div class="form">${projectFields(o)}</div>` : `<label class="check"><input type="checkbox" name="project" value="1"> Montohet në disa herë?</label><div class="form" data-show-if="project=1">${projectFields()}</div>`}` +
          actions('Ruaj ndryshimet');
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id), c = OT.customer(o.customerId), ch = [];
        const name = (fd.get('name') || '').trim(), price = OT.parseEur(fd.get('price'));
        const raw = (fd.get('phone') || '').replace(/[^\d+]/g, ''), phone = raw.startsWith('+') ? raw : raw ? '+383' + raw.replace(/^0+/, '') : '';
        const project = OT.isProject(o) || fd.get('project') === '1', qty = parseInt(fd.get('qty'), 10);
        if (!name) return { name: 'Shkruani emrin.' };
        if (phone.replace(/\D/g, '').length < 9) return { phone: 'Numri i telefonit duket i paplotë.' };
        if (!price || price <= 0) return { price: 'Shkruani çmimin.' };
        if (project && !(qty > 1)) return { qty: 'Shkruani sasinë (më shumë se 1).' };
        if (project && qty < OT.installedQty(o)) return { qty: `Janë montuar tashmë ${OT.installedQty(o)}.` };
        const set = (obj, key, val, label, fmt = x => x) => { if (obj[key] !== val) { ch.push(`${label}: ${fmt(obj[key]) || '—'} → ${fmt(val) || '—'}`); obj[key] = val; } };
        set(c, 'name', name, 'Klienti'); set(c, 'phone', phone, 'Telefoni', OT.fmtPhone);
        set(o, 'productType', fd.get('type'), 'Produkti'); set(o, 'description', (fd.get('desc') || '').trim(), 'Përshkrimi');
        if (o.price !== price) { const note = (fd.get('priceNote') || '').trim(); ch.push(`Çmimi: ${eur(o.price)} → ${eur(price)}${note ? ' · ' + note : ''}`); o.price = price; }
        set(o, 'city', fd.get('city'), 'Qyteti'); set(o, 'directions', (fd.get('directions') || '').trim(), 'Si të shkoni');
        if (o.notes !== (fd.get('note') || '').trim()) { o.notes = (fd.get('note') || '').trim(); ch.push('Shënimi i brendshëm u ndryshua'); }
        if (project) { set(o, 'qty', qty, 'Sasia'); set(o, 'unit', fd.get('unit'), 'Njësia'); set(o, 'payTerm', fd.get('payTerm'), 'Pagesa e çdo montimi', k => k && OT.TERMS[k].toLowerCase()); }
        ch.forEach(x => log(o, x, x.startsWith('Çmimi') ? 'money' : 'stage'));
        toast(ch.length ? 'Ndryshimet u ruajtën.' : 'Asgjë nuk ndryshoi.');
      }
    },
    stageBack: {
      render(ctx) {
        const o = OT.order(ctx.id);
        return head(`Kthe te “${esc(stageLabel(ctx.k))}”?`, `${o.number} · ${esc(OT.customer(o.customerId).name)}`) +
          `<div class="callout callout--warning">${ic('alert')}<span>Porosia del nga “Kush më ka borxh” derisa të shënohet përsëri e kryer.</span></div>` + actions('Po, kthe');
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id);
        log(o, `Faza: ${stageLabel(o.stage)} → ${stageLabel(ctx.k)}`, 'warn');
        o.stage = ctx.k; o.doneAt = null;
      }
    },
    due: {
      render(ctx) {
        if (ctx.kind === 'opening') return head('Kur duhej paguar?', 'Pas kësaj llogariten ditët e vonesës dhe mund të dërgoni kujtesa.') +
          `<div class="field" data-f="due"><input class="input" type="date" name="due"></div>` + actions('Ruaj afatin');
        const o = OT.order(ctx.id), proj = OT.isProject(o);
        return head(proj ? 'Kur paguhet çdo montim?' : 'Kur paguan pjesën tjetër?', proj ? 'Afati llogaritet nga data e çdo montimi.' : `Llogaritet nga data e përfundimit (${fmtDate(o.doneAt)}).`) +
          termField('term', o.payTerm || 'week', !proj) + actions('Ruaj');
      },
      submit(fd, ctx) {
        if (ctx.kind === 'opening') {
          const ob = OT.opening(ctx.id), due = fd.get('due');
          if (!due) return { due: 'Zgjidhni datën.' };
          log(ob, `Afati u vendos: ${fmtDate(due)} (më parë: ${ob.dueDate ? fmtDate(ob.dueDate) : 'afat i panjohur'})`, 'money');
          ob.dueDate = due; ob.dueApprox = false;
          return;
        }
        const o = OT.order(ctx.id), term = fd.get('term'), date = fd.get('termDate');
        if (term === 'date' && !date) return { term: 'Zgjidhni datën.' };
        o.payTerm = term; o.dueDate = term === 'date' ? date : null;
        log(o, `Afati i pagesës: ${OT.TERMS[term].toLowerCase()}${o.dueDate ? ' ' + fmtDate(o.dueDate) : ''}`, 'money');
      }
    },
    pause: {
      render() {
        return head('Pauzo kujtesat', 'Butoni i gjelbër “Kujtesë” nuk shfaqet deri në këtë datë.') +
          `<div class="field" data-f="until"><label class="label">Deri më <span class="req">*</span></label><input class="input" type="date" name="until" min="${OT.addDays(OT.today(), 1)}" value="${OT.addDays(OT.today(), 14)}"></div>` +
          reasonField('reason', 'Arsyeja', ['Premtoi të paguajë më vonë', 'Punë të mbetura', 'Marrëveshje familjare']) + actions('Pauzo');
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
        const o = OT.order(ctx.id);
        const lastInst = (o.visits.filter(x => x.installerId).slice(-1)[0] || {}).installerId || S.installers[0].id;
        return head('Ka punë të mbetura', 'p.sh. “Një derë duhet rregulluar; klienti paguan €150 e fundit pas rregullimit.”') +
          `<div class="field" data-f="note"><label class="label">Çfarë ka mbetur? <span class="req">*</span></label><textarea class="textarea" name="note"></textarea></div>
           <div class="field"><label class="label">Vizitë riparimi <span class="opt">(opsionale)</span></label><input class="input" type="date" name="visit" min="${OT.today()}"></div>
           <div class="field" data-show-if-filled="visit"><span class="label">Montuesi</span>${radios('installer', S.installers.map(i => [i.id, i.name]), lastInst)}</div>
           <label class="check"><input type="checkbox" name="pause" checked> Pauzo kujtesat për borxh deri në përfundim</label>` + actions('Ruaj');
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id), note = (fd.get('note') || '').trim();
        if (!note) return { note: 'Përshkruani çfarë ka mbetur.' };
        const visit = fd.get('visit');
        o.remainingWork = { note, since: OT.today() };
        log(o, `Ka punë të mbetura: ${note}`, 'warn');
        if (visit) {
          const v = { id: 'v' + Date.now(), type: 'repair', date: visit, time: null, installerId: fd.get('installer'), note: '', doneAt: null, qty: null, value: null, sentAt: null };
          o.visits.push(v); log(o, `Vizitë e planifikuar: Riparim · ${fmtDate(visit)} · ${instName(v.installerId)}`, 'stage');
        }
        if (fd.get('pause')) {
          o.pause = { until: visit ? OT.addDays(visit, 2) : OT.addDays(OT.today(), 14), reason: 'Punë të mbetura' };
          log(o, `Kujtesat në pauzë deri më ${fmtDate(o.pause.until)}: Punë të mbetura`, 'warn');
        }
        toast('U shënua: ka punë të mbetura.');
      }
    },
    confirmCash: {
      render(ctx) {
        const r = recOf(ctx), p = r.payments.find(x => x.id === ctx.pid), who = OT.installerName(p.heldBy);
        return head(`Konfirmo: i mora paratë nga ${esc(who)}`, `${eur(p.amount)} kesh · ${esc(OT.nameOf(ctx.kind || 'order', r))} · ${fmtDate(p.date)}`) +
          `<div class="callout callout--info">${ic('cash')}<span>Konfirmoni vetëm nëse <b>i keni marrë paratë në dorë</b> nga ${esc(who)}. Që klienti ka paguar është regjistruar tashmë.</span></div>` + actions(`Po, i mora ${eur(p.amount)}`, 'success');
      },
      submit(fd, ctx) {
        const r = recOf(ctx), p = r.payments.find(x => x.id === ctx.pid);
        p.handedAt = OT.today(); p.handedBy = me().id;
        log(r, `Konfirmuar: ${me().name} i mori ${eur(p.amount)} nga ${OT.installerName(p.heldBy)}`, 'money');
        toast(`${eur(p.amount)} tani janë në zyrë.`);
      }
    },
    confirmAll: {
      render(ctx) {
        const g = OT.cashWithInstallers().find(x => x.installerId === ctx.inst);
        return head(`Konfirmo të gjitha nga ${esc(g.name)}`, `${g.items.length} pagesa · ${eur(g.sum)}`) +
          `<div class="callout callout--info">${ic('cash')}<span>Konfirmoni vetëm nëse ${esc(g.name)} jua dha <b>${eur(g.sum)}</b> në dorë.</span></div>` + actions(`Po, i mora ${eur(g.sum)}`, 'success');
      },
      submit(fd, ctx) {
        const g = OT.cashWithInstallers().find(x => x.installerId === ctx.inst);
        for (const { p, r } of g.items) { p.handedAt = OT.today(); p.handedBy = me().id; log(r, `Konfirmuar: ${me().name} i mori ${eur(p.amount)} nga ${g.name}`, 'money'); }
        toast(`${eur(g.sum)} tani janë në zyrë.`);
      }
    },
    newLink: {
      render() {
        return head('Link i ri?', 'p.sh. linku u dërgua në numër të gabuar.') +
          `<div class="callout callout--neutral">${ic('link')}<span>Linku i vjetër nuk do të hapet më: tregon vetëm “Ky link nuk është më aktiv. Na kontaktoni.”</span></div>` + actions('Krijo link të ri');
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id);
        S.revokedTokens[o.token] = o.id; ui.lastRevoked = o.token;
        o.token = OT.newToken();
        log(o, 'U krijua link i ri për klientin; linku i vjetër nuk hapet më', 'danger');
        toast('Linku i ri u krijua.');
      }
    },
    cancel: {
      render(ctx) {
        return head('Anulo porosinë?', OT.order(ctx.id).number) +
          `<div class="callout callout--neutral">${ic('help')}<span>Porosia mbetet në listë si “Anuluar”, por del nga borxhet, orari dhe totalet. Mund ta riktheni.</span></div>` +
          reasonField('reason', 'Arsyeja', ['Klienti hoqi dorë', 'U regjistrua dy herë'], '', false) + actions('Anulo porosinë', 'danger');
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id), reason = (fd.get('reason') || '').trim();
        log(o, `Porosia u anulua (ishte: ${stageLabel(o.stage)})${reason ? ': ' + reason : ''}`, 'danger');
        o.prevStage = o.stage; o.stage = 'cancelled';
      }
    },
    deleteOrder: {
      render(ctx) {
        return head('Fshij porosinë?', OT.order(ctx.id).number) +
          `<div class="callout callout--warning">${ic('alert')}<span>Vetëm për porosi të krijuara gabimisht. Fshihet me gjithë vizitat dhe historikun. Nuk kthehet.</span></div>` + actions('Fshij', 'danger');
      },
      submit(fd, ctx) {
        const o = OT.order(ctx.id);
        if (!isOwner() || o.payments.length) return { reason: 'Nuk mund të fshihet.' };
        S.orders = S.orders.filter(x => x !== o);
        toast(`Porosia ${o.number} u fshi.`);
        return { go: '#/orders' };
      }
    },
    deleteOpening: {
      render(ctx) {
        const ob = OT.opening(ctx.id);
        return head('Fshij borxhin?', `${esc(ob.name)} · ${eur(ob.amount)}`) +
          `<div class="callout callout--warning">${ic('alert')}<span>Përdoreni kur borxhi u shtua gabimisht ose dy herë. Nëse klienti pagoi, regjistroni pagesën.</span></div>` + actions('Fshij', 'danger');
      },
      submit(fd, ctx) {
        if (!isOwner()) return {};
        const ob = OT.opening(ctx.id);
        S.openings = S.openings.filter(x => x !== ob);
        toast(`Borxhi i ${ob.name} u fshi.`);
        return { go: '#/debts' };
      }
    },
    installer: {
      render() {
        return head('Shto montues', 'Nuk ka llogari: vetëm emri dhe numri ku i dërgoni punët.') +
          `<div class="field" data-f="name"><label class="label">Emri <span class="req">*</span></label><input class="input" name="name" placeholder="p.sh. Ilir"></div>
           <div class="field" data-f="phone"><label class="label">Telefoni <span class="req">*</span></label><input class="input" name="phone" inputmode="tel" placeholder="044 123 456"></div>
           <div class="field"><span class="label">Merr mesazhe në</span>${radios('channel', [['whatsapp', 'WhatsApp'], ['viber', 'Viber']], 'whatsapp')}</div>` + actions('Shto');
      },
      submit(fd) {
        const name = (fd.get('name') || '').trim(), d = digitsOf(fd.get('phone'));
        if (!name) return { name: 'Shkruani emrin.' };
        if (d.length < 8) return { phone: 'Numri duket i paplotë.' };
        S.installers.push({ id: 'i' + Date.now(), name, phone: '+383' + d.replace(/^383/, ''), channel: fd.get('channel') });
        toast(`${name} u shtua te montuesit.`);
      }
    },
    payPick: {
      render() {
        return head('Regjistro pagesë', 'Zgjidhni klientin. Të parët janë ata që duhet të paguajnë tani.') +
          `<div class="search">${ic('search')}<input class="input" type="search" data-pick-search placeholder="Kërko emër ose numër porosie" autocomplete="off"></div>
           <div class="list" id="pick-list">${pickRows('')}</div>`;
      },
      submit() { return {}; }
    },
    panel: { render: () => panelHtml(), submit() { } }
  };

  function clearRemaining(o) {
    log(o, `Puna u përfundua (punë të mbetura: ${o.remainingWork.note})`, 'stage');
    o.remainingWork = null;
    if (o.pause && o.pause.reason === 'Punë të mbetura') { o.pause = null; log(o, 'Pauza e kujtesave u hoq', 'warn'); }
  }

  function pendingTiles() {
    return ui.pending.map(src => `<div class="photo"><img src="${src}" alt=""></div>`).join('') +
      `<label class="photo photo--add">${ic('camera')}<span>${ui.pending.length ? 'Edhe një' : 'Shto foto'}</span><input type="file" accept="image/*" data-photo="pending"></label>`;
  }

  function openSheet(name, ctx = {}) {
    const root = document.getElementById('sheet-root');
    ui.sheet = { name, ctx };
    root.innerHTML = `<div class="sheet-backdrop" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true"><form class="form" data-sheet="${name}" novalidate>${SHEETS[name].render(ctx)}</form></div>`;
    root.classList.add('open');
    const f = root.querySelector('form'); updateConditionals(f);
    const first = f.querySelector('.input--money, textarea, input:not([type=radio]):not([type=checkbox]):not([type=file]):not([type=date]):not([type=time])');
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
  /** data-show-if="name=a|b" (radio/checkbox value), data-show-if-not, data-show-if-filled="name" */
  function updateConditionals(form) {
    if (!form) return;
    const val = name => { const el = form.querySelector(`input[name="${name}"]:checked`); return el ? el.value : ''; };
    form.querySelectorAll('[data-show-if]').forEach(el => { const [n, v] = el.dataset.showIf.split('='); el.hidden = !v.split('|').includes(val(n)) && !(v === '' && val(n) === ''); });
    form.querySelectorAll('[data-show-if-not]').forEach(el => { const [n, v] = el.dataset.showIfNot.split('='); el.hidden = val(n) === v; });
    form.querySelectorAll('[data-show-if-filled]').forEach(el => { const i = form.querySelector(`[name="${el.dataset.showIfFilled}"]`); el.hidden = !(i && i.value); });
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
    const digits = digitsOf(fd.get('phone'));
    if (digits && (digits.length < 6 || digits.length > 12)) err.phone = 'Numri i telefonit duket i paplotë.';
    if (Object.keys(err).length) return showErrors(form, err);
    const wm = fd.get('workMode');
    const ob = {
      id: 'ob' + Date.now(), name, phone: digits ? fd.get('cc') + digits : '', channel: 'whatsapp', amount,
      forWhat: (fd.get('forWhat') || '').trim(), note: (fd.get('note') || '').trim(), noReminders: false, pause: null, messages: [],
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

  /* ───────── Export ───────── */
  function download(name, data, type) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  function doExport(fmt) {
    if (!isOwner()) return toast('Vetëm pronari mund t’i eksportojë të dhënat.');
    const base = `${B.slug}-te-dhenat-${OT.today()}`;
    if (fmt === 'json') download(`${base}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), company: B.companyName, ...S }, null, 2), 'application/json');
    else download(`${base}.xlsx`, OT.exportXlsx(S, B), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    toast(fmt === 'json' ? 'Kopja e plotë u shkarkua.' : 'Skedari Excel u shkarkua.');
  }

  /* ───────── Toast ───────── */
  let toastTimer;
  function toast(msg) {
    const root = document.getElementById('toast-root'); if (!root) return;
    root.innerHTML = `<div class="toast" role="status">${ic('check')}<span>${esc(msg)}</span></div>`;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { root.innerHTML = ''; }, 3600);
  }

  /* ───────── Prototype panel / bar ───────── */
  /** The sales demo, in order (spec: the four moments) + the project. */
  function moments() {
    const K = S.keyIds, k800 = OT.order(K.k800), lead = S.installers[0];
    const track = OT.order(K.track) || k800, proj = OT.order(K.project);
    const k800Open = k800 && k800.visits.some(v => v.id === K.k800Visit && !v.doneAt);
    return [
      ['1', 'Kush më ka borxh', '#/debts', 'owner'],
      ['2', 'Faqja e klientit', `#/t/${track.token}`, 'client'],
      ['3', `Dërgoja ${dative(lead.name)} në WhatsApp`, `#/send/day/${lead.id}/${OT.addDays(OT.today(), 1)}`, 'owner'],
      ['4', `${lead.name} telefonon: “Mora €800”`, k800Open ? `#/order/${k800.id}?sheet=done&v=${K.k800Visit}` : `#/order/${k800.id}`, 'owner'],
      ['+', proj ? `Projekti: ${B.catalog.project.short}` : 'Projekti', proj ? `#/order/${proj.id}` : '#/orders', 'owner']
    ];
  }
  /** Every Phase 1 case, for review (PHASES.md "Done when"). */
  function jumps() {
    const K = S.keyIds, track = (OT.order(K.track) || {}).token;
    return [
      ['1', 'Sot', '#/dashboard', ''],
      ['2', 'Kush më ka borxh', '#/debts', ''],
      ['3', 'Porosia me €800 (pa sheet)', `#/order/${K.k800}`, ''],
      ['4', 'Para te montuesit', '#/cash', ''],
      ['5', 'Projekti me disa montime', `#/order/${K.project}`, ''],
      ['6', 'Orari · nesër', '#/schedule?d=tomorrow', ''],
      ['7', 'Porosi e re', '#/order/new', ''],
      ['7', 'Borxh i bartur: formulari', '#/opening/new', ''],
      ['8', 'Porositë + tabela (tablet)', '#/orders?view=kanban', ''],
      ['9', 'Faqja e klientit', `#/t/${track}`, 'client'],
      ['9', 'Link jo më aktiv', `#/t/${ui.lastRevoked || K.revoked}`, 'client'],
      ['10', 'Cilësimet & eksporti', '#/settings', ''],
      ['11', 'Montuesit: kush është i lirë', '#/schedule?d=team', ''],
      ['11', 'Planifiko për të premten (disponueshmëria)', `#/order/${K.plan}?sheet=visit&date=${K.busyDay}`, ''],
      ['+', 'Punë të mbetura + pauzë', `#/order/${K.remaining}`, ''],
      ['+', 'Mos sugjero kujtesa (kushëri)', `#/order/${K.cousin}`, ''],
      ['+', 'Pagesë e fshirë + çmim i ndryshuar', `#/order/${K.edited}`, ''],
      ['+', 'Kujtesë e mundshme (20 ditë)', `#/order/${K.overdue}`, '']
    ];
  }
  const linkList = list => `<div class="panel-links">${list.map(([n, l, h, r]) => `<a href="${h}" data-act="jump" data-role="${r || ''}"><b>${n}</b>${esc(l)}</a>`).join('')}</div>`;
  function panelHtml() {
    const wide = window.matchMedia('(min-width: 701px)').matches;
    return head('Prototipi', 'Kontrollet e demos, jo pjesë e aplikacionit.') + `<div class="panel-grid">
      <div class="field"><span class="label">Momentet e demos</span>${linkList(moments())}</div>
      <div class="field"><span class="label">Shiko si</span><div class="seg">${S.users.map(u => `<button type="button" data-act="role" data-role="${u.role}" aria-pressed="${S.role === u.role}">${esc(u.name)} · ${ROLE[u.role]}</button>`).join('')}</div>
        <div class="help">Të njëjtat ekrane. ${esc(S.users[1].name)} nuk mund të fshijë apo eksportojë.</div></div>
      <div class="field"><span class="label">Marka</span><div class="seg">${Object.values(OT.brands).map(b => `<button type="button" data-act="brand" data-slug="${b.slug}" aria-pressed="${b.slug === B.slug}">${esc(b.shortName)}</button>`).join('')}</div></div>
      <div class="field"><span class="label">Pamja</span><div class="seg">${[['light', 'sun', 'Dritë'], ['dark', 'moon', 'Errët']].map(([t, i, l]) => `<button type="button" data-act="setTheme" data-t="${t}" aria-pressed="${themeNow() === t}">${ic(i)} ${l}</button>`).join('')}</div></div>
      <div class="field"><span class="label">Të dhënat</span><div class="seg">${[['0', 'Demo · rastet kryesore'], ['1', 'Test · më shumë porosi']].map(([v, l]) => `<button type="button" data-act="fullData" data-v="${v}" aria-pressed="${!!S.full === (v === '1')}">${l}</button>`).join('')}</div></div>
      <details class="fold fold--inline" data-fold="panel-cases">${foldSummary('', 'Të gjitha rastet', `${jumps().length} ekrane për kontroll`)}<div class="fold__body">${linkList(jumps())}</div></details>
      <div class="field"><span class="label">Data e demos${S.dayOffset ? `: +${S.dayOffset} ditë` : ''}</span><div class="btn-row"><button type="button" class="btn btn--secondary btn--sm" data-act="day" data-n="1">+1 ditë</button><button type="button" class="btn btn--secondary btn--sm" data-act="day" data-n="7">+7 ditë</button><button type="button" class="btn btn--secondary btn--sm" data-act="day" data-n="0">Sot</button></div></div>
      ${wide ? `<div class="field"><span class="label">Korniza</span><div class="seg">${[['auto', 'Auto'], ['phone', 'Telefon'], ['tablet', 'Tablet'], ['none', 'Pa kornizë']].map(([f, l]) => `<button type="button" data-act="frame" data-f="${f}" aria-pressed="${(prefs.frame || 'auto') === f}">${l}</button>`).join('')}</div></div>` : ''}
      <button type="button" class="btn btn--ghost-danger" data-act="reset">${ic('refresh')} Rivendos të dhënat e demos</button>
    </div>`;
  }

  function updateProtoBar() {
    const bar = document.getElementById('proto-bar'); if (!bar) return;
    const persona = location.hash.startsWith('#/t/') ? 'client' : S.role;
    bar.innerHTML = `<span class="proto-bar__title">Prototip</span>
      <select data-pb="brand" aria-label="Marka">${Object.values(OT.brands).map(b => `<option value="${b.slug}" ${b.slug === B.slug ? 'selected' : ''}>${esc(b.shortName)}</option>`).join('')}</select>
      <span class="proto-bar__label">Shiko si</span>
      <span class="proto-seg" role="group" aria-label="Shiko si">${[...S.users.map(u => [u.role, u.name]), ['client', 'Klienti']].map(([p, l]) => `<button data-pb-persona="${p}" aria-pressed="${persona === p}">${esc(l)}</button>`).join('')}</span>
      <span class="proto-bar__moments">${moments().map(([n, l, h, r]) => `<button data-pb-jump="${esc(h)}|${r}"><b>${n}</b>${esc(l)}</button>`).join('')}</span>
      <span class="proto-bar__spacer"></span>
      <button data-pb="theme" aria-label="Dritë / Errët">${ic(themeNow() === 'dark' ? 'sun' : 'moon')} ${themeNow() === 'dark' ? 'Dritë' : 'Errët'}</button>
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
  /** role: 'owner' | 'office' | 'client' (no role change) | '' (keep) */
  function doJump(href, role) {
    if (role === 'owner' || role === 'office') { if (S.role !== role) setRole(role); }
    closeSheet(); ui.sim = null; ui.collect = null; go(href);
  }
  function persona(p) {
    if (p === 'client') return doJump(moments()[1][2], 'client');
    setRole(p); closeSheet();
    if (location.hash.startsWith('#/t/')) go('#/dashboard'); else render();
  }

  /* ═══════════════════════ EVENTS ═══════════════════════ */
  const ACT = {
    sheet: el => openSheet(el.dataset.sheet, { ...el.dataset }),
    closeSheet: () => closeSheet(),
    panel: () => openSheet('panel'),
    open: el => go(el.dataset.href),
    fillReason: el => { const i = el.closest('form').querySelector(`[name="${el.dataset.target}"]`); i.value = el.dataset.v; i.focus(); },
    stage: el => {
      const o = OT.order(el.dataset.id), k = el.dataset.k, from = OT.STAGES.indexOf(o.stage), to = OT.STAGES.indexOf(k);
      if (k === 'done') return openSheet('done', OT.isProject(o) ? { id: o.id, mode: 'finish' } : { id: o.id });
      if (o.stage === 'done') return openSheet('stageBack', { id: o.id, k });
      log(o, `Faza: ${stageLabel(o.stage)} → ${stageLabel(k)}`, to < from ? 'warn' : 'stage');
      o.stage = k; save(); toast(`${o.number}: ${stageLabel(k)}`); render();
    },
    stageFilter: el => { ui.filters.stage = el.dataset.k; render(); },
    restore: el => { const o = OT.order(el.dataset.id); o.stage = o.prevStage || 'active'; log(o, `Porosia u rikthye: ${stageLabel(o.stage)}`, 'stage'); save(); render(); },
    unpause: el => { const r = recOf(el.dataset); log(r, 'Pauza e kujtesave u hoq', 'warn'); r.pause = null; save(); render(); },
    clearRemaining: el => { clearRemaining(OT.order(el.dataset.id)); save(); toast('Puna u përfundua.'); render(); },
    removeVisit: el => { const o = OT.order(el.dataset.id), v = o.visits.find(x => x.id === el.dataset.v); o.visits = o.visits.filter(x => x !== v); log(o, `Vizita u hoq: ${OT.VISIT[v.type]} · ${fmtDate(v.date)}`, 'warn'); closeSheet(); save(); render(); },
    channel: el => { ui.channel = el.dataset.ch; const ta = document.getElementById('msg-text'); const keep = ta ? ta.value : null; render(); if (keep != null) document.getElementById('msg-text').value = keep; },
    simSend: () => { const C = ui.compose, ta = document.getElementById('msg-text'); ui.sim = { ...C, text: ta.value, channel: C.ch }; if (ui.sim.channel === 'viber' && navigator.clipboard) navigator.clipboard.writeText(ta.value).catch(() => { }); $view().insertAdjacentHTML('beforeend', simHtml()); },
    simNo: () => { ui.sim = null; const ch = document.querySelector('.chat'); if (ch) ch.remove(); },
    closeSim: () => { ui.sim = null; },
    simYes: () => {
      const s = ui.sim, chName = CH_NAME[s.channel], today = OT.today();
      if (s.kind === 'installer') {
        for (const { o, v } of s.targets) {
          v.sentAt = today;
          if (s.assign) { v.installerId = s.assign; }
          log(o, `${s.mode === 'day' ? `Lista e ${fmtDate(v.date)}` : `Detajet: ${OT.VISIT[v.type]} ${fmtDate(v.date)}`} u dërguan te ${s.to.name} (${chName})`, 'msg');
        }
      } else {
        s.rec.messages = s.rec.messages || [];
        s.rec.messages.push({ date: today, time: OT.nowTime(), type: s.type, channel: s.channel, by: me().id });
        log(s.rec, `Mesazh ${chName}: ${OT.msgLabel(s.type)} → ${OT.firstName(s.to.name)}`, 'msg');
        if (s.kind === 'opening' || s.type === 'reminder') ui.flash = s.rec.id;
      }
      ui.sim = null; ui.channel = null; ui.collect = null; if (ui.justCreated === (s.rec && s.rec.id)) ui.justCreated = null; save();
      toast(s.kind === 'installer' ? `U regjistrua: dërguar te ${s.to.name}.` : 'U regjistrua në historikun e klientit.');
      goBack(s.back.replace(/^back:/, ''));
    },
    protoBack: el => { if (history.length > 1) history.back(); else go(el.dataset.href); },
    brand: el => { setBrand(el.dataset.slug); closeSheet(); ui.filters = { s: '', stage: '' }; go('#/dashboard'); },
    role: el => { setRole(el.dataset.role); closeSheet(); render(); toast(`Tani: ${me().name} · ${ROLE[S.role]}`); },
    jump: (el, e) => { e.preventDefault(); doJump(el.getAttribute('href'), el.dataset.role); },
    day: el => { const n = +el.dataset.n; S.dayOffset = n === 0 ? 0 : (S.dayOffset || 0) + n; save(); closeSheet(); render(); toast(S.dayOffset ? `Data e demos: +${S.dayOffset} ditë.` : 'Data e demos: sot.'); },
    reset: () => { setBrand(B.slug, true); closeSheet(); ui.sim = null; ui.lastRevoked = null; ui.justCreated = null; toast('Të dhënat e demos u rivendosën.'); go('#/dashboard'); },
    back: (el, e) => { e.preventDefault(); goBack(el.getAttribute('href')); },
    fullData: el => { prefs.full = el.dataset.v === '1'; savePrefs(); setBrand(B.slug, true); closeSheet(); ui.open.clear(); toast(prefs.full ? 'Test: me porosi shtesë.' : 'Demo: rastet kryesore.'); go('#/dashboard'); },
    frame: el => { prefs.frame = el.dataset.f; savePrefs(); closeSheet(); render(); },
    theme: () => { prefs.theme = themeNow() === 'dark' ? 'light' : 'dark'; savePrefs(); applyMode(); render(); if (ui.sheet && ui.sheet.name === 'panel') openSheet('panel'); },
    setTheme: el => { prefs.theme = el.dataset.t; savePrefs(); applyMode(); render(); if (ui.sheet && ui.sheet.name === 'panel') openSheet('panel'); },
    depositWord: el => { S.settings.depositWord = el.dataset.w; save(); render(); toast(`Fjala: “${el.dataset.w}” (kërkimi pranon të dyja).`); },
    export: el => doExport(el.dataset.f),
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
      const res = SHEETS[name].submit(new FormData(form), ui.sheet.ctx, form, e.submitter);
      if (res && !res.go) return showErrors(form, res);
      closeSheet(); save();
      if (res && res.go) go(res.go); else render();
    });
    app.addEventListener('change', async e => {
      const el = e.target;
      const form = el.closest('form'); if (form) updateConditionals(form);
      if (form && form.dataset.sheet === 'visit' && (el.name === 'date' || el.name === 'installer')) refreshAvailability(form, el.name === 'date');
      if (el.dataset.actChange === 'noReminders') { const c = OT.customer(el.dataset.id); c.noReminders = el.checked; S.orders.filter(o => o.customerId === c.id).forEach(o => log(o, el.checked ? 'Klienti u shënua: mos sugjero kujtesa' : 'Kujtesat lejohen përsëri për klientin', 'warn')); save(); render(); }
      if (el.dataset.actChange === 'obNoReminders') { const ob = OT.opening(el.dataset.id); ob.noReminders = el.checked; log(ob, el.checked ? 'U shënua: mos sugjero kujtesa' : 'Kujtesat lejohen përsëri', 'warn'); save(); render(); }
      if (el.dataset.actChange === 'collect') { ui.collect = el.checked; const ta = document.getElementById('msg-text'); render(); if (ta) document.getElementById('msg-text').focus(); }
      if (el.matches('input[type=file][data-photo]') && el.files && el.files[0]) {
        let src;
        try { src = await compress(el.files[0]); } catch (err) { toast('Foto nuk u lexua.'); return; }
        if (el.dataset.photo === 'pending') { ui.pending.push(src); document.getElementById('pending-photos').innerHTML = pendingTiles(); return; }
        const o = OT.order(el.dataset.id);
        o.photos.push({ id: 'ph' + Date.now(), src, label: 'Foto', kind: 'other' });
        log(o, 'U shtua një foto'); save(); render(); toast('Foto u shtua (e kompresuar në telefon).');
      }
      if (el.closest('.field.has-error')) { const f = el.closest('.field.has-error'); f.classList.remove('has-error'); f.querySelectorAll('.error').forEach(x => x.remove()); }
    });
    app.addEventListener('input', e => {
      if (e.target.matches('[data-search]')) { ui.filters.s = e.target.value; refreshOrders(); }
      if (e.target.matches('[data-pick-search]')) document.getElementById('pick-list').innerHTML = pickRows(e.target.value);
      if (e.target.name === 'date' && e.target.closest('form[data-sheet="visit"]')) refreshAvailability(e.target.closest('form'), true);
      const form = e.target.closest('form'); if (form && e.target.type === 'date') updateConditionals(form);
      const f = e.target.closest('.field.has-error'); if (f) { f.classList.remove('has-error'); f.querySelectorAll('.error').forEach(x => x.remove()); }
    });
    window.addEventListener('hashchange', () => {
      const h = location.hash.split('?')[0];
      if (ui.stack[ui.stack.length - 2] === h) ui.stack.pop(); else ui.stack.push(h);
      ui.channel = null; closeSheet(); if (!location.hash.startsWith('#/t/')) ui.sim = null;
      if (!h.startsWith('#/send/')) ui.collect = null;
      render();
    });

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
      if (b.dataset.pb === 'theme') ACT.theme();
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
  // With no saved choice, follow the device's light/dark setting live.
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!prefs.theme) { applyMode(); render(); } });
  bind();
  render();
})();
