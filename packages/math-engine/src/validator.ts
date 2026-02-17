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
  const userNum = parseNumericAnswer(normalizedUser);
  const correctNum = parseNumericAnswer(normalizedCorrect);

  if (userNum !== null && correctNum !== null) {
    return Math.abs(userNum - correctNum) < 0.0001;
  }

  // Try fraction comparison
  const userFraction = parseFraction(normalizedUser);
  const correctFraction = parseFraction(normalizedCorrect);

  if (userFraction !== null && correctFraction !== null) {
    return Math.abs(userFraction - correctFraction) < 0.0001;
  }

  return false;
}

function normalizeAnswer(answer: string): string {
  return answer
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/°/g, ""); // Remove degree symbol
}

function parseNumericAnswer(answer: string): number | null {
  const num = Number(answer);
  return isNaN(num) ? null : num;
}

function parseFraction(answer: string): number | null {
  const fractionMatch = answer.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1]);
    const denominator = parseInt(fractionMatch[2]);
    if (denominator === 0) return null;
    return numerator / denominator;
  }

  // Try mixed number: "1 3/4" format
  const mixedMatch = answer.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    if (den === 0) return null;
    return whole + num / den;
  }

  return null;
}
