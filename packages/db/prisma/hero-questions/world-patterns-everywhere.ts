/**
 * World E · Patterns everywhere (`patterns-everywhere`). Catalog: 02-hero-question-catalog.md §E.
 * Batch 2: E1 tower-of-hanoi, E3 growing-plus, E10 four-weights.
 * Editorial pass 1: hooks trimmed to three sentences and kept off leading numbers; E10 gained a
 * story with tension and uses the scene's words (object, other pan, object's pan).
 * Batch 4: E2 staircase-ways (staircase_paths), E4 pascal-row-sum (pascal_triangle), E5 tetris-shapes
 * and E6 star-strokes (illustration until polyomino_builder / star_drawer exist), E7 calendar-square
 * (calendar_grid; this world's third AGE_8_10 question), E8 cicada-primes (cycle_timeline; upgrades the
 * legacy "Cicada Underground Mystery" row), E9 frog-swap (frog_puzzle).
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
    en: "A tower of discs sits on one of three pegs, biggest at the bottom. You may move one disc at a time, and a bigger disc may never sit on a smaller one. How few moves would it take to move a four-disc tower to another peg?",
    zh: "三根柱子，其中一根上套着一座圆盘塔，大的在下，小的在上。一次只能搬一个圆盘，大的永远不能压在小的上面。把四个盘的塔搬到另一根柱子上，最少要几步？",
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
    en: "Warm up with 3 discs in the scene, then press \"Add a disc (4)\". How few moves does it take to move a tower of 4 discs to another peg?",
    zh: "先在场景里搬 3 个盘热热身，再点「再加一个盘（4）」。把 4 个圆盘的塔搬到另一根柱子上，最少要搬几步？",
  },
  answer: { type: "NUMERIC", value: 15 },
  hints: [
    { en: "Start tiny, in your head: how many moves for 1 disc? For 2 discs? Then solve 3 discs in the scene and look at the \"moves\" counter.", zh: "先在脑子里从最小的开始：1 个盘要几步？2 个盘呢？再在场景里搬 3 个盘，看看「步数」是多少。" },
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
    en: "A plus sign made of dots grows at every step, as if someone keeps stretching its arms. Look at the first three steps in the picture and work out how it grows. Without drawing them all, can you say how many dots step 10 will have?",
    zh: "一个用点排成的加号，每一步都长大一点，好像有人在拉长它的胳膊。看看图里的前三步，它是怎么长的？不把每一步都画出来，你能说出第 10 步有几个点吗？",
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
    { en: "Look at the picture, not just the numbers. Press \"By arms\" to colour each arm. Which dots are new in step 2 compared with step 1? Where did they appear?", zh: "别只看数字，看图。点「按胳膊着色」，给每条胳膊涂上颜色。第 2 步比第 1 步多出了哪些点？它们长在哪里？" },
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
    en: "Four arms of n dots plus one centre: step n always has 4n + 1 dots, however you choose to see it. Now step 100 is easy, 401 dots, and you never had to draw one.",
    zh: "四条胳膊各 n 个点，再加一个中心：不管你怎么看，第 n 步总是 4n + 1 个点。现在第 100 步也难不倒你了：401 个点，一个都不用画。",
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
    "18/20 — hook 2, guess 2, hands-on 2, aha 1, floor 2, ceiling 2, paths 2, wrong 2, hints 2, retell 1: the hook now lets the picture give the counts; a linear rule is still gentle rather than surprising, though 'step 100 without drawing' helps",
};

/**
 * E10. Balanced ternary: with weights on both pans, 1, 3, 9, 27 reach every whole number 1..40.
 * The prompt asks for the longest unbroken run from 1 (with one pan only the run stops at 1),
 * because "the heaviest weight you can measure" would be 40 even without the second pan.
 * The scene calls the sweets the "object" and the pans "other pan" / "object's pan"
 * (对面盘 / 物品这边); the copy uses those words in the hints.
 * Extension answers: one pan only needs 1, 2, 4, 8 for 1-15 (binary); a fifth weight of 81 reaches 121.
 */
export const fourWeights: HeroQuestionBlueprint = {
  slug: "four-weights",
  collection: "patterns-everywhere",
  kind: "PUZZLE",
  ageGroup: "AGE_12_14",
  difficulty: "HARD",
  category: "NUMBER_THEORY",
  title: { en: "The Shopkeeper's Four Weights", zh: "糖果店的四个砝码" },
  hook: {
    en: "A sweet-shop owner has lost all her weights but four: 1, 3, 9 and 27 grams. A customer wants exactly 2 grams of sweets, yet she smiles and says she can weigh every whole number of grams up to a surprising amount. How far can she go without skipping one?",
    zh: "糖果店老板娘的砝码丢得只剩四个：1 克、3 克、9 克、27 克。客人要正好 2 克糖，她却笑着说：从 1 克往上，她能一克不漏地称到一个让你吃惊的数。她最多能称到几克？",
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
    { en: "Try 2 grams. You don't have a 2-gram weight, and 1 + 3 is too much. In the scene, tap the 1-gram weight until it moves to the \"object's pan\", next to the sweets. What happens?", zh: "先试 2 克。你没有 2 克的砝码，1 + 3 又太多。在场景里点 1 克砝码，直到它跑到「物品这边」，和糖放在一起。会怎样？" },
    { en: "A weight next to the sweets works like a subtraction: 3 on the other pan and sweets + 1 on this one means the sweets weigh 3 − 1 = 2 grams. Now try 5, 6 and 7.", zh: "和糖放在同一边的砝码相当于做减法：对面盘放 3，这边放糖和 1，糖就是 3 − 1 = 2 克。再试试 5、6、7。" },
    { en: "Each weight can be on the other pan (+), beside the sweets (−) or not used (0). What is the most you can make with every weight on the other pan, and is there any gap below that?", zh: "每个砝码可以放在对面盘（加）、放在糖旁边（减），或者不用（0）。全部放在对面盘最多是多少？比它小的数里有没有称不出来的？" },
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
        en: "81 is the next weight in the pattern, 3 × 27, but she doesn't have it. Even with all four weights on one pan, the most you can balance is 1 + 3 + 9 + 27.",
        zh: "81 是规律里的下一个砝码（3 × 27），可是老板娘手里没有它。就算四个砝码全放一边，最多也只能平衡 1 + 3 + 9 + 27。",
      },
    },
    {
      match: "1",
      feedback: {
        en: "If weights could only go on the other pan, 2 grams would be impossible and you'd stop at 1. But the balance has two pans: try putting a weight beside the sweets.",
        zh: "如果砝码只能放在对面盘，2 克就称不出来，只能停在 1 克。可是天平有两边：试试把砝码放在糖旁边。",
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
        en: "You can go further. At the number where you got stuck, try putting weights beside the sweets as well as on the other pan.",
        zh: "还能更往上。在你卡住的那个数，试试对面盘放砝码，糖旁边也放砝码。",
      },
    },
  ],
  explanation: {
    en: "A weight on the other pan adds, a weight beside the sweets subtracts, and an unused weight counts 0. With 1 and 3 you can make 1 to 4 (2 = 3 − 1), adding 9 reaches 13 (5 = 9 − 3 − 1), and adding 27 reaches 40 (14 = 27 − 9 − 3 − 1). All four weights add up to 40, so nothing heavier can balance, and the answer is 40.",
    zh: "放在对面盘的砝码是加，放在糖旁边的是减，不用的算 0。用 1 和 3 能称 1 到 4（2 = 3 − 1），加上 9 能到 13（5 = 9 − 3 − 1），再加上 27 能到 40（14 = 27 − 9 − 3 − 1）。四个砝码加起来正好 40 克，更重的就平衡不了，所以答案是 40。",
  },
  aha: {
    en: "Each weight has three jobs: add, subtract or sit out. That's why the weights grow by threes, the same idea as counting in base 3, and four weights cover all 40 numbers with no gaps.",
    zh: "每个砝码有三种用法：加、减、不用。所以砝码一个比一个大 3 倍，和三进制计数是同一个道理，四个砝码就把 1 到 40 一个不漏地全包了。",
  },
  extension: {
    en: "If weights could only go on the other pan, which four weights would let you weigh every amount from 1 to 15? Why does each one double the last? And what fifth weight would take 1, 3, 9, 27 past 40, and how far?",
    zh: "如果砝码只能放在对面盘，哪四个砝码能称出 1 到 15 的每一个数？为什么它们每个都是前一个的 2 倍？如果给 1、3、9、27 再加第五个砝码，让它称到 40 以上，应该加几克？能称到多少？",
  },
  discussionPrompt: {
    en: "How do you weigh exactly 5 grams? Say which weights go on which pan, and check that it balances. Did anyone find a different way?",
    zh: "怎么正好称出 5 克？说清楚哪个砝码放在哪一边，再检查一下是不是平衡。有没有人找到不一样的放法？",
  },
  solutionTags: ["guess_check", "table", "pattern", "algebra"],
  funFact: {
    en: "This puzzle is more than 400 years old: a French mathematician named Bachet put it in a book of number puzzles in 1612.",
    zh: "这道题已经有 400 多年历史了：1612 年，法国数学家巴歇把它写进了一本数学趣题书。",
  },
  sortOrder: 10,
  rubricNotes:
    "17/20 — hook 2, guess 2, hands-on 2, aha 2, floor 1, ceiling 2, paths 1, wrong 2, hints 2, retell 1: the shopkeeper story gives the hook a problem to solve before the numbers; the subtraction idea is still a real hurdle, and the main path is build-up-and-check; the scene's '/40' progress bar gives the target away (scene issue)",
};

/**
 * E2. Climbing n stairs in strides of 1 or 2: W(n) = W(n − 1) + W(n − 2), so 10 stairs have 89 ways.
 * The scene is playable up to 6 stairs and its table shows found/total for 1-6 (1, 2, 3, 5, 8, 13);
 * the question asks about askN = 10, which the reveal builds term by term.
 * Second path: count by the number of 2-strides, C(10,0) + C(9,1) + C(8,2) + C(7,3) + C(6,4) + C(5,5) = 89.
 * Extension answer: strides of 1, 2 or 3 give 274 ways up 10 stairs.
 */
export const staircaseWays: HeroQuestionBlueprint = {
  slug: "staircase-ways",
  collection: "patterns-everywhere",
  kind: "PATTERN",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "ALGEBRA",
  title: { en: "Up the Stairs, Every Way", zh: "上楼梯有几种走法" },
  hook: {
    en: "You're running up a staircase, and each stride takes you up either one stair or two. Three stairs can be climbed in three different ways: 1 + 1 + 1, 1 + 2 or 2 + 1. How many different ways are there to climb ten stairs?",
    zh: "你跑着上楼梯，每一步要么上 1 级，要么上 2 级。3 级楼梯有 3 种走法：1 + 1 + 1、1 + 2、2 + 1。10 级楼梯一共有几种走法？",
  },
  guess: {
    type: "slider",
    min: 10,
    max: 200,
    step: 1,
    unit: { en: "ways", zh: "种" },
  },
  scene: { type: "staircase_paths", steps: 4, maxHop: 2, askN: 10, ways: 89 },
  prompt: {
    en: "Each stride goes up 1 stair or 2 stairs, and the order of the strides matters (1 + 2 and 2 + 1 are different ways). How many different ways are there to climb a staircase of 10 stairs?",
    zh: "每一步上 1 级或 2 级，步子的先后顺序不同就算不同的走法（1 + 2 和 2 + 1 是两种）。10 级楼梯一共有几种不同的走法？",
  },
  answer: { type: "NUMERIC", value: 89, unit: { en: "ways", zh: "种" } },
  hints: [
    { en: "Ten stairs is too many to list, so start small. Use − and + to pick 1, 2, 3, 4 stairs, climb them with \"+1 step\" and \"+2 steps\", and read how many ways each one has in the row of counts.", zh: "10 级太多，列不完，先从小的开始。用 − 和 + 选 1、2、3、4 级楼梯，用「上 1 级」「上 2 级」爬上去，看那一排计数里每种楼梯有几种走法。" },
    { en: "Write the counts in a row: 1, 2, 3, 5, 8, … Look at any number and the two just before it. How do you get it from them?", zh: "把这些数排成一行：1、2、3、5、8……随便挑一个数，看看它前面紧挨着的两个数。它是怎么从这两个数变来的？" },
    { en: "Your last stride lands on the top stair from either one stair below or two stairs below. So the ways for 10 stairs = the ways for 9 + the ways for 8. Keep adding pairs until you reach 10.", zh: "最后一步要么从下面 1 级跨上来，要么从下面 2 级跨上来。所以 10 级的走法 = 9 级的走法 + 8 级的走法。两个两个地往上加，一直加到 10 级。" },
  ],
  wrongAnswers: [
    {
      match: "10",
      feedback: {
        en: "Ten is the number of stairs, and taking them one at a time is just one of the ways. Strides of 2 can go in many different places, too.",
        zh: "10 是楼梯的级数，一级一级地走只是其中一种走法。跨 2 级的那几步还可以放在很多不同的位置。",
      },
    },
    {
      match: "55",
      feedback: {
        en: "55 is the number of ways for 9 stairs: you stopped one stair early. Add one more pair: the ways for 9 and for 8 stairs.",
        zh: "55 是 9 级楼梯的走法数，你少走了一级。再往上加一次：把 9 级和 8 级的走法加起来。",
      },
    },
    {
      match: "144",
      feedback: {
        en: "144 is the answer for 11 stairs, one too many. Check your list again: 3 stairs have 3 ways, 4 stairs have 5.",
        zh: "144 是 11 级楼梯的答案，多走了一级。再对一下你的表：3 级有 3 种，4 级有 5 种。",
      },
    },
    {
      match: "1024",
      feedback: {
        en: "You gave every stair two choices, so 2 × 2 × … × 2 = 1024. But a stride of 2 skips a stair, so stairs can't each choose on their own.",
        zh: "你让每一级都有两种选择，于是 10 个 2 相乘是 1024。可是跨 2 级的时候会跳过一级，不是每一级都能自己选。",
      },
    },
    {
      match: "20",
      feedback: {
        en: "You did 10 × 2, as if each stair added two new ways. The counts grow faster than that: 4 stairs already have 5 ways and 6 stairs have 13.",
        zh: "你算的是 10 × 2，好像每多一级就多 2 种。其实走法长得比这快：4 级就有 5 种，6 级有 13 种。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "That's too few. Just 6 stairs already have 13 ways (look at the row of counts), and every extra stair adds the two counts before it.",
        zh: "太少了。光是 6 级楼梯就有 13 种走法（看那一排计数），每多一级，都要把前面两个数加起来。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "That's too many. Build the list up from the bottom: each count is the sum of the two before it, 1, 2, 3, 5, 8, …, and stop at 10 stairs.",
        zh: "太多了。从下往上一个个算：每个数都是前两个数的和，1、2、3、5、8……算到 10 级就停。",
      },
    },
  ],
  explanation: {
    en: "Call the number of ways to climb n stairs W(n). The last stride starts either one stair below the top or two stairs below it, so W(n) = W(n − 1) + W(n − 2). Starting from W(1) = 1 and W(2) = 2, the counts go 3, 5, 8, 13, 21, 34, 55, 89. So there are 89 ways to climb 10 stairs.",
    zh: "把爬 n 级楼梯的走法数记作 W(n)。最后一步要么是从顶层下面 1 级跨上来的，要么是从下面 2 级跨上来的，所以 W(n) = W(n − 1) + W(n − 2)。从 W(1) = 1、W(2) = 2 开始，往下依次是 3、5、8、13、21、34、55、89。所以 10 级楼梯有 89 种走法。",
  },
  aha: {
    en: "Every count is the sum of the two before it: the same Fibonacci numbers as the rabbits and the sunflowers. You never have to list all 89 ways, just add two numbers at a time.",
    zh: "每个数都是前两个数的和：又是兔子和向日葵里的斐波那契数。89 种走法一种都不用列，只要两个两个地加。",
  },
  extension: {
    en: "What if you can also take three stairs in one giant stride? How many ways are there to climb 10 stairs now, and what is the new rule?",
    zh: "如果还能一大步跨 3 级呢？现在 10 级楼梯有几种走法？新的规律是什么？",
  },
  discussionPrompt: {
    en: "Did you list the ways one by one, or did you spot the pattern? At how many stairs did you first see it, and how did you know it would keep going?",
    zh: "你是一种一种列出来的，还是找到了规律？在第几级楼梯第一次发现的？你怎么知道它会一直这样下去？",
  },
  solutionTags: ["simulate", "table", "pattern", "algebra"],
  funFact: {
    en: "Poets in ancient India counted these patterns more than a thousand years ago. They wanted to know how many rhythms a line could have when made of short beats and long, double-length beats.",
    zh: "一千多年前，古印度的诗人就数过这样的规律。他们想知道：一行诗由短音和长音（长音占两拍）组成时，一共能有多少种节奏。",
  },
  sortOrder: 2,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 1, floor 2, ceiling 2, paths 2, wrong 2, hints 2, retell 1: listing small staircases, the last-stride recurrence and counting by the number of 2-strides are all real paths; kids who did fibonacci-next will see Fibonacci coming, and the scene's count row (1-6 stairs) shows the first six terms once they are found",
};

/**
 * E4. Row r of Pascal's triangle adds up to 2^r (the top row is row 0), so row 10 adds up to 1024.
 * The scene's "sum" column shows each row's total once the row is filled; "Colour: evens" draws
 * Sierpinski's triangle. Extension answer: the shallow diagonals add up to 1, 1, 2, 3, 5, 8, … (Fibonacci).
 */
export const pascalRowSum: HeroQuestionBlueprint = {
  slug: "pascal-row-sum",
  collection: "patterns-everywhere",
  kind: "PATTERN",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "ARITHMETIC",
  title: { en: "The Triangle's Secret", zh: "三角形里的秘密" },
  hook: {
    en: "Build a triangle of numbers with ones all down both edges, where every other number is the sum of the two just above it. Now add up each row. What happens to the row totals as the triangle grows?",
    zh: "搭一个数字三角形：两条斜边上全是 1，中间每个数都等于它正上方两个数的和。现在把每一行加起来。三角形越长越大，每一行的和会怎么变？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "55", en: "Row 10 adds up to about 55", zh: "第 10 行的和大约是 55" },
      { id: "100", en: "Row 10 adds up to about 100", zh: "第 10 行的和大约是 100" },
      { id: "512", en: "Row 10 adds up to about 500", zh: "第 10 行的和大约是 500" },
      { id: "1024", en: "Row 10 adds up to about 1,000", zh: "第 10 行的和大约是 1000" },
    ],
  },
  scene: { type: "pascal_triangle", rows: 10, prefilled: 3, askRow: 10, rowSum: 1024 },
  prompt: {
    en: "Call the single 1 at the very top row 0, so the row below it (1, 1) is row 1. What do the numbers in row 10 add up to?",
    zh: "把最顶上那个单独的 1 叫作第 0 行，它下面的 1、1 是第 1 行。第 10 行所有的数加起来是多少？",
  },
  answer: { type: "NUMERIC", value: 1024 },
  hints: [
    { en: "Fill a few more rows with \"Fill a row\" and watch the \"sum\" column on the right. Write the totals down: 1, 2, 4, … What comes next?", zh: "用「填一整行」再多填几行，看右边那一列「和」。把每行的和记下来：1、2、4……下一个是几？" },
    { en: "Each total is double the one before. Why? Every number is used twice when the next row is built: once for the number below on its left and once for the number below on its right.", zh: "每一行的和都是上一行的 2 倍。为什么？搭下一行的时候，每个数都被用了两次：一次给左下方的数，一次给右下方的数。" },
    { en: "Row 0 adds up to 1, and every row doubles it once. Row 10 is ten doublings from the top: 2 × 2 × 2 × … with ten 2s.", zh: "第 0 行的和是 1，每往下一行就翻一倍。第 10 行离顶上翻了 10 次：10 个 2 相乘。" },
  ],
  wrongAnswers: [
    {
      match: "512",
      feedback: {
        en: "512 is the total of row 9. You probably called the top 1 \"row 1\", but here the top is row 0, so you need one more doubling.",
        zh: "512 是第 9 行的和。你大概把顶上的 1 当成了第 1 行，可这里顶上是第 0 行，所以还要再翻一倍。",
      },
    },
    {
      match: "2048",
      feedback: {
        en: "2048 is the total of row 11, one doubling too many. Row 1 (1, 1) adds up to 2, row 2 adds up to 4: row 10 is ten doublings of 1.",
        zh: "2048 是第 11 行的和，多翻了一倍。第 1 行（1、1）的和是 2，第 2 行是 4：第 10 行是 1 翻了 10 次。",
      },
    },
    {
      match: "252",
      feedback: {
        en: "252 is the biggest number in row 10, the one in the middle. The question asks for the whole row added together.",
        zh: "252 是第 10 行里最大的那个数，就在正中间。题目要的是一整行加起来的和。",
      },
    },
    {
      match: "55",
      feedback: {
        en: "55 is 1 + 2 + … + 10, as if each row added just one more. Check the sum column: the totals 1, 2, 4, 8 are doubling, not going up by one.",
        zh: "55 是 1 + 2 + … + 10，好像每行只多一点点。看看「和」那一列：1、2、4、8 是在翻倍，不是每次加 1。",
      },
    },
    {
      match: "20",
      feedback: {
        en: "You added 2 for every row. But the totals don't go up by 2: they go 1, 2, 4, 8, 16, each one twice the one before.",
        zh: "你每一行加了 2。可是每行的和不是每次多 2，而是 1、2、4、8、16，每个都是前一个的 2 倍。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "That's too small. Row 8 alone already adds up to 256, and every row after it doubles.",
        zh: "太小了。光是第 8 行的和就已经是 256，后面每一行还要再翻倍。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "That's too big. Count the doublings carefully: from row 0 to row 10 is exactly ten of them.",
        zh: "太大了。仔细数一数翻了几次：从第 0 行到第 10 行，正好翻 10 次。",
      },
    },
  ],
  explanation: {
    en: "When the next row is built, each number is added into two numbers below it, one on the left and one on the right. So everything in a row is counted twice in the row below, and each row adds up to exactly double the row above: 1, 2, 4, 8, 16, … Row 10 is ten doublings from row 0, and ten 2s multiplied together make 1024.",
    zh: "搭下一行的时候，每个数都会加进它下面的两个数里，一个在左下，一个在右下。所以一行里的每个数，到了下一行都被算了两次，每一行的和正好是上一行的 2 倍：1、2、4、8、16……第 10 行离第 0 行翻了 10 次，10 个 2 相乘是 1024。",
  },
  aha: {
    en: "Every number is passed down to two children, so every row exactly doubles. Press \"Colour: evens\" and a triangle full of triangle-shaped holes appears.",
    zh: "每个数都传给下面两个「孩子」，所以每一行正好翻倍。再点「涂色：偶数」，会冒出一个满是三角形窟窿的三角形。",
  },
  extension: {
    en: "Add up the numbers along the shallow diagonals (start at a 1 on the left edge and go up and to the right, one step over each time). Which famous sequence appears? Can you see why?",
    zh: "沿着浅斜线把数加起来（从左边的一个 1 开始，每次往右上方斜着走）。会出现哪一串有名的数？你能看出为什么吗？",
  },
  discussionPrompt: {
    en: "What picture did you get when you coloured the even numbers? Describe it, and say what happens to the picture if you add more and more rows.",
    zh: "把偶数涂上颜色以后，你看到了什么图案？描述一下。如果一行一行继续往下加，这个图案会怎样？",
  },
  solutionTags: ["table", "pattern", "draw", "algebra"],
  funFact: {
    en: "In China this is called Yang Hui's triangle, after a mathematician who wrote about it in 1261. That was more than 350 years before Blaise Pascal was born.",
    zh: "在中国，它叫杨辉三角：南宋数学家杨辉在 1261 年的书里就写过它。那比帕斯卡出生早了 350 多年。",
  },
  sortOrder: 4,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: filling rows and reading the sum column is the main path, the 'each number is used twice' argument explains it rather than finding it; the sum column gives row 10's total once a child fills every row, so the guess has to come first",
};

/**
 * E5. One-sided tetrominoes (turning allowed, flipping not): I, O, T, S, Z, L, J = 7.
 * Illustration until the T3 `polyomino_builder` scene lands (待替换为 polyomino_builder).
 * Extension answer: pentominoes, 18 one-sided (turn only) and 12 free (flipping allowed).
 */
export const tetrisShapes: HeroQuestionBlueprint = {
  slug: "tetris-shapes",
  collection: "patterns-everywhere",
  kind: "PUZZLE",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "GEOMETRY",
  title: { en: "Four Squares, How Many Shapes?", zh: "四个方块能拼几种" },
  hook: {
    en: "Snap four identical squares together, edge to edge, like the pieces in a falling-block game. You may turn a shape around, but you may not flip it over like a pancake. How many different shapes can you make?",
    zh: "把四个一样的小正方形边贴边拼在一起，就像俄罗斯方块里的那些块。拼好的形状可以转，但不能像翻烙饼那样翻过来。一共能拼出几种不同的形状？",
  },
  guess: {
    type: "slider",
    min: 3,
    max: 15,
    step: 1,
    unit: { en: "shapes", zh: "种" },
  },
  scene: {
    type: "illustration",
    asset: "tetris-shapes",
    caption: {
      en: "Four squares joined edge to edge. Two shapes found so far: the square and the straight line. How many more?",
      zh: "四个正方形边贴边拼起来。已经找到两种：大正方形和一字长条。还有几种？",
    },
    revealAsset: "tetris-shapes-reveal",
    revealCaption: {
      en: "All seven: I, O, T, S, Z, L and J. S and Z are mirror twins, and so are L and J: without flipping, each twin is its own shape.",
      zh: "一共七种：I、O、T、S、Z、L、J。S 和 Z 互为镜像，L 和 J 也是：不许翻面，镜像就算两种。",
    },
  },
  prompt: {
    en: "Squares must touch along whole edges, not just at corners. Shapes that are the same after turning count once; mirror images count as different, because you can't flip. How many different shapes are there?",
    zh: "正方形要整条边贴在一起，不能只碰到角。转一转就一样的形状只算一种；镜像算不同的形状，因为不能翻面。一共有几种不同的形状？",
  },
  answer: { type: "NUMERIC", value: 7, unit: { en: "shapes", zh: "种" } },
  hints: [
    { en: "The picture already shows two: the straight line and the 2 × 2 square. Grab squared paper and sort the rest by their longest row: is it 3 squares, or only 2?", zh: "图里已经有两种了：一字长条和 2 × 2 的大正方形。拿一张方格纸，把剩下的按「最长的一排有几个」来分：是 3 个，还是只有 2 个？" },
    { en: "Three in a row, with the fourth square stuck on: in the middle it makes a T, at one end it makes an L. Now stick it on the other side of that end. Is that the same L turned around, or its mirror image?", zh: "三个排成一排，第四个贴上去：贴在中间是 T，贴在一头是 L。再把它贴到那一头的另一边试试。这是把 L 转了一下，还是 L 的镜像？" },
    { en: "Last family: two squares in a row with two more shifted over by one, like a step. Draw it stepping up to the right and stepping up to the left. Now add up the line, the square, the three-in-a-row family and the steps.", zh: "最后一类：两个一排，另外两个错开一格摞上去，像台阶。分别画往右上走和往左上走的台阶。再把长条、大正方形、「三个一排」那一类和台阶加起来。" },
  ],
  wrongAnswers: [
    {
      match: "5",
      feedback: {
        en: "You counted L and J as the same shape, and S and Z too. That's right if you may flip pieces over, but here you can only turn them, so each mirror twin counts separately.",
        zh: "你把 L 和 J 算成了一种，S 和 Z 也算成了一种。如果允许翻面，这样是对的；可这里只能转不能翻，所以镜像要分开算。",
      },
    },
    {
      match: "6",
      feedback: {
        en: "So close! You found one mirror twin but missed the other. Check the L and the zigzag: draw each one, then draw its reflection in a mirror.",
        zh: "很接近了！你找到了一对镜像，漏了另一对。检查一下 L 形和台阶形：各画一个，再画出它在镜子里的样子。",
      },
    },
    {
      match: "19",
      feedback: {
        en: "You counted every turned position as a new shape: there really are 19 of those. But turning a shape doesn't make it a new one, so group the positions that are the same shape.",
        zh: "你把每一种转法都算成了新形状，那样确实有 19 种。可是转一转不算新形状，把转来转去其实一样的归成一组。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "There are more. Besides the line and the square, try three squares in a row with the fourth one stuck on in different places, and the step-shaped zigzag.",
        zh: "还有更多。除了长条和大正方形，试试三个一排、第四个贴在不同的位置，还有像台阶一样的形状。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "Some of your shapes are probably the same one turned around. Cut them out of paper and rotate them on the table: which ones match?",
        zh: "你的形状里大概有几个只是同一个转了方向。把它们用纸剪下来，在桌上转一转：哪些能重合？",
      },
    },
  ],
  explanation: {
    en: "Sort the shapes by their longest row. Four in a row gives the line, I. Three in a row plus one more gives T, L and J, where L and J are mirror images that count separately because you can't flip them. Longest row of two gives the square O and the two zigzags, S and Z, so there are 1 + 3 + 3 = 7 shapes.",
    zh: "按最长的一排有几个来分。四个一排：长条 I。三个一排再加一个：T、L、J，其中 L 和 J 互为镜像，不能翻面，所以分开算。最长一排只有两个：大正方形 O，还有两种台阶 S 和 Z，所以一共 1 + 3 + 3 = 7 种。",
  },
  aha: {
    en: "Turning never makes a new shape, but a mirror image does when you can't flip: L and J, S and Z are twins. That's exactly why the falling-block game has seven pieces.",
    zh: "转一转永远不会变出新形状，可是不许翻面的时候，镜像就是新形状：L 和 J、S 和 Z 是一对对双胞胎。这正是俄罗斯方块只有七种块的原因。",
  },
  extension: {
    en: "Five squares make pentominoes. How many different ones are there if you may turn them but not flip them? How many if flipping is allowed?",
    zh: "五个方块拼成的叫五连块。只许转、不许翻，有几种？允许翻面的话，又有几种？",
  },
  discussionPrompt: {
    en: "Which shape did you miss at first? Why do you think that one is easy to miss, and what system would make sure you never miss one?",
    zh: "你一开始漏掉的是哪一种？为什么它容易漏？用什么办法能保证一个都不漏？",
  },
  solutionTags: ["draw", "guess_check", "table"],
  funFact: {
    en: "Tetris was created in 1984 by Alexey Pajitnov, a computer scientist in Moscow. Shapes made of four squares are called tetrominoes, from the Greek word for four.",
    zh: "俄罗斯方块是 1984 年由莫斯科的电脑科学家阿列克谢·帕基特诺夫发明的。四个方块拼成的形状叫「四连块」，英文名来自希腊语里的「四」。",
  },
  sortOrder: 5,
  rubricNotes:
    "17/20 — hook 2, guess 2, hands-on 1, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: illustration only (待替换为 polyomino_builder), so the hands-on part is squared paper; one real path (sort by longest row); the mirror-twin rule is the surprise, and 5 vs 7 vs 19 feedback names the three classic counting slips",
};

/**
 * E6. Star polygons: n dots, join every k-th dot; the number of separate shapes is gcd(n, k).
 * 6 dots, every 2nd: gcd 2, two triangles. Illustration until the T3 `star_drawer` scene lands
 * (待替换为 star_drawer). Extension answers: 8 dots every 3rd: one stroke (gcd 1, an 8-pointed star);
 * 12 dots every 3rd: three squares (gcd 3).
 */
export const starStrokes: HeroQuestionBlueprint = {
  slug: "star-strokes",
  collection: "patterns-everywhere",
  kind: "PATTERN",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "GEOMETRY",
  title: { en: "The One-Stroke Star", zh: "一笔画星星" },
  hook: {
    en: "Put five dots evenly around a circle and join every second dot: one pencil line draws a perfect star and ends right where it began. Now try six dots, still joining every second one. Can you still draw it without lifting your pencil?",
    zh: "在圆上均匀地点 5 个点，每隔一个点连一条线：一笔就画出一颗漂亮的五角星，最后正好回到起点。换成 6 个点，还是每隔一个点连。还能一笔画完吗？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "one", en: "Yes, one stroke draws it all", zh: "能，一笔就画完" },
      { id: "two", en: "No, it splits into two shapes", zh: "不能，会分成两个形状" },
      { id: "three", en: "No, it splits into three shapes", zh: "不能，会分成三个形状" },
    ],
  },
  scene: {
    type: "illustration",
    asset: "star-strokes",
    caption: {
      en: "Five dots, every second one joined: a star in one stroke. Six dots: what will the pencil draw?",
      zh: "5 个点，每隔一个连一条线：一笔画出星星。6 个点呢？铅笔会画出什么？",
    },
    revealAsset: "star-strokes-reveal",
    revealCaption: {
      en: "Six dots, every second one: the line closes a triangle after three dots. The other three dots make a second triangle, so the pencil has to lift once.",
      zh: "6 个点每隔一个连：连了 3 个点就回到起点，成了一个三角形。剩下 3 个点是第二个三角形，所以铅笔得抬起来一次。",
    },
  },
  prompt: {
    en: "Six dots sit evenly around a circle. Starting anywhere, join every second dot (skip one each time) until you're back where you started, then do the same from any dot you haven't touched yet. How many separate shapes do you draw?",
    zh: "圆上均匀地放着 6 个点。从任意一个点出发，每隔一个点连一条线（每次跳过一个点），直到回到起点；如果还有没碰到的点，就从那里再这样连一遍。一共画出几个分开的形状？",
  },
  answer: { type: "NUMERIC", value: 2, unit: { en: "shapes", zh: "个" } },
  hints: [
    { en: "Draw it on paper. Number the six dots 1 to 6 around the circle like a clock and start at dot 1. Every second dot means 1 → 3 → … Where does your pencil end up?", zh: "在纸上画一画。像钟面一样把 6 个点编上 1 到 6，从 1 号点出发。每隔一个点就是 1 → 3 → ……铅笔最后到了哪里？" },
    { en: "1 → 3 → 5 → 1 makes a triangle and comes back home, but dots 2, 4 and 6 were never touched. What do they make if you join them the same way?", zh: "1 → 3 → 5 → 1 连成一个三角形，回到了起点，可 2、4、6 号点一次都没碰到。用同样的办法把它们连起来，会是什么？" },
    { en: "Jumping two dots at a time, you only ever land on the odd dots or only on the even dots, so the six dots split into two teams of three. Compare five dots: why can't they split into teams?", zh: "每次跳两个点，你要么只踩奇数号的点，要么只踩偶数号的点，所以 6 个点分成了两队，每队 3 个。再想想 5 个点：为什么它们分不成队？" },
  ],
  wrongAnswers: [
    {
      match: "1",
      feedback: {
        en: "The five-dot star does go round in one stroke, but with six dots the pencil gets home after only three dots: 1 → 3 → 5 → 1. Dots 2, 4 and 6 are still waiting.",
        zh: "5 个点的星星确实一笔就能画完，可是 6 个点时，铅笔只走了 3 个点就回到了起点：1 → 3 → 5 → 1。2、4、6 号点还没连呢。",
      },
    },
    {
      match: "3",
      feedback: {
        en: "Three shapes is what you get when you join every THIRD dot (1 → 4 → 1, three separate lines). Joining every second dot skips just one dot each time.",
        zh: "每隔两个点连（1 → 4 → 1），才会得到 3 条分开的线。每隔一个点连，每次只跳过一个点。",
      },
    },
    {
      match: "6",
      feedback: {
        en: "Six is the number of dots, not shapes. Each shape uses several dots: follow your pencil and count how many times it has to start again.",
        zh: "6 是点的个数，不是形状的个数。每个形状都要用好几个点：跟着铅笔走，数一数它要重新起笔几次。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "That's too many. Each shape here is a triangle that uses three dots, and there are only six dots to share.",
        zh: "太多了。这里每个形状都是用掉 3 个点的三角形，而一共只有 6 个点。",
      },
    },
  ],
  explanation: {
    en: "Number the dots 1 to 6 and join every second one: 1 → 3 → 5 → 1 closes a triangle after only three dots. Dots 2, 4 and 6 are still untouched, and joining them the same way makes a second triangle. So you draw 2 separate triangles, which together look like a six-pointed star.",
    zh: "把点编上 1 到 6，每隔一个连一条线：1 → 3 → 5 → 1，只连了 3 个点就围成了一个三角形。2、4、6 号点还没碰过，用同样的办法连起来，是第二个三角形。所以一共画出 2 个分开的三角形，合在一起像一颗六角星。",
  },
  aha: {
    en: "Six and two share a factor of 2, so the dots split into 2 teams and the pencil must lift once. Five and two share nothing, so the line visits every dot before it gets home.",
    zh: "6 和 2 有公因数 2，所以点分成 2 队，铅笔得抬起来一次。5 和 2 没有公因数，所以线把每个点都走一遍才回到起点。",
  },
  extension: {
    en: "Try eight dots, joining every third dot: one stroke or several shapes? And twelve dots, every third dot? Can you predict the answer before you draw?",
    zh: "试试 8 个点、每隔两个点连（每次往前数 3 个）：一笔画完，还是分成几个形状？12 个点、每次往前数 3 个呢？你能先预测再画吗？",
  },
  discussionPrompt: {
    en: "Find a number of dots and a jump that draws everything in one stroke, and one that doesn't. What do the ones that fail have in common?",
    zh: "找一组「点数和每次跳几个」能一笔画完的，再找一组不能的。画不完的那些有什么共同点？",
  },
  solutionTags: ["draw", "pattern", "guess_check"],
  funFact: {
    en: "The six-pointed shape made of two triangles is called a hexagram. Mathematicians write the five-pointed star as {5/2}: five dots, joined two at a time.",
    zh: "两个三角形叠成的六角形叫六芒星。数学家把五角星写成 {5/2}：5 个点，每次往前跳 2 个。",
  },
  sortOrder: 6,
  rubricNotes:
    "17/20 — hook 2, guess 2, hands-on 1, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: illustration only (待替换为 star_drawer), so the hands-on part is pencil and paper; drawing is the one real path, though the odd/even teams argument explains it; the gcd rule is a genuine ceiling",
};

/**
 * E7. A 3 × 3 box of dates adds up to 9 × the middle date: opposite dates balance around it.
 * The scene shows November 2026 with the box on 17 (9, 10, 11 / 16, 17, 18 / 23, 24, 25 = 153);
 * its explore panel shows "add all nine" next to "middle × 9", so the rule is visible while playing.
 * Catalog correction: a 5 × 5 box never fits on a month (the middle would have to be ≥ 17 and ≤ 15),
 * so the extension uses the four corners (4 × middle) and a 2 × 2 box (4 × top-left + 16) instead.
 */
export const calendarSquare: HeroQuestionBlueprint = {
  slug: "calendar-square",
  collection: "patterns-everywhere",
  kind: "MAGIC_TRICK",
  ageGroup: "AGE_8_10",
  difficulty: "EASY",
  category: "ARITHMETIC",
  title: { en: "The Calendar Magic Box", zh: "日历上的魔法方块" },
  hook: {
    en: "Pick any month on a calendar and draw a box around nine dates, three across and three down. Tell me only the date in the middle, and I'll say the total of all nine before you can add them up. How does the trick work?",
    zh: "随便翻到日历上的一个月，框住九个日期：横着三个，竖着三个。你只要告诉我中间那个日期，我就能在你加完之前说出九个数的和。这个魔术是怎么变的？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "always", en: "The trick works every time", zh: "每次都能成功" },
      { id: "sometimes", en: "Only for some boxes", zh: "只有某些方框可以" },
      { id: "never", en: "It's impossible, there must be a catch", zh: "不可能，一定有诈" },
    ],
  },
  scene: { type: "calendar_grid", year: 2026, month: 11, centre: 17, sum: 153 },
  prompt: {
    en: "The middle date of the box is 17. What do all nine dates in the box add up to?",
    zh: "方框中间的日期是 17。框里九个日期加起来是多少？",
  },
  answer: { type: "NUMERIC", value: 153 },
  hints: [
    { en: "Drag the frame to a few different places (or tap a date) and compare the two totals beside the calendar, \"add all nine\" and \"middle × 9\". What do you notice every time?", zh: "把方框拖到几个不同的地方（或点一个日期），比一比日历旁边的两个数：「九个数相加」和「中间数 × 9」。你每次都发现了什么？" },
    { en: "Why does it work? The date left of 17 is one less, and the date right of it is one more, so together they make 17 + 17. What about the dates just above and below 17?", zh: "为什么会这样？17 左边的日期少 1，右边的多 1，所以这两个加起来是 17 + 17。17 正上方和正下方的日期呢？" },
    { en: "All four pairs of opposite dates (left and right, up and down, and both diagonals) make 17 + 17. Four pairs plus the 17 in the middle is nine 17s. Quick way: 10 × 17, then take away one 17.", zh: "四对相对的日期（左右、上下，还有两条对角线）每对都是 17 + 17。四对再加上中间的 17，就是九个 17。快算法：先算 10 × 17，再减去一个 17。" },
  ],
  wrongAnswers: [
    {
      match: "136",
      feedback: {
        en: "That's 8 × 17: you counted the four pairs, two 17s each, but forgot the 17 in the middle of the box.",
        zh: "这是 8 × 17：你算了四对、每对两个 17，可是忘了方框正中间的那个 17。",
      },
    },
    {
      match: "170",
      feedback: {
        en: "That's 10 × 17, one 17 too many. There are only nine dates in the box, so take one 17 away.",
        zh: "这是 10 × 17，多了一个 17。框里只有九个日期，所以要减掉一个 17。",
      },
    },
    {
      match: "51",
      feedback: {
        en: "51 is just the middle row: 16 + 17 + 18. The rows above and below count too.",
        zh: "51 只是中间那一行：16 + 17 + 18。上面一行和下面一行也要算进去。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "A little too small. Check your adding: each of the four opposite pairs makes 34, and then the middle 17 is added on top.",
        zh: "小了一点。检查一下加法：四对相对的日期每对都是 34，最后还要加上中间的 17。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "A little too big. Count the dates in the box again: there are exactly nine, and they balance out to nine 17s.",
        zh: "大了一点。再数一数框里的日期：正好九个，它们一抵一消，正好是九个 17。",
      },
    },
  ],
  explanation: {
    en: "In the box around 17, the date to the left is one less and the date to the right is one more, so that pair adds up to 17 + 17; the dates above and below are 7 less and 7 more, so they balance too. The same happens for both diagonals, so all four opposite pairs make 34 each. Four pairs plus the 17 in the middle give 4 × 34 + 17 = 153, which is the same as 9 × 17.",
    zh: "在围着 17 的方框里，左边的日期少 1，右边的多 1，这一对加起来是 17 + 17；上面的少 7，下面的多 7，也正好抵消。两条对角线也是这样，所以四对相对的日期每对都是 34。四对加上中间的 17：4 × 34 + 17 = 153，也就是 9 × 17。",
  },
  aha: {
    en: "Opposite dates balance each other around the middle, like children on a seesaw. So nine dates always add up to nine times the middle one, in any month you like.",
    zh: "相对的两个日期围着中间数平衡，就像跷跷板两头的小朋友。所以不管哪个月，九个日期的和总是中间那个数的 9 倍。",
  },
  extension: {
    en: "What if you add only the four corners of the 3 × 3 box? And for a smaller 2 × 2 box of four dates, can you still find the total from just the top-left date?",
    zh: "如果只把 3 × 3 方框的四个角加起来呢？换成 2 × 2 的小方框（四个日期），只知道左上角的日期，还能马上说出总和吗？",
  },
  discussionPrompt: {
    en: "Does the trick still work in February, or on a calendar whose weeks start on Monday? Explain why or why not.",
    zh: "换成二月，或者换成每周从星期一开始的日历，这个魔术还灵吗？说说为什么。",
  },
  solutionTags: ["pair", "pattern", "algebra"],
  funFact: {
    en: "Multiplying by 9 in your head is easy: multiply by 10, then take the number away once. For 25 that's 250 − 25 = 225.",
    zh: "心算乘 9 有个窍门：先乘 10，再减去这个数一次。比如 25：250 − 25 = 225。",
  },
  sortOrder: 7,
  rubricNotes:
    "18/20 — hook 2, guess 1, hands-on 2, aha 2, floor 2, ceiling 1, paths 2, wrong 2, hints 2, retell 2: a real trick kids can do on a family calendar; the 'always' guess is easy because the hook promises a trick, and the explore panel shows 'middle × 9' next to the sum, so the rule is handed over while playing; adding all nine, pairing opposites and ×9 are all real paths; extensions stay close",
};

/**
 * E8. Cycles of 13 and 6 years first meet at lcm(13, 6) = 78; a 12-year cycle meets a 6-year predator
 * at every emergence. Upgrades the legacy "Cicada Underground Mystery" row (4- and 6-year cycles, lcm 12).
 * The explore readout says "First together: year 78" for the default cycles, so the value is in the
 * comparison (presets 🦗 12 / 13 / 17). Extension answers: 17 and 6 meet every 102 years; between 10 and 20,
 * the worst cycles against a 6-year predator are 12 and 18 (they meet at every emergence).
 */
export const cicadaPrimes: HeroQuestionBlueprint = {
  slug: "cicada-primes",
  collection: "patterns-everywhere",
  kind: "PATTERN",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "NUMBER_THEORY",
  title: { en: "The Cicadas' Secret Numbers", zh: "十七年才出来一次的虫" },
  hook: {
    en: "Some cicadas live underground for years and then crawl out all together, but only every 13 or every 17 years. Imagine a hungry predator that has a big year every 6 years. Why would a cicada pick such a strange number?",
    zh: "有一种蝉在地下一住就是好多年，然后一起钻出地面，而且只在每 13 年或每 17 年出来一次。假设有一种天敌每 6 年大爆发一次。蝉为什么偏偏选这么奇怪的数？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "every-12", en: "A 12-year cicada meets the predator every time it comes out", zh: "12 年的蝉每次出来都会撞上天敌" },
      { id: "every-6", en: "They meet every 6 years", zh: "每 6 年撞上一次" },
      { id: "every-72", en: "They meet every 72 years (12 × 6)", zh: "每 72 年（12 × 6）才撞上一次" },
      { id: "never", en: "They never meet", zh: "永远撞不上" },
    ],
  },
  scene: { type: "cycle_timeline", a: 13, b: 6, years: 120, altA: 12, collision: 78 },
  prompt: {
    en: "A cicada that comes out every 13 years and a predator that booms every 6 years were both out this year. How many years until they are out in the same year again?",
    zh: "每 13 年出来一次的蝉，和每 6 年大爆发一次的天敌，今年同时出现了。再过多少年，它们才会又在同一年出现？",
  },
  answer: { type: "NUMERIC", value: 78, unit: { en: "years", zh: "年" } },
  hints: [
    { en: "Press \"🦗 12\" first and watch the timeline: how often do the cicada years and the predator years light up together? Then press \"🦗 13\" and compare.", zh: "先点「🦗 12」，看时间轴：蝉出来的年份和天敌爆发的年份多久撞在一起一次？再点「🦗 13」比一比。" },
    { en: "List both: the predator is out in years 6, 12, 18, 24, …, and the cicadas in years 13, 26, 39, … Which is the first number in both lists?", zh: "把两串年份都写出来：天敌在第 6、12、18、24……年，蝉在第 13、26、39……年。两串里第一个相同的数是几？" },
    { en: "A year in both lists must be a multiple of 13 and a multiple of 6 at the same time. 13 is prime and doesn't divide 6, so the first such year is 13 × 6.", zh: "两串里都有的年份，必须既是 13 的倍数，又是 6 的倍数。13 是质数，又不能整除 6，所以第一个这样的年份就是 13 × 6。" },
  ],
  wrongAnswers: [
    {
      match: "19",
      feedback: {
        en: "You added 13 + 6. But they meet in a year that is on both lists, a multiple of 13 and of 6, and 19 isn't a multiple of either.",
        zh: "你算的是 13 + 6。可是它们相遇的年份要同时在两串里，既是 13 的倍数又是 6 的倍数，19 哪个都不是。",
      },
    },
    {
      match: "13",
      feedback: {
        en: "Year 13 is when the cicadas come back the first time, but the predator is out in years 12 and 18, not 13. Keep going along both lists.",
        zh: "第 13 年是蝉第一次回来的时候，可是天敌在第 12 年和第 18 年出现，不在第 13 年。沿着两串年份继续往下找。",
      },
    },
    {
      match: "7",
      feedback: {
        en: "That's 13 − 6, the gap between the two cycles. But the question is when both are out in the same year: list the years each one appears.",
        zh: "这是 13 − 6，两个周期的差。可题目问的是它们哪一年同时出现：把各自出现的年份列出来。",
      },
    },
    {
      match: "72",
      feedback: {
        en: "72 is 12 × 6, using the 12-year cycle. This cicada comes out every 13 years, and that one extra year changes everything.",
        zh: "72 是 12 × 6，用的是 12 年的周期。这里的蝉是每 13 年出来一次，多出的这 1 年让一切都变了。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "Too soon. Check that your year is on the cicada list (13, 26, 39, …) AND on the predator list (6, 12, 18, …).",
        zh: "太早了。检查一下：你的年份要在蝉的那串里（13、26、39……），也要在天敌的那串里（6、12、18……）。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "That's a year they really do meet, but not the first one. Look for an earlier year that's on both lists.",
        zh: "它们那一年确实会撞上，但不是第一次。找找有没有更早的、两串里都有的年份。",
      },
    },
  ],
  explanation: {
    en: "The predator is out in years 6, 12, 18, 24, …, and the cicadas in years 13, 26, 39, 52, 65 and 78. A year on both lists has to be a multiple of 6 and of 13 at the same time. Since 13 is prime and doesn't divide 6, the first such year is 13 × 6 = 78.",
    zh: "天敌在第 6、12、18、24……年出现，蝉在第 13、26、39、52、65、78 年出现。两串里都有的年份，必须同时是 6 和 13 的倍数。13 是质数，又不能整除 6，所以第一个这样的年份是 13 × 6 = 78。",
  },
  aha: {
    en: "A 12-year cicada meets the predator every single time it comes out, but a 13-year cicada only once in 78 years. Prime cycles share no factors, so they dodge everybody else's rhythm.",
    zh: "12 年的蝉每次出来都撞上天敌，13 年的蝉却 78 年才撞一次。质数周期和别的周期没有公因数，最能躲开别人的节奏。",
  },
  extension: {
    en: "How often would a 17-year cicada meet the same 6-year predator? And which cycle between 10 and 20 years would be the worst choice, meeting the predator every time?",
    zh: "17 年的蝉和同样每 6 年爆发的天敌，多少年撞一次？在 10 年到 20 年之间，哪种周期最倒霉，每次出来都撞上？",
  },
  discussionPrompt: {
    en: "On the timeline, compare the 12-year, 13-year and 17-year cicadas. How many times does each one meet the predator in 120 years, and what do the lucky ones have in common?",
    zh: "在时间轴上比一比 12 年、13 年、17 年的蝉。120 年里，它们各撞上天敌几次？运气好的那几种有什么共同点？",
  },
  solutionTags: ["table", "pattern", "simulate"],
  funFact: {
    en: "In 2024 a 13-year group and a 17-year group of cicadas came out together in Illinois, in the United States. That had last happened in 1803.",
    zh: "2024 年，美国伊利诺伊州的一群 13 年蝉和一群 17 年蝉同时钻出了地面。上一次这样还是 1803 年。",
  },
  sortOrder: 8,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 2, wrong 2, hints 1, retell 1: listing both sets of years and the 'multiple of both' idea are two real paths, and the 12-vs-13 presets carry the surprise; the explore readout says 'First together: year 78' for the default cycles, so the hints explain more than they lead",
  upgradesLegacyTitleEn: "Cicada Underground Mystery",
};

/**
 * E9. n frogs a side swap on 2n + 1 pads in n(n + 2) moves: n² jumps (each green passes each brown once)
 * plus 2n one-pad hops (each frog travels n + 1 pads). Checked by search: every finished swap of
 * 3 + 3 frogs takes exactly 15 moves (two solutions, mirror images), so the challenge is not getting
 * stuck; the scene proposes 15 when the swap is done. Extension answers: 4 a side, 24 moves; 10 a side, 120.
 */
export const frogSwap: HeroQuestionBlueprint = {
  slug: "frog-swap",
  collection: "patterns-everywhere",
  kind: "PUZZLE",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "LOGIC",
  title: { en: "The Great Frog Swap", zh: "青蛙换位" },
  hook: {
    en: "Three green frogs sit on the lily pads on the left, three brown frogs on the right, and one pad in the middle is empty. Frogs only ever move forward: a hop onto the empty pad next to them, or a jump over one frog into it. Can you swap the two teams, and how few moves does it take?",
    zh: "一排荷叶上，左边蹲着 3 只绿蛙，右边蹲着 3 只棕蛙，中间空着一片。青蛙只能往前走：要么跳到旁边的空荷叶上，要么跳过一只青蛙落到空荷叶上。你能让两队青蛙完全换位吗？最少要几步？",
  },
  guess: {
    type: "slider",
    min: 6,
    max: 30,
    step: 1,
    unit: { en: "moves", zh: "步" },
  },
  scene: { type: "frog_puzzle", perSide: 3, minMoves: 15 },
  prompt: {
    en: "Green frogs move only to the right and brown frogs only to the left. Every hop or jump counts as one move. How few moves does it take to swap the two teams completely?",
    zh: "绿蛙只能往右，棕蛙只能往左。每跳一次（不管是跳到旁边，还是跳过一只青蛙）都算一步。让两队青蛙完全换位，最少要几步？",
  },
  answer: { type: "NUMERIC", value: 15, unit: { en: "moves", zh: "步" } },
  hints: [
    { en: "Play first: tap a frog to make it hop or jump, and press \"Undo\" when you get stuck. Look at the position just before you got stuck. What went wrong?", zh: "先玩一玩：点一只青蛙让它跳，卡住了就点「撤销」。看看卡住之前的那个局面，问题出在哪里？" },
    { en: "Getting stuck usually starts when two frogs of the same colour end up side by side too early, so nobody can jump. Try to keep the colours mixed in the middle: green, brown, green, brown.", zh: "卡住往往是因为两只同色的青蛙太早挨在了一起，谁也跳不过去。试着让中间的颜色一直交错：绿、棕、绿、棕。" },
    { en: "Count the moves in two kinds. Every green frog has to jump over every brown frog once: that's 3 × 3 jumps. All six frogs travel 4 pads each, 24 pads in total, and a jump covers 2 pads. How many one-pad hops are left?", zh: "把步数分成两种来数。每只绿蛙都要跳过每只棕蛙一次：一共 3 × 3 次跳跃。6 只青蛙每只都要走 4 片荷叶，一共 24 片，跳一次走 2 片。剩下还要几次一格一格的小跳？" },
  ],
  wrongAnswers: [
    {
      match: "9",
      feedback: {
        en: "9 is the number of jumps: each green frog leaps over each brown frog once. But the frogs also need some small hops onto the pad right next to them. Count those too.",
        zh: "9 是跳跃的次数：每只绿蛙都跳过每只棕蛙一次。可青蛙还需要往旁边空荷叶挪几次小步，那些也要算上。",
      },
    },
    {
      match: "6",
      feedback: {
        en: "6 is the number of small hops onto a neighbouring pad. The frogs also have to jump over each other, nine times in all.",
        zh: "6 是挪到旁边空荷叶的小跳次数。青蛙还得互相跳过去，一共 9 次。",
      },
    },
    {
      match: "12",
      feedback: {
        en: "You gave each of the six frogs two moves. But every green frog has to jump over all three brown frogs, so the green frogs alone make nine jumps.",
        zh: "你让 6 只青蛙每只走 2 步。可每只绿蛙都要跳过 3 只棕蛙，光是绿蛙就要跳 9 次。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "That's too few to be possible. Every green frog must get past every brown frog, and the only way past is a jump: that's 9 jumps before you count a single hop.",
        zh: "这么少是做不到的。每只绿蛙都得越过每只棕蛙，而越过去只能靠跳：光跳就要 9 次，还没算小步呢。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "If you finished the swap, the \"moves\" counter shows 15: in fact every finished swap takes exactly 15 moves. Maybe you also counted the moves you undid?",
        zh: "如果你换完了，「步数」会显示 15：其实每一种换完的走法都正好是 15 步。你是不是把撤销掉的步数也算进去了？",
      },
    },
  ],
  explanation: {
    en: "Every green frog has to get past every brown frog, and the only way past is a jump, so there are 3 × 3 = 9 jumps. Each of the 6 frogs travels 4 pads, 24 pads in total; the 9 jumps cover 18 of them, so 6 one-pad hops cover the rest. That's 9 + 6 = 15 moves, and no swap can do it in fewer.",
    zh: "每只绿蛙都要越过每只棕蛙，而越过去只能靠跳，所以要跳 3 × 3 = 9 次。6 只青蛙每只走 4 片荷叶，一共 24 片；9 次跳跃走了其中 18 片，剩下的 6 片靠 6 次小跳。一共 9 + 6 = 15 步，没有更少的换法。",
  },
  aha: {
    en: "Every finished swap takes exactly 15 moves, so the hard part isn't being fast, it's not getting stuck. With n frogs a side it's n × n jumps plus 2n hops, which is n(n + 2).",
    zh: "每一种换完的走法都正好是 15 步，所以难的不是快，而是别卡住。每边 n 只青蛙时，是 n × n 次跳跃加 2n 次小跳，也就是 n(n + 2) 步。",
  },
  extension: {
    en: "Four frogs a side on nine lily pads: how many moves now? Can you predict ten frogs a side without playing?",
    zh: "9 片荷叶，每边 4 只青蛙：现在要几步？不玩，你能预测每边 10 只青蛙要几步吗？",
  },
  discussionPrompt: {
    en: "Where did you get stuck the first time? Describe the position and explain why no frog could move.",
    zh: "你第一次是在哪里卡住的？描述一下那个局面，说说为什么没有一只青蛙能动。",
  },
  solutionTags: ["simulate", "guess_check", "pattern", "algebra"],
  funFact: {
    en: "You can play this at home with three coins of each kind on a row of seven squares. Then try it with real people on seven chairs!",
    zh: "在家用两种硬币各 3 枚、在一排 7 个格子上就能玩。再试试让真人站在 7 把椅子前玩！",
  },
  sortOrder: 9,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 2, wrong 1, hints 2, retell 1: playing and the jumps-plus-hops count are two real paths, and 'every finished swap is exactly 15' is a true surprise; the scene proposes 15 the moment the swap is done, so the wrong-answer rules mostly catch kids who count on paper",
};

export const PATTERNS_EVERYWHERE: readonly HeroQuestionBlueprint[] = [
  towerOfHanoi,
  staircaseWays,
  growingPlus,
  pascalRowSum,
  tetrisShapes,
  starStrokes,
  calendarSquare,
  cicadaPrimes,
  frogSwap,
  fourWeights,
];
