# Order Tracking: phases

The product spec is [order_tracking_instructions.md](order_tracking_instructions.md). This file says **in which order** it gets built. Each phase ends with a clear check. Don't start the next phase until that check passes and I've approved it.

The app is built as a finished-looking demo that I show and sell to owners. It doesn't need every feature at once; the spec's "Out of scope" list stays out until a client needs it.

| # | Phase | Result | Status |
|---|---|---|---|
| 1 | Interactive HTML prototype | Clickable version of the key screens, for me to feel the workflow | Not started |
| 2 | Foundation | Running app shell: brand, auth, roles, i18n, `/setup`, first fixtures | Not started |
| 3 | Orders & money core | Customers, orders, stages, payments, balances, opening balances | Not started |
| 4 | Customer-facing | Tracking page + prepared messages, on a temporary HTTPS test deployment | Not started |
| 5 | Owner & field views | Dashboard, schedule, field mobile view | Not started |
| 6 | Demo-ready | Full seed data, demo mode, polished sales environment, QR flow, PWA, export, pitch kit | Not started |
| 7 | Production readiness & first client | Backups, tested restore, real auth, pilot checkpoint passed | Not started |

## Rules for every phase

### Report at the end of each phase
When a phase is finished, tell me:
1. **What was built**: the features and screens, in plain words, and anything from the phase that was left out or changed (and why).
2. **How to run it**: the exact commands, the URL to open, and the demo logins if there are any.
3. **What to test manually**: a short checklist of things to click through, including the tricky cases (e.g. the €800 reported-cash case).
4. **What the next phase is**: what it contains and anything you need from me before starting it.

Then update the status column in the table above.

### Folder layout
```
/Order tracking
  order_tracking_instructions.md   spec
  PHASES.md                        this file
  prototype/                       Phase 1, static HTML; design reference
  (Next.js app at the root)        Phases 2–7
```
- `prototype/` is **standalone**: plain HTML/CSS/JS, no `package.json`, no shared code with the app, opened directly in the browser.
- The app must not import anything from `prototype/`. Exclude it from the app's TypeScript, ESLint, tests and build so the two never interfere.
- Keep `prototype/` in the repo after Phase 1 as the visual reference. It is not updated as the app evolves unless I ask.

### Test fixtures (from Phase 2 on)
The full realistic seed dataset comes in Phase 6. Before that, keep a **small, repeatable fixture set** loaded by one command (e.g. `pnpm fixtures`), so every phase review starts from the same known records instead of recreating them by hand. All data is fictional.
- Phase 2: one account per role (Pronari, Zyra, Terreni) and one brand.
- Phase 3 adds: one normal order going through the stages, **the €800 reported-cash case**, an opening balance with a known due date and one with "Nuk e di", an unfinished installation with paused reminders, a pickup order with skipped steps, and a reversed payment.
- Phase 4 adds: tracking links for those orders (one revoked) and a few ready-to-send messages.
- The same fixtures are used by the automated tests and the manual checklist in the phase report.

---

## Phase 1: Interactive HTML prototype

**Goal:** for me to see and feel the app and check that the workflow is right before writing the real app. It's cheap to change or throw away.

**Build** (in `prototype/`):
- Static HTML/CSS/JS, no backend, no build step, fake data in a JS file, works offline.
- Albanian only. Two sample brands with a brand switcher, to prove the white-label look.
- Phone layout for owner/field/customer screens, tablet layout for kanban and order list. A device-frame toggle for reviewing layout on a laptop.
- Build it with the design tokens (colors as CSS variables, spacing, type scale) the app will use, so the design can be carried over directly.

**Screens and flows:**
1. Owner dashboard (phone): outstanding total, overdue, installations today, cash with installers, messages ready to send.
2. **"Kush më ka borxh"** list with inline context badges (Borxh i bartur, Afat i panjohur, Ka punë të mbetura, Kujtesat në pauzë, €X raportuar).
3. Order detail: timeline, stages with fulfilment method, payments, adjustments, photos, remaining work.
4. **The €800 case**: the installer reports €800 → the order shows "€800 raportuar · në pritje të konfirmimit", "Për t'u mbledhur shtesë: €0", reminder paused → office taps "Konfirmo: i mora paratë nga …". The unconfirmed amount stays under "Para te montuesit, pa dorëzuar".
5. Opening balance form ("Borxh i bartur") with the "Kur duhej paguar?" decision, including "Nuk e di".
6. Order list with search + kanban (tablet), including a pickup order that skips steps.
7. Field view (phone): today's jobs, Maps, call, notebook photo, "Montuar", "Ka punë të mbetura", "Mora €X".
8. Ready-to-send queue → **simulated** phone-style WhatsApp preview of the message (nothing is sent).
9. Customer tracking page **preview** (responsive), branded, simplified timeline, plus the "link no longer active" page.

**Done when:**
- I can click through the debt flow (dashboard → debts list → order → €800 case → opening balance) without dead ends.
- The tracking preview and the simulated message preview look right at phone width.
- I've opened the prototype on **my own physical phone** (served from the laptop over local Wi-Fi, e.g. `python3 -m http.server` in `prototype/`) and the phone screens are comfortable to use with a thumb. The laptop device frame only reviews layout; it doesn't prove usability on a phone.
- I've said the workflow is right.

Real delivery (a tracking link opened on another phone, a message that actually arrives) is **not** part of Phase 1; that is checked in Phase 4.

**After approval:** I'll mark the prototype as approved here. From then on, **the app's design follows the prototype**: layout, navigation, components, colors and wording are adopted from `prototype/`. Where the app has to differ (a real form needs more fields, a technical limit), keep the prototype's look and say what changed in the phase report.

> Prototype approved: _not yet_

---

## Phase 2: Foundation

Spec sections: Tech stack, White-label brand system, Users & roles, Language & locale.
- Next.js + TypeScript + Tailwind/shadcn, Drizzle + PGlite locally, Better Auth with three roles, next-intl (Albanian), Serwist PWA shell.
- **brand.json v2** schema (zod), theming with CSS variables taken from the prototype's tokens, neutral fallback brand, `/setup` with logo color extraction.
- Layout shell and navigation matching the prototype.
- First fixtures: role accounts and one brand.
- Data model (Drizzle schema) and folder structure shown to me **before** coding.

**Done when:** I can log in as each role (from the fixtures) on a rebranded shell that looks like the prototype, offline, on my laptop.

## Phase 3: Orders & money core

Spec sections: 2 Customers, 3 Orders & statuses, 4 Payments & debts, Permissions. This is the heart of the product, so most of the tests live here.
- Customers, orders, stable stage keys, fulfilment method, skipping steps, adjustments, delay, remaining work, reminder pause, audit log.
- Payments, reported cash with confirm/reject, cash not handed over staying with the installer, reversals, balances, due dates, overdue logic.
- **Opening balances (borxh i bartur)** with known or unknown due dates.
- Debts list.
- Phase 3 fixtures.

**Done when:**
- All balance, overdue, stage and permission tests pass, including the €800 case and cash not handed over.
- A short **browser walkthrough** on the fixtures shows the same through the real screens: balances add up, a reversal and a "Refuzo" behave correctly, and each role sees and can do only what the permissions table allows.

## Phase 4: Customer-facing

Spec sections: 6 Prepared messages, 7 Customer tracking page.
- Tracking page with simplified timeline, shared photos, balance toggle, revoke/regenerate.
- Message templates (sq/en/de), ready-to-send queue with all suppression rules, click-to-send (WhatsApp, SMS, Viber via clipboard), "Sent messages" preview, demo date control.
- **Temporary HTTPS test deployment** (e.g. a Vercel preview with a separate test database), loaded with the fixtures only, so other phones can reach it. Not the sales environment.
- Phase 4 fixtures.

**Done when**, on the test deployment:
- A real tracking link opens correctly on **another phone**, in the contact's language, and a revoked link shows the neutral page.
- A message sent manually from my phone through click-to-send **actually arrives** on another phone with the correct text and working link.

## Phase 5: Owner & field views

Spec sections: 1 Owner dashboard, 5 Installation schedule & field view.
- Owner dashboard and the "Kush më ka borxh" list.
- Schedule by day and team (installation, delivery, return visits).
- Field mobile view with photo compression, notebook photos, cash reporting.

**Done when:** a full job can go from new order to fulfilled and paid, with every field step done on a phone, and each **routine field action** (open today's job, call, open Maps, take a photo, mark measured/installed, mark remaining work, report cash) takes **three taps or fewer**. Creating an order or office work doesn't have to meet the three-tap limit.

## Phase 6: Demo-ready

Spec section: Demo mode & seed data.
- Full realistic seed data per business type (including opening balances, reported cash, remaining work, pickup/delivery orders), demo mode, reset, role buttons.
- **Polished sales environment**: the online demo instance with `?brand=`, QR code flow for the owner's phone, reset tools. Replaces the temporary Phase 4 test deployment.
- Excel export, PWA install, polish on a mid-range Android.
- **Pitch kit** (like Doors & laminate): 3-minute demo script, one-page offer (setup + monthly), rebrand checklist.

**Done when:** I can rebrand for a new company in under 15 minutes and run the full demo both offline on the laptop and online with the owner's phone.

## Phase 7: Production readiness & first client

After a client buys. Spec section: Production readiness.
- Adjustments the client asked for during the sale.
- Nightly database backups and dated file backups, a **tested restore** on a copy.
- Real auth only: demo buttons and setup PIN off, owner and staff accounts.
- Deploy the client instance (Vercel + Neon EU + R2).
- Onboarding: sit with the owner and enter the notebook debts as opening balances. **Agree who on the client's side is responsible for daily updates** (usually someone in the office).

**Done when the pilot checkpoint is passed**, agreed with the owner:
- Records checked: the entered debts and open orders match the owner's notebook/Excel.
- Restore test passed on this client's data.
- Staff trained: each role has done its routine actions once with me present.
- The person responsible for daily updates is named.
- The owner has accepted the setup.
- A follow-up date is agreed (e.g. 2–4 weeks later) to review how it's going.

---

## Parallel / later

- **brand.json v2 migration** for 3d_designer and Doors & laminate (separate task, any time after Phase 2).
- Backlog (from the spec's "Out of scope"), added only when a client needs it: automatic sending and real messaging APIs, installment plans, two-step cash handover, receipts, service/warranty module, English/German staff UI, charts, quotes, drag-and-drop calendar, multi-tenancy, 3D designer → order hand-off.
