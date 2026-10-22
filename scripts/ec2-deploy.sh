#!/bin/bash
# GMQ incremental deploy: pull latest main, rebuild out of place, swap, restart, health-check.
# Runs on the server; .github/workflows/deploy.yml calls it on every push to main.
# Usage:
#   ./scripts/ec2-deploy.sh            — pull latest code, rebuild, swap, restart
#   ./scripts/ec2-deploy.sh --init     — first-time setup (no pull, allows destructive schema push)
#   ./scripts/ec2-deploy.sh --rebuild  — skip steps 1-3b: rebuild + swap + restart the current checkout
#                                        (retry after a failed build; also used for local dry runs)
#
# Why out of place: building in apps/web/.next while the old `next start` keeps serving
# deletes the chunks its HTML points at, so for the whole multi-minute build pages load
# but nothing is interactive. The build now happens in $BUILD_DIR (source copied,
# node_modules hard-linked, so no second copy of node_modules on disk) and the finished
# .next is moved into place with two renames just before the restart. The old build's
# recent static chunks are hard-linked into the new one, so open tabs keep working.
#
# Overrides (for tests / emergencies): GMQ_APP_DIR, GMQ_BUILD_DIR, GMQ_RESTART_CMD,
# GMQ_LOGS_CMD, HEALTH_URL, GMQ_BUILD_HEAP_MB, GMQ_MIN_FREE_MB, GMQ_KEEP_STATIC_DAYS.
set -euo pipefail

APP_DIR=${GMQ_APP_DIR:-/opt/gmq}
SCHEMA=packages/db/prisma/schema.prisma
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:3000/}
# -n: fail instead of hanging on a password prompt over non-interactive SSH.
RESTART_CMD=${GMQ_RESTART_CMD:-sudo -n systemctl restart gmq-web}
LOGS_CMD=${GMQ_LOGS_CMD:-sudo -n journalctl -u gmq-web -n 50 --no-pager}
# Inside APP_DIR so it is on the same filesystem: hard links and the atomic mv need that.
BUILD_DIR=${GMQ_BUILD_DIR:-$APP_DIR/.deploy/build}
# 1400 MB has been enough for this app on the 2 GB box (+ swap) with the old server
# still running beside the build. Raising it lets V8 grow into swap instead of
# collecting, which makes the build slower and starves the live process; only raise
# (e.g. 1800) if the build dies with "JavaScript heap out of memory".
BUILD_HEAP_MB=${GMQ_BUILD_HEAP_MB:-1400}
# Postgres (docker) shares this disk: refuse to start a build that could fill it.
MIN_FREE_MB=${GMQ_MIN_FREE_MB:-1024}
# Old static chunks younger than this are carried into the new build.
KEEP_STATIC_DAYS=${GMQ_KEEP_STATIC_DAYS:-7}

WEB_DIR=$APP_DIR/apps/web
LIVE_NEXT=$WEB_DIR/.next
PREV_NEXT=$WEB_DIR/.next.prev
FAILED_NEXT=$WEB_DIR/.next.failed
NEW_NEXT=$BUILD_DIR/apps/web/.next

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

MODE=${1:-}
case "$MODE" in
  ""|--init|--rebuild) ;;
  *) echo "Unknown option: $MODE (expected --init or --rebuild)" >&2; exit 2 ;;
esac

cd "$APP_DIR"
set -a; . "$APP_DIR/.env"; set +a

# One deploy at a time (deploy.yml already serialises; this also covers manual runs).
mkdir -p "$APP_DIR/.deploy"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$APP_DIR/.deploy/lock"
  flock -n 9 || { echo "Another deploy is running (lock $APP_DIR/.deploy/lock)." >&2; exit 1; }
fi
# Keep `git status` on the server clean.
if [[ -d .git/info ]] && ! grep -qxF '/.deploy/' .git/info/exclude 2>/dev/null; then
  echo '/.deploy/' >> .git/info/exclude
fi

if [[ "$MODE" == "--rebuild" ]]; then
  log "--rebuild: skipping pull, install, schema push and content sync"
else
  if [[ "$MODE" == "--init" ]]; then
    DB_PUSH_FLAG=--accept-data-loss
  else
    log "[1/7] Pulling latest code..."
    # npm install may have rewritten the lockfile; on the server it is only a build artifact.
    git checkout -- package-lock.json
    git pull --ff-only origin main
    # Never auto-drop production data: a destructive schema change stops the deploy
    # here, before the running app is touched, and must be applied by hand.
    DB_PUSH_FLAG=
  fi

  log "[2/7] Installing dependencies..."
  # .env sets NODE_ENV=production, which makes npm skip devDependencies; the build
  # needs them (prisma CLI for @gmq/db's postinstall, typescript, tsx).
  npm install --include=dev --no-audit --no-fund

  log "[3/7] Prisma generate + schema push..."
  npx prisma generate --schema "$SCHEMA"
  # Idempotent additive prep (header of pre-push.sql explains why) so db push needs no --accept-data-loss.
  npx prisma db execute --file packages/db/prisma/pre-push.sql --schema "$SCHEMA"
  # shellcheck disable=SC2086  # empty flag must expand to nothing
  npx prisma db push --schema "$SCHEMA" $DB_PUSH_FLAG

  log "[3b/7] Syncing question content..."
  # Content lives in code: upsert collections + hero questions by slug and refresh
  # legacy questions by sortOrder. questions_only preserves users, XP, submissions,
  # classrooms, badges and sessions. Then drop any demo community-boost accounts
  # (no-op when there are none).
  SEED_MODE=questions_only npm run db:seed -w @gmq/db
  SEED_MODE=community_cleanup npm run db:seed -w @gmq/db
fi

# ---------------------------------------------------------------------------
# Out-of-place build. Until the swap in step 6 nothing under $LIVE_NEXT changes,
# except that its webpack build cache (never read by `next start`) is borrowed.
# ---------------------------------------------------------------------------
CACHE_BORROWED=0
SWAP_STATE=none   # none -> moved_live -> swapped

restore_cache() {
  if [[ "$CACHE_BORROWED" == 1 && -d "$NEW_NEXT/cache/webpack" && -d "$LIVE_NEXT" ]]; then
    mkdir -p "$LIVE_NEXT/cache"
    rm -rf "$LIVE_NEXT/cache/webpack"
    mv "$NEW_NEXT/cache/webpack" "$LIVE_NEXT/cache/webpack" || true
  fi
  CACHE_BORROWED=0
}

# Runs on any unexpected exit (set -e) so a half-done swap never stays behind.
on_exit() {
  local rc=$?
  if [[ $rc -ne 0 ]]; then
    case "$SWAP_STATE" in
      moved_live)
        log "Deploy aborted mid-swap: restoring the previous build"
        if [[ ! -e "$LIVE_NEXT" && -d "$PREV_NEXT" ]]; then mv "$PREV_NEXT" "$LIVE_NEXT"; fi ;;
      none)
        restore_cache ;;
    esac
    [[ "$SWAP_STATE" == swapped ]] || log "Live build left untouched; failed build dir kept at $BUILD_DIR"
  fi
  exit "$rc"
}
trap on_exit EXIT

log "[4/7] Preparing build dir $BUILD_DIR..."
free_mb=$(df -Pm "$APP_DIR" | awk 'NR==2 {print $4}')
log "Free disk on $APP_DIR: ${free_mb} MB"
if [[ "$free_mb" -lt "$MIN_FREE_MB" ]]; then
  echo "Only ${free_mb} MB free (need ${MIN_FREE_MB}); not building. The live site is untouched." >&2
  exit 1
fi
# After a rollback the webpack cache sits in the failed build; keep it.
if [[ -d "$FAILED_NEXT/cache/webpack" && -d "$LIVE_NEXT" && ! -d "$LIVE_NEXT/cache/webpack" ]]; then
  mkdir -p "$LIVE_NEXT/cache"
  mv "$FAILED_NEXT/cache/webpack" "$LIVE_NEXT/cache/webpack"
fi
rm -rf "$BUILD_DIR" "$FAILED_NEXT"
mkdir -p "$BUILD_DIR"
# Source: a real copy (tens of MB), so nothing the build writes (tsbuildinfo,
# next-env.d.ts, ...) can leak into the live tree through a shared inode.
tar -C "$APP_DIR" \
  --exclude=node_modules --exclude=.git --exclude=.deploy --exclude=.turbo \
  --exclude=.next --exclude=.next.prev --exclude=.next.failed \
  --exclude=playwright-report --exclude=test-results --exclude=cdk.out \
  -cf - . | tar -C "$BUILD_DIR" -xf -
# node_modules: hard links (GNU cp -al), so ~500 MB costs only directory entries.
# Relative workspace symlinks (node_modules/@gmq/* -> ../../packages/*) then
# resolve inside the build dir.
nm_count=0
while IFS= read -r -d '' nm; do
  rel=${nm#"$APP_DIR"/}
  mkdir -p "$BUILD_DIR/$(dirname "$rel")"
  cp -al "$nm" "$BUILD_DIR/$rel"
  nm_count=$((nm_count + 1))
done < <(find "$APP_DIR" \( -name .git -o -name .deploy -o -name .next \) -prune -o \
           -type d -name node_modules -print0 -prune)
log "Linked $nm_count node_modules dir(s)"
# prisma generate rewrites node_modules/.prisma; give the build its own copy (~20 MB)
# so that write cannot touch the client the live server loads.
if [[ -d "$APP_DIR/node_modules/.prisma" ]]; then
  rm -rf "$BUILD_DIR/node_modules/.prisma"
  cp -a "$APP_DIR/node_modules/.prisma" "$BUILD_DIR/node_modules/.prisma"
fi
# Borrow the webpack cache so the build stays incremental.
if [[ -d "$LIVE_NEXT/cache/webpack" ]]; then
  mkdir -p "$NEW_NEXT/cache"
  mv "$LIVE_NEXT/cache/webpack" "$NEW_NEXT/cache/webpack"
  CACHE_BORROWED=1
fi

log "[5/7] Building in $BUILD_DIR (heap cap ${BUILD_HEAP_MB} MB)..."
cd "$BUILD_DIR"
npx prisma generate --schema "$SCHEMA"
# Same command CI builds with. (turbo adds nothing here: no upstream package has a
# build task and its cache dir is not copied.)
NODE_OPTIONS="--max-old-space-size=$BUILD_HEAP_MB" npm run build -w @gmq/web
cd "$APP_DIR"
[[ -f "$NEW_NEXT/BUILD_ID" ]] || { echo "Build finished without $NEW_NEXT/BUILD_ID" >&2; exit 1; }
NEW_ID=$(cat "$NEW_NEXT/BUILD_ID")
CACHE_BORROWED=0   # the cache now belongs to the new build

# Carry the previous build's recent static chunks into the new one (hard links;
# content-hashed names, so no clobbering). Browsers still on an old page can then
# lazy-load the chunks it references after the restart.
carried=0
if [[ -d "$LIVE_NEXT/static" ]]; then
  while IFS= read -r -d '' f; do
    f=${f#./}
    [[ -e "$NEW_NEXT/static/$f" ]] && continue
    d=$(dirname "$NEW_NEXT/static/$f")
    [[ -d "$d" ]] || mkdir -p "$d"
    ln "$LIVE_NEXT/static/$f" "$NEW_NEXT/static/$f"
    carried=$((carried + 1))
  done < <(cd "$LIVE_NEXT/static" && find . -type f -mtime "-$KEEP_STATIC_DAYS" -print0)
fi
log "Built $NEW_ID; carried $carried static file(s) from the previous build"

log "[6/7] Swapping in the new build and restarting..."
rm -rf "$PREV_NEXT"
if [[ -d "$LIVE_NEXT" ]]; then
  mv "$LIVE_NEXT" "$PREV_NEXT"
  SWAP_STATE=moved_live
fi
mv "$NEW_NEXT" "$LIVE_NEXT"
SWAP_STATE=swapped
# Remove the build dir before the restart so the health check proves the new
# build does not depend on anything left there.
rm -rf "$BUILD_DIR"
bash -c "$RESTART_CMD"

# Healthy = the page answers 200 and a /_next/static asset it references loads
# (the failure mode this script exists to prevent).
healthy() {
  local html asset
  html=$(curl -fsS -m 5 "$HEALTH_URL") || return 1
  asset=$(grep -oE '/_next/static/[^"'"'"' ]+\.js' <<<"$html" | head -n 1 || true)
  [[ -z "$asset" ]] && return 0
  curl -fsS -o /dev/null -m 5 "$(sed -E 's#^(https?://[^/]+).*#\1#' <<<"$HEALTH_URL")$asset"
}

wait_healthy() {
  for _ in $(seq 1 30); do
    if healthy; then return 0; fi
    sleep 2
  done
  return 1
}

log "[7/7] Health check $HEALTH_URL..."
if wait_healthy; then
  rm -rf "$PREV_NEXT"
  log "Deploy complete: $(git log -1 --format='%h %s' 2>/dev/null || echo "build $NEW_ID")"
  exit 0
fi

echo "App did not respond on $HEALTH_URL after restart. Recent logs:" >&2
bash -c "$LOGS_CMD" >&2 || true
if [[ -d "$PREV_NEXT" ]]; then
  log "Rolling back to the previous build (failed build kept at $FAILED_NEXT)"
  mv "$LIVE_NEXT" "$FAILED_NEXT"
  mv "$PREV_NEXT" "$LIVE_NEXT"
  bash -c "$RESTART_CMD"
  if wait_healthy; then
    log "Rollback healthy: the previous build is serving again"
  else
    log "Rollback did not become healthy either; check the service by hand" >&2
  fi
fi
exit 1
