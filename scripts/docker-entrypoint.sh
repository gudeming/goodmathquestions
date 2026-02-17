#!/usr/bin/env sh
set -eu

if [ -z "${DATABASE_URL:-}" ] && [ -n "${POSTGRES_HOST:-}" ] && [ -n "${POSTGRES_USER:-}" ] && [ -n "${POSTGRES_PASSWORD:-}" ] && [ -n "${POSTGRES_DB:-}" ]; then
  POSTGRES_PORT="${POSTGRES_PORT:-5432}"
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
fi

if [ -z "${REDIS_URL:-}" ] && [ -n "${REDIS_HOST:-}" ]; then
  REDIS_PORT="${REDIS_PORT:-6379}"
  export REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"
fi

exec "$@"
