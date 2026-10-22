// Act 1 guesses under load: guess.submit (write + histogram invalidation) between two
// guess.histogram reads, which is what HookStage does.
//
//   k6 run -e BASE_URL=https://staging.example.com scripts/k6/guess-submit.js
//
// Each VU sends its own x-gmq-anon UUID v4. The API allows 30 guesses per identity per
// hour (GMQ_RL_GUESS_PER_HOUR), so a VU moves to a fresh id before it reaches that:
// at any moment every VU is a different visitor and no request should see a 429.
import { check, sleep } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
import { k6AnonId, loadOptions, randomGuess, resolveHero, summaryFiles, trpcData, trpcMutation, trpcQuery } from "./lib/trpc.js";

const GUESSES_PER_ID = Number(__ENV.GUESSES_PER_ID || 25);

export const options = loadOptions({
  "http_req_duration{kind:trpc}": ["p(95)<300"],
  "http_req_duration{proc:guess.submit}": ["p(95)<300"],
  "http_req_duration{proc:guess.histogram}": ["p(95)<300"],
  http_req_failed: ["rate<0.01"],
  checks: ["rate>0.99"],
});

export function setup() {
  const hero = resolveHero();
  if (!hero.guessConfig) throw new Error(`setup: "${hero.slug}" has no guess; pick a hero slug with an Act 1 guess`);
  return hero;
}

let anonId = k6AnonId();
let guessesWithId = 0;

export default function (hero) {
  if (guessesWithId >= GUESSES_PER_ID) {
    anonId = k6AnonId();
    guessesWithId = 0;
  }

  const before = trpcQuery("guess.histogram", { questionId: hero.id }, anonId);
  check(before, { "histogram 200": (r) => r.status === 200 });

  sleep(1 + Math.random() * 2); // thinking about the guess

  const value = randomGuess(hero.guessConfig);
  const res = trpcMutation("guess.submit", { questionId: hero.id, value }, anonId);
  guessesWithId++;
  check(res, {
    "submit 200": (r) => r.status === 200,
    "submit ok": (r) => {
      const d = trpcData(r);
      return Boolean(d && d.ok === true);
    },
    "not rate limited": (r) => r.status !== 429,
  });

  const after = trpcQuery("guess.histogram", { questionId: hero.id }, anonId);
  check(after, { "histogram after 200": (r) => r.status === 200 });

  sleep(2 + Math.random() * 3);
}

export function handleSummary(data) {
  return summaryFiles(data, textSummary);
}
