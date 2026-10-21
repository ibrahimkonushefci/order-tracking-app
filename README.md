# Order Tracking

A white-label web app for small workshops (kitchens, furniture, doors & floors, windows) to track **orders, payments, debts and installation visits**, and to keep their clients updated with a simple tracking link.

Built for workshops in Kosovo: the staff interface is in Albanian, and the client-facing texts come in Albanian, English and German.

**Live demo:** [order-tracking-test.vercel.app](https://order-tracking-test.vercel.app). Use the one-tap demo logins on the sign-in page. The demo data resets daily.

---

## Features

- **Orders**: three simple stages, optional visit dates, projects with several installations, and an append-only history of every change.
- **Money**: advances and partial payments, cash collected by installers until it reaches the office, and balances per order and per client.
- **Debts**: who owes what and since when, opening balances carried over from the paper notebook, and payment reminders.
- **Schedule**: measuring and installation visits per installer. Installers get their jobs on WhatsApp and never need a login.
- **Prepared messages**: ready-to-send WhatsApp texts (order confirmed, visit reminder, payment due) that you review and send yourself.
- **Client tracking page**: a public link (and QR code) where the client sees their order's status. No login needed.
- **Two logins**: *Pronari* (owner) and *Zyra* (office) share the same screens. Only the owner can delete records, export all data and manage users.
- **White-label**: each client workshop gets its own brand (name, logo, colours, business type) from a single folder.
- **Works offline**: runs on a laptop with an embedded database and installs as a PWA on phones.
- **Demo mode**: a guided sales demo with sample data, brand switching, a time shift and one-click reset.

## Tech stack

| Area | Tools |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, server actions), React 19, TypeScript |
| Database | [Drizzle ORM](https://orm.drizzle.team) on [PGlite](https://pglite.dev) (embedded Postgres, offline) or Postgres ([Neon](https://neon.tech)) |
| Auth | [Better Auth](https://www.better-auth.com) |
| UI | Tailwind CSS 4, Inter, next-intl |
| PWA | Serwist service worker |
| Tests | Vitest (unit), Playwright (end-to-end, laptop and phone sizes) |
| Hosting | Vercel (Frankfurt) + Neon |

## Getting started

Requirements: **Node 24+** and **pnpm 11**.

```bash
pnpm install
cp .env.example .env.local   # fill in the values (each one is explained in the file)
pnpm demo                    # creates the local database and loads the demo data
pnpm dev                     # http://localhost:3100
```

### Logging in

On the login page, tap **Hyr si Arben** (owner) or **Hyr si Teuta** (office). To use the email form instead:

| Brand | Owner | Office |
|---|---|---|
| Druri Design | `pronari@druri-design.test` | `zyra@druri-design.test` |
| Lumi Dyer & Parket | `pronari@lumi-dyer.test` | `zyra@lumi-dyer.test` |

The password is `FIXTURE_PASSWORD` from your `.env.local`.

### Database

- With `DATABASE_URL=./data/pglite` (the default), the app uses an embedded Postgres stored in that folder. No database server is needed.
- With `DATABASE_URL=postgres://…`, the same code runs on a real Postgres. Apply migrations with `pnpm db:migrate`.
- `pnpm demo` loads the full demo data. `pnpm fixtures` loads the small data set the automated tests use. Both work while the app is running.
- **`RuntimeError: Aborted()`** means the local database folder is damaged, usually because the app was killed while it was writing. Stop the app, move `data/pglite` aside, then run `pnpm demo` and `pnpm dev`. Stop the dev server with Ctrl+C to avoid this.

### Testing on a phone

On the same Wi-Fi, open `http://<laptop-ip>:3100` (on a Mac: `ipconfig getifaddr en0`) and add that address to `BETTER_AUTH_TRUSTED_ORIGINS`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server on port 3100 |
| `pnpm build` / `pnpm start` | Production build (with service worker) and server |
| `pnpm demo` | Reset the database to the full demo data |
| `pnpm fixtures` | Reset the database to the test fixtures |
| `pnpm db:generate` / `pnpm db:migrate` | Create / apply SQL migrations |
| `pnpm lint` / `pnpm typecheck` | ESLint and TypeScript checks |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | End-to-end tests (Playwright) |
| `pnpm test:demo-off` | Checks that a client instance (`DEMO_MODE=false`) has no demo features |
| `pnpm deploy:demo` | Deploy the committed code to the online demo and reset its data |

## Demo mode

Demo mode is enabled with `DEMO_MODE=true` and must stay **off** for real clients.

- A **demo bar** (or **▶ Demo** on phones) switches brand and role, jumps to the key moments of the pitch, shifts the demo date and resets everything.
- `?brand=<slug>` on any page switches to another brand and its data.
- QR codes always point to the online demo (`DEMO_PUBLIC_URL`), so a client's phone can open them while the laptop is offline.
- For an offline meeting, run `pnpm build`, `pnpm demo` and `pnpm start` while you still have internet. After that the laptop needs no network.

## White-label branding

Each brand is a folder in [`brands/`](brands/):

```
brands/<slug>/
├── brand.json   # name, colours, phone, city, business type (schema: src/brand/schema.ts)
├── logo.svg     # or logo.png
└── demo.json    # optional: names used in demo mode
```

Select the brand with `BRAND=<slug>`. In demo mode, the **/setup** page builds a new brand from a logo upload (colours are suggested from the logo) and reloads the demo data for it.

## Deployment

The online demo runs on **Vercel** (functions in `fra1`) with **Neon** Postgres in Frankfurt.

- `vercel.json` runs `pnpm vercel-build`, which applies migrations and then builds.
- Environment variables are set in the Vercel project. The full list, with explanations, is in [`.env.example`](.env.example).
- `pnpm deploy:demo` deploys the last commit (not uncommitted changes) and resets the demo data.

## Project structure

```
src/
├── app/          # Routes: login, Today, orders, debts, schedule, cash, settings, setup, /t/[token] tracking page
├── domain/       # Pure business rules: balances, debts, reminders, visits, messages, tracking
├── services/     # Every write: permission check, validation, one history entry per change
├── db/           # Drizzle schema, connection, test fixtures and demo data
├── auth/         # Better Auth setup, sessions, permissions
├── brand/        # Brand schema, loading and colour themes
├── server/       # Demo mode on the server side
├── components/   # UI components
└── styles/       # Design tokens and app styles
brands/           # One folder per brand
drizzle/          # SQL migrations (including the append-only history trigger)
messages/         # Albanian staff-interface strings
prototype/        # The approved HTML design prototype (not part of the app build)
tests/            # Vitest unit tests and Playwright end-to-end tests
```

## Status

The app is in active development. The core (orders, money, debts, visits, messages, tracking page and demo mode) is built and deployed to the online demo. Next up are backups and automatic messaging providers.
