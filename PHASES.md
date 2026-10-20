# Order Tracking: phases

The product spec is [order_tracking_instructions.md](order_tracking_instructions.md). This file says **in which order** it gets built. Each phase ends with a clear check. Don't start the next phase until that check passes and I've approved it.

The app is built as a finished-looking demo that I show and sell to owners. It doesn't need every feature at once; the spec's "Out of scope" list stays out until a client needs it.

| # | Phase | Result | Status |
|---|---|---|---|
| 1 | Interactive HTML prototype | Clickable version of the key screens, for me to feel the workflow | **Approved 19.10.2026**: v10 (commit `b861ff6`) is the design baseline for all phases. Physical-phone check still pending |
| 2 | Foundation | Running app shell: brand, auth (Pronari/Zyra), i18n, `/setup`, first fixtures | Built 19.10.2026 (app on port 3100). Independent review: two P2 findings (phone logout, brand text contrast) and the setup i18n tidy-up fixed and verified 19.10.2026 |
| 3 | Orders & money core | Orders, 3 stages, projects, payments, cash with installers, opening balances, debts list, Sot, export | Built 19.10.2026. Review fixes (form values kept on errors, "Ndrysho borxhin", part corrections) done and committed 19.10.2026 |
| 4 | Orari, WhatsApp & tracking page | Visits, installers, job sharing, customer messages, tracking page, on a temporary HTTPS test deployment | Built 19.10.2026 (no photos). Review fixes (correcting done visits, reminder timing on the demo date) done and redeployed 19.10.2026; waiting for my phone checks + approval |
| 5 | Demo-ready | Full seed data, demo mode, polished sales environment, QR flow, PWA, pitch kit | Built 20.10.2026 ([docs/phase-5-notes.md](docs/phase-5-notes.md)); online demo updated. Waiting for my physical-phone checks (Phase 4's and Phase 5's) and approval |
| 6 | Production readiness & first client | Backups, tested restore, real auth, pilot checkpoint passed | Not started |

## Rules for every phase

### How we work
1. When I give new feedback, discuss and confirm the plan before coding (unless I say "go ahead").
2. End every turn with a plain-text report and any remaining questions in plain text at the bottom (no answer buttons at the end of a turn). **During a task**, questions may use the selectable prompt (AskUserQuestion), with the recommended option first and marked "(Recommended)".
3. Always work directly on `main`. Never create branches. Commit only when I ask.
4. Ask all foreseeable clarification, permission, and folder-access questions at the start of the task, before implementation. Once resolved, proceed independently within the agreed scope. Ask again only if a genuinely new blocker or consequential decision appears.

### Report at the end of each phase
When a phase is finished, tell me:
1. **What was built**: the features and screens, in plain words, and anything from the phase that was left out or changed (and why).
2. **How to run it**: the exact commands, the URL to open, and the demo logins if there are any.
3. **What to test manually**: a short checklist of things to click through, including the tricky cases (e.g. the €800 cash-with-installer case, a project that is paid ahead).
4. **What the next phase is**: what it contains and anything you need from me before starting it.

Then update the status column in the table above.

### Folder layout
```
/Order tracking
  order_tracking_instructions.md   spec
  PHASES.md                        this file
  prototype/                       Phase 1, static HTML; design reference
  docs/                            phase plans (e.g. phase-2-plan.md)
  (Next.js app at the root)        Phases 2–6
```
- `prototype/` is **standalone**: plain HTML/CSS/JS, no `package.json`, no shared code with the app, opened directly in the browser.
- The app must not import anything from `prototype/`. Exclude it from the app's TypeScript, ESLint, tests and build so the two never interfere.
- Keep `prototype/` in the repo after Phase 1 as the visual reference. It is not updated as the app evolves unless I ask.

### Design baseline (approved 19.10.2026)
The integrated **v10 prototype** in `prototype/` (commit `b861ff6`) is the approved design baseline for every phase. The finished app must match its **appearance, layouts, navigation, wording and interactions**:
- Shell: on laptop/tablet a sidebar with Sot · Porositë · Borxhet · Orari, then Para te montuesit, Cilësimet and the signed-in user; on phones (narrower than 700px) a header (logo, company, role · name, moon/sun, gear) and a bottom tab bar with Sot · Porositë · Borxhet · Orari.
- Tokens: `prototype/css/tokens.css` (v10 palette, 14px body / 16px form inputs on phones, small radii, 44px touch targets, the dark set under `[data-theme="dark"]`, derived brand ink/fill shades).
- Wording: the v10 labels (see the table in `prototype/README.md`, e.g. "Borxhet", "Bordi", "Disponueshmëria", "Adresa dhe udhëzimet"). The spec's business rules, stage keys and customer-facing texts are unchanged.
- Interactions: bottom sheets with a close button, Escape to close, the page behind them inert; solid brand fill for every selected state.
- Prototype-only chrome (the laptop demo bar, "Shiko si", the device frame, the avatar panel) is not part of the app; its demo functions arrive in Phase 5 as demo mode.

Where the app has to differ (a real form needs more fields, a technical limit), keep the prototype's look and say what changed in the phase report.

### Test fixtures (from Phase 2 on)
The full realistic seed dataset comes in Phase 5. Before that, keep a **small, repeatable fixture set** loaded by one command (e.g. `pnpm fixtures`), so every phase review starts from the same known records instead of recreating them by hand. All data is fictional.
- Phase 2: one Pronari and one Zyra account, one brand, three installers (contacts with phones).
- Phase 3 adds: one normal order going through the three stages, **the €800 case** (recorded "Te montuesi"), cash not handed over for weeks, an overdue order, a client marked "Mos sugjero kujtesa", an opening balance with a known due date and one with "Nuk e di", a done order with remaining work and paused reminders, a village job with only a "Si të shkoni" description, a **multi-unit project** with several installed parts and partial payments (owing money, and one paid ahead), an edited and a deleted payment.
- Phase 4 adds: visits today, tomorrow and from yesterday (not marked done), a realistic 7-day spread for three installers (on the coming Friday Driton has 2 jobs and Faton is free), tracking links for those orders (one replaced), and reminder history (one sent 3 days ago, one 20 days ago).
- The same fixtures are used by the automated tests and the manual checklist in the phase report.
- Phase 5 adds the full demo data separately (`pnpm demo`, "Rivendos demon"); the small fixture set stays for the regression tests.

---

## Phase 1: Interactive HTML prototype

**Goal:** for me to see and feel the app and check that the workflow is right before writing the real app. It's cheap to change or throw away.

**Build** (in `prototype/`):
- Static HTML/CSS/JS, no backend, no build step, fake data in a JS file, works offline.
- Albanian only. Two sample brands with a brand switcher, to prove the white-label look. One brand uses "Avans", the other "Kapar".
- WhatsApp is the large primary contact button on every screen; Viber secondary; SMS only a small fallback.
- Phone layout for owner and customer screens, tablet layout for the order board. A device-frame toggle for reviewing layout on a laptop.
- Build it with the design tokens (colors as CSS variables, spacing, type scale, light and dark sets) the app will use, so the design can be carried over directly. Inter is loaded from Google Fonts in the prototype only; the app self-hosts it.

**Screens and flows:**
1. **Sot**: the "Kush më ka borxh" headline ("Borxhet" since v10), "Kërkon vëmendje" (cash with installers, past visits not marked done, reminders possible now), today's visits.
2. **"Kush më ka borxh"** ("Borxhet" since v10) with the three groups, one status line per row, the green "Kujtesë" only where a reminder is reasonable, and "Kujtesa e fundit".
3. **Order detail**: the three-stage control, money, visits, quiet rows (place & directions, client, tracking link, photos, internal note, history), Ndrysho, payments with edit/delete.
4. **The €800 call**: "Montimi u krye" → "Po, të gjitha €800" · "Te Driton" → the order is done, owed €0, the €800 under "Para te montuesit" → "Konfirmo: i mora paratë nga Driton".
5. **A multi-unit project**: progress "40 / 100 copë", "Shëno montim", owed now = installed value − paid, "Paguar përpara".
6. **Orari**: today / tomorrow / 7 days by installer, "Nga ditët e kaluara", and **"Dërgo Dritonit punët e nesërme"** → simulated WhatsApp preview.
7. **+ Porosi e re** (five fields, the project switch) and **Borxh i bartur** with "Kur duhej paguar?", including "Nuk e di".
8. Order list with search and stage chips + three-column board (tablet).
9. **Customer tracking page** (responsive), branded, three steps, next visit, project progress, plus the "link no longer active" page.
10. **Cilësimet**: installers, Avans/Kapar, "Pamja: Dritë / Errët", "Eksporto të dhënat" (a real .xlsx and a .json), and what Zyra can't do.
11. **Punët e montuesve**: live availability on the installer chips in "Planifiko vizitë" (with the helper box for the selected installer), and Orari → "Montuesit": the 7-day "Kush është i lirë?" grid ("Disponueshmëria" since v10) and the per-installer summary ("Përmbledhja e montuesve") (Në pritje, Të kryera, Para në dorë).
12. **Visual design and Night Mode**: every screen above in light and dark, switched with the moon/sun button in the header.

**Done when:**
- I can click through the four demo moments and the project without dead ends, as Arben and as Teuta.
- The tracking page and the simulated message previews look right at phone width.
- Every screen is readable in both light and dark mode, for both brands.
- The exported .xlsx opens in Excel/Numbers with readable sheets.
- I've opened the prototype on **my own physical phone** (served from the laptop over local Wi-Fi, e.g. `python3 -m http.server` in `prototype/`) and the phone screens are comfortable to use with a thumb. The laptop device frame only reviews layout; it doesn't prove usability on a phone. **Still pending** (not yet done as of 19.10.2026); approval was given without it, so findings from it are fed into the app phases.
- I've said the workflow is right.

Real delivery (a tracking link opened on another phone, a message that actually arrives) is **not** part of Phase 1; that is checked in Phase 4.

**After approval:** I'll mark the prototype as approved here. From then on, **the app's design follows the prototype**: layout, navigation, components, colors and wording are adopted from `prototype/`. Where the app has to differ (a real form needs more fields, a technical limit), keep the prototype's look and say what changed in the phase report.

> Prototype approved: **19.10.2026, v10** (commit `b861ff6`, "Prototype v10: integrate the approved redesign"), as the design baseline for all future phases; see "Design baseline" above. Physical-phone validation: **still pending**.

---

## Phase 2: Foundation

Spec sections: Tech stack, White-label brand system, Users, Language & locale, Permissions.
- Next.js + TypeScript + Tailwind/shadcn, Drizzle + PGlite locally, Better Auth with the Pronari and Zyra roles, next-intl (Albanian), Serwist PWA shell.
- **brand.json v2** schema (zod), theming with CSS variables taken from the prototype's tokens (light and dark sets, brand ink/fill shades for dark mode), Inter self-hosted, the theme toggle with no flash on load, neutral fallback brand, `/setup` with logo color extraction.
- Layout shell and navigation matching the v10 prototype: sidebar on laptop/tablet (Sot · Porositë · Borxhet · Orari, Para te montuesit, Cilësimet, signed-in user), header + bottom tab bar on phones (Cilësimet and the moon/sun in the header).
- First fixtures: the two accounts, one brand, three installers.
- Data model (Drizzle schema) and folder structure shown to me **before** coding.

**Done when:** I can log in as Pronari and as Zyra (from the fixtures) on a rebranded shell that looks like the v10 prototype in light and dark mode, offline, on my laptop.

## Phase 3: Orders & money core

Spec sections: 1 Sot, 2 Borxhet, 3 Orders, 4 Payments & debts, 9 Export, Permissions. This is the heart of the product, so most of the tests live here.
- Clients, orders (five-field form), three stages by key, the "E kryer" sheet with the payment term, multi-unit projects with installed parts, remaining work, reminder pause, order edits, history.
- Payments with "Në zyrë" / "Te montuesi", Konfirmo (one / all), edit and delete with history, balances, owed now for orders and projects, due dates, overdue logic.
- **Opening balances (borxh i bartur)** with known or unknown due dates.
- Debts list and Sot (the reminder button rule is in Phase 4).
- **Export**: the .xlsx and the JSON copy.
- Phase 3 fixtures.

**Done when:**
- All balance, project, overdue, stage and permission tests pass, including the €800 case and cash not handed over.
- A short **browser walkthrough** on the fixtures shows the same through the real screens: balances add up, a project's owed-now and paid-ahead amounts are right, an edited and a deleted payment behave correctly and show in the history, Zyra can't delete or export, and the exported Excel opens with the same numbers.

## Phase 4: Orari, WhatsApp & tracking page

Spec sections: 5 Orari & installers, 6 Customer tracking page, 7 Messages to customers.
- Visits (Matje, Montim, Dërgesë, Riparim) with optional times, Orari by installer, "Nga ditët e kaluara", the €800 call sheet from a visit, project parts from visits. (Photos are out of scope for v1, decided 19.10.2026: no notebook/installation photos, camera capture, compression or R2.)
- Punët e montuesve: installer load on the chips in "Planifiko vizitë", and the "Montuesit" tab (7-day grid, per-installer summary).
- Installer messages: one visit, and one installer's whole day; WhatsApp primary, Viber via clipboard, "U dërgua?" logging.
- Customer templates (sq/en/de) from the order and the debts list, the green "Kujtesë" rule with "Kujtesa e fundit", demo date control.
- Tracking page with the three steps, the next visit and project progress; "Link i ri" with the inactive page.
- **Temporary HTTPS test deployment** (e.g. a Vercel preview with a separate test database), loaded with the fixtures only, so other phones can reach it. Not the sales environment.
- Phase 4 fixtures.

**Done when**, on the test deployment:
- A real tracking link opens correctly on **another phone**, in the client's language, and a replaced link shows the neutral page.
- An installer's day list and a reminder, sent manually from my phone through click-to-send, **actually arrive** on another phone with the correct text, tappable phone numbers and a working link.
- The €800 call takes **three taps or fewer** from the open order.

## Phase 5: Demo-ready

Spec section: Demo mode & seed data.
- Full realistic seed data per business type (including projects, cash with installers, opening balances, remaining work, reminder history), demo mode, reset, Pronari/Zyra buttons.
- **Polished sales environment**: the online demo instance with `?brand=`, QR code flow for the owner's phone, reset tools. Replaces the temporary Phase 4 test deployment.
- PWA install, polish on a mid-range Android.
- **Pitch kit** (like Doors & laminate): 3-minute demo script following the four moments, one-page offer (setup + monthly), rebrand checklist.

**Done when:** I can rebrand for a new company in under 15 minutes and run the full demo both offline on the laptop and online with the owner's phone.

## Phase 6: Production readiness & first client

After a client buys. Spec section: Production readiness.
- Adjustments the client asked for during the sale.
- Nightly database backups and dated file backups, a **tested restore** on a copy.
- Real auth only: demo buttons and setup PIN off, Pronari and Zyra accounts.
- Deploy the client instance (Vercel + Neon EU). Brand assets (logo) ship with the deployment; no file storage in v1.
- Onboarding: sit with the owner and enter the notebook debts as opening balances and the installers with their phones. **Agree who on the client's side keeps it up to date** (usually the office): marking work done, recording payments, confirming cash from installers.

**Done when the pilot checkpoint is passed**, agreed with the owner:
- Records checked: the entered debts and open orders match the owner's notebook/Excel.
- Restore test passed on this client's data.
- Staff trained: Pronari and Zyra have each done their routine actions once with me present (record a payment, mark work done, send a job to an installer, send a reminder).
- The person responsible for daily updates is named.
- The owner has accepted the setup.
- A follow-up date is agreed (e.g. 2–4 weeks later) to review how it's going.

---

## Parallel / later

- **brand.json v2 migration** for 3d_designer and Doors & laminate (separate task, any time after Phase 2).
- Backlog (from the spec's "Out of scope"), added only when a client needs it: order/job photos (notebook pages, installation photos, R2 storage), installer app, automatic sending and real messaging APIs, payment plans and project tranches, retention, partial cash handovers, receipts, service/warranty module, English/German staff UI, charts, quotes, drag-and-drop calendar, multi-tenancy, 3D designer → order hand-off.
