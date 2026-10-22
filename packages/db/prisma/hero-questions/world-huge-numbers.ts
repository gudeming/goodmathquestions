/**
 * World A · Huge numbers & infinity (`huge-numbers`). Catalog: 02-hero-question-catalog.md §A.
 * Batch 1: A1 gauss-sum, A8 handshake-party. Batch 2: A2 chessboard-rice, A3 fold-to-the-moon
 * (upgrades the legacy "Paper Folding Challenge" row). Batch 3: A4 million-seconds (this world's
 * second AGE_8_10 question), A5 billion-heartbeats, A9 googol-vs-atoms (scale_ladder),
 * A10 halfway-to-the-wall (halving_bar).
 * TODO(phase-3): A6 (zoom_number_line), A7 (hotel_shift) once those Tier-3 scenes land.
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

/**
 * A4. 10^6 s = 11.574 days. The scene climbs ÷ 60, ÷ 60, ÷ 24 and proposes "11.6"
 * (rounded to one decimal), which the 11-12 window accepts.
 */
export const millionSeconds: HeroQuestionBlueprint = {
  slug: "million-seconds",
  collection: "huge-numbers",
  kind: "ESTIMATION",
  ageGroup: "AGE_8_10",
  difficulty: "EASY",
  category: "ARITHMETIC",
  title: { en: "A Million Seconds From Now", zh: "一百万秒以后" },
  hook: {
    en: "Start a stopwatch right now and let it tick, one second at a time. When it finally reaches one million seconds, what will you be doing?",
    zh: "现在按下秒表，让它一秒一秒地走。等它走到一百万秒的时候，你会在干什么？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "tonight", en: "Still today, around dinner time", zh: "还是今天，晚饭的时候" },
      { id: "tomorrow", en: "Sometime tomorrow", zh: "明天的某个时候" },
      { id: "weeks", en: "About two weeks from now", zh: "大约两周以后" },
      { id: "year", en: "Sometime next year", zh: "明年的某个时候" },
    ],
  },
  scene: {
    type: "scale_ladder",
    mode: "time",
    start: 1_000_000,
    references: [
      { value: 23_400, emoji: "🏫", label: { en: "a school day", zh: "一天的课" } },
      { value: 604_800, emoji: "📅", label: { en: "a week", zh: "一周" } },
      { value: 4_838_400, emoji: "🏖️", label: { en: "a summer holiday", zh: "一个暑假" } },
    ],
  },
  prompt: {
    en: "About how many days is 1,000,000 seconds?",
    zh: "1,000,000 秒大约是多少天？",
  },
  answer: { type: "ESTIMATE", min: 11, max: 12, truth: 11.57, unit: { en: "days", zh: "天" } },
  hints: [
    { en: "Don't try to count them. Climb in steps: first turn the seconds into minutes. How many seconds make one minute?", zh: "别真的去数。一步一步往上爬：先把秒换成分钟。1 分钟是多少秒？" },
    { en: "1,000,000 ÷ 60 is about 16,667 minutes. Now turn the minutes into hours the same way.", zh: "1,000,000 ÷ 60 大约是 16,667 分钟。再用同样的办法，把分钟换成小时。" },
    { en: "16,667 ÷ 60 is about 278 hours. A day has 24 hours, so how many days is 278 hours?", zh: "16,667 ÷ 60 大约是 278 小时。一天有 24 小时，278 小时是几天？" },
  ],
  wrongAnswers: [
    {
      match: "gt:10000",
      feedback: {
        en: "That looks like minutes! 1,000,000 ÷ 60 ≈ 16,667 is the number of minutes. Keep climbing: minutes into hours, then hours into days.",
        zh: "这看起来是分钟数！1,000,000 ÷ 60 ≈ 16,667 是分钟。继续往上爬：分钟换成小时，再换成天。",
      },
    },
    {
      match: "gt:100",
      feedback: {
        en: "That's a lot of days for a million seconds. If you got about 278, those are hours: one more step, because a day has 24 hours.",
        zh: "一百万秒可没有这么多天。如果你算出来大约是 278，那是小时数：还差一步，一天有 24 小时。",
      },
    },
    {
      match: "lt:1",
      feedback: {
        en: "Less than a day? One day is 24 × 60 × 60 = 86,400 seconds, and a million is more than ten times that.",
        zh: "不到一天？一天就有 24 × 60 × 60 = 86,400 秒，一百万比它的十倍还多。",
      },
    },
    {
      match: "lt:11",
      feedback: {
        en: "A bit short. A week is 604,800 seconds, so a million seconds is more than a week. Check your last division.",
        zh: "有点少。一周是 604,800 秒，所以一百万秒比一周还长。检查一下最后一步除法。",
      },
    },
    {
      match: "gt:12",
      feedback: {
        en: "A bit long. A day is 86,400 seconds. How many of those fit into 1,000,000?",
        zh: "有点多。一天是 86,400 秒。1,000,000 里面装得下几个 86,400？",
      },
    },
  ],
  explanation: {
    en: "Climb one rung at a time: 1,000,000 ÷ 60 ≈ 16,667 minutes, and 16,667 ÷ 60 ≈ 278 hours. Then 278 ÷ 24 ≈ 11.6 days. So a million seconds is about eleven and a half days.",
    zh: "一级一级往上爬：1,000,000 ÷ 60 ≈ 16,667 分钟，16,667 ÷ 60 ≈ 278 小时。再算 278 ÷ 24 ≈ 11.6 天。所以一百万秒大约是 11 天半。",
  },
  aha: {
    en: "A million seconds is only about eleven and a half days, but a billion seconds is about 32 years. Million and billion sound like neighbours, yet one is a holiday and the other is half a lifetime.",
    zh: "一百万秒只有大约 11 天半，十亿秒却差不多是 32 年。「百万」和「十亿」听起来像邻居，一个是一次假期，另一个是半辈子。",
  },
  extension: {
    en: "About how many seconds old are you? At what age will you be one billion seconds old?",
    zh: "你出生到现在大约过了多少秒？你会在几岁的时候满十亿秒？",
  },
  discussionPrompt: {
    en: "Which rung of the climb surprised you most: seconds to minutes, minutes to hours, or hours to days? Why?",
    zh: "往上爬的哪一级最让你意外：秒到分钟、分钟到小时，还是小时到天？为什么？",
  },
  solutionTags: ["table", "guess_check"],
  funFact: {
    en: "In 2007 a man in the USA counted out loud from 1 to a million. Big numbers take longer than a second to say, so it took him 89 days.",
    zh: "2007 年，美国有个人从 1 大声数到了一百万。大的数一秒钟念不完，所以他一共数了 89 天。",
  },
  sortOrder: 4,
  rubricNotes:
    "17/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 1, paths 1, wrong 2, hints 2, retell 1: one real path (divide unit by unit, on paper or on the ladder); the extension is 'more seconds' rather than a new idea",
};

/**
 * A5. 70 beats a minute → 36,792,000 a year; 10^9 / that = 27.18 years. The scene proposes "27".
 * Wrong-answer windows: < 5 years is the 一亿 / 十亿 (10^8 vs 10^9) slip; 200-1000 is 10^10.
 */
export const billionHeartbeats: HeroQuestionBlueprint = {
  slug: "billion-heartbeats",
  collection: "huge-numbers",
  kind: "ESTIMATION",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "ARITHMETIC",
  title: { en: "Your Billionth Heartbeat", zh: "第十亿次心跳" },
  hook: {
    en: "Put two fingers on your neck and feel your heart. It beats about 70 times a minute, every minute, even while you sleep. One day it will beat for the billionth time. How old will you be?",
    zh: "把两根手指放在脖子上，感觉一下心跳。它每分钟大约跳 70 下，睡觉的时候也不停。总有一天，它会跳到第十亿下。那时你几岁？",
  },
  guess: {
    type: "slider",
    min: 0,
    max: 100,
    step: 1,
    unit: { en: "years old", zh: "岁" },
  },
  scene: {
    type: "scale_ladder",
    mode: "heartbeats",
    start: 70,
    target: 1_000_000_000,
    references: [
      { value: 6, emoji: "🎒", label: { en: "starting school", zh: "上小学" } },
      { value: 18, emoji: "🎓", label: { en: "finishing school", zh: "高中毕业" } },
      { value: 40, emoji: "🧑", label: { en: "a parent", zh: "爸爸妈妈" } },
    ],
  },
  prompt: {
    en: "Your heart beats 70 times a minute. About how old will you be when it beats for the 1,000,000,000th time?",
    zh: "你的心每分钟跳 70 下。它跳到第 1,000,000,000 下的时候，你大约几岁？",
  },
  answer: { type: "ESTIMATE", min: 25, max: 30, truth: 27.2, unit: { en: "years old", zh: "岁" } },
  hints: [
    { en: "A billion is too big to think about all at once. Start small: how many times does your heart beat in one hour?", zh: "十亿太大了，一下子想不清楚。先从小的算：你的心一小时跳多少下？" },
    { en: "70 × 60 = 4,200 beats an hour. Keep going: how many in a day (24 hours), and then in a year (365 days)?", zh: "70 × 60 = 4,200，这是一小时的心跳。继续算：一天（24 小时）跳多少下？一年（365 天）呢？" },
    { en: "A year has about 36.8 million beats (4,200 × 24 × 365). How many of those years fit into 1,000,000,000 beats? Divide.", zh: "一年大约跳 3,680 万下（4,200 × 24 × 365）。1,000,000,000 下里能装下几年？除一下。" },
  ],
  wrongAnswers: [
    {
      match: "lt:1",
      feedback: {
        en: "Less than a year? In just one year your heart beats about 37 million times, and a billion is much more than that.",
        zh: "不到一岁？光是一年，心就要跳大约 3,700 万下，十亿可比这多多了。",
      },
    },
    {
      match: "lt:5",
      feedback: {
        en: "Did you use a hundred million (100,000,000)? A billion has nine zeros: 1,000,000,000. That's ten times more, so the age is ten times bigger too.",
        zh: "你是不是用了一亿（100,000,000）？十亿是 1 后面 9 个 0：1,000,000,000，是一亿的十倍，所以年龄也要大十倍。",
      },
    },
    {
      match: "lt:25",
      feedback: {
        en: "A little too young. One year is about 36.8 million beats. How many times does 36.8 million fit into a billion?",
        zh: "有点小了。一年大约是 3,680 万下。十亿里面能装下几个 3,680 万？",
      },
    },
    {
      match: "gt:1000",
      feedback: {
        en: "Way too old! You probably skipped a step. A minute to an hour is × 60, an hour to a day is × 24, and a day to a year is × 365. Did you do all three?",
        zh: "太老了！你可能漏了一步。每分钟到每小时要 × 60，每小时到每天要 × 24，每天到每年要 × 365。三步都做了吗？",
      },
    },
    {
      match: "gt:200",
      feedback: {
        en: "Did you get about 272? Count the zeros: a billion has nine zeros, not ten. With the right number the age is ten times smaller.",
        zh: "你算出来大约是 272 岁吗？数一数 0：十亿是 9 个 0，不是 10 个。用对的数，年龄会小十倍。",
      },
    },
    {
      match: "gt:30",
      feedback: {
        en: "A little too old. Check each step, and use 70 beats a minute, not 60. A faster heart reaches a billion sooner.",
        zh: "有点大了。检查每一步，记得用每分钟 70 下，不是 60 下。心跳得越快，越早到十亿。",
      },
    },
  ],
  explanation: {
    en: "Climb the ladder: 70 beats a minute × 60 = 4,200 an hour, × 24 = 100,800 a day, and × 365 ≈ 36.8 million a year. Then 1,000,000,000 ÷ 36,800,000 ≈ 27. So your billionth heartbeat comes when you are about 27 years old.",
    zh: "沿着梯子往上爬：每分钟 70 下，× 60 是每小时 4,200 下，× 24 是每天 100,800 下，× 365 大约是每年 3,680 万下。然后 1,000,000,000 ÷ 36,800,000 ≈ 27。所以第十亿下心跳，大约在你 27 岁的时候。",
  },
  aha: {
    en: "A billion heartbeats takes about 27 years: long enough to grow up, finish school and start a job. That's how big a billion is.",
    zh: "十亿下心跳要大约 27 年，够你长大、读完书、开始工作。十亿就是这么大。",
  },
  extension: {
    en: "A mouse's heart beats about 500 times a minute, and an elephant's about 30. How long would each take to reach a billion beats? Compare that with how long they live.",
    zh: "老鼠的心每分钟跳大约 500 下，大象大约 30 下。它们各要多久才能跳到十亿下？和它们的寿命比一比。",
  },
  discussionPrompt: {
    en: "How did you turn 'beats a minute' into 'beats a year'? Which multiplication would you check twice, and why?",
    zh: "你是怎么把「每分钟跳几下」变成「每年跳几下」的？哪一步乘法你会再检查一遍？为什么？",
  },
  solutionTags: ["table", "guess_check"],
  funFact: {
    en: "Many mammals, from mice to elephants, get very roughly a billion heartbeats in a whole life. Small animals just use theirs up much faster.",
    zh: "从老鼠到大象，很多哺乳动物一辈子的心跳都大约在十亿下左右。小动物只是用得快得多。",
  },
  sortOrder: 5,
  rubricNotes:
    "17/20 — hook 2, guess 2, hands-on 2, aha 2, floor 1, ceiling 2, paths 1, wrong 2, hints 2, retell 1: multiplying into the millions is a stretch below 10; the ladder is the one path; the 一亿/十亿 slip gets its own feedback",
};

/**
 * A9. 10^100 / 10^80 = 10^20. The catalog's first aha ("turn every atom into a universe and you
 * still fall short") was wrong: that gives 10^160 > 10^100. The copy uses 10^20 universes instead
 * (about 100 for every grain of sand on Earth, ~10^18, matching the scene's reference).
 */
export const googolVsAtoms: HeroQuestionBlueprint = {
  slug: "googol-vs-atoms",
  collection: "huge-numbers",
  kind: "WOULD_YOU_RATHER",
  ageGroup: "AGE_12_14",
  difficulty: "MEDIUM",
  category: "ARITHMETIC",
  title: { en: "A Googol vs. the Universe", zh: "古戈尔和宇宙比大小" },
  hook: {
    en: "Write a 1 followed by a hundred zeros: that number is called a googol. Now imagine counting every atom in the whole universe, in every star and every planet. Which is bigger, and by how much?",
    zh: "写一个 1，后面跟一百个 0，这个数叫古戈尔。再想象一下，把整个宇宙里的原子都数一遍，每颗星星、每颗行星都算上。哪个更大？大多少？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "atoms", en: "There are more atoms", zh: "原子更多" },
      { id: "bit", en: "A googol is a bit bigger", zh: "古戈尔大一点点" },
      { id: "absurd", en: "A googol is ridiculously bigger", zh: "古戈尔大得离谱" },
    ],
  },
  scene: {
    type: "scale_ladder",
    mode: "powers",
    start: 80,
    target: 100,
    labels: { start: { en: "atoms in the universe", zh: "宇宙里的原子" }, target: { en: "a googol", zh: "古戈尔" } },
    references: [
      { value: 18, emoji: "🏖️", label: { en: "grains of sand on Earth", zh: "地球上的沙粒" } },
      { value: 22, emoji: "✨", label: { en: "stars in the universe", zh: "宇宙里的恒星" } },
    ],
  },
  prompt: {
    en: "Scientists estimate that the universe holds about \\(10^{80}\\) atoms (a 1 with 80 zeros). A googol is \\(10^{100}\\). Is a googol smaller, a bit bigger, or ridiculously bigger?",
    zh: "科学家估计，宇宙里大约有 \\(10^{80}\\) 个原子（1 后面 80 个 0）。古戈尔是 \\(10^{100}\\)。古戈尔是更小、大一点点，还是大得离谱？",
  },
  answer: { type: "CHOICE", correctId: "absurd" },
  hints: [
    { en: "Don't compare 80 and 100 as if they were the numbers. They count ZEROS. What does one extra zero do to a number?", zh: "别把 80 和 100 当成那两个数来比，它们数的是 0 的个数。多一个 0，数会变成原来的几倍？" },
    { en: "One extra zero means × 10, and two extra zeros mean × 100. So how many times bigger is a number with 20 extra zeros?", zh: "多一个 0 就是 × 10，多两个 0 就是 × 100。那多 20 个 0，是大多少倍？" },
    { en: "20 extra zeros means × 100,000,000,000,000,000,000. Slide the scene's zeros across and ask yourself: is that 'a bit'?", zh: "多 20 个 0 就是 × 100,000,000,000,000,000,000。在场景里把 0 一个个加上去，再问问自己：这算「一点点」吗？" },
  ],
  wrongAnswers: [
    {
      match: "choice:bit",
      feedback: {
        en: "100 zeros and 80 zeros look close, like 100 and 80. But every extra zero multiplies by 10, and 20 extra zeros multiply by 10 twenty times. That's a hundred billion billion times bigger.",
        zh: "100 个 0 和 80 个 0 看起来差不多，就像 100 和 80。可是每多一个 0 就要乘 10，多 20 个 0 就是乘了 20 次 10，大了一万亿亿倍。",
      },
    },
    {
      match: "choice:atoms",
      feedback: {
        en: "The universe feels like the biggest thing there is, so it's natural to pick it. But its atoms come to about a 1 with 80 zeros, and a googol has 100 zeros. More zeros means bigger.",
        zh: "宇宙感觉是最大的东西，选它很正常。可是宇宙里的原子大约是 1 后面 80 个 0，古戈尔有 100 个 0。0 越多，数越大。",
      },
    },
  ],
  explanation: {
    en: "Each extra zero multiplies a number by 10. A googol has 20 more zeros than the number of atoms, so it is \\(10^{20}\\) times bigger. That's 100,000,000,000,000,000,000 times: ridiculously bigger.",
    zh: "每多一个 0，数就变成原来的 10 倍。古戈尔比原子的数量多 20 个 0，所以大 \\(10^{20}\\) 倍。也就是 100,000,000,000,000,000,000 倍，大得离谱。",
  },
  aha: {
    en: "To get a googol atoms you'd need \\(10^{20}\\) whole universes, about a hundred universes for every grain of sand on Earth. 'Only 20 more zeros' is a monster.",
    zh: "要凑够一个古戈尔的原子，需要 \\(10^{20}\\) 个宇宙，相当于地球上每一粒沙子都配一百个宇宙。「只多 20 个 0」其实是个怪物。",
  },
  extension: {
    en: "A googolplex is a 1 followed by a googol zeros. If you wrote one zero on every atom in the universe, could you write it down?",
    zh: "古戈尔普勒克斯是 1 后面跟着一个古戈尔那么多个 0。如果在宇宙里的每个原子上写一个 0，你写得下它吗？",
  },
  discussionPrompt: {
    en: "What picture would you use to explain 'ten to the power of twenty times bigger' to a friend in one sentence?",
    zh: "你会用什么画面，用一句话向朋友解释「大 10 的 20 次方倍」？",
  },
  solutionTags: ["pattern", "algebra"],
  funFact: {
    en: "The name 'googol' was made up around 1920 by a nine-year-old boy, Milton Sirotta, when a mathematician in his family asked him to name a really big number.",
    zh: "「古戈尔」这个名字是 1920 年前后一个 9 岁男孩米尔顿起的：他家里一位当数学家的长辈，请他给一个超级大的数取个名字。",
  },
  sortOrder: 9,
  rubricNotes:
    "16/20 — hook 2, guess 2, hands-on 1, aha 2, floor 1, ceiling 2, paths 1, wrong 2, hints 2, retell 1: the powers scene shows the zeros but the answer comes from the 'each zero is × 10' idea, not from the scene; exponents are a 12+ idea",
};

/**
 * A10. halving_bar: the scene's TINY_THINGS say the gap passes a hair at step 14, a bacterium at
 * 20 and an atom only at step 34 (2^-34 m ≈ 5.8e-11 m < 1e-10 m), so maxSteps is 40 and the copy
 * says 34.
 */
export const halfwayToTheWall: HeroQuestionBlueprint = {
  slug: "halfway-to-the-wall",
  collection: "huge-numbers",
  kind: "PARADOX",
  ageGroup: "AGE_12_14",
  difficulty: "MEDIUM",
  category: "FRACTIONS",
  title: { en: "The Wall You Never Reach", zh: "永远走不到的墙" },
  hook: {
    en: "You stand facing a wall. You walk half of the way there, then half of what's left, then half of what's left again, and you never stop. Do you ever reach the wall? And how far do you walk altogether?",
    zh: "你面对一面墙站着。先走一半的路，再走剩下的一半，再走剩下的一半……永远不停。你能走到墙吗？你一共走了多远？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "less", en: "Less than the full distance", zh: "比全程少一点" },
      { id: "exact", en: "Exactly the full distance", zh: "正好是全程" },
      { id: "more", en: "More than the full distance", zh: "比全程多" },
      { id: "forever", en: "It grows forever", zh: "越加越多，没有尽头" },
    ],
  },
  scene: { type: "halving_bar", ratio: 0.5, maxSteps: 40 },
  prompt: {
    en: "The wall is 1 metre away. If you keep going forever, what does 1/2 + 1/4 + 1/8 + 1/16 + … add up to?",
    zh: "墙在 1 米外。如果永远走下去，1/2 + 1/4 + 1/8 + 1/16 + …… 加起来等于多少？",
  },
  answer: { type: "NUMERIC", value: 1, unit: { en: "m", zh: "米" } },
  hints: [
    { en: "Don't add the fractions one by one. Look at what is LEFT after each step instead. After the first step, how much is left?", zh: "别一个个去加分数。换个角度，看每一步之后还剩多少。走完第一步，还剩多少？" },
    { en: "After 1 step, 1/2 m is left. After 2 steps, 1/4 m. After 3 steps, 1/8 m. What happens to the part left as you keep going?", zh: "走 1 步后剩 1/2 米，走 2 步后剩 1/4 米，走 3 步后剩 1/8 米。一直走下去，剩下的会怎样？" },
    { en: "Walked + left = 1 metre, every single time. The part left gets smaller than any number you can name. So what must the walked part add up to?", zh: "走过的 + 剩下的 = 1 米，每一步都是这样。剩下的会比你说得出的任何数都小。那走过的加起来是多少？" },
  ],
  wrongAnswers: [
    {
      match: "regex:^\\s*0?\\.9+\\s*$",
      feedback: {
        en: "0.999 is a good thought: it's what you've walked after many steps. But the steps never stop, and the gap to 1 shrinks below every number you can name. A gap smaller than everything is no gap at all.",
        zh: "想到 0.999 很自然：走了很多步以后就是这么多。可是这些步永远不停，和 1 的差距会比你说得出的任何数都小。比什么都小的差距，就是没有差距。",
      },
    },
    {
      match: "2",
      feedback: {
        en: "Maybe you thought each step is as long as the one before. But each step is only half of what's left, so you can never walk past the wall.",
        zh: "你可能以为每一步都和上一步一样长。可是每一步只走剩下的一半，所以你永远不会走过墙。",
      },
    },
    {
      match: "regex:^\\s*(∞|[Ii]nf|[Ff]orever|无限|无穷|永远)",
      feedback: {
        en: "Infinitely many steps, yes, but they get tiny very fast. Infinitely many numbers can still add up to an ordinary number: every piece fits inside the same 1-metre bar.",
        zh: "步数确实是无限的，可是每一步很快就变得极小。无限多个数加起来，也可以是一个普通的数：每一小段都装在同一根 1 米长的条里。",
      },
    },
    {
      match: "lt:1",
      feedback: {
        en: "You've added up the first few steps, so you're a bit short. Keep going: the part left keeps halving, and nothing stops the total from closing in on the whole metre.",
        zh: "你只加了前几步，所以还差一点。继续走：剩下的部分一直减半，没有什么能拦住总和一直贴近整整 1 米。",
      },
    },
    {
      match: "gt:1",
      feedback: {
        en: "More than the whole distance? Each step only covers half of the gap that's left, so you never pass the wall.",
        zh: "比全程还长？每一步只走剩下那段的一半，所以你永远不会走过墙。",
      },
    },
  ],
  explanation: {
    en: "After each step the part still to walk is 1/2, then 1/4, then 1/8 of a metre, and walked + left is always exactly 1. The part left halves forever, so it becomes smaller than any distance you can name: after 34 steps it is already smaller than an atom. A sum that never ends means the number its totals close in on, and here that is 1. So 1/2 + 1/4 + 1/8 + … = 1.",
    zh: "每走一步，还剩 1/2 米、1/4 米、1/8 米……而走过的 + 剩下的永远正好是 1 米。剩下的一直减半，会比你说得出的任何距离都短：走 34 步以后，它就比一个原子还小了。一个永远加不完的和，在数学上就是指它越来越靠近的那个数，这里就是 1。所以 1/2 + 1/4 + 1/8 + …… = 1。",
  },
  aha: {
    en: "Infinitely many pieces can add up to an ordinary number: they all fit inside one 1-metre bar. After just 34 halvings, the gap left is smaller than an atom.",
    zh: "无限多段加起来，可以是一个普通的数：它们全都装在同一根 1 米长的条里。只要减半 34 次，剩下的缝就比一个原子还小。",
  },
  extension: {
    en: "What does 1/3 + 1/9 + 1/27 + … add up to? Hint: it's a very simple fraction, and the bar picture still works.",
    zh: "1/3 + 1/9 + 1/27 + …… 加起来是多少？提示：是一个很简单的分数，那根条的画法照样能用。",
  },
  discussionPrompt: {
    en: "Draw one picture that would convince an 8-year-old that 1/2 + 1/4 + 1/8 + … is exactly 1. What would you draw?",
    zh: "画一张图，让一个 8 岁的孩子一眼看懂为什么 1/2 + 1/4 + 1/8 + …… 正好是 1。你会画什么？",
  },
  solutionTags: ["draw", "pattern", "algebra"],
  funFact: {
    en: "The Greek thinker Zeno told stories like this about 2,400 years ago to argue that nothing can ever really move. It took mathematicians more than 2,000 years to explain clearly what was wrong with them.",
    zh: "大约 2,400 年前，古希腊的芝诺就讲过这样的故事，想「证明」东西根本动不起来。数学家花了两千多年，才把他错在哪里讲清楚。",
  },
  sortOrder: 10,
  rubricNotes:
    "17/20 — hook 2, guess 2, hands-on 2, aha 2, floor 1, ceiling 2, paths 2, wrong 2, hints 1, retell 1: infinite sums are a 12+ idea; paths are the bar picture and the 'walked + left = 1' algebra; hint 3 nearly states the argument",
};

export const HUGE_NUMBERS: readonly HeroQuestionBlueprint[] = [
  gaussSum,
  chessboardRice,
  foldToTheMoon,
  millionSeconds,
  billionHeartbeats,
  handshakeParty,
  googolVsAtoms,
  halfwayToTheWall,
];
