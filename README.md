# Order tracking (white-label)

Orders, payments and debts for kitchen, furniture, door/floor and window workshops in Kosovo. The product spec is [order_tracking_instructions.md](order_tracking_instructions.md), the build order is [PHASES.md](PHASES.md), and the approved design baseline is the v10 prototype in [prototype/](prototype/).

Status: **Phase 5** (demo-ready), built 20.10.2026 and waiting for review. Orders and money (Phase 3), visits, prepared messages and the tracking page (Phase 4), plus the full demo data, demo mode, the online sales demo with QR, PWA polish and the pitch kit ([docs/pitch-kit/](docs/pitch-kit/)). Phase 4's physical-phone checks are still pending. Notes per phase are in [docs/](docs/). This README is completed in the last phase (backups and messaging providers).

## Run it locally (offline, PGlite)

Requirements: Node 24 or newer, pnpm 11 (`packageManager` is pinned).

```bash
pnpm install
cp .env.example .env.local   # then fill in the secrets (see the comments in the file)
pnpm demo                    # creates ./data/pglite and loads the full demo data (every demo brand)
pnpm dev                     # http://localhost:3100
```

- **Demo logins**: on the login page, **Hyr si Arben** (Pronari) / **Hyr si Teuta** (Zyra), one tap. By email: `pronari@<slug>.test` and `zyra@<slug>.test` (e.g. `pronari@druri-design.test`), password `FIXTURE_PASSWORD` from `.env.local`.
- **Test fixtures** (the small, repeatable set the automated tests use): `pnpm fixtures`, logins `arben@druri.test` / `teuta@druri.test`. `pnpm demo` puts the demo data back.
- The database is embedded Postgres (PGlite) in `./data/pglite`; migrations run automatically on start. Setting `DATABASE_URL=postgres://…` switches to a real Postgres (Neon) with the same code; run `pnpm db:migrate` there.
- `pnpm demo` and `pnpm fixtures` reset the database. While the app is running they do that through the app (PGlite allows one process per folder), so there's no need to stop it.
- If the app answers 500 with PGlite `RuntimeError: Aborted()`, the local database folder is damaged (fictional data): stop the app, move `data/pglite` aside, start again and run `pnpm demo`.
- Phone on the same Wi-Fi: open `http://<laptop-ip>:3100` (on a Mac: `ipconfig getifaddr en0`) and add that origin to `BETTER_AUTH_TRUSTED_ORIGINS`.

## Demo mode (sales demo)

Only with `DEMO_MODE=true`. A client instance (`DEMO_MODE=false`) has none of it: check with `pnpm test:demo-off` (see Checks).

- **Demo data**: one company per brand folder with `"demo": true` (now Druri Design: kitchens, Avans, Prishtinë; Lumi Dyer & Parket: doors & floors, Kapar, Prizren), each with its own Pronari/Zyra (names from the optional `brands/<slug>/demo.json`) and ~57 orders, 8 opening balances, three projects, this week's visits for Driton, Faton and Besnik. Details and the key cases: [docs/phase-5-notes.md](docs/phase-5-notes.md).
- **Demo bar** (laptop/tablet, above the app) or the **▶ Demo** button (phone header): brand, "Shiko si" Arben/Teuta, the moments **1 Borxhet · 2 Klienti (QR) · 3 WhatsApp · 4 Pagesa €800 · + Projekti**, and **Më shumë…** with Data e demos (+1 / +7 / Sot), Numri i takimit, every case and **Rivendos demon**.
- **Reset**: **Rivendos demon** in the panel (every demo brand back to the start, demo date back to today, you stay signed in), or `pnpm demo` in the terminal.
- **`?brand=<slug>`** on any page switches the brand and its data together (signed in, you stay Pronari or Zyra of that brand).
- **QR for the owner's phone**: moment 2, or **QR** on an order's "Faqja e klientit" row. It encodes `APP_URL`, or on the laptop `DEMO_PUBLIC_URL` (the online demo), never localhost. Demo orders have the same link on the laptop and online, so a QR shown offline opens online on the phone.
- **Numri i takimit**: the owner's WhatsApp number for the meeting (12 hours, this browser). Send screens then offer it as the recipient; you review and send in WhatsApp yourself. Tracking links in those messages point to the online demo too.
- Demo script, one-page offer and rebrand checklist: [docs/pitch-kit/](docs/pitch-kit/).

## Offline demo on the laptop

Use the production build for a meeting (faster, no dev overlay). Prepare it while you still have internet:

```bash
pnpm install                 # only after pulling new code
pnpm build                   # production build with the service worker
pnpm demo                    # fresh demo data for today (stop the app first, or run it while the app runs)
pnpm start                   # http://localhost:3100
```

Then, offline:
1. Turn Wi-Fi off. Keep `pnpm start` running (or start it now: it needs no network; the database is the local folder `data/pglite`, the fonts and logos are local).
2. Open http://localhost:3100 → **Hyr si Arben**. Everything works: the four moments, the reset, the demo date, the export.
3. What needs the internet: only the **owner's phone** (it opens the QR / links on the online demo with its own mobile data) and actually sending WhatsApp from your phone. The QR itself is drawn on the laptop.
4. Before the meeting: **Rivendos demon**, so "tomorrow's installation" is tomorrow. On a new day without internet, the laptop reset is enough for the laptop; the online demo resets itself on its first visit of the day.
- `.env.local` needs `DEMO_PUBLIC_URL=https://order-tracking-test.vercel.app` (the QR warns if it is missing).

## Rebrand for a client

- A brand is a folder: `brands/<slug>/brand.json` (brand.json v2, schema in [src/brand/schema.ts](src/brand/schema.ts)) plus `logo.svg` or `logo.png`.
- The active brand is `BRAND=<slug>`. In demo mode (`DEMO_MODE=true`), `?brand=<slug>` switches it for that browser.
- **/setup** (Pronari, demo mode, `SETUP_PIN`): upload a logo → suggested colours → name, phone, city, business type, Avans/Kapar, the owner's and office's names → live preview → **Apliko dhe rimbush demon**. It writes the brand folder on the laptop, reseeds the demo data for it and signs you in as its Pronari.
- Online: commit `brands/<slug>/`, push, `pnpm deploy:demo`. Step by step, with times: [docs/pitch-kit/rebrand-checklist.md](docs/pitch-kit/rebrand-checklist.md).
- Colours: only the brand primary/accent are needed. Night Mode derives a light "ink" and a mid-tone "fill" shade from the primary automatically.
- Missing or broken brand files fall back to a neutral brand.

## Online demo (Vercel + Neon)

https://order-tracking-test.vercel.app: the Phase 4 test deployment, now the sales demo with the demo data (Phase 5). It keeps its address; the free Vercel Hobby plan is fine for a demo but not for a paying client (Pro).
- Vercel project linked to this repository; `vercel.json` puts the functions in Frankfurt (`fra1`) and runs `pnpm vercel-build` (migrations on `DATABASE_URL`, then the build).
- Neon Postgres in Frankfurt (`aws-eu-central-1`); its pooled connection string is the project's `DATABASE_URL`.
- Environment variables live in Vercel only: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `APP_URL` (the deployment's https address), `BETTER_AUTH_TRUSTED_ORIGINS`, `BRAND`, `DEMO_MODE=true`, `DEMO_DAILY_RESET=true` (reseed on the first visit of each day), `FIXTURE_PASSWORD`, `FIXTURES_TOKEN`, `SETUP_PIN`. A local copy for the deploy script is in the git-ignored `.env.deploy.local`.
- Publish the committed code and reset the online demo: `pnpm deploy:demo` (a `git archive` of HEAD, never the working folder).
- Reset by hand: `curl -X POST -H "x-fixtures-token: $FIXTURES_TOKEN" "https://<app>/api/dev/fixtures?set=demo"` (without `?set=demo`: the small test fixtures, which also stops the daily reseed until the next demo reset).
- Customer tracking links (`/t/<token>`) open without any login; every staff screen requires the app login.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test        # Vitest: brand, money, balances, services, visits, messages, reminder rule, tracking
pnpm test:e2e    # Playwright on laptop + phone sizes; reloads the fixtures (or the demo data) per test
pnpm test:demo-off # against an app started with DEMO_MODE=false on 127.0.0.1:3200 (Phase 5 notes)
pnpm build       # production build (webpack, with the Serwist service worker)
```

Demo mode off (what a client instance looks like), after `pnpm build`:

```bash
PORT=3200 DEMO_MODE=false DATABASE_URL=./data/pglite-demo-off pnpm fixtures
DEMO_MODE=false DATABASE_URL=./data/pglite-demo-off BETTER_AUTH_URL=http://localhost:3200 BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3200 npx next start --hostname 127.0.0.1 --port 3200
pnpm test:demo-off   # in a second terminal
```

## Layout

| Path | What |
|---|---|
| `src/app/` | Routes: `/login`, the shell group `(app)` with Sot `/`, `/orders`, `/debts`, `/schedule`, `/cash`, `/settings`, `/setup`; `/t/[token]` tracking page |
| `src/styles/` | `tokens.css` and `app.css` adopted from the v10 prototype; `app-extra.css` for app-only pieces |
| `src/brand/` | brand.json v2 schema, loading, theme shades, logo colour extraction |
| `src/domain/` | Pure rules: balances, debts and the reminder rule, visits and installer load, prepared messages, the tracking page |
| `src/services/` | Every write: role check, validation, one history line per change |
| `src/db/` | Drizzle schema, connection (PGlite or Postgres by `DATABASE_URL`), test fixtures (Phases 2–4), `demo/` (the demo data per business type) |
| `src/server/demo*.ts`, `src/components/demo-bar.tsx` | Demo mode: logins, reset, daily reseed, meeting number, QR, the demo bar and panel |
| `docs/pitch-kit/` | 3-minute demo script, one-page offer, rebrand checklist |
| `src/auth/` | Better Auth, session helpers, permissions (checked in every server action) |
| `messages/sq.json` | Every staff-facing string (Albanian) |
| `drizzle/` | SQL migrations, including the append-only trigger on `history` |
| `prototype/` | The approved v10 prototype; standalone and excluded from the app's TS/ESLint/tests/build |
