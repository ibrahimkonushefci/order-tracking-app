# Order tracking (white-label)

Orders, payments and debts for kitchen, furniture, door/floor and window workshops in Kosovo. The product spec is [order_tracking_instructions.md](order_tracking_instructions.md), the build order is [PHASES.md](PHASES.md), and the approved design baseline is the v10 prototype in [prototype/](prototype/).

Status: **Phase 2 (foundation)**. The app runs with the v10 shell, the brand system, Night Mode, login for Pronari and Zyra, and the first fixtures. Orders, money, the schedule and the tracking page arrive in Phases 3–4. This README is completed in the last phase (deployment, backups and messaging providers).

## Run it locally (offline, PGlite)

Requirements: Node 24 or newer, pnpm 11 (`packageManager` is pinned).

```bash
pnpm install
cp .env.example .env.local   # then fill in the secrets (see the comments in the file)
pnpm fixtures                # creates ./data/pglite and loads the fixture set
pnpm dev                     # http://localhost:3100
```

- Logins: `arben@druri.test` (Pronari) and `teuta@druri.test` (Zyra). Both use `FIXTURE_PASSWORD` from `.env.local`.
- The database is embedded Postgres (PGlite) in `./data/pglite`; migrations run automatically on start. Setting `DATABASE_URL=postgres://…` switches to a real Postgres (Neon) with the same code; run `pnpm db:migrate` there.
- `pnpm fixtures` resets the database to the known fixture set. While the app is running it does that through the app (PGlite allows one process per folder), so there's no need to stop it.
- Phone on the same Wi-Fi: open `http://<laptop-ip>:3100` (on a Mac: `ipconfig getifaddr en0`) and add that origin to `BETTER_AUTH_TRUSTED_ORIGINS`.

## Rebrand for a client

- A brand is a folder: `brands/<slug>/brand.json` (brand.json v2, schema in [src/brand/schema.ts](src/brand/schema.ts)) plus `logo.svg` or `logo.png`.
- The active brand is `BRAND=<slug>`. In demo mode (`DEMO_MODE=true`), `?brand=<slug>` switches it for that browser.
- **/setup** (Pronari, demo mode, `SETUP_PIN`): upload a logo → suggested colours → name, phone, city, business type, Avans/Kapar → live preview → **Apliko**. It writes the brand folder on the laptop and switches to it.
- Colours: only the brand primary/accent are needed. Night Mode derives a light "ink" and a mid-tone "fill" shade from the primary automatically.
- Missing or broken brand files fall back to a neutral brand.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test        # Vitest: brand schema, theme shades, money, dates, permissions, fixtures, DB guards
pnpm test:e2e    # Playwright on laptop + phone sizes; reloads the fixtures first
pnpm build       # production build (webpack, with the Serwist service worker)
```

## Layout

| Path | What |
|---|---|
| `src/app/` | Routes: `/login`, the shell group `(app)` with Sot `/`, `/orders`, `/debts`, `/schedule`, `/cash`, `/settings`, `/setup`; `/t/[token]` tracking page |
| `src/styles/` | `tokens.css` and `app.css` adopted from the v10 prototype; `app-extra.css` for app-only pieces |
| `src/brand/` | brand.json v2 schema, loading, theme shades, logo colour extraction |
| `src/db/` | Drizzle schema, connection (PGlite or Postgres by `DATABASE_URL`), fixtures |
| `src/auth/` | Better Auth, session helpers, permissions (checked in every server action) |
| `messages/sq.json` | Every staff-facing string (Albanian) |
| `drizzle/` | SQL migrations, including the append-only trigger on `history` |
| `prototype/` | The approved v10 prototype; standalone and excluded from the app's TS/ESLint/tests/build |
