/**
 * World A · Huge numbers & infinity (`huge-numbers`). Catalog: 02-hero-question-catalog.md §A.
 * Batch 1: A1 gauss-sum, A8 handshake-party. Batch 2: A2 chessboard-rice, A3 fold-to-the-moon
 * (upgrades the legacy "Paper Folding Challenge" row).
 * TODO(phase-3 batch 3): A4, A5, A9 (scale_ladder), A6 (zoom_number_line), A7 (hotel_shift),
 * A10 (halving_bar). A4 million-seconds is this world's second AGE_8_10 question.
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

/** A2. The guess is about the whole board; the question pins down one square the child can reach in the scene. */
export const chessboardRice: HeroQuestionBlueprint = {
  slug: "chessboard-rice",
  collection: "huge-numbers",
  kind: "THREE_ACT",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "ARITHMETIC",
  title: { en: "The King's Cheap Reward", zh: "国王的便宜奖赏" },
  hook: {
    en: "A king offers the inventor of chess any reward he likes. The inventor asks for rice: one grain on the first square of the board, two on the next, and double again on every square after that. The king laughs at such a cheap prize. Who do you think ends up sorry?",
    zh: "国王要奖赏发明国际象棋的人，想要什么都行。那人只要米：棋盘第一格放一粒，第二格放两粒，之后每一格都比前一格多一倍。国王笑了：「这么便宜？」最后谁会后悔？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "bowl", en: "The whole board holds about a bowl of rice", zh: "整个棋盘大约一碗米" },
      { id: "truck", en: "The whole board holds about a truckload", zh: "整个棋盘大约一卡车米" },
      { id: "world", en: "The whole board holds more than all the rice in the world", zh: "整个棋盘比全世界的米还多" },
    ],
  },
  scene: {
    type: "chessboard_doubling",
    squares: 64,
    unitLabel: { en: "grains of rice", zh: "粒米" },
    startAmount: 1,
    showLogScale: true,
    askSquare: 21,
  },
  prompt: {
    en: "Square 1 gets 1 grain, and every square gets twice as many as the one before. How many grains go on square 21?",
    zh: "第 1 格放 1 粒米，后面每一格都是前一格的 2 倍。第 21 格要放多少粒？",
  },
  answer: { type: "NUMERIC", value: 1048576 },
  hints: [
    { en: "Don't jump straight to square 21. Write down the first few squares: 1, 2, 4, 8, … What comes next?", zh: "先别急着跳到第 21 格。把前几格写出来：1、2、4、8……下一个是几？" },
    { en: "Square 11 has 1,024 grains: that's 10 doublings after square 1. How many doublings does it take to get from square 1 to square 21?", zh: "第 11 格有 1,024 粒，从第 1 格到这里翻了 10 次倍。从第 1 格到第 21 格要翻几次倍？" },
    { en: "Square 21 is 20 doublings after square 1. Ten doublings make 1,024, so twenty doublings make 1,024 × 1,024.", zh: "第 21 格比第 1 格多翻了 20 次倍。翻 10 次是 1,024，所以翻 20 次就是 1,024 × 1,024。" },
  ],
  wrongAnswers: [
    {
      match: "42",
      feedback: {
        en: "That's 21 × 2, as if each square got 2 more grains. But every square doubles the one before, so the numbers grow much faster: 1, 2, 4, 8, 16…",
        zh: "这是 21 × 2，好像每格只多 2 粒。可是每一格都是前一格的两倍，数会长得快得多：1、2、4、8、16……",
      },
    },
    {
      match: "2097152",
      feedback: {
        en: "So close! That's 21 doublings. But the 1 grain on square 1 hasn't been doubled at all, so square 21 is only 20 doublings along.",
        zh: "非常接近！这是翻了 21 次倍。可是第 1 格的 1 粒还没翻过倍，所以到第 21 格只翻了 20 次。",
      },
    },
    {
      match: "524288",
      feedback: {
        en: "Close, but one doubling short. Count again: square 2 is 1 doubling, square 3 is 2 doublings, so square 21 is…",
        zh: "很接近，可是少翻了一次倍。再数一数：第 2 格翻了 1 次，第 3 格翻了 2 次，那第 21 格呢？",
      },
    },
    {
      match: "lt:1000",
      feedback: {
        en: "Much too small. Doubling sneaks up on you: square 11 alone already has 1,024 grains.",
        zh: "太小了。翻倍长得比你想的快：光是第 11 格就已经有 1,024 粒了。",
      },
    },
  ],
  explanation: {
    en: "Every square doubles the one before, so square 21 is 20 doublings after square 1. Ten doublings make 1,024, and ten more multiply that by 1,024 again. So square 21 holds 1,024 × 1,024 = 1,048,576 grains.",
    zh: "每一格都是前一格的两倍，所以第 21 格比第 1 格多翻了 20 次倍。翻 10 次是 1,024，再翻 10 次就是再乘一个 1,024。所以第 21 格有 1,024 × 1,024 = 1,048,576 粒米。",
  },
  aha: {
    en: "Just twenty doublings pass a million, and the board has 64 squares. Altogether it holds about 18 billion billion grains, more than a thousand years of the world's rice.",
    zh: "只翻 20 次倍就超过了一百万，而棋盘有 64 格。全部加起来大约是 1800 亿亿粒，比全世界一千多年种的米还多。",
  },
  extension: {
    en: "How many grains go on square 64? How many on the whole board? (Look at the totals for the first few squares: 1, 3, 7, 15… Compare each with the next square.)",
    zh: "第 64 格有多少粒？整个棋盘一共多少粒？（看看前几格加起来是 1、3、7、15……和下一格比一比。）",
  },
  discussionPrompt: {
    en: "At which square did you start to think the king was in trouble? What number made you change your mind?",
    zh: "你到第几格开始觉得国王要糟了？是哪个数让你改变了想法？",
  },
  solutionTags: ["table", "pattern", "simulate"],
  funFact: {
    en: "The legend is very old, and nobody knows if it really happened. In some versions the king is so angry that he punishes the inventor instead of paying.",
    zh: "这个传说非常古老，没人知道是不是真的。在有些版本里，国王发现付不起，干脆生气地惩罚了发明人。",
  },
  sortOrder: 2,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: doubling twenty times by hand is long, so most kids lean on the scene or a table; the guess is about the board, the answer about square 21",
};

/**
 * A3. Upgrades the legacy DRILL row "Paper Folding Challenge" in place. The guess is the
 * question: picking the closest reference object (102.4 mm ≈ a thick book).
 */
export const foldToTheMoon: HeroQuestionBlueprint = {
  slug: "fold-to-the-moon",
  collection: "huge-numbers",
  kind: "THREE_ACT",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "ARITHMETIC",
  title: { en: "Fold Your Way to the Moon", zh: "折纸去月球" },
  hook: {
    en: "Every time you fold a sheet of paper in half, it gets twice as thick. Paper is very thin, so that doesn't sound like much. If you could fold it just ten times, how thick would it be?",
    zh: "一张纸每对折一次，就会厚一倍。纸那么薄，听起来没什么大不了。如果能对折十次，它会有多厚？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "coin", en: "As thick as a coin", zh: "像一枚硬币那么厚" },
      { id: "book", en: "As thick as a thick book", zh: "像一本厚书那么厚" },
      { id: "person", en: "As tall as a person", zh: "像一个人那么高" },
      { id: "building", en: "As tall as a building", zh: "像一座大楼那么高" },
    ],
  },
  scene: {
    type: "fold_paper",
    thicknessMm: 0.1,
    maxFolds: 42,
    references: [
      { heightMm: 2, emoji: "🪙", label: { en: "a coin", zh: "一枚硬币" } },
      { heightMm: 100, emoji: "📕", label: { en: "a thick book", zh: "一本厚书" } },
      { heightMm: 1_700, emoji: "🧍", label: { en: "a person", zh: "一个人" } },
      { heightMm: 100_000, emoji: "🏢", label: { en: "a skyscraper", zh: "一座摩天楼" } },
      { heightMm: 8_849_000, emoji: "🏔️", label: { en: "Mount Everest", zh: "珠穆朗玛峰" } },
      { heightMm: 384_400_000_000, emoji: "🌕", label: { en: "the Moon", zh: "月球" } },
    ],
  },
  prompt: {
    en: "A sheet of paper is 0.1 mm thick. Fold it in half 10 times. Which is closest to how thick the folded stack is?",
    zh: "一张纸厚 0.1 毫米。把它对折 10 次。折好的纸最接近下面哪一个的厚度？",
  },
  answer: { type: "CHOICE", correctId: "book" },
  hints: [
    { en: "Don't add 0.1 mm for each fold. Each fold doubles the number of layers. How many layers after 1 fold? After 2?", zh: "别每折一次就加 0.1 毫米。每折一次，纸的层数翻一倍。折 1 次有几层？折 2 次呢？" },
    { en: "Keep doubling the layers: 2, 4, 8, 16, … Count until you have doubled 10 times.", zh: "层数一直翻倍：2、4、8、16……一直数到翻了 10 次为止。" },
    { en: "After 10 folds there are 1,024 layers, each 0.1 mm thick. Multiply, then change millimetres into centimetres.", zh: "折 10 次以后有 1,024 层，每层 0.1 毫米。乘一下，再把毫米换成厘米。" },
  ],
  wrongAnswers: [
    {
      match: "choice:coin",
      feedback: {
        en: "You might have added 0.1 mm ten times and got 1 mm. But a fold doesn't add one more sheet: it doubles the whole stack every time.",
        zh: "你可能把 0.1 毫米加了 10 次，得到 1 毫米。可是对折不是多加一张纸，而是每次把整叠纸翻一倍。",
      },
    },
    {
      match: "choice:person",
      feedback: {
        en: "Did you get 1,024 mm? 1,024 is the number of layers, and each layer is only 0.1 mm thick. Multiply before you compare.",
        zh: "你算出来是 1,024 毫米吗？1,024 是层数，每层只有 0.1 毫米。先乘一下再比较。",
      },
    },
    {
      match: "choice:building",
      feedback: {
        en: "Doubling does get huge, just not yet! Ten folds multiply the thickness by 1,024. You'd need about 20 folds to pass a skyscraper.",
        zh: "翻倍确实会变得超级大，只是还没到时候！折 10 次，厚度只乘了 1,024。要折 20 次左右才能超过一座摩天楼。",
      },
    },
  ],
  explanation: {
    en: "Each fold doubles the layers, so 10 folds make 2 × 2 × … × 2 = 1,024 layers. 1,024 × 0.1 mm = 102.4 mm, which is about 10 cm. That's about as thick as a thick book.",
    zh: "每折一次层数翻倍，折 10 次就是 10 个 2 相乘，等于 1,024 层。1,024 × 0.1 毫米 = 102.4 毫米，大约 10 厘米。差不多是一本厚书的厚度。",
  },
  aha: {
    en: "Just 32 more folds, 42 in all, and the paper would reach past the Moon. Doubling isn't a bit faster than adding; it's a whole different kind of growing.",
    zh: "再折 32 次，一共 42 次，纸就能超过月球。翻倍不是比加法快一点，而是完全不一样的增长。",
  },
  extension: {
    en: "How many folds would it take to be taller than you? Taller than Mount Everest?",
    zh: "要折几次才能比你还高？比珠穆朗玛峰还高呢？",
  },
  discussionPrompt: {
    en: "Try folding a real sheet of paper in half again and again. How many times could you do it, and what stopped you?",
    zh: "拿一张真的纸一直对折。你最多折了几次？是什么让你折不下去？",
  },
  solutionTags: ["table", "pattern", "simulate"],
  funFact: {
    en: "In 2002 a high-school student, Britney Gallivan, folded a very long strip of paper in half 12 times, beating the old saying that paper can't be folded more than 7 times.",
    zh: "2002 年，美国高中生布兰妮·加利万用一条很长很长的纸带对折了 12 次，打破了「纸最多只能折 7 次」的说法。",
  },
  sortOrder: 3,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 1, paths 1, wrong 2, hints 2, retell 2: the only real path is doubling (table or scene); extensions are 'more folds' rather than a new idea",
  upgradesLegacyTitleEn: "Paper Folding Challenge",
};

export const HUGE_NUMBERS: readonly HeroQuestionBlueprint[] = [gaussSum, chessboardRice, foldToTheMoon, handshakeParty];
