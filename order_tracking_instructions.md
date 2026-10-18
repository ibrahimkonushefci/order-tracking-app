## Context: what I'm trying to achieve

I'm a freelance developer in **Kosovo**. I sell custom software to established businesses that make **kitchens, furniture, wardrobes, interior doors and flooring, and windows/doors** (PVC/aluminium). These are mostly family-owned businesses with 5–50 employees, a workshop, a showroom and 1–4 installation teams.

Their biggest daily pains:
1. Customers constantly calling to ask **"When will my order be ready?"**
2. The owner has no single clear picture of all orders, where each one stands, and which team installs what and when. Updating the installer team is done by phone calls and memory.
3. **Unpaid balances.** Customers pay a deposit (avans), the job gets installed, and the rest is collected late or never. Everything lives in notebooks, Excel or someone's head.

Build a **white-label web app** that solves this: orders with clear statuses, an installation schedule, payments and debt tracking, **prepared** customer messages sent manually over WhatsApp/Viber/SMS, and a read-only tracking page for each customer.

This is a **sales demo I'll show owners on a tablet/laptop, rebranded with their logo and name before each meeting**. It is built on a solid base, because this exact product becomes the production version, sold as a **setup fee + monthly subscription**.

### The three moments the demo must nail

Everything else supports these. Build them first and make them perfect.
1. **"Kush më ka borxh"** (who owes me money): the total outstanding, sorted by amount and days overdue, with a WhatsApp/Viber/call button next to each name.
2. **The tracking link opening on the owner's own phone** (they scan a QR code on my laptop), showing their logo, in Albanian.
3. **A prepared WhatsApp message landing on the owner's own phone** during the meeting, so they see exactly what their customer would receive.

## Product principles

- **Nothing is ever sent automatically.** The app prepares messages and suggests when to send them. A person always taps "send". This culture is relationship-based, and one wrong debt reminder to a relative or a long-time client costs more than the debt.
- **Customers never log in.** They only receive messages and a read-only tracking link.
- **Low-effort for field staff.** Installers use it only if it takes a few taps: see the job, call, open Maps, take a photo, mark done.
- **Fast data entry beats completeness.** On day 1 the owner must be able to type in their existing debts from the notebook in minutes.

## Users & roles

- **Owner (Pronari)**: sees and does everything, mostly on the phone. Dashboard first. Manages users and settings. Confirms cash collected by installers.
- **Office (Zyra)**: creates customers and orders, records payments, schedules installations, prepares and sends messages. Can also do every field action.
- **Field team (Terreni)**: installers, who also take measurements most of the time. Sees only their assigned jobs: address, Google Maps link, customer phone, the amount to collect. Takes measurement photos, marks jobs measured/installed, uploads photos, records cash received.
- **Customer (Klienti)**: no login. Opens a private tracking link.

**Office and field can both do field actions** (mark measured, mark installed, add photos, record a payment). Whoever does it, it goes into the audit log with their name.

No full separate workflow per employee role in v1. These are three permission levels on one app.

## Language & locale

- **Staff UI: Albanian only in v1.** All strings still go through i18n keys from day 1 (no hard-coded text), so English/German staff screens can be added later by adding message files.
- **Customer-facing content in Albanian, English and German**: message templates and the tracking page. Language is chosen per contact, because diaspora customers may prefer German.
- EUR. Money stored as **integer cents**.
- Phone numbers in E.164; default +383, quick-pick for diaspora codes (+49, +41, +43, +33, +46, +1).
- Dates `dd.MM.yyyy`, timezone `Europe/Belgrade` (same as Kosovo).

## Tech stack (decided)

| Area | Choice | Why |
|---|---|---|
| Runtime | Node 24 LTS, pnpm (pinned, same as my other projects) | Consistency across my products |
| Framework | Next.js (App Router) + TypeScript, server actions for mutations | Same as Doors & laminate |
| UI | Tailwind CSS + shadcn/ui | Fast, accessible, easy to theme with CSS variables |
| Database | **PostgreSQL everywhere** | One SQL dialect, one set of migrations. No SQLite/Postgres switching (Prisma can't switch provider by env var anyway) |
| Local/demo DB | **PGlite** (embedded Postgres, stored in a local folder) | Runs fully offline on my laptop at a meeting, no Docker, no install |
| Production DB | Managed Postgres in the EU (Neon, Frankfurt region) | Data stays in the EU, free/cheap tier per client |
| ORM | **Drizzle ORM** + drizzle-kit migrations | TypeScript schema, first-class PGlite and node-postgres drivers, same code for demo and production. Selected only by `DATABASE_URL` |
| Auth | **Better Auth** (email or phone + password, sessions in my own DB, role on the user) | Current recommended choice for new Next.js apps; Lucia is deprecated. **Check permissions in every server action / route handler, never in middleware only** |
| i18n | next-intl | Works with App Router and server components |
| Validation | zod, with Albanian error messages | Shared between forms and server actions |
| PWA | Serwist | Installable on phones, caches the app shell |
| File storage | `StorageProvider` abstraction: local disk (demo) → Cloudflare R2 (S3 API) in production | R2 has no egress fees. **Compress photos in the browser before upload** (max ~1600px, JPEG ~80%), because notebook/installation photos from phones are 3–8 MB |
| Tests | Vitest (logic) + Playwright (a few key flows) | Same as my other projects |
| Hosting | Vercel (Pro plan, functions in Frankfurt) + Neon + R2. One Vercel project and one database per client | Hobby plan is not allowed for commercial use. No cron/scheduler needed in v1 (see messages) |

Keep a `companyId` on all main tables so multi-tenancy is easy later, but deploy one instance per client for now.

## White-label brand system (VERY IMPORTANT)

My three products currently use three different `brand.json` shapes. This project defines **brand.json v2**, the single shared format. My other two projects (3d_designer, Doors & laminate) will migrate to it in a separate task. Write a zod schema for it in `src/brand/schema.ts` that can later be copied into a shared package.

```
/brands/<slug>/brand.json
/brands/<slug>/logo.svg   (or .png)
```

```json
{
  "schemaVersion": 2,
  "slug": "druri-design",
  "companyName": "Druri Design",
  "shortName": "Druri",
  "tagline": { "sq": "Kuzhina me porosi që nga 2005", "en": "Custom kitchens since 2005", "de": "Küchen nach Maß seit 2005" },
  "logo": { "src": "logo.svg", "alt": "Druri Design" },
  "colors": { "primary": "#1F3A5F", "accent": "#C8A165", "background": "#FFFFFF", "text": "#1A1A1A" },
  "font": "Inter",
  "contact": {
    "phone": "+38344123456",
    "whatsapp": "+38344123456",
    "viber": "+38344123456",
    "email": "info@druridesign.example",
    "address": "Rr. Agim Ramadani, Prishtinë",
    "city": "Prishtinë",
    "mapsUrl": "",
    "googleReviewUrl": ""
  },
  "legal": { "businessNumber": "", "fiscalNumber": "", "vatNumber": "", "bankName": "", "iban": "", "website": "" },
  "languages": ["sq", "en", "de"],
  "defaultLanguage": "sq",
  "businessType": "kitchens",
  "modules": { "orderTracking": true },
  "demo": true
}
```

- `businessType`: `kitchens` | `furniture` | `doors_floors` | `doors_windows`. It sets the default stage names, product types and seed data wording.
- Active brand: `?brand=<slug>` in demo mode, otherwise the `BRAND` env var. Theme applied through CSS variables. Missing or invalid brand files fall back to a neutral brand.
- **Brand Setup page** (`/setup`, PIN-protected, demo convenience, not real auth): upload a logo → suggested colors (reuse the color extraction I already built in 3d_designer), set name/phone/city, live preview, then **"Apply & reseed demo"**, which regenerates demo data with the brand's name and city.

## Core features (v1)

### 1. Owner dashboard (urgent things first)
- Cards: **total outstanding (€)**, **overdue balances** (count + €), installations today / this week, **cash with installers, not handed over**, **messages ready to send**, orders at risk (promised date passed or close, or stuck too long in a stage).
- **"Kush më ka borxh"** list: sorted by amount and days overdue, with one-tap call / WhatsApp / Viber / "prepare reminder". Each row shows its context inline instead of on extra cards: "Borxh i bartur", "Afat i panjohur", "Ka punë të mbetura: …", "Kujtesat në pauzë deri më …", "€X raportuar, pa konfirmuar".
- Today's installations per team.
- No charts in v1.

### 2. Customers
- Name, phone(s), city, address, Google Maps link, preferred language, preferred channel (WhatsApp / Viber / SMS / call), diaspora flag with country, notes.
- **"Mos sugjero kujtesa për borxh"** (don't suggest debt reminders) flag: relatives, friends, big contractors.
- Customer page: all orders, payments and message history.

### 3. Orders & statuses
- **Human-friendly order number** (`2026-041`), because people say it on the phone.
- Fields: customer, product type, description, agreed price, discount, measurement date, promised date, assigned field team, photos/attachments, internal notes.
- **Contacts per order**: an on-site contact and a payer, each with their own phone, language and channel. They default to the customer. (Typical diaspora case: the son in Germany pays, the parents in Podujevë receive the kitchen.)
- **Stages describe the work only. Payment is a separate status** shown as a badge and progress bar on every order: `Pa paguar / Avans / Pjesërisht / Paguar`.
- **Stable stage keys.** Every stage has a fixed internal key and a fixed position. Owners can **rename** a stage's label and **hide** stages they never use, but they cannot change what a stage means or its order (there's no need to reorder, because the meanings are fixed). The tracking timeline, message suggestions, warnings and reports always use the key, never the label.

  | Key | Default label (sq) | Meaning |
  |---|---|---|
  | `new` | E re | Order agreed, nothing done yet |
  | `measurement` | Matje | Measurement visit planned or done |
  | `production` | Në prodhim | Being made, or ordered from the supplier |
  | `ready` | Gati | Ready in the workshop/warehouse |
  | `scheduled` | Montim / Dërgesë e planifikuar | Date and team set (label follows the fulfilment method) |
  | `fulfilled` | Montuar / Dorëzuar / Tërhequr | Installed, delivered or collected (label follows the fulfilment method) |
  | `cancelled` | Anuluar | Side state, outside the normal flow |

- **Fulfilment method** (one field per order): `installation` (Montim), `delivery` (Dërgesë, no installation) or `pickup` (Tërheqje nga dyqani). It changes the labels of `scheduled`/`fulfilled`, the message templates and the tracking timeline. Pickup orders skip `scheduled`.
- **Skipping steps**: staff can move an order forward past steps that don't apply, e.g. a stocked door sold for pickup goes `new → ready → fulfilled`. Skipped steps are recorded in the audit log, are not shown on the tracking page, and don't trigger their message suggestions. Moving backwards is allowed with a reason.
- Each `businessType` has a default preset: which stages are visible and the default fulfilment method (kitchens/furniture: installation with measurement; doors/floors: installation or delivery, measurement often skipped for stocked products; windows: installation with measurement).
- **Adjustments (shtesa/zbritje)**: add or subtract an amount with a reason ("+1 dollap", "−€200 marrëveshje"). The agreed total = price − discount + adjustments. Every change is in the audit log.
- **Delay**: pick a reason (waiting for material/supplier, customer not ready, weather, other) and a new expected date. This updates the tracking page and **prepares** a polite message for the customer. Staff decide whether to send it.
- **Measurements**: no measurement tools. The field team **takes a photo of the notebook page** (or several) plus an optional short note, attached to the order as "Matjet".
- Views: **list** with search (name, phone, order number) and filters (stage, payment status, team, city), **kanban board** on tablet/desktop (move with a "next stage" button; drag is a nice-to-have), **order detail** with a timeline of all events.
- Photos can be marked "show on tracking page".
- **Remaining work ("Ka punë të mbetura")**: a flag on a fulfilled order with a note, e.g. "Një derë duhet rregulluar; klienti paguan €150 e fundit pas rregullimit." Optionally a return visit (date + team) that appears in the schedule and the field view as "Vizitë plotësuese". While the flag is on, the tracking page shows the last step as in progress rather than complete. The flag is cleared with "Puna u përfundua", which is logged. This is not a service/warranty module: no tickets, no categories.
- **Pause reminders until…**: any order can have its debt reminder suggestions paused until a date, with a reason (e.g. remaining work, customer promised to pay on a date, family arrangement). Setting the remaining-work flag offers this pause in the same step.

### 4. Payments & debts
- Record a payment: amount, date, method (cash / bank / card), **received by** (person), note.
- Payments recorded by the owner/office are confirmed immediately.
- Per order: **"Ku paguhet pjesa e mbetur"** (where the rest is paid): `te montuesit` (installers collect on site) or `në zyrë` (customer pays the owner/office). The field view shows "Mblidh €X" (collect €X) only when the installers are supposed to collect.
- **One payment due date per order** in v1 (installment plans later).

#### Cash reported by the field team
- When an installer taps "Mora €X", the payment is saved as **reported** (`raportuar`): the customer has paid the installer, and the office does not have the money yet.
- **A reported payment immediately counts as paid by the customer.** The app must never ask the customer for the same money twice. Example: balance €800, installer reports €800:

  ```
  €800 raportuar si të mbledhura · në pritje të konfirmimit nga zyra
  Për t'u mbledhur shtesë: €0
  ```

- While an order has any unresolved reported payment, **its debt reminder suggestions are paused**, and it is not counted as overdue for the amount reported.
- **Meaning of "Konfirmo" in v1 (explicit): the owner or office has received the cash in hand from the installer** (handover). It does *not* mean "the customer paid"; that was already recorded when the installer reported it. The confirm button reads "Konfirmo: i mora paratë nga {installerName}".
- **"Refuzo"** (reject, with a required reason) is **only for correcting an erroneous report**: wrong amount, recorded on the wrong order, or the customer didn't actually pay. The amount returns to the customer's remaining balance and reminder suggestions resume. Both actions are logged.
- **Cash the installer hasn't handed over is never the customer's debt again.** If the customer paid the installer, the customer has paid, even if the money never reaches the office. The amount stays under **"Para te montuesit, pa dorëzuar"** for that installer, with how many days it has been outstanding, until it is confirmed. It is not rejected, it doesn't restore the customer's balance, and it never triggers a reminder to the customer. Settling it is between the owner and the installer, outside the app in v1.
- The dashboard shows "Para te montuesit, pa dorëzuar" (cash with installers, not handed over) as an amount per installer. That's about trust inside the company, not about the customer's debt.
- Later (not v1): separate "customer paid" and "handed to office" into two events with partial handovers.

#### Balances
- Per order:
  - **Customer has paid** = confirmed + reported
  - **Remaining for the customer** = agreed total − customer has paid. This number drives reminders, the debts list, the field "Mblidh €X" and the tracking page.
  - **Money in the office** = confirmed only
- **Overdue** when the remaining amount is above €0 and today is past the due date. Days since fulfilment are also shown.

#### Opening balances ("Borxh i bartur")
For debts that existed before the app. The owner often knows only "Blerimi më ka borxh €450".
- A separate record type, clearly labelled **"Borxh i bartur"** everywhere. It is **not** an order: no stages, no price, no installation, no tracking link, and the app never invents an original sale or payment history.
- Short form: name, phone, **amount owed** (required), what it was for (optional), when the work was done (optional; a date, month/year, or "nuk e di"), note.
- **Due date (required decision in the form): "Kur duhej paguar?"**
  - a date (exact or approximate) → overdue days are calculated from it
  - **"Nuk e di"** → shown as **"Afat i panjohur"**: listed in the debts list in its own group, counted in total outstanding but **not** in the overdue count, and no reminder suggestions are generated. The owner can still prepare a message by hand, or set a date later.
- Payments against an opening balance reduce it like any other payment.
- This is how the owner moves the notebook into the app on day 1.

#### Corrections
- **Confirmed payments are never edited or deleted.** The owner corrects a mistake with a **reversal** (a linked negative entry with a required reason), then records the correct payment if needed. Both the original and the reversal stay visible in the order's history.
- Erroneous reported payments are corrected through "Refuzo" (above). Cash not handed over is not a correction; it stays with the installer.

### 5. Installation schedule & field view
- **Schedule as a list by day, grouped by team.** Assign date + team + arrival window ("08:00–10:00") with pickers. No drag-and-drop, no capacity planning.
- **Field mobile view (Terreni)**: today's and this week's jobs (including delivery jobs and return visits) → address (opens Google Maps), call customer, amount to collect, short checklist, take photos, buttons **"Matja u krye"** (measurement done, with notebook photo), **"Montuar" / "Dorëzuar"** (with after photos), **"Ka punë të mbetura"** (note what's left), **"Mora €X"** (I received €X cash).
- Large touch targets, works on mid-range Android, at most three taps per action.

### 6. Prepared messages (manual sending)
- **Templates** per message type and language (sq/en/de), with variables: `{customerName}`, `{orderNumber}`, `{orderType}`, `{date}`, `{arrivalWindow}`, `{balance}`, `{trackingLink}`, `{companyName}`, `{companyPhone}`, `{staffName}`.
- Message types: deposit received (thanks + tracking link), in production (expected date), installation scheduled (date + arrival window), day-before installation reminder, installed (thanks + Google review link), delay notice, balance reminder (polite, then a gentler second one; never aggressive).
- **"Gati për dërgim" (ready to send) queue**: the app computes which messages are due when the page loads (stage changes by stage key and fulfilment method, tomorrow's installations/deliveries, balance reminders at configurable days after the due date, e.g. 3 / 10 / 20). **No background scheduler or cron in v1.**
- A balance reminder is suggested **only if all of these hold**: remaining for the customer > €0, a known due date has passed, no unresolved reported payment, reminders not paused, and the customer isn't flagged "no debt reminders". Each suppressed suggestion can show why ("pauzë deri më 12.11.2026").
- Sending: staff tap **Send** → the app opens WhatsApp (`https://wa.me/<number>?text=...`) or SMS (`sms:<number>?body=...`) with the text prefilled, from their own phone. Viber can't reliably prefill a chat with a specific number, so for Viber the app **copies the text to the clipboard** and opens the chat (`viber://chat?number=...`). On return, the app asks "U dërgua?" (was it sent?) and logs the message in the customer's history.
- Messages are signed with the company and the staff member's first name (e.g. "Arben, Druri Design"): personal but professional.
- Keep a `MessageProvider` interface so real API sending can be added later (WhatsApp Cloud API, Viber Business, SMS gateway). In v1, only `ClickToSendProvider` and, in demo mode, `MockProvider`, which shows the message in a phone-style "Sent messages" preview.
- Settings: edit templates, turn each suggestion type on/off, set reminder days.

### 7. Customer tracking page `/t/<random-token>`
- Read-only, no login, `noindex`. Token: at least 128 bits of randomness.
- Company logo and colors, the contact's language.
- **Simplified timeline** of 3–5 steps mapped from the stage keys and the fulfilment method (e.g. Matje → Në prodhim → Gati → Montim → Përfunduar, or Gati → Tërhequr for pickup). Hidden and skipped stages don't appear. No detailed production history.
- **Revoke / regenerate**: the owner can revoke an order's tracking link or replace it with a new one (e.g. sent to the wrong number). An old link shows a neutral page: "Ky link nuk është më aktiv. Na kontaktoni." with the company phone, and nothing about the order.
- Expected installation date and arrival window, delay notice if any.
- Photos the company chose to share.
- Remaining balance: per-company toggle, **hidden by default**.
- Buttons: call company, WhatsApp, Viber, directions to the showroom.
- Must look beautiful on a phone. The customer shows this page to their family.

### 8. Settings
- Brand, stage labels and visibility (order is fixed), product types, message templates, reminder days, teams, users and roles, show-balance toggle.

### 9. Export
- Owner-only **"Shkarko në Excel"**: customers, orders and payments as an `.xlsx` file. This answers "if you disappear, where is my data?"

## Permissions

| Action | Pronari | Zyra | Terreni |
|---|---|---|---|
| Dashboard, all orders, all money | ✓ | ✓ | – |
| Create/edit customers and orders, adjustments | ✓ | ✓ | – |
| Record payments | ✓ (confirmed) | ✓ (confirmed) | ✓ (reported, cash only) |
| Confirm or reject reported cash | ✓ | ✓ | – |
| Reverse a confirmed payment (never edit/delete) | ✓ | – | – |
| Add opening balances (borxh i bartur) | ✓ | ✓ | – |
| Set remaining work / pause reminders | ✓ | ✓ | remaining work only |
| Revoke or regenerate a tracking link | ✓ | – | – |
| Schedule installations | ✓ | ✓ | – |
| See assigned jobs, call, Maps, photos, mark measured/installed | ✓ | ✓ | ✓ (own team only) |
| Prepare and send messages | ✓ | ✓ | – |
| Settings, users, export | ✓ | – | – |

The field team sees only the amount to collect on their jobs, never prices or debts of other orders.

## Demo mode & seed data

- One command seeds **realistic data**: ~40 customers with typical Albanian names across Kosovo cities (Prishtinë, Prizren, Pejë, Gjakovë, Ferizaj, Gjilan, Mitrovicë, Podujevë, Vushtrri, Suharekë), ~10 diaspora contacts (Germany, Switzerland, Austria), ~60 orders across all stages, realistic EUR prices for the business type, payments, **€15–30k outstanding** with some overdue, 3 field teams, a few reported cash payments waiting for confirmation (one exactly matching the balance), ~8 opening balances (some with "Afat i panjohur"), 2–3 orders with remaining work and paused reminders, some delivery/pickup orders with skipped steps, a few messages ready to send, and a message history.
- Seed data adapts to `businessType` (kitchens vs. doors/floors vs. windows).
- **Demo date control** ("Simulate: jump forward X days"): shifts the app's "today" so new reminder suggestions appear live.
- **"Reset demo"** button. One-tap login buttons per role (only when `DEMO_MODE=true`).
- **Works fully offline** on my laptop (PGlite).
- **Online demo too**: deploy a demo instance with the brand selectable by `?brand=`. In the meeting, the laptop shows a **QR code for a tracking link**, so the owner opens it on their own phone, and I send a prepared WhatsApp message to the owner's number.

## Out of scope for v1 (leave clean extension points)

- Automatic message sending, escalating reminders, real WhatsApp/Viber/SMS APIs
- Charts and monthly reports
- English/German staff screens (i18n keys are ready)
- Detailed customer-visible production history
- Full lead-management workflow and quote/offer generation
- Calendar drag-and-drop and capacity planning
- Measurement tools and customer signatures
- Installment plans (single due date only)
- Separate "customer paid" and "handed to office" events, partial cash handovers
- Printable receipts
- Service/warranty module (only the remaining-work flag and return visit exist)
- Multi-tenant SaaS, accounting/fiscal integration, inventory

## Quality requirements

- Fast on mid-range Android phones. Touch targets at least 44px.
- zod validation with clear Albanian error messages.
- **Audit log** for every important change (who, what, old → new, when): stage (incl. skipped steps), price, adjustments, payments, confirmations/rejections, reversals, reminder pauses, remaining work, schedule, tracking link revocation. The audit log is append-only.
- Money as integer cents; never floats.
- Tests:
  - balance calculation: discount, adjustments, reported vs. confirmed cash, rejection, reversal
  - the €800 case: reported €800 → remaining for the customer €0, no reminder, money in office €0
  - cash not handed over for weeks → the customer stays at €0 remaining and gets no reminder; only "Refuzo" restores the balance
  - opening balances with a known and an unknown due date
  - overdue logic and reminder suggestions (paused, reported, unknown due date, "no reminders" flag, demo date offset)
  - stage transitions by key: skipping, moving back, fulfilment methods, renamed/hidden labels don't change behaviour
  - tracking timeline mapping and revoked links
  - permission checks per role

## Production readiness (before the first real client)

Barely visible in a sales demo, but required before real money and real customers are in the app:
- **Database backups**: Neon point-in-time restore plus a nightly `pg_dump` to separate storage (a backup bucket, not the app's own database), kept 30 days.
- **File storage is append-only**: every upload gets a new unique key and is never overwritten in place. Deleting a photo in the app only marks it deleted; the file is removed later by a cleanup job after the backup retention period.
- **File backups**: R2 doesn't support bucket versioning (Cloudflare lists `GetBucketVersioning`/`PutBucketVersioning` as unimplemented), so use a nightly copy of the photo bucket into **dated backup folders** in a separate backup bucket, kept for **30 days**. Earlier copies must survive if a file in the app bucket is later overwritten or deleted.
- **Tested restore**: a written restore procedure, actually run once on a copy (database + files + users + settings) before go-live, then every 3 months. A backup that has never been restored doesn't count.
- **Payment corrections** only through reversals (see Corrections). The Excel export stays as the owner's own copy, but it is not the backup.
- **Tracking link revoke/regenerate** working and tested.
- Real auth: demo login buttons and `/setup` PIN disabled, owner password set, staff accounts created.

## Work plan

The project is built in phases; see [PHASES.md](PHASES.md). The first phase is an interactive HTML prototype in `prototype/`; once I approve it, the app's design follows it. In the app build phases, keep the app running after each phase, and end every phase with the report described in PHASES.md (what was built, how to run it, what to test manually, what's next).

Before you start coding the app, give me the plan, the data model (Drizzle schema) and the folder structure. At the end, write a `README.md` covering:
- how to run it locally (offline, PGlite)
- how to rebrand it for a new client in under 15 minutes
- how to deploy a client instance (Vercel + Neon + R2)
- how backups work and how to restore
- where to plug in real WhatsApp/Viber/SMS providers later
