## Context: what I'm trying to achieve

I'm a freelance developer in **Kosovo**. I sell custom software to established businesses that make **kitchens, furniture, wardrobes, interior doors and flooring, and windows/doors** (PVC/aluminium). These are mostly family-owned businesses with 5–50 employees, a workshop, a showroom and 1–4 installation teams.

Their biggest daily pains:
1. Customers constantly calling to ask **"When will my order be ready?"**
2. The owner has no single clear picture of all orders and of who installs what and when. Installers are briefed by phone calls and memory.
3. **Unpaid balances.** Customers pay a deposit (avans or kapar, depending on the region), the job gets installed, and the rest is collected late or never. Everything lives in notebooks, Excel or someone's head.

Build a **white-label web app for the owner and the office**: orders with three simple stages, optional visit dates, payments and debt tracking, jobs sent to installers over WhatsApp, **prepared** customer messages sent by hand, and a read-only tracking page for each customer.

**Scope rule:** the app must fit how a small Kosovo workshop already works, not turn it into a multi-department company. Installers don't use an app; they get a WhatsApp message. Nobody knows delivery dates months ahead, so dates are optional and nothing turns red because a production date passed. Only money can be "late".

This is a **sales demo I'll show owners on a tablet/laptop, rebranded with their logo and name before each meeting**. It is built on a solid base, because this exact product becomes the production version, sold as a **setup fee + monthly subscription**.

### The four demo moments

Everything else supports these. Build them first and make them perfect.
1. **"Kush më ka borxh"** (who owes me money): the total outstanding, sorted by amount and days overdue, with a WhatsApp/Viber/call button next to each name, and a prepared reminder one tap away.
2. **"Faqja e klientit"**: the tracking link opens on the owner's own phone (they scan a QR code on my laptop), showing their logo, in Albanian: the three steps and the next visit.
3. **"Dërgoja Dritonit"**: tomorrow's jobs for one installer, formatted as one WhatsApp message (client, phone, place, directions, product, "Mblidh €800"), landing on the owner's own phone as if they were the installer.
4. **"Driton telefonon: Mora €800"**: the installer calls, the owner records it in three taps, the customer's debt drops to €0, and the €800 waits under "Para te montuesit" until the owner confirms the handover.

A quick way to open a **multi-unit project** ("100 dyer · Banesat Kodra") is shown next to them, for door, floor and furniture companies that work with builders.

## Product principles

- **Nothing is ever sent automatically.** The app prepares messages; a person always taps "send". This culture is relationship-based, and one wrong debt reminder to a relative or a long-time client costs more than the debt.
- **Only the owner and the office log in.** Installers and customers never do: installers receive the job on WhatsApp/Viber, customers receive messages and a read-only tracking link.
- **Dates are optional.** An order has no promised date. A visit (measurement, installation, delivery, repair) has a date only once it's planned, and its time can be "Paradite"/"Pasdite". There are no "at risk" or "late delivery" warnings.
- **Only money can be late.** Debt is due when the work is done (or, for a project, when each part is installed), with a payment term the owner picks in one tap.
- **Fast data entry beats completeness.** On day 1 the owner must be able to type in their existing debts from the notebook in minutes. A new order takes five fields.
- **Corrections are edits, not accounting.** A wrong amount is fixed with "Ndrysho" or "Fshij", and every change leaves one line in the history.

## Users

- **Pronari** (owner, e.g. Arben) and **Zyra** (office, e.g. Teuta): two kinds of login with **the same screens**. Both do all daily work. Only Pronari can delete records, export all data and manage users (see Permissions). Their first names sign customer messages ("Arben, Druri Design") and appear in the history.
- **Montuesit** (installers, e.g. Driton): **contacts, not users**. Name, phone and preferred channel (WhatsApp/Viber). The owner assigns visits to them and sends them the job details. Each installer is a crew lead; there is no separate "team" entity.
- **Klienti** (customer): no login. Opens a private tracking link.

## Language & locale

- **Staff UI: Albanian only in v1.** All strings still go through i18n keys from day 1 (no hard-coded text), so English/German staff screens can be added later by adding message files.
- **Customer-facing content in Albanian, English and German**: message templates and the tracking page. Language is chosen per client (default Albanian), because diaspora customers may prefer German. Messages to installers are Albanian only.
- EUR. Money stored as **integer cents**.
- Phone numbers in E.164; default +383, quick-pick for diaspora codes (+49, +41, +43, +33, +46, +1).
- Dates `dd.MM.yyyy`, timezone `Europe/Belgrade` (same as Kosovo).
- **Deposit term: "Avans" or "Kapar".** Some cities say avans, others kapar. A company setting picks the word used in labels, badges and customer messages (template variable `{depositWord}`), default "Avans". Search accepts both words regardless of the setting.

### Channels: WhatsApp first
Almost nobody in Kosovo uses regular SMS for business anymore, and SMS to +49/+41 numbers costs money. Everywhere the app offers a way to contact someone (customers and installers), **WhatsApp is the large primary button**, Viber is secondary, and **SMS is only a small fallback**. The call button stays separate. New clients and installers default to WhatsApp.

## Tech stack (decided)

| Area | Choice | Why |
|---|---|---|
| Runtime | Node 24 LTS, pnpm (pinned, same as my other projects) | Consistency across my products |
| Framework | Next.js (App Router) + TypeScript, server actions for mutations | Same as Doors & laminate |
| UI | Tailwind CSS + shadcn/ui, Inter (self-hosted), light + dark themes from the prototype's tokens | Fast, accessible, easy to theme with CSS variables; dark mode via the `[data-theme="dark"]` selector |
| Database | **PostgreSQL everywhere** | One SQL dialect, one set of migrations. No SQLite/Postgres switching (Prisma can't switch provider by env var anyway) |
| Local/demo DB | **PGlite** (embedded Postgres, stored in a local folder) | Runs fully offline on my laptop at a meeting, no Docker, no install |
| Production DB | Managed Postgres in the EU (Neon, Frankfurt region) | Data stays in the EU, free/cheap tier per client |
| ORM | **Drizzle ORM** + drizzle-kit migrations | TypeScript schema, first-class PGlite and node-postgres drivers, same code for demo and production. Selected only by `DATABASE_URL` |
| Auth | **Better Auth** (email or phone + password, sessions in my own DB, role `owner`/`office` on the user) | Current recommended choice for new Next.js apps; Lucia is deprecated. **Check permissions in every server action / route handler, never in middleware only** |
| i18n | next-intl | Works with App Router and server components |
| Validation | zod, with Albanian error messages | Shared between forms and server actions |
| PWA | Serwist | Installable on phones, caches the app shell |
| File storage | `StorageProvider` abstraction: local disk (demo) → Cloudflare R2 (S3 API) in production | R2 has no egress fees. **Compress photos in the browser before upload** (max ~1600px, JPEG ~80%), because notebook/installation photos from phones are 3–8 MB |
| Export | `.xlsx` generated on the server (e.g. exceljs) + JSON | The owner opens it in Excel; the JSON is a complete copy |
| Tests | Vitest (logic) + Playwright (a few key flows) | Same as my other projects |
| Hosting | Vercel (Pro plan, functions in Frankfurt) + Neon + R2. One Vercel project and one database per client | Hobby plan is not allowed for commercial use. No cron/scheduler needed in v1 |

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

- `businessType`: `kitchens` | `furniture` | `doors_floors` | `doors_windows`. It sets the default product types, project units and seed data wording.
- Active brand: `?brand=<slug>` in demo mode, otherwise the `BRAND` env var. Theme applied through CSS variables. Missing or invalid brand files fall back to a neutral brand.
- **Brand Setup page** (`/setup`, PIN-protected, demo convenience, not real auth): upload a logo → suggested colors (reuse the color extraction I already built in 3d_designer), set name/phone/city, live preview, then **"Apply & reseed demo"**, which regenerates demo data with the brand's name and city.

## Visual design & Night Mode

The app must look like modern software on a mid-range phone, and be **scannable in a second**: icons, colors, bars and timelines carry meaning before any text is read. The prototype's `tokens.css` is the source; the app maps it to Tailwind/shadcn variables.

- **Font: Inter** (400, 500, 600, 700) from Google Fonts, with OpenType features `cv02`, `cv03`, `cv04`, `cv11`, and tabular numbers for every amount and date. Self-host the font files in the app (no runtime dependency on Google), falling back to the system UI font.
- **Type scale** (phone-first, crisp): body 15px, secondary 13px, captions and badges 11.5px; headings 17–30px. Euro figures and page titles use tight letter-spacing (−0.02em).
- **Palette (light)**: cool alabaster canvas `#F6F8FA`, white cards, soft borders `#EAEEF4`, subtle layered shadows. Status colors have one meaning each: red = past due, amber = waiting (cash with an installer, pauses, a busy installer), green = paid/done/free, blue = information (measurements, opening balances).
- **Not everything is a white box**:
  - The Sot headline is a layered dark brand card with the stacked "where is the money" bar.
  - Quick actions are tactile tiles with a tinted icon badge.
  - Schedules are an agenda/timeline: a time badge on the left, a vertical connector, a color-coded left accent per visit type (Matje blue, Montim brand, Dërgesë teal, Riparim amber) and a location pill.
- **Visual cues on every row**:
  - Debt and order rows start with an anchor: the client's initials with a status dot (red past due, amber cash with an installer, grey no due date) on debts, a product icon (kitchen, wardrobe, door, flooring, project) on orders.
  - They carry a **mini payment bar**: green = paid into the office, striped amber = with an installer, grey = still to pay.
- **Order detail**:
  - The three stages are a **connected stepper** with an icon per step and a distinct active color (E re blue, Në punë brand, E kryer green).
  - A project shows a **progress ring** (installed %) and a **dual bar** comparing "Montuar" with "Paguar", so the gap (what is owed now) is visible.
- **Night Mode** (`Dritë / Errët`):
  - A complete dark token set under `[data-theme="dark"]`: canvas `#0B0F17`, cards `#131B26`, inset surfaces `#1C2636`, borders `#233044`, and soft translucent status tints.
  - Brand colors adapt automatically: the app derives a lighter "ink" shade of the brand primary for links, active tabs and chips, and a mid-tone "fill" shade for buttons, so any client's brand stays bright and readable on dark cards (tested with dark navy, green and brown brands).
  - Toggled with one tap (moon/sun) in the header and in Cilësimet ("Pamja: Dritë / Errët"), saved per device. With no saved choice, the device setting decides. Set the theme before first paint so there is no white flash. The customer tracking page follows the visitor's device setting.

## Core features (v1)

### 1. Sot (the owner's start screen)
- **Headline: "Kush më ka borxh"**: the overdue total (or the total outstanding when nothing is overdue), a **stacked bar** splitting the money not yet in the office into "Jashtë afatit", "Në afat", "Pa afat" and "Te montuesit", and the top three names, linking to the debts list.
- **"Kërkon vëmendje"**, at most four quiet rows, each linking to where the thing is handled:
  - cash with an installer, not handed over: "Driton: €800 për t'u dorëzuar"
  - visits from past days not marked done: "1 punë nga dje: a u krye?" (because the debts list depends on work being marked done)
  - how many debts could get a reminder now ("3 klientë presin një kujtesë")
- **"Punët e sotme"**: today's visits as an agenda (time, client, type, place, installer), with a link to Orari.
- Quick action tiles: **+ Porosi e re**, **+ Pagesë** (search the client, then the payment sheet), **+ Borxh i bartur**.
- No charts, no "orders at risk", no message queue.

### 2. Kush më ka borxh
- Three groups: **"Me vonesë"** (past the due date), **"Afat i panjohur"** (no due date known: counted in the total, not in overdue, no reminder suggested), **"Ende në afat"** (folded by default). Sort by amount or by days overdue.
- One row = name, what it's for (order number · product, "40 / 100 copë" for a project, or "Borxh i bartur"), amount owed now, how late, **one status line** (the most decisive of: "€X te Driton, pa dorëzuar", "Mos sugjero kujtesa", "Kujtesat në pauzë deri më …", "Ka punë të mbetura: …", "Kujtesa e fundit: 12 ditë më parë"), the message button and the call button.
- **The message button is a green labelled "Kujtesë" only when a reminder is reasonable now** (see §7). Otherwise it is a quiet icon that still lets the owner write by hand.

### 3. Orders
- **Human-friendly order number** (`2026-041`), because people say it on the phone.
- **+ Porosi e re** asks only for: **Klienti / Kompania**\*, **Telefoni**\*, **Produkti**\* (chips per business type + a short description), **Çmimi i marrë vesh**\*, **Avans/Kapar** (optional, with Kesh/Bankë/Kartelë), **Ku bëhet puna** (city, one tap, defaults to the company's city) + **"Si të shkoni / Pikë referimi"** (one free-text field), and **Shënim i brendshëm** (optional). Plus the project switch (below).
  - **"Si të shkoni"** is shown to installers and goes into their message. It holds everything about the place: village/neighbourhood, reference point ("Te xhamia e vjetër, kthesa e dytë djathtas, shtëpia me fasadë të bardhë"), the person on site and their phone ("Babai Fatmir 044 512 330"), and optionally a pasted Google Maps link. Phone numbers and links in it become tappable; a maps link turns into "Hap në Maps".
  - **"Shënim i brendshëm"** is never put into a message (e.g. "Zbritje €200 sepse e rekomandoi Shpendi").
  - **The client is the person who pays** and gets reminders. In the diaspora case (the son in Germany pays, the parents in Podujevë receive the kitchen), the son is the client and the parents go into "Si të shkoni".
- **Three stages, fixed keys** (labels can be renamed per company; the tracking page, rules and reports always use the key):

  | Key | Staff label | Customer label | Meaning |
  |---|---|---|---|
  | `new` | E re | Porosia u pranua | Agreed, work not started |
  | `active` | Në punë | Në punë | Being made, ordered from the supplier, or being installed in parts |
  | `done` | E kryer | E kryer | Installed, delivered or picked up; the money becomes due |
  | `cancelled` | Anuluar | – | Side state |

  - The stage is changed with one tap on a three-part control on the order. Moving back is allowed and logged; no reasons, no "skip step" ceremony.
  - Moving to **E kryer** asks, in one sheet: did the customer pay the rest (no / all / part, and where the money is: in the office or with the installer), and, if money remains, **"Kur paguan pjesën tjetër?"**: `Brenda javës` (default, 7 days) · `Brenda muajit` (30 days) · `Në një datë` · `Nuk e di` (→ "Afat i panjohur").
- **Visits (Vizitat)**: an order has zero or more visits: **Matje**, **Montim**, **Dërgesë** or **Riparim**. Each has a date, an optional time (**"Paradite"**, **"Pasdite"**, an exact hour, or none), an optional installer and a short note. A pickup order simply has no visit.
  - Marking an installation/delivery visit done opens the same sheet as "E kryer" (the €800 phone call, §5), with "Porosia është e kryer" pre-checked.
  - Marking a measurement done offers to attach the **notebook photo** ("Foto e fletores"). The installer usually sends it on WhatsApp; the owner adds it from the phone's gallery.
- **Multi-unit projects** (e.g. 100 doors for a building under construction, kitchens for 24 apartments): an optional switch on the new-order form, **"Montohet në disa herë? (p.sh. 100 dyer për një ndërtesë)"**, adds **Sasia** and **Njësia** (`copë` / `m²` / `banesa`) and a payment term for each part (`Brenda javës` / `Brenda muajit` / `Nuk e di`). Off by default, so normal orders never see it.
  - **"Shëno montim"** records a part installed: date, installer, quantity ("8 copë"). Its value is quantity × unit price (contract ÷ quantity), editable for mixed products. Planned project visits record their quantity when marked done.
  - The order shows progress: **"40 / 100 copë"** and "€10.000 nga €25.000 të montuara".
  - Recording the first part moves a `new` project to `active`. The owner marks it `done` at the end, which makes the remainder of the contract due.
  - If the owners say "situacion" for these interim settlements, the label can follow.
- **Ka punë të mbetura**: a flag on a done order with a note ("Një derë duhet rregulluar; klienti paguan €150 e fundit pas rregullimit"). Setting it offers to pause reminders in the same step; a return visit is just a **Riparim** visit. "Puna u përfundua" clears it. On the tracking page the last step shows as in progress while the flag is on.
- **Pauzo kujtesat deri më…**: any order or opening balance can have reminders paused until a date, with a short reason ("Premtoi të paguajë kur vjen në Kosovë").
- **Ndrysho porosinë**: every field can be edited, including the price and the project quantity. A price change takes an optional note ("+1 dollap"). Each change is written to the history ("Çmimi: €5.000 → €5.200 · +1 dollap"). There is no separate discount or adjustments list.
- **Anulo / Fshij**: cancelling keeps the order (out of all totals). Deleting is for orders created by mistake: Pronari only, and only when the order has no payments.
- **Photos** are for the company's own records: notebook pages, finished work. They are never shown to customers.
- **Views**: a **list** with search (name, phone, order number; "avans"/"kapar" finds orders with only a deposit) and stage chips (incl. "Projekte"), and a **three-column board** on tablet/desktop. **Order detail**: one alert at a time (cash with an installer, remaining work), the stage control, the money, the visits, then quiet rows that open in place (place & directions, client, tracking page link, photos, internal note, history).

### 4. Payments & debts
- **Record a payment**: amount, method (Kesh / Bankë / Kartelë), date, note, and for cash **where the money is now**: **"Në zyrë"** or **"Te montuesi (Driton)"**.
- **Ndrysho / Fshij**: any payment can be edited (both roles) or deleted (Pronari). No reversal rows, no mandatory reasons. Every edit and delete leaves a line in the history with who, when and old → new ("Pagesa €1.500 u fshi · Arben · 19.10.2026").

#### Cash with installers ("Para te montuesit")
- When an installer phones to say "mora €800", the owner records the payment with **"Te montuesi (Driton)"**. The customer **has paid**: the app never asks the customer for the same money twice.

  ```
  €800 te Driton · pa dorëzuar ende
  Klienti ka paguar. Për t'u mbledhur shtesë: €0
  ```

- The amount waits under **"Para te montuesit, pa dorëzuar"**, per installer, with how many days it has been outstanding, until the owner taps **"Konfirmo: i mora paratë nga Driton"** (one payment) or **"Konfirmo të gjitha"** (everything that installer holds). Konfirmo means only that the cash reached the office.
- Cash an installer hasn't handed over is **never the customer's debt again**, however long it takes. If it was recorded by mistake (wrong amount, wrong order, the customer didn't actually pay), the owner edits or deletes the payment. Partial handovers are out of scope.

#### Balances
- Per order:
  - **Customer has paid** = all payments (in the office + with installers)
  - **Money in the office** = payments not held by an installer
  - **Owed now** ("Për t'u paguar tani"):
    - normal order: nothing until it is **done**; then the agreed price − paid
    - project: value of the parts installed so far − paid (the whole contract once it's done). Never the full contract while it's in progress. If the customer paid more than the installed value, the order shows **"Paguar përpara €X"**, which is not debt.
- **Due date**: for a normal order, the term chosen when it was marked done. For a project, each installed part is due after the project's term, and **payments cover the oldest parts first**: the order is late from the due date of the oldest part not yet paid for.
- **Overdue** when owed now > €0 and today is past the due date. "Nuk e di" → "Afat i panjohur" (counted in the total, not overdue, no reminder).
- Example: €25.000 for 100 doors (€250 each), €5.000 avans. After 15 doors: owed €0, paid ahead €1.250. After 40 doors: owed €5.000, late from the part that took the installed value past €5.000. After a €4.000 payment: owed €1.000.

#### Opening balances ("Borxh i bartur")
For debts that existed before the app. The owner often knows only "Blerimi më ka borxh €450".
- A separate record type, clearly labelled **"Borxh i bartur"** everywhere. It is **not** an order: no stages, no visits, no tracking link, and the app never invents an original sale or payment history.
- Short form: name, phone, **amount owed** (required), what it was for (optional), when the work was done (optional; a date, month/year, or "nuk e di"), note.
- **Due date (required decision in the form): "Kur duhej paguar?"**
  - a date (exact, or approximate as a month) → overdue days are calculated from it
  - **"Nuk e di"** → shown as **"Afat i panjohur"**. The owner can set a date later.
- Payments, pauses and "Mos sugjero kujtesa" work exactly as for orders.
- This is how the owner moves the notebook into the app on day 1.

### 5. Orari & installers
- **Orari**: visits by day (**Sot / Nesër / 7 ditët e ardhshme**), grouped by installer, plus "Pa montues". Each row: time ("paradite", "08:30" or nothing), client, visit type, place, "Mblidh €X" when the owner wants cash collected. At the top: **"Nga ditët e kaluara"**, past visits not marked done, each with a one-tap "U krye".
- **"Dërgo te montuesi"** on every visit: the installer is preselected (choosing one also assigns the visit), the text is shown for editing, then **WhatsApp** (primary) or **Viber** (text copied, chat opened). Afterwards the app asks "U dërgua?" and logs it on the order. The message contains:

  ```
  Montim · E enjte 23.10 · paradite
  Fatmir Krasniqi · +383 44 512 330
  Podujevë
  Te xhamia e vjetër, kthesa e dytë djathtas, shtëpia me fasadë të bardhë. Babai është në shtëpi gjithë ditën.
  Kuzhinë në formë L, MDF mat
  Mblidh: €800
  Porosia 2026-014
  ```

  The visit note and the maps link are added when present. **"Mblidh €X"** is a switch in the send screen, on by default for installation/delivery when money remains on a normal order. The internal note is never included.
- **"Dërgo Dritonit punët e nesërme"**: in Orari, one button per installer per day sends all of that day's visits in one message, numbered, in time order. This is what owners do the evening before.
- **The €800 phone call**: open the visit → **"Montimi u krye"** → one sheet: **"A pagoi klienti?"** [Jo ende] [Po, të gjitha €800] [Një pjesë] · **"Ku janë paratë?"** [Te Driton] [Në zyrë] (the visit's installer preselected) · ☑ **"Porosia është e kryer"** → save. The order is done, the customer owes €0, and the €800 sits under "Para te montuesit". For a project visit, the same sheet asks **"Sa u montuan?"** instead of closing the order.
- No drag-and-drop, no capacity planning, no checklists, no GPS.
- Installers are managed in **Cilësimet → Montuesit** (name, phone, WhatsApp/Viber).

#### Punët e montuesve (who is free, who did what)
So the owner can answer "A mund të vini të premten?" without remembering every installer's day:
- **Live availability in "Planifiko vizitë"**: when the date is picked or changed, each installer chip shows that day's load: **"Faton · i lirë"** (green dot), **"Besnik · 1 punë"**, **"Driton · 2 punë"** (amber from 2 jobs). The visit being edited is not counted. Under the chips, a helper box describes the selected installer's day: "Të premten, 23 tetor, Dritoni ka 2 punë: Paradite — Montim te Besa (Prishtinë) · Pasdite — Matje te Rinor (Prishtinë)", or "Faton është i lirë në këtë datë."
- **Orari → "Montuesit"** (a fourth tab next to Sot · Nesër · 7 ditë):
  1. **"Kush është i lirë?"**: a 7-day strip (today + 6 days) per installer. Each cell shows that day's load: empty/"—" for free, a soft brand badge for 1 job, an amber badge for 2 or more. Tapping a cell opens that installer's jobs for that day.
  2. **"Kush sa punë ka kryer"**: one card per installer with **Në pritje** (planned visits not done), **Të kryera** (installations, deliveries, measurements, repairs, and project units installed, e.g. "18 banesa", "40 copë"), and **Para në dorë** (cash taken from customers and not handed over, linking to "Para te montuesit"; otherwise "€0 në dorë").
- Load counts every visit (measurement, installation, delivery, repair) assigned to that installer on that date, done or not. No capacity limits or warnings that block saving: the owner decides.

### 6. Customer tracking page `/t/<random-token>`
- Read-only, no login, `noindex`. Token: at least 128 bits of randomness.
- Company logo and colors, the client's language.
- **Three steps: "Porosia u pranua" → "Në punë" → "E kryer"**, with one warm headline ("Porosia juaj është në punë").
- **The next planned visit**, if there is one: "Montimi · E enjte, 23 tetor · paradite". No promised dates, no delay notices.
- For a project: **"40 nga 100 copë të montuara"** with a progress bar.
- While "Ka punë të mbetura" is on, the last step shows "Po përfundojmë detajet e fundit".
- Buttons: WhatsApp the company, call, Viber, directions to the showroom.
- No photos and no balance on this page.
- **On the order**, the link lives in one quiet row: copy, **"Dërgo linkun"** (prepared message), "Parapamje", and a small **"Link i ri"** for when it was sent to the wrong number (one confirm, no reason). An old link shows a neutral page: "Ky link nuk është më aktiv. Na kontaktoni." with the company phone, and nothing about the order.
- Must look beautiful on a phone. The customer shows this page to their family.

### 7. Messages to customers (prepared, sent by hand)
- **No queue and no schedule.** Messages are written from where the owner already is: the green "Kujtesë" on the debts list, and **"Shkruaj klientit"** on the order, which offers a few templates:
  - **Avansi/Kapari u pranua** (thanks + tracking link)
  - **Vijmë për …** (the next visit's type, date and time + link)
  - **Linku i porosisë**
  - **Faleminderit** (after the work, with the Google review link)
  - **Kujtesë për pagesë**: the first is polite, later ones gentler ("vetëm një kujtesë e vogël…"), chosen from the message history; never aggressive
  - **Mesazh i lirë**
- Template variables: `{customerName}`, `{orderNumber}`, `{product}`, `{date}`, `{time}`, `{balance}`, `{depositWord}`, `{trackingLink}`, `{companyName}`, `{companyPhone}`, `{staffName}`. Templates per language (sq/en/de), editable in settings.
- **When the green "Kujtesë" shows**: owed now > €0, a known due date has passed, reminders are not paused, the client isn't flagged **"Mos sugjero kujtesa për borxh"** (relatives, friends, big contractors), and **no reminder was sent in the last 7 days**. The last reminder is always visible ("Kujtesa e fundit: 12 ditë më parë · WhatsApp").
- Sending: tap **Send** → the app opens **WhatsApp** (`https://wa.me/<number>?text=...`) by default, from the user's own phone, with the text prefilled. Viber is the second option: it can't prefill a chat with a specific number, so the app **copies the text** and opens `viber://chat?number=...`. SMS (`sms:<number>?body=...`) is a small fallback. On return, the app asks **"U dërgua?"** and logs the message on the order or opening balance.
- Messages are signed with the user's first name and the company ("Teuta, Druri Design").
- Keep a `MessageProvider` interface so real API sending can be added later (WhatsApp Cloud API, Viber Business, SMS gateway). In v1, only `ClickToSendProvider` and, in demo mode, `MockProvider`, which shows the message in a phone-style preview.

### 8. Settings (Cilësimet)
- Brand, deposit term (Avans / Kapar), stage labels, product types and project units, message templates, installers (Montuesit), users (Pronari only), and **Pamja: Dritë / Errët** (per device).

### 9. Export ("Eksporto të dhënat")
- Pronari only. One tap gives **one Excel file (.xlsx)** with a sheet each for orders, payments, visits, opening balances and clients, readable without the app (amounts in euros, dates as `dd.MM.yyyy`, stages and holders as Albanian words), plus a **complete JSON copy**. This answers "if you disappear, where is my data?". It is the owner's own copy, not the backup.

## Permissions

| Action | Pronari | Zyra |
|---|---|---|
| Everything daily: orders, stages, visits, payments, cash confirmation, opening balances, messages, sending to installers, tracking links | ✓ | ✓ |
| Edit payments, prices and any order field | ✓ | ✓ |
| Delete payments, opening balances, orders without payments | ✓ | – |
| Export all data | ✓ | – |
| Users and brand settings | ✓ | – |

Both see all money. Check the role in every server action.

## Data model (sketch; the Drizzle schema comes before Phase 2 code)

- `client`: name, phone, channel, language, `noReminders`, note
- `installer`: name, phone, channel, active
- `order`: number, clientId, product, description, price, stage, doneAt, city, directions, internalNote, `payTerm` (`week`/`month`/`date`/`unknown`), dueDate, project `quantity` + `unit` (null for normal orders), remainingWork, pause, trackingToken
- `visit`: orderId, type (`measure`/`install`/`delivery`/`repair`), date, time (`morning`/`afternoon`/`HH:MM`/null), installerId, note, doneAt, quantity and value (project parts), lastSentAt
- `payment`: orderId or openingId, amount, date, method, `heldBy` (installerId or null = office), handedAt, handedBy, note, createdBy
- `opening_balance`: name, phone, channel, amount, forWhat, workDone, dueDate (null = unknown), dueApprox, note, `noReminders`, pause
- `message`: recordId, recipient (client or installer), type, channel, text, sentBy, sentAt
- `history`: recordId, who, when, text, old → new (append-only)
- `photo`: orderId, kind (notebook/after/other), storage key

## Demo mode & seed data

- One command seeds **realistic data**: ~40 clients with typical Albanian names across Kosovo cities (Prishtinë, Prizren, Pejë, Gjakovë, Ferizaj, Gjilan, Mitrovicë, Podujevë, Vushtrri, Suharekë), ~10 diaspora clients (Germany, Switzerland, Austria) whose jobs are at their family's house, ~60 orders across the three stages with realistic EUR prices for the business type, **2–3 multi-unit projects** (e.g. "100 dyer · Banesat Kodra", "24 kuzhina · Kompleksi Arbëria") with parts installed and partial payments, visits this week for 3 installers, payments, **€15–30k outstanding** with some overdue, cash with installers (one exactly matching a balance, one not handed over for weeks), ~8 opening balances (some with "Afat i panjohur"), 2–3 orders with remaining work and paused reminders, a client marked "Mos sugjero kujtesa", reminder history (some sent recently, some long ago), an edited and a deleted payment in the history. About a third of the places are villages with only a reference-point description.
- Seed data adapts to `businessType`.
- **Demo date control** ("Simulate: jump forward X days"): shifts the app's "today" so overdue debts and reminder buttons change live.
- **"Reset demo"** button. One-tap login buttons for Pronari and Zyra (only when `DEMO_MODE=true`).
- **Works fully offline** on my laptop (PGlite).
- **Online demo too**: a demo instance with the brand selectable by `?brand=`. In the meeting, the laptop shows a **QR code for a tracking link**, so the owner opens it on their own phone, and I send a prepared WhatsApp message (an installer's job list or a reminder) to the owner's number.

## Out of scope for v1 (leave clean extension points)

- Installer logins or a field app, GPS location saving, checklists
- Automatic message sending, a ready-to-send queue, reminder schedules, real WhatsApp/Viber/SMS APIs
- Promised delivery dates, "at risk" warnings, delay notices
- Photos or balances on the tracking page
- Payment plans and contract tranche schedules, retention (garancia), per-item prices inside a project
- Partial cash handovers from installers
- Charts and monthly reports, English/German staff screens (i18n keys are ready)
- Quotes/offers, lead management, calendar drag-and-drop, capacity planning
- Printable receipts, service/warranty module (only "Ka punë të mbetura" and Riparim visits exist)
- Multi-tenant SaaS, accounting/fiscal integration, inventory

## Quality requirements

- Fast on mid-range Android phones. Touch targets at least 44px.
- zod validation with clear Albanian error messages.
- **History (Historiku) for every important change** (who, what, old → new, when): stage, price and order edits, payments created/edited/deleted, cash confirmed, visits, reminder pauses, remaining work, messages sent, tracking link replaced. Records can be edited or deleted; **the history itself is append-only**.
- Money as integer cents; never floats.
- Tests:
  - balances: paid = office + installers; owed now for normal orders (nothing until done) and projects (installed value − paid, paid ahead, oldest unpaid part sets the due date)
  - the €800 case: recorded "Te montuesi" → owed €0, no reminder, money in office €0; Konfirmo → money in office €800
  - cash not handed over for weeks → the customer stays at €0 and gets no reminder; only editing/deleting the payment changes that
  - payment edit/delete changes the balance and writes history
  - opening balances with a known and an unknown due date
  - the reminder rule: overdue, paused, "Mos sugjero", unknown due date, sent less than 7 days ago, demo date offset
  - stages by key: forward, back, renamed labels don't change behaviour; marking done sets the due date from the term
  - tracking page: the three steps, the next visit, project progress, replaced link
  - installer load per day (planned and done visits counted, the visit being edited excluded) and the completed-jobs summary per installer
  - permissions: Zyra can't delete or export

## Production readiness (before the first real client)

Barely visible in a sales demo, but required before real money and real customers are in the app:
- **Database backups**: Neon point-in-time restore plus a nightly `pg_dump` to separate storage (a backup bucket, not the app's own database), kept 30 days.
- **File storage is append-only**: every upload gets a new unique key and is never overwritten in place. Deleting a photo in the app only marks it deleted; the file is removed later by a cleanup job after the backup retention period.
- **File backups**: R2 doesn't support bucket versioning (Cloudflare lists `GetBucketVersioning`/`PutBucketVersioning` as unimplemented), so use a nightly copy of the photo bucket into **dated backup folders** in a separate backup bucket, kept for **30 days**. Earlier copies must survive if a file in the app bucket is later overwritten or deleted.
- **Tested restore**: a written restore procedure, actually run once on a copy (database + files + users + settings) before go-live, then every 3 months. A backup that has never been restored doesn't count.
- **Corrections are traceable**: every payment edit/delete is in the append-only history. The Excel export stays as the owner's own copy, but it is not the backup.
- **Tracking link replacement** working and tested.
- Real auth: demo login buttons and `/setup` PIN disabled, Pronari and Zyra passwords set.

## Work plan

The project is built in phases; see [PHASES.md](PHASES.md). The first phase is an interactive HTML prototype in `prototype/`; once I approve it, the app's design follows it. In the app build phases, keep the app running after each phase, and end every phase with the report described in PHASES.md (what was built, how to run it, what to test manually, what's next).

Before you start coding the app, give me the plan, the data model (Drizzle schema) and the folder structure. At the end, write a `README.md` covering:
- how to run it locally (offline, PGlite)
- how to rebrand it for a new client in under 15 minutes
- how to deploy a client instance (Vercel + Neon + R2)
- how backups work and how to restore
- where to plug in real WhatsApp/Viber/SMS providers later
