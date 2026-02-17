#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"
PORT="${PORT:-3000}"
PID_FILE="$RUN_DIR/web-${PORT}.pid"
LOG_FILE="$RUN_DIR/web-${PORT}.log"

mkdir -p "$RUN_DIR"
cd "$ROOT_DIR"

is_next_process() {
  local cmd="$1"
  [[ "$cmd" == *"next start"* || "$cmd" == *"next-server"* ]]
}

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE")"
  if kill -0 "$OLD_PID" >/dev/null 2>&1; then
    echo "Web app is already running (PID: $OLD_PID, port: $PORT)"
    echo "Log: $LOG_FILE"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

# Fail fast if target port is already occupied.
PORT_PID="$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
if [[ -n "$PORT_PID" ]]; then
  PORT_CMD="$(ps -p "$PORT_PID" -o command= 2>/dev/null || true)"
  if is_next_process "$PORT_CMD"; then
    echo "Port $PORT is already served by an existing Next.js process (PID: $PORT_PID)."
  else
    echo "Port $PORT is already in use by PID $PORT_PID."
  fi
  echo "Resolve port conflict, then retry."
  echo "Tips:"
  echo "  - use another port: PORT=3100 ./scripts/start.sh"
  echo "  - stop existing app: ./scripts/stop.sh"
  exit 1
fi

echo "Starting postgres and redis..."
docker compose up -d postgres redis

echo "Syncing database schema..."
npm run db:push

echo "Building web app..."
npm --workspace @gmq/web run build

echo "Starting web app in background..."
nohup npm --workspace @gmq/web run start -- -p "$PORT" >"$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" >"$PID_FILE"

sleep 2
if ! kill -0 "$NEW_PID" >/dev/null 2>&1; then
  echo "Web app failed to start. Last logs:"
  tail -n 50 "$LOG_FILE" || true
  rm -f "$PID_FILE"
  exit 1
fi

echo "Web app started."
echo "PID: $NEW_PID"
echo "Log: $LOG_FILE"
echo "URL: http://localhost:$PORT"
