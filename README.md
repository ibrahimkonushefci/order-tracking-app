# Order tracking (white-label)

Orders, payments and debts for kitchen, furniture, door/floor and window workshops in Kosovo. The product spec is [order_tracking_instructions.md](order_tracking_instructions.md), the build order is [PHASES.md](PHASES.md), and the approved design baseline is the v10 prototype in [prototype/](prototype/).

Status: **Phase 4** (Orari, WhatsApp & tracking page). Orders and money (Phase 3), visits, installer load, prepared customer and installer messages sent by hand, and the multilingual tracking page work on the fixtures. Notes per phase are in [docs/](docs/). This README is completed in the last phase (backups and messaging providers).

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

## Test deployment (Vercel + Neon)

A temporary HTTPS test instance, loaded with the fixtures only (Phase 4):
- Vercel project linked to this repository; `vercel.json` puts the functions in Frankfurt (`fra1`) and runs `pnpm vercel-build` (migrations on `DATABASE_URL`, then the build).
- Neon Postgres in Frankfurt (`aws-eu-central-1`); its pooled connection string is the project's `DATABASE_URL`.
- Environment variables live in Vercel only: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `APP_URL` (the deployment's https address), `BETTER_AUTH_TRUSTED_ORIGINS`, `BRAND`, `DEMO_MODE=true`, `FIXTURE_PASSWORD`, `FIXTURES_TOKEN`, `SETUP_PIN`.
- Load or reset the fixtures: `curl -X POST -H "x-fixtures-token: $FIXTURES_TOKEN" https://<app>/api/dev/fixtures`.
- Customer tracking links (`/t/<token>`) open without any login; every staff screen requires the app login.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test        # Vitest: brand, money, balances, services, visits, messages, reminder rule, tracking
pnpm test:e2e    # Playwright on laptop + phone sizes; reloads the fixtures first
pnpm build       # production build (webpack, with the Serwist service worker)
```

## Layout

| Path | What |
|---|---|
| `src/app/` | Routes: `/login`, the shell group `(app)` with Sot `/`, `/orders`, `/debts`, `/schedule`, `/cash`, `/settings`, `/setup`; `/t/[token]` tracking page |
| `src/styles/` | `tokens.css` and `app.css` adopted from the v10 prototype; `app-extra.css` for app-only pieces |
| `src/brand/` | brand.json v2 schema, loading, theme shades, logo colour extraction |
| `src/domain/` | Pure rules: balances, debts and the reminder rule, visits and installer load, prepared messages, the tracking page |
| `src/services/` | Every write: role check, validation, one history line per change |
| `src/db/` | Drizzle schema, connection (PGlite or Postgres by `DATABASE_URL`), fixtures (Phases 2–4) |
| `src/auth/` | Better Auth, session helpers, permissions (checked in every server action) |
| `messages/sq.json` | Every staff-facing string (Albanian) |
| `drizzle/` | SQL migrations, including the append-only trigger on `history` |
| `prototype/` | The approved v10 prototype; standalone and excluded from the app's TS/ESLint/tests/build |
