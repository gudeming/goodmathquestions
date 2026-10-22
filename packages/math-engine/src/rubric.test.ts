import { describe, expect, it } from "vitest";
import {
  countOperators,
  countSentences,
  DEFAULT_HINT_TEXTS,
  isEmptyNumberLine,
  scoreQuestionHeuristically,
  type RubricQuestionInput,
} from "./rubric";

// Fixtures mirror what buildUSK12QuestionBank() emits for these blueprints
// (default hints, default fun fact, inferred empty number line). The db package
// re-runs the same assertions against the real bank so these cannot drift silently.
const DEFAULT_HINTS = DEFAULT_HINT_TEXTS.map((h) => ({ ...h }));
const DEFAULT_FUN_FACT =
  "This skill appears in US K-12 pathways including state standards and classroom assessments.";
const EMPTY_LINE = { type: "number_journey", range: [0, 20], highlights: [] };

const compute23x6: RubricQuestionInput = {
  titleEn: "Multiply in Parts",
  contentEn: "Compute 23 × 6.",
  ageGroup: "AGE_8_10",
  hints: DEFAULT_HINTS,
  animationConfig: { type: "number_combine", numbers: [120, 18], operation: "add" },
  sceneSource: "explicit",
  answerExplainEn: "(20 × 6) + (3 × 6) = 120 + 18 = 138.",
  funFactEn: DEFAULT_FUN_FACT,
};

const cheetah: RubricQuestionInput = {
  titleEn: "Cheetah vs. Human Sprint",
  contentEn:
    "A cheetah sprints at 112 km/h while the world's fastest human runs at 45 km/h. How many km/h faster is the cheetah than the human?",
  ageGroup: "AGE_8_10",
  hints: DEFAULT_HINTS,
  animationConfig: EMPTY_LINE,
  sceneSource: "inferred",
  answerExplainEn: "Subtract: 112 − 45 = 67 km/h faster.",
  funFactEn:
    "If a cheetah raced Usain Bolt (top speed 44.7 km/h) over 100 m, the cheetah would finish about 3.5 seconds ahead — that's like the length of an entire car!",
};

const mindReading: RubricQuestionInput = {
  titleEn: "Math Mind-Reading Trick",
  contentEn:
    "Try this magic trick: pick any number, double it, add 10, halve the result, then subtract your original number. No matter what number you choose, the answer is always the same. What is it?",
  ageGroup: "AGE_12_14",
  hints: DEFAULT_HINTS,
  animationConfig: EMPTY_LINE,
  sceneSource: "inferred",
  answerExplainEn:
    "Let the number be \\(n\\). Steps: \\(2n \\to 2n+10 \\to n+5 \\to (n+5)-n = 5\\). Always 5!",
  funFactEn:
    "Every great math magic trick is secretly an algebraic identity in disguise — this one is \\((2n+10)/2 - n = 5\\). Algebra is the magician behind every 'impossible' number trick!",
};

const paperFolding: RubricQuestionInput = {
  titleEn: "Paper Folding Challenge",
  contentEn:
    "A sheet of paper is 0.1 mm thick. Each fold doubles the thickness. What is the total thickness in mm after 10 folds?",
  ageGroup: "AGE_12_14",
  hints: DEFAULT_HINTS,
  animationConfig: EMPTY_LINE,
  sceneSource: "inferred",
  answerExplainEn: "Thickness = \\(0.1 \\times 2^{10} = 0.1 \\times 1024 = 102.4\\) mm.",
  funFactEn:
    "If you could fold a piece of paper 42 times, it would be thick enough to reach the Moon — exponential growth is truly staggering!",
};

const derivativePowerRule: RubricQuestionInput = {
  titleEn: "Derivative Power Rule",
  contentEn: "Find \\(\\frac{d}{dx}(x^4)\\).",
  ageGroup: "AGE_16_18",
  hints: DEFAULT_HINTS,
  animationConfig: { type: "number_journey", range: [1, 5], highlights: [4, 3] },
  sceneSource: "explicit",
  answerExplainEn: "Power rule: \\(\\frac{d}{dx}(x^n)=n x^{n-1}\\).",
  funFactEn: DEFAULT_FUN_FACT,
};

describe("scoreQuestionHeuristically: hand-picked seed questions (§3.3)", () => {
  it("Compute 23 × 6: compute opener, numbers first, default hints and fun fact", () => {
    expect(scoreQuestionHeuristically(compute23x6)).toEqual({
      score: 14,
      flags: ["DEFAULT_HINTS", "COMPUTE_PREFIX", "NUMBERS_FIRST", "DEFAULT_FUN_FACT", "NO_WRONG_FEEDBACK"],
    });
  });

  it("Cheetah vs. Human Sprint: one-step subtraction on an inferred empty number line", () => {
    expect(scoreQuestionHeuristically(cheetah)).toEqual({
      score: 11,
      flags: [
        "DEFAULT_HINTS",
        "INFERRED_SCENE",
        "EMPTY_NUMBER_LINE",
        "NUMBERS_FIRST",
        "ONE_STEP",
        "NO_WRONG_FEEDBACK",
      ],
    });
  });

  it("Math Mind-Reading Trick: hero candidate despite default hints and empty scene", () => {
    expect(scoreQuestionHeuristically(mindReading)).toEqual({
      score: 16,
      flags: ["DEFAULT_HINTS", "INFERRED_SCENE", "EMPTY_NUMBER_LINE", "NO_WRONG_FEEDBACK", "HERO_CANDIDATE"],
    });
  });

  it("Paper Folding Challenge: hero candidate with numbers in the first sentence", () => {
    expect(scoreQuestionHeuristically(paperFolding)).toEqual({
      score: 15,
      flags: [
        "DEFAULT_HINTS",
        "INFERRED_SCENE",
        "EMPTY_NUMBER_LINE",
        "NUMBERS_FIRST",
        "NO_WRONG_FEEDBACK",
        "HERO_CANDIDATE",
      ],
    });
  });

  it("Derivative Power Rule (AGE_16_18 calculus): out of range, score floors at 0", () => {
    expect(scoreQuestionHeuristically(derivativePowerRule)).toEqual({
      score: 0,
      flags: [
        "DEFAULT_HINTS",
        "COMPUTE_PREFIX",
        "NUMBERS_FIRST",
        "AGE_OUT_OF_RANGE",
        "DEFAULT_FUN_FACT",
        "NO_WRONG_FEEDBACK",
      ],
    });
  });
});

describe("scoreQuestionHeuristically: individual rules", () => {
  const clean: RubricQuestionInput = {
    contentEn: "Ten friends meet and every pair shakes hands once. How many handshakes happen?",
    ageGroup: "AGE_10_12",
    hints: [
      { en: "Try it with 3 friends first and draw a dot for each one." },
      { en: "Each friend shakes hands with everyone else. How many is that each?" },
      { en: "Did you count each handshake twice? Halve your total." },
    ],
    animationConfig: { type: "handshake_graph", people: 10 },
    sceneSource: "explicit",
    answerExplainEn: "Each of the 10 people shakes 9 hands, and each handshake is shared by two people: 10 × 9 ÷ 2 = 45.",
    funFactEn: "The same rule counts the games in a round-robin tournament.",
    wrongAnswerFeedback: [{ match: "90" }, { match: "100" }],
  };

  it("a v2-shaped question with real hints, scene and feedback raises no flags", () => {
    expect(scoreQuestionHeuristically(clean)).toEqual({ score: 20, flags: [] });
  });

  it("flags DEFAULT_HINTS when any single hint matches a default (en or zh)", () => {
    const oneDefault = { ...clean, hints: [{ en: "Look for pairs." }, { zh: "把问题拆成更小的步骤。" }] };
    expect(scoreQuestionHeuristically(oneDefault).flags).toEqual(["DEFAULT_HINTS"]);
  });

  it("charges INFERRED_SCENE and EMPTY_NUMBER_LINE once together (both zero the hands-on item)", () => {
    const inferred = { ...clean, sceneSource: "inferred" as const, animationConfig: EMPTY_LINE };
    expect(scoreQuestionHeuristically(inferred)).toEqual({
      score: 18,
      flags: ["INFERRED_SCENE", "EMPTY_NUMBER_LINE"],
    });
  });

  it("flags LONG_FUN_FACT by length (> 300 chars) and by sentence count (> 2)", () => {
    expect(scoreQuestionHeuristically({ ...clean, funFactEn: "a".repeat(301) }).flags).toEqual([
      "LONG_FUN_FACT",
    ]);
    expect(scoreQuestionHeuristically({ ...clean, funFactEn: "One. Two. Three." }).flags).toEqual([
      "LONG_FUN_FACT",
    ]);
  });

  it("flags NO_WRONG_FEEDBACK for an empty feedback list", () => {
    expect(scoreQuestionHeuristically({ ...clean, wrongAnswerFeedback: [] })).toEqual({
      score: 20,
      flags: ["NO_WRONG_FEEDBACK"],
    });
  });

  it("does not mark an out-of-range question as a hero candidate even with a keyword", () => {
    const result = scoreQuestionHeuristically({ ...mindReading, ageGroup: "AGE_14_16" });
    expect(result.flags).toContain("AGE_OUT_OF_RANGE");
    expect(result.flags).not.toContain("HERO_CANDIDATE");
    expect(result.score).toBe(0);
  });
});

describe("rubric helpers", () => {
  it("treats a number_journey with renderer defaults as the empty number line", () => {
    expect(isEmptyNumberLine({ type: "number_journey" })).toBe(true);
    expect(isEmptyNumberLine({ type: "number_journey", range: [0, 20], highlights: [7] })).toBe(false);
    expect(isEmptyNumberLine({ type: "number_journey", range: [0, 50], highlights: [] })).toBe(false);
    expect(isEmptyNumberLine({ type: "pizza_slice" })).toBe(false);
    expect(isEmptyNumberLine(null)).toBe(false);
  });

  it("does not count unit slashes or hyphenated words as operators", () => {
    expect(countOperators("Subtract: 112 − 45 = 67 km/h faster.")).toBe(1);
    expect(countOperators("A well-known 3 / 4 split")).toBe(1);
    expect(countOperators("\\(0.1 \\times 2^{10}\\)")).toBe(2);
  });

  it("does not split sentences on decimal points", () => {
    expect(countSentences("Top speed 44.7 km/h, about 3.5 seconds ahead!")).toBe(1);
    expect(countSentences("No terminator")).toBe(1);
    expect(countSentences("")).toBe(0);
  });
});
