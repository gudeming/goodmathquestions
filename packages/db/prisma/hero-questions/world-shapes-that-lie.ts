/**
 * World B · Shapes that lie (`shapes-that-lie`). Catalog: 02-hero-question-catalog.md §B.
 * Batch 1: B1 squares-on-chessboard. Batch 2: B2 pizza-cuts, B4 fence-shaper. Batch 3: B3
 * rope-around-earth (circle_rope), B6 pythagoras-squares, B7 seven-bridges (bridges_trace),
 * B8 clock-hands-meet (clock_overlap).
 * Editorial pass 1: titles read as story names, hints name the scenes' real controls (size buttons,
 * "Count the bridges", the "🔒 Right angle" toggle, the "extra rope" slider), facts re-checked.
 * Batch 4: B9 why-hexagons (tiling_lab; answered by numbers of sides), B10 mutilated-chessboard
 * (domino_tiling); B5 missing-square and B11 mobius-cut are `illustration` until the Tier-3
 * dissection_slide / mobius_cut scenes land.
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

/**
 * B5. Curry's triangle on a 13 × 5 grid. Illustration until the T3 `dissection_slide` scene lands
 * (待替换为 dissection_slide). Pieces: red 8 × 3 triangle (12), blue 5 × 2 (5), green 8 cells, yellow 7:
 * 32 in all, against 32.5 for a true triangle. Slopes 3/8 = 0.375 and 2/5 = 0.4, so neither "hypotenuse"
 * is straight: the top figure dents in (32), the bottom one bulges out (33 = 32 + the hole).
 */
export const missingSquare: HeroQuestionBlueprint = {
  slug: "missing-square",
  collection: "shapes-that-lie",
  kind: "PARADOX",
  ageGroup: "AGE_12_14",
  difficulty: "MEDIUM",
  category: "GEOMETRY",
  title: { en: "The Missing Square", zh: "消失的一格" },
  hook: {
    en: "Four coloured pieces fit together into a neat triangle. Swap them around and they make the very same triangle again, except that now there's a hole in it! Where did that square of area go?",
    zh: "四块彩色拼板拼成一个整齐的三角形。把它们换个位置再拼，还是一样大的三角形，中间却多出了一个洞！那一格面积跑到哪儿去了？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "shrunk", en: "The pieces secretly shrank a little", zh: "拼板被偷偷缩小了一点" },
      { id: "bent-hypotenuse", en: "The long side isn't really straight, so neither is a true triangle", zh: "长边其实不是直的，两个都不是真正的三角形" },
      { id: "really-vanished", en: "The square really did vanish", zh: "那一格真的消失了" },
    ],
  },
  scene: {
    type: "illustration",
    asset: "missing-square",
    caption: {
      en: "Top: four pieces make a triangle 13 squares wide and 5 high. Bottom: the same pieces leave a one-square hole.",
      zh: "上图：四块拼板拼成底 13 格、高 5 格的三角形。下图：同样的四块却留下一格空洞。",
    },
    revealAsset: "missing-square-reveal",
    revealCaption: {
      en: "Lay the two outlines on top of each other: the top one bends in, the bottom one bends out. The thin sliver between them is exactly one square.",
      zh: "把两个轮廓叠在一起：上面那个的长边往里凹，下面那个往外鼓。两条边之间那条细缝，面积正好是一格。",
    },
  },
  prompt: {
    en: "The pieces are the same in both pictures, and nothing has been cut. So how can the second arrangement have a one-square hole?",
    zh: "两张图里的拼板一模一样，也没有被剪过。为什么第二种拼法会多出一格空洞？",
  },
  answer: { type: "CHOICE", correctId: "bent-hypotenuse" },
  hints: [
    { en: "Count the area of each piece in the picture and add them up. Then compare with a real triangle 13 squares wide and 5 high: is it the same?", zh: "数一数图里每块拼板的面积，加起来，再和底 13 格、高 5 格的真三角形比一比：一样吗？" },
    { en: "The red triangle climbs 3 squares over 8; the blue one climbs 2 over 5. Are those two slopes really the same? Work out 3 ÷ 8 and 2 ÷ 5.", zh: "红色三角形走 8 格升高 3 格，蓝色的走 5 格升高 2 格。这两个斜度真的一样吗？算算 3 ÷ 8 和 2 ÷ 5。" },
    { en: "3/8 = 0.375 but 2/5 = 0.4, so where red meets blue the long side bends. Draw both on squared paper and lay a ruler along them: one dents in, one bulges out. How much area is in that thin gap?", zh: "3/8 = 0.375，2/5 = 0.4，所以红蓝相接的地方，长边会拐弯。在方格纸上画出两个图形，用尺子靠着比：一个往里凹，一个往外鼓。中间那条细缝有多大面积？" },
  ],
  wrongAnswers: [
    {
      match: "choice:shrunk",
      feedback: {
        en: "Fair suspicion! But count the pieces: red 12 squares of area, blue 5, green 8, yellow 7, the same in both pictures. The pieces haven't changed, so look at the outline instead.",
        zh: "怀疑得有道理！可是数一数：红色面积 12 格、蓝色 5 格、绿色 8 格、黄色 7 格，两张图里都一样。拼板没变，那就去看外轮廓。",
      },
    },
    {
      match: "choice:really-vanished",
      feedback: {
        en: "It does look like magic! But area can't disappear: the four pieces add up to 32 squares both times. The trick is that the two big shapes only look like the same triangle.",
        zh: "看起来真像魔术！可面积不会凭空消失：四块拼板加起来两次都是 32 格。秘密在于，这两个大图形只是看起来像同一个三角形。",
      },
    },
  ],
  explanation: {
    en: "The pieces always cover 12 + 5 + 8 + 7 = 32 squares, but a real triangle 13 wide and 5 high would be 13 × 5 ÷ 2 = 32.5. Neither shape is a real triangle: the red slope is 3/8 = 0.375 and the blue slope is 2/5 = 0.4, so the long side bends a tiny bit where they meet. In the top picture it bends in (area 32, no hole); in the bottom one it bends out (area 33), and the extra square of space shows up as the hole.",
    zh: "四块拼板的面积一直是 12 + 5 + 8 + 7 = 32 格，可底 13、高 5 的真三角形面积是 13 × 5 ÷ 2 = 32.5 格。两个图形都不是真三角形：红色的斜度是 3/8 = 0.375，蓝色是 2/5 = 0.4，所以长边在两块相接处稍稍拐了个弯。上图往里凹（面积 32，没有洞），下图往外鼓（面积 33），多出来的那一格空间就变成了洞。",
  },
  aha: {
    en: "Your eyes read \"almost straight\" as straight. The sliver between the two bent edges is too thin to see, yet it holds exactly one whole square.",
    zh: "眼睛会把「差不多直」看成直的。两条弯边之间那条细缝薄得看不见，面积却正好是一整格。",
  },
  extension: {
    en: "Work out 13 × 5 ÷ 2 and compare it with the total area of the four pieces. What does the difference tell you about each of the two shapes?",
    zh: "算一算 13 × 5 ÷ 2，再和四块拼板的面积之和比较。差了多少？这说明两个图形各是怎么回事？",
  },
  discussionPrompt: {
    en: "How would you convince a friend that the long side isn't straight: by measuring, by working out slopes, or by zooming in? Which way is most convincing, and why?",
    zh: "你会怎么说服朋友长边不是直的：用尺子量、算斜度，还是放大看？哪种最让人信服？为什么？",
  },
  solutionTags: ["draw", "guess_check", "algebra"],
  funFact: {
    en: "The sides 2, 3, 5, 8 and 13 are all Fibonacci numbers. Fractions made from them, like 2/5 and 3/8, are always very close, which is why the bend is so hard to spot.",
    zh: "边长 2、3、5、8、13 都是斐波那契数。用它们组成的分数（比如 2/5 和 3/8）总是非常接近，所以那个拐弯才这么难看出来。",
  },
  sortOrder: 5,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 1, aha 2, floor 1, ceiling 2, paths 2, wrong 2, hints 2, retell 2: illustration only (待替换为 dissection_slide); counting areas and comparing slopes are two real paths; slopes as fractions make it 12+; a picture kids love to show",
};

/**
 * B9. MULTI_VALUE answer by number of sides ("3, 4, 6"): the multi-value input is a number-pad chip
 * input that compares text, so shape names would fail in Chinese. The validator checks the values
 * against tiling_lab's own `tilesAlone`. The scene's hook already shows three hexagons closing up.
 */
export const whyHexagons: HeroQuestionBlueprint = {
  slug: "why-hexagons",
  collection: "shapes-that-lie",
  kind: "WODB",
  ageGroup: "AGE_10_12",
  difficulty: "EASY",
  category: "GEOMETRY",
  title: { en: "Why Bees Pick Hexagons", zh: "蜜蜂为什么选六边形" },
  hook: {
    en: "Bees build their honeycomb from six-sided cells that fit together with no gaps. Could they have used triangles, squares or five-sided pentagons instead? Which of these shapes can cover a floor all by itself, with no gaps and no overlaps?",
    zh: "蜜蜂用六边形的小格子造蜂巢，一格挨一格，没有一点缝。换成三角形、正方形或者五边形行不行？这几种形状里，哪些能单独铺满地面，不留缝也不重叠？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "one", en: "Only one of the four", zh: "四种里只有一种" },
      { id: "two", en: "Two of them", zh: "两种" },
      { id: "three", en: "Three of them", zh: "三种" },
      { id: "all-four", en: "All four", zh: "四种都行" },
    ],
  },
  scene: { type: "tiling_lab", shapes: ["triangle", "square", "pentagon", "hexagon"], gridSize: 2, tilers: ["triangle", "square", "hexagon"] },
  prompt: {
    en: "Regular triangles, squares, pentagons and hexagons: which of them can tile a floor using copies of just that one shape? Type the number of sides of each shape that works (a triangle is 3).",
    zh: "正三角形、正方形、正五边形、正六边形：哪些只用这一种形状，就能把地面铺满？把能铺满的形状的边数都填上（三角形填 3）。",
  },
  answer: { type: "MULTI_VALUE", values: ["3", "4", "6"] },
  hints: [
    { en: "Forget the whole floor and look at one corner point. Tap the same shape button again and again to fit copies around the dot: do they close up with no gap?", zh: "先别管整个地面，只看一个点。反复点同一个形状的按钮，把它们围着中间的点拼一圈：能正好合上、不留缝吗？" },
    { en: "Each button shows the shape's corner angle, like 108° for the pentagon, and all the way round a point is 360°. Put down three pentagons: what does the scene say is left?", zh: "每个按钮上写着这种形状的内角，比如五边形是 108°，绕一个点转一整圈是 360°。放三个五边形：场景说还剩多少？" },
    { en: "A shape works on its own only if copies of its corner add up to exactly 360°. Try 360 ÷ 60, 360 ÷ 90, 360 ÷ 108 and 360 ÷ 120: which come out as whole numbers?", zh: "只有这种形状的内角加几次正好是 360°，它才能单独铺满。算算 360 ÷ 60、360 ÷ 90、360 ÷ 108、360 ÷ 120：哪些能整除？" },
  ],
  wrongAnswers: [
    {
      match: "regex:[A-Za-z一-鿿]",
      feedback: {
        en: "Type the number of sides instead of the name: a triangle is 3, a square 4, a pentagon 5 and a hexagon 6.",
        zh: "请填边数，不要填名字：三角形是 3，正方形是 4，五边形是 5，六边形是 6。",
      },
    },
    {
      match: "regex:(^|\\D)(\\d{2,}|[0-27-9])(\\D|$)",
      feedback: {
        en: "Only the four shapes count here: a triangle has 3 sides, a square 4, a pentagon 5 and a hexagon 6. Which of those numbers work?",
        zh: "这里只看这四种形状：三角形 3 条边，正方形 4 条，五边形 5 条，六边形 6 条。这几个数里哪些行？",
      },
    },
    {
      match: "regex:(^|\\D)5(\\D|$)",
      feedback: {
        en: "Pentagons look as if they should fit, but three of them make 3 × 108° = 324° and leave a 36° gap that nothing fills, while four make 432° and overlap. So 5 can't be on the list.",
        zh: "五边形看起来应该行，可是三个是 3 × 108° = 324°，留下 36° 的缝，什么都塞不进；四个是 432°，又重叠了。所以 5 不能算。",
      },
    },
    {
      match: "4, 6",
      feedback: {
        en: "Squares and hexagons, yes! You left out the triangle: six triangles meet at a point, because 6 × 60° = 360°. Try it in the scene.",
        zh: "正方形和六边形没错！你漏了三角形：六个三角形能围住一个点，因为 6 × 60° = 360°。在场景里试试。",
      },
    },
    {
      match: "3, 4",
      feedback: {
        en: "Triangles and squares, yes! But you've forgotten the bees' own shape: three hexagons make 3 × 120° = 360°.",
        zh: "三角形和正方形没错！可你忘了蜜蜂自己的形状：三个六边形是 3 × 120° = 360°。",
      },
    },
    {
      match: "3, 6",
      feedback: {
        en: "Triangles and hexagons, yes! You skipped the most ordinary one of all: four squares meet at a point, 4 × 90° = 360°, like the tiles on a bathroom floor.",
        zh: "三角形和六边形没错！你漏了最常见的一种：四个正方形围着一个点，4 × 90° = 360°，就像卫生间地上的瓷砖。",
      },
    },
    {
      match: "regex:^\\s*[346]\\s*$",
      feedback: {
        en: "That one works, but it isn't alone. Tap every shape button in the scene and see which others close up around the point.",
        zh: "这一种确实行，但不止它一种。把场景里每个形状的按钮都试一遍，看看还有哪些能围着点合上。",
      },
    },
  ],
  explanation: {
    en: "Copies of one shape meeting at a corner must add up to exactly 360°. Triangles (60°) fit six times, squares (90°) four times and hexagons (120°) three times, so 3, 4 and 6 work. A pentagon's corner is 108°: three make 324° and leave a gap, four make 432° and overlap, so it can't tile on its own.",
    zh: "同一种形状围在一个点上，角加起来必须正好是 360°。三角形（60°）能放 6 个，正方形（90°）能放 4 个，六边形（120°）能放 3 个，所以 3、4、6 都行。五边形的内角是 108°：三个是 324°，留下缝；四个是 432°，又重叠了，所以它不能单独铺满。",
  },
  aha: {
    en: "A shape tiles on its own only when its corner angle divides 360° exactly: 60°, 90° and 120° do, 108° doesn't. Of the three, hexagons wall in the most honey for the least wax.",
    zh: "一种形状能单独铺满，只有当它的内角能整除 360° 的时候：60°、90°、120° 可以，108° 不行。三种里，六边形用最少的蜡围出最多的蜜。",
  },
  extension: {
    en: "Now mix two shapes: can regular octagons (135° corners) and squares tile a floor together? Find another mix of shapes that closes up around a point.",
    zh: "两种形状混着用呢？正八边形（内角 135°）和正方形能一起铺满地面吗？再找一种围着一个点正好合上的组合。",
  },
  discussionPrompt: {
    en: "Where have you seen floors, walls or patterns in nature made of triangles, squares or hexagons? Which shape shows up most, and why do you think that is?",
    zh: "你在哪儿见过用三角形、正方形或六边形铺满的地面、墙面，或者大自然里的图案？哪种最常见？你觉得为什么？",
  },
  solutionTags: ["guess_check", "draw", "table"],
  funFact: {
    en: "In 1999 the mathematician Thomas Hales proved what bees seem to know: to split a flat surface into equal cells with the least total wall, use hexagons.",
    zh: "1999 年，数学家黑尔斯证明了蜜蜂好像早就知道的事：要把平面分成一样大的小格，又让墙加起来最短，就该用六边形。",
  },
  sortOrder: 9,
  rubricNotes:
    "18/20 — hook 2, guess 1, hands-on 2, aha 2, floor 2, ceiling 2, paths 2, wrong 2, hints 2, retell 1: the scene is the puzzle (fit copies round a point); trying shapes and dividing 360 by the angle are two real paths; the guess range is narrow and the scene's own hook already shows hexagons closing up",
};

/**
 * B10. domino_tiling with the two dark corners (0,0) and (7,7) removed: 30 dark, 32 light squares,
 * so no tiling (the validator re-checks with `dominoTiling`). Copy convention as seven-bridges.
 * Extension answer: removing one dark and one light square always leaves a tileable 8 × 8 board (Gomory).
 */
export const mutilatedChessboard: HeroQuestionBlueprint = {
  slug: "mutilated-chessboard",
  collection: "shapes-that-lie",
  kind: "PUZZLE",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "LOGIC",
  title: { en: "Two Corners Missing", zh: "缺了两角的棋盘" },
  hook: {
    en: "Cut two opposite corner squares off a chessboard. A domino covers exactly two squares side by side, and you have just enough dominoes for the squares that are left. Can you cover the whole board with no gaps and no overlaps?",
    zh: "把国际象棋棋盘上相对的两个角各剪掉一格。一块骨牌正好盖住相邻的两格，你手里的骨牌刚好够盖剩下的格子。能不能把整个棋盘盖满，不留空也不重叠？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "possible", en: "Yes, with the right arrangement", zh: "能，只要摆对了" },
      { id: "lucky", en: "It depends on where you put the first domino", zh: "要看第一块骨牌放在哪儿" },
      { id: "impossible", en: "No, never, however you place them", zh: "不能，怎么摆都不行" },
    ],
  },
  scene: { type: "domino_tiling", size: 8, removed: [[0, 0], [7, 7]], tileable: false },
  prompt: {
    en: "The board has 62 squares left and you have 31 dominoes. Is there any way to lay them so that every square is covered exactly once?",
    zh: "棋盘剩下 62 格，你有 31 块骨牌。有没有办法把它们摆好，让每一格都正好被盖住一次？",
  },
  answer: { type: "CHOICE", correctId: "impossible" },
  hints: [
    { en: "Tap two neighbouring squares to lay a domino, and keep going until you're stuck. When the scene says \"Stuck\", what colour are all the squares that are left?", zh: "点两个相邻的格子放一块骨牌，一直放到卡住为止。场景说「卡住了」的时候，剩下的格子都是什么颜色？" },
    { en: "Every domino covers two squares side by side. Look at the board's colours: can one domino ever cover two dark squares?", zh: "每块骨牌盖住相邻的两格。看看棋盘的颜色：一块骨牌能同时盖住两格深色吗？" },
    { en: "So each domino covers one dark and one light square. Check the two bars next to the board: how many dark squares are there, and how many light ones?", zh: "所以每块骨牌都正好盖一深一浅。看看棋盘旁边的两根柱子：深色有几格？浅色有几格？" },
  ],
  wrongAnswers: [
    {
      match: "choice:possible",
      feedback: {
        en: "It feels as if a clever enough arrangement must exist, and you can get very close! But the two cut-off corners are both dark, so 30 dark squares are left against 32 light ones. Each domino covers one of each, so two light squares are always left over.",
        zh: "总觉得只要摆得够聪明就一定行，而且确实能差一点就成功！可是剪掉的两个角都是深色，剩下深色 30 格、浅色 32 格。每块骨牌盖一深一浅，所以总会多出两格浅色。",
      },
    },
    {
      match: "choice:lucky",
      feedback: {
        en: "In lots of puzzles the first move matters. Not here: wherever you start, every domino covers one dark and one light square, and there are two more light squares than dark ones.",
        zh: "很多谜题里第一步很重要。这里不是：不管从哪儿开始，每块骨牌都盖一深一浅，而浅色比深色多 2 格。",
      },
    },
  ],
  explanation: {
    en: "Two squares side by side are always different colours, so every domino covers one dark and one light square. Opposite corners are the same colour (both dark here), so the board has 32 − 2 = 30 dark squares and 32 light ones left. Laying 31 dominoes would need 31 of each colour, so however you place them, 32 − 30 = 2 light squares stay uncovered.",
    zh: "相邻的两格颜色一定不同，所以每块骨牌都盖住一格深色、一格浅色。相对的两个角颜色相同（这里都是深色），所以剩下深色 32 − 2 = 30 格、浅色 32 格。31 块骨牌要各盖 31 格深色和浅色，所以不管怎么摆，总有 32 − 30 = 2 格浅色盖不住。",
  },
  aha: {
    en: "You don't have to try every arrangement: one colour count proves that none of them can work. Colouring a puzzle can turn \"I can't find it\" into \"it can't exist\".",
    zh: "不用把所有摆法都试一遍：数一下颜色，就证明了哪种都不行。给谜题涂上颜色，能把「我找不到」变成「它根本不存在」。",
  },
  extension: {
    en: "Put the corners back, then cut out one dark square and one light square instead, anywhere you like. Can the rest always be covered now?",
    zh: "把两个角放回去，改成剪掉一格深色、一格浅色，位置随你挑。剩下的格子一定能盖满吗？",
  },
  discussionPrompt: {
    en: "Could you convince a friend without mentioning the colours at all? Is there another argument, or are the colours the whole secret?",
    zh: "不提颜色，你能说服朋友吗？有没有别的理由，还是颜色就是全部的秘密？",
  },
  solutionTags: ["guess_check", "draw", "pattern"],
  funFact: {
    en: "In the 1960s this puzzle became a famous challenge for computer programs that try to prove things, because checking arrangements one by one is hopeless while the colour trick takes a single line.",
    zh: "20 世纪 60 年代，它成了「会证明题的电脑程序」的著名考题：一种摆法一种摆法地试根本试不完，而涂颜色的办法一句话就说完了。",
  },
  sortOrder: 10,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: the scene is the puzzle and its dark/light bars carry the proof; colouring is the one real path (trying only shows you get stuck); the one-dark-one-light extension is a real theorem",
};

/**
 * B11. Illustration until the T3 `mobius_cut` scene lands (待替换为 mobius_cut); the real experiment
 * (paper, tape, scissors) is hint 3. Extension answer: cutting a third of the way in gives a Möbius
 * strip (same length) linked with a loop twice as long with two full twists.
 */
export const mobiusCut: HeroQuestionBlueprint = {
  slug: "mobius-cut",
  collection: "shapes-that-lie",
  kind: "PUZZLE",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "GEOMETRY",
  title: { en: "The Loop That Won't Split", zh: "剪不断的纸环" },
  hook: {
    en: "Take a strip of paper, give one end a half twist, and tape the ends together into a loop. Now cut all the way along the middle line, round and round until you're back where you started. What will be in your hands when you finish?",
    zh: "拿一条纸带，把一头扭转半圈，再把两头粘成一个环。然后沿着中线一直剪，绕一圈剪回起点。剪完以后，你手里会是什么？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "two-loops", en: "Two separate loops", zh: "两个分开的环" },
      { id: "one-longer-loop", en: "One loop, twice as long", zh: "一个更长的大环" },
      { id: "knotted-loop", en: "A loop tied in a knot", zh: "一个打了结的环" },
    ],
  },
  scene: {
    type: "illustration",
    asset: "mobius-cut",
    caption: { en: "A strip with one half twist, taped into a loop, and scissors ready to cut along the middle line.", zh: "一条扭了半圈、粘成环的纸带，剪刀准备沿着中线剪。" },
    revealAsset: "mobius-cut-reveal",
    revealCaption: {
      en: "One loop, twice as long, with two full twists. The cut never splits the strip, because the strip has only one side.",
      zh: "只有一个环，长了一倍，扭了两整圈。剪刀没能把纸带分成两半，因为这条纸带只有一个面。",
    },
  },
  prompt: {
    en: "You cut a half-twisted paper loop all the way along its middle line. What do you end up with?",
    zh: "沿着中线，把扭了半圈的纸环剪一整圈。最后你会得到什么？",
  },
  answer: { type: "CHOICE", correctId: "one-longer-loop" },
  hints: [
    { en: "Start with a plain loop that has no twist: cutting along its middle gives two thin loops. So the real question is what the half twist changes.", zh: "先想一个没扭过的普通纸环：沿中线剪开，会得到两个细环。所以真正的问题是：扭的那半圈改变了什么？" },
    { en: "Follow the strip in the picture with your finger without lifting it. You end up on the inside AND the outside before you get back: the strip has only one side. Can scissors split a one-sided strip into a top half and a bottom half?", zh: "用手指顺着图里的纸带走一圈，手指不离开纸面。回到起点之前，你里面外面都走过了：这条纸带只有一个面。剪刀能把只有一个面的纸带分成上半边和下半边吗？" },
    { en: "Try it at home with a long paper strip, tape and scissors (ask a grown-up to help). Twist one end half a turn, tape the ends, draw a line down the middle, cut along it, and see what you're holding.", zh: "在家试试：一条长纸带、一段胶带、一把剪刀（请大人帮忙）。把一头扭半圈，粘好，在中间画一条线，沿着线剪，看看手里是什么。" },
  ],
  wrongAnswers: [
    {
      match: "choice:two-loops",
      feedback: {
        en: "That's exactly what happens with a loop that has no twist, so it's a very sensible guess. But the half twist joins the two halves of the strip to each other, so after the cut they're still one piece: a single loop twice as long.",
        zh: "没扭过的纸环剪开确实是两个环，所以这个猜测很合理。可是扭的那半圈把纸带的两半连在了一起，剪完还是一整条：一个长了一倍的环。",
      },
    },
    {
      match: "choice:knotted-loop",
      feedback: {
        en: "It does come out twisted, so you're half right! But there's only one loop and no knot: it has two full twists and is twice as long. Cut that one down the middle too and see what happens next.",
        zh: "剪出来确实扭着，你说对了一半！可是只有一个环，也没有打结：它扭了两整圈，长了一倍。再沿中线剪它一次，看看又会怎样。",
      },
    },
  ],
  explanation: {
    en: "A strip with a half twist has only one side and one edge: a finger sliding along it visits both faces of the paper before it gets back. When you cut along the middle, the part on the left of the cut is joined through the twist to the part on the right, so the two halves never come apart. You get one loop, twice as long, with two full twists, and this new loop has two sides.",
    zh: "扭了半圈的纸带只有一个面、一条边：手指顺着它滑，回到起点之前会把纸的两面都走一遍。沿中线剪的时候，剪口左边的那一半通过扭转处和右边的那一半连在一起，所以两半永远分不开。最后得到一个长了一倍、扭了两整圈的环，而这个新环有两个面。",
  },
  aha: {
    en: "The twisted strip has only one side, so there's no top half and bottom half for the scissors to separate. One cut along the middle makes one longer loop, not two.",
    zh: "扭过的纸带只有一个面，剪刀根本找不到可以分开的「上半边」和「下半边」。沿中线剪一圈，得到的是一个更长的环，而不是两个。",
  },
  extension: {
    en: "Make another one, but this time cut a third of the way in from the edge instead of along the middle. What do you get?",
    zh: "再做一个，这次不沿中线剪，而是在离边三分之一的地方剪。这次会得到什么？",
  },
  discussionPrompt: {
    en: "Describe what you held after cutting, in words a friend could follow without seeing it. Did anyone in your family guess right before you cut?",
    zh: "用文字描述你剪完后手里拿着的东西，让没看见的朋友也能明白。剪之前，你家里有人猜对吗？",
  },
  solutionTags: ["simulate", "draw", "guess_check"],
  funFact: {
    en: "This shape is called a Möbius strip, after the German mathematician who described it in 1858. Some factory belts have been made with a half twist so that both faces wear out evenly.",
    zh: "这种纸带叫莫比乌斯带，名字来自 1858 年研究它的德国数学家莫比乌斯。有些工厂的传送带故意扭了半圈，这样两面会磨损得一样多。",
  },
  sortOrder: 11,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 1, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 2: illustration only (待替换为 mobius_cut), though the paper experiment in hint 3 is the best hands-on there is; one path (do it, or reason about the single side); the third-of-the-way cut is a great ceiling; every family tries it",
};

export const SHAPES_THAT_LIE: readonly HeroQuestionBlueprint[] = [
  squaresOnChessboard,
  pizzaCuts,
  ropeAroundEarth,
  fenceShaper,
  pythagorasSquares,
  sevenBridges,
  clockHandsMeet,
  missingSquare,
  whyHexagons,
  mutilatedChessboard,
  mobiusCut,
];
