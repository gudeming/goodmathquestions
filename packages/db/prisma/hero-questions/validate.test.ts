import { describe, expect, it } from "vitest";
import { parseSceneConfig } from "@gmq/animation-engine";
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

describe("hero blueprints (batch 1)", () => {
  it("has the eight batch-1 questions", () => {
    expect(ALL_HERO_BLUEPRINTS.map((bp) => bp.slug)).toEqual([
      "gauss-sum",
      "handshake-party",
      "squares-on-chessboard",
      "monty-hall",
      "trick-1089",
      "mind-reading-five",
      "scramble-and-nine",
      "kaprekar-6174",
    ]);
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
