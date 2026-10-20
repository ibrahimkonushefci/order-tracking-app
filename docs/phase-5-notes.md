# Phase 5 notes: demo-ready

Built 20.10.2026 on top of Phase 4 (`24aad69`). The design follows the approved v10 prototype; the demo controls are the prototype's laptop demo bar and panel, brought into the app as **demo mode** (`DEMO_MODE=true` only). Phase 4's physical-phone and real-delivery checks are **still pending**; nothing here marks them passed.

## What was built

**1. Realistic demo data** (`src/db/demo/`)
- `seed.ts` builds the full dataset in memory, `load.ts` bulk-inserts it (about one second on PGlite), `catalog.ts` holds what each business type sells (kitchens, furniture, doors & floors, doors & windows) with realistic 2026 Kosovo prices.
- Per brand: 56 clients (Besa Zeka is a returning client with two orders since the review fixes; 10 abroad: Germany, Switzerland, Austria, with the job at the family's house), 57 orders (10 new, ~16 active, ~31 done), 8 opening balances, three projects, visits this week for Driton, Faton and Besnik, about a third of places in villages with a reference-point description. Outstanding €16–30k depending on the business type (unit test: €15–30k for all four), with overdue, unknown-date and in-term debts.
- The key cases are fixed and easy to find (the demo panel links to each): the **live €800** (Fatmir Krasniqi, installation today with Driton, €800 left, nothing recorded yet), Besa Zeka's installation tomorrow (the QR), Driton's tomorrow (Besa + Rinor's measurement), Shpend Berisha's green "Kujtesë" (last reminder 20 days ago), Valbona (reminded 3 days ago), Mimoza (remaining work, pause, repair visit), Lindita (€350 with Besnik for 23 days), Arbnor (Faton holds exactly the balance), the cousin with "Mos sugjero kujtesa", Naim (deleted duplicate payment and an edited price), Flamur in Switzerland (paused: "kur vjen në Kosovë"), Liridona in Germany (German messages, replaced link), Granit (yesterday's measurement not marked done), the busy Friday (Driton 2, Besnik 1, Faton free).
- Projects per business type: one **owes and is late** (e.g. "24 kuzhina · Kompleksi Arbëria", "100 dyer · Banesat Kodra"), one is **paid ahead** ("12 garderoba · Rezidenca Rugova", "900 m² parket · Qendra Albi"), one has only the deposit.
- **One company per demo brand.** Every folder in `brands/` with `"demo": true` gets its own company, its own Pronari/Zyra and its own data, so `?brand=` switches logo, business type, deposit word and data together. Names of the owner and office come from an optional `brands/<slug>/demo.json` (Druri: Arben/Teuta; Lumi: Burim/Vjosa, as in the prototype). The installers are always Driton, Faton and Besnik so the script never changes.
- Demo tracking tokens are derived from the brand and the case, so the same order has the **same link on the laptop and online**. Real orders keep 128 random bits.
- The small fixture set (`pnpm fixtures`, Phases 2–4) is unchanged and still used by the regression tests.

**2. Demo controls** (`src/components/demo-bar.tsx`, `src/server/demo*.ts`)
- Login page: **"Hyr si Arben · Pronari"** and **"Hyr si Teuta · Zyra"** (the brand's own names), above the normal form.
- Laptop/tablet: the prototype's **demo bar** above the shell: brand, "Shiko si" (Arben/Teuta, same screen), the moments **1 Borxhet · 2 Klienti · 3 WhatsApp · 4 Pagesa €800 · + Projekti**, the demo-date note, the meeting number and **Më shumë…**. Phones: a **Demo** button (▶) in the header opens the same panel.
- Panel: the moments, "Shiko si", brand, **Data e demos** (+1 / +7 / Sot), **Numri i takimit**, all 16 cases, **Rivendos demon** (with a confirm).
- **Reset** reloads every demo brand to its starting point, clears this browser's demo date and signs back in as the same role. It keeps the meeting number.
- `pnpm demo` does the same from the terminal (through the running app, or directly when it is stopped).
- All of it is gone with `DEMO_MODE=false`: no buttons, bar, panel, QR, meeting number, `?brand=`, reset endpoint, daily reseed or `DEMO_PUBLIC_URL` (checked by `pnpm test:demo-off`).

**3. Online sales demo and QR**
- `?brand=<slug>` goes through `/demo/brand`, which remembers the brand and, when someone is signed in, moves the session to the same role in that brand's company. Signed out, the login page shows the brand its buttons sign into.
- The **tracking page takes its brand from the order's company** (logo, colours, title, theme colour), because the owner's phone has no brand cookie.
- **QR** (moment 2, and a "QR" button on every order's "Faqja e klientit" row in demo mode): a built-in encoder (`src/lib/qr.ts`, no new dependency). It always encodes the reachable HTTPS address: `APP_URL` online, `DEMO_PUBLIC_URL` on the laptop (`https://order-tracking-test.vercel.app`). If neither is set it warns that the link won't open on a phone. Choices: Besa (installation tomorrow), the project's progress, Liridona in German, a replaced link.
- Tracking links inside prepared messages also use that address, so a reminder or "Dërgo linkun" sent from the laptop opens on the owner's phone.
- **Numri i takimit**: type the owner's number in the panel (kept 12 hours, this browser only). Every send screen then offers "Dërgo te: Numri i takimit · … / Driton · …"; WhatsApp opens for the chosen number with the text, and the person reviews and sends it. Nothing is sent by the app.
- The online demo reseeds itself on the **first request of each day** (`DEMO_DAILY_RESET=true`), so "tomorrow" stays tomorrow. It only refreshes data seeded by the demo; the test fixtures are never touched by it.

**4. PWA and reliability**
- Manifest with PNG icons made from the brand logo (192, 512, 512 maskable, 180 for iPhone), `id`, description, theme colour, Apple web-app meta.
- Cilësimet → **"Instalo në telefon"**: the browser's own install button where Chrome offers it, otherwise the two-line how-to for Android and iPhone.
- The service worker is unchanged (app shell; data stays live).

**5. Pitch kit** (`docs/pitch-kit/`): the 3-minute demo script, the one-page offer with price placeholders, the rebrand checklist.

## Decisions and differences
- **One company per brand** instead of reseeding one company on every brand switch: two browsers (laptop and phone, or two brands) never fight over the data, and the existing `companyId` on every table already supported it.
- **`/setup` → "Apliko dhe rimbush demon"** now also takes the owner's and office's names, writes the brand, reseeds the demo for all demo brands and signs in as the new brand's Pronari (spec: "Apply & reseed demo"). On a deployment the file system is read-only: the page says to add the brand through Git (`pnpm deploy:demo`).
- **Druri Design is `kitchens`** again. Since Phase 2 its brand.json said `doors_floors`, which contradicted its tagline, the prototype and the fixtures (Kuzhinë). The product chips for "+ Porosi e re" are now kitchen chips for Druri.
- **The €800 shortcut opens the order**, not the sheet, so the three taps are shown live (Montimi u krye → Po, të gjitha €800 → Ruaj).
- **Demo panel styles** reuse the prototype's demo bar (it is demo chrome, not app UI). The phone Demo button sits in the header next to the moon and gear.
- The **Sheet** got one option (`autoFocusField`) so the panel doesn't jump to the phone field on laptops.
- Order numbers in the demo start at 2026-041 (as if the year began before the app).
- The installers' phone numbers stay fictional; the meeting number replaces them only for the one message you choose to send.

## Verified (20.10.2026)
- `pnpm lint`, `pnpm typecheck`, `pnpm test`: 130 unit tests (19 new: 16 for the demo data — size, totals per business type, every key case, per-brand logins, identical tokens across seeds — and 3 for the QR encoder).
- `pnpm test:e2e`: 72 Playwright tests on laptop and phone sizes (56 existing + 16 new: one-tap logins, the €800 from the panel in three taps, "Shiko si", `?brand=` with data and a cookie-less tracking page, the QR address, the meeting number in the WhatsApp link and back to Driton, demo date + reset, the PWA manifest and icons).
- **Offline**: the production build (`pnpm build && pnpm start`) ran inside a macOS sandbox that blocks every non-localhost connection (checked first: the same curl to the online demo fails inside, works outside). The demo reset and the full 72-test suite passed against it, and the server log showed no failed outbound attempt. The laptop's Wi-Fi itself was not switched off: that is your check (below).
- **Demo mode off**: a second production instance with `DEMO_MODE=false` passed `pnpm test:demo-off`.
- **Online** (https://order-tracking-test.vercel.app, deployed from `e6b58c8` with `pnpm deploy:demo`, `DEMO_DAILY_RESET=true` added to the Vercel project): the same 72 Playwright tests pass against it except "works offline" (by design it allows only localhost requests). Without cookies, the tracking pages of the laptop's QR links open with the right brand, the next visit "Nesër · paradite", the German page and the neutral page for the replaced link. The online demo was reset to the demo data afterwards.
- **QR**: generated codes were decoded with macOS's own QR reader (CoreImage), including a screenshot of the panel: it reads `https://order-tracking-test.vercel.app/t/<token>`.
- Two existing tests needed fixing, without behaviour changes: one hard-coded the date 29.10.2026 (it failed on any later day), and the demo bar's "Arben" made one text lookup ambiguous; the login helpers now click the exact "Hyr" button.

## Review fix (20.10.2026): brand switch from a record screen
The independent review found that switching brand on a record screen (e.g. "4 Pagesa €800" → "Lumi") kept the old company's order ID in the URL, so the new brand showed a 404.
- One rule, `pathAfterBrandSwitch` (`src/lib/demo-paths.ts`): an order, a notebook debt (`/debts/<id>`), a customer message (`/compose/…`) or an installer send screen (`/send/…`) falls back to its list (Porositë, Borxhet, Orari). Sot, the lists with their filters, and the new-order/new-debt forms are kept.
- Used by the brand links of the laptop demo bar and the phone's Demo panel, and again on the server by `/demo/brand`, so a typed or old `?brand=` link is safe too. The role is kept (Teuta → Vjosa, Arben → Burim).
- The record screens themselves, in demo mode, send a record that isn't in the signed-in company to the list instead of a 404 (`missingRecord`), e.g. an old URL from the browser history after a switch or a reset. With demo mode off they still answer 404.
- Tested: 2 unit tests (the rule for every screen type, lists and forms unchanged), 2 Playwright tests on laptop and phone (from the €800 order as Zyra: lands on Lumi's Porositë as Vjosa, and the old URL redirects; from a debt, both compose screens, a visit send and a day send, each to its list as Burim; Sot and three filtered lists keep their URL), the demo-off check (an unknown order is still a 404), and the reviewer's steps in the browser. Unit tests 132, Playwright 76 (local).

## Still pending (needs you and real phones)
- Phase 1 and Phase 4 physical-phone checks (thumb comfort, a real WhatsApp arriving with tappable numbers and a working link, a tracking link on another phone).
- Phase 5: install on a mid-range Android, the laptop with Wi-Fi off, the QR scanned by a real phone camera, a message to a real "Numri i takimit". See the checklist in the Phase 5 report and `docs/pitch-kit/rebrand-checklist.md`.
