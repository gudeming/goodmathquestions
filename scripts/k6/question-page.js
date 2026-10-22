// Hero question page under load: the HTML (ISR) plus the tRPC calls the client makes
// when the page opens (question.getById, guess.histogram, event.track question_view).
//
//   k6 run -e BASE_URL=https://staging.example.com scripts/k6/question-page.js
//   k6 run -e BASE_URL=http://127.0.0.1:3000 -e SMOKE=1 scripts/k6/question-page.js
//
// See docs/plans/good-questions-overhaul/perf/README.md for every env var.
import { check, sleep } from "k6";
import http from "k6/http";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
import { BASE_URL, k6AnonId, loadOptions, resolveHero, summaryFiles, trpcData, trpcMutation, trpcQuery } from "./lib/trpc.js";

export const options = loadOptions({
  "http_req_duration{kind:page}": ["p(95)<1000"],
  "http_req_duration{kind:trpc}": ["p(95)<300"],
  "http_req_duration{proc:question.getById}": ["p(95)<300"],
  "http_req_duration{proc:guess.histogram}": ["p(95)<300"],
  http_req_failed: ["rate<0.01"],
  checks: ["rate>0.99"],
});

export function setup() {
  return resolveHero();
}

// One anonymous id per VU, as one browser keeps one id in localStorage.
const anonId = k6AnonId();

export default function (hero) {
  const locale = Math.random() < 0.5 ? "" : "/zh";
  const page = http.get(`${BASE_URL}${locale}/questions/${hero.slug}`, {
    tags: { kind: "page", name: "page:question" },
  });
  check(page, {
    "page 200": (r) => r.status === 200,
    "page is html": (r) => String(r.headers["Content-Type"] || "").includes("text/html"),
  });

  const q = trpcQuery("question.getById", { id: hero.id }, anonId);
  check(q, { "getById 200": (r) => r.status === 200 && trpcData(r) && trpcData(r).id === hero.id });

  const hist = trpcQuery("guess.histogram", { questionId: hero.id }, anonId);
  check(hist, { "histogram 200": (r) => r.status === 200 });

  const ev = trpcMutation("event.track", { name: "question_view", questionId: hero.id, props: { kind: "k6" } }, anonId);
  check(ev, { "track 200": (r) => r.status === 200 });

  // A child reads the hook before doing anything else.
  sleep(2 + Math.random() * 3);
}

export function handleSummary(data) {
  return summaryFiles(data, textSummary);
}
