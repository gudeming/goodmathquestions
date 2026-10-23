import { describe, expect, it } from "vitest";
import { XP_RULES, computeAnswerXp,
  computeVariantXp, difficultyXp, levelForXp, solutionCommentXp, type AnswerXpInput } from "./xp";

const base: AnswerXpInput = {
  difficulty: "MEDIUM",
  isCorrect: false,
  hintsUsed: 0,
  guessVerified: false,
  previousAttempts: 0,
  alreadySolved: false,
};

describe("difficultyXp", () => {
  it("keeps the existing per-difficulty values", () => {
    expect(difficultyXp("EASY")).toBe(10);
    expect(difficultyXp("MEDIUM")).toBe(25);
    expect(difficultyXp("HARD")).toBe(50);
    expect(difficultyXp("CHALLENGE")).toBe(100);
  });
});

describe("computeAnswerXp", () => {
  it("first attempt, wrong: +5 for trying", () => {
    expect(computeAnswerXp(base)).toEqual({ guess: 0, firstAttempt: 5, correct: 0, noHints: 0, total: 5 });
  });

  it("first attempt, wrong, after a verified guess: +5 guess +5 attempt", () => {
    expect(computeAnswerXp({ ...base, guessVerified: true }).total).toBe(10);
  });

  it("first attempt, correct, no hints, guessed: every bonus at once", () => {
    expect(computeAnswerXp({ ...base, isCorrect: true, guessVerified: true })).toEqual({
      guess: 5,
      firstAttempt: 5,
      correct: 25,
      noHints: 10,
      total: 45,
    });
  });

  it("hints used: no no-hints bonus", () => {
    expect(computeAnswerXp({ ...base, isCorrect: true, hintsUsed: 1 })).toMatchObject({ noHints: 0, total: 30 });
  });

  it("negative hintsUsed is treated as 0", () => {
    expect(computeAnswerXp({ ...base, isCorrect: true, hintsUsed: -3 }).noHints).toBe(10);
  });

  it("later attempt, correct: difficulty XP (+ no-hints) but no attempt / guess XP", () => {
    expect(computeAnswerXp({ ...base, isCorrect: true, previousAttempts: 2, guessVerified: true })).toEqual({
      guess: 0,
      firstAttempt: 0,
      correct: 25,
      noHints: 10,
      total: 35,
    });
  });

  it("later attempt, wrong: nothing", () => {
    expect(computeAnswerXp({ ...base, previousAttempts: 1, guessVerified: true }).total).toBe(0);
  });

  it("already solved: resubmitting the right answer earns nothing", () => {
    expect(computeAnswerXp({ ...base, isCorrect: true, previousAttempts: 1, alreadySolved: true }).total).toBe(0);
  });

  it.each([
    ["EASY", 10],
    ["HARD", 50],
    ["CHALLENGE", 100],
  ] as const)("%s correct on a later attempt with hints = %d", (difficulty, xp) => {
    expect(computeAnswerXp({ ...base, difficulty, isCorrect: true, previousAttempts: 1, hintsUsed: 3 }).total).toBe(xp);
  });
});

describe("solutionCommentXp", () => {
  it("awards +10 for >= 30 characters, once", () => {
    expect(solutionCommentXp("I paired 1 with 100, 2 with 99, and so on.", false)).toBe(XP_RULES.solutionComment);
    expect(solutionCommentXp("I paired 1 with 100, 2 with 99, and so on.", true)).toBe(0);
    expect(solutionCommentXp("too short", false)).toBe(0);
    expect(solutionCommentXp(`   ${"a".repeat(29)}   `, false)).toBe(0);
  });

  it("counts Chinese characters one each", () => {
    expect(solutionCommentXp("我".repeat(30), false)).toBe(10);
    expect(solutionCommentXp("我".repeat(29), false)).toBe(0);
  });
});

describe("computeVariantXp", () => {
  it("pays +3 for a correct answer within the first 3 tries", () => {
    expect(computeVariantXp({ isCorrect: true, previousAttempts: 0 })).toBe(XP_RULES.variant);
    expect(computeVariantXp({ isCorrect: true, previousAttempts: 2 })).toBe(3);
  });

  it("pays nothing once 'show me' could have been used, or for a wrong answer", () => {
    expect(computeVariantXp({ isCorrect: true, previousAttempts: 3 })).toBe(0);
    expect(computeVariantXp({ isCorrect: false, previousAttempts: 0 })).toBe(0);
  });
});

describe("levelForXp", () => {
  it("is one level per 100 XP, starting at level 1", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(250)).toBe(3);
  });
});
