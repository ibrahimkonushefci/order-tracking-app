# Phase 4 notes: Orari, WhatsApp & tracking page

Built 19.10.2026 on top of Phase 3 (`6996295`). The design follows the approved v10 prototype; differences are listed below.

## Where things live
- `src/domain/visits.ts` visits and "Punët e montuesve": time order, "Nga ditët e kaluara", the next/due visit, installer load per day (planned and done, the visit being edited excluded), the 7-day grid, the per-installer summary, "Mblidh €X".
- `src/domain/messages.ts` prepared texts: customer templates in sq/en/de with the spec's variables, the first/gentler reminder, installer job and day texts (Albanian, never the internal note), and `sendHref` (the click-to-send provider: WhatsApp with text, Viber opens the chat after copying, SMS fallback).
- `src/domain/debts.ts` now also holds the green "Kujtesë" rule (`reminderCheck`), so every debt row carries it.
- `src/domain/tracking.ts` the tracking page's steps, headline and customer texts in sq/en/de.
- `src/services/visits.ts` plan / edit / remove a visit, and "U krye" (measurement, repair, project part, the €800 call), in one transaction each.
- `src/services/messages.ts` logging after "U dërgua? Po" (customers and installers), "Link i ri", the client's language and channel, installers, message templates.
- Screens: `/schedule` (Sot · Nesër · 7 ditë · Montuesit, a day per installer), `/send/visit/…`, `/send/day/…`, `/compose/order|opening/…`, `/t/[token]`, and the new rows on the order, the opening balance, Borxhet, Sot and Cilësimet.
- `src/db/fixtures-phase4.ts` the Phase 4 fixtures (header comment lists them).
- `src/server/today.ts` the demo date offset; `src/server/jobs.ts` the public tracking address (`APP_URL`, else the request host).

## Decisions and differences from the prototype
- **No photos.** Order/job photos are out of scope for v1 (decided 19.10.2026). "Matja u krye" asks only for a short note; the "Fotot" row and the notebook-photo step of the prototype are not built. The `photo` table stays reserved.
- **Sending is the person's own phone.** "Dërgo me WhatsApp" opens `wa.me` with the text; Viber copies the text and opens the chat; SMS opens the SMS app. The app then asks "U dërgua?" and writes the message and the history line only on "Po". In demo mode a "Parapamje në telefon" button shows the prototype's phone-style preview (the `MockProvider`), without sending.
- **"Mblidh €X"** is on by default for installations and deliveries of normal orders with money left; the switch swaps the prepared text (unless the person already edited it).
- **The client's language** (sq/en/de) and channel are set in the order's "Klienti" row (and on an opening balance); the compose screen can switch the language for one message. The tracking page uses the client's language; an unknown or replaced link shows the neutral Albanian page.
- **Templates** are editable per language in Cilësimet → "Mesazhet për klientët" (Pronari). A field left at the default text isn't stored, so improvements to the defaults still arrive. Extra variables beyond the spec: `{visitType}`, `{what}` (what the reminder is for), `{amount}` (the deposit) and `{reviewLink}`.
- **Opening balances** offer only "Kujtesë për pagesë" and "Mesazh i lirë" (no tracking link, no visits).
- **Demo date control** is in Cilësimet → "Data e demos" (+1 / +7 days / back to today), demo mode only, per browser (cookie). Sot shows "demo +N ditë" while it is on. The full demo bar comes with Phase 5.
- **Installers** can be added and edited by both roles (they are contacts, not users); they are set inactive instead of deleted, so history keeps their name.
- **"Hiq vizitën"** removes a planned visit (both roles) with a history line; a done visit is corrected through the order (project parts via "Montimet e kryera").
- **A visit done without closing the order**: unticking "Porosia është e kryer" records the payment and marks the visit done, the stage stays.
- **The tracking link** is shown with Kopjo, "Dërgo linkun", "Parapamje" and "Link i ri" in the order's "Faqja e klientit" row, as in the prototype.

## Test deployment
- Vercel project (functions in `fra1`, Frankfurt) + Neon Postgres (Frankfurt), loaded with the fixtures only. `vercel.json` sets the region and runs the migrations before the build (`pnpm vercel-build`).
- Environment variables are set in Vercel only (never in Git): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `APP_URL`, `BRAND`, `DEMO_MODE`, `FIXTURE_PASSWORD`, `FIXTURES_TOKEN`, `SETUP_PIN`.
- `/setup` writes brand files to disk, which a Vercel deployment can't keep; on the test deployment the brand is the bundled `druri-design`.
