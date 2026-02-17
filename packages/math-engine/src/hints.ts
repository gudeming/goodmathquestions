export interface Hint {
  en: string;
  zh: string;
}

/**
 * Generate progressive hints for a math question.
 * Hints should go from vague to more specific.
 */
export function generateHints(
  category: string,
  content: string,
  answer: string
): Hint[] {
  // This is a placeholder - in production, this could use AI to generate hints
  return [
    {
      en: "Read the question carefully and identify what you need to find.",
      zh: "仔细阅读题目，找出你需要求的是什么。",
    },
    {
      en: "Try working through the problem step by step.",
      zh: "试着一步一步地解决这个问题。",
    },
    {
      en: "You're getting close! Check your work and try again.",
      zh: "你快成功了！检查一下你的计算，再试一次。",
    },
  ];
}
