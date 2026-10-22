/**
 * World B · Shapes that lie (`shapes-that-lie`). Catalog: 02-hero-question-catalog.md §B.
 * Batch 1: B1 squares-on-chessboard.
 * TODO(phase-3 batch 2): B2+ once pizza_cuts, fence_shaper and friends land.
 */
import type { HeroQuestionBlueprint } from "./_template";

/** B1. */
export const squaresOnChessboard: HeroQuestionBlueprint = {
  slug: "squares-on-chessboard",
  collection: "shapes-that-lie",
  kind: "THREE_ACT",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "GEOMETRY",
  title: { en: "How Many Squares?", zh: "棋盘上到底有几个正方形" },
  hook: {
    en: "Ask anyone how many squares are on a chessboard and they'll say 64. But squares come big and small, and they can overlap. How many squares are really hiding on a chessboard?",
    zh: "问别人棋盘上有几个正方形，大家都会说 64 个。可是正方形有大有小，还能互相重叠。棋盘上到底藏着多少个正方形？",
  },
  guess: {
    type: "slider",
    min: 50,
    max: 300,
    step: 1,
    unit: { en: "squares", zh: "个" },
  },
  scene: { type: "grid_squares", size: 8 },
  prompt: {
    en: "A chessboard is an 8 × 8 grid. Count every square of every size, from 1 × 1 up to the whole board. How many are there?",
    zh: "棋盘是 8 × 8 的方格。从 1 × 1 到整个棋盘，所有大小的正方形都算。一共有多少个？",
  },
  answer: { type: "NUMERIC", value: 204 },
  hints: [
    { en: "A square can be bigger than one cell. A 2 × 2 block of cells is a square too. Which sizes are possible?", zh: "正方形不一定只有一格大。2 × 2 的一块格子也是正方形。可能有哪些大小？" },
    { en: "Try a 3 × 3 board first. Count the 1 × 1 squares, then the 2 × 2, then the 3 × 3.", zh: "先试试 3 × 3 的小棋盘。数一数 1 × 1 的，再数 2 × 2 的，最后数 3 × 3 的。" },
    { en: "A 2 × 2 square can start in 7 places across and 7 places down, so there are 7 × 7 of them. Do the same for every size, then add.", zh: "2 × 2 的正方形横着有 7 个起点，竖着也有 7 个，所以一共 7 × 7 个。每种大小都这样算，再加起来。" },
  ],
  wrongAnswers: [
    {
      match: "64",
      feedback: {
        en: "You counted the little squares. They are the biggest group, but a 2 × 2 block is a square too. Try counting those next.",
        zh: "你数的是最小的格子。它们确实最多，但 2 × 2 的一块也是正方形。接着数数那些吧。",
      },
    },
    {
      match: "65",
      feedback: {
        en: "64 small squares plus the whole board: good thinking! But there are lots of sizes in between, like 2 × 2 and 3 × 3.",
        zh: "64 个小格加上整个棋盘，想得好！可是中间还有很多大小，比如 2 × 2 和 3 × 3。",
      },
    },
    {
      match: "85",
      feedback: {
        en: "That's 64 + 16 + 4 + 1: the squares that cover the board without overlapping. But squares can overlap! A 2 × 2 square can start on any of 7 columns and 7 rows, not just 4.",
        zh: "这是 64 + 16 + 4 + 1，只数了不重叠、正好铺满棋盘的正方形。可是正方形可以重叠！2 × 2 的正方形横着有 7 个起点，竖着也有 7 个，不止 4 个。",
      },
    },
    {
      match: "128",
      feedback: {
        en: "That's 64 × 2. Bigger squares don't come in the same number as small ones: the bigger the square, the fewer places it fits.",
        zh: "这是 64 × 2。大正方形的个数和小正方形不一样：正方形越大，能放的位置越少。",
      },
    },
  ],
  explanation: {
    en: "A k × k square fits in (9 − k) places across and (9 − k) places down, so there are (9 − k)² squares of each size. That gives 64 + 49 + 36 + 25 + 16 + 9 + 4 + 1. The total is 204.",
    zh: "k × k 的正方形横着有 (9 − k) 个位置，竖着也有 (9 − k) 个，所以每种大小有 (9 − k)² 个。加起来是 64 + 49 + 36 + 25 + 16 + 9 + 4 + 1。一共 204 个。",
  },
  aha: {
    en: "The board hides every square number: 64, 49, 36, all the way down to 1. Add them and you get 204, more than three times what everyone guesses.",
    zh: "棋盘里藏着所有的平方数：64、49、36……一直到 1。全部加起来是 204，比大家猜的 3 倍还多。",
  },
  extension: {
    en: "How many squares are on a 3 × 3 board? Can you find the total for any n × n board? And how many rectangles hide on a chessboard?",
    zh: "3 × 3 的棋盘上有多少个正方形？n × n 的棋盘呢？棋盘上又藏着多少个长方形？",
  },
  discussionPrompt: {
    en: "Why are there 49 squares of size 2 × 2 and not 16? Explain it so well that someone who doesn't believe you changes their mind.",
    zh: "为什么 2 × 2 的正方形有 49 个，而不是 16 个？讲清楚，让一个不信的人也被你说服。",
  },
  solutionTags: ["draw", "table", "pattern"],
  funFact: {
    en: "Adding the square numbers one by one gives 1, 5, 14, 30, 55, 91, 140, 204. They're called square pyramidal numbers, because that many balls stack into a pyramid with a square base.",
    zh: "把平方数一个个加起来，会得到 1、5、14、30、55、91、140、204。它们叫「四角锥数」，因为这么多个球正好能堆成一座方底的金字塔。",
  },
  sortOrder: 1,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: almost everyone counts by size in a table; the pyramid picture is the only other path",
};

export const SHAPES_THAT_LIE: readonly HeroQuestionBlueprint[] = [squaresOnChessboard];
