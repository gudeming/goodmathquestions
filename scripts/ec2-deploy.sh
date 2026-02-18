#!/bin/bash
# GMQ EC2 Incremental Deploy Script
# Usage:
#   ./scripts/ec2-deploy.sh         — pull latest code, rebuild, restart
#   ./scripts/ec2-deploy.sh --init  — first-time setup (install deps, push schema)
set -euo pipefail

APP_DIR=/opt/gmq
cd "$APP_DIR"

if [[ "${1:-}" == "--init" ]]; then
  echo "=== Initial setup ==="
  npm install
  npx prisma generate --schema packages/db/prisma/schema.prisma
  npx prisma db push --schema packages/db/prisma/schema.prisma --accept-data-loss
  npx turbo build --filter=@gmq/web
  sudo systemctl restart gmq-web
  echo "Init complete!"
  exit 0
fi

echo "[1/5] Pulling latest code..."
git pull origin main

echo "[2/5] Installing dependencies..."
npm install

echo "[3/5] Prisma generate + migrate..."
npx prisma generate --schema packages/db/prisma/schema.prisma
npx prisma db push --schema packages/db/prisma/schema.prisma --accept-data-loss

echo "[4/5] Building..."
npx turbo build --filter=@gmq/web

echo "[5/5] Restarting..."
sudo systemctl restart gmq-web

sleep 3
echo "Deploy complete!"
systemctl status gmq-web --no-pager || true
