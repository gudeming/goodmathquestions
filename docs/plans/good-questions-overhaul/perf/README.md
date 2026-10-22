# Load tests (README Phase 7 item 5)

Two k6 scripts in `scripts/k6/`:

| Script | What one virtual user does | Thresholds (the run fails if any is missed) |
|---|---|---|
| `question-page.js` | GET the hero question page HTML (ISR, `revalidate = 60`), then the tRPC calls the page makes on open: `question.getById`, `guess.histogram`, `event.track` (`question_view`). Pause 2–5 s. | page HTML P95 < 1 s; every tRPC call P95 < 300 ms; `getById` and `histogram` P95 < 300 ms each; HTTP errors < 1 %; checks > 99 % |
| `guess-submit.js` | `guess.histogram` → think 1–3 s → `guess.submit` → `guess.histogram`. Pause 2–5 s. | tRPC P95 < 300 ms overall and for `guess.submit` / `guess.histogram`; HTTP errors < 1 %; checks > 99 % (includes "no 429") |

Default load: ramp 0 → **2000 VUs** over 3 min, hold 5 min, ramp down 1 min. 2000 concurrent visitors is 2× the assumed peak (README Phase 7). `setup()` resolves the hero slug once through `question.bySlug` and aborts if it is missing.

Each VU sends its own `x-gmq-anon` UUID v4, like one browser. The API allows 30 guesses per identity per hour (`GMQ_RL_GUESS_PER_HOUR`), so `guess-submit.js` gives a VU a new id after 25 guesses (`GUESSES_PER_ID`): every request comes from a different visitor and none should get a 429. All k6 ids start with `6b36`, so the rows can be found and deleted afterwards.

## Status

**Not run yet.** k6 was not installed on the machine that wrote these scripts, so no smoke run or report exists yet. They were checked for syntax only, and the tRPC request shapes were tested with curl against a local `next start`. The first person to run them should save the summary here (see below).

## Install k6

```bash
brew install k6                       # macOS
sudo apt-get install k6               # Debian/Ubuntu after adding the k6 apt repo (k6.io/docs/get-started/installation)
docker run --rm -i grafana/k6 run -   # or run through Docker (pass -e vars, mount the scripts dir)
```

## Environment variables

| Var | Default | Meaning |
|---|---|---|
| `BASE_URL` | `http://127.0.0.1:3000` | Site root, no trailing slash. **Never point this at production.** |
| `SLUG` | `gauss-sum` | Hero question to load. `guess-submit.js` needs one with an Act 1 guess. |
| `PEAK_VUS` | `2000` | Peak concurrent virtual users |
| `RAMP` / `HOLD` | `3m` / `5m` | Ramp-up time and time held at the peak |
| `SMOKE=1` | off | 50 VUs for 30 s instead of the full ramp (`SMOKE_VUS`, `SMOKE_DURATION`) |
| `GUESSES_PER_ID` | `25` | `guess-submit.js`: guesses before a VU switches to a new anon id (keep it below the server's guess limit) |
| `SUMMARY_JSON` | unset | Also write the end-of-test summary as JSON to this path |

## Running

Smoke test against a local production build (the run takes 30 s):

```bash
npm run build -w @gmq/web && npm run start -w @gmq/web -- -p 3500 &
k6 run -e BASE_URL=http://127.0.0.1:3500 -e SMOKE=1 \
  -e SUMMARY_JSON=docs/plans/good-questions-overhaul/perf/smoke-question-page-$(date +%F).json \
  scripts/k6/question-page.js
k6 run -e BASE_URL=http://127.0.0.1:3500 -e SMOKE=1 \
  -e SUMMARY_JSON=docs/plans/good-questions-overhaul/perf/smoke-guess-submit-$(date +%F).json \
  scripts/k6/guess-submit.js
```

Full run against staging (roughly 10 min per script):

```bash
export BASE_URL=https://staging.goodmathquestions.example   # your staging host
k6 run -e SUMMARY_JSON=docs/plans/good-questions-overhaul/perf/$(date +%F)-question-page.json scripts/k6/question-page.js
k6 run -e SUMMARY_JSON=docs/plans/good-questions-overhaul/perf/$(date +%F)-guess-submit.json scripts/k6/guess-submit.js
# or both in a row: BASE_URL=... npm run k6
```

Rules for a run that means something:

- Staging must match production: same instance size, the same Postgres/Redis setup, `NODE_ENV=production`, a real `next build` (not `next dev`), and hero questions seeded.
- Run k6 from **a different machine** from the app server, in the same region. 2000 VUs need about 1–2 GB of RAM and plenty of open files on the load generator (`ulimit -n 65535`).
- Run each script on its own, not at the same time, so a regression can be traced to one path.
- Commit the summary JSON here together with a short note (date, commit, instance size, P95 for each `proc`, pass/fail).

## What to look at

1. **k6's threshold lines** (✓/✗). Then `http_req_duration` per `proc` tag (`trpc:question.getById`, `trpc:guess.submit`, …) and `page:question`. Look at P95 and P99 and the shape over time, not only the average.
2. **Errors**: `http_req_failed` and the failed checks. A `429` means the rate limit got in the way (lower `GUESSES_PER_ID` or raise `GMQ_RL_GUESS_PER_HOUR` on staging). A `5xx` means look at the server log.
3. **Page cache**: during the hold, `curl -sI $BASE_URL/questions/gauss-sum | grep -i x-nextjs-cache` should say `HIT` (or `STALE` right after the 60 s window). `MISS` on every request means ISR is not working and every view renders on the server.
4. **App server**: CPU and memory of the Node process; event-loop lag; whether the process restarts (OOM) under load.
5. **Postgres**: active connections against Prisma's pool (default `connection_limit` = CPUs × 2 + 1; set `?connection_limit=` in `DATABASE_URL`), slow queries (`pg_stat_statements`), lock waits on `Guess` during `guess-submit.js`.
6. **Redis**: hit rate on `q:pub:v1:*` / `q:count:v1:*` (question payload cache) and `guess:hist:*` (histogram), ops/s, memory. Once warm, `question.getById` should cost one indexed Postgres lookup per call.

If a threshold fails, profile the slowest `proc` first: find its Postgres queries, check the cache keys get hits, then look at the instance size. Don't raise a threshold to make a run pass.

## Cleanup on staging

Rows written by k6 have anon ids starting with `6b36` (`guess-submit.js` writes `Guess` rows; both scripts write `Event` rows). Real visitors' ids can also start with `6b36` (about 1 in 65,000), so run this **only on staging**:

```sql
DELETE FROM "Guess" WHERE "anonId" LIKE '6b36%';
DELETE FROM "Event" WHERE "anonId" LIKE '6b36%';
```

Then flush the histogram cache for that question (`redis-cli --scan --pattern 'guess:hist:*' | xargs redis-cli del`) or wait 60 s.
