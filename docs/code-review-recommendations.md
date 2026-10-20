# Order Tracking — Code Review Recommendations

**Audit Date:** 2026-10-20  
**Scope:** Optional v1 features, workflow improvements, and sales-demo enhancements ordered by practical value.  
**Guardrails:** Suitable for a lean v1. Photo/camera uploads remain deferred beyond v1, and Phase 6 (deploy/production onboarding) remains deferred until a client shows serious interest or buys the app. Bugs affecting existing intended behaviour are covered separately in [`docs/code-review-findings.md`](file:///Users/ibrahimi/Order%20tracking/docs/code-review-findings.md).

---

## Summary Matrix

| Priority | ID | Recommendation | Category | Effort | Target Timing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **R-01** | [Existing-client autocomplete on *Porosi e re* (`/orders/new`)](#r-01-existing-client-autocomplete-on-porosi-e-re-ordersnew) | Workflow & Data Quality | ~2–3 hours | **Quick win** (before/during sales demos) |
| **2** | **R-02** | [Keep the customer-link QR code available outside Demo Mode](#r-02-keep-the-customer-link-qr-code-available-outside-demo-mode) | Sales Value & Showroom UX | ~15 mins | **Quick win** (before/during sales demos) |
| **3** | **R-03** | [Search filter on *Borxhet* (`/debts`)](#r-03-search-filter-on-borxhet-debts) | Usability | ~1–1.5 hours | **Quick win** (before/during sales demos) |
| **4** | **R-04** | [Client's other orders & total open balance in the *Klienti* fold](#r-04-clients-other-orders--total-open-balance-in-the-klienti-fold) | Business Context | ~1.5–2 hours | **Quick win** (or early client request) |
| **5** | **R-05** | [Editable *Shënim për klientin* (`client.note`) in the *Klienti* fold](#r-05-editable-shënim-për-klientin-clientnote-in-the-klienti-fold) | Schema Completion | ~1 hour | **Wait for client feedback** |
| **6** | **R-06** | [Settings UI for *Llojet e punës* (`productTypes`) and *Fazat* (`stageLabels`)](#r-06-settings-ui-for-llojet-e-punës-producttypes-and-fazat-stagelabels) | Onboarding & Self-Service | ~3–4 hours | **Wait for client feedback** |
| **7** | **R-07** | [Print stylesheet (`@media print`) for *Të dhënat (Fletë)* and *Sot*](#r-07-print-stylesheet-media-print-for-të-dhënat-fletë-and-sot) | Workshop Bridge | ~2 hours | **Wait for client feedback** |

---

## Part 1 — Quick Wins (High Sales & Daily-Use Value)

### R-01: Existing-client autocomplete on *Porosi e re* (`/orders/new`)

- **User problem / sales benefit:**  
  In [`createOrder`](file:///Users/ibrahimi/Order%20tracking/src/services/orders.ts#L106-L131), a new order only attaches to an existing [`client`](file:///Users/ibrahimi/Order%20tracking/src/db/schema.ts#L55-L71) record if both `clientName.toLowerCase()` and `phone` match an existing client row exactly. Otherwise, it creates a new `client` row. When a repeat customer (such as a construction company like *Arbëria Invest sh.p.k.* or a family ordering bedroom wardrobes after a kitchen) places a second order, the user has to remember and re-type their exact name and phone number. During a live demo, typing `"Arbëria..."` and having the app recognize the client and auto-fill their phone (`+383 44 210 900`), preferred channel (`WhatsApp`/`Viber`), and language (`Shqip`/diaspora) feels immediately smart and prevents duplicate client records from slight spelling differences.
- **Concrete example:**  
  On [`/orders/new`](file:///Users/ibrahimi/Order%20tracking/src/app/(app)/orders/new/order-form.tsx#L131-L162), pass a lightweight list of existing clients (`id`, `name`, `phone`, `preferredChannel`, `language`) to `OrderForm`. When typing in *Emri i klientit*, show a subtle suggestion list below the input (up to 4 matching clients) showing `Arbëria Invest sh.p.k. · +383 44 210 900`. Tapping a suggestion fills the name, phone, country code, and language fields automatically.
- **Rough effort:** ~2–3 hours (small prop addition in [`/orders/new/page.tsx`](file:///Users/ibrahimi/Order%20tracking/src/app/(app)/orders/new/page.tsx) and a lightweight dropdown list in [`order-form.tsx`](file:///Users/ibrahimi/Order%20tracking/src/app/(app)/orders/new/order-form.tsx)).
- **Tradeoffs:**  
  Slightly increases the payload of `/orders/new` by a few kilobytes of client names/phones, which is negligible for workshop-scale client lists (hundreds of clients). Make sure free-text entry remains unchanged when typing a brand-new client name.

---

### R-02: Keep the customer-link QR code available outside Demo Mode

- **User problem / sales benefit:**  
  In [`LinkControls`](file:///Users/ibrahimi/Order%20tracking/src/components/sheets/link.tsx#L21-L65), the inline `QR` button on `/orders/[id]` (*Faqja e klientit*) is currently gated behind `{demoMode && ...}` (`line 52`). Yet the local [`QrCode`](file:///Users/ibrahimi/Order%20tracking/src/components/qr-code.tsx) generator is already built, zero-dependency, and works offline. In a real furniture or door showroom in Kosovo, a customer often pays their deposit (*Avans* / *Kapar*) in person at the desk. Letting the owner or office staff tap `QR` on the screen so the customer can scan their order tracking page right before walking out of the showroom is a great real-world selling point—even when the owner hasn't added the customer on WhatsApp/Viber yet.
- **Concrete example:**  
  Remove the `demoMode` condition around the `QR` toggle button in [`src/components/sheets/link.tsx`](file:///Users/ibrahimi/Order%20tracking/src/components/sheets/link.tsx#L52-L64) so every active customer link on `/orders/[id]` has `Hap`, `Kopjo`, `Dërgo`, `QR`, and `Zëvendëso`.
- **Rough effort:** ~15 minutes.
- **Tradeoffs:**  
  Adds one small secondary button (`QR`) to the link action bar in production mode. Since the *Faqja e klientit* section is already collapsed inside a `<details>` fold by default, it adds zero clutter to the main order screen.

---

### R-03: Search filter on *Borxhet* (`/debts`)

- **User problem / sales benefit:**  
  [`/orders`](file:///Users/ibrahimi/Order%20tracking/src/app/(app)/orders/page.tsx) and the global [`PayPickSheet`](file:///Users/ibrahimi/Order%20tracking/src/components/sheets/pay-pick.tsx) both have instant search by client name, phone, description, or location. However, [`/debts`](file:///Users/ibrahimi/Order%20tracking/src/app/(app)/debts/page.tsx) only has sort chips (*Më të vonuarat*, *Shuma më e madhe*, *Afati*) and category filters (*Nga defteri*, *Të diskutueshme*, *Kujtesat e ndaluara*). Once a workshop imports 20–40 old notebook balances (*Nga defteri*) plus active orders, finding a specific debtor on `/debts` (for example, to check when the last reminder was sent or to open an old notebook balance) requires scrolling through the entire list.
- **Concrete example:**  
  Add a compact search input (`Kërko klientin, telefonin ose përshkrimin…`) on [`/debts`](file:///Users/ibrahimi/Order%20tracking/src/app/(app)/debts/page.tsx) above or beside the filter chips, matching `row.client.name`, `row.client.phone`, `row.title`, and `row.location` just like [`/orders`](file:///Users/ibrahimi/Order%20tracking/src/app/(app)/orders/page.tsx#L58-L71).
- **Rough effort:** ~1–1.5 hours.
- **Tradeoffs:**  
  Adds one input row above the debt list. Keeping it visually identical to the search bar on `/orders` maintains a consistent, familiar layout across both tabs.

---

### R-04: Client's other orders & total open balance in the *Klienti* fold

- **User problem / sales benefit:**  
  In furniture and window/door businesses, builders (*Arbëria Invest sh.p.k.*) and homeowners frequently have more than one order or an old notebook debt alongside a new order. Because `loadBook()` already loads all orders and opening balances on [`/orders/[id]`](file:///Users/ibrahimi/Order%20tracking/src/app/(app)/orders/[id]/page.tsx#L106), the page already has the data in memory to know if the same client (`clientId` or matching `phone`) has other active orders or unpaid balances—without running any additional database query. Showing this inside the *Klienti* fold gives the owner full financial context before calling the client or negotiating a final payment.
- **Concrete example:**  
  Inside the *Klienti* fold on [`/orders/[id]/page.tsx`](file:///Users/ibrahimi/Order%20tracking/src/app/(app)/orders/[id]/page.tsx#L604-L633), if the client has other orders or opening balances in `book`, render a compact list with clickable links:  
  `Porosi të tjera të këtij klienti: 24 dyer të brendshme — Blloku B (Gati · €4,200 mbetur)`.
- **Rough effort:** ~1.5–2 hours (pure UI rendering using the already-loaded `book` object on `/orders/[id]`).
- **Tradeoffs:**  
  Only appears when a client actually has >1 record, so single-order clients see no change at all.

---

## Part 2 — Wait for Client Feedback (Post-Sale / Onboarding)

### R-05: Editable *Shënim për klientin* (`client.note`) in the *Klienti* fold

- **User problem / sales benefit:**  
  The database schema already has [`client.note`](file:///Users/ibrahimi/Order%20tracking/src/db/schema.ts#L64), the demo seed populates it (`"Kushëri i pronarit"`, `"Z. Agron, menaxheri i projektit"`), and [`/orders/[id]`](file:///Users/ibrahimi/Order%20tracking/src/app/(app)/orders/[id]/page.tsx#L628-L630) already displays it inside the *Klienti* fold when non-empty. However, there is no UI anywhere to add or edit a client note. Owners often want to jot down a relationship or contact detail (`"Arch. Driton miraton matjet"`, `"Mos dërgo kujtesa automatike — mik i shtëpisë"`).
- **Concrete example:**  
  Add an optional *Shënim për klientin* text field inside [`EditOrderSheet`](file:///Users/ibrahimi/Order%20tracking/src/components/sheets/order.tsx#L473-L569) (under the client details section) or directly inside the *Klienti* fold on `/orders/[id]`.
- **Rough effort:** ~1 hour.
- **Tradeoffs:**  
  Low urgency before a sale because `order.note` (*Shënim*) already covers order-specific notes during demos. Worth adding once a paying client starts entering their real customer base.

---

### R-06: Settings UI for *Llojet e punës* (`productTypes`) and *Fazat* (`stageLabels`)

- **User problem / sales benefit:**  
  As noted in [`F-11`](file:///Users/ibrahimi/Order%20tracking/docs/code-review-findings.md), [`company.productTypes`](file:///Users/ibrahimi/Order%20tracking/src/db/schema.ts#L34) and [`company.stageLabels`](file:///Users/ibrahimi/Order%20tracking/src/db/schema.ts#L32) are already JSONB columns in PostgreSQL and wired into [`productPresetsFor`](file:///Users/ibrahimi/Order%20tracking/src/domain/catalog.ts#L50-L71) and [`stageLabelsFor`](file:///Users/ibrahimi/Order%20tracking/src/services/orders.ts#L45-L53), but currently can only be changed via code/seed files (`brands/*.ts`). When onboarding a real workshop (for example, a kitchen maker who also builds custom wooden stairs or pergolas, or a PVC window shop that wants `"Xhami & kornizat"` instead of `"Prodhim"`), letting `Pronari` edit product chips and stage names in *Cilësimet* (`/settings`) avoids developer round-trips.
- **Concrete example:**  
  In [`/settings`](file:///Users/ibrahimi/Order%20tracking/src/app/(app)/settings/page.tsx), add a collapsible *Katalogu & fazat* section for `Pronari` where they can rename the 6 stage labels and add/remove quick-pick product chips (`Kuzhinë`, `Gardërobë`, `Shkallë`, etc.).
- **Rough effort:** ~3–4 hours.
- **Tradeoffs:**  
  Not needed for the sales demo because `/setup` and the two seeded brands (*Druri Design* and *Lumi Dyer & Dritare*) already showcase tailored presets and stage names. Wait until the first client buys.

---

### R-07: Print stylesheet (`@media print`) for *Të dhënat (Fletë)* and *Sot*

- **User problem / sales benefit:**  
  While the app is mobile-first and uses WhatsApp/Viber for installer assignments, some Kosovo workshop owners still like to print a clean single-page list of open debts (*Borxhet*) before a weekly partner meeting, or print the morning's installation schedule (*Sot*) to pin on the workshop wall. Currently, printing from the browser includes the top navigation bar, bottom tab bar, demo bar, and action buttons.
- **Concrete example:**  
  Add a compact `@media print` block in [`src/app/globals.css`](file:///Users/ibrahimi/Order%20tracking/src/app/globals.css) that hides `.demo-bar`, `.topbar`, `.bottomnav`, `.sheet-backdrop`, and `.btn`, expands `<details class="fold">`, and formats `.sheet-table` and `.visit-list` cleanly on A4 paper.
- **Rough effort:** ~2 hours (CSS-only).
- **Tradeoffs:**  
  Zero runtime or UI complexity cost in normal screen viewing; only activates when a user presses `Cmd/Ctrl + P`. Best added if an interested owner asks *"A mund ta printoj këtë listë?"* during a demo or onboarding.
