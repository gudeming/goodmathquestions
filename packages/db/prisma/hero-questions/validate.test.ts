import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  binarySearchSteps,
  collatzSteps,
  frogMinMoves,
  lcm,
  parseSceneConfig,
  queensSolutions,
  staircaseWays,
  stepsToShrinkBelow,
} from "@gmq/animation-engine";
import { AnswerSpecSchema, evaluateExpression, sameMultiset, validateAnswerV2, wrongAnswerFeedbackFor } from "@gmq/math-engine";
import { DEFAULT_HINTS } from "../us-k12-question-bank";
import {
  ALL_HERO_BLUEPRINTS,
  HERO_WORLDS,
  HeroBlueprintValidationError,
  buildHeroQuestions,
  canonicalCorrectInput,
  collectHeroBlueprintErrors,
  validateAllHeroBlueprints,
  validateHeroBlueprint,
  type HeroQuestionBlueprint,
} from "./index";
import { gaussSum, handshakeParty } from "./world-huge-numbers";
import { scrambleAndNine, mindReadingFive } from "./world-number-magic";
import { squaresOnChessboard } from "./world-shapes-that-lie";
import { montyHall } from "./world-chance-and-luck";

/** Deep copy with overrides; the originals are frozen-by-convention module constants. */
function broken(bp: HeroQuestionBlueprint, patch: (copy: HeroQuestionBlueprint) => void): HeroQuestionBlueprint {
  const copy = structuredClone(bp) as HeroQuestionBlueprint;
  patch(copy);
  return copy;
}

function expectProblem(bp: HeroQuestionBlueprint, pattern: RegExp): void {
  const errors = validateHeroBlueprint(bp);
  expect(errors.some((e) => pattern.test(e)), `expected ${pattern} in:\n${errors.join("\n")}`).toBe(true);
}

const BATCH_1_SLUGS = [
  "gauss-sum",
  "handshake-party",
  "squares-on-chessboard",
  "monty-hall",
  "trick-1089",
  "mind-reading-five",
  "scramble-and-nine",
  "kaprekar-6174",
] as const;

const BATCH_2_SLUGS = [
  "chessboard-rice",
  "fold-to-the-moon",
  "pizza-cuts",
  "fence-shaper",
  "birthday-paradox",
  "two-dice-sum",
  "odd-even-game",
  "rolls-until-six",
  "someone-shares-my-birthday",
  "tower-of-hanoi",
  "growing-plus",
  "four-weights",
  "river-crossing",
  "nine-balls-balance",
  "three-switches",
  "knights-and-knaves",
] as const;

const BATCH_3_SLUGS = [
  "million-seconds",
  "billion-heartbeats",
  "googol-vs-atoms",
  "halfway-to-the-wall",
  "rope-around-earth",
  "pythagoras-squares",
  "seven-bridges",
  "clock-hands-meet",
  "coin-streak",
  "socks-in-the-dark",
  "pi-from-raindrops",
  "collatz-hailstone",
  "times-eleven",
  "fibonacci-next",
  "perfect-28",
] as const;

/** Phase 3 batch 4: the rest of the catalog (13 Tier-2 scenes + 11 illustrations). */
const BATCH_4_SLUGS = [
  "point-nine-repeating",
  "hilbert-hotel",
  "missing-square",
  "why-hexagons",
  "mutilated-chessboard",
  "mobius-cut",
  "spot-the-real-random",
  "prime-spiral",
  "missing-dollar",
  "staircase-ways",
  "pascal-row-sum",
  "tetris-shapes",
  "star-strokes",
  "calendar-square",
  "cicada-primes",
  "frog-swap",
  "bridge-and-torch",
  "four-fours",
  "water-jugs",
  "four-queens",
  "nine-dots-four-lines",
  "blindfold-coins",
  "fly-between-trains",
  "guess-my-number",
] as const;

const bySlug = (slug: string): HeroQuestionBlueprint => {
  const bp = ALL_HERO_BLUEPRINTS.find((b) => b.slug === slug);
  if (!bp) throw new Error(`no blueprint ${slug}`);
  return bp;
};

describe("hero blueprints (batch 1)", () => {
  it("has the eight batch-1 questions", () => {
    expect(ALL_HERO_BLUEPRINTS.map((bp) => bp.slug)).toEqual(expect.arrayContaining([...BATCH_1_SLUGS]));
  });

  it.each(ALL_HERO_BLUEPRINTS.map((bp) => [bp.slug, bp] as const))("%s validates", (_slug, bp) => {
    expect(validateHeroBlueprint(bp)).toEqual([]);
  });

  it("validates as a set and buildHeroQuestions returns them all", () => {
    expect(() => validateAllHeroBlueprints()).not.toThrow();
    expect(buildHeroQuestions()).toHaveLength(ALL_HERO_BLUEPRINTS.length);
  });

  it.each(ALL_HERO_BLUEPRINTS.map((bp) => [bp.slug, bp] as const))("%s: scene parses as a v2 scene", (_slug, bp) => {
    const parsed = parseSceneConfig(bp.scene);
    expect(parsed.ok, parsed.ok ? "" : parsed.error).toBe(true);
  });

  it.each(ALL_HERO_BLUEPRINTS.map((bp) => [bp.slug, bp] as const))(
    "%s: answer round-trips through validateAnswerV2 and wrong answers get feedback",
    (_slug, bp) => {
      const spec = AnswerSpecSchema.parse(bp.answer);
      // JSON round-trip, as the seed stores it in Question.answerRule.
      const stored = AnswerSpecSchema.parse(JSON.parse(JSON.stringify(spec)));
      // EXPRESSION answers take their canonical input from the scene's first listed solution.
      const correct = canonicalCorrectInput(stored, bp.scene);
      expect(correct).not.toBeNull();
      expect(validateAnswerV2(correct!, stored).isCorrect).toBe(true);
      expect(wrongAnswerFeedbackFor(correct!, stored, bp.wrongAnswers)).toBeNull();
    }
  );

  it("keeps the rubric's example (gauss-sum) unchanged", () => {
    expect(gaussSum.rubricNotes.startsWith("19/20")).toBe(true);
    expect(gaussSum.answer).toEqual({ type: "NUMERIC", value: 5050 });
    expect(gaussSum.wrongAnswers.map((w) => w.match)).toEqual(["10100", "5000", "lt:1000"]);
  });

  it("names the likely mistake for the classic wrong answers", () => {
    const fb = (bp: HeroQuestionBlueprint, input: string) =>
      wrongAnswerFeedbackFor(input, AnswerSpecSchema.parse(bp.answer), bp.wrongAnswers)?.feedback.en ?? null;
    expect(fb(handshakeParty, "90")).toMatch(/counted that handshake twice/);
    expect(fb(squaresOnChessboard, "64")).toMatch(/little squares/);
    expect(fb(montyHall, "same")).toMatch(/50-50/);
    expect(fb(scrambleAndNine, "3")).toMatch(/bigger number/);
    expect(fb(mindReadingFive, "10")).toMatch(/cut in half/);
  });

  it("D2 upgrades the legacy mind-reading row", () => {
    expect(mindReadingFive.upgradesLegacyTitleEn).toBe("Math Mind-Reading Trick");
    expect(mindReadingFive.ageGroup).toBe("AGE_8_10");
  });

  it("every world blueprint is listed under its own collection", () => {
    for (const world of HERO_WORLDS) for (const bp of world.blueprints) expect(bp.collection).toBe(world.slug);
    expect(HERO_WORLDS.map((w) => w.slug)).toEqual([
      "huge-numbers",
      "shapes-that-lie",
      "chance-and-luck",
      "number-magic",
      "patterns-everywhere",
      "impossible-puzzles",
    ]);
  });
});

describe("validateHeroBlueprint rejects broken blueprints", () => {
  it("default hints", () => {
    expectProblem(
      broken(gaussSum, (b) => {
        b.hints[0] = { ...DEFAULT_HINTS[0] };
      }),
      /hints\[0\]\.(en|zh): is a DEFAULT_HINTS text/
    );
    // Only one language copied from the defaults is still caught.
    expectProblem(
      broken(gaussSum, (b) => {
        b.hints[2].zh = DEFAULT_HINTS[1].zh;
      }),
      /hints\[2\]\.zh: is a DEFAULT_HINTS text/
    );
  });

  it("two hints", () => {
    expectProblem(
      broken(gaussSum, (b) => {
        (b as { hints: unknown[] }).hints = b.hints.slice(0, 2);
      }),
      /hints: need exactly 3, got 2/
    );
  });

  it("short hints", () => {
    expectProblem(
      broken(gaussSum, (b) => {
        b.hints[1].en = "Pair them.";
      }),
      /hints\[1\]\.en: 10 chars < 15/
    );
  });

  it("an age group outside 8-14", () => {
    expectProblem(
      broken(gaussSum, (b) => {
        (b as { ageGroup: string }).ageGroup = "AGE_14_16";
      }),
      /ageGroup: "AGE_14_16"/
    );
  });

  it("a missing or one-language discussion prompt", () => {
    expectProblem(
      broken(gaussSum, (b) => {
        (b as Partial<HeroQuestionBlueprint>).discussionPrompt = undefined;
      }),
      /discussionPrompt: missing/
    );
    expectProblem(
      broken(gaussSum, (b) => {
        b.discussionPrompt.zh = " ";
      }),
      /discussionPrompt: needs non-empty en and zh/
    );
  });

  it("a scene that disagrees with the answer", () => {
    expectProblem(
      broken(handshakeParty, (b) => {
        b.scene = { type: "handshake_graph", people: 9 };
      }),
      /scene\/answer: handshake_graph asserts 36, answer is 45/
    );
    expectProblem(
      broken(squaresOnChessboard, (b) => {
        b.answer = { type: "NUMERIC", value: 64 };
        b.wrongAnswers = b.wrongAnswers.filter((w) => w.match !== "64");
      }),
      /grid_squares asserts 204, answer is 64/
    );
    expectProblem(
      broken(scrambleAndNine, (b) => {
        b.answer = { type: "CHOICE", correctId: "3" };
        b.wrongAnswers = b.wrongAnswers.filter((w) => w.match !== "choice:3");
      }),
      /number_trick_stepper asserts 9, answer is 3/
    );
    expectProblem(
      broken(montyHall, (b) => {
        b.answer = { type: "CHOICE", correctId: "same" };
        b.wrongAnswers = b.wrongAnswers.filter((w) => w.match !== "choice:same");
      }),
      /monty_hall needs a CHOICE answer with correctId "switch"/
    );
  });

  it("an invalid scene", () => {
    expectProblem(
      broken(gaussSum, (b) => {
        b.scene = { type: "gauss_pairing", n: 100, visibleHead: 6, visibleTail: 6, pairSum: 100, pairCount: 50 };
      }),
      /scene: .*pairSum/
    );
    expectProblem(
      broken(gaussSum, (b) => {
        b.scene = { type: "number_journey", range: [0, 20], highlights: [] };
      }),
      /legacy type "number_journey"/
    );
  });

  it("a wrong-answer rule that matches the correct answer", () => {
    expectProblem(
      broken(gaussSum, (b) => {
        b.wrongAnswers.push({ match: "5050", feedback: { en: "Nope, that's wrong.", zh: "不对哦。" } });
      }),
      /wrongAnswers\[3\] \(5050\): is itself a correct answer/
    );
    expectProblem(
      broken(gaussSum, (b) => {
        b.wrongAnswers[2].match = "lt:6000";
      }),
      /lt:6000 includes the correct value 5050/
    );
    expectProblem(
      broken(gaussSum, (b) => {
        b.wrongAnswers[0].match = "regex:^50";
      }),
      /matches the correct input "5050"/
    );
    expectProblem(
      broken(montyHall, (b) => {
        b.wrongAnswers[0].match = "choice:switch";
      }),
      /names the correct option/
    );
  });

  it("malformed or misplaced wrong-answer rules", () => {
    expectProblem(
      broken(gaussSum, (b) => {
        b.wrongAnswers[0].match = "offByFactor:1";
      }),
      /malformed rule/
    );
    expectProblem(
      broken(gaussSum, (b) => {
        b.wrongAnswers[0].match = "choice:A";
      }),
      /choice: rules only apply to CHOICE answers/
    );
    expectProblem(
      broken(montyHall, (b) => {
        b.wrongAnswers[0].match = "choice:door-4";
      }),
      /unknown option id "door-4"/
    );
  });

  it("fewer than two wrong-answer rules", () => {
    expectProblem(
      broken(gaussSum, (b) => {
        b.wrongAnswers = b.wrongAnswers.slice(0, 1);
      }),
      /wrongAnswers: 1 < 2/
    );
  });

  it("a rubric score below 14, or item scores that don't add up", () => {
    expectProblem(
      broken(gaussSum, (b) => {
        b.rubricNotes = "12/20 — hook 2, guess 2, hands-on 0, aha 2, floor 2, ceiling 1, paths 1, wrong 0, hints 0, retell 2";
      }),
      /12\/20 is below the publishing bar of 14/
    );
    expectProblem(
      broken(gaussSum, (b) => {
        b.rubricNotes = "great question";
      }),
      /must start with "NN\/20"/
    );
    expectProblem(
      broken(gaussSum, (b) => {
        b.rubricNotes = "20/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 2, wrong 2, hints 2, retell 1";
      }),
      /item scores add up to 19, not 20/
    );
  });

  it("THREE_ACT without a guess", () => {
    expectProblem(
      broken(gaussSum, (b) => {
        delete b.guess;
      }),
      /guess: required for kind THREE_ACT/
    );
  });

  it("an aha that is too long, and translationese in Chinese", () => {
    expectProblem(
      broken(gaussSum, (b) => {
        b.aha.en = "x".repeat(241);
      }),
      /aha\.en: 241 chars > 240/
    );
    expectProblem(
      broken(gaussSum, (b) => {
        b.explanation.zh = "让我们从两头配对。" + b.explanation.zh;
      }),
      /explanation\.zh: contains 「让我们」/
    );
    expectProblem(
      broken(gaussSum, (b) => {
        b.prompt.zh = "1 + 2 + … + 100 等于多少?";
      }),
      /prompt\.zh: half-width punctuation/
    );
  });

  it("a non-kebab slug", () => {
    expectProblem(
      broken(gaussSum, (b) => {
        b.slug = "Gauss_Sum";
      }),
      /slug: "Gauss_Sum" is not kebab-case/
    );
  });
});

describe("cross-blueprint checks", () => {
  it("rejects a duplicate slug", () => {
    const dupe = broken(handshakeParty, (b) => {
      b.slug = "gauss-sum";
    });
    const problems = collectHeroBlueprintErrors([gaussSum, dupe]);
    expect(problems.get("gauss-sum")).toContain('slug: "gauss-sum" is used by 2 blueprints');
  });

  it("rejects two blueprints in the same world slot", () => {
    const clash = broken(handshakeParty, (b) => {
      b.sortOrder = 1;
    });
    expect(collectHeroBlueprintErrors([gaussSum, clash]).get("handshake-party")?.join()).toMatch(/sortOrder: 1 already used/);
  });

  it("throws one aggregated, readable error", () => {
    const bad = broken(gaussSum, (b) => {
      b.ageGroup = "AGE_16_18" as never;
      b.hints = [b.hints[0], b.hints[0], b.hints[0]];
    });
    let thrown: unknown;
    try {
      validateAllHeroBlueprints([bad, handshakeParty], []);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(HeroBlueprintValidationError);
    const message = (thrown as Error).message;
    expect(message).toMatch(/Hero question validation failed \(1 blueprint/);
    expect(message).toMatch(/gauss-sum:\n {4}- ageGroup/);
    expect(message).toMatch(/hints: duplicate hint text/);
  });
});

describe("hero blueprints (batch 2)", () => {
  it("adds the sixteen batch-2 questions", () => {
    expect(ALL_HERO_BLUEPRINTS.map((bp) => bp.slug)).toEqual(expect.arrayContaining([...BATCH_2_SLUGS]));
  });

  it("puts each question in its catalog world and slot (sortOrder = catalog number)", () => {
    const slot = (slug: string) => `${bySlug(slug).collection}/${bySlug(slug).sortOrder}`;
    expect(BATCH_2_SLUGS.map(slot)).toEqual([
      "huge-numbers/2",
      "huge-numbers/3",
      "shapes-that-lie/2",
      "shapes-that-lie/4",
      "chance-and-luck/1",
      "chance-and-luck/3",
      "chance-and-luck/6",
      "chance-and-luck/8",
      "chance-and-luck/9",
      "patterns-everywhere/1",
      "patterns-everywhere/3",
      "patterns-everywhere/10",
      "impossible-puzzles/1",
      "impossible-puzzles/2",
      "impossible-puzzles/3",
      "impossible-puzzles/8",
    ]);
  });

  it("every world has questions now", () => {
    for (const world of HERO_WORLDS) expect(world.blueprints.length, world.slug).toBeGreaterThan(0);
  });

  it("only A3 upgrades a legacy row in this batch", () => {
    const upgrades = BATCH_2_SLUGS.map(bySlug).filter((bp) => bp.upgradesLegacyTitleEn !== undefined);
    expect(upgrades.map((bp) => [bp.slug, bp.upgradesLegacyTitleEn])).toEqual([["fold-to-the-moon", "Paper Folding Challenge"]]);
  });

  it("uses illustration scenes only where no interactive scene exists yet", () => {
    const illustrated = BATCH_2_SLUGS.filter((slug) => bySlug(slug).scene.type === "illustration");
    expect(illustrated).toEqual(["three-switches", "knights-and-knaves"]);
    for (const slug of illustrated) expect(bySlug(slug).rubricNotes).toMatch(/待替换为 \w+/);
  });

  it("names the likely mistake for the classic wrong answers", () => {
    const fb = (slug: string, input: string) => {
      const bp = bySlug(slug);
      return wrongAnswerFeedbackFor(input, AnswerSpecSchema.parse(bp.answer), bp.wrongAnswers)?.feedback.en ?? null;
    };
    expect(fb("chessboard-rice", "42")).toMatch(/21 × 2/);
    expect(fb("chessboard-rice", "2097152")).toMatch(/21 doublings/);
    expect(fb("fold-to-the-moon", "coin")).toMatch(/added 0\.1 mm ten times/);
    expect(fb("pizza-cuts", "8")).toMatch(/through the centre/);
    expect(fb("pizza-cuts", "10")).toMatch(/pizza you started with/);
    expect(fb("fence-shaper", "24")).toMatch(/how long the fence is/);
    expect(fb("birthday-paradox", "183")).toMatch(/half of 365/);
    expect(fb("birthday-paradox", "30")).toMatch(/^Too many/);
    expect(fb("two-dice-sum", "same")).toMatch(/feels like every total/);
    expect(fb("odd-even-game", "same")).toMatch(/one even die/);
    expect(fb("rolls-until-six", "3.5")).toMatch(/DOTS/);
    expect(fb("someone-shares-my-birthday", "23")).toMatch(/ANY two people/);
    expect(fb("tower-of-hanoi", "14")).toMatch(/biggest disc/);
    expect(fb("growing-plus", "40")).toMatch(/dot in the middle/);
    expect(fb("four-weights", "1")).toMatch(/two pans/);
    expect(fb("river-crossing", "5")).toMatch(/rows back alone/);
    expect(fb("nine-balls-balance", "3")).toMatch(/THREE groups/);
    expect(fb("three-switches", "impossible")).toMatch(/eyes alone/);
    expect(fb("knights-and-knaves", "both-knaves")).toMatch(/can't be trusted/);
  });

  it("accepts estimates inside the window and the facts the copy relies on", () => {
    const ok = (slug: string, input: string) => validateAnswerV2(input, AnswerSpecSchema.parse(bySlug(slug).answer)).isCorrect;
    expect(["22", "23", "24"].every((v) => ok("birthday-paradox", v))).toBe(true);
    expect(ok("birthday-paradox", "21")).toBe(false);
    expect(ok("someone-shares-my-birthday", "253")).toBe(true);
    expect(ok("someone-shares-my-birthday", "183")).toBe(false);
    expect(ok("rolls-until-six", "6")).toBe(true);
    expect(ok("rolls-until-six", "3.5")).toBe(false);
    expect(ok("chessboard-rice", String(2 ** 20))).toBe(true);
    expect(ok("four-weights", "40")).toBe(true);
  });
});

describe("hero blueprints (batch 3)", () => {
  const spec = (slug: string) => AnswerSpecSchema.parse(bySlug(slug).answer);
  const ok = (slug: string, input: string) => validateAnswerV2(input, spec(slug)).isCorrect;
  const fb = (slug: string, input: string) => wrongAnswerFeedbackFor(input, spec(slug), bySlug(slug).wrongAnswers)?.feedback.en ?? null;

  it("adds the fifteen batch-3 questions: 39 after batch 3", () => {
    const slugs = ALL_HERO_BLUEPRINTS.map((bp) => bp.slug);
    expect(slugs).toEqual(expect.arrayContaining([...BATCH_3_SLUGS]));
    expect(BATCH_1_SLUGS.length + BATCH_2_SLUGS.length + BATCH_3_SLUGS.length).toBe(39);
  });

  it("puts each question in its catalog world and slot (sortOrder = catalog number)", () => {
    const slot = (slug: string) => `${bySlug(slug).collection}/${bySlug(slug).sortOrder}`;
    expect(BATCH_3_SLUGS.map(slot)).toEqual([
      "huge-numbers/4",
      "huge-numbers/5",
      "huge-numbers/9",
      "huge-numbers/10",
      "shapes-that-lie/3",
      "shapes-that-lie/6",
      "shapes-that-lie/7",
      "shapes-that-lie/8",
      "chance-and-luck/4",
      "chance-and-luck/5",
      "chance-and-luck/7",
      "number-magic/5",
      "number-magic/6",
      "number-magic/8",
      "number-magic/9",
    ]);
  });

  it("uses the catalog ages, and every scene is an interactive Tier-2 scene", () => {
    const ages = Object.fromEntries(BATCH_3_SLUGS.map((s) => [s, bySlug(s).ageGroup]));
    for (const s of ["million-seconds", "socks-in-the-dark", "times-eleven", "fibonacci-next"]) expect(ages[s], s).toBe("AGE_8_10");
    for (const s of ["googol-vs-atoms", "halfway-to-the-wall", "rope-around-earth", "pythagoras-squares", "pi-from-raindrops"]) expect(ages[s], s).toBe("AGE_12_14");
    for (const s of ["billion-heartbeats", "seven-bridges", "clock-hands-meet", "coin-streak", "collatz-hailstone", "perfect-28"]) expect(ages[s], s).toBe("AGE_10_12");
    for (const s of BATCH_3_SLUGS) expect(bySlug(s).scene.type, s).not.toBe("illustration");
  });

  it("AGE_8_10 counts per world (batch 4: E7 and F12 added one each)", () => {
    const young = Object.fromEntries(
      HERO_WORLDS.map((w) => [w.slug, w.blueprints.filter((bp) => bp.ageGroup === "AGE_8_10").length])
    );
    expect(young).toEqual({
      "huge-numbers": 2,
      "shapes-that-lie": 2,
      "chance-and-luck": 3,
      "number-magic": 3,
      "patterns-everywhere": 3,
      "impossible-puzzles": 2,
    });
  });

  it("only D8 upgrades a legacy row in this batch", () => {
    const upgrades = BATCH_3_SLUGS.map(bySlug).filter((bp) => bp.upgradesLegacyTitleEn !== undefined);
    expect(upgrades.map((bp) => [bp.slug, bp.upgradesLegacyTitleEn])).toEqual([["fibonacci-next", "Sunflower Fibonacci Spiral"]]);
  });

  it("guess-is-the-question CHOICE items reuse the guess options", () => {
    for (const [slug, correct] of [["googol-vs-atoms", "absurd"], ["seven-bridges", "impossible"], ["coin-streak", "same"]] as const) {
      const bp = bySlug(slug);
      expect(bp.choices, slug).toBeUndefined();
      expect(bp.guess?.type, slug).toBe("choice");
      expect(bp.answer, slug).toEqual({ type: "CHOICE", correctId: correct });
    }
  });

  it("accepts the answers the scenes propose (onProposeAnswer)", () => {
    expect(ok("million-seconds", "11.6")).toBe(true);
    expect(ok("billion-heartbeats", "27")).toBe(true);
    expect(ok("rope-around-earth", "16")).toBe(true);
    expect(ok("clock-hands-meet", "22")).toBe(true);
    expect(ok("socks-in-the-dark", "4")).toBe(true);
    expect(ok("collatz-hailstone", "9")).toBe(true);
    expect(ok("perfect-28", "28")).toBe(true);
    // pi_darts proposes its own estimate with two decimals after 1,000 dots.
    for (const v of ["3.05", "3.14", "3.20", "3.27"]) expect(ok("pi-from-raindrops", v), v).toBe(true);
    expect(ok("halfway-to-the-wall", "1")).toBe(true);
    expect(ok("times-eleven", "792")).toBe(true);
    expect(ok("fibonacci-next", "55")).toBe(true);
    expect(ok("pythagoras-squares", "10")).toBe(true);
  });

  it("keeps the estimate windows tight", () => {
    expect(ok("million-seconds", "10.5")).toBe(false);
    expect(ok("billion-heartbeats", "31.7")).toBe(false); // 60 beats a minute instead of 70
    expect(ok("rope-around-earth", "32")).toBe(false); // 1 / π: the diameter
    expect(ok("pi-from-raindrops", "0.785")).toBe(false);
  });

  it("names the likely mistake for the classic wrong answers", () => {
    expect(fb("million-seconds", "16667")).toMatch(/minutes/);
    expect(fb("million-seconds", "278")).toMatch(/hours/);
    expect(fb("billion-heartbeats", "2.7")).toMatch(/hundred million/);
    expect(fb("billion-heartbeats", "272")).toMatch(/nine zeros/);
    expect(fb("googol-vs-atoms", "bit")).toMatch(/multiplies by 10/);
    expect(fb("googol-vs-atoms", "atoms")).toMatch(/More zeros/);
    expect(fb("halfway-to-the-wall", "0.999")).toMatch(/no gap at all/);
    expect(fb("halfway-to-the-wall", "infinity")).toMatch(/Infinitely many/);
    expect(fb("halfway-to-the-wall", "2")).toMatch(/half of what's left/);
    expect(fb("rope-around-earth", "0.16")).toMatch(/metres/);
    expect(fb("rope-around-earth", "100")).toMatch(/extra rope itself/);
    expect(fb("rope-around-earth", "0")).toMatch(/doesn't depend/);
    expect(fb("pythagoras-squares", "14")).toMatch(/squashed flat/);
    expect(fb("pythagoras-squares", "100")).toMatch(/AREA/);
    expect(fb("seven-bridges", "possible")).toMatch(/odd number/);
    expect(fb("seven-bridges", "start")).toMatch(/wherever you start/);
    expect(fb("clock-hands-meet", "24")).toMatch(/once every hour/);
    expect(fb("clock-hands-meet", "21")).toMatch(/midnight/);
    expect(fb("clock-hands-meet", "23")).toMatch(/both midnights/);
    expect(fb("coin-streak", "tails")).toMatch(/no memory/);
    expect(fb("coin-streak", "heads")).toMatch(/no luck/);
    expect(fb("socks-in-the-dark", "2")).toMatch(/be sure/);
    expect(fb("socks-in-the-dark", "3")).toMatch(/one of each colour/);
    expect(fb("pi-from-raindrops", "785")).toMatch(/number of dots inside/);
    expect(fb("pi-from-raindrops", "0.78")).toMatch(/multiply it by 4/);
    expect(fb("collatz-hailstone", "7")).toMatch(/16 steps/);
    expect(fb("collatz-hailstone", "19")).toMatch(/STEPS/);
    expect(fb("times-eleven", "772")).toMatch(/SUM/);
    expect(fb("times-eleven", "782")).toMatch(/7 \+ 2 is 9/);
    expect(fb("fibonacci-next", "47")).toMatch(/21 and 34/);
    expect(fb("fibonacci-next", "68")).toMatch(/doubled/);
    expect(fb("perfect-28", "24")).toMatch(/abundant/);
    expect(fb("perfect-28", "27")).toMatch(/1 \+ 3 \+ 9 = 13/);
    expect(fb("perfect-28", "29")).toMatch(/prime/);
  });

  it("states the facts the copy relies on", () => {
    // A10: the halving scene reaches an atom (1e-10 m) only at step 34, and maxSteps lets you get there.
    expect(stepsToShrinkBelow(1e-10)).toBe(34);
    const wall = bySlug("halfway-to-the-wall");
    expect(wall.explanation.en).toMatch(/34 steps/);
    expect(wall.aha.en).toMatch(/34 halvings/);
    expect(wall.scene).toMatchObject({ type: "halving_bar", maxSteps: 40 });
    // D5: 9 takes 19 steps, 7 takes 16, 27 takes 111; 18 and 19 beat 9 below 20 (extension).
    expect([collatzSteps(9), collatzSteps(7), collatzSteps(27), collatzSteps(18), collatzSteps(19)]).toEqual([19, 16, 111, 20, 20]);
    // D6 extension: 85 × 11 carries.
    expect(85 * 11).toBe(935);
    // C7: no seed, so every child's rain (and estimate) is different.
    expect(bySlug("pi-from-raindrops").scene).not.toHaveProperty("seed");
  });
});

describe("scene/answer cross-checks for the Tier-2 scenes", () => {
  /** Rules that can't collide with a changed answer, so only the scene/answer problem is reported. */
  const neutralRules = (b: HeroQuestionBlueprint) => {
    b.wrongAnswers = [
      { match: "regex:^never$", feedback: { en: "Placeholder feedback one.", zh: "占位反馈一。" } },
      { match: "regex:^nope$", feedback: { en: "Placeholder feedback two.", zh: "占位反馈二。" } },
    ];
  };

  it("pythagoras_squares must agree with the hypotenuse", () => {
    const bp = bySlug("pythagoras-squares");
    expectProblem(
      broken(bp, (b) => {
        neutralRules(b);
        b.answer = { type: "NUMERIC", value: 14 };
      }),
      /pythagoras_squares asserts 10, answer is 14/
    );
  });

  it("clock_overlap, sock_drawer and collatz_path must agree with the answer", () => {
    const clock = bySlug("clock-hands-meet");
    expectProblem(
      broken(clock, (b) => {
        neutralRules(b);
        b.answer = { type: "NUMERIC", value: 24 };
      }),
      /clock_overlap asserts 22, answer is 24/
    );
    const socks = bySlug("socks-in-the-dark");
    expectProblem(
      broken(socks, (b) => {
        b.scene = { type: "sock_drawer", colors: 5 };
      }),
      /sock_drawer asserts 6, answer is 4/
    );
    const collatz = bySlug("collatz-hailstone");
    expectProblem(
      broken(collatz, (b) => {
        b.scene = { type: "collatz_path", maxStart: 200, highlightRange: [1, 7] };
      }),
      /collatz_path asserts 7, answer is 9/
    );
  });

  it("an ESTIMATE window must contain what scale_ladder shows", () => {
    const bp = bySlug("million-seconds");
    expectProblem(
      broken(bp, (b) => {
        b.answer = { type: "ESTIMATE", min: 12, max: 14, truth: 13 };
        b.wrongAnswers = b.wrongAnswers.filter((w) => !["lt:11", "gt:12"].includes(w.match));
      }),
      /scale_ladder asserts 11\.57\d*, outside the accepted range \[12, 14\]/
    );
  });

  it("bridges_trace must agree with Euler's rule", () => {
    const bp = bySlug("seven-bridges");
    expectProblem(
      broken(bp, (b) => {
        b.answer = { type: "CHOICE", correctId: "possible" };
        b.wrongAnswers = b.wrongAnswers.filter((w) => w.match !== "choice:possible");
        b.wrongAnswers.push({ match: "choice:impossible", feedback: { en: "Placeholder feedback.", zh: "占位反馈。" } });
      }),
      /bridges_trace has no Euler walk, so correctId must be "impossible"/
    );
  });
});

describe("editorial pass 1 (docs/plans/good-questions-overhaul/editorial-pass-1.md)", () => {
  const COMPUTE_WORDS = /^(compute|calculate|solve|simplify|find|what is|evaluate|write|round|fill in)\b/i;

  it("no hook or prompt opens with a COMPUTE_PREFIX word (batch 4 retired the scramble-and-nine waiver)", () => {
    for (const bp of ALL_HERO_BLUEPRINTS) {
      expect(COMPUTE_WORDS.test(bp.prompt.en.trim()), `${bp.slug} prompt`).toBe(false);
      expect(COMPUTE_WORDS.test(bp.hook.en.trim()), `${bp.slug} hook`).toBe(false);
    }
  });

  it("states the corrected facts", () => {
    // 10^20 universes / ~7.5 × 10^18 grains of sand ≈ 13 per grain, not 100.
    expect(bySlug("googol-vs-atoms").aha.en).toMatch(/more than ten universes for every grain of sand/);
    expect(bySlug("googol-vs-atoms").aha.zh).toMatch(/十几个宇宙/);
    // 52 known perfect numbers (as of October 2024), not "about fifty".
    expect(bySlug("perfect-28").aha.en).toMatch(/Only 52 are known/);
    // The board's rice: "more than 500 years" holds for any realistic grain weight.
    expect(bySlug("chessboard-rice").aha.en).toMatch(/500 years/);
    expect(2 ** 64 - 1).toBeGreaterThan(1.8e19);
    // 253 = 23 × 11.
    expect(bySlug("someone-shares-my-birthday").explanation.en).toMatch(/11 times/);
  });

  it("gives times-eleven an Act-1 guess and keeps pi's guess off the truth-marked slider", () => {
    expect(bySlug("times-eleven").guess?.type).toBe("choice");
    expect(bySlug("pi-from-raindrops").guess?.type).toBe("choice");
  });

  it("illustration scenes say something new in Act 3", () => {
    for (const slug of ALL_HERO_BLUEPRINTS.filter((bp) => bp.scene.type === "illustration").map((bp) => bp.slug)) {
      expect(bySlug(slug).scene, slug).toHaveProperty("revealCaption");
    }
  });

  it("D3's reveal no longer shows the 3-digit 1089 table for a 4-digit scramble", () => {
    expect(bySlug("scramble-and-nine").scene).toMatchObject({ type: "number_trick_stepper", revealExtra: "none" });
  });

  it("the rope slider reaches the extension (a 1.8 m grown-up needs 2π × 1.8 ≈ 11.3 m)", () => {
    const scene = bySlug("rope-around-earth").scene as { extraMetersMax: number };
    expect(scene.extraMetersMax).toBeGreaterThanOrEqual(2 * Math.PI * 1.8);
  });

  it("every hero question scores at least 17/20 after the pass", () => {
    for (const bp of ALL_HERO_BLUEPRINTS) expect(Number(bp.rubricNotes.slice(0, 2)), bp.slug).toBeGreaterThanOrEqual(17);
  });
});

describe("hero blueprints (batch 4: the rest of the catalog)", () => {
  const spec = (slug: string) => AnswerSpecSchema.parse(bySlug(slug).answer);
  const ok = (slug: string, input: string) => validateAnswerV2(input, spec(slug)).isCorrect;
  const fb = (slug: string, input: string) => wrongAnswerFeedbackFor(input, spec(slug), bySlug(slug).wrongAnswers)?.feedback.en ?? null;
  const SCENES_DIR = resolve(__dirname, "../../../../apps/web/public/scenes");

  it("adds the twenty-four batch-4 questions: 63 in all, every slug unique", () => {
    const slugs = ALL_HERO_BLUEPRINTS.map((bp) => bp.slug);
    expect(slugs).toEqual(expect.arrayContaining([...BATCH_4_SLUGS]));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toHaveLength(BATCH_1_SLUGS.length + BATCH_2_SLUGS.length + BATCH_3_SLUGS.length + BATCH_4_SLUGS.length);
    expect(slugs).toHaveLength(63);
  });

  it("puts each question in its catalog world and slot (sortOrder = catalog number)", () => {
    const slot = (slug: string) => `${bySlug(slug).collection}/${bySlug(slug).sortOrder}`;
    expect(BATCH_4_SLUGS.map(slot)).toEqual([
      "huge-numbers/6",
      "huge-numbers/7",
      "shapes-that-lie/5",
      "shapes-that-lie/9",
      "shapes-that-lie/10",
      "shapes-that-lie/11",
      "chance-and-luck/10",
      "number-magic/7",
      "number-magic/10",
      "patterns-everywhere/2",
      "patterns-everywhere/4",
      "patterns-everywhere/5",
      "patterns-everywhere/6",
      "patterns-everywhere/7",
      "patterns-everywhere/8",
      "patterns-everywhere/9",
      "impossible-puzzles/4",
      "impossible-puzzles/5",
      "impossible-puzzles/6",
      "impossible-puzzles/7",
      "impossible-puzzles/9",
      "impossible-puzzles/10",
      "impossible-puzzles/11",
      "impossible-puzzles/12",
    ]);
    // Every world now holds its full catalog: slots 1..N with no gaps.
    for (const world of HERO_WORLDS) {
      const orders = world.blueprints.map((bp) => bp.sortOrder).sort((a, b) => a - b);
      expect(orders, world.slug).toEqual(orders.map((_, i) => i + 1));
    }
  });

  it("uses the catalog ages and keeps the age spread (>= 2 AGE_8_10 per world, >= 15 per band)", () => {
    const ages = Object.fromEntries(BATCH_4_SLUGS.map((s) => [s, bySlug(s).ageGroup]));
    for (const s of ["calendar-square", "guess-my-number"]) expect(ages[s], s).toBe("AGE_8_10");
    for (const s of ["point-nine-repeating", "hilbert-hotel", "missing-square", "prime-spiral", "bridge-and-torch", "blindfold-coins", "fly-between-trains"]) {
      expect(ages[s], s).toBe("AGE_12_14");
    }
    const tens = BATCH_4_SLUGS.filter((s) => ages[s] === "AGE_10_12");
    expect(tens).toHaveLength(15);
    for (const world of HERO_WORLDS) {
      expect(world.blueprints.filter((bp) => bp.ageGroup === "AGE_8_10").length, world.slug).toBeGreaterThanOrEqual(2);
    }
    for (const band of ["AGE_8_10", "AGE_10_12", "AGE_12_14"] as const) {
      expect(ALL_HERO_BLUEPRINTS.filter((bp) => bp.ageGroup === band).length, band).toBeGreaterThanOrEqual(15);
    }
  });

  it("keeps illustration questions within the budget (<= 15), each with a real SVG, a reveal and a planned scene", () => {
    const illustrated = ALL_HERO_BLUEPRINTS.filter((bp) => bp.scene.type === "illustration");
    expect(illustrated.length).toBeLessThanOrEqual(15);
    expect(illustrated.map((bp) => bp.slug).sort()).toEqual(
      [
        "three-switches",
        "knights-and-knaves",
        "point-nine-repeating",
        "hilbert-hotel",
        "missing-square",
        "mobius-cut",
        "spot-the-real-random",
        "prime-spiral",
        "missing-dollar",
        "tetris-shapes",
        "star-strokes",
        "bridge-and-torch",
        "nine-dots-four-lines",
      ].sort()
    );
    for (const bp of illustrated) {
      const scene = bp.scene as { asset: string; revealAsset?: string };
      expect(bp.rubricNotes, bp.slug).toMatch(/待替换为 \w+/);
      for (const asset of [scene.asset, scene.revealAsset].filter((a): a is string => a !== undefined)) {
        const file = resolve(SCENES_DIR, `${asset}.svg`);
        expect(existsSync(file), file).toBe(true);
        expect(statSync(file).size, file).toBeLessThan(20_000);
      }
      if (BATCH_4_SLUGS.includes(bp.slug as (typeof BATCH_4_SLUGS)[number])) {
        expect(scene.revealAsset, bp.slug).toBe(`${scene.asset}-reveal`);
      }
    }
  });

  it("only E8 upgrades a legacy row in this batch (Bee Hexagon Efficiency stays a drill: different maths)", () => {
    const upgrades = BATCH_4_SLUGS.map(bySlug).filter((bp) => bp.upgradesLegacyTitleEn !== undefined);
    expect(upgrades.map((bp) => [bp.slug, bp.upgradesLegacyTitleEn])).toEqual([["cicada-primes", "Cicada Underground Mystery"]]);
  });

  it("guess-is-the-question CHOICE items reuse the guess options", () => {
    for (const [slug, correct] of [
      ["point-nine-repeating", "exactly-one"],
      ["hilbert-hotel", "move-up-one"],
      ["missing-square", "bent-hypotenuse"],
      ["mutilated-chessboard", "impossible"],
      ["mobius-cut", "one-longer-loop"],
      ["spot-the-real-random", "C"],
      ["prime-spiral", "diagonal-streaks"],
      ["missing-dollar", "nothing-missing"],
      ["nine-dots-four-lines", "outside-the-box"],
      ["blindfold-coins", "take-ten-flip"],
    ] as const) {
      const bp = bySlug(slug);
      expect(bp.choices, slug).toBeUndefined();
      expect(bp.guess?.type, slug).toBe("choice");
      expect(bp.answer, slug).toEqual({ type: "CHOICE", correctId: correct });
    }
  });

  it("answers agree with what the Tier-2 scenes compute", () => {
    expect(staircaseWays(10, 2)).toBe(89);
    expect(lcm(13, 6)).toBe(78);
    expect(frogMinMoves(3)).toBe(15);
    expect(queensSolutions(4)).toHaveLength(2);
    expect(queensSolutions(8)).toHaveLength(92);
    expect(binarySearchSteps(100)).toBe(7);
    expect(spec("staircase-ways")).toMatchObject({ type: "NUMERIC", value: 89 });
    expect(spec("pascal-row-sum")).toMatchObject({ type: "NUMERIC", value: 1024 });
    expect(spec("calendar-square")).toMatchObject({ type: "NUMERIC", value: 9 * 17 });
    expect(spec("cicada-primes")).toMatchObject({ type: "NUMERIC", value: 78 });
    expect(spec("frog-swap")).toMatchObject({ type: "NUMERIC", value: 15 });
    expect(spec("water-jugs")).toMatchObject({ type: "NUMERIC", value: 6 });
    expect(spec("four-queens")).toMatchObject({ type: "NUMERIC", value: 2 });
    expect(spec("fly-between-trains")).toMatchObject({ type: "NUMERIC", value: 75 });
    expect(spec("guess-my-number")).toMatchObject({ type: "NUMERIC", value: 7 });
    expect(bySlug("mutilated-chessboard").scene).toMatchObject({ type: "domino_tiling", size: 8, removed: [[0, 0], [7, 7]] });
  });

  it("B9 takes the numbers of sides (number pad, same in both languages) and explains typed names", () => {
    expect(spec("why-hexagons")).toEqual({ type: "MULTI_VALUE", values: ["3", "4", "6"] });
    for (const v of ["3, 4, 6", "6, 3, 4", "3 and 4 and 6", "3、4、6"]) expect(ok("why-hexagons", v), v).toBe(true);
    expect(ok("why-hexagons", "3, 4, 5, 6")).toBe(false);
    expect(fb("why-hexagons", "triangle, square, hexagon")).toMatch(/number of sides/);
    expect(fb("why-hexagons", "三角形、正方形、六边形")).toMatch(/number of sides/);
    expect(fb("why-hexagons", "3, 4, 5, 6")).toMatch(/324°/);
    expect(fb("why-hexagons", "4, 6")).toMatch(/left out the triangle/);
  });

  it("F5's listed solutions make 7 with exactly four 4s, and the checker accepts other ways too", () => {
    const scene = bySlug("four-fours").scene as { type: string; solutions: string[]; allowedOps: string[] };
    const answer = spec("four-fours");
    if (answer.type !== "EXPRESSION") throw new Error("four-fours must be an EXPRESSION answer");
    expect(answer).toMatchObject({ target: 7, allowedNumbers: [4, 4, 4, 4] });
    expect(scene.solutions.length).toBeGreaterThanOrEqual(2);
    for (const s of scene.solutions) {
      const r = evaluateExpression(s, { allowedOps: answer.allowedOps });
      expect(r.ok && Math.abs(r.value - 7) < 1e-9, s).toBe(true);
      expect(r.ok && sameMultiset(r.numbersUsed, [4, 4, 4, 4]), s).toBe(true);
      expect(ok("four-fours", s), s).toBe(true);
    }
    expect(ok("four-fours", "4 + 4 − 4 ÷ 4")).toBe(true);
    expect(fb("four-fours", "4+4-4/4+4-4")).toMatch(/more than four/);
    expect(fb("four-fours", "8-1")).toMatch(/Only the digit 4/);
    expect(fb("four-fours", "4+4+4-4")).toMatch(/bigger than 7/);
  });

  it("C10 bakes the same four flip records into both languages, and only C has a long run", () => {
    const bp = bySlug("spot-the-real-random");
    const rows = [...bp.prompt.en.matchAll(/([ABCD]): ((?:[HT] ?){20})/g)].map((m) => [m[1], m[2].replace(/ /g, "")] as const);
    expect(rows.map(([id]) => id)).toEqual(["A", "B", "C", "D"]);
    const zh = [...bp.prompt.zh.matchAll(/([ABCD])：([正反]{20})/g)].map((m) => m[2].replace(/正/g, "H").replace(/反/g, "T"));
    expect(zh).toEqual(rows.map(([, seq]) => seq));
    const longestRun = (seq: string) => Math.max(...(seq.match(/H+|T+/g) ?? []).map((r) => r.length));
    expect(Object.fromEntries(rows.map(([id, seq]) => [id, longestRun(seq)]))).toEqual({ A: 2, B: 2, C: 5, D: 2 });
  });

  it("names the likely mistake for the classic wrong answers", () => {
    expect(fb("point-nine-repeating", "a-tiny-bit-less")).toMatch(/gap/);
    expect(fb("hilbert-hotel", "impossible")).toMatch(/last room/);
    expect(fb("missing-square", "shrunk")).toMatch(/count the pieces/);
    expect(fb("mutilated-chessboard", "possible")).toMatch(/very close/);
    expect(fb("mobius-cut", "two-loops")).toMatch(/no twist/);
    expect(fb("spot-the-real-random", "A")).toMatch(/15 times out of 19/);
    expect(fb("missing-dollar", "bellboy")).toMatch(/already inside the 27/);
    expect(fb("staircase-ways", "55")).toMatch(/9 stairs/);
    expect(fb("staircase-ways", "1024")).toMatch(/two choices/);
    expect(fb("pascal-row-sum", "512")).toMatch(/row 9/);
    expect(fb("tetris-shapes", "5")).toMatch(/L and J/);
    expect(fb("star-strokes", "1")).toMatch(/six dots/);
    expect(fb("calendar-square", "136")).toMatch(/8 × 17/);
    expect(fb("cicada-primes", "19")).toMatch(/13 \+ 6/);
    expect(fb("frog-swap", "9")).toMatch(/jumps/);
    expect(fb("bridge-and-torch", "19")).toMatch(/fastest friend/);
    expect(fb("water-jugs", "8")).toMatch(/3-litre jug/);
    expect(fb("four-queens", "1")).toMatch(/mirror/);
    expect(fb("nine-dots-four-lines", "inside-the-box")).toMatch(/one dot always gets left out/);
    expect(fb("blindfold-coins", "take-ten")).toMatch(/10 − k/);
    expect(fb("fly-between-trains", "100")).toMatch(/gap between the trains/);
    expect(fb("fly-between-trains", "150")).toMatch(/2 hours/);
    expect(fb("guess-my-number", "6")).toMatch(/63 numbers/);
  });
});

describe("scene/answer cross-checks for the batch-3b Tier-2 scenes", () => {
  const neutralRules = (b: HeroQuestionBlueprint) => {
    b.wrongAnswers = [
      { match: "regex:^never$", feedback: { en: "Placeholder feedback one.", zh: "占位反馈一。" } },
      { match: "regex:^nope$", feedback: { en: "Placeholder feedback two.", zh: "占位反馈二。" } },
    ];
  };

  it("NUMERIC answers must match what staircase_paths, pascal_triangle, calendar_grid, cycle_timeline, frog_puzzle, water_jugs, queens_board, guess_game and trains_fly compute", () => {
    for (const [slug, wrong, pattern] of [
      ["staircase-ways", 55, /staircase_paths asserts 89, answer is 55/],
      ["pascal-row-sum", 512, /pascal_triangle asserts 1024, answer is 512/],
      ["calendar-square", 136, /calendar_grid asserts 153, answer is 136/],
      ["cicada-primes", 72, /cycle_timeline asserts 78, answer is 72/],
      ["frog-swap", 12, /frog_puzzle asserts 15, answer is 12/],
      ["water-jugs", 8, /water_jugs asserts 6, answer is 8/],
      ["four-queens", 4, /queens_board asserts 2, answer is 4/],
      ["guess-my-number", 10, /guess_game asserts 7, answer is 10/],
      ["fly-between-trains", 100, /trains_fly asserts 75, answer is 100/],
    ] as const) {
      expectProblem(
        broken(bySlug(slug), (b) => {
          neutralRules(b);
          b.answer = { type: "NUMERIC", value: wrong };
        }),
        pattern
      );
    }
  });

  it("domino_tiling must agree with an exact search, tiling_lab with the angle rule", () => {
    expectProblem(
      broken(bySlug("mutilated-chessboard"), (b) => {
        b.answer = { type: "CHOICE", correctId: "possible" };
        b.wrongAnswers = b.wrongAnswers.filter((w) => w.match !== "choice:possible");
        b.wrongAnswers.push({ match: "choice:impossible", feedback: { en: "Placeholder feedback.", zh: "占位反馈。" } });
      }),
      /domino_tiling can't be tiled, so the answer must be CHOICE "impossible"/
    );
    expectProblem(
      broken(bySlug("why-hexagons"), (b) => {
        neutralRules(b);
        b.answer = { type: "MULTI_VALUE", values: ["4", "6"] };
      }),
      /tiling_lab's tilers have 3, 4, 6 sides, answer is 4, 6/
    );
  });

  it("an EXPRESSION answer must match its expression_builder and every listed solution must be correct", () => {
    const bp = bySlug("four-fours");
    expectProblem(
      broken(bp, (b) => {
        (b.scene as { solutions: string[] }).solutions = ["44/4-4", "4+4+4/4"];
      }),
      /listed solution "4\+4\+4\/4" is not a correct EXPRESSION answer/
    );
    expectProblem(
      broken(bp, (b) => {
        neutralRules(b);
        if (b.answer.type === "EXPRESSION") b.answer.target = 8;
      }),
      /expression_builder target 7, answer target 8/
    );
    expectProblem(
      broken(bp, (b) => {
        if (b.answer.type === "EXPRESSION") b.answer.allowedOps = ["+", "-", "*", "/"];
      }),
      /expression_builder ops .* differ from the answer's/
    );
    expectProblem(
      broken(bp, (b) => {
        delete (b.scene as { solutions?: string[] }).solutions;
      }),
      /needs at least one listed solution/
    );
  });
});
