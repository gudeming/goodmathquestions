/**
 * World B · Shapes that lie (`shapes-that-lie`). Catalog: 02-hero-question-catalog.md §B.
 * Batch 1: B1 squares-on-chessboard. Batch 2: B2 pizza-cuts, B4 fence-shaper.
 * TODO(phase-3 batch 3): B3 and B5-B11 once circle_rope, dissection_slide, pythagoras_squares,
 * bridges_trace, clock_overlap, tiling_lab, domino_tiling and mobius_cut land.
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

/** B2. Lazy caterer: 4 cuts -> 1 + 1 + 2 + 3 + 4 = 11 pieces. */
export const pizzaCuts: HeroQuestionBlueprint = {
  slug: "pizza-cuts",
  collection: "shapes-that-lie",
  kind: "PUZZLE",
  ageGroup: "AGE_8_10",
  difficulty: "MEDIUM",
  category: "GEOMETRY",
  title: { en: "Four Cuts, How Many Slices?", zh: "四刀最多切几块" },
  hook: {
    en: "You get to cut a big pizza with a long, straight knife, and the pieces don't have to be the same size. With only four cuts, how many pieces can you make?",
    zh: "你拿一把长长的直刀切一张大披萨，每块不用一样大。只能切四刀，最多能切出几块？",
  },
  guess: {
    type: "slider",
    min: 4,
    max: 20,
    step: 1,
    unit: { en: "pieces", zh: "块" },
  },
  scene: { type: "pizza_cuts", maxCuts: 4 },
  prompt: {
    en: "Make 4 straight cuts across a round pizza. What is the greatest number of pieces you can get?",
    zh: "在一张圆披萨上直直地切 4 刀。最多能切出多少块？",
  },
  answer: { type: "NUMERIC", value: 11 },
  hints: [
    { en: "Cutting through the middle every time isn't the best plan. Try cuts that don't all meet at one point.", zh: "每一刀都切过中心，不是最好的办法。试试让几刀不要交在同一个点上。" },
    { en: "Count as you go: 1 cut makes 2 pieces, 2 cuts make 4. Where can the third cut go so it crosses both of the first two?", zh: "边切边数：1 刀 2 块，2 刀 4 块。第 3 刀放在哪里，才能同时穿过前两刀？" },
    { en: "A new cut adds one piece, plus one more for every old cut it crosses. Make each cut cross all the earlier cuts, at new points.", zh: "新的一刀本身多出 1 块，每穿过一条旧刀痕再多 1 块。让每一刀都穿过前面所有的刀，而且别穿过旧的交点。" },
  ],
  wrongAnswers: [
    {
      match: "8",
      feedback: {
        en: "Cutting through the centre, the normal way, gives 8. That's the fair way to share, but not the most pieces. Move one cut off-centre and count again.",
        zh: "像平常那样每刀都过中心，就是 8 块。这样分得公平，但不是最多的。把一刀挪开中心，再数一数。",
      },
    },
    {
      match: "16",
      feedback: {
        en: "You doubled with every cut: 2, 4, 8, 16. Doubling needs a cut to go through every piece, but a third straight cut can only pass through 3 of the 4 pieces.",
        zh: "你每刀都翻了一倍：2、4、8、16。可是要翻倍，这一刀得穿过每一块，而第 3 刀最多只能穿过 4 块里的 3 块。",
      },
    },
    {
      match: "10",
      feedback: {
        en: "You added 1 + 2 + 3 + 4 = 10. Nice pattern! But don't forget the pizza you started with: before any cut, there's already 1 piece.",
        zh: "你算的是 1 + 2 + 3 + 4 = 10，规律找得好！可是别忘了一开始还没切的时候，披萨本身就是 1 块。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "Four straight cuts can't make that many. The fourth cut crosses at most 3 old cuts, so it adds at most 4 pieces to the 7 you already had.",
        zh: "直直的 4 刀切不出这么多。第 4 刀最多穿过 3 条旧刀痕，所以最多在原来 7 块的基础上再多 4 块。",
      },
    },
  ],
  explanation: {
    en: "Each new cut adds one piece for itself, plus one for each earlier cut it crosses. So the four cuts add 1, 2, 3 and 4 pieces to the whole pizza you started with. That gives 1 + 1 + 2 + 3 + 4 = 11.",
    zh: "每切一刀，这一刀本身多出 1 块，每穿过一条旧刀痕再多 1 块。所以 4 刀分别多出 1、2、3、4 块，再加上一开始的整张披萨。一共 1 + 1 + 2 + 3 + 4 = 11 块。",
  },
  aha: {
    en: "The pieces go 2, 4, 7, 11: they don't double, each cut adds one more than the last. The trick is making every new cut cross all the old ones at new points.",
    zh: "块数是 2、4、7、11，不是翻倍，而是每刀比上一刀多加 1 块。诀窍是让每一刀都穿过所有旧刀痕，而且交在新的点上。",
  },
  extension: {
    en: "How many pieces can 5 cuts make? 10 cuts? Can you find a rule for any number of cuts?",
    zh: "5 刀最多几块？10 刀呢？你能找到任意刀数都适用的规律吗？",
  },
  discussionPrompt: {
    en: "Draw your 11-piece pizza. Is your drawing the same as someone else's, or did you find a different way to cut it?",
    zh: "把你切出 11 块的披萨画出来。你的画法和别人的一样吗，还是找到了不同的切法？",
  },
  solutionTags: ["draw", "pattern", "table"],
  funFact: {
    en: "Mathematicians call 1, 2, 4, 7, 11, 16, … the lazy caterer's sequence: the most pieces a lazy cook can get from a few straight cuts.",
    zh: "数学家把 1、2、4、7、11、16……叫作「懒厨师数列」：偷懒的厨师用几刀直刀最多能切出的块数。",
  },
  sortOrder: 2,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: drawing and counting is the main path, the 'each cut adds one more' rule comes out of it rather than beside it",
};

/** B4. 24 m of fence, whole-metre sides: 6 x 6 = 36 m². The wall variant (6 x 12 = 72) is the extension. */
export const fenceShaper: HeroQuestionBlueprint = {
  slug: "fence-shaper",
  collection: "shapes-that-lie",
  kind: "THREE_ACT",
  ageGroup: "AGE_8_10",
  difficulty: "EASY",
  category: "GEOMETRY",
  title: { en: "The Biggest Garden", zh: "围出最大的菜地" },
  hook: {
    en: "You have one long roll of fence to make a rectangle-shaped vegetable garden. You can make it long and skinny, or short and wide. Which shape gives your vegetables the most room?",
    zh: "你有一卷长长的围栏，要围一块长方形的菜地。可以围得又细又长，也可以围得又短又宽。哪种形状给蔬菜的地方最大？",
  },
  guess: {
    type: "slider",
    min: 10,
    max: 50,
    step: 1,
    unit: { en: "square metres", zh: "平方米" },
  },
  scene: { type: "fence_shaper", perimeter: 24, integerOnly: true, wallSide: false },
  prompt: {
    en: "The fence is 24 metres long and every side must be a whole number of metres. What is the biggest area the garden can have, in square metres?",
    zh: "围栏长 24 米，每条边都要是整数米。菜地最大能有多少平方米？",
  },
  answer: { type: "NUMERIC", value: 36, unit: { en: "m²", zh: "平方米" } },
  hints: [
    { en: "The fence goes all the way around, so one long side plus one short side uses half of it. What do those two sides add up to?", zh: "围栏要绕一整圈，所以一条长边加一条短边只用了一半的围栏。这两条边加起来是几米？" },
    { en: "Make a table. If one side is 1 m the other is 11 m, and the area is 11. Try 2 m and 10 m, then 3 m and 9 m…", zh: "列个表。一边 1 米，另一边就是 11 米，面积是 11。再试 2 米和 10 米，3 米和 9 米……" },
    { en: "Watch the areas in your table: they grow, then shrink. The biggest one comes when the two sides are as close to each other as they can get.", zh: "看表里的面积：先变大，再变小。两条边越接近，面积越大，最大的那个出现在两条边尽量接近的时候。" },
  ],
  wrongAnswers: [
    {
      match: "24",
      feedback: {
        en: "24 metres is how long the fence is, all the way around. The question asks for the space inside: length × width.",
        zh: "24 米是围栏绕一圈的长度。题目问的是里面的地有多大：长 × 宽。",
      },
    },
    {
      match: "35",
      feedback: {
        en: "5 × 7 = 35 is really close! Can you make the two sides even closer to each other and still use exactly 24 m of fence?",
        zh: "5 × 7 = 35，非常接近了！还能让两条边更接近，同时正好用完 24 米围栏吗？",
      },
    },
    {
      match: "11",
      feedback: {
        en: "That's the long skinny garden, 11 × 1. It uses all the fence, but almost all of it goes on the two long sides. Try making it wider.",
        zh: "这是又细又长的 11 × 1。围栏都用上了，可几乎全花在两条长边上。试着把它围宽一点。",
      },
    },
    {
      match: "144",
      feedback: {
        en: "That's 12 × 12, but a 12 m by 12 m square needs 48 m of fence. Remember the fence has to go around all four sides.",
        zh: "这是 12 × 12，可是 12 米乘 12 米的正方形要 48 米围栏。别忘了围栏要围四条边。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "No rectangle made from 24 m of fence is that big. Check that your long side and short side add up to 12 m.",
        zh: "24 米围栏围不出这么大的长方形。检查一下长边加短边是不是 12 米。",
      },
    },
  ],
  explanation: {
    en: "Half the fence, 12 m, makes one long side and one short side. The choices are 1 + 11, 2 + 10, … up to 6 + 6, with areas 11, 20, 27, 32, 35 and 36. The 6 m by 6 m square wins with 36 square metres.",
    zh: "一半的围栏是 12 米，正好是一条长边加一条短边。可以是 1 + 11、2 + 10……一直到 6 + 6，面积分别是 11、20、27、32、35、36。6 米乘 6 米的正方形最大，有 36 平方米。",
  },
  aha: {
    en: "With the same fence, the closer the shape is to a square, the more room inside. The skinny 11 × 1 garden gets only 11 square metres, less than a third of the square's.",
    zh: "围栏一样长，形状越接近正方形，里面的地就越大。又细又长的 11 × 1 只有 11 平方米，还不到正方形的三分之一。",
  },
  extension: {
    en: "Now put the garden against a wall, so you only need to fence three sides. What's the biggest garden now? And what if the fence could bend into any shape at all?",
    zh: "如果菜地靠着一面墙，只要围三条边，最大能围多大？如果围栏可以弯成任何形状呢？",
  },
  discussionPrompt: {
    en: "When you dragged the slider, the area grew and then shrank. Why does it start shrinking once you go past the square?",
    zh: "拖滑块的时候，面积先变大再变小。为什么过了正方形以后，面积就开始变小？",
  },
  solutionTags: ["table", "guess_check", "draw", "pattern"],
  funFact: {
    en: "If the fence could bend into a circle, 24 m would hold about 46 square metres, even more than the square. For the same length of fence, a circle beats every other shape.",
    zh: "如果围栏能弯成圆形，24 米能围出大约 46 平方米，比正方形还大。围栏一样长的时候，圆形比任何形状围得都多。",
  },
  sortOrder: 4,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: table and slider are really the same try-every-rectangle path; the wall and circle extensions lead to a real rule",
};

export const SHAPES_THAT_LIE: readonly HeroQuestionBlueprint[] = [squaresOnChessboard, pizzaCuts, fenceShaper];
