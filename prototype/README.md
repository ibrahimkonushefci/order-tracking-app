# Prototype (Phase 1)

Clickable HTML prototype of the order-tracking app. Plain HTML/CSS/JS: no `package.json`, no build step, no backend. All data is fictional and generated in the browser, with dates relative to today.

## Run

```bash
cd prototype
python3 -m http.server 8765 --bind 0.0.0.0
```

- Laptop: open http://localhost:8765
- Phone on the same Wi-Fi: open `http://<laptop-ip>:8765` (on a Mac: `ipconfig getifaddr en0`)
- Opening `index.html` directly from disk also works in most browsers.

On a phone (or any window narrower than 700px) the device frame and top bar disappear and the app fills the screen. The prototype controls are then behind the **round avatar button** in the app header.

## Demo

The laptop bar holds only what a sales demo needs:
- **Shiko si**: the owner, an installer, or the customer's tracking page.
- **The four demo moments**, in order: ① Kush më ka borxh, ② Faqja e klientit, ③ Mesazhi në WhatsApp, ④ the installer reporting "Mora €800" from his phone (go back with **Shiko si → owner** and "Sot" shows the cash waiting to be handed over).
- **Më shumë…**: the office role, every Phase 1 case for review, the 30-order test set, demo date, Avans/Kapar, frame size and reset.

The default data is a small cast with one story per person (≈ the Phase 3/4 fixtures in PHASES.md): Fatmir (€800 case, son pays from Germany, village directions), Shpend (big overdue), Besa (installation this week, tracking page), Granit (supplier delay), Mimoza (remaining work, paused reminders), Bekim (owner's cousin, no reminders), Ardita (pickup, skipped steps), Naim (reversed payment), Rinor (measurement today), plus two notebook debts (Blerim "Nuk e di", Kadri). The full 30-order set is under **Më shumë → Të dhënat**.

Orders created with **+ Porosi e re** live only in that browser, so their tracking links don't open on another phone. The seeded orders' links do (their tokens come from a fixed seed).

## Files

| File | What it is |
|---|---|
| `css/tokens.css` | **Design tokens**: brand colours, semantic colours, spacing, radius, type scale, shadows, touch sizes. The app adopts these. |
| `css/app.css` | Components (buttons, cards, badges, sheets, stepper, kanban, tracking page) built only from tokens. |
| `js/brands.js` | Two sample brands in the brand.json v2 shape: Druri Design (kitchens) and Lumi Dyer & Parket (doors/floors, with a renamed stage label). |
| `js/logic.js` | The rules: balances in integer cents, reported vs confirmed cash, overdue, reminder suggestions and why they're suppressed, stage keys/skipping, tracking timeline. |
| `js/data.js` | Fake seed data: the curated demo cast by default, the 30-order test set on request. Every Phase 1 test case is in one or the other. |
| `js/app.js` | Screens, bottom sheets, router, prototype controls. |

Changes you make in the prototype are kept in the browser (localStorage) per brand until you press **Rivendos** or the date changes. After editing files, bump `?v=` in `index.html` so phones don't use a cached copy.
