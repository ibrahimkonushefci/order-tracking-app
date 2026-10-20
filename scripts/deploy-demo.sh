#!/usr/bin/env bash
# Publishes the committed code (HEAD) to the online demo and resets its demo data.
#   pnpm deploy:demo
# Needs: `npx vercel@latest login` once, .vercel/project.json (from `vercel link`), and
# .env.deploy.local with APP_URL and FIXTURES_TOKEN. Only committed files are uploaded
# (a `git archive` of HEAD), never the working folder with its local secrets and database.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .vercel/project.json ] || { echo "Mungon .vercel/project.json (vercel link)."; exit 1; }
[ -f .env.deploy.local ] || { echo "Mungon .env.deploy.local."; exit 1; }
if [ -n "$(git status --porcelain -- brands src messages drizzle package.json)" ]; then
  echo "Kujdes: ka ndryshime pa commit në brands/, src/ ose messages/. Publikohet vetëm HEAD ($(git rev-parse --short HEAD))."
fi

# Single values only: the database URL contains '&', so the file is never sourced.
env_value() { grep "^$1=" .env.deploy.local | head -1 | cut -d= -f2-; }
APP_URL="$(env_value APP_URL)"
FIXTURES_TOKEN="$(env_value FIXTURES_TOKEN)"
[ -n "$APP_URL" ] && [ -n "$FIXTURES_TOKEN" ] || { echo "APP_URL ose FIXTURES_TOKEN mungon në .env.deploy.local."; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git archive HEAD | tar -x -C "$TMP"
mkdir -p "$TMP/.vercel" && cp .vercel/project.json "$TMP/.vercel/"

echo "Publikohet $(git rev-parse --short HEAD) në $APP_URL …"
(cd "$TMP" && npx --yes vercel@latest deploy --prod --yes) | tail -3

echo "Rivendoset demo online …"
curl -sS -X POST -H "x-fixtures-token: $FIXTURES_TOKEN" "$APP_URL/api/dev/fixtures?set=demo" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('  ' + '\n  '.join(f\"{b['slug']}: {b['orders']} porosi\" for b in d['brands']))"
echo "Gati: $APP_URL  (marka: $APP_URL/?brand=<slug>)"
