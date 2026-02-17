export type MathCategory =
  | "ARITHMETIC"
  | "ALGEBRA"
  | "GEOMETRY"
  | "FRACTIONS"
  | "NUMBER_THEORY"
  | "WORD_PROBLEMS"
  | "LOGIC"
  | "PROBABILITY"
  | "TRIGONOMETRY"
  | "CALCULUS"
  | "STATISTICS";

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD" | "CHALLENGE";

export type AgeGroup =
  | "AGE_8_10"
  | "AGE_10_12"
  | "AGE_12_14"
  | "AGE_14_16"
  | "AGE_16_18";

export const XP_REWARDS: Record<DifficultyLevel, number> = {
  EASY: 10,
  MEDIUM: 25,
  HARD: 50,
  CHALLENGE: 100,
};

export const LEVEL_THRESHOLDS = {
  xpPerLevel: 100,
  maxLevel: 100,
};
