# Code, Usability & Performance Audit — Findings Report

**Audit Date:** 20 October 2026  
**Scope:** End-to-end review of the Phase 5 Order Tracking application (`/Users/ibrahimi/Order tracking`) — code, business logic, permissions, UI/UX across desktop and mobile viewports, demo tooling, database queries, performance, and test coverage.

---

## Executive Overview

The core product is in strong shape for a Kosovo furniture/doors/windows sales demo: the four headline demo moments, multi-unit project accounting, installer-held cash separation, manual WhatsApp/Viber/SMS preparation (`"U dërgua?"`), customer tracking links (`/t/[token]`), role separation (`Pronari` vs. `Zyra`), Night Mode, and multi-brand seeding (`druri-design`, `lumi-dyer`) all work cohesively and match the v10 design system.

However, hands-on browser testing and code inspection uncovered **several confirmed bugs and workflow traps**—particularly around the **Opening Balance (`Borxh i bartur`) detail screen**, **multi-unit project visit completion/undo**, **phone number country-code handling when editing records**, **cancelled order payment/cash state**, and **demo bar brand switching**. None of these corrupt the core demo script if you follow the happy path, but a few can cause visible contradictions if a prospect asks to click into a notebook debt or undo a project visit during a live meeting.

---

## 1. Fix Before the Next Client Demo

These findings are **confirmed** and directly affect screens or controls that are likely to be clicked during a live sales meeting.

---

### F-01 — Opening balance detail card shows `"Kujtesat: mund të dërgoni një tani"` even when a reminder was sent recently `[Confirmed]`

- **Severity:** Medium-High (visible contradiction on a seeded demo record)
- **Affected Area:** Opening Balance detail (`Borxh i bartur` — `/debts/[id]`)
- **Expected Behaviour:** When an overdue opening balance has had a reminder sent within the last 7 days (`rem.ok === false` with `reason: 'recent'`), the `<dl className="kv">` summary row for **Kujtesat** should reflect the 7-day cooldown (or show when the last reminder was sent), matching the contact section below it.
- **Actual Behaviour:** On `/debts/[id]`, the `reminders` summary string is computed without checking `rem.ok` or `last`:
  - In the `<dl className="kv">` summary list, **Kujtesat** says **`mund të dërgoni një tani`** ("you can send one now").
  - Directly below it in the **exact same card**, the note line says **`Kujtesa e fundit: 3 ditë më parë · whatsapp`** and the green `Kujtesë` button is hidden (replaced by the quiet manual-write icon).
  - Additionally, `last.channel` is interpolated raw (`whatsapp` / `viber`) instead of the translated channel name (`WhatsApp` / `Viber`). This raw lowercase channel string also appears on `/orders/[id]` and `/compose/[kind]/[id]`.
- **Reproduction Steps (Verified in Browser):**
  1. Log in to the demo (`Hyr si Arben`) and open **Borxhet** (`/debts`).
  2. Click **Blerim Hasani** (`Borxh i bartur · Dollap banjoje, 2024`, €450 overdue, reminded 3 days ago in demo seed).
  3. Inspect the main card: `<dt>Kujtesat</dt><dd>mund të dërgoni një tani</dd>` appears right above `Kujtesa e fundit: 3 ditë më parë · whatsapp` and the hidden `Kujtesë` button.
- **Code Evidence & File References:**
  - `src/app/(app)/debts/[id]/page.tsx:42` — `const reminders = tot.owed <= 0 ? t('remNoDebt') : !ob.dueDate ? w('dueUnknown') : pauseOn ? ... : ob.noReminders ? t('remOff') : (late ?? 0) <= 0 ? t('remNotDue', { date: fmtDate(ob.dueDate) }) : t('remPhase4');` (leftover Phase 3 key `remPhase4` that ignores `rem` and `last`).
  - `src/app/(app)/debts/[id]/page.tsx:95`, `src/app/(app)/orders/[id]/page.tsx:531`, `src/app/(app)/compose/[kind]/[id]/page.tsx:66` — passes `channel: last.channel` instead of `w(\`channelName.\${last.channel}\`)`.
- **Practical Impact:** Blerim Hasani is the very first `Borxh i bartur` in the demo seed (`seed.ts:1171`). If an owner clicks Blerim Hasani during a demo to see how notebook debts look, the card contradicts itself in two adjacent lines.

---

### F-02 — Opening balance detail page lacks installer-held cash warning banner, `Konfirmo` button, payment badge, and deleted-payment strikethrough `[Confirmed]`

- **Severity:** Medium (broken workflow parity between orders and notebook debts)
- **Affected Area:** Opening Balance detail (`/debts/[id]`) & Installer Cash (`/cash`)
- **Expected Behaviour:** Recording a cash payment on a `Borxh i bartur` (`PaymentSheet`) lets the user choose `Ku janë paratë? → Te Driton / Te Faton / Te Besnik`. Just like `/orders/[id]`, `/debts/[id]` should:
  1. Show the amber warning banner (`€X te Driton · pa dorëzuar ende`) with the one-tap `Konfirmo: i mora paratë nga Driton` button (`ConfirmCashButton`).
  2. Show the warning badge (`Te Driton`) on unconfirmed installer-held payments in the payment list.
  3. Apply the `.pay--deleted` class (strikethrough amount, muted text) to soft-deleted payments in the payment list.
- **Actual Behaviour:**
  1. `/debts/[id]` has **no** amber alert banner and **no** `ConfirmCashButton` when an opening-balance payment is held by an installer. The user cannot confirm handover from `/debts/[id]` and must navigate away to `/cash`.
  2. Unconfirmed installer-held payments in `/debts/[id]` show no `Badge tone="warning"`.
  3. Soft-deleted payments in `/debts/[id]` render `<div className="pay" key={p.id}>` without `.pay--deleted`, so the deleted payment amount (`€100`) remains full-contrast and un-struck right next to the `E fshirë` badge.
- **Reproduction Steps (Verified in Browser):**
  1. Open **Blerim Hasani** (`/debts/[id]`), click **Regjistro pagesë**, enter `100`, select **Te Driton**, and click **Ruaj pagesën**.
  2. Observe `/debts/[id]`: balance drops to €350, but there is no warning banner, no `Konfirmo` button, and no warning badge on the payment row (whereas `/cash` shows the €100 under Driton).
  3. Click **Ndrysho** on that €100 payment, click **Fshij pagesën**, select **U regjistrua dy herë**, and confirm. Observe that `€100` on `/debts/[id]` has no `.pay--deleted` class (no line-through).
- **Code Evidence & File References:**
  - `src/app/(app)/debts/[id]/page.tsx:50-165` vs. `src/app/(app)/orders/[id]/page.tsx:104-125, 586, 606-610`.
- **Practical Impact:** If a prospect tests recording or deleting a payment on a notebook debt (`Borxh i bartur`), the page looks half-finished compared to `/orders/[id]`.

---

### F-03 — Completing a planned installation visit on a project (`Montimi u krye`) cannot be undone by `Zyra`, and deleting the part as `Pronari` destroys the planned visit `[Confirmed]`

- **Severity:** Medium-High (workflow dead-end for `Zyra` and data loss on undo for `Pronari`)
- **Affected Area:** Multi-unit projects (`/orders/[id]`, `src/services/visits.ts`, `src/services/orders.ts`)
- **Expected Behaviour:**
  - On regular orders, Phase 4 added `Nuk u krye` (`reopenVisit`) so `Zyra` or `Pronari` can reopen a visit marked done by mistake, returning the visit to planned (`doneAt: null`).
  - On a multi-unit project, if `Zyra` clicks `Montimi u krye` (`completeVisit`) on a planned installation visit by mistake, there should be a way to reopen it without losing the planned visit or requiring `Pronari`.
- **Actual Behaviour:**
  1. `completeVisit` (`src/services/visits.ts:131-134`) delegates project `install`/`delivery` visits to `recordPartIn(..., visitId)`, which overwrites the planned `visit` row in-place (`doneAt: today, quantity: qty, value`).
  2. On `/orders/[id]`, any done visit with `v.quantity` renders `PartEditButton` (`Ndrysho montimin`) instead of `DoneVisitEditButton` (`src/app/(app)/orders/[id]/page.tsx:258-266`), and `mustLoadDone` (`src/services/visits.ts:168`) explicitly rejects visits with `v.quantity`.
  3. Inside `PartEditButton` (`src/components/sheets/order.tsx:273-346`), there is **no `Nuk u krye` button**—only `Fshij montimin` (`deletePart`), which is **restricted to `Pronari`** (`allow(actor, 'delete')`). Thus **`Zyra` cannot undo a mistakenly completed project visit at all**.
  4. Even when `Pronari` clicks `Fshij montimin`, `deletePart` (`src/services/orders.ts:378`) executes `DELETE FROM visit WHERE id = partId`, **permanently deleting the planned visit row** (losing its scheduled date, time, installer, and floor/site note such as `"Kati 2: 3 garderoba"`) instead of returning it to planned!
- **Reproduction Steps (Verified in Browser):**
  1. Log in as `Teuta` (`Zyra`), open **Ndërtimi Rugova sh.p.k.**, advance demo date `+1 ditë`, and click **Montimi u krye** on the planned visit (`Kati 2: 3 garderoba`). Enter `3` and save.
  2. Open **Montimet e kryera**, click **Ndrysho montimin**: neither `Nuk u krye` nor `Fshij montimin` exists for `Zyra`.
  3. Switch to `Arben` (`Pronari`), click **Ndrysho montimin → Fshij montimin**: the part is deleted, and the planned visit (`Kati 2: 3 garderoba`) is completely gone from **Vizitat**.
- **Code Evidence & File References:**
  - `src/services/visits.ts:131-134, 168`
  - `src/services/orders.ts:301-303, 369-384`
  - `src/app/(app)/orders/[id]/page.tsx:258-266`
- **Practical Impact:** Multi-unit projects are one of the five core demo highlights (`demo-script.md`). Accidental completion of a planned project visit cannot be undone by office staff and destroys the scheduled visit when deleted by the owner.

---

### F-04 — Project completed-visits fold header says `"Montimet e kryera (n)"` (counting only parts) but renders `Matje` and `Riparim` visits inside it — including `"Montimet e kryera (0)"` `[Confirmed]`

- **Severity:** Medium (visible UI count mismatch on every seeded project)
- **Affected Area:** Project order detail (`/orders/[id]`)
- **Expected Behaviour:** Either the fold header count should match the number of rows inside it, or non-part visits (`Matje`, `Riparim`) should be displayed separately from `Montimet e kryera`.
- **Actual Behaviour:**
  - In `src/app/(app)/orders/[id]/page.tsx:367-379`, the fold condition checks `visitsDone.length` (all completed visits), the fold title renders `t('partsDone', { n: visitsDone.filter(v => v.quantity).length })` (only parts with a quantity), and the fold body renders `visitsDone.map(visitRow)` (all completed visits including `Matje`).
  - On **Ndërtimi Rugova sh.p.k.** in the default seed, the header says **`Montimet e kryera (1)`**, but opening it reveals **2 rows** (`Montim · 3 copë` and `Matje · Driton`).
  - On **Hotel Dukagjini sh.p.k.** (0 parts installed), as soon as its `Matje` visit is marked done, the fold header says **`Montimet e kryera (0)`** and expands to show 1 `Matje` visit.
- **Reproduction Steps (Verified in Browser):**
  1. Open **Ndërtimi Rugova sh.p.k.** and click **`Montimet e kryera (1)`** → 2 rows appear.
  2. Open **Hotel Dukagjini sh.p.k.**, mark its `Matje` visit done → **`Montimet e kryera (0)`** appears.
- **Code Evidence & File References:**
  - `src/app/(app)/orders/[id]/page.tsx:367-379`
- **Practical Impact:** Immediately visible on the seeded projects if the fold is opened during a demo.

---

### F-05 — Clicking the brand switcher in `DemoBar` / `DemoPanel` strips URL query parameters on filtered views `[Confirmed]`

- **Severity:** Low-Medium (demo polish / navigation)
- **Affected Area:** Demo controls (`src/components/demo-bar.tsx`)
- **Expected Behaviour:** Switching brands between `Druri` and `Lumi` while viewing `/orders?stage=project&view=kanban`, `/schedule?d=tomorrow`, or `/debts?sort=late` should keep the current filter/tab, just as `src/proxy.ts` does when `?brand=` is passed in the URL.
- **Actual Behaviour:** `DemoBar` uses `usePathname()` (which excludes the query string) to build `/demo/brand?slug=...&next=...`. Clicking `Lumi` or `Druri` in the top demo bar or mobile demo sheet resets `/orders?stage=project&view=kanban` to `/orders`, `/schedule?d=tomorrow` to `/schedule`, and `/debts?sort=late` to `/debts`. (The e2e test in `tests/e2e/demo.spec.ts:164-169` did not catch this because it navigated via `page.goto('/orders?stage=done&brand=lumi-dyer')` instead of clicking the `DemoBar` link.)
- **Reproduction Steps (Verified in Browser):**
  1. Go to `/orders?stage=project&view=kanban` or `/schedule?d=tomorrow`.
  2. Click **Lumi** in `.demo-bar`.
  3. The browser lands on `/orders` (list view, all stages) or `/schedule` (today tab).
- **Code Evidence & File References:**
  - `src/components/demo-bar.tsx:68, 98, 170` (`const path = usePathname();` without `useSearchParams()`).
- **Practical Impact:** When comparing how `Druri` and `Lumi` look on the Kanban board or tomorrow's schedule during a pitch, clicking the brand button loses the current view/tab.

---

## 2. Worth Fixing Soon

These findings are **confirmed** and affect real day-to-day workflows (editing phone numbers, cancelling orders,demo panel UX, and late-night timezone display).

---

### F-06 — Phone editing bugs in `EditOrderSheet` and `EditOpeningButton` (country code `+383` forced or prefix change ignored) `[Confirmed]`

- **Severity:** Medium (corrupts diaspora phone numbers on edit)
- **Affected Area:** Order editing (`EditOrderSheet`) and Opening Balance editing (`EditOpeningButton`)
- **Expected Behaviour:** Editing a client's phone number on an order or opening balance should preserve or allow changing the country prefix (`+383`, `+49`, `+41`, `+43`, `+389`, `+355`) consistently with `NewOrderForm`.
- **Actual Behaviour:**
  1. **`EditOrderSheet` (`src/components/sheets/order.tsx:503-505`) & `editOrder` (`src/services/orders.ts:489`):** There is no `phoneCc` `<select>` in `EditOrderSheet`, and `editOrder` hardcodes `toE164('+383', input.phone)`. If a user edits a diaspora client's phone (e.g. `Liridona Shala` in Germany) by typing a local number like `0151 2345 6789` without `+49`, `toE164('+383', '0151 2345 6789')` silently saves it as a Kosovo number **`+383 15 123 456789`**, breaking WhatsApp links.
  2. **`OpeningFields` (`src/app/(app)/debts/new/opening-form.tsx:58-64`):** When editing an opening balance (`EditOpeningButton`), the `<select name="phoneCc">` defaults to `"+383"` **and** `<input name="phone">` defaults to `fmtPhone(initial.phone)` (`"+383 45 440 965"`), displaying `+383` twice (`[+383] [+383 45 440 965]`). Because `toE164(cc, raw)` ignores `cc` whenever `raw` starts with `+`, changing the dropdown from `+383` to `+49` without manually deleting `+383` from the text input silently ignores `+49`. (The same double-prefix issue exists in `InstallerButton` in `src/components/settings.tsx:39-44`.)
- **Reproduction Steps (Verified in Browser):**
  1. Open **Liridona Shala** (`/orders/[id]`), click **Më shumë veprime → Ndrysho porosinë**, type `0151 2345 6789` in **Telefoni**, and save → phone becomes `+383 15 123 456789`.
  2. Open **Blerim Hasani** (`/debts/[id]`), click **Ndrysho**, change prefix dropdown to `+49`, and save → phone remains `+383 45 440 965`.
- **Code Evidence & File References:**
  - `src/components/sheets/order.tsx:503-505`
  - `src/services/orders.ts:489`
  - `src/app/(app)/debts/new/opening-form.tsx:58-64`
  - `src/components/settings.tsx:39-44`
  - `src/lib/phone.ts:27-37`
- **Practical Impact:** Roughly 20% of clients in the target market are diaspora (`+49`, `+41`, `+43`). Editing their phone numbers is error-prone across all three edit sheets.

---

### F-07 — Cancelled orders still count unconfirmed installer cash in `Sot`, `Borxhet`, and `/cash`, while locking out payment editing/deletion `[Confirmed]`

- **Severity:** Medium (inconsistent state after cancelling an order)
- **Affected Area:** Order cancellation (`src/domain/debts.ts`, `src/app/(app)/orders/[id]/page.tsx`)
- **Expected Behaviour:**
  - The cancellation dialog (`more.cancelHelp` in `messages/sq.json:750`) states: *"Porosia mbetet në listë si “Anuluar”, por del nga borxhet, orari dhe totalet."*
  - Furthermore, if `Pronari` wants to delete a mistakenly created order that had a payment (`errors.hasPayments`: *"Porosia ka pagesa. Anulojeni ose fshini më parë pagesat."*), `Pronari` should be able to see why `Fshij porosinë` is unavailable (just like `OpeningMoreActions` shows `deleteHasPayments`) and should still be able to delete erroneous payments on a cancelled order.
- **Actual Behaviour:**
  1. `cashWithInstallers()` (`src/domain/debts.ts:250-252`) iterates over **all** `orders` without filtering `o.stage !== 'cancelled'`. If an order with unconfirmed installer cash (e.g., **Lindita Bytyqi**, €350 with Besnik) is cancelled, that €350 still appears in `Sot` (hero bar + `Kërkon vëmendje`), `Borxhet` (`Para te montuesit` card), `/cash`, and `Orari → Montuesit`.
  2. On `/orders/[id]`, `PaymentEditButton` is hidden when `o.stage === 'cancelled'` (`src/app/(app)/orders/[id]/page.tsx:599`), even though `deletePayment` in `src/services/payments.ts` allows deleting payments on cancelled orders. Thus, once an order is cancelled, `Pronari` cannot delete or edit its payments unless they first restore the order.
  3. On `/orders/[id]`, when an order has active payments, `canDelete` is passed as `false` (`src/app/(app)/orders/[id]/page.tsx:650`), hiding `Fshij porosinë` completely with no explanation (whereas `OpeningMoreActions` in `src/components/sheets/opening.tsx:163` shows a helpful note explaining that active payments prevent deletion).
- **Reproduction Steps (Verified in Browser):**
  1. Log in as `Arben` (`Pronari`), open **Lindita Bytyqi**, open **Më shumë veprime** (`Fshij porosinë` is hidden without explanation), and click **Anulo porosinë**.
  2. Open **Pagesat dhe llogaria** on the cancelled order: `Ndrysho pagesën` is gone.
  3. Navigate to `/cash`: **Lindita Bytyqi** (€350 with Besnik) is still listed as active installer cash.
- **Code Evidence & File References:**
  - `src/domain/debts.ts:250-252`
  - `src/app/(app)/orders/[id]/page.tsx:599, 650`
  - `src/components/sheets/order.tsx:601-605` vs. `src/components/sheets/opening.tsx:155-165`
- **Practical Impact:** Confusing recovery workflow when an order with a deposit or installer payment is created by mistake or cancelled.

---

### F-08 — Mobile `DemoPanel` `+1 ditë` / `+7 ditë` buttons leave the modal sheet open over the screen `[Confirmed]`

- **Severity:** Low-Medium (demo usability on phones)
- **Affected Area:** Demo panel (`src/components/demo-bar.tsx`)
- **Expected Behaviour:** On phones (`< 760px`), the top `.demo-bar` is hidden and the user opens the `Demo` modal sheet to advance the demo date (`+1 ditë`, `+7 ditë`) or reset to `Sot`. Clicking `Sot` closes the sheet (`if (d === null) onClose()`), and clicking `+1 ditë` or `+7 ditë` should either close the sheet or clearly update the visible date inside the sheet.
- **Actual Behaviour:** In `src/components/demo-bar.tsx:109-116`, `bump(d)` only calls `onClose()` when `d === null` (`Sot`). When clicking `+1 ditë` or `+7 ditë`, the modal sheet stays open blocking the page behind it, and inside the modal sheet the section label only shows `Data e demos: +N ditë` without showing the new calendar date or weekday.
- **Code Evidence & File References:**
  - `src/components/demo-bar.tsx:109-128`
- **Practical Impact:** Extra tap required to close the sheet every time the presenter advances the demo date on a phone.

---

### F-09 — UTC `.toISOString().slice(0, 10)` used instead of Kosovo timezone (`isoOf`) for `last.sentAt` and `p.handedAt` display `[Confirmed]`

- **Severity:** Low-Medium (wrong relative day `"dje"` vs `"sot"` between 00:00 and 01:00/02:00 Kosovo time)
- **Affected Area:** Order detail, Opening Balance detail, and Compose screens
- **Expected Behaviour:** All timestamp-to-date conversions should use `isoOf(date)` (`Europe/Belgrade` timezone in `src/lib/dates.ts:17`), which Phase 4 already introduced for `src/domain/debts.ts:154`.
- **Actual Behaviour:** Five places still use `new Date(...).toISOString().slice(0, 10)` (UTC):
  - `src/app/(app)/orders/[id]/page.tsx:531` (`last.sentAt`)
  - `src/app/(app)/orders/[id]/page.tsx:594` (`p.handedAt`)
  - `src/app/(app)/debts/[id]/page.tsx:95` (`last.sentAt`)
  - `src/app/(app)/debts/[id]/page.tsx:139` (`p.handedAt`)
  - `src/app/(app)/compose/[kind]/[id]/page.tsx:66` (`last.sentAt`)
- **Practical Impact:** Between midnight and 01:00 CET / 02:00 CEST in Kosovo, a reminder sent or cash handover confirmed "today" displays as `"dje"` (yesterday) on detail/compose screens while `/debts` displays `"sot"`.

---

## 3. Can Wait Until Production / Client Onboarding

These findings relate to resilience, error boundaries, settings configurability, and developer/deployment hygiene.

---

### F-10 — Unhandled server action exceptions in `settings/actions.ts` and missing `error.tsx` / `not-found.tsx` boundaries `[Confirmed]`

- **Severity:** Low-Medium
- **Affected Area:** Settings actions (`src/app/(app)/settings/actions.ts`) and Next.js App Router error handling (`src/app/`)
- **Expected Versus Actual Behaviour:**
  - In `src/app/(app)/actions.ts`, all server actions are wrapped in `run()` which catches `FieldError`, `NotFoundError`, and `ForbiddenError` and returns `{ ok: false, errors }`.
  - By contrast, `setDepositWord` and `setDemoOffset` in `src/app/(app)/settings/actions.ts:12-26` are bound directly to `<form action={...}>` without catching `ForbiddenError`. When invoked without permission (as seen in `playwright test` server logs: `Uncaught Error: forbidden:settings`), the error is thrown unhandled to the client.
  - There is no `src/app/error.tsx`, `src/app/(app)/error.tsx`, or custom `src/app/not-found.tsx`, so any unexpected error or 404 (when `DEMO_MODE=false`) renders Next.js's default English error/404 page instead of an Albanian v10 card.
- **Code Evidence & File References:**
  - `src/app/(app)/settings/actions.ts:12-26`
  - `src/app/(app)/settings/page.tsx:114`

---

### F-11 — Schema fields (`company.stageLabels`, `company.productTypes`, `company.projectUnits`, `client.note`) have no UI to edit `[Confirmed]`

- **Severity:** Low (acceptable for demo, relevant for first paying client onboarding)
- **Affected Area:** `Cilësimet` (`/settings`) and client/order forms
- **Details & File References:**
  - `company.stageLabels` and `company.productTypes` (`src/db/schema.ts:58-59`) are read by the app (`src/services/orders.ts:20`, `src/domain/catalog.ts:14`) and mentioned in `order_tracking_instructions.md` §8, but `Cilësimet` (`/settings`) has no UI to customize stage names (e.g., `"Në prodhim"`) or product chips per workshop.
  - `company.projectUnits` (`src/db/schema.ts:60`) is stored in Postgres and exported in JSON, but is **never read anywhere**; `UNITS = ['copë', 'm²', 'banesa']` is hardcoded in `src/services/orders.ts:18`, `src/app/(app)/orders/new/new-order-form.tsx:12`, and `src/components/sheets/order.tsx:20`.
  - `client.note` (`src/db/schema.ts:99`) is seeded (`"Kushëri i pronarit"`, `"Jeton në Zvicër; paguan me bankë"`) and rendered on `/orders/[id]` (lines 420, 524), but no form in the app allows creating or editing a client note.

---

### F-12 — `next dev` auto-generates an untracked `AGENTS.md` in the repo root `[Confirmed]`

- **Severity:** Low (working-tree hygiene)
- **Affected Area:** `next.config.ts` / `.gitignore`
- **Details:** Next.js 16.4 (`node_modules/next/dist/server/lib/generate-agent-files.js`) automatically writes `AGENTS.md` on `pnpm dev` startup unless `experimental` / `agentRules: false` is configured or `AGENTS.md` is tracked/ignored.

---

### F-13 — Potential race condition if `dailyDemoRefresh` runs while a demo user is actively clicking `[Suspected / Untested Risk]`

- **Severity:** Low (demo edge case)
- **Affected Area:** `src/db/demo/load.ts:129-136`
- **Details:** On the first page load of a new calendar day in `DEMO_MODE=true`, `dailyDemoRefresh` runs `TRUNCATE ... CASCADE` across all tables including `session` and `"user"`, and inserts new user UUIDs. If a presenter leaves a logged-in browser tab open overnight and loads a page the next morning, `pageContext()` validates their old session **before** `pageBook()` triggers `dailyDemoRefresh()`. That first request succeeds, but `dailyDemoRefresh()` wipes the `session` table mid-request, so the presenter's **next** click will redirect to `/login`.

---

## 4. Dead Code & Unused Dependencies

All items below were verified across `src/`, `tests/`, and `scripts/` (accounting for Next.js conventions and dynamic imports):

| Item | Location | Evidence & Status |
| :--- | :--- | :--- |
| `clsx` & `tailwind-merge` | `package.json:24, 32` | **Unused dependencies.** Zero imports anywhere in `src/`, `tests/`, or `scripts/`. |
| `sharp` | `package.json:31` | **Unused direct dependency.** Zero imports in codebase; `next/image` is not used anywhere, and PNG color extraction (`src/brand/extract-colors.ts`) uses Node's built-in `zlib`, while PWA icons use `resvg-wasm`. |
| `src/auth/auth-client.ts` | `src/auth/auth-client.ts:1-4` | **Dead file.** Exports `authClient` (`better-auth/react`), which is never imported anywhere (auth uses server actions in `src/auth/actions.ts`). |
| `chatHref` | `src/components/debt-row.tsx:16-19` | **Dead export.** Left over from Phase 3 before Phase 4 introduced `messageLink` in `src/domain/messages.ts`. |
| `ROLE_LABEL` | `src/auth/permissions.ts:32` | **Dead export.** UI uses `next-intl` `role.owner` / `role.office`. |
| `cssVarsToString` | `src/brand/theme.ts:97-102` | **Dead export.** `src/app/layout.tsx` passes `brandCssVars(brand)` directly as a React `style` object. |
| `isExactTime` | `src/domain/visits.ts:16` | **Dead export.** `VisitFields` in `src/components/sheets/visit.tsx:46` defines its own local `exact` check. |
| `BrandInput` | `src/brand/schema.ts:81` | **Unused type export.** |
| `visit.collect` column | `src/db/schema.ts:233` | **Unused DB column.** `collectsCash(v)` derives collection from `v.type`, and `ComposeInstaller` uses local state. |
| `photo` table | `src/db/schema.ts:266-277` | **Deferred table.** Created in migrations, truncated in fixtures, and queried in `export.ts`, though photo upload is deferred beyond v1. |
| `phase.later3`, `phase.later4`, `order.visitsLater`, `opening.remPhase4` | `messages/sq.json:45-46, 638, 840` & `src/components/empty.tsx:5-11` | **Leftover Phase 2/3 strings.** `later3`, `later4`, and `visitsLater` are never referenced; `remPhase4` is the root cause of **F-01**. |
| `.proto-fab`, `.photos`, `.photo*` | `src/styles/app.css:21, 29` | **Leftover prototype CSS selectors** not rendered by any React component. |

---

## 5. Performance Review

### Measured Timings

1. **Local Development Server (PGlite, 57 orders, 8 opening balances, ~50 clients per brand):**
   - Full page navigation (`networkidle` in headless Chromium):
     - `/` (`Sot`): **632 ms**
     - `/cash`: **612 ms**
     - `/schedule?d=team`: **640 ms**
     - `/schedule`: **651 ms**
     - `/settings`: **664 ms**
     - `/orders?view=kanban`: **707 ms**
     - `/debts`: **736 ms**
     - `/orders`: **981 ms**
2. **Online Demo (`https://order-tracking-test.vercel.app`, Neon Postgres):**
   - Cold hit to `/login` (triggers `dailyDemoRefresh` check): **3,067 ms**
   - Warm hits to public customer tracking pages (`/t/[token]`): **142 ms – 180 ms**

### Confirmed Performance Inefficiencies (Worth Optimizing Before Scaling)

1. **`loadBook()` loads the entire company database on every page render — including `AppLayout` (`src/services/book.ts:62-97`, `src/app/(app)/layout.tsx:20`):**
   - Because `AppLayout` calls `pageBook()` to compute the `Para te montuesit` warning dot (`cashDot`) and `demoInfo`, **every authenticated route** (even `/settings` or `/orders/new`) executes **7 `SELECT *` queries** fetching all `orders`, `clients`, `visits`, `payments`, `opening_balance`, `message`, and `installer` rows for the company.
   - `React.cache()` in `src/server/context.ts:24` deduplicates `pageBook()` within a single render pass between `AppLayout` and pages that also call `pageBook()`, which keeps v1 fast at ~60 orders. However, over a remote Neon connection, 7 round-trip queries (Wait: `Promise.all` runs them concurrently over HTTP/WebSocket, but transfers full rows including full `message.text` bodies) will grow linearly as a workshop accumulates ratusan/hundreds of historical orders.
2. **Redundant queries on detail and compose pages (`src/app/(app)/orders/[id]/page.tsx:53-62`, `src/app/(app)/debts/[id]/page.tsx:24-27`):**
   - On `/orders/[id]`, `AppLayout` already runs `pageBook()` (loading all orders, visits, payments, messages, installers, and company demo info). Then `OrderPage` calls `loadOrder(db, companyId, id)` (another 5 DB queries for the same order, client, visits, payments, messages), `listInstallers()` (duplicate query), `getCompany()` (duplicate query), and `pageBook()` again!
   - Simply reading the order and installers from `await pageBook()` (or replacing `AppLayout`'s full `pageBook()` call with a lightweight query for `cashDot` + `demoInfo`) would cut DB queries on `/orders/[id]` and `/debts/[id]` by more than half.
3. **`loadBook()` fetches full `message.text` for every historical message (`src/services/book.ts:69`):**
   - `loadBook()` only needs `{ orderId, openingId, type, channel, sentAt }` for `lastReminder` on `BookOrder` / `BookOpening` (lines 48–59), yet `db.select().from(message)` transfers the full `text` column of every message ever logged.

---

## 6. Test Coverage & Verification Summary

### What Was Tested & Verified
- **Automated Suites Executed Locally:**
  - `pnpm lint` (ESLint): **Passed (0 warnings)**
  - `pnpm typecheck` (`next typegen && tsc --noEmit`): **Passed**
  - `pnpm exec vitest run`: **9 test files, 132 unit/integration tests passed** (covering `balances`, `debts`, `visits`, `messages`, `tracking`, `orders`, `payments`, `openings`, `export`, `qr`, `brand`, `demo` seed)
  - `pnpm test:e2e` (Playwright): **76 end-to-end tests passed** across `laptop` (`1280×800`) and `phone` (`Pixel 7`) projects.
- **Hands-On Interactive Browser Audit (Playwright Chromium):**
  - Tested both roles (`Pronari` / `Zyra`), both demo brands (`Druri Design` / `Lumi Dyer & Parket`), light and dark themes, desktop (`1280×800`) and compact mobile (`390×844`) viewports (verified **0 horizontal overflows** and **0 console/page errors** across all 8 main views).
  - Tested creating, editing, cancelling, restoring, and deleting orders, opening balances, payments, project parts, and visits; verified `/setup` PIN validation and live brand preview; verified `.xlsx` and `.json` exports and server-side 403 enforcement for `Zyra`.
- **Online Demo Spot Check (`https://order-tracking-test.vercel.app`):**
  - Verified read-only responses on `/login`, `/manifest.webmanifest`, and public tracking links (`/t/[token]`) for active and revoked tokens across both brands without mutating deployment data.

### What Could Not Be Verified
- **Physical Phone Hardware:** Browser emulation (`390×844` and `Pixel 7`) was used for mobile layout and touch-target verification; physical iOS Safari / Android Chrome installation (`Add to Home Screen`) and native OS handoff to installed WhatsApp, Viber (`viber://chat`), and SMS (`sms:`) apps were not tested on a physical phone.
- **Live Message Delivery:** Per audit rules, no real WhatsApp/Viber/SMS messages were sent; prepared `wa.me`, `viber://`, and `sms:` URLs and message bodies were inspected directly.
