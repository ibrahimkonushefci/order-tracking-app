#!/usr/bin/env bash
# Publishes the committed code (HEAD) to one online installation, or to all of them:
#   pnpm deploy:app populated | interier-kosova | mobileria-kosova | all
# populated uses .vercel/project.json (order-tracking-test); a presentation brand uses
# .vercel/<brand>.project.json. Only committed files are uploaded (a `git archive` of HEAD),
# never the working folder with its local secrets and database. No data is ever changed here:
# migrations run in the build, and nothing is reset.
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-}"
[ -n "$TARGET" ] || { echo "Përdorimi: pnpm deploy:app <populated|interier-kosova|mobileria-kosova|all>"; exit 1; }
if [ "$TARGET" = all ]; then
  for t in populated interier-kosova mobileria-kosova; do "$0" "$t"; done
  exit 0
fi

if [ "$TARGET" = populated ]; then LINK=.vercel/project.json; ENVFILE=.env.deploy.local
else LINK=".vercel/$TARGET.project.json"; ENVFILE=".env.$TARGET.local"
  git cat-file -e "HEAD:brands/$TARGET/brand.json" 2>/dev/null || { echo "brands/$TARGET/brand.json nuk është në HEAD."; exit 1; }
fi
[ -f "$LINK" ] || { echo "Mungon $LINK (vercel link)."; exit 1; }
[ -f "$ENVFILE" ] || { echo "Mungon $ENVFILE."; exit 1; }
if [ -n "$(git status --porcelain -- brands src messages drizzle package.json)" ]; then
  echo "Kujdes: ka ndryshime pa commit në brands/, src/ ose messages/. Publikohet vetëm HEAD ($(git rev-parse --short HEAD))."
fi

# Single values only: the database URL contains '&', so the file is never sourced.
APP_URL="$(grep '^APP_URL=' "$ENVFILE" | head -1 | cut -d= -f2-)"
[ -n "$APP_URL" ] || { echo "APP_URL mungon në $ENVFILE."; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git archive HEAD | tar -x -C "$TMP"
mkdir -p "$TMP/.vercel" && cp "$LINK" "$TMP/.vercel/project.json"

echo "Publikohet $(git rev-parse --short HEAD) në $APP_URL ($TARGET) …"
out="$( (cd "$TMP" && npx --yes vercel@latest deploy --prod --yes) 2>&1 )" || { echo "$out" | tail -20; echo "Publikimi dështoi."; exit 1; }
echo "$out" | grep -E "Production|Aliased" || true
code="$(curl -s -o /dev/null -w '%{http_code}' "$APP_URL/login")"
echo "Gati: $APP_URL/login → HTTP $code"
