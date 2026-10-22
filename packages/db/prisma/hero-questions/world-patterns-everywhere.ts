/**
 * World E · Patterns everywhere (`patterns-everywhere`). Catalog: 02-hero-question-catalog.md §E.
 * Batch 2: E1 tower-of-hanoi, E3 growing-plus, E10 four-weights.
 * TODO(phase-3 batch 3): E2 (staircase_paths), E4 (pascal_triangle), E5 (polyomino_builder),
 * E6 (star_drawer), E7 (calendar_grid), E8 (cycle_timeline), E9 (frog_puzzle).
 */
import type { HeroQuestionBlueprint } from "./_template";

/** E1. The child plays 3 discs; the question asks about 4 (askDiscs), which the reveal solves. */
export const towerOfHanoi: HeroQuestionBlueprint = {
  slug: "tower-of-hanoi",
  collection: "patterns-everywhere",
  kind: "PUZZLE",
  ageGroup: "AGE_8_10",
  difficulty: "MEDIUM",
  category: "LOGIC",
  title: { en: "The Monks' Tower", zh: "僧侣的塔" },
  hook: {
    en: "A tower of discs sits on one of three pegs, biggest at the bottom. You may move one disc at a time, and you may never put a bigger disc on a smaller one. Warm up by moving a three-disc tower to another peg. Then guess: how few moves would a four-disc tower need?",
    zh: "三根柱子，其中一根上套着一座圆盘塔，大的在下，小的在上。一次只能搬一个圆盘，大的永远不能压在小的上面。先把三个盘的塔搬到另一根柱子上热热身。再猜一猜：四个盘的塔最少要搬几步？",
  },
  guess: {
    type: "slider",
    min: 5,
    max: 30,
    step: 1,
    unit: { en: "moves", zh: "步" },
  },
  scene: { type: "tower_of_hanoi", discs: 3, askDiscs: 4 },
  prompt: {
    en: "What is the fewest number of moves needed to move a tower of 4 discs to another peg?",
    zh: "把 4 个圆盘的塔搬到另一根柱子上，最少要搬几步？",
  },
  answer: { type: "NUMERIC", value: 15 },
  hints: [
    { en: "Start tiny. How many moves for 1 disc? For 2 discs? Then solve 3 discs in the scene and count.", zh: "从最小的开始。1 个盘要几步？2 个盘呢？再在场景里搬 3 个盘，数一数步数。" },
    { en: "To move the biggest disc, every smaller disc has to be out of the way, stacked on the spare peg. That's a smaller tower you already know how to move.", zh: "想搬最大的那个盘，上面所有小盘都得先挪开，叠在空柱子上。那就是一座你已经会搬的小塔。" },
    { en: "For 4 discs: move the top 3 out of the way (7 moves), move the big disc (1 move), then move the 3 back on top of it (7 moves). Add them up.", zh: "搬 4 个盘：先把上面 3 个挪开（7 步），再搬最大的盘（1 步），最后把那 3 个搬回它上面（7 步）。加起来。" },
  ],
  wrongAnswers: [
    {
      match: "14",
      feedback: {
        en: "You moved the three small discs away and back: 7 + 7. Nice! But don't forget the one move for the biggest disc in between.",
        zh: "你把三个小盘挪开再搬回来：7 + 7，很好！可是别忘了中间搬最大那个盘的 1 步。",
      },
    },
    {
      match: "16",
      feedback: {
        en: "16 is 2 × 2 × 2 × 2, so you're very close to the pattern! Look at 1, 3, 7: each one is one less than 2, 4, 8.",
        zh: "16 是 4 个 2 相乘，离规律很近了！看看 1、3、7：它们分别比 2、4、8 少 1。",
      },
    },
    {
      match: "8",
      feedback: {
        en: "Two moves for each of 4 discs would be 8, but the small discs have to go back and forth many times. The smallest disc alone moves 8 times.",
        zh: "4 个盘每个搬 2 次是 8 步，可是小盘要来回搬很多次。光是最小的那个盘就要搬 8 次。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "That's too few to be possible. Even 3 discs need 7 moves, and adding a bigger disc underneath can only make it take longer.",
        zh: "这么少是做不到的。3 个盘就要 7 步，下面再加一个更大的盘，只会更多。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "That works, but it isn't the fewest. Try this plan: 3 discs out of the way, big disc across, 3 discs back on top.",
        zh: "这样能搬完，但不是最少的。试试这个办法：先挪开 3 个，再搬大盘，再把 3 个搬回去。",
      },
    },
  ],
  explanation: {
    en: "To move the biggest disc, the 3 smaller discs must first go to the spare peg, which takes 7 moves. Then the biggest disc moves once, and the 3 discs come back on top in 7 more moves. That makes 7 + 1 + 7 = 15.",
    zh: "想搬最大的盘，上面 3 个小盘要先搬到空柱子上，这要 7 步。然后最大的盘搬 1 步，再用 7 步把 3 个小盘搬回它上面。一共 7 + 1 + 7 = 15 步。",
  },
  aha: {
    en: "Each extra disc doubles the moves and adds one: 1, 3, 7, 15, 31. A 64-disc tower takes about 18 billion billion moves, as many as the grains of rice on the king's whole chessboard.",
    zh: "每多一个盘，步数就翻倍再加 1：1、3、7、15、31。64 个盘要搬大约 1800 亿亿步，和国王整个棋盘上的米粒一样多。",
  },
  extension: {
    en: "How many moves for 5 discs? Can you find a rule that tells you the moves for any number of discs, without working out all the smaller towers first?",
    zh: "5 个盘要几步？你能找到一个规律，不用先算出所有小塔，就知道任意多个盘要几步吗？",
  },
  discussionPrompt: {
    en: "How many moves did you need for 3 discs the first time? Describe your strategy for where the smallest disc should go.",
    zh: "你第一次搬 3 个盘用了几步？说说你的策略：最小的盘应该往哪儿放？",
  },
  solutionTags: ["simulate", "pattern", "table", "work_backwards"],
  funFact: {
    en: "Legend says monks in a temple are moving a tower of 64 golden discs, one move every second. Even at that speed they would need about 585 billion years.",
    zh: "传说一座寺庙里的僧侣正在搬一座 64 个金盘的塔，每秒搬一次。就算这么快，也要大约 5850 亿年才能搬完。",
  },
  sortOrder: 1,
  rubricNotes:
    "19/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 2, wrong 2, hints 2, retell 1: play, the 'smaller tower first' idea and the 1, 3, 7 table are all real paths; the 64-disc fact is good but not a party trick",
};

/** E3. Plus sign: centre dot plus four arms of length n, so 4n + 1 dots. Cells are written out for steps 1-3. */
export const growingPlus: HeroQuestionBlueprint = {
  slug: "growing-plus",
  collection: "patterns-everywhere",
  kind: "PATTERN",
  ageGroup: "AGE_8_10",
  difficulty: "EASY",
  category: "ALGEBRA",
  title: { en: "The Growing Plus Sign", zh: "越来越大的加号" },
  hook: {
    en: "A plus sign made of dots grows a little at every step. Step 1 has 5 dots, step 2 has 9 and step 3 has 13. Can you see how it grows, and say how many dots step 10 has without drawing it?",
    zh: "一个用点排成的加号，每一步都长大一点。第 1 步有 5 个点，第 2 步 9 个，第 3 步 13 个。你能看出它是怎么长的吗？不画出来，你能说出第 10 步有几个点吗？",
  },
  guess: {
    type: "slider",
    min: 20,
    max: 100,
    step: 1,
    unit: { en: "dots", zh: "个点" },
  },
  scene: {
    type: "visual_pattern",
    steps: [
      { cells: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] },
      { cells: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]] },
      {
        cells: [
          [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
          [2, 0], [-2, 0], [0, 2], [0, -2],
          [3, 0], [-3, 0], [0, 3], [0, -3],
        ],
      },
    ],
    rule: { kind: "linear", a: 4, b: 1 },
    askStep: 10,
    colorRule: "arm",
  },
  prompt: {
    en: "How many dots are in step 10 of the growing plus sign?",
    zh: "第 10 步的加号有多少个点？",
  },
  answer: { type: "NUMERIC", value: 41 },
  hints: [
    { en: "Look at the picture, not just the numbers. Which dots are new in step 2 compared with step 1? Where did they appear?", zh: "别只看数字，看图。第 2 步比第 1 步多出了哪些点？它们长在哪里？" },
    { en: "Each step adds one dot to the end of each of the four arms. So in step 3, each arm has 3 dots, and there's one dot in the middle.", zh: "每一步，四条胳膊各长出 1 个点。所以第 3 步每条胳膊有 3 个点，中间还有 1 个点。" },
    { en: "In step 10, each of the 4 arms has 10 dots. Don't forget the centre dot, which doesn't belong to any arm.", zh: "第 10 步，4 条胳膊每条有 10 个点。别忘了中间那个点，它不属于任何一条胳膊。" },
  ],
  wrongAnswers: [
    {
      match: "50",
      feedback: {
        en: "You did 5 × 10, because step 1 has 5 dots. But the plus doesn't add a whole new copy of itself each step: it only grows 4 new dots.",
        zh: "你算的是 5 × 10，因为第 1 步有 5 个点。可是加号不是每步复制一个自己，它每步只长出 4 个新点。",
      },
    },
    {
      match: "40",
      feedback: {
        en: "4 arms × 10 dots is exactly right for the arms. You only forgot the dot in the middle!",
        zh: "4 条胳膊 × 10 个点，胳膊算得完全正确。只是忘了中间那个点！",
      },
    },
    {
      match: "45",
      feedback: {
        en: "You started at 5 and added 4 ten times. But step 1 already has its 5 dots, so to reach step 10 you only add 4 nine more times.",
        zh: "你从 5 开始加了 10 次 4。可是第 1 步已经有 5 个点了，到第 10 步只需要再加 9 次 4。",
      },
    },
    {
      match: "37",
      feedback: {
        en: "37 is the number of dots in step 9. Grow it one more step!",
        zh: "37 是第 9 步的点数。再长一步！",
      },
    },
  ],
  explanation: {
    en: "Each step adds one dot to each of the 4 arms, so step n has 4 arms of n dots, plus the centre. Step 10 has 4 × 10 + 1 = 41 dots. You can also start from 5 and add 4 nine times: 5 + 36 = 41.",
    zh: "每一步，4 条胳膊各长出 1 个点，所以第 n 步有 4 条胳膊、每条 n 个点，再加中间 1 个。第 10 步是 4 × 10 + 1 = 41 个点。也可以从 5 开始加 9 次 4：5 + 36 = 41。",
  },
  aha: {
    en: "There's more than one way to see it: four arms plus a centre, or 5 dots and then 4 more at every step. Both ways land on 41, and both are right.",
    zh: "看法不止一种：四条胳膊加一个中心，或者先有 5 个点、以后每步加 4 个。两种看法都得到 41，而且都对。",
  },
  extension: {
    en: "How many dots are in step 100? Which step has exactly 201 dots? Is there any step with exactly 100 dots?",
    zh: "第 100 步有多少个点？哪一步正好有 201 个点？有没有哪一步正好有 100 个点？",
  },
  discussionPrompt: {
    en: "How did you SEE the plus sign: as arms, as rings around the middle, or something else? Describe it so someone else can picture it.",
    zh: "你是怎么「看」这个加号的：看成胳膊、看成围着中心的一圈一圈，还是别的？把你的看法说清楚，让别人也能想象出来。",
  },
  solutionTags: ["draw", "pattern", "table", "algebra"],
  funFact: {
    en: "When a pattern grows by the same amount every step, its graph is a straight line. Plot step number against dots on squared paper and see.",
    zh: "每一步都多出同样多的点，这种规律画成图是一条直线。把「第几步」和「几个点」画在方格纸上试试。",
  },
  sortOrder: 3,
  rubricNotes:
    "17/20 — hook 1, guess 2, hands-on 2, aha 1, floor 2, ceiling 2, paths 2, wrong 2, hints 2, retell 1: the hook has to show the first counts; the 'two ways to see it' aha is gentle rather than surprising",
};

/**
 * E10. Balanced ternary: with weights on both pans, 1, 3, 9, 27 reach every whole number 1..40.
 * The prompt asks for the longest unbroken run from 1 (with one pan only the run stops at 1),
 * because "the heaviest weight you can measure" would be 40 even without the second pan.
 */
export const fourWeights: HeroQuestionBlueprint = {
  slug: "four-weights",
  collection: "patterns-everywhere",
  kind: "PUZZLE",
  ageGroup: "AGE_12_14",
  difficulty: "HARD",
  category: "NUMBER_THEORY",
  title: { en: "Four Magic Weights", zh: "四个砝码能称多少" },
  hook: {
    en: "You have a two-pan balance and just four weights: 1, 3, 9 and 27 grams. A bag of sweets could weigh 1 gram, 2 grams, 3 grams and so on. How far up can you go without skipping a single number?",
    zh: "你有一架两边都能放东西的天平，和四个砝码：1 克、3 克、9 克、27 克。一袋糖可能是 1 克、2 克、3 克……一直往上。你能一克不漏地称到几克？",
  },
  guess: {
    type: "slider",
    min: 10,
    max: 81,
    step: 1,
    unit: { en: "grams", zh: "克" },
  },
  scene: { type: "balance_lab", mode: "weights", weights: [1, 3, 9, 27], target: 5 },
  prompt: {
    en: "Weights may go on either pan, including the pan with the sweets. Starting from 1 gram, what is the biggest weight you can reach so that every whole number of grams on the way can be weighed?",
    zh: "砝码放在哪一边都行，也可以和糖放在同一边。从 1 克开始往上，最多能称到几克，并且中间每一个整数克都能称出来？",
  },
  answer: { type: "NUMERIC", value: 40, unit: { en: "grams", zh: "克" } },
  hints: [
    { en: "Try 2 grams. You don't have a 2-gram weight, and 1 + 3 is too much. What if the 1-gram weight sits next to the sweets?", zh: "先试 2 克。你没有 2 克的砝码，1 + 3 又太多。如果把 1 克砝码和糖放在同一边呢？" },
    { en: "A weight next to the sweets works like a subtraction: 3 on one side and sweets + 1 on the other means the sweets weigh 3 − 1 = 2 grams. Now try 5, 6 and 7.", zh: "和糖放在同一边的砝码相当于做减法：一边放 3，另一边放糖和 1，糖就是 3 − 1 = 2 克。再试试 5、6、7。" },
    { en: "Each weight can be on the far pan (+), beside the sweets (−) or not used (0). What is the most you can make with every weight on the far pan, and is there any gap below that?", zh: "每个砝码可以放在对面（加）、放在糖旁边（减），或者不用（0）。全部放在对面最多是多少？比它小的数里有没有称不出来的？" },
  ],
  wrongAnswers: [
    {
      match: "27",
      feedback: {
        en: "27 is the biggest single weight, but you can use several weights at once. 27 + 1 already gives 28.",
        zh: "27 是最重的一个砝码，可是你可以同时用好几个。27 + 1 就已经是 28 了。",
      },
    },
    {
      match: "81",
      feedback: {
        en: "81 is the next weight in the pattern, 3 × 27, but you don't have it. Even with all four weights on one pan, the most you can balance is 1 + 3 + 9 + 27.",
        zh: "81 是规律里的下一个砝码（3 × 27），可是你手里没有它。就算四个砝码全放一边，最多也只能平衡 1 + 3 + 9 + 27。",
      },
    },
    {
      match: "1",
      feedback: {
        en: "If weights could only go on the far pan, 2 grams would be impossible and you'd stop at 1. But the balance has two pans: try putting a weight beside the sweets.",
        zh: "如果砝码只能放在对面，2 克就称不出来，只能停在 1 克。可是天平有两边：试试把砝码放在糖旁边。",
      },
    },
    {
      match: "13",
      feedback: {
        en: "1 + 3 + 9 = 13, and those three really can weigh everything up to 13. Now bring in the 27: what can 27 minus a few small weights make?",
        zh: "1 + 3 + 9 = 13，用这三个确实能称出 1 到 13 的每一个数。现在把 27 也用上：27 减去几个小砝码能得到多少？",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "Add up all four weights: nothing heavier than that can ever balance, wherever you put them.",
        zh: "把四个砝码加起来看看：比这个更重的东西，不管砝码怎么放都平衡不了。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "You can go further. At the number where you got stuck, try putting weights beside the sweets as well as on the far pan.",
        zh: "还能更往上。在你卡住的那个数，试试一边放砝码，糖旁边也放砝码。",
      },
    },
  ],
  explanation: {
    en: "A weight on the far pan adds, a weight beside the sweets subtracts, and an unused weight counts 0. With 1 and 3 you can make 1 to 4 (2 = 3 − 1), adding 9 reaches 13 (5 = 9 − 3 − 1), and adding 27 reaches 40 (14 = 27 − 9 − 3 − 1). All four weights add up to 40, so nothing heavier can balance, and the answer is 40.",
    zh: "放在对面的砝码是加，放在糖旁边的是减，不用的算 0。用 1 和 3 能称 1 到 4（2 = 3 − 1），加上 9 能到 13（5 = 9 − 3 − 1），再加上 27 能到 40（14 = 27 − 9 − 3 − 1）。四个砝码加起来正好 40 克，更重的就平衡不了，所以答案是 40。",
  },
  aha: {
    en: "Each weight has three jobs: add, subtract or sit out. That's why the weights grow by threes, the same idea as counting in base 3.",
    zh: "每个砝码有三种用法：加、减、不用。所以砝码是一个比一个大 3 倍，和三进制计数是同一个道理。",
  },
  extension: {
    en: "If weights could only go on the far pan, which four weights would let you weigh every amount from 1 to 15? Why does each one double the last? And what fifth weight would take 1, 3, 9, 27 past 40?",
    zh: "如果砝码只能放在对面，哪四个砝码能称出 1 到 15 的每一个数？为什么它们每个都是前一个的 2 倍？如果给 1、3、9、27 再加第五个砝码，让它称到 40 以上，应该加几克？",
  },
  discussionPrompt: {
    en: "How do you weigh exactly 5 grams? Say which weights go on which pan, and check that it balances.",
    zh: "怎么正好称出 5 克？说清楚哪个砝码放在哪一边，再检查一下是不是平衡。",
  },
  solutionTags: ["guess_check", "table", "pattern", "algebra"],
  funFact: {
    en: "This puzzle is more than 400 years old: a French mathematician named Bachet put it in a book of number puzzles in 1612.",
    zh: "这道题已经有 400 多年历史了：1612 年，法国数学家巴歇把它写进了一本数学趣题书。",
  },
  sortOrder: 10,
  rubricNotes:
    "16/20 — hook 1, guess 2, hands-on 2, aha 2, floor 1, ceiling 2, paths 1, wrong 2, hints 2, retell 1: the weights are the hook so it opens with numbers; the subtraction idea is a real hurdle, and the main path is build-up-and-check",
};

export const PATTERNS_EVERYWHERE: readonly HeroQuestionBlueprint[] = [towerOfHanoi, growingPlus, fourWeights];
