/**
 * Validates a user's answer against the correct answer.
 * Supports various answer formats: numbers, fractions, expressions.
 */
export function validateAnswer(
  userAnswer: string,
  correctAnswer: string
): boolean {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

  // Direct string match
  if (normalizedUser === normalizedCorrect) {
    return true;
  }

  // Try numeric comparison
  const userNum = parseNumericAnswer(userAnswer);
  const correctNum = parseNumericAnswer(correctAnswer);

  if (userNum !== null && correctNum !== null) {
    return Math.abs(userNum - correctNum) < 0.0001;
  }

  // Try fraction comparison
  const userFraction = parseFraction(userAnswer);
  const correctFraction = parseFraction(correctAnswer);

  if (userFraction !== null && correctFraction !== null) {
    return Math.abs(userFraction - correctFraction) < 0.0001;
  }

  return false;
}

function normalizeAnswer(answer: string): string {
  return answer
    .trim()
    .toLowerCase()
    .replace(/[，,]/g, "")
    .replace(/°/g, "") // Remove degree symbol
    .replace(/\s+/g, " "); // Keep single spaces for mixed fractions like "1 3/4"
}

function parseNumericAnswer(answer: string): number | null {
  const normalized = normalizeAnswer(answer);

  // Pure numeric input
  const num = Number(normalized);
  if (!isNaN(num)) {
    return num;
  }

  // Common word numbers (helps kids answer "five", "ten", etc.)
  const words: Record<string, number> = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
  };

  if (words[normalized] !== undefined) {
    return words[normalized];
  }

  // Numeric answer with trailing text, e.g. "5 faces", "65 degrees"
  const numericWithSuffix = normalized.match(/^(-?\d+(?:\.\d+)?)\s*[a-z\u4e00-\u9fff].*$/);
  if (numericWithSuffix) {
    return Number(numericWithSuffix[1]);
  }

  // Word number with trailing text, e.g. "five faces"
  const wordWithSuffix = normalized.match(/^([a-z]+)\s+[a-z\u4e00-\u9fff].*$/);
  if (wordWithSuffix && words[wordWithSuffix[1]] !== undefined) {
    return words[wordWithSuffix[1]];
  }

  return null;
}

function parseFraction(answer: string): number | null {
  const normalized = normalizeAnswer(answer);

  // Try mixed number: "1 3/4" format
  const mixedMatch = normalized.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    if (den === 0) return null;
    return whole + num / den;
  }

  const fractionMatch = normalized.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1]);
    const denominator = parseInt(fractionMatch[2]);
    if (denominator === 0) return null;
    return numerator / denominator;
  }

  return null;
}
