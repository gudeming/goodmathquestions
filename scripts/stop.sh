#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"
PORT="${PORT:-3000}"
PID_FILE="$RUN_DIR/web-${PORT}.pid"
LEGACY_PID_FILE="$RUN_DIR/web.pid"

cd "$ROOT_DIR"

is_next_process() {
  local cmd="$1"
  [[ "$cmd" == *"next start"* || "$cmd" == *"next-server"* ]]
}

stop_pid() {
  local pid="$1"
  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "Stopping web app (PID: $pid)..."
    kill "$pid"
    sleep 1
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "Force stopping web app..."
      kill -9 "$pid"
    fi
    echo "Web app stopped."
  else
    echo "No running process for PID $pid."
  fi
}

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE")"
  stop_pid "$PID"
  rm -f "$PID_FILE"
elif [[ -f "$LEGACY_PID_FILE" ]]; then
  PID="$(cat "$LEGACY_PID_FILE")"
  stop_pid "$PID"
  rm -f "$LEGACY_PID_FILE"
else
  PORT_PID="$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
  if [[ -n "$PORT_PID" ]]; then
    CMD="$(ps -p "$PORT_PID" -o command= 2>/dev/null || true)"
    if is_next_process "$CMD"; then
      echo "Found Next.js process on port $PORT (PID: $PORT_PID)."
      stop_pid "$PORT_PID"
    else
      echo "Port $PORT is used by PID $PORT_PID, but it is not a Next.js process."
      echo "Command: ${CMD:-unknown}"
      echo "Skip killing non-target process."
      exit 1
    fi
  else
    echo "No web PID file found for port $PORT and no listening process detected."
  fi
fi

if [[ "${1:-}" == "--with-services" ]]; then
  echo "Stopping postgres and redis..."
  docker compose stop postgres redis
fi
