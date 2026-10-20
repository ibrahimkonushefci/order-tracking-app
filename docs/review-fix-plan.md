# Plan: acting on the Gemini code review (20.10.2026)

## Context

Gemini audited the Phase 5 app and wrote `docs/code-review-findings.md` (F-01…F-13, dead code, performance) and `docs/code-review-recommendations.md` (R-01…R-07). I checked each claim against the code before deciding anything. The goal is to fix the problems that a prospect could see in a demo, tidy up the cheap leftovers, and add at most two small features. Anything else waits for a client.

This file is the plan. Gemini's two report files stay next to it in `docs/` and get committed with it when the user asks for a commit.

Project rules that apply: work on `main` with no branches, commit only when asked, never run `prettier --write` on existing files, and finish each phase with a plain-text report.

## How the review held up

| Item | Verdict | Evidence |
|---|---|---|
| F-01 opening-balance "Kujtesat" contradiction | **Confirmed** | `debts/[id]/page.tsx:42` falls through to the Phase 3 key `remPhase4` and ignores `rem`/`last`. The raw `last.channel` appears at `:95`, `orders/[id]/page.tsx:531` and `compose/[kind]/[id]/page.tsx:66` |
| F-02 opening-balance page lacks the held-cash alert, Konfirmo, the "Te X" badge and `pay--deleted` | **Confirmed** (partly) | The meta line already says "Te X, pa dorëzuar", but the alert, `ConfirmCashButton`, warning badge and strike-through are missing (`debts/[id]/page.tsx:129-165` vs `orders/[id]/page.tsx:104-125, 586-610`) |
| F-03 a completed planned project visit can't be undone; Pronari's delete removes the planned visit | **Confirmed** | `completeVisit` → `recordPartIn(…, visitId)` turns the planned row into a part (`services/orders.ts:242`). `mustLoadDone` rejects rows with a quantity (`services/visits.ts:168`). `deletePart` deletes the row (`services/orders.ts:378`) |
| F-04 "Montimet e kryera (n)" counts only parts | **Confirmed** | `orders/[id]/page.tsx:367-379` |
| F-05 brand switch drops the query string | **Confirmed** | `demo-bar.tsx:100,171` uses `usePathname()` only |
| F-06 phone prefix bugs when editing | **Confirmed** | `services/orders.ts:489` hard-codes `+383`, and `EditOrderSheet` has no prefix select. `opening-form.tsx:58-64` and `settings.tsx:39-44` pre-fill the full `+383 …` next to the select, so `toE164` ignores the select |
| F-07 cancelled orders | **Partly disagree** | The installer cash stays on /cash and Sot on purpose: the installer still physically has that money, and the order page still shows Konfirmo. Payments on a cancelled order are locked on purpose (`payments.ts:72`; restore the order first). **Agree** only that "Fshij porosinë" vanishes without explanation (`orders/[id]/page.tsx:650`), unlike openings |
| F-08 phone demo panel | **Gemini's code description is wrong** (there is no `bump()`; it's a `<form action={setDemoDays}>`) | The real, minor issue: after +1/+7 the panel shows only "+N ditë" and not the actual date |
| F-09 UTC `toISOString().slice(0,10)` | **Confirmed**, 5 places | `isoOf` already exists in `src/lib/dates.ts:64` |
| F-10 no Albanian `error.tsx` / `not-found.tsx` | **Confirmed** | None exist under `src/app`. The forbidden-settings throw is reachable only by bypassing the UI |
| F-11 schema fields with no UI | Confirmed, **by design for now** | Wait for a client |
| F-12 `AGENTS.md` auto-generated | **Unverified** | It isn't in the repo now. Check once |
| F-13 overnight demo reset logs the presenter out | Plausible, low | Mitigate with a pitch-kit tip |
| Dead code | **Mostly confirmed** | Unused: `clsx` and `tailwind-merge` (only in package.json), `src/auth/auth-client.ts`, `chatHref`, `ROLE_LABEL`, `cssVarsToString`, `isExactTime`, `BrandInput`, the strings `later3`/`later4`/`visitsLater`/`remPhase4`, and the CSS `.proto-fab`/`.photo*`. **Wrong:** `sharp` is not a direct dependency (it's Next's own; the `allowBuilds` entry is fine). **Keep:** the `visit.collect` column and the `photo` table (removing them needs a migration, and photos are a deferred feature) |
| Performance | **No change now** | The timings were taken on `next dev` with PGlite (dev compile), not a production build. Loading the whole book per request is a deliberate v1 choice at about 60 orders, and `pageBook` is already `cache()`d. The 3 s cold hit online is a Vercel/Neon cold start. Revisit in Phase 6 using production timings |

## Phase A: before the next client demo (about half a day)

**Status: done 20.10.2026** (not committed, not deployed). Every item was reproduced in the browser on the demo data before its fix and checked again after. One detail differs from the plan: the "+1 ditë" panel now shows the real date ("Data e demos: E mërkurë, 21.10.2026 (+1 ditë)").

Before fixing each item, reproduce it in the browser on the demo data (`pnpm demo`, port 3100), then fix it and check it again.

1. **F-01 + F-09 + channel label** (`src/app/(app)/debts/[id]/page.tsx`, `orders/[id]/page.tsx`, `compose/[kind]/[id]/page.tsx`, `messages/sq.json`)
   - Build the opening "Kujtesat" summary from `reminderCheck()` (already computed as `rem`). For `ok`, use a new key (e.g. `opening.remNow` = "mund të dërgoni një tani"). For `reason: 'recent'`, show when the next one is possible ("e radhës nga {date}" = `lastAt` + `REMINDER_GAP_DAYS`). Keep the existing branches for the other reasons. Delete `remPhase4`.
   - Replace `channel: last.channel` with `w(\`channelName.${last.channel}\`)` (the key exists at `sq.json:390`).
   - Replace the 5 `new Date(x).toISOString().slice(0, 10)` with `isoOf(x)`.
2. **F-02 opening-balance parity** (`debts/[id]/page.tsx`)
   - Pull the order page's held-cash alert into a small shared component (e.g. `src/components/held-cash.tsx`: title, the line for each payment, `ConfirmCashButton`) and use it on both pages. The order page keeps its own "heldLine" text.
   - On opening payment rows, add the `pay--deleted` class and the `Badge tone="warning"` "Te X".
3. **F-03 undo a completed project visit** (`src/services/visits.ts`, `src/services/orders.ts`, `src/components/sheets/order.tsx`, `src/app/(app)/actions.ts`, `orders/[id]/page.tsx`)
   - When `recordPartIn` turns a planned visit into a part, write a history marker (field `partFromVisit`, `newValue` = visitId). This follows the `repairCleared()` pattern already in `visits.ts`, so no schema change is needed.
   - New service `reopenPart` ("Nuk u krye", `allow(actor,'edit')`, so both roles): only for parts that carry the marker. It sets `doneAt`, `quantity` and `value` back to null so the visit is planned again on its date with its time, installer and note. It doesn't touch payments, the same rule as `reopenVisit`. If the order went to done in that same step ("Projekti përfundoi"), offer `reopenOrder` as `reopenVisit` does.
   - `PartEditSheet`: show "Nuk u krye" when the part came from a planned visit (the page passes a `fromVisit` flag computed from history). "Fshij montimin" stays Pronari-only and explicit.
   - Unit tests in `tests/unit/phase4.test.ts` (or `services.test.ts`): complete, reopen, check that the visit is planned again with its fields and progress is back; reopen after finish; Zyra allowed; a part without the marker is rejected.
4. **F-04 fold title** (`orders/[id]/page.tsx:367-379`): count what is inside. For projects, use the generic done-visits label with `visitsDone.length` and put the installed total in `fold__sum` (e.g. "3 copë të montuara"). Same layout as now.
5. **F-05 + F-08 demo bar** (`src/components/demo-bar.tsx`)
   - Keep the query string when switching brand. Use `useSearchParams()`, drop any existing `brand` key, and pass `path?query&brand=slug` (for the current brand) or `pathAfterBrandSwitch(path)` with the query (for the other brand). The proxy already strips `brand`. Wrap the read in `Suspense` if Next requires it. Check whether `pathAfterBrandSwitch` should keep the query when it changes a record path to its list; if it lands on the list, the query probably still applies.
   - Panel date label: show the real date as well (e.g. "Data e demos: e enjte 22.10 (+2 ditë)"). The panel stays open so several steps are possible.
   - e2e test in `tests/e2e/demo.spec.ts`: **click** the bar's brand link from `/orders?stage=project&view=kanban` and expect the query to survive.
6. **F-13 tip**: one line in the pitch-kit checklist (`docs/pitch-kit/`): "Morning of the meeting: reload and use one-tap login once after 00:00; the daily reset signs old sessions out."
7. Check, report, and then **ask** before redeploying the online demo (`pnpm deploy:demo`, then re-reset as the deployment notes say).

## Phase B: worth fixing soon (about half a day)

1. **F-06 phone prefixes**
   - Add `splitPhone(e164) → { cc, local }` to `src/lib/phone.ts`, based on `PHONE_CODES`. Unknown prefix → cc `+383` and the full number as typed.
   - `OpeningFields` (`debts/new/opening-form.tsx`) and `InstallerButton` (`components/settings.tsx`): default the select to `cc` and the input to the formatted `local`.
   - `EditOrderSheet` (`components/sheets/order.tsx:503`): add the same prefix select as the new-order form (reuse its markup). `editOrder` (`services/orders.ts:489`) uses `input.phoneCc ?? '+383'`.
   - Unit tests for `splitPhone` and for `editOrder` with `+49`.
2. **F-07 (part we agree with)**: in `OrderMoreActions`, when Pronari can't delete because there are payments, show the same explanatory note as `OpeningMoreActions` (`opening.tsx:155-165`). Pass `hasPayments` instead of folding it into `canDelete`.
3. **F-10**: add an Albanian `src/app/(app)/error.tsx` (card with "Diçka shkoi keq" and "Provo përsëri") and `src/app/not-found.tsx` in the v10 style, with strings in `sq.json`. Wrap `setDepositWord` / `setDemoDays` so a `ForbiddenError` returns quietly instead of throwing.
4. **Dead-code cleanup** (confirmed items only): `pnpm remove clsx tailwind-merge`; delete `src/auth/auth-client.ts`, `chatHref`, `ROLE_LABEL`, `cssVarsToString`, `isExactTime`, `BrandInput` and the strings `later3`/`later4`/`visitsLater`. Before deleting `.proto-fab`/`.photo*` in `src/styles/app.css`, grep each class once more. Also check whether `EmptyCard`'s `note`/`.phase-note` is still used. Run `next dev` once; if it creates `AGENTS.md`, add it to `.gitignore`.

## Phase C: two small features (about half a day)

Only these two recommendations pass the bar now: they help both the demo and daily use, cost little, and add no new screens.

1. **R-01, client suggestions on "Porosi e re"** (`src/app/(app)/orders/new/page.tsx`, `order-form.tsx`/`new-order-form.tsx`): pass a light list of clients (`id, name, phone, language, channel`) from `pageBook().clients`. While the user types the name (2+ characters), show up to 4 matches with their phone. Tapping one fills name, prefix + phone (via `splitPhone` from B1), language and channel. Free typing is unchanged. This stops near-duplicate clients, since `createOrder` reuses a client only on an exact name + phone match (`services/orders.ts:104`). e2e: pick a suggestion, and the order attaches to the existing client.
2. **R-04, the client's other records** (`orders/[id]/page.tsx`, Klienti fold): from the `book` already loaded, list the client's other orders (same `clientId`, not cancelled) and opening balances with the same phone, each with its stage and amount owed, linked. Show nothing if there are none.

## Not now (decided)

- **R-02 QR outside demo mode**: demo mode already has it, so it adds nothing to a demo. Decide during Phase 6 onboarding; it also changes `test:demo-off`.
- **R-03 search on Borxhet**: the list is short at demo scale, and PayPickSheet already searches. Wait for a client with a long debt list.
- **R-05 client note, R-06 stage/product settings, R-07 print styles, F-11**: wait for client feedback. `/setup` and the brand files cover the demo.
- **Performance refactors** (lighter layout query, dropping `message.text` from `loadBook`, de-duplicating detail-page queries): Phase 6, and only if production timings with real data show a need.
- **`visit.collect` column and `photo` table**: keep them, since removing them needs a migration and photos are deferred.

## Verification (each phase)

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, plus `pnpm test:demo-off` after Phase A (demo-bar change) and Phase B (error pages).
- Browser, port 3100, on demo data (`pnpm demo`): reproduce each finding before the fix and confirm it after, as Pronari and Zyra, on laptop and phone widths. Phase A walk-through: Blerim Hasani (reminder line, record €100 with Driton → alert and Konfirmo, delete it → struck through); Ndërtimi Rugova (complete the planned "Kati 2" as Zyra → Nuk u krye → planned again with its note, progress back); the fold title on Hotel Dukagjini after its measurement; Kanban → switch brand → still Kanban.
- Afterwards, put the local data back the way the tests expect (`pnpm fixtures`, or `pnpm demo` if that was loaded before). Never touch the online data except through the approved redeploy and re-reset.
- Each phase ends with a plain-text report: what changed, what I checked, what's left for the user to check on a phone. No commit unless asked.
