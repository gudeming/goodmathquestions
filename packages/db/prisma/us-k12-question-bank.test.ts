import { describe, expect, it } from "vitest";
import { DEFAULT_HINT_TEXTS, scoreQuestionHeuristically, type RubricFlag } from "@gmq/math-engine";
import { buildUSK12QuestionBank, DEFAULT_HINTS, getUSK12Blueprints } from "./us-k12-question-bank";

// Pure checks on the seed bank: no Prisma client is created here.
const START_SORT_ORDER = 56;
const bank = buildUSK12QuestionBank(START_SORT_ORDER);
const blueprints = getUSK12Blueprints();

function findByTitle(titleEn: string): number {
  const index = bank.findIndex((q) => q.titleEn === titleEn);
  if (index < 0) throw new Error(`Question not found in bank: ${titleEn}`);
  return index;
}

function flagsFor(titleEn: string): RubricFlag[] {
  const index = findByTitle(titleEn);
  const sceneSource = blueprints[index].animationConfig ? "explicit" : "inferred";
  return scoreQuestionHeuristically({ ...bank[index], sceneSource }).flags;
}

describe("buildUSK12QuestionBank", () => {
  it("produces 511 questions with consecutive sort orders after the start offset", () => {
    expect(bank).toHaveLength(511);
    expect(bank[0].sortOrder).toBe(START_SORT_ORDER + 1);
    expect(bank[510].sortOrder).toBe(START_SORT_ORDER + 511);
  });

  it("emits only fields seed.ts writes to Prisma (no audit-only keys leak in)", () => {
    const allowed = new Set([
      "titleEn", "titleZh", "contentEn", "contentZh", "difficulty", "category", "ageGroup",
      "answer", "answerExplainEn", "answerExplainZh", "hints", "animationConfig",
      "funFactEn", "funFactZh", "isPublished", "sortOrder", "tags",
    ]);
    const keys = new Set(bank.flatMap((q) => Object.keys(q)));
    expect([...keys].filter((k) => !allowed.has(k))).toEqual([]);
  });

  it("keeps the rubric's default-hint constant in sync with the bank", () => {
    expect(DEFAULT_HINT_TEXTS).toEqual(DEFAULT_HINTS);
  });
});

describe("getUSK12Blueprints", () => {
  it("is index-aligned with the built bank", () => {
    expect(blueprints).toHaveLength(bank.length);
    blueprints.forEach((bp, i) => expect(bp.titleEn).toBe(bank[i].titleEn));
  });

  it("returns explicit scene configs unchanged in the built bank", () => {
    blueprints.forEach((bp, i) => {
      if (bp.animationConfig) expect(bank[i].animationConfig).toBe(bp.animationConfig);
    });
  });

  it("never guesses a scene: questions without an authored config get {}", () => {
    const withoutConfig = blueprints.flatMap((bp, i) => (bp.animationConfig ? [] : [bank[i]]));
    expect(withoutConfig.length).toBeGreaterThan(400);
    for (const q of withoutConfig) expect(q.animationConfig).toEqual({});
    // GEOMETRY used to be keyword-inferred (e.g. "angle" -> a 60/60/60 triangle).
    expect(bank.filter((q) => JSON.stringify(q.animationConfig) === '{"type":"triangle_angles","angles":[60,60,60]}')).toEqual([]);
    expect(bank.some((q) => q.animationConfig.type === "number_journey" && JSON.stringify(q.animationConfig) === '{"type":"number_journey","range":[0,20],"highlights":[]}')).toBe(false);
  });
});

// Same five questions as packages/math-engine/src/rubric.test.ts, scored from the real bank.
describe("rubric flags on real bank entries", () => {
  it.each<[string, RubricFlag[]]>([
    ["Multiply in Parts", ["DEFAULT_HINTS", "COMPUTE_PREFIX", "NUMBERS_FIRST", "DEFAULT_FUN_FACT", "NO_WRONG_FEEDBACK"]],
    // INFERRED_SCENE now means "no authored scene" (config is {}); the blank number line is gone.
    ["Cheetah vs. Human Sprint", ["DEFAULT_HINTS", "INFERRED_SCENE", "NUMBERS_FIRST", "ONE_STEP", "NO_WRONG_FEEDBACK"]],
    ["Math Mind-Reading Trick", ["DEFAULT_HINTS", "INFERRED_SCENE", "NO_WRONG_FEEDBACK", "HERO_CANDIDATE"]],
    ["Paper Folding Challenge", ["DEFAULT_HINTS", "INFERRED_SCENE", "NUMBERS_FIRST", "NO_WRONG_FEEDBACK", "HERO_CANDIDATE"]],
    ["Derivative Power Rule", ["DEFAULT_HINTS", "COMPUTE_PREFIX", "NUMBERS_FIRST", "AGE_OUT_OF_RANGE", "DEFAULT_FUN_FACT", "NO_WRONG_FEEDBACK"]],
  ])("%s", (title, expected) => {
    expect(flagsFor(title)).toEqual(expected);
  });
});
