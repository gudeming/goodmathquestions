// Shared helpers for the k6 scripts (k6 runtime, not Node). tRPC 11 + superjson over
// plain HTTP: queries are GET ?input={"json":...}, mutations POST {"json":...}.
// Calls are not batched so every procedure gets its own latency series (tag `proc`).
import http from "k6/http";

export const BASE_URL = (__ENV.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
export const SLUG = __ENV.SLUG || "gauss-sum";
/** Anonymous ids made by k6 start with this, so staging rows can be found and deleted. */
export const K6_ANON_PREFIX = "6b36";

const hex = (n) => {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
};

/** A strict UUID v4 (what the API's parseAnonId accepts) with the k6 prefix. */
export function k6AnonId() {
  const variant = "89ab"[Math.floor(Math.random() * 4)];
  return `${K6_ANON_PREFIX}${hex(4)}-${hex(4)}-4${hex(3)}-${variant}${hex(3)}-${hex(12)}`;
}

function headersFor(anonId) {
  const h = { "content-type": "application/json" };
  if (anonId) h["x-gmq-anon"] = anonId;
  return h;
}

/** Unwraps {"result":{"data":{"json":...}}}; null when the body is not a tRPC success. */
export function trpcData(res) {
  try {
    const body = res.json();
    return body && body.result && body.result.data ? body.result.data.json : null;
  } catch (_) {
    return null;
  }
}

export function trpcQuery(proc, input, anonId) {
  const q = encodeURIComponent(JSON.stringify({ json: input }));
  return http.get(`${BASE_URL}/api/trpc/${proc}?input=${q}`, {
    headers: headersFor(anonId),
    tags: { kind: "trpc", proc, name: `trpc:${proc}` },
  });
}

export function trpcMutation(proc, input, anonId) {
  return http.post(`${BASE_URL}/api/trpc/${proc}`, JSON.stringify({ json: input }), {
    headers: headersFor(anonId),
    tags: { kind: "trpc", proc, name: `trpc:${proc}` },
  });
}

/** Resolves the hero slug once per run; aborts the test when the question is missing. */
export function resolveHero() {
  const res = trpcQuery("question.bySlug", { slug: SLUG }, null);
  const q = trpcData(res);
  if (res.status !== 200 || !q || !q.id) {
    throw new Error(`setup: question.bySlug("${SLUG}") failed: HTTP ${res.status} ${String(res.body).slice(0, 200)}`);
  }
  return { id: q.id, slug: q.slug || SLUG, guessConfig: q.guessConfig || null };
}

/** A plausible Act 1 guess for the question's guess control. */
export function randomGuess(guessConfig) {
  if (guessConfig && guessConfig.type === "choice" && Array.isArray(guessConfig.options) && guessConfig.options.length) {
    return guessConfig.options[Math.floor(Math.random() * guessConfig.options.length)].id;
  }
  if (guessConfig && guessConfig.type === "slider") {
    const steps = Math.max(1, Math.round((guessConfig.max - guessConfig.min) / (guessConfig.step || 1)));
    return String(guessConfig.min + Math.floor(Math.random() * (steps + 1)) * (guessConfig.step || 1));
  }
  if (guessConfig && guessConfig.type === "compare") return Math.random() < 0.5 ? "left" : "right";
  return "1";
}

/**
 * Load profile shared by both scripts. Default: README Phase 7 item 5, 2x the expected
 * peak = 2000 concurrent visitors. SMOKE=1: 50 VUs for 30 s.
 */
export function loadOptions(thresholds) {
  const smoke = __ENV.SMOKE === "1";
  const peak = Number(__ENV.PEAK_VUS || 2000);
  const stages = smoke
    ? [{ duration: __ENV.SMOKE_DURATION || "30s", target: Number(__ENV.SMOKE_VUS || 50) }]
    : [
        { duration: __ENV.RAMP || "3m", target: peak },
        { duration: __ENV.HOLD || "5m", target: peak },
        { duration: "1m", target: 0 },
      ];
  return {
    scenarios: {
      visitors: {
        executor: smoke ? "constant-vus" : "ramping-vus",
        ...(smoke ? { vus: stages[0].target, duration: stages[0].duration } : { startVUs: 0, stages }),
        gracefulStop: "30s",
      },
    },
    thresholds,
    summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
  };
}

/** Writes the end-of-test summary JSON when SUMMARY_JSON is set (perf/README.md). */
export function summaryFiles(data, textSummary) {
  const out = { stdout: textSummary(data, { indent: " ", enableColors: true }) };
  if (__ENV.SUMMARY_JSON) out[__ENV.SUMMARY_JSON] = JSON.stringify(data, null, 2);
  return out;
}
