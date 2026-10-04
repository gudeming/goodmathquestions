#!/bin/bash
# GMQ incremental deploy: pull latest main, rebuild, restart, health-check.
# Runs on the server; .github/workflows/deploy.yml calls it on every push to main.
# Usage:
#   ./scripts/ec2-deploy.sh         — pull latest code, rebuild, restart
#   ./scripts/ec2-deploy.sh --init  — first-time setup (no pull, allows destructive schema push)
set -euo pipefail

APP_DIR=${GMQ_APP_DIR:-/opt/gmq}
SCHEMA=packages/db/prisma/schema.prisma
HEALTH_URL=http://127.0.0.1:3000/

cd "$APP_DIR"
set -a; . "$APP_DIR/.env"; set +a

if [[ "${1:-}" == "--init" ]]; then
  DB_PUSH_FLAG=--accept-data-loss
else
  echo "[1/5] Pulling latest code..."
  # npm install may have rewritten the lockfile; on the server it is only a build artifact.
  git checkout -- package-lock.json
  git pull --ff-only origin main
  # Never auto-drop production data: a destructive schema change stops the deploy
  # here, before the running app is touched, and must be applied by hand.
  DB_PUSH_FLAG=
fi

echo "[2/5] Installing dependencies..."
npm install --no-audit --no-fund

echo "[3/5] Prisma generate + schema push..."
npx prisma generate --schema "$SCHEMA"
npx prisma db push --schema "$SCHEMA" $DB_PUSH_FLAG

echo "[4/5] Building..."
# Cap the heap so a 2GB box (plus swap) can finish the Next.js build.
NODE_OPTIONS="--max-old-space-size=1400" npx turbo build --filter=@gmq/web

echo "[5/5] Restarting..."
# -n: fail instead of hanging on a password prompt over non-interactive SSH.
sudo -n systemctl restart gmq-web

for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null -m 5 "$HEALTH_URL"; then
    echo "Deploy complete: $(git log -1 --format='%h %s')"
    exit 0
  fi
  sleep 2
done

echo "App did not respond on $HEALTH_URL after restart. Recent logs:" >&2
sudo -n journalctl -u gmq-web -n 50 --no-pager >&2 || true
exit 1
