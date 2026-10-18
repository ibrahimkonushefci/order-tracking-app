# Order Tracking: phases

The product spec is [order_tracking_instructions.md](order_tracking_instructions.md). This file says **in which order** it gets built. Each phase ends with a clear check. Don't start the next phase until that check passes.

| # | Phase | Result | Status |
|---|---|---|---|
| 1 | Interactive HTML prototype | Clickable demo of the key screens, fake data, no backend | Not started |
| 2 | Validate with owners | Notes from 3–5 real owners, spec updated | Not started |
| 3 | Foundation | Running app shell: brand, auth, roles, i18n, `/setup` | Not started |
| 4 | Orders & money core | Customers, orders, stages, payments, balances, opening balances | Not started |
| 5 | Customer-facing | Tracking page + prepared messages | Not started |
| 6 | Owner & field views | Dashboard, schedule, field mobile view | Not started |
| 7 | Demo-ready | Seed data, demo mode, QR flow, PWA, export, pitch kit | Not started |
| 8 | Production readiness & pilot | Backups, tested restore, real auth, first client | Not started |

---

## Phase 1: Interactive HTML prototype

**Goal:** see and feel the product, and have something to show owners, before writing the real app. It's cheap to throw away.

**Build:**
- Static HTML/CSS/JS (one folder, no backend, no build step required), fake data in a JS file, works offline.
- Albanian only. Two sample brands with a brand switcher, to prove the white-label look.
- Phone layout for owner/field/customer screens, tablet layout for kanban and order list. A device-frame toggle for showing it on a laptop.

**Screens and flows:**
1. Owner dashboard (phone): outstanding total, overdue, installations today, cash with installers, messages ready to send.
2. **"Kush më ka borxh"** list with inline context badges (Borxh i bartur, Afat i panjohur, Ka punë të mbetura, Kujtesat në pauzë, €X raportuar).
3. Order detail: timeline, stage keys with fulfilment method, payments, adjustments, photos, remaining work.
4. **The €800 case**: the installer reports €800 → the order shows "€800 raportuar · në pritje të konfirmimit", "Për t'u mbledhur shtesë: €0", reminder paused → office taps "Konfirmo: i mora paratë nga …".
5. Opening balance form ("Borxh i bartur") with the "Kur duhej paguar?" decision, including "Nuk e di".
6. Order list with search + kanban (tablet), including a pickup order that skips steps.
7. Field view (phone): today's jobs, Maps, call, notebook photo, "Montuar", "Ka punë të mbetura", "Mora €X".
8. Ready-to-send queue → phone-style WhatsApp preview of the message.
9. Customer tracking page (phone), branded, simplified timeline, plus the "link no longer active" page.

**Done when:** I can run the 3-minute demo script (the three moments in the spec) from start to finish on my laptop and on a phone, without explaining around missing parts.

---

## Phase 2: Validate with owners

**Goal:** learn what real owners react to before building the real app.

- Show the prototype to **3–5 owners**: at least one doors/laminate business and one kitchen workshop.
- Watch, don't sell. Write down their words.
- Ask:
  - Who takes measurements, who collects the last payment, and how does the cash reach you today?
  - How many people owe you money right now, roughly? Where is that written?
  - Would you send these messages yourself, or let the office do it?
  - Which stage names do you actually use?
  - What would you pay to set this up, and per month?
- Update the spec with what changed.

**Done when:** each finding is either added to the spec, put in the backlog, or rejected with a reason, and I know whether to build.

---

## Phase 3: Foundation

Spec work plan milestone 1.
- Next.js + TypeScript + Tailwind/shadcn, Drizzle + PGlite locally, Better Auth with three roles, next-intl (Albanian), Serwist PWA shell.
- **brand.json v2** schema (zod), theming with CSS variables, neutral fallback brand, `/setup` with logo color extraction.
- Data model (Drizzle schema) and folder structure reviewed **before** coding.

**Done when:** I can log in as each role on a rebranded shell, offline, on my laptop.

## Phase 4: Orders & money core

Spec milestones 2–3. This is the heart of the product, so most of the tests live here.
- Customers, orders, stable stage keys, fulfilment method, skipping steps, adjustments, delay, remaining work, reminder pause, audit log.
- Payments, reported cash with confirm/reject, reversals, balances, due dates, overdue logic.
- **Opening balances (borxh i bartur)** with known or unknown due dates.
- Debts list.

**Done when:** all balance, overdue, stage and permission tests pass, including the €800 case.

## Phase 5: Customer-facing

Spec milestones 4–5.
- Tracking page with simplified timeline, shared photos, balance toggle, revoke/regenerate.
- Message templates (sq/en/de), ready-to-send queue with all suppression rules, click-to-send (WhatsApp, SMS, Viber via clipboard), "Sent messages" preview, demo date control.

**Done when:** a prepared message sent from my phone opens a correct tracking link on another phone, in the contact's language.

## Phase 6: Owner & field views

Spec milestones 6–7.
- Owner dashboard and the "Kush më ka borxh" list.
- Schedule by day and team (installation, delivery, return visits).
- Field mobile view with photo compression, notebook photos, cash reporting.

**Done when:** a full job can go from new order to fulfilled and paid using only a phone, with each action in three taps or fewer.

## Phase 7: Demo-ready

Spec milestone 8.
- Seed data per business type (including opening balances, reported cash, remaining work, pickup/delivery orders), demo mode, reset, role buttons.
- Online demo instance + QR code flow for the owner's phone.
- Excel export, PWA install, polish on a mid-range Android.
- **Pitch kit** (like Doors & laminate): 3-minute demo script, one-page offer (setup + monthly), rebrand checklist.

**Done when:** I can rebrand for a new company in under 15 minutes and run the demo offline and online.

## Phase 8: Production readiness & first pilot

The "Production readiness" section of the spec.
- Nightly database and file backups, a **tested restore** on a copy.
- Real auth only: demo buttons and setup PIN off, owner and staff accounts.
- Deploy the client instance (Vercel + Neon EU + R2).
- Onboarding: sit with the owner and enter the notebook debts as opening balances.
- 4-week pilot with one client, then fix what hurts.

**Done when:** restore has been tested, and the client has used it daily for 4 weeks.

---

## Parallel / later

- **brand.json v2 migration** for 3d_designer and Doors & laminate (separate task, any time after Phase 3).
- Backlog (from the spec's "Out of scope"): automatic sending and real messaging APIs, installment plans, two-step cash handover, receipts, service/warranty module, English/German staff UI, charts, quotes, drag-and-drop calendar, multi-tenancy, 3D designer → order hand-off.
