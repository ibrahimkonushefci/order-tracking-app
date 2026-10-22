# Order Tracking

A white-label web app for small workshops (kitchens, furniture, doors & floors, windows) to track **orders, payments, debts and installation visits**, and to keep their clients updated with a simple tracking link.

Built for workshops in Kosovo: the staff interface is in Albanian, and the client-facing texts come in Albanian, English and German.

**Online installations** (sign-in required): [order-tracking-test.vercel.app](https://order-tracking-test.vercel.app) with two sample workshops, and two empty presentation brands, [interier-kosova.vercel.app](https://interier-kosova.vercel.app) and [mobileria-kosova.vercel.app](https://mobileria-kosova.vercel.app).

---

## Features

- **Orders**: three simple stages, optional visit dates, projects with several installations, and an append-only history of every change.
- **Money**: advances and partial payments, cash collected by installers until it reaches the office, and balances per order and per client.
- **Debts**: who owes what and since when, opening balances carried over from the paper notebook, and payment reminders.
- **Schedule**: measuring and installation visits per installer. Installers get their jobs on WhatsApp and never need a login.
- **Prepared messages**: ready-to-send WhatsApp texts (order confirmed, visit reminder, payment due) that you review and send yourself.
- **Client tracking page**: a public link where the client sees their order's status. No login needed.
- **Two logins**: *Pronari* (owner) and *Zyra* (office) share the same screens. Only the owner can delete records, export all data and manage users.
- **White-label**: each client workshop gets its own brand (name, logo, colours, business type) from a single folder. One installation can host several companies; each user sees their own company's brand.
- **Works offline**: runs on a laptop with an embedded database and installs as a PWA on phones.

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
pnpm fixtures                # creates the local database and loads the small test data set
pnpm dev                     # http://localhost:3100
```

### Logging in

Locally, the test data has two logins: `arben@druri.test` (owner) and `teuta@druri.test` (office). The password is `FIXTURE_PASSWORD` from your `.env.local`. Online installations use normal accounts with their own passwords (see [Online installations](#online-installations)).

### Database

- With `DATABASE_URL=./data/pglite` (the default), the app uses an embedded Postgres stored in that folder. No database server is needed.
- With `DATABASE_URL=postgres://…`, the same code runs on a real Postgres. Apply migrations with `pnpm db:migrate`.
- `pnpm fixtures` loads the small data set the automated tests use, also while the app is running. It only ever works on the local database folder, never on a `postgres://` database.
- **`RuntimeError: Aborted()`** means the local database folder is damaged, usually because the app was killed while it was writing. Stop the app, move `data/pglite` aside, then run `pnpm fixtures` and `pnpm dev`. Stop the dev server with Ctrl+C to avoid this.

### Testing on a phone

On the same Wi-Fi, open `http://<laptop-ip>:3100` (on a Mac: `ipconfig getifaddr en0`) and add that address to `BETTER_AUTH_TRUSTED_ORIGINS`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server on port 3100 |
| `pnpm build` / `pnpm start` | Production build (with service worker) and server |
| `pnpm fixtures` | Reset the local database to the test fixtures |
| `pnpm db:generate` / `pnpm db:migrate` | Create / apply SQL migrations |
| `pnpm lint` / `pnpm typecheck` | ESLint and TypeScript checks |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | End-to-end tests (Playwright) |
| `pnpm deploy:app <target>` | Deploy the committed code to one online installation (or `all`); never changes data |
| `pnpm provision <target>` | Create the company and its owner in an empty presentation database |
| `pnpm account <target> <email>` | Change a login's password, email, name or active state |
| `pnpm presentation:clear <target>` | Start fresh: empty one presentation brand's records |

## White-label branding

Each brand is a folder in [`brands/`](brands/):

```
brands/<slug>/
├── brand.json   # name, colours, phone, city, business type (schema: src/brand/schema.ts)
└── logo.svg     # or logo.png; "src": "none" shows the initial on the brand colour
```

A signed-in user sees the brand of their own company (`company.brand_slug`). Signed out, the login page shows `BRAND=<slug>`. Brands are added through Git.

## Deployment

Every installation runs on **Vercel** (functions in `fra1`) with its own **Neon** Postgres in Frankfurt.

- `vercel.json` runs `pnpm vercel-build`, which applies migrations and then builds.
- Environment variables are set in each Vercel project. The full list, with explanations, is in [`.env.example`](.env.example).
- `pnpm deploy:app <target>` deploys the last commit (not uncommitted changes). Nothing resets automatically.

### Online installations

| Target | Vercel project | Database | Companies |
|---|---|---|---|
| `populated` | order-tracking-test | its own Neon project | Druri Design and Lumi Dyer, with sample records |
| `interier-kosova` | interier-kosova | its own Neon project | Interier Kosova (doors & floors), one owner |
| `mobileria-kosova` | mobileria-kosova | its own Neon project | Mobileria Kosova (kitchens), one owner |

Each target has a gitignored settings file (`.env.deploy.local` for `populated`, `.env.<target>.local` for the others) and a Vercel link (`.vercel/project.json`, `.vercel/<target>.project.json`). Scripts read them; they are never printed.

**Start fresh** (`pnpm presentation:clear <target>`, presentation brands only) removes clients, orders, visits, payments (including cash held by installers), opening balances, messages and their history, and restarts order numbers at 001. The owner, company settings, branding, installers and the installer and settings history stay. It runs only when the database holds exactly one company with the id recorded by `pnpm provision`, on the database recorded then, and after you type the company name.

## Project structure

```
src/
├── app/          # Routes: login, Today, orders, debts, schedule, cash, settings, /t/[token] tracking page
├── domain/       # Pure business rules: balances, debts, reminders, visits, messages, tracking
├── services/     # Every write: permission check, validation, one history entry per change
├── db/           # Drizzle schema, connection, test fixtures, presentation setup and start fresh
├── auth/         # Better Auth setup, sessions, permissions
├── brand/        # Brand schema, loading and colour themes
├── server/       # Request helpers: page context, tracking links, message sender
├── components/   # UI components
└── styles/       # Design tokens and app styles
brands/           # One folder per brand
drizzle/          # SQL migrations (including the append-only history trigger)
messages/         # Albanian staff-interface strings
prototype/        # The approved HTML design prototype (not part of the app build)
tests/            # Vitest unit tests and Playwright end-to-end tests
```

## Status

The app is in active development. The core (orders, money, debts, visits, messages and the tracking page) is built and deployed. Next up are backups and automatic messaging providers.
