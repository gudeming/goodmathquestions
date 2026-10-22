# 01 · 「好题」评分标准、反模式、审计规格与作者模板

本文件回答三个问题：什么算好题（§1–§2）、机器怎么初筛（§3）、作者怎么写（§4–§5）。

---

## 1. 评分标准（10 项 × 0/1/2 分，满分 20；≥ 14 才能作为 hero 题发布）

| # | 标准 | 0 分 | 1 分 | 2 分 |
|---|---|---|---|---|
| 1 | **钩子** | 以「计算 / 求解 / 下列」开头 | 有情境但一上来就给数字 | 情境先于数字，读完想知道答案（能用一句话讲给朋友） |
| 2 | **可猜测** | 没法在算之前猜 | 能猜但答案范围无趣 | 猜测与真相有明显落差，且猜完想验证 |
| 3 | **可动手** | 只能读 | 有动画但不可操作 / 操作不改变结果 | 场景就是题目：操作改变画面，画面回答问题 |
| 4 | **惊喜 / 顿悟** | 答案就是算出来的那个数 | 有一点「哦」 | 反直觉或揭示隐藏结构（配对、奇偶、鸽巢、指数） |
| 5 | **低门槛** | 需要特定公式才能入手 | 需要一点引导 | 8 岁能开始试、能数、能画 |
| 6 | **高天花板** | 没有延伸 | 延伸是「换个数再算一次」 | 延伸通向一般规律或未解问题 |
| 7 | **多解法** | 只有一条路 | 两条路但一条明显是「正确的」 | ≥ 2 条同样有价值的路（画 / 配对 / 列表 / 模拟 / 代数） |
| 8 | **错误有价值** | 「再试一次」 | 1 条针对性反馈 | ≥ 2 条针对常见错误的反馈，能说出孩子大概怎么想的 |
| 9 | **提示是脚手架** | 通用提示 | 3 条提示但跳跃太大 | 3 条递进，从「换个角度」到「几乎给出方法」，都针对本题 |
| 10 | **值得转述** | 不会讲给别人 | 可能会 | 孩子会回家考爸妈（惊讶 / 魔术 / 「不可能」）|

打分记录在 blueprint 的 `rubricNotes`（字符串，格式：`"18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 2, wrong 1, hints 2, retell 1: wrong-answer feedback only covers 10100"`）。

### 1.1 用当前题库校准
- 「Compute 23 × 6.」→ 钩子 0、可猜 0、动手 0、顿悟 0、低门槛 2、天花板 0、多解法 1、错误 0、提示 0、转述 0 = **3/20**。
- 「Cheetah vs. Human Sprint」（112 − 45）→ 钩子 1、可猜 1、动手 0、顿悟 0、低门槛 2、天花板 0、多解法 0、错误 0、提示 0、转述 1 = **5/20**。
- 「Math Mind-Reading Trick」（现状，无场景、默认提示）→ 钩子 2、可猜 2、动手 0、顿悟 2、低门槛 2、天花板 1、多解法 1、错误 0、提示 0、转述 2 = **12/20**。补上场景、提示、错误反馈后可到 18。
- 「Paper Folding Challenge」→ 现状约 11/20，同理可升级。

---

## 2. 反模式（出现任何一条即不能作为 hero 题）

1. **故事外衣**：把「求 a − b」换成「猎豹和人类」，但孩子的操作仍然只是做一次减法。判别法：把情境名词全部换成 X、Y，题目是否完全不变？是，就是外衣。
2. **数字先行**：第一句话就是「一个长 12 宽 5 的长方形」。好题先给画面，再给数字（或者让孩子自己量 / 数）。
3. **百科式 fun fact**：超过 2 句、超过 300 字符、堆砌年份与机构名。
4. **假动画**：和解题无关的装饰动画（数字放大、三角形弹出）；或由关键词推断、未经校验的场景配置。
5. **万能提示**：「把问题拆成更小的步骤」。
6. **只有一个输入框**：答案类型必须由题目结构决定（选项 / 估算 / 多值 / 排序 / 表达式）。
7. **年龄错位**：hero 题只做 `AGE_8_10 / AGE_10_12 / AGE_12_14`。需要微积分、三角函数、z-score 的留在练习库。
8. **机翻腔**：中文里出现「让我们」开头的连续句、「这是一个…的问题」等翻译痕迹；英文里出现过长从句。两种语言都要像那个年龄的老师在说话。
9. **不安全**：涉及赌博金钱诱导（概率题用「游戏」「糖果」「贴纸」而不是「下注赢钱」）、暴力、恐怖。

---

## 3. 机器初筛规格（`packages/math-engine/src/rubric.ts` + `scripts/audit-questions.ts`）

### 3.1 flags（对现有 `SeedQuestion` 结构）

| flag | 判定规则 | 影响 |
|---|---|---|
| `DEFAULT_HINTS` | `hints` 深等于 `DEFAULT_HINTS` 或任一条命中默认文案 | 提示 0 分 |
| `INFERRED_SCENE` | blueprint 无显式 `animationConfig`（需要在 bank 中把显式配置标记出来；最简单：`buildUSK12QuestionBank` 返回时附加 `_sceneSource: "explicit" \| "inferred"`，仅用于审计，不入库） | 动手 0 分 |
| `EMPTY_NUMBER_LINE` | `animationConfig` 等于 `{type:"number_journey",range:[0,20],highlights:[]}` | 动手 0 分 |
| `COMPUTE_PREFIX` | `contentEn` 匹配 `/^(compute|calculate|solve|simplify|find|what is|evaluate|write|round|fill in)\b/i` | 钩子 0 分 |
| `NUMBERS_FIRST` | `contentEn` 前 40 个字符内出现数字 | 钩子 ≤ 1 |
| `ONE_STEP` | 题干中数字个数 ≤ 2 且解释（`answerExplainEn`）只含一个运算符 | 顿悟 0、多解法 0 |
| `AGE_OUT_OF_RANGE` | `ageGroup ∈ {AGE_14_16, AGE_16_18}` | 直接 DRILL |
| `LONG_FUN_FACT` | `funFactEn.length > 300` 或句子数 > 2 | 需改写 |
| `DEFAULT_FUN_FACT` | 命中「This skill appears in US K-12 pathways…」 | 需改写 |
| `NO_WRONG_FEEDBACK` | 无 `wrongAnswerFeedback`（旧结构必然命中，仅对 v2 有意义） | 错误 0 分 |
| `HERO_CANDIDATE` | 无 `COMPUTE_PREFIX`、无 `ONE_STEP`、年龄合规，且题干含 `trick\|always\|no matter\|impossible\|how many ways\|pattern\|magic\|fold\|double` 等词 | 进入人工升级清单 |

### 3.2 启发式分数
`heuristicScore = 20 − 罚分`，罚分：`DEFAULT_HINTS` 2、`INFERRED_SCENE/EMPTY_NUMBER_LINE` 2、`COMPUTE_PREFIX` 2、`NUMBERS_FIRST` 1、`ONE_STEP` 4、`LONG_FUN_FACT` 1、`DEFAULT_FUN_FACT` 1、`AGE_OUT_OF_RANGE` 20。只是初筛，人工分数才作数。

### 3.3 输出
- `audit-2026-10.csv`：`sortOrder,titleEn,category,ageGroup,difficulty,flags,heuristicScore,recommendation`
- `audit-summary.md`：各 flag 计数；`HERO_CANDIDATE` 清单（预期 10–15 道）；按 category 的 DRILL 数量。
- 测试：对 5 道手工挑选的题（含一道 hero 候选）断言 flags 精确匹配。

### 3.4 内容 lint（Phase 7，对 v2 hero 题）
在 `scripts/content-lint.ts` 中对所有 `kind != DRILL && isPublished` 的题检查：场景配置通过 schema；`hints.length === 3` 且非默认；`wrongAnswerFeedback.length ≥ 2`；`aha ≤ 240` 字符；`funFact ≤ 300`；`discussionPrompt`、`extension`、`hook` 非空；双语字段成对非空；`ageGroup` 合规；`slug` 唯一且 kebab-case。CI 失败即阻断合并。

---

## 4. 作者模板（`packages/db/prisma/hero-questions/_template.ts`）

```ts
import type { SceneConfig } from "@gmq/animation-engine"; // z.infer<typeof SceneConfigSchema>

export type Bi = { en: string; zh: string };

export type GuessConfig =
  | { type: "slider"; min: number; max: number; step: number; unit?: Bi; logScale?: boolean }
  | { type: "choice"; options: Array<{ id: string } & Bi> }
  | { type: "compare"; left: Bi; right: Bi }; // 「哪个更大 / 更多」

export type AnswerSpec =
  | { type: "NUMERIC"; value: number; tolerance?: number; unit?: Bi }
  | { type: "ESTIMATE"; min: number; max: number; truth: number; unit?: Bi } // 落在 [min,max] 算对
  | { type: "CHOICE"; correctId: string } // 选项复用 guessConfig.options 或单独给 choices
  | { type: "MULTI_VALUE"; values: string[]; orderMatters?: false } // 「1 和 5」
  | { type: "ORDERING"; correctOrder: string[] }
  | { type: "EXPRESSION"; target: number; allowedNumbers: number[]; allowedOps: Array<"+" | "-" | "*" | "/" | "^" | "!" | "sqrt" | "concat"> }
  | { type: "SCENE_COMPLETION"; minimalMoves?: number }; // 过河 / 汉诺塔：场景报告完成即算对

export type WrongAnswerRule = {
  match: string; // "10100" | "regex:^1[0-9]{4}$" | "gt:correct" | "lt:correct" | "offByFactor:2" | "choice:B"
  feedback: Bi;  // 要说出孩子大概怎么想的，再指路
};

export interface HeroQuestionBlueprint {
  slug: string;                      // kebab-case，稳定 URL
  collection: "huge-numbers" | "shapes-that-lie" | "chance-and-luck" | "number-magic" | "patterns-everywhere" | "impossible-puzzles";
  kind: "PUZZLE" | "THREE_ACT" | "ESTIMATION" | "WODB" | "WOULD_YOU_RATHER" | "PATTERN" | "MAGIC_TRICK" | "OPEN_MIDDLE" | "PARADOX";
  ageGroup: "AGE_8_10" | "AGE_10_12" | "AGE_12_14";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  category: "ARITHMETIC" | "ALGEBRA" | "GEOMETRY" | "FRACTIONS" | "NUMBER_THEORY" | "WORD_PROBLEMS" | "LOGIC" | "PROBABILITY" | "STATISTICS";
  title: Bi;                         // ≤ 30 字符，像故事名不像课题名
  hook: Bi;                          // Act 1：1–3 句，尽量无数字，结尾是一个让人想猜的问题
  guess?: GuessConfig;               // 没有 guess 的题 kind 不能是 THREE_ACT / ESTIMATION
  scene: SceneConfig | { type: "illustration"; asset: string; caption: Bi }; // Tier 3 场景未就绪时用 illustration，但 ≤ 15/60
  prompt: Bi;                        // Act 2 正式问题，可含 LaTeX（\\( \\)）
  answer: AnswerSpec;
  hints: [Bi, Bi, Bi];               // 递进；每条 ≥ 15 字符；不得与 DEFAULT_HINTS 相同
  wrongAnswers: WrongAnswerRule[];   // ≥ 2
  explanation: Bi;                   // 解法（≤ 4 句），可含 LaTeX
  aha: Bi;                           // ≤ 2 句，≤ 240 字符
  extension: Bi;                     // 「再往前一步」
  discussionPrompt: Bi;              // 一个具体问题，不是「说说你的想法」
  solutionTags: Array<"draw" | "pair" | "table" | "guess_check" | "simulate" | "algebra" | "pattern" | "work_backwards" | "other">;
  funFact?: Bi;                      // ≤ 300 字符，可选
  sortOrder: number;                 // 在世界内的顺序
  rubricNotes: string;               // 不入库；"18/20 — ..."
}
```

### 4.1 完整示例：`gauss-sum`

```ts
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
```

---

## 5. 文案风格指南（两种语言）

- **对象是 8–14 岁的孩子**，不是家长。第二人称「你」。短句。一个句子一个意思。
- **钩子不出现数字**（除非数字本身就是钩子，如「一百万秒」）。结尾是问题。
- **标题像故事名**：「几秒钟就算完的男孩」好于「等差数列求和」。
- **提示递进**：第一条换视角，第二条给一个具体的小动作（「试试 2 + 99」），第三条几乎给出方法但不说答案。
- **错误反馈先共情再指路**：「你把每对数了两遍」（说出他怎么想的）→「100 个数只能配 50 对」（指路）。不说「错了」。
- **顿悟 ≤ 2 句**：第一句说结构，第二句给一个让人记住的事实或画面。
- **中文**：避免「让我们」「这是一个」「值得注意的是」；数字与单位之间留空格（「50 对」「16 cm」）；标点用全角。
- **英文**：避免 "In order to"、"utilize"、被动语态；缩写 it's / don't 可以用。
- **双语不是互译**：允许两种语言用不同的比喻，只要数学内容一致。
