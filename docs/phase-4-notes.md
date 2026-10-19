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
- **"Hiq vizitën"** removes a planned visit (both roles) with a history line. A done visit is corrected on the order: ordinary visits with "Ndrysho" → "Nuk u krye" (see the review fixes below), project parts via "Montimet e kryera".
- **A visit done without closing the order**: unticking "Porosia është e kryer" records the payment and marks the visit done, the stage stays.
- **The tracking link** is shown with Kopjo, "Dërgo linkun", "Parapamje" and "Link i ri" in the order's "Faqja e klientit" row, as in the prototype.

## Review fixes (19.10.2026)
The independent review of Phase 4 found two problems; both are fixed, tested and redeployed.

**1. Correcting a completed ordinary visit.** A measurement, repair or ordinary installation/delivery marked done had no correction path.
- The done row on the order ("Të kryera") now has **Ndrysho** (both roles, like every edit): the day it was done (not in the future), the installer and the note. The visit moves to that day in Orari, the installer load and "Përmbledhja e montuesve". History: "Vizita e kryer u ndryshua: Montim · 19.10.2026 · Besnik → Montim · 18.10.2026 · Driton".
- In the same sheet, **"Nuk u krye"** puts the visit back to planned on its date (a past date shows under "Nga ditët e kaluara"). For an installation/delivery on a done order it offers ☑ "Porosia nuk është e kryer ende" (pre-ticked when the order was closed on that same day): the order goes back to active, its done date and payment term are cleared, as with the stage control. History: "Vizita u rikthye si e pakryer: …" and "Faza: E kryer → Në punë".
- **Payments and installer cash are never touched.** The sheet lists the payments recorded that day ("Pagesat nuk ndryshojnë: €2.800 te Besnik…") and points to Pagesat for a correction. Marking the visit done again offers only what is still left, so a payment can't be duplicated; nothing is removed silently.
- Moving a done visit to another installer does not move the cash: the payment stays with whoever was recorded until it is confirmed or edited.
- Project parts keep their own flow ("Montimet e kryera" → Ndrysho / Fshij); the new actions refuse them, and refuse a cancelled order. `saveVisit`/`removeVisit` still refuse done visits.
- Consequences checked: Borxhet (a reopened order isn't owed until done again), the tracking page (back to "Në punë"; a past visit isn't shown as the next one), Orari and the installer summaries.

**2. Reminder timing on the demo date.** Messages were stamped with the real time, so on demo +7 a fresh reminder already looked 7 days old.
- `appNow()` (`src/server/today.ts`) is the real time shifted by the same demo offset as `appToday()`. Customer messages (`sentAt`) and installer jobs ("dërguar", `lastSentAt`) are stamped with it. History lines keep the real time.
- The reminder rule reads a message's day in Kosovo time (it read the UTC day, so a reminder sent between 00:00 and 02:00 counted for the day before).
- With no demo offset nothing changes. After "Kthe në sot" a reminder logged on a demo date lies in the future: it shows "Kujtesa e fundit: sot" and no green "Kujtesë" until 7 days after its demo date. The demo date is a per-browser demo tool and the data is shared, so this is accepted for the demo; a fixture reset clears it.

**3. Found while re-testing the deployment: a wrong password crashed the login page on Vercel** ("A server error occurred") instead of "Email ose fjalëkalim i gabuar.". The production bundle holds a second copy of Better Auth's `APIError`, so `instanceof` missed it; the login action now also checks the error's name. (Dev mode was not affected, so the local tests never saw it.)

**4. Undoing a repair that cleared "Ka punë të mbetura"** (found by the re-review). "Riparimi u krye" with "Puna u përfundua" clears the flag and its "Punë të mbetura" pause; "Nuk u krye" reopened the visit but left both cleared, so the tracking page said "Puna përfundoi. Faleminderit!" and the green "Kujtesë" showed for the €150.
- The history line of "Puna u përfundua" from a repair now also keeps (internally) what it cleared: the note and the pause date.
- "Nuk u krye" on a done repair of a done order without remaining work offers ☑ **"Ka ende punë të mbetura"** with the note (editable, required) and ☑ **"Pauzo kujtesat për borxh deri më …"**: both pre-ticked when this repair cleared them. The pause returns to its old date while that is still ahead, else 14 days from today, as when the flag is set. A repair from before this fix shows the box unticked and empty.
- Later changes are kept: remaining work set again by hand is not overwritten, and a pause already on (e.g. "Premtoi të paguajë") stays and is only mentioned. Payments and installer cash are not touched. History: "Ka punë të mbetura: …" and "Kujtesat në pauzë deri më …: Punë të mbetura" after "Vizita u rikthye si e pakryer: …".
- Same roles as "Nuk u krye" (both). Other visit types ignore it.
- Consequences checked: tracking page back to "Po përfundojmë detajet e fundit" (last step in progress), Borxhet shows the pause and no green "Kujtesë", the order alert shows the remaining work again; done again, it clears again.
- Tested: 3 unit tests (restore with pause, a pause that ran out → 14 days, no pause tick, a later manual pause or remaining work kept, note required, other types ignored) and 1 Playwright test on laptop and phone (demo +7, repair done, tracking + green Kujtesë, "Nuk u krye" → restored, tracking + Borxhet re-checked).

**Verified:** lint, typecheck, 108 unit tests (new: done-visit edit/reopen with the order and payments, project parts and cancelled orders refused, demo +7 / +13 / +14 and back to today, the Kosovo day boundary, installer "dërguar" on the demo date) and 54 Playwright tests on laptop and phone (new: "Nuk u krye" → reopened order → done again with a single €2.800 payment; demo +7 reminder → no green button, also after "Kthe në sot"). The demo test fails without the fix. The production build passes. On the updated test deployment the same Playwright suite passes except "works offline", which by design only allows localhost requests.

## Test deployment
- Vercel project (functions in `fra1`, Frankfurt) + Neon Postgres (Frankfurt), loaded with the fixtures only. `vercel.json` sets the region and runs the migrations before the build (`pnpm vercel-build`).
- Environment variables are set in Vercel only (never in Git): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `APP_URL`, `BRAND`, `DEMO_MODE`, `FIXTURE_PASSWORD`, `FIXTURES_TOKEN`, `SETUP_PIN`.
- `/setup` writes brand files to disk, which a Vercel deployment can't keep; on the test deployment the brand is the bundled `druri-design`.
