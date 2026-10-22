import { describe, expect, it } from "vitest";
import { collatzSteps, parseSceneConfig, stepsToShrinkBelow } from "@gmq/animation-engine";
import { AnswerSpecSchema, validateAnswerV2, wrongAnswerFeedbackFor } from "@gmq/math-engine";
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
      const correct = canonicalCorrectInput(stored);
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
    const illustrated = ALL_HERO_BLUEPRINTS.filter((bp) => bp.scene.type === "illustration").map((bp) => bp.slug);
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

  it("adds the fifteen batch-3 questions: 39 in all", () => {
    const slugs = ALL_HERO_BLUEPRINTS.map((bp) => bp.slug);
    expect(slugs).toEqual(expect.arrayContaining([...BATCH_3_SLUGS]));
    expect(slugs).toHaveLength(BATCH_1_SLUGS.length + BATCH_2_SLUGS.length + BATCH_3_SLUGS.length);
    expect(slugs).toHaveLength(39);
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

  it("AGE_8_10 counts per world (huge-numbers and number-magic grew this batch)", () => {
    const young = Object.fromEntries(
      HERO_WORLDS.map((w) => [w.slug, w.blueprints.filter((bp) => bp.ageGroup === "AGE_8_10").length])
    );
    // impossible-puzzles reaches 2 when F12 lands.
    expect(young).toEqual({
      "huge-numbers": 2,
      "shapes-that-lie": 2,
      "chance-and-luck": 3,
      "number-magic": 3,
      "patterns-everywhere": 2,
      "impossible-puzzles": 1,
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
