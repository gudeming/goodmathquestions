/**
 * XP rules for a question (docs/plans/good-questions-overhaul/README.md, Phase 4 item 5).
 *
 *   guess            +5   once per question (Act 1 guess, verified server-side)
 *   first attempt    +5   once per question, right or wrong
 *   correct          +difficulty XP (EASY 10 / MEDIUM 25 / HARD 50 / CHALLENGE 100), once
 *   no hints         +10  correct without revealing any hint, once (with the correct XP)
 *   solution comment +10  a comment of >= 30 characters, once per question
 *   variant          +3   "try another number": correct within the first 3 tries, once per variant
 *
 * Pure functions; the router supplies the facts it read from the database.
 */

export type XpDifficulty = "EASY" | "MEDIUM" | "HARD" | "CHALLENGE";

export const XP_RULES = {
  guess: 5,
  firstAttempt: 5,
  noHintsBonus: 10,
  solutionComment: 10,
  solutionCommentMinChars: 30,
  /** A "try another number" variant, solved before "show me" unlocks (fewer than 3 earlier tries). */
  variant: 3,
  variantMaxPriorAttempts: 2,
  difficulty: { EASY: 10, MEDIUM: 25, HARD: 50, CHALLENGE: 100 } as const satisfies Record<XpDifficulty, number>,
  /** Every 100 XP is one level. */
  xpPerLevel: 100,
} as const;

export function difficultyXp(difficulty: XpDifficulty): number {
  return XP_RULES.difficulty[difficulty];
}

export interface AnswerXpInput {
  difficulty: XpDifficulty;
  /** Is this submission correct? */
  isCorrect: boolean;
  /** Hints revealed before this submission (client-reported, clamped to >= 0). */
  hintsUsed: number;
  /**
   * The caller guessed in Act 1 AND the server found their Guess row. The router
   * only sets this on the first submission, which is what makes the guess XP once-only.
   */
  guessVerified: boolean;
  /** Submissions this user already made for the question. */
  previousAttempts: number;
  /** A previous submission was already correct (correct / no-hints XP were paid). */
  alreadySolved: boolean;
}

export interface AnswerXpBreakdown {
  guess: number;
  firstAttempt: number;
  correct: number;
  noHints: number;
  total: number;
}

/** XP for one answer submission. Repeating a submission after solving earns nothing. */
export function computeAnswerXp(input: AnswerXpInput): AnswerXpBreakdown {
  const isFirst = input.previousAttempts <= 0;
  const firstCorrect = input.isCorrect && !input.alreadySolved;

  const guess = isFirst && input.guessVerified ? XP_RULES.guess : 0;
  const firstAttempt = isFirst ? XP_RULES.firstAttempt : 0;
  const correct = firstCorrect ? difficultyXp(input.difficulty) : 0;
  const noHints = firstCorrect && Math.max(0, input.hintsUsed) === 0 ? XP_RULES.noHintsBonus : 0;

  return { guess, firstAttempt, correct, noHints, total: guess + firstAttempt + correct + noHints };
}

/**
 * XP for a solution comment. `alreadyAwarded`: the user already got this bonus on
 * this question. Length counts characters after trimming (a Chinese character is one).
 *
 * TODO(Phase 6): wire into comment.create once comments carry a solutionTag and
 * the award can be recorded once per (user, question).
 */
export function solutionCommentXp(content: string, alreadyAwarded: boolean): number {
  if (alreadyAwarded) return 0;
  return [...content.trim()].length >= XP_RULES.solutionCommentMinChars ? XP_RULES.solutionComment : 0;
}

export interface VariantXpInput {
  isCorrect: boolean;
  /** Earlier submissions by this user for this variant. */
  previousAttempts: number;
}

/**
 * XP for one variant submission: a small bonus, only while "show me" is still locked (so reading the
 * answer and then typing it earns nothing). The router pays it at most once per variant (a unique
 * award row) and only after the standard version is done.
 */
export function computeVariantXp(input: VariantXpInput): number {
  return input.isCorrect && input.previousAttempts <= XP_RULES.variantMaxPriorAttempts ? XP_RULES.variant : 0;
}

/** Level for a total XP (level 1 at 0 XP, +1 every 100 XP). */
export function levelForXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_RULES.xpPerLevel) + 1;
}
