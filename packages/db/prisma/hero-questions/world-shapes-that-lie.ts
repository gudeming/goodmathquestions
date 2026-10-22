/**
 * World B · Shapes that lie (`shapes-that-lie`). Catalog: 02-hero-question-catalog.md §B.
 * Batch 1: B1 squares-on-chessboard. Batch 2: B2 pizza-cuts, B4 fence-shaper. Batch 3: B3
 * rope-around-earth (circle_rope), B6 pythagoras-squares, B7 seven-bridges (bridges_trace),
 * B8 clock-hands-meet (clock_overlap).
 * Editorial pass 1: titles read as story names, hints name the scenes' real controls (size buttons,
 * "Count the bridges", the "🔒 Right angle" toggle, the "extra rope" slider), facts re-checked.
 * TODO(phase-3): B5, B9-B11 once dissection_slide, tiling_lab, domino_tiling and mobius_cut land.
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
  title: { en: "The Hidden Squares", zh: "藏起来的正方形" },
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
    en: "A chessboard is an 8 × 8 grid. Count every square of every size, from 1 × 1 up to the whole board. How many squares are there?",
    zh: "棋盘是 8 × 8 的方格。从 1 × 1 到整个棋盘，所有大小的正方形都算。一共有多少个？",
  },
  answer: { type: "NUMERIC", value: 204 },
  hints: [
    { en: "A square can be bigger than one cell. Press the \"2×2\" button in the scene and slide the frame around: every spot it fits is another square.", zh: "正方形不一定只有一格大。在场景里点「2×2」，把方框挪来挪去：它能放下的每个位置都是一个正方形。" },
    { en: "On paper, try a tiny 3 × 3 board first. Count the 1 × 1 squares, then the 2 × 2, then the 3 × 3. Do you get 9 + 4 + 1?", zh: "先在纸上试一个 3 × 3 的小棋盘。数一数 1 × 1 的，再数 2 × 2 的，最后数 3 × 3 的。是不是 9 + 4 + 1？" },
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
  title: { en: "The Lazy Chef's Pizza", zh: "懒厨师的披萨" },
  hook: {
    en: "A lazy chef wants as many slices as possible with as little work as possible. He has a long, straight knife, and the slices don't have to be the same size. With only four cuts, how many pieces can he make?",
    zh: "一个懒厨师想少切几刀，又想切出尽量多的块。他有一把长长的直刀，每块不用一样大。只切四刀，最多能切出几块？",
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
    en: "Make 4 straight cuts across a round pizza. At most, how many pieces can you get?",
    zh: "在一张圆披萨上直直地切 4 刀。最多能切出多少块？",
  },
  answer: { type: "NUMERIC", value: 11 },
  hints: [
    { en: "Cutting through the middle every time isn't the best plan: the \"All through the centre\" button shows why. Drag cuts that don't all meet at one point.", zh: "每一刀都切过中心，不是最好的办法：点「全部过圆心」就知道为什么。试着拖出几刀，不要都交在同一个点上。" },
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
    en: "The fence is 24 metres long and every side must be a whole number of metres. How big can the garden be, in square metres?",
    zh: "围栏长 24 米，每条边都要是整数米。菜地最大能有多少平方米？",
  },
  answer: { type: "NUMERIC", value: 36, unit: { en: "m²", zh: "平方米" } },
  hints: [
    { en: "The fence goes all the way around, so one long side plus one short side uses half of it. What do those two sides add up to?", zh: "围栏要绕一整圈，所以一条长边加一条短边只用了一半的围栏。这两条边加起来是几米？" },
    { en: "Drag the \"width\" slider one metre at a time, or make a table: 1 m and 11 m gives 11, then try 2 m and 10 m, 3 m and 9 m…", zh: "把「宽」的滑块一米一米地拖，或者列个表：1 米和 11 米，面积是 11；再试 2 米和 10 米，3 米和 9 米……" },
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

/** B3. gap = 1 / 2π m = 15.92 cm for any planet. The scene proposes "16" (cm) when the slider hits 1 m. */
export const ropeAroundEarth: HeroQuestionBlueprint = {
  slug: "rope-around-earth",
  collection: "shapes-that-lie",
  kind: "ESTIMATION",
  ageGroup: "AGE_12_14",
  difficulty: "HARD",
  category: "GEOMETRY",
  title: { en: "A Rope Around the Earth", zh: "绕地球的绳子" },
  hook: {
    en: "A rope is wrapped tightly around the Earth's equator, hugging the ground all the way round. You make the rope just one metre longer and lift it evenly, so it floats at the same height everywhere. What could crawl underneath?",
    zh: "一根绳子紧紧贴着赤道，绕地球一圈。你把绳子只加长 1 米，再把它均匀地撑起来，让它在每个地方离地面都一样高。下面能钻过去什么？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "hair", en: "Nothing thicker than a hair", zh: "只有头发丝那么细的东西" },
      { id: "finger", en: "A finger", zh: "一根手指" },
      { id: "cat", en: "A cat, if it squeezes", zh: "一只猫（挤一挤）" },
      { id: "car", en: "A car", zh: "一辆车" },
    ],
  },
  scene: {
    type: "circle_rope",
    extraMetersMax: 12,
    planets: [
      { id: "basketball", label: { en: "a basketball", zh: "篮球" }, radiusM: 0.12, emoji: "🏀" },
      { id: "earth", label: { en: "the Earth", zh: "地球" }, radiusM: 6_371_000, emoji: "🌍" },
      { id: "sun", label: { en: "the Sun", zh: "太阳" }, radiusM: 696_340_000, emoji: "☀️" },
    ],
  },
  prompt: {
    en: "The rope around the equator is made 1 metre longer and lifted evenly all the way round. How high is the gap between the rope and the ground, in centimetres?",
    zh: "绕赤道的绳子加长 1 米，再均匀地撑起来。绳子和地面之间的缝有多高？用厘米回答。",
  },
  answer: { type: "ESTIMATE", min: 15, max: 17, truth: 15.9, unit: { en: "cm", zh: "厘米" } },
  hints: [
    { en: "The Earth is so big that it gets in the way of thinking. Set the \"extra rope\" slider to exactly 1 m, then tap 🏀 and 🌍 to compare a basketball with the Earth.", zh: "地球太大了，反而让人想不清楚。把「加长」滑块拖到正好 1 米，再点 🏀 和 🌍，比一比篮球和地球。" },
    { en: "A rope around a circle is 2π × the radius long. If the rope is lifted by a gap g, the radius grows by g. How much longer does the rope get?", zh: "绕圆一圈的绳长 = 2π × 半径。绳子被撑高 g，半径就变大 g。绳子要长多少？" },
    { en: "Extra rope = 2π × g, and the extra rope is 1 metre. So g = 1 ÷ 2π metres. Work it out and turn it into centimetres.", zh: "加长的绳子 = 2π × g，而加长的是 1 米。所以 g = 1 ÷ 2π 米。算出来，再换成厘米。" },
  ],
  wrongAnswers: [
    {
      match: "regex:^\\s*0?\\.1[5-7]",
      feedback: {
        en: "That's the right size, but in metres! The answer is asked in centimetres, and 1 m = 100 cm.",
        zh: "大小算对了，可这是以米为单位！题目要的是厘米，1 米 = 100 厘米。",
      },
    },
    {
      match: "regex:^\\s*3[12](\\.\\d+)?\\s*$",
      feedback: {
        en: "That's 1 ÷ π, about 32 cm: how much longer the rope's DIAMETER gets. The gap is only on one side, so it's the radius you need: divide by 2π.",
        zh: "这是 1 ÷ π，大约 32 厘米，是直径变长了多少。缝只是一边的高度，要看的是半径：除以 2π。",
      },
    },
    {
      match: "gt:90",
      feedback: {
        en: "100 cm is the extra rope itself. That metre is spread out around the whole circle, so the rope lifts much less than a metre.",
        zh: "100 厘米是加长的那段绳子本身。这 1 米要分摊到整整一圈上，绳子被撑起来的高度要小得多。",
      },
    },
    {
      match: "lt:1",
      feedback: {
        en: "It feels like 1 metre spread over 40,000 km should vanish. But the gap doesn't depend on how big the Earth is at all. Add the same metre to the basketball and to the Earth in the scene.",
        zh: "感觉 1 米分摊到 4 万千米上，应该几乎没有了。可是缝的大小和地球多大根本没关系。在场景里给篮球和地球都加 1 米试试。",
      },
    },
    {
      match: "lt:15",
      feedback: {
        en: "A bit low. Check the π step: the gap is 1 metre ÷ 2π, and 2π is about 6.28.",
        zh: "有点低。检查 π 那一步：缝 = 1 米 ÷ 2π，而 2π 大约是 6.28。",
      },
    },
    {
      match: "gt:17",
      feedback: {
        en: "A bit high. The gap is 1 metre ÷ 2π, and 2π is about 6.28. How many centimetres is 100 ÷ 6.28?",
        zh: "有点高。缝 = 1 米 ÷ 2π，2π 大约是 6.28。100 ÷ 6.28 是多少厘米？",
      },
    },
  ],
  explanation: {
    en: "A circle's distance around is 2π × its radius, so lifting the rope by a gap g makes it 2π × g longer. The rope got 1 metre longer, so 2π × g = 1 m and g = 1 ÷ 2π ≈ 0.159 m. That's about 16 cm: a cat can squeeze under.",
    zh: "圆的周长是 2π × 半径，所以绳子被撑高 g，就会变长 2π × g。绳子长了 1 米，所以 2π × g = 1 米，g = 1 ÷ 2π ≈ 0.159 米。也就是大约 16 厘米：一只猫挤一挤就能钻过去。",
  },
  aha: {
    en: "The size of the Earth cancels out completely. A basketball, the Earth or the Sun: one extra metre of rope always lifts it about 16 cm.",
    zh: "地球有多大，在算式里完全抵消了。篮球、地球还是太阳，多 1 米绳子，缝都是大约 16 厘米。",
  },
  extension: {
    en: "How much longer would the rope need to be for a grown-up, 1.8 m tall, to walk underneath? Guess first, then check with the slider.",
    zh: "绳子要加长多少，一个 1.8 米高的大人才能从下面走过去？先猜，再用滑块验证。",
  },
  discussionPrompt: {
    en: "The hints used 'rope = 2π × radius'. Can you explain the same thing with 'distance around = π × distance across' instead? Which way would convince your friend faster?",
    zh: "提示里用的是「绳长 = 2π × 半径」。你能换成「周长 = π × 直径」来讲同一件事吗？哪种讲法更快说服你的朋友？",
  },
  solutionTags: ["algebra", "draw", "guess_check"],
  funFact: {
    en: "Adding 1 metre to the 40,000 km equator is like adding much less than a hair's width to a 400-metre running track. Yet the gap is still 16 cm.",
    zh: "给 4 万千米长的赤道加 1 米，就像给 400 米的跑道加上不到一根头发丝的粗细。可是缝照样有 16 厘米。",
  },
  sortOrder: 3,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 1, ceiling 2, paths 1, wrong 2, hints 2, retell 2: needs C = 2πr, so 12+; the scene lets kids see that the ball's size doesn't matter before any algebra, but the algebra is the one real proof",
};

/** B6. 6² + 8² = 100 = 10²; the scene's tile reveal needs the perfect-square hypotenuse. */
export const pythagorasSquares: HeroQuestionBlueprint = {
  slug: "pythagoras-squares",
  collection: "shapes-that-lie",
  kind: "THREE_ACT",
  ageGroup: "AGE_12_14",
  difficulty: "MEDIUM",
  category: "GEOMETRY",
  title: { en: "The Secret of Three Squares", zh: "三个正方形的秘密" },
  hook: {
    en: "Draw a triangle with one square corner, and build a square on each of its three sides. Put the two smaller squares together and compare them with the biggest one: which has more area?",
    zh: "画一个有直角的三角形，在它的三条边上各搭一个正方形。把两个小正方形合在一起，和最大的那个比一比，谁的面积大？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "big", en: "The big square", zh: "大正方形更大" },
      { id: "same", en: "Exactly the same", zh: "正好一样大" },
      { id: "small", en: "The two small ones together", zh: "两个小的加起来更大" },
    ],
  },
  scene: { type: "pythagoras_squares", a: 6, b: 8, lockRightAngle: true },
  prompt: {
    en: "A right triangle has two shorter sides of 6 and 8. How long is its longest side?",
    zh: "一个直角三角形的两条直角边是 6 和 8。它最长的那条边（斜边）有多长？",
  },
  answer: { type: "NUMERIC", value: 10 },
  hints: [
    { en: "Think about the squares, not the sides. The numbers inside the squares in the scene are their areas: count a few tiles to check that 6 × 6 really is 36.", zh: "先别想边，想正方形。场景里正方形上的数是它们的面积：数几块小方格，验证一下 6 × 6 真的是 36。" },
    { en: "Drag a pink corner to try other right triangles, like 3 and 4. Do the two small areas always add up to exactly the big one?", zh: "拖动粉色的顶点，试试别的直角三角形，比如 3 和 4。两个小面积加起来，是不是总是正好等于大的那个？" },
    { en: "So the big square here has area 36 + 64 = 100. Its side is the number that, multiplied by itself, gives 100.", zh: "所以这里大正方形的面积是 36 + 64 = 100。它的边长，就是自己乘自己等于 100 的那个数。" },
  ],
  wrongAnswers: [
    {
      match: "14",
      feedback: {
        en: "6 + 8 = 14 would only be right if the triangle were squashed flat into a line. Cutting across a corner is always shorter than walking around it.",
        zh: "6 + 8 = 14，那得是三角形被压扁成一条直线才行。斜着抄近路，总比沿着两条边绕过去要短。",
      },
    },
    {
      match: "100",
      feedback: {
        en: "100 is the AREA of the big square, so you're one step away. Its side is the number that, times itself, makes 100.",
        zh: "100 是大正方形的面积，你只差一步了。边长是自己乘自己等于 100 的那个数。",
      },
    },
    {
      match: "7",
      feedback: {
        en: "7 is halfway between 6 and 8. But the longest side of a right triangle is always longer than each of the other two.",
        zh: "7 是 6 和 8 的平均数。可是直角三角形最长的边，一定比另外两条都长。",
      },
    },
    {
      match: "48",
      feedback: {
        en: "48 is 6 × 8. That's twice the triangle's area, not a length. Try building squares on the sides instead.",
        zh: "48 是 6 × 8，那是三角形面积的两倍，不是边长。试试在边上搭正方形。",
      },
    },
    {
      match: "lt:8",
      feedback: {
        en: "The longest side can't be shorter than 8: it sits opposite the biggest angle, the right angle.",
        zh: "最长的边不可能比 8 短：它对着最大的那个角，也就是直角。",
      },
    },
  ],
  explanation: {
    en: "Build a square on each side: the squares on the short sides have areas 6 × 6 = 36 and 8 × 8 = 64. In a right triangle the two small squares together fill the big square exactly, so the big square's area is 36 + 64 = 100. Its side is 10, because 10 × 10 = 100.",
    zh: "在每条边上搭正方形：两条直角边上的正方形面积是 6 × 6 = 36 和 8 × 8 = 64。直角三角形的两个小正方形加起来，正好铺满大正方形，所以大正方形的面积是 36 + 64 = 100。它的边长是 10，因为 10 × 10 = 100。",
  },
  aha: {
    en: "The two small squares exactly fill the big one, but only when the corner is a perfect right angle. That's Pythagoras' theorem, and it is really a fact about area.",
    zh: "两个小正方形正好铺满大正方形，可只有在正好是直角的时候才成立。这就是勾股定理，它说的其实是面积。",
  },
  extension: {
    en: "What if the short sides are 5 and 12? Can you find other right triangles whose three sides are all whole numbers?",
    zh: "如果两条直角边是 5 和 12 呢？你还能找到三条边都是整数的直角三角形吗？",
  },
  discussionPrompt: {
    en: "Tap \"🔒 Right angle\" so it says \"🔓 Free corner\", then drag the top corner. When do the two small squares beat the big one, and when do they lose? Can you say why?",
    zh: "点「🔒 锁定直角」，让它变成「🔓 自由顶点」，再拖动上面的顶点。什么时候两个小正方形加起来更大？什么时候更小？你能说出为什么吗？",
  },
  solutionTags: ["draw", "algebra", "pattern"],
  funFact: {
    en: "Your 6-8-10 triangle is the famous 3-4-5 triangle doubled. The 2,000-year-old Chinese book Zhoubi Suanjing already describes 3-4-5, calling the two short sides gou and gu, which is why Chinese still calls it the gou-gu theorem.",
    zh: "你这个 6、8、10 的三角形，就是有名的 3、4、5 放大了一倍。两千多年前的《周髀算经》里就写着「勾广三，股修四，径隅五」，后人简称「勾三股四弦五」，勾股定理的名字就是这么来的。",
  },
  sortOrder: 6,
  rubricNotes:
    "17/20 — hook 2, guess 1, hands-on 2, aha 2, floor 1, ceiling 2, paths 2, wrong 2, hints 2, retell 1: the scene's hook already shows 36, 64, 100 and a² + b² = c², which takes the edge off the guess; area tiles, trying other right triangles (hint 2) and the square root are real paths; needs squares and roots, so 12+",
};

/**
 * B7. Königsberg: degrees north 3, south 3, island 5, east 3 → four odd lands, no Euler walk.
 * A third option ("only from the right start") gives the second wrong answer a real misconception.
 */
export const sevenBridges: HeroQuestionBlueprint = {
  slug: "seven-bridges",
  collection: "shapes-that-lie",
  kind: "PUZZLE",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "LOGIC",
  title: { en: "The Seven Bridges Walk", zh: "走遍七座桥" },
  hook: {
    en: "An old city sits on a river with two islands, and seven bridges join all the land together. On Sundays people tried to find a walk that crosses every bridge exactly once. Can it be done?",
    zh: "一座老城建在河边，河里有两个小岛，七座桥把陆地都连在一起。星期天，城里的人总想找一条散步路线，每座桥正好走一次。能做到吗？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "possible", en: "Possible", zh: "能做到" },
      { id: "start", en: "Possible, but only from the right starting place", zh: "能，但要从对的地方出发" },
      { id: "impossible", en: "Impossible, wherever you start", zh: "从哪里出发都做不到" },
    ],
  },
  scene: {
    type: "bridges_trace",
    nodes: [
      { id: "north", x: 50, y: 12, label: { en: "North bank", zh: "北岸" } },
      { id: "south", x: 50, y: 88, label: { en: "South bank", zh: "南岸" } },
      { id: "island", x: 38, y: 50, label: { en: "Island", zh: "小岛" } },
      { id: "east", x: 82, y: 50, label: { en: "East island", zh: "东岛" } },
    ],
    edges: [
      ["north", "island"],
      ["north", "island"],
      ["south", "island"],
      ["south", "island"],
      ["north", "east"],
      ["south", "east"],
      ["island", "east"],
    ],
    layout: "konigsberg",
    solvable: false,
  },
  prompt: {
    en: "Is there a walk that crosses each of the seven bridges exactly once? You may start and finish anywhere.",
    zh: "有没有一种走法，七座桥每座正好走一次？从哪里出发、在哪里结束都可以。",
  },
  answer: { type: "CHOICE", correctId: "impossible" },
  hints: [
    { en: "Stop walking for a moment and start counting. For each piece of land, how many bridges touch it? (The \"Count the bridges\" button writes it on the map.)", zh: "先别走了，数一数。每块陆地连着几座桥？（点「数每块地的桥」，数字会写在地图上。）" },
    { en: "Every time you walk THROUGH a piece of land, you use two bridges: one in, one out. So should a walk-through land have an odd or an even number of bridges?", zh: "每次「穿过」一块陆地，你都要用两座桥：一座进，一座出。那么被穿过的陆地，连着的桥数应该是奇数还是偶数？" },
    { en: "Only the start and the finish of a walk can have an odd number of bridges. Count how many lands here have an odd number.", zh: "一条路线只有起点和终点可以连着奇数座桥。数一数，这里有几块陆地连着奇数座桥？" },
  ],
  wrongAnswers: [
    {
      match: "choice:possible",
      feedback: {
        en: "It really feels like one more try will do it! But count the bridges at each piece of land: all four have an odd number, and a walk only has two ends.",
        zh: "总觉得再试一次就成功了！可是数一数每块陆地的桥：四块都是奇数，而一条路线只有两个端点。",
      },
    },
    {
      match: "choice:start",
      feedback: {
        en: "Good thinking: in many puzzles like this the start does matter. Here, though, every land has an odd number of bridges, so wherever you start, at least two of them get stuck in the middle of your walk.",
        zh: "想得好：在很多这样的谜题里，起点确实很重要。可是这里每块陆地都连着奇数座桥，不管从哪里出发，至少有两块会卡在路线中间。",
      },
    },
  ],
  explanation: {
    en: "Each time your walk passes through a piece of land, it uses two bridges, one in and one out. So every land in the middle of the walk needs an even number of bridges, and only the start and the finish may have an odd number. Here the four lands have 5, 3, 3 and 3 bridges: four odd lands, but a walk has only two ends. So it is impossible.",
    zh: "路线每穿过一块陆地，就要用两座桥，一进一出。所以在路线中间的陆地都要连着偶数座桥，只有起点和终点可以是奇数。这里四块陆地分别连着 5、3、3、3 座桥：四块都是奇数，可一条路线只有两个端点。所以做不到。",
  },
  aha: {
    en: "You don't need to try every route: just count the bridges at each piece of land. Euler worked this out in 1736, and it started a new kind of math called graph theory.",
    zh: "不用把每条路线都试一遍，只要数每块陆地连着几座桥。欧拉在 1736 年想通了这一点，还因此开创了一门新数学：图论。",
  },
  extension: {
    en: "Take away one bridge, any one you like. Is the walk possible now? Does it matter which bridge you remove?",
    zh: "拆掉一座桥，随便哪座。现在能走了吗？拆哪一座有区别吗？",
  },
  discussionPrompt: {
    en: "Can you draw a map of islands and bridges that a friend CAN walk in one go? How did you know it works before you tried it?",
    zh: "你能画一张有岛和桥的地图，让朋友能一次走完吗？还没试之前，你是怎么知道它一定行的？",
  },
  solutionTags: ["draw", "guess_check", "pattern"],
  funFact: {
    en: "The city was Königsberg, now called Kaliningrad. The same counting trick tells you whether you can draw a shape without lifting your pencil.",
    zh: "这座城叫柯尼斯堡，就是今天的加里宁格勒。同样的数桥办法，还能判断一个图形能不能一笔画出来。",
  },
  sortOrder: 7,
  rubricNotes:
    "19/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 2: the scene is the puzzle; trying routes and counting bridges end in the same argument, so it's really one path",
};

/**
 * B8. overlapTimes(24) counts [0, 1440): midnight once, next midnight excluded = 22.
 * The prompt pins that convention down so 21 and 23 get their own feedback.
 */
export const clockHandsMeet: HeroQuestionBlueprint = {
  slug: "clock-hands-meet",
  collection: "shapes-that-lie",
  kind: "THREE_ACT",
  ageGroup: "AGE_10_12",
  difficulty: "HARD",
  category: "LOGIC",
  title: { en: "The Clock-Hand Chase", zh: "钟面上的追赶" },
  hook: {
    en: "At midnight, the hour hand and the minute hand of a clock lie exactly on top of each other. Then the minute hand races ahead while the hour hand creeps along behind. In one whole day, counting that midnight meeting, how many times are they together?",
    zh: "半夜 12 点，钟的时针和分针正好叠在一起。接着分针飞快地往前跑，时针慢慢地在后面挪。算上半夜那一次，一整天里它们会叠在一起几次？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "12", en: "12 times", zh: "12 次" },
      { id: "22", en: "22 times", zh: "22 次" },
      { id: "24", en: "24 times", zh: "24 次" },
      { id: "48", en: "48 times", zh: "48 次" },
    ],
  },
  scene: { type: "clock_overlap", hours: 24, overlaps: 22 },
  prompt: {
    en: "Start at midnight, when the hands overlap, and count that as the first time. In the 24 hours before the next midnight, how many times do the hands overlap? (The next midnight starts a new day, so don't count it.)",
    zh: "从半夜 12 点开始，那时两针重合，算第 1 次。到下一个半夜 12 点之前的 24 小时里，两针一共重合几次？（下一个半夜 12 点是新的一天，不算。）",
  },
  answer: { type: "NUMERIC", value: 22 },
  hints: [
    { en: "Don't do a whole day yet: look at just 12 hours. Drag the minute hand round to 1 o'clock. Where is the hour hand? When does the minute hand catch up again?", zh: "先别算一整天，只看 12 个小时。拖着分针转到 1 点整。时针在哪里？分针什么时候再追上它？" },
    { en: "The minute hand catches the hour hand a little after 1:05, a little after 2:10, a little after 3:16 … What happens around 11 o'clock?", zh: "分针在 1:05 多一点、2:10 多一点、3:16 多一点……追上时针。到了 11 点左右会怎样？" },
    { en: "Between 11 and 12 the minute hand doesn't catch up until exactly 12:00. So 12 hours hold only 11 meetings, counting the one at the start. Now do a whole day.", zh: "11 点到 12 点之间，分针要到 12 点整才追上。所以 12 小时里，算上开头那次，只重合 11 次。再算一整天。" },
  ],
  wrongAnswers: [
    {
      match: "24",
      feedback: {
        en: "It's natural to think 'once every hour'. But the hour hand keeps moving too, so each catch-up takes a bit more than an hour: about 1 hour 5 minutes. Look closely between 11 and 12 o'clock.",
        zh: "很自然会想「每小时一次」。可是时针也在走，所以每次追上要比一小时多一点，大约 1 小时 5 分。仔细看看 11 点到 12 点之间。",
      },
    },
    {
      match: "12",
      feedback: {
        en: "12 is 'once an hour' for half a day. But the hands meet a little less often than once an hour, and a whole day has two trips of the hour hand round the clock.",
        zh: "12 是半天里「每小时一次」。可是两针重合比每小时一次还少一点，而且一整天里时针要转两圈。",
      },
    },
    {
      match: "11",
      feedback: {
        en: "11 is exactly right for 12 hours! But a whole day is 24 hours, so the hour hand goes round twice.",
        zh: "12 小时里正好是 11 次！可是一整天有 24 小时，时针要转两圈。",
      },
    },
    {
      match: "21",
      feedback: {
        en: "So close! You probably left out the overlap at midnight, where we started. It counts as the first one.",
        zh: "很接近了！你可能没算开头半夜 12 点那一次。它算第 1 次。",
      },
    },
    {
      match: "23",
      feedback: {
        en: "So close! You may have counted both midnights. The next midnight starts a new day, so leave it out.",
        zh: "很接近了！你可能把两个半夜 12 点都算上了。下一个半夜 12 点是新的一天，不算。",
      },
    },
    {
      match: "48",
      feedback: {
        en: "48 would be twice an hour. The minute hand laps the hour hand only about once an hour, and a little less.",
        zh: "48 是每小时两次。分针大约一小时才追上时针一次，还不到一次。",
      },
    },
  ],
  explanation: {
    en: "In 12 hours the minute hand goes round 12 times and the hour hand once, so the minute hand gains only 12 − 1 = 11 laps and catches the hour hand 11 times. They meet at 12:00, about 1:05, about 2:11 and so on, but the '11 o'clock' meeting slides all the way to 12:00. That makes 11 meetings every 12 hours, and 2 × 11 = 22 in a whole day.",
    zh: "12 小时里，分针转 12 圈，时针转 1 圈，所以分针只比时针多转 12 − 1 = 11 圈，也就只追上 11 次。它们在 12:00、大约 1:05、大约 2:11……相遇，而「11 点那一次」一直滑到了 12:00。所以每 12 小时重合 11 次，一整天是 2 × 11 = 22 次。",
  },
  aha: {
    en: "The hour hand is a moving target, so each catch-up takes 1 hour 5 minutes and 27 seconds, not one hour. Those extra minutes add up until a whole meeting disappears.",
    zh: "时针也在往前走，所以分针每次要追 1 小时 5 分 27 秒，而不是 1 小时。多出来的几分钟一点点攒起来，最后整整吃掉了一次重合。",
  },
  extension: {
    en: "How many times a day do the two hands point in exactly opposite directions, making one straight line through the centre?",
    zh: "一天里，时针和分针有几次正好指向相反的方向，连成一条穿过中心的直线？",
  },
  discussionPrompt: {
    en: "Which overlap surprised you most when you dragged the minute hand round? Write down its time and explain why it lands there.",
    zh: "你在场景里拖动分针时，哪一次重合最让你意外？写下它的时间，说说为什么会在那里。",
  },
  solutionTags: ["simulate", "table", "pattern"],
  funFact: {
    en: "Watch adverts usually set the hands to about 10:10. The hands look like a smile, and they don't cover the maker's name.",
    zh: "手表广告里的指针通常停在 10:10 左右，看起来像在笑，也不会挡住表盘上的名字。",
  },
  sortOrder: 8,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 2, wrong 2, hints 1, retell 1: dragging the minute hand, a table of meeting times and the 'laps' argument all work; hint 3 gives away the 11-per-12-hours step",
};

export const SHAPES_THAT_LIE: readonly HeroQuestionBlueprint[] = [
  squaresOnChessboard,
  pizzaCuts,
  ropeAroundEarth,
  fenceShaper,
  pythagorasSquares,
  sevenBridges,
  clockHandsMeet,
];
