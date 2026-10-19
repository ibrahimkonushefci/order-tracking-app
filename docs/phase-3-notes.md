# Phase 3 notes: orders & money core

Built 19.10.2026. The app's design follows the approved v10 prototype; where the build differs, it is listed here.

## Where things live
- `src/domain/` pure rules (no database): `balances.ts` (paid / in office / with installers, owed now, projects, due dates, overdue), `debts.ts` (Borxhet rows and groups, Para te montuesit, the Sot headline), `catalog.ts` (product chips per business type, cities).
- `src/services/` every write: role check, validation (Albanian messages via i18n keys), and one history line per change. The server actions in `src/app/(app)/actions.ts` only wrap them; the tests call the same services on an in-memory PGlite.
- `src/lib/xlsx.ts` a small .xlsx writer (ported from the prototype's export.js), so no Excel library was added.
- `src/db/fixtures-phase3.ts` the Phase 3 fixtures, dated relative to today.

## Decisions and differences from the prototype
- **Phase boundaries kept.** Visits are shown on the order (read-only, with project parts), but planning visits, sending to installers, the green "Kujtesë" with prepared messages and the tracking link fold arrive in Phase 4. The debt rows keep a quiet WhatsApp/Viber icon (write by hand) and the call button.
- **"E kryer" from the stage control** is the €800 sheet without a visit: A pagoi klienti? · Ku janë paratë? · Kur paguan pjesën tjetër?. Phase 4 adds the same sheet from "Montimi u krye" on a visit, with the installer preselected.
- **Due dates are stored** when an order is marked done (`dueDate` from the term), and recomputed by "Ndrysho afatin". Moving an order back clears them.
- **Projects** use `projectPayTerm` for each part; finishing the project sets the remainder's due date from the same term.
- **Deleted payments** stay as rows with `deletedAt` (out of every total), shown struck through as "E fshirë" and exported with that status.
- **Deleting an opening balance** requires that it has no active payments, the same rule as orders (approved 19.10.2026). Mistakes are fixed with "Ndrysho" instead, so genuine payments never need deleting.
- **Restore after Anulo** returns the order to the stage it had before (read from the history).
- **Editing the client's name/phone** on an order renames that client everywhere (the client is shared by their orders, as in the prototype).
- **Night Mode danger button**: dark text instead of white (white on the light red was about 2:1). Only colour, not layout.
- **History tone** (money / stage / warning dots) is chosen from the line's wording; it is presentation only.

## Fixes after the independent review (19.10.2026)
- **Form values survive a failed save.** Cause: the forms used React 19's `<form action>`, which resets every uncontrolled field after the action returns, also when it returned validation errors. `useAction` now submits from `onSubmit` (FormData built with the submitter), so nothing is reset unless the caller asks (only "Ruaj dhe shto tjetër" does). This covers every form and sheet that used `useAction`.
- **"Ndrysho borxhin"** (both roles) on the opening balance: name, phone, amount, what it was for, when the work was done, "Kur duhej paguar?" (a date, a month, or back to "Nuk e di") and the note, with the same validation as the new-debt form; the amount can't drop below what was paid. Payments are not touched. Each changed field is one history line ("Shuma e borxhit: €450 → €400", "Kur duhej paguar: … → …"). "Vendos afatin" stays as the quick button for unknown dates.
- **Correcting a recorded part** ("Montimet e kryera" → Ndrysho): quantity, date, installer and value (empty = quantity × unit price), both roles; "Fshij montimin" Pronari only. Progress, owed now, paid ahead and the per-part due dates are computed from the parts, so they follow; payments stay. One history line per correction ("Montimi i 11.10.2026 u ndryshua: Sasia: 3 copë → 5 copë · …", "Montimi u fshi: …").
- Regression coverage: `tests/unit/services.test.ts` (opening edit, part edit/delete, permissions) and `tests/e2e/money.spec.ts` (values kept after a failed save on both forms, "Ndrysho borxhin", part edit and delete), on laptop and phone.
