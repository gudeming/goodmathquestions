/**
 * World A · Huge numbers & infinity (`huge-numbers`). Catalog: 02-hero-question-catalog.md §A.
 * Batch 1 has the questions whose scenes exist: A1 gauss-sum, A8 handshake-party.
 * TODO(phase-3 batch 2): A2-A7, A9, A10 once chessboard_doubling, fold_paper, scale_ladder,
 * zoom_number_line, hotel_shift and halving_bar scenes land.
 */
import type { HeroQuestionBlueprint } from "./_template";

/** A1. The rubric's §4.1 example, verbatim. */
export const gaussSum: HeroQuestionBlueprint = {
  slug: "gauss-sum",
  collection: "huge-numbers",
  kind: "THREE_ACT",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "ARITHMETIC",
  title: { en: "The Boy Who Beat the Teacher", zh: "几秒钟就算完的男孩" },
  hook: {
    en: "A teacher wanted a quiet hour, so she told the class: \"Add up every number from 1 to 100. No talking until you finish.\" One boy put his slate down after a few seconds. His answer was right. How could he possibly be that fast?",
    zh: "老师想让教室安静一小时，就说：「把 1 到 100 所有的数加起来，算完才能说话。」一个男孩几秒钟就放下了石板，答案还是对的。他怎么可能这么快？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "A", en: "About 1,000", zh: "大约 1,000" },
      { id: "B", en: "About 5,000", zh: "大约 5,000" },
      { id: "C", en: "About 10,000", zh: "大约 10,000" },
      { id: "D", en: "More than 50,000", zh: "超过 50,000" },
    ],
  },
  scene: { type: "gauss_pairing", n: 100, visibleHead: 6, visibleTail: 6, pairSum: 101, pairCount: 50 },
  prompt: { en: "What is 1 + 2 + 3 + … + 100?", zh: "1 + 2 + 3 + … + 100 等于多少？" },
  answer: { type: "NUMERIC", value: 5050 },
  hints: [
    { en: "Don't start at 1 and plod upward. What if you add the FIRST number and the LAST number together?", zh: "别从 1 开始一个个往上加。试试把第一个数和最后一个数加在一起？" },
    { en: "1 + 100 = 101. Now try 2 + 99, and 3 + 98. Notice anything?", zh: "1 + 100 = 101。再试试 2 + 99，还有 3 + 98。发现什么了？" },
    { en: "Every pair makes 101. How many pairs can you make from 100 numbers? Multiply.", zh: "每一对都是 101。100 个数能配成多少对？乘一下。" },
  ],
  wrongAnswers: [
    { match: "10100", feedback: { en: "That's 100 × 101. You counted every pair twice: each pair uses two numbers, so 100 numbers make only 50 pairs.", zh: "这是 100 × 101。每一对用掉两个数，100 个数只能配成 50 对，你把每对数了两遍。" } },
    { match: "5000", feedback: { en: "So close! 50 pairs is right, but each pair adds up to 101, not 100.", zh: "很接近了！50 对没错，但每一对的和是 101，不是 100。" } },
    { match: "lt:1000", feedback: { en: "Too small. Just the last ten numbers, 91 to 100, already add up to more than 900.", zh: "太小了。光是最后十个数 91 到 100 加起来就超过 900 了。" } },
  ],
  explanation: {
    en: "Pair the numbers from both ends: 1 + 100, 2 + 99, 3 + 98 … each pair is 101. There are 50 pairs, so the total is 50 × 101 = 5050.",
    zh: "从两头往中间配对：1 + 100、2 + 99、3 + 98……每一对都是 101。一共 50 对，所以总和是 50 × 101 = 5050。",
  },
  aha: {
    en: "Adding 100 numbers turned into one multiplication, because the pairs are all the same. That boy was Gauss, and he was about your age.",
    zh: "100 个数相加变成了一次乘法，因为每一对都一样。那个男孩叫高斯，当时和你差不多大。",
  },
  extension: {
    en: "What is 1 + 2 + … + 1000? Can you find a rule that works for adding 1 up to any number n?",
    zh: "1 + 2 + … + 1000 是多少？你能找到一个对任何 n 都成立的规律吗？",
  },
  discussionPrompt: {
    en: "Did you pair from the ends, or did you find a different shortcut? Describe it so a friend could use it.",
    zh: "你是从两头配对的，还是找到了别的捷径？把它说清楚，让朋友也能用。",
  },
  solutionTags: ["pair", "draw", "table", "pattern"],
  funFact: {
    en: "Mathematicians write Gauss's trick as n(n + 1) / 2. Try n = 100: 100 × 101 / 2 = 5050.",
    zh: "数学家把高斯的方法写成 n(n + 1) / 2。代入 n = 100：100 × 101 / 2 = 5050。",
  },
  sortOrder: 1,
  rubricNotes: "19/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 2, wrong 2, hints 2, retell 1",
};

/** A8. */
export const handshakeParty: HeroQuestionBlueprint = {
  slug: "handshake-party",
  collection: "huge-numbers",
  kind: "THREE_ACT",
  ageGroup: "AGE_8_10",
  difficulty: "EASY",
  category: "LOGIC",
  title: { en: "Party Handshakes", zh: "派对上的握手" },
  hook: {
    en: "Friends keep arriving at your party, and every two of them shake hands exactly once. Nobody skips anyone, and nobody shakes the same hand twice. By the time ten friends are there, how many handshakes have happened?",
    zh: "朋友们陆续来参加你的派对，每两个人都要握一次手。不能漏掉谁，也不能和同一个人握两次。等十个朋友都到齐了，一共握了多少次手？",
  },
  guess: {
    type: "slider",
    min: 0,
    max: 100,
    step: 1,
    unit: { en: "handshakes", zh: "次" },
  },
  scene: { type: "handshake_graph", people: 10 },
  prompt: {
    en: "10 friends each shake hands once with every other friend. How many handshakes are there in total?",
    zh: "10 个朋友，每两个人握一次手。一共握了多少次手？",
  },
  answer: { type: "NUMERIC", value: 45 },
  hints: [
    { en: "Start smaller. How many handshakes are there with just 3 friends? With 4?", zh: "先从小的试。只有 3 个朋友时握几次手？4 个呢？" },
    { en: "Look at just one friend. She shakes hands with everyone except herself. How many handshakes is that for her?", zh: "只看一个人。她要和除了自己以外的每个人握手。她要握几次？" },
    { en: "Each of the 10 friends shakes 9 hands, but every handshake has two people in it. So 10 × 9 counts each handshake twice.", zh: "10 个人每人握 9 次，可是每次握手都有两个人。所以 10 × 9 把每次握手都数了两遍。" },
  ],
  wrongAnswers: [
    {
      match: "90",
      feedback: {
        en: "You did 10 × 9. Great start! But when Ana shakes Ben's hand, Ben is shaking Ana's hand too. You counted that handshake twice.",
        zh: "你算的是 10 × 9，开头很好！可是小安和小斌握手的时候，小斌也在和小安握手。这一次握手你数了两遍。",
      },
    },
    {
      match: "100",
      feedback: {
        en: "That's 10 × 10. It counts everyone shaking their own hand, and it counts each real handshake twice. Nobody shakes their own hand!",
        zh: "这是 10 × 10。它把每个人和自己握手也算进去了，还把每次握手数了两遍。没有人会和自己握手哦！",
      },
    },
    {
      match: "55",
      feedback: {
        en: "55 is 1 + 2 + … + 10. Very close! But the tenth friend to arrive only meets the 9 people already there, not 10.",
        zh: "55 是 1 + 2 + … + 10。很接近了！可是第十个到的朋友只会遇到前面的 9 个人，不是 10 个。",
      },
    },
    {
      match: "10",
      feedback: {
        en: "10 is the number of friends, not handshakes. Just one friend on her own already shakes 9 hands.",
        zh: "10 是人数，不是握手的次数。光是一个人就要握 9 次手。",
      },
    },
  ],
  explanation: {
    en: "Each of the 10 friends shakes hands with the other 9, which gives 10 × 9 = 90. But every handshake has two people in it, so 90 counts each one twice. 90 ÷ 2 = 45 handshakes.",
    zh: "10 个人每人和另外 9 个人握手，得到 10 × 9 = 90。可是每次握手有两个人，90 把每次都数了两遍。90 ÷ 2 = 45 次。",
  },
  aha: {
    en: "Draw 10 dots and join every pair with a line: each line is one handshake. Counting from each person sees every line twice, so you halve it.",
    zh: "画 10 个点，每两个点连一条线，一条线就是一次握手。从每个人那头数，每条线都被数了两遍，所以要除以 2。",
  },
  extension: {
    en: "What if your whole class of 30 shakes hands? Can you find a rule for any number of people?",
    zh: "如果全班 30 个人都互相握手呢？你能找到任何人数都适用的规律吗？",
  },
  discussionPrompt: {
    en: "Did you draw dots, make a list, or multiply? Which way would you pick for 100 people, and why?",
    zh: "你是画点连线、列表，还是用乘法？如果有 100 个人，你会用哪种方法？为什么？",
  },
  solutionTags: ["draw", "table", "pattern"],
  funFact: {
    en: "The same count shows up in sports: if 10 teams each play every other team once, the league needs 45 games.",
    zh: "同样的数也藏在球赛里：10 支球队每两队踢一场，一共要踢 45 场。",
  },
  sortOrder: 8,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 2, wrong 2, hints 1, retell 1: hint 3 nearly gives the method away; retelling is a nice fact rather than a jaw-dropper",
};

export const HUGE_NUMBERS: readonly HeroQuestionBlueprint[] = [gaussSum, handshakeParty];
