# Phase 2 plan: data model and folder structure

Approved 19.10.2026 and built the same day. Where the build differs from this plan, see "Changes during the build" at the end.

## What Phase 2 delivers

A running Next.js app at the repo root that looks like the approved v10 prototype:
- **Shell**: sidebar on laptop/tablet (Sot · Porositë · Borxhet · Orari, Para te montuesit, Cilësimet, signed-in user); header + bottom tab bar on phones. The four main screens and Para te montuesit are empty shells in the prototype's layout ("Vjen në fazën 3/4"), because their data arrives in Phases 3–4.
- **Login** as Pronari or Zyra (Better Auth, email + password), with the role and first name shown in the header/sidebar exactly as in the prototype. Logout from the user block.
- **Brand system**: brand.json v2 (zod) in `/brands/<slug>/`, theming through the prototype's tokens, dark-mode ink/fill shades derived from any brand primary, neutral fallback brand, `?brand=` only in demo mode, otherwise `BRAND`.
- **Night Mode**: moon/sun in the header and "Pamja: Dritë / Errët" in Cilësimet, saved per device, device setting by default, set before first paint.
- **Inter self-hosted** (400/500/600, `cv02 cv03 cv04 cv11`, tabular numbers). Works offline.
- **`/setup`** (PIN, demo convenience): upload a logo → suggested colours → name, phone, city → live preview → "Apply". "Reseed demo" becomes meaningful in Phase 5; in Phase 2 it writes the brand and reloads the fixtures.
- **Cilësimet**: Montuesit list (read-only from the fixtures in Phase 2), Pamja, and the "what Zyra can't do" note. Permission helper `can(role, action)` used by every server action from day one.
- **i18n**: next-intl, `messages/sq.json`; no hard-coded strings in components.
- **PWA shell**: Serwist service worker caching the app shell, manifest from the brand.
- **Fixtures**: `pnpm fixtures` → one brand (Druri Design), Arben (Pronari) and Teuta (Zyra), Driton, Faton, Besnik with phones.
- **Tests**: Vitest for the brand schema, the dark shades, contrast, money/date helpers and permissions; one Playwright flow (log in as each role, toggle the theme, reload without flash).

## Data model (Drizzle, PostgreSQL / PGlite)

All tables carry `companyId` (one company per instance for now). Money is `integer` cents. Business dates are `date` (`yyyy-MM-dd`, Europe/Belgrade); audit times are `timestamptz`. IDs are UUIDs. The whole schema is created in Phase 2 so later phases add behaviour, not tables; only `company`, the auth tables and `installer` hold data in Phase 2.

| Table | Columns (beyond `id`, `companyId`, `createdAt`, `updatedAt`) |
|---|---|
| `company` | `brandSlug`, `depositWord` (`Avans`/`Kapar`), `stageLabels` jsonb (`{new, active, done}` overrides), `productTypes` jsonb, `projectUnits` jsonb, `templates` jsonb (sq/en/de overrides), `nextOrderSeq` + `orderSeqYear` (for `2026-041`) |
| `user` (Better Auth) | `name`, `email`, `emailVerified`, `image` + **`role`** (`owner`/`office`), **`firstName`** (signs messages, appears in history), `active` |
| `session`, `account`, `verification` | Better Auth's own tables, unchanged |
| `installer` | `name`, `phone` (E.164), `channel` (`whatsapp`/`viber`), `active` |
| `client` | `name`, `phone`, `channel` (`whatsapp`/`viber`/`sms`), `language` (`sq`/`en`/`de`), `noReminders`, `note` |
| `orders` | `number` (unique per company), `clientId`, `productType`, `description`, `price`, `stage` (`new`/`active`/`done`/`cancelled`), `doneAt`, `city`, `directions` ("Si të shkoni"), `internalNote`, `payTerm` (`week`/`month`/`date`/`unknown`), `dueDate`, `quantity` + `unit` (null = normal order), `projectPayTerm`, `remainingWork` (note, null = none), `pausedUntil` + `pauseReason`, `trackingToken` (unique, ≥128 bits) |
| `visit` | `orderId`, `type` (`measure`/`install`/`delivery`/`repair`), `date`, `time` (`morning`/`afternoon`/`HH:MM`/null), `installerId`, `note`, `doneAt`, `quantity` + `value` (project parts), `collect` (Mblidh €X switch), `lastSentAt` |
| `payment` | `orderId` **xor** `openingId` (check constraint), `amount`, `date`, `method` (`cash`/`bank`/`card`), `heldBy` (installerId, null = office), `handedAt`, `handedBy`, `note`, `createdBy`, `deletedAt` (soft delete so history and export can still name it) |
| `opening_balance` | `name`, `phone`, `channel`, `language`, `amount`, `forWhat`, `workDone` (text: date, month or "nuk e di"), `dueDate` (null = "Afat i panjohur"), `dueApprox` (month only), `note`, `noReminders`, `pausedUntil` + `pauseReason` |
| `message` | `orderId` or `openingId`, `recipient` (`client`/`installer`), `installerId`, `type` (`deposit`/`visit`/`link`/`thanks`/`reminder`/`free`/`job`/`day`), `channel`, `language`, `text`, `sentBy`, `sentAt` |
| `history` | `recordType` (`order`/`opening`/`client`/`installer`/`settings`), `recordId`, `userId`, `at`, `text`, `field`, `oldValue`, `newValue`. **Append-only**: no update/delete in code, and a DB trigger that rejects UPDATE/DELETE |
| `photo` | `orderId`, `kind` (`notebook`/`after`/`other`), `storageKey` (unique, never overwritten), `deletedAt` |

Notes:
- Order numbers come from `company.nextOrderSeq`, incremented in the same transaction; the year resets the sequence.
- A replaced tracking link just gets a new token. Any unknown token shows the neutral page ("Ky link nuk është më aktiv. Na kontaktoni.") with the company phone, so old tokens don't need to be kept.
- `language` on opening balances is there so reminders for notebook debts can be in German too.
- `deletedAt` on payments is the only soft delete; the spec's "Fshij" still removes it from every total and list.

## Folder structure

```
/Order tracking
  order_tracking_instructions.md · PHASES.md · README.md (written at the end)
  package.json · pnpm-lock.yaml · .node-version · .npmrc · .env.example
  next.config.ts · tsconfig.json · eslint.config.mjs · postcss.config.mjs
  drizzle.config.ts · vitest.config.ts · playwright.config.ts
  brands/
    druri-design/{brand.json, logo.svg}
    lumi-dyer/{brand.json, logo.svg}      second brand, to prove rebranding
  messages/sq.json                        all staff strings
  drizzle/                                generated SQL migrations
  scripts/{migrate.ts, fixtures.ts}
  src/
    app/
      layout.tsx                          <html data-theme>, no-flash script, Inter, brand CSS vars
      login/page.tsx
      (app)/layout.tsx                    shell: sidebar / header + tab bar; requires a session
      (app)/page.tsx                      Sot
      (app)/orders/ · debts/ · schedule/ · cash/ · settings/
      setup/page.tsx                      PIN-protected brand setup
      t/[token]/page.tsx                  tracking page (Phase 4; neutral page now)
      api/auth/[...all]/route.ts          Better Auth
      manifest.ts · sw.ts                 PWA (Serwist)
    brand/{schema.ts, load.ts, theme.ts, extract-colors.ts, fallback.ts}
    db/{schema.ts, client.ts}             PGlite when DATABASE_URL is a folder, node-postgres otherwise
    auth/{auth.ts, auth-client.ts, session.ts, permissions.ts}
    i18n/request.ts
    components/{shell/, ui/, icons.tsx}   ui/ = shadcn primitives restyled with the v10 tokens
    lib/{money.ts, dates.ts, phone.ts}
    styles/{tokens.css, app.css}          tokens.css adopted from prototype/css/tokens.css
  tests/{unit/, e2e/}
  data/pglite/                            local database (git-ignored)
  public/                                 icons; Inter woff2 via next/font/local from src/fonts
  prototype/                              unchanged, excluded from TS/ESLint/tests/build
```

Routes use short English paths (`/orders`, `/debts`, `/schedule`, `/cash`, `/settings`), like the prototype's `#/orders` etc.; every visible label is Albanian.

## Defaults I'll use unless you say otherwise

- Fixture logins: `arben@druri.test` and `teuta@druri.test`, with a generated password written to `.env.local` and the fixture script (not committed in plain text elsewhere). `/setup` PIN also in `.env.local`.
- Dev server on **port 3100** (3000 is Doors & laminate), added to `.claude/launch.json` as "app", next to "prototype".
- Pinned versions (exact, no `^`), like Doors & laminate: Next 16.4, React 19, Tailwind 4.3, Drizzle 0.45 + drizzle-kit 0.31, PGlite 0.5, Better Auth 1.7, next-intl 4.14, Serwist 9.5, zod 4.6, Vitest, Playwright.

## Changes during the build

- **IDs**: my tables use UUIDs as planned. Better Auth's tables (`user`, `session`, `account`, `verification`) keep text IDs, filled with UUIDs too.
- **No `logo.src` file**: a brand made in /setup without a logo has `"src": "none"`, and the UI shows the company's initial on the brand colour.
- **/setup "Apliko"** writes the brand folder and switches this browser to it. It doesn't reseed data yet: the fixtures don't depend on the brand, and the full demo reseed comes with the seed data in Phase 5.
- **Port**: 3100 as planned. `pnpm fixtures` resets the database through the running app (a dev-only endpoint protected by `FIXTURES_TOKEN`), because PGlite allows one process per data folder.
- **CSS**: the prototype's `tokens.css` and `app.css` are copied into `src/styles/` (without the prototype-only demo bar and device frame) and used as the component layer. Tailwind is loaded without its reset, so it can't change the prototype's look. shadcn primitives are added only when a screen needs one (e.g. sheets in Phase 3).
