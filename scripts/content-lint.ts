/**
 * Content lint for hero questions (01-question-rubric.md §3.4, README Phase 7 item 3).
 *
 * Runs in CI before the tests. No database: it checks the blueprints that the seed
 * would write, because every hero blueprint is seeded as `isPublished: true` and
 * `kind != DRILL` (seed.ts → heroQuestionData).
 *
 *   1. `buildHeroQuestions()` — the seed's own validator (schemas, scene ↔ answer,
 *      rubric score ≥ 14, slug/sortOrder uniqueness, world membership).
 *   2. §3.4 checks, re-stated here so the gate does not silently weaken if the
 *      seed validator changes: kebab-case unique slug, bilingual pairs non-empty,
 *      hero age band, 3 non-default hints, ≥ 2 wrong-answer rules, aha ≤ 240,
 *      funFact ≤ 300, hook / extension / discussionPrompt non-empty.
 *   3. Machine rubric flags (`scoreQuestionHeuristically`, §3.1) on the Act 1 hook.
 *      Flags that are anti-patterns for a hero question block; NUMBERS_FIRST and
 *      ONE_STEP are heuristics that misfire on hooks (a number can be the hook;
 *      hooks have few numbers by design) and are printed as warnings only.
 *      A blocking flag that is a known false positive is waived per slug in
 *      `RUBRIC_WAIVERS` with a reason; a waiver that no longer fires is an error,
 *      so the list cannot rot.
 *
 * Usage: npm run content-lint     Exit 0 = clean (one summary line), 1 = violations.
 */
import {
  DEFAULT_HINT_TEXTS,
  scoreQuestionHeuristically,
  type RubricFlag,
} from "@gmq/math-engine";
import {
  ALL_HERO_BLUEPRINTS,
  HERO_AGE_GROUPS,
  HERO_LIMITS,
  HERO_WORLDS,
  HeroBlueprintValidationError,
  buildHeroQuestions,
  type Bi,
  type HeroQuestionBlueprint,
} from "../packages/db/prisma/hero-questions";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Rubric flags that disqualify a hero question outright (rubric §2 anti-patterns). */
const BLOCKING_FLAGS: ReadonlySet<RubricFlag> = new Set<RubricFlag>([
  "DEFAULT_HINTS",
  "INFERRED_SCENE",
  "EMPTY_NUMBER_LINE",
  "COMPUTE_PREFIX",
  "AGE_OUT_OF_RANGE",
  "LONG_FUN_FACT",
  "DEFAULT_FUN_FACT",
  "NO_WRONG_FEEDBACK",
]);
/** Raised flags that are printed but do not fail the lint. HERO_CANDIDATE is informational. */
const WARNING_FLAGS: ReadonlySet<RubricFlag> = new Set<RubricFlag>(["NUMBERS_FIRST", "ONE_STEP"]);

/**
 * Reviewed false positives of the §3.1 heuristics. Every entry needs a reason a reviewer
 * can check against the blueprint; add one only after a human looked at the copy.
 */
const RUBRIC_WAIVERS: Readonly<Record<string, Partial<Record<RubricFlag, string>>>> = {
  // Empty since Phase 3 batch 4: scramble-and-nine's hook no longer opens "Write down…" and
  // kaprekar-6174's fun fact dropped the initials that read as sentence breaks.
};

const normalise = (s: string): string => s.trim().toLowerCase();
const DEFAULT_HINT_SET: ReadonlySet<string> = new Set(
  DEFAULT_HINT_TEXTS.flatMap((h) => [normalise(h.en), normalise(h.zh)])
);

type Problems = Map<string, string[]>;

function add(problems: Problems, slug: string, message: string): void {
  problems.set(slug, [...(problems.get(slug) ?? []), message]);
}

function isFilledBi(value: Bi | undefined): value is Bi {
  return (
    value !== undefined &&
    typeof value.en === "string" &&
    typeof value.zh === "string" &&
    value.en.trim() !== "" &&
    value.zh.trim() !== ""
  );
}

/** §3.4, independent of validate.ts. */
function lintBlueprint(bp: HeroQuestionBlueprint, problems: Problems): void {
  const key = bp.slug || "(blank slug)";
  const fail = (msg: string) => add(problems, key, msg);

  if (!SLUG_PATTERN.test(bp.slug)) fail(`slug "${bp.slug}" is not kebab-case`);
  if (!(HERO_AGE_GROUPS as readonly string[]).includes(bp.ageGroup)) fail(`ageGroup ${bp.ageGroup} is outside 8-14`);

  const required: Array<[string, Bi | undefined]> = [
    ["title", bp.title],
    ["hook", bp.hook],
    ["prompt", bp.prompt],
    ["explanation", bp.explanation],
    ["aha", bp.aha],
    ["extension", bp.extension],
    ["discussionPrompt", bp.discussionPrompt],
  ];
  for (const [label, value] of required) {
    if (!isFilledBi(value)) fail(`${label}: en and zh must both be non-empty`);
  }
  if (bp.funFact !== undefined && !isFilledBi(bp.funFact)) fail("funFact: en and zh must both be non-empty");

  for (const lang of ["en", "zh"] as const) {
    const aha = bp.aha?.[lang] ?? "";
    if (aha.length > HERO_LIMITS.ahaMaxChars) fail(`aha.${lang}: ${aha.length} chars > ${HERO_LIMITS.ahaMaxChars}`);
    const funFact = bp.funFact?.[lang] ?? "";
    if (funFact.length > HERO_LIMITS.funFactMaxChars) {
      fail(`funFact.${lang}: ${funFact.length} chars > ${HERO_LIMITS.funFactMaxChars}`);
    }
  }

  const hints = Array.isArray(bp.hints) ? bp.hints : [];
  if (hints.length !== HERO_LIMITS.hintCount) fail(`hints: ${hints.length}, need exactly ${HERO_LIMITS.hintCount}`);
  hints.forEach((h, i) => {
    if (!isFilledBi(h)) fail(`hints[${i}]: en and zh must both be non-empty`);
    else if (DEFAULT_HINT_SET.has(normalise(h.en)) || DEFAULT_HINT_SET.has(normalise(h.zh))) {
      fail(`hints[${i}]: is a default hint`);
    }
  });

  const wrong = Array.isArray(bp.wrongAnswers) ? bp.wrongAnswers.length : 0;
  if (wrong < HERO_LIMITS.minWrongAnswers) fail(`wrongAnswers: ${wrong}, need at least ${HERO_LIMITS.minWrongAnswers}`);
  bp.wrongAnswers?.forEach((rule, i) => {
    if (!isFilledBi(rule.feedback)) fail(`wrongAnswers[${i}].feedback: en and zh must both be non-empty`);
  });
}

/** Machine rubric flags on the hook (Act 1 is what a child reads first). */
function rubricFlags(bp: HeroQuestionBlueprint): RubricFlag[] {
  const scene = bp.scene as unknown as Record<string, unknown>;
  return scoreQuestionHeuristically({
    titleEn: bp.title.en,
    contentEn: bp.hook.en,
    ageGroup: bp.ageGroup,
    hints: bp.hints,
    animationConfig: scene,
    sceneSource: "explicit", // hero scenes are always authored in the blueprint
    answerExplainEn: bp.explanation.en,
    funFactEn: bp.funFact?.en ?? null,
    wrongAnswerFeedback: bp.wrongAnswers,
  }).flags;
}

function countBy<T>(items: readonly T[], keyOf: (item: T) => string, order: readonly string[]): string {
  const counts = new Map<string, number>(order.map((k) => [k, 0]));
  for (const item of items) counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
  return [...counts].map(([k, n]) => `${k} ${n}`).join(", ");
}

function main(): number {
  const problems: Problems = new Map();
  const warnings: Problems = new Map();

  let blueprints: readonly HeroQuestionBlueprint[] = ALL_HERO_BLUEPRINTS;
  try {
    blueprints = buildHeroQuestions();
  } catch (err) {
    if (!(err instanceof HeroBlueprintValidationError)) throw err;
    for (const [slug, msgs] of err.problems) for (const m of msgs) add(problems, slug, m);
  }

  const slugCount = new Map<string, number>();
  let waived = 0;
  for (const bp of blueprints) {
    slugCount.set(bp.slug, (slugCount.get(bp.slug) ?? 0) + 1);
    lintBlueprint(bp, problems);
    const flags = rubricFlags(bp);
    const waivers = RUBRIC_WAIVERS[bp.slug] ?? {};
    for (const flag of flags) {
      if (BLOCKING_FLAGS.has(flag)) {
        if (waivers[flag]) waived++;
        else add(problems, bp.slug, `rubric flag ${flag}`);
      } else if (WARNING_FLAGS.has(flag)) {
        add(warnings, bp.slug, `rubric flag ${flag} (heuristic, not blocking)`);
      }
    }
    for (const flag of Object.keys(waivers) as RubricFlag[]) {
      if (!flags.includes(flag)) add(problems, bp.slug, `stale waiver: ${flag} no longer fires; remove it from RUBRIC_WAIVERS`);
    }
  }
  for (const [slug, n] of slugCount) if (n > 1) add(problems, slug, `slug used by ${n} blueprints`);
  const knownSlugs = new Set(blueprints.map((b) => b.slug));
  for (const slug of Object.keys(RUBRIC_WAIVERS)) {
    if (!knownSlugs.has(slug)) add(problems, slug, "stale waiver: no hero blueprint has this slug");
  }

  for (const [slug, msgs] of warnings) {
    for (const m of msgs) console.warn(`warning  ${slug}: ${m}`);
  }

  if (problems.size > 0) {
    const total = [...problems.values()].reduce((n, msgs) => n + new Set(msgs).size, 0);
    console.error(`content-lint: ${total} violation(s) in ${problems.size} hero question(s)\n`);
    for (const [slug, msgs] of problems) {
      console.error(`  ${slug}`);
      for (const m of new Set(msgs)) console.error(`    - ${m}`);
    }
    return 1;
  }

  const worlds = HERO_WORLDS.map((w) => w.slug);
  console.log(
    `content-lint: ${blueprints.length} hero questions OK | by world: ${countBy(blueprints, (b) => b.collection, worlds)}` +
      ` | by age: ${countBy(blueprints, (b) => b.ageGroup, HERO_AGE_GROUPS)}` +
      (waived > 0 ? ` | ${waived} reviewed rubric waiver(s)` : "")
  );
  return 0;
}

process.exit(main());
