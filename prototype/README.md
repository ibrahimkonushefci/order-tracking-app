# Prototype (Phase 1, v10)

Clickable HTML prototype of the order-tracking app. Plain HTML/CSS/JS: no `package.json`, no build step, no backend. All data is fictional and generated in the browser, with dates relative to today.

v8 follows the simplified product direction in [../order_tracking_instructions.md](../order_tracking_instructions.md):
- Only **Pronari** (owner) and **Zyra** (office) log in, with the same screens.
- Installers are contacts who get their jobs on WhatsApp.
- Orders have **three stages** (E re → Në punë → E kryer). Dates live only on optional **visits**.
- **Multi-unit projects** owe only what has been installed.
- Payments are corrected with **Ndrysho / Fshij**, and every change is kept in Historiku.
- The customer tracking page stays, simplified.

v9 adds two things on top of the v8 workflow:
- **Punët e montuesve.** The installer chips in "Planifiko vizitë" show each installer's load on the chosen date, with a helper box ("Të premten, 23 tetor, Dritoni ka 2 punë: …"). Orari has a **Montuesit** tab: a 7-day availability grid ("Disponueshmëria" since v10) and a card per installer with Në pritje, Të kryera and Para në dorë.
- **Visual redesign + Night Mode.** Inter font, a tighter type scale, an alabaster palette, a layered Sot headline with a "where is the money" bar, action tiles, agenda timelines with color-coded visit types, initials and product icons on rows, mini payment bars, a connected stage stepper, the project ring with "Montuar vs Paguar" bars, and a full dark theme (moon/sun in the header).

v10 adopts the **approved redesign** ("redesign 01", approved 19.10.2026) as the visual source of truth. The workflow, the data and every business rule are unchanged from v9: `logic.js`, `data.js` and `export.js` are byte-for-byte the v9 files, and `app.js` only changes markup, navigation, labels, theme shades and keyboard/modal behaviour. What changed:
- A full-width desktop/tablet shell with a sidebar (Sot · Porositë · Borxhet · Orari, plus Para te montuesit, Cilësimet and the signed-in user); a compact bottom tab bar on phones.
- Quieter palette and type: sage/forest for Druri, slate blue for Lumi, smaller radii, 14px body text (16px in form inputs on phones), 44px touch targets kept.
- Solid brand fills and crisp borders for every selected state (tabs, filters, sorting, form choices, personas, message-template and installer chips); in Night Mode they use the bright brand ink with dark text.
- Sot: one money overview, grouped quick actions, attention items, the day's agenda. Borxhet: aligned rows, grouped totals and a separate "Para te montuesit" summary. Order detail: stage and visits next to the money on wide screens. Orari: the 7-day availability grid scrolls sideways on phones.
- Sheets have a close button, close with Escape, and keep the page behind them inert.

Wording changes in v10 (labels only; stage keys and rules are the same):

| Before (v9) | Now (v10) |
|---|---|
| Kush më ka borxh | Borxhet |
| Gjithsej për t’u mbledhur | Gjithsej |
| Tabela (order board) | Bordi |
| Ku & si të shkoni | Adresa dhe udhëzimet |
| Kush është i lirë? | Disponueshmëria |
| Kush sa punë ka kryer | Përmbledhja e montuesve |
| Klient i ri (quick action helper) | Shto porosi |
| Auto (frame selector in the bar) | Ekrani |

The v9 prototype is in git as "Prototype v9: owner+office scope…" (commit `b5285ad`). v7 (the calm redesign) is saved as the commit "Prototype v7 checkpoint".

## Run

```bash
cd prototype
python3 -m http.server 8765 --bind 0.0.0.0
```

- Laptop: open http://localhost:8765
- Phone on the same Wi-Fi: open `http://<laptop-ip>:8765` (on a Mac: `ipconfig getifaddr en0`)
- Opening `index.html` directly from disk also works in most browsers.
- Inter is loaded from Google Fonts, so it needs internet. Offline, the prototype falls back to the system font and everything else still works. The app will self-host the font.

On a laptop the app fills the window with a sidebar (**Ekrani**); the **Telefon / Tablet** selector in the top bar previews it in a device frame, and the choice stays while you navigate. On a phone (or any window narrower than 700px) the top bar disappears, the app uses a bottom tab bar, and the prototype controls are behind the **round avatar button** in the app header.

Other header buttons:
- **Moon/sun** switches Dritë / Errët. The choice is saved; with no choice saved, it follows the device setting.
- **Gear** opens Cilësimet (installers, Pamja, Avans/Kapar, Excel export).

## Demo

The laptop bar holds only what a sales demo needs:
- **Shiko si**: Arben (Pronari), Teuta (Zyra), or the customer's tracking page. Teuta sees the same screens but can't delete payments/orders/debts or export.
- **The four demo moments**, in order:
  1. **Borxhet** ("Kush më ka borxh"): green "Kujtesë" only where a reminder is reasonable now (overdue, not paused, not "Mos sugjero", nothing sent in 7 days).
  2. **Faqja e klientit**: three steps and tomorrow's installation ("paradite").
  3. **Dërgoja Dritonit në WhatsApp**: tomorrow's jobs for one installer as one message → simulated WhatsApp preview → "U dërgua?".
  4. **Driton telefonon: "Mora €800"**: opens "Montimi u krye". Tap "Po, të gjitha €800" (Te Driton is preselected) → Ruaj. The customer owes €0 and the €800 waits under "Para te montuesit" until Konfirmo.
  - **+ Projekti**: 24 kitchens (Druri) or 100 doors (Lumi). Tap "Shëno montim" and the amount owed now grows by quantity × unit price. Never the whole contract.
- The bar shows the moments with short labels (Borxhet, Klienti, WhatsApp, Pagesa €800, Projekti); the full text is in each button's tooltip and in Më shumë.
- **Më shumë…**: every case for review, including "Montuesit: disponueshmëria" and "Planifiko për të premten" (opens the visit sheet on the busy Friday). It also holds Pamja, demo vs. test data, demo date (+1 / +7 days), frame size and reset.
- **Dritë / Errët** at the right of the bar switches Night Mode.

The default data is a small cast with one story per person (≈ the Phase 3/4 fixtures in PHASES.md):

| Person | Story |
|---|---|
| Fatmir | The €800 case: installation today, village directions |
| Shpend | Big overdue; reminder due now (last sent 20 days ago) |
| Valbona | Reminded 3 days ago, so no green button |
| Mimoza | Remaining work, paused reminders, a repair visit |
| Lindita | €350 with an installer for 23 days |
| Bekim | Cousin: "Mos sugjero kujtesa" |
| Besa | Installation tomorrow; the tracking page |
| Rinor | Measurement tomorrow |
| Granit | Yesterday's measurement not marked done |
| Naim | A deleted duplicate payment and an edited price in Historiku |
| Flamur | Pays from Switzerland; parents' house in "Si të shkoni" |
| Builder | A builder's project |
| Arta, Dardan, Kujtim | The demo week: on the coming Friday, Driton has 2 jobs (Arta, Dardan), Faton is free, Besnik has 1 |
| Notebook | Blerim ("Nuk e di") and Kadri |

Orders created with **+ Porosi e re** live only in that browser, so their tracking links don't open on another phone. The seeded orders' links do, because their tokens come from a fixed seed.

## Files

| File | What it is |
|---|---|
| `css/tokens.css` | **Design tokens**: brand colours, semantic colours (light, and a full dark set under `[data-theme="dark"]`), visit-type and stage colours, spacing, radius, Inter type scale, shadows, touch sizes. The app adopts these. |
| `css/app.css` | Components built only from tokens, so dark mode needs no extra styling. Covers buttons, cards, badges, sheets, the hero card, tiles, agenda timeline, row anchors, payment bars, the stepper, the project ring, the availability grid, the board and the tracking page. |
| `js/brands.js` | Two sample brands in the brand.json v2 shape: Druri Design (kitchens, "Avans") and Lumi Dyer & Parket (doors/floors, "Kapar"), each with three installers and a sample project. |
| `js/logic.js` | The rules, in integer cents: <br>• balances: paid = office + with installers<br>• owed now (normal orders when done; projects = installed value − paid, oldest batch first)<br>• due dates from the payment term<br>• the 7-day reminder rule<br>• installer load per day and the per-installer summary<br>• tracking steps<br>• customer and installer message texts |
| `js/data.js` | Fake seed data: the curated cast by default, ~14 extra orders and 4 extra notebook debts in the test set. |
| `js/export.js` | "Eksporto të dhënat": a real `.xlsx` (orders, payments, visits, notebook debts, clients) written by a tiny built-in zip writer, so it works offline. |
| `js/app.js` | Screens, bottom sheets, router, prototype controls, and Night Mode. In dark mode it derives a light "ink" and a mid-tone "fill" shade from any brand primary. |

Changes you make in the prototype are kept in the browser (localStorage) per brand until you press **Rivendos** or the date changes. After editing files, bump `?v=` in `index.html` so phones don't use a cached copy (currently `?v=10`).

Browser storage keys: this prototype uses `ot-proto-prefs` and `ot-proto-v<STORE_VERSION>:<brand>`, the same keys as v9, so data and preferences already saved in a browser keep working. The redesign review copy used its own keys (`ot-redesign-prefs`, `ot-redesign-v…`); those records are left alone and are never read or deleted by this prototype. It's demo data, not a migration.
