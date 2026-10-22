# GoodMathQuestions「真·好题」改造计划

> 版本 v1 · 2026-10-21 · 执行者：Opus 5.5 agent（Claude Code，仓库根目录 `/Users/simongu/Downloads/ERICMATH`）
> 目标：让 8–14 岁孩子打开题目页的第一眼就「哇」，并且愿意第二天再来。

本目录包含 4 个文件，按顺序读：

| 文件 | 内容 | 什么时候读 |
|---|---|---|
| `README.md`（本文件） | 诊断、原则、分阶段执行计划、验收标准、护栏 | 开工前通读 |
| `01-question-rubric.md` | 「好题」10 条评分标准、反模式、审计脚本规格、题目作者模板 | Phase 0 / Phase 3 |
| `02-hero-question-catalog.md` | 6 个「世界」× 约 10 道亮眼题的完整概念清单（钩子 / 猜测 / 场景 / 答案 / 顿悟 / 延伸 / 讨论） | Phase 3 |
| `03-scene-catalog.md` | 交互场景（动画引擎 v2）规格：通用契约、每个场景的 config schema 与三幕行为、优先级 | Phase 2 |

---

## 0. 给执行 agent 的说明

### 0.1 工作方式
- 在新分支 `feat/good-questions-overhaul` 上工作，按 Phase 分多个 PR 合并。**不要直接 push `main`**：`.github/workflows/deploy.yml` 会在 push `main` 时自动部署生产环境。
- 每个 Phase 结尾有「验收标准」。全部通过、`npm run build` 和测试绿了才算这个 Phase 完成。做不完的要在 PR 描述里明确写出来，不要悄悄缩小范围。
- 本地环境：`docker compose up -d` → `npm install` → `npm run db:generate && npm run db:push && npm run db:seed` → `npm run dev`。seed 的 `SEED_MODE=questions_only` 可只重灌题目不动用户。
- 仓库目前**没有任何测试**（没有 vitest/jest/playwright 配置）。Phase 0 要先把测试基建搭起来，后面每个 Phase 都要带测试。
- 内容必须中英双语（`*En` / `*Zh` 字段），面向 8–14 岁，禁止任何不适合儿童的内容。
- 仓库 `.gitignore` 里有 `*.md`（已为 `docs/**/*.md` 加了例外）。新增的任何非 docs 目录下的 Markdown 都需要 `git add -f`，或者放到 `docs/` 下。
- 不确定的地方：先做不依赖该决定的部分，再在 PR 描述里写明你的假设。不要停下来等人回答。

### 0.2 一句话概括要做的事
把「511 道披着故事外衣的课本练习题 + 一条假的数轴动画 + 两条万能提示」，换成「约 60 道有钩子、能上手玩、答完会让人『原来如此』的真·好题 + 为每道题量身定做的可操作场景 + 三幕式答题流程」。旧题不删，降级为「练习模式」。

### 0.3 不要做的事（硬性）
1. **不要再批量生成几百道「计算 23 × 6」式的题**。数量不是问题，质量才是。60 道好题 > 5000 道练习题。
2. **不要用关键词猜动画**。现在 `packages/db/prisma/us-k12-question-bank.ts` 的 `inferAnimationConfig()` 和 `seed.ts` 的 `inferGeometryAnimationConfigFromText()` 就是在这么做，结果是「含 angle 一词 → 画一个 60/60/60 的三角形」。这类代码对亮眼题一律不用；没有人工校验过的场景配置，就宁可不显示动画。
3. **不要让 fun fact 变成一段 150 字的百科**。顿悟要一两句话击中。
4. **不要用假评论营造热闹**。`seed.ts` 的 `SEED_COMMUNITY_BOOST` 生成的机器人评论孩子一眼看穿。生产库要清掉。
5. **不要删除现有题目或用户数据**。旧题置为 `kind = DRILL`、从首页/发现页隐藏即可。
6. 不要在没有校验器的情况下接受自由文本答案（Phase 4 的 `EXPRESSION` 类型必须有安全的表达式求值器，不能用 `eval`）。

---

## 1. 问题诊断：孩子为什么说「无聊」

以下结论来自对当前代码与数据的审查，不是猜测。

### 1.1 题目本身是练习题，不是「好题」
- `packages/db/prisma/us-k12-question-bank.ts` 共 511 道题（`buildUSK12QuestionBank()` 实际产出数）。开头一批是裸课本题：`Compute 23 × 6.`、`Solve: x + 9 = 27`、`A rectangle is 9 cm by 4 cm. What is its area?`。
- 之后 18 批「story questions」只是给同样的一步计算套了主题：「猎豹 112 km/h，人类 45 km/h，快多少？」答案 67。这是减法练习，不是关于猎豹的发现。
- 真正满足「好题」特征（答案反直觉 / 能动手探索 / 有多种解法 / 答完想告诉别人）的，整库不超过 10 道（如 `Math Mind-Reading Trick`、`Paper Folding Challenge`、`Sudoku Number Logic`）。
- 年龄错位：网站定位 8–14 岁，但 511 题中 139 题是 `AGE_14_16` / `AGE_16_18`（微积分、三角函数、z-score），而 `AGE_8_10` 只有 59 题。

### 1.2 「每道题都变成动画」是一句没有兑现的承诺
- 首页文案（`packages/i18n/zh.json` → `landing.featureAnimateDesc`）：「每道题都会变成彩色动画」。
- 实际：511 道题中只有 39 道有人工写的 `animationConfig`。其余走 `inferAnimationConfig()`：非几何题统一得到 `{ type: "number_journey", range: [0, 20], highlights: [] }`，即**一条什么都不标的空数轴**——实测 419 道题（82%）渲染的就是这条空数轴；几何题按关键词猜，经常猜错（任何含 "angle"/"triangle" 的题 → 固定 `[60, 60, 60]` 三角形；含 "area" 的题 → 四个数字排成一行的 `number_combine`）。
- `apps/web/components/animations/MathAnimation.tsx` 里的 8 种场景都是「装饰性」的：数字放大一下、三角形弹出来，和解题过程没有关系，也不可操作。孩子点一下没有反应，第二次就不点了。

### 1.3 提示是复读机
- 511 道题的 `hints` 全部是同一组 `DEFAULT_HINTS`：「把问题拆成更小的步骤」「检查答案是否合理」。`packages/math-engine/src/hints.ts` 的 `generateHints()` 也是占位符。孩子卡住时得不到任何针对这道题的帮助。

### 1.4 答题交互只有一个输入框
- `apps/web/app/[locale]/(platform)/questions/[questionId]/page.tsx`：一个 `?` 输入框 + 「Check My Answer」。答错只显示「Not quite, try again!」2.5 秒后消失，没有任何诊断。没有选择题、估算滑块、拖拽、排序、「哪个不一样」等格式。
- XP 只奖励答对，鼓励猜答案而不是思考。

### 1.5 没有「今天来干什么」
- 题库页是一个 511 张卡片的筛选网格（难度 / 类别 / 年龄）。没有每日一题、没有系列 / 世界、没有「惊喜一下」。孩子面对的是一张目录，不是一场冒险。
- 顿悟点（fun fact）被放在右栏底部，是被动阅读，不是答题后的高潮。

### 1.6 讨论区是空的或假的
- `Comment.isApproved` 默认 `false`，`comment.list` 只返回已审核评论 → 孩子发的评论看不到，讨论区永远像没人。
- 生产 seed 可能带有 `SEED_COMMUNITY_BOOST` 生成的机器人评论（「我用了两种方法，最后答案一致，特别踏实。你是怎么做的？」），语气明显不是孩子。
- 题目页没有讨论引导（比如「你是先画图还是先列式？」），只有一个「Share your thoughts...」。

### 1.7 没有质量门禁
- 零测试；没有任何工具衡量「一道题好不好」；没有埋点知道孩子在哪一步离开。

---

## 2. 什么是「好题」（原则，细则见 `01-question-rubric.md`）

一道能让 8–14 岁孩子「眼前一亮」的题，至少满足下面大部分：

1. **有钩子（Hook）**：开头是一个让人想知道答案的情境或画面，而不是「计算：」。最好先不给数字，让孩子先猜。
2. **低门槛、高天花板**：8 岁能上手玩，14 岁还能往深挖（延伸问题）。
3. **答案反直觉或有惊喜**：猜测与真相之间有落差（生日悖论、绳子绕地球、麦粒与棋盘）。
4. **能动手**：场景就是题目本身——切披萨、折纸、拖数字配对、玩 20 局三门问题。操作会改变画面，画面会回答问题。
5. **多种解法**：至少两条路到达答案，讨论区才有话说。
6. **顿悟是高潮**：答对（或看完揭示）的那一刻，动画把「为什么」演出来，然后一句话把顿悟钉住。
7. **错得有价值**：常见错误答案有针对性反馈（「你算的是 100 × 101，别忘了除以 2」），不是「再试一次」。
8. **提示是脚手架**：3 条提示从「换个角度看」到「几乎给出方法」，都针对这道题。
9. **有延伸**：「如果是 100 个人握手呢？」「如果有 4 扇门呢？」
10. **值得讲给别人听**：孩子愿意回家考爸妈的题就是好题。这是最终测试。

格式参考（都是经过课堂验证的「好题」形态）：三幕式数学（3-Act Math）、Notice & Wonder、Which One Doesn't Belong、Would You Rather、Estimation、Visual Patterns、Open Middle、经典趣题（Gauss 求和、七桥、汉诺塔、1089 魔术、三门问题、Collatz）。

---

## 3. 目标与成功指标

| 指标 | 现状 | 目标（改造上线 4 周后） |
|---|---|---|
| 「亮眼题」数量（rubric ≥ 14/20） | ≈ 10 | ≥ 60，覆盖 8–10 / 10–12 / 12–14 三个年龄段 |
| 发布的题中带人工校验场景配置的比例 | 8%（39/511） | 亮眼题 100%；练习题可无动画但绝不显示错误动画 |
| 题目页上做出 Act 1 猜测的访客比例 | 无此功能 | ≥ 60% |
| 从进入题目页到「揭示」的到达率 | 未埋点 | ≥ 40% |
| 每道亮眼题的真实（非机器人）讨论数 | ≈ 0 | 中位数 ≥ 3 条 / 题 |
| 儿童测试「你会把这题拿给朋友看吗？」 | 未做 | 5 个孩子中 ≥ 4 个对 ≥ 3 道题说「会」 |
| 7 日回访率（登录用户） | 未埋点 | 有基线并上升 |

---

## 4. 方案总览

### 4.1 题目的新形态：三幕式

```
┌─ Act 1 · 钩子 ─────────────────────────────────────────────┐
│ 全宽视觉 + 一句话情境（尽量不出现数字）                      │
│ 「先猜一下」：滑块 / 三选一 / 大小比较 —— 猜不扣分，猜了给 XP │
│ 猜完立刻看到「其他人猜了什么」直方图（社会性好奇）           │
├─ Act 2 · 探索 ─────────────────────────────────────────────┤
│ 交互场景（场景就是题目）：拖、切、折、玩、模拟               │
│ 正式问题 + 答案输入（类型随题而变）                          │
│ 3 条针对本题的提示（逐条揭示），错误答案有针对性反馈          │
├─ Act 3 · 揭示 ─────────────────────────────────────────────┤
│ 场景播放「真相」动画（例：数字两两配对飞到一起变成 50 × 101）│
│ 「原来如此」：≤ 2 句话的顿悟                                  │
│ 「再往前一步」：延伸问题                                      │
│ 讨论引导：「你是怎么想到的？」+ 解法标签（画图 / 列式 / 试数） │
└───────────────────────────────────────────────────────────┘
```

### 4.2 改动分层

```
内容层    02-hero-question-catalog.md → packages/db/prisma/hero-questions/*.ts（每个「世界」一个文件）
          每道题 = 文本（双语）+ 猜测配置 + 场景配置 + 答案规则 + 提示 + 错误反馈 + 顿悟 + 延伸 + 讨论引导
            │ 构建期校验（Zod）：场景配置必须合法；提示不能是默认值；年龄必须 8–14
数据层    Prisma：Question 新增列（向后兼容，带默认值）+ Collection / Guess / DailyPuzzle / Event 表
API 层    tRPC：question.getById 返回新字段；新增 guess.submit / guess.histogram、collection.list、daily.today、event.track
引擎层    packages/animation-engine：Zod schema 注册表 + 场景契约（explore / reveal 两种相位）
          apps/web/components/scenes/*：每个场景一个 React 组件，可操作、可揭示、支持触屏与 reduced-motion
页面层    题目页重写为三幕流程；首页改为「今日一题 + 世界入口」；旧题库页改名「练习」
社区层    评论默认可见（过滤器 + 限流 + 举报），讨论引导，解法标签；清除机器人评论
度量层    Event 表 + 简单看板（admin）；Playwright 走通三幕；儿童测试脚本
```

### 4.3 关于「系统自动把题变成动画」这个愿景
原始愿景是「问题总是会被系统转化成有趣的动画」。目前靠关键词推断实现，是失败的。正确做法：
- **短期（本计划）**：场景配置是题目的一部分，由作者（agent）为每道题显式编写并通过 schema 校验。「自动」体现在：同一个场景类型（如 `handshake_graph`）可以被不同题目用不同参数复用，渲染是自动的。
- **中期（Phase 8，可选）**：在 admin 题目编辑器中加「AI 起草场景配置」按钮，用 LLM 从题目文本生成候选配置 → 预览 → 作者确认后保存。**永远不自动发布**未经确认的场景。

---

## 5. 分阶段执行计划

执行顺序见 §7。每个 Phase 的任务列到文件级别；具体代码由你写。

### Phase 0 · 质量标尺与审计工具（先做，约 1 天）

**目标**：在写任何内容之前，先定义「好」并能机器衡量一部分，同时搭好测试基建。

任务：
1. 测试基建：根目录加 `vitest`（workspace 模式），`packages/math-engine`、`packages/animation-engine`、`packages/db`（纯函数部分）各自可 `npm test`；`apps/web` 加 Playwright，先写一个「首页能打开」的冒烟用例。`turbo.json` 加 `test` pipeline。
2. 把 `01-question-rubric.md` 中的 10 条标准写成 `packages/math-engine/src/rubric.ts`：`scoreQuestionHeuristically(q): { score, flags[] }`。能机器判的（默认提示、推断配置、以「Compute/Solve:/What is」开头、只有一步运算、年龄 > 14、fun fact > 300 字符）打 flag；不能机器判的留给人工。
3. 审计脚本 `scripts/audit-questions.ts`：跑遍 `buildUSK12QuestionBank()`，输出 `docs/plans/good-questions-overhaul/audit-2026-10.csv`（title、category、age、flags、heuristic score、建议：KEEP_HERO_CANDIDATE / DRILL）。把结果摘要（各类 flag 的数量、候选升级为亮眼题的 ≤ 15 道清单）写到 `audit-summary.md`。
4. 为 `validateAnswer()`（`packages/math-engine/src/validator.ts`）补单元测试：分数、带单位、中文逗号、度数符号、负数、`1 and 5` 这类多值答案（目前多值答案 `"1 and 5"` 只能精确匹配，要记录为 Phase 4 待修）。

验收：
- `npm test` 在根目录跑通，至少 20 个用例。
- `audit-2026-10.csv` 存在且 511 行；`audit-summary.md` 有 flag 统计。
- 不改任何产品行为。

### Phase 1 · 数据模型 v2（约 1 天）

**目标**：让一道题能承载三幕结构，旧题零改动继续工作。

Prisma（`packages/db/prisma/schema.prisma`）：
```prisma
enum QuestionKind { DRILL PUZZLE THREE_ACT ESTIMATION WODB WOULD_YOU_RATHER PATTERN MAGIC_TRICK OPEN_MIDDLE PARADOX }
enum AnswerType   { NUMERIC CHOICE ESTIMATE MULTI_VALUE ORDERING EXPRESSION OPEN }

model Question {
  // ...现有字段不动...
  kind               QuestionKind @default(DRILL)
  answerType         AnswerType   @default(NUMERIC)
  hookEn             String?      // Act 1 情境（尽量无数字）
  hookZh             String?
  guessConfig        Json?        // { type: "slider", min, max, step, unit } | { type: "choice", options:[{id,en,zh}] }
  choices            Json?        // CHOICE 类型的选项 [{ id, en, zh, isCorrect }]
  answerRule         Json?        // 校验规则：{ tolerance } | { acceptedSet } | { exprTarget, allowedDigits } ...
  wrongAnswerFeedback Json         @default("[]") // [{ match: "5050*2"|"regex:^100$"|"gt:correct", en, zh }]
  ahaEn              String?      // ≤ 2 句顿悟
  ahaZh              String?
  extensionEn        String?      // 延伸问题
  extensionZh        String?
  discussionPromptEn String?
  discussionPromptZh String?
  solutionTags       Json         @default("[]") // 本题可选的解法标签 ["draw","pair","table","simulate"]
  collection         Collection?  @relation(fields: [collectionId], references: [id])
  collectionId       String?
  slug               String?      @unique // 稳定 URL，例如 "gauss-sum"
  @@index([kind, isPublished])
  @@index([collectionId, sortOrder])
}

model Collection {  // 「世界」
  id String @id @default(cuid())
  slug String @unique
  titleEn String
  titleZh String
  descEn String
  descZh String
  emoji String
  colorToken String   // tailwind 颜色名，如 "fun-purple"
  sortOrder Int @default(0)
  questions Question[]
}

model Guess {        // Act 1 猜测，支持游客
  id String @id @default(cuid())
  questionId String
  userId String?
  anonId String?     // cookie 里的匿名 id
  value String       // 滑块值或选项 id
  createdAt DateTime @default(now())
  @@index([questionId])
  @@unique([questionId, userId])
  @@unique([questionId, anonId])
}

model DailyPuzzle { date DateTime @unique @db.Date; questionId String; }

model Event {        // 轻量埋点
  id String @id @default(cuid())
  name String        // "question_view" | "guess_made" | "scene_interact" | "answer_submit" | "reveal_seen" | "extension_open" | "comment_post"
  questionId String?
  userId String?
  anonId String?
  props Json @default("{}")
  createdAt DateTime @default(now())
  @@index([name, createdAt])
  @@index([questionId, name])
}
```
- 生产部署走的是 `prisma db push`（见 `scripts/ec2-deploy.sh`），而且 `packages/db/prisma/migrations/` 目前在 `.gitignore` 里。所以 schema 变更**必须全部是加表 / 加列 / 可空 / 带默认值**，保证 `db push` 无破坏（部署脚本不带 `--accept-data-loss`，遇破坏性变更会自动停下，这是对的）。本地可以用 `prisma migrate dev --name question_v2_three_act` 生成迁移作为记录，但不要依赖它上线。要不要把 migrations 纳入版本控制是一个单独的决定：在 PR #2 描述里提出，不要擅自改 `.gitignore` 的这一条。
- `Comment` 加 `solutionTag String?` 和 `guessValue String?`（发评论时可附带自己当时的猜测）。
- `packages/api/src/routers/question.ts`：`getById` / `list` select 新字段；新增 `listByCollection`、`bySlug`。
- 新增 router：`guess.ts`（`submit`、`histogram` —— 直方图用 Redis 缓存 60 s，键 `guess:hist:{questionId}`）、`collection.ts`、`daily.ts`（`today`：按 UTC 日期取 `DailyPuzzle`，没有则按 `hash(date) % heroCount` 确定性选一道并写回）、`event.ts`（`track`：公开、限流、字段白名单）。
- `validateAnswer` 扩展为 `validateAnswerV2(input, question)`：按 `answerType` 分派。`MULTI_VALUE`（「1 和 5」顺序无关）、`ESTIMATE`（落在区间内算对，并返回「离真相多远」）、`CHOICE`、`ORDERING`。`EXPRESSION` 留到 Phase 4。

验收：
- 迁移在空库与现有 seed 库上都能应用；旧 511 题 `kind = DRILL` 行为不变。
- 新 router 有集成测试（用 `createCallerFactory` 直接调，连本地 Postgres）。
- `guess.histogram` 对 1000 次请求命中 Redis，DB 查询 ≤ 1 次/分钟。

### Phase 2 · 动画引擎 v2：场景就是题目（约 4–5 天，最大工程量）

**目标**：把「装饰动画」换成「可操作场景」。规格见 `03-scene-catalog.md`。

任务：
1. `packages/animation-engine/src/schema.ts`：每个场景类型一个 Zod schema，导出 `SceneConfigSchema = z.discriminatedUnion("type", [...])` 与 `parseSceneConfig()`。保留旧 8 种类型的 schema（给旧题用），新增 Tier 1 场景。
2. 场景契约（`packages/animation-engine/src/core/contract.ts`）：
   ```ts
   export type ScenePhase = "hook" | "explore" | "reveal";
   export interface SceneProps<C> {
     config: C; phase: ScenePhase; locale: "en" | "zh";
     reducedMotion: boolean;
     onEvent: (e: { name: string; props?: Record<string, unknown> }) => void; // 用于埋点与「操作过场景」判断
     onProposeAnswer?: (value: string) => void; // 场景可以把孩子操作出的值填进答案框（例如数了 45 条线）
   }
   ```
3. `apps/web/components/scenes/registry.ts`：`type → React.lazy(component)`，按需加载（每个场景独立 chunk，首屏 JS 预算 < 200 KB gz）。`MathAnimation.tsx` 改为薄壳：解析 config → 查注册表 → 渲染；解析失败或类型未注册 → **渲染 null**（不再显示「Animation type: xxx」占位）。
4. 实现 Tier 1 场景（支撑前 20 道题）：`gauss_pairing`、`handshake_graph`、`grid_squares`、`chessboard_doubling`、`fold_paper`、`monty_hall`、`dice_lab`、`birthday_room`、`number_trick_stepper`、`tower_of_hanoi`、`river_crossing`、`fence_shaper`、`visual_pattern`、`pizza_cuts`、`balance_lab`。每个场景：explore 可操作；reveal 播放真相；支持触屏；`prefers-reduced-motion` 下用淡入替代位移；键盘可达（Tab 到可操作元素，Enter/Space 触发）。
5. 删除关键词推断：`inferAnimationConfig()`（question-bank）与 `normalizeAnimationConfig()`（seed）对非 GEOMETRY 题返回 `null` 而不是空数轴；对 GEOMETRY 题只保留显式配置，其余也 `null`。`animationConfig` 为 `{}`/`null` 时题目页不渲染动画卡片。
6. 场景开发工具：`apps/web/app/[locale]/(platform)/admin/scenes/page.tsx`（admin 专属）：选场景类型 → 编辑 JSON → 实时预览三个相位。这是 agent 自己调场景时用的，也是 Phase 8 AI 起草的落点。

验收：
- `parseSceneConfig()` 单元测试覆盖每个 schema 的合法 / 非法样例。
- 每个 Tier 1 场景有一个 Playwright 用例：进入 explore → 做一次操作 → `onEvent` 触发 → 切到 reveal 不报错。
- 题目页 Lighthouse 性能 ≥ 85（移动端模拟），首屏 JS（gz）≤ 200 KB。
- 旧题页面不再出现错误的三角形 / 空数轴。

### Phase 3 · 内容：60 道亮眼题（约 4–5 天，可与 Phase 2 并行）

**目标**：按 `02-hero-question-catalog.md` 把 6 个世界共约 60 道题写出来，每道题过 rubric。

任务：
1. 作者模板：`packages/db/prisma/hero-questions/_template.ts` 导出 `HeroQuestionBlueprint` 类型（见 `01-question-rubric.md` §4），字段齐全、双语、含 `sceneConfig`（强类型，引用 `SceneConfigSchema` 的 `z.infer`）。
2. 每个世界一个文件：`world-huge-numbers.ts`、`world-shapes-that-lie.ts`、`world-chance-and-luck.ts`、`world-number-magic.ts`、`world-patterns-everywhere.ts`、`world-impossible-puzzles.ts`。
3. 构建期校验 `packages/db/prisma/hero-questions/validate.ts`（seed 前自动跑，失败则 seed 中止）：
   - `sceneConfig` 通过 `parseSceneConfig()`；
   - `hints.length === 3` 且与 `DEFAULT_HINTS` 不同、每条 ≥ 15 字符；
   - `ahaEn/Zh` ≤ 240 字符；`funFact` ≤ 300 字符；
   - `ageGroup ∈ {AGE_8_10, AGE_10_12, AGE_12_14}`；
   - `wrongAnswerFeedback.length ≥ 2`；`discussionPrompt` 非空；`extension` 非空；
   - 答案能被 `validateAnswerV2` 用自己的 `answerRule` 验证通过（自洽）；
   - `slug` 唯一。
4. seed：`seed.ts` 调用 `buildHeroQuestions()`，upsert by `slug`（幂等，支持 `questions_only` 模式）；创建 6 个 `Collection`；旧 511 题 `kind = DRILL`，保持已发布但不进入任何 collection。
5. 升级旧库里 ≤ 15 道「候选」（Phase 0 审计结果，如 `Math Mind-Reading Trick`、`Paper Folding Challenge`、`Cicada Underground Mystery`、`Sudoku Number Logic`、`Tower Shadow Trick`）：给它们写钩子、场景、提示，升为 hero，归入对应世界。
6. 每道题写完后用 `01-question-rubric.md` 人工打分，分数与一句理由写在 blueprint 的 `rubricNotes` 字段（不入库）。< 14 分的不发布。

验收：
- `npm run db:seed` 成功，`Question` 表中 `kind != DRILL` 且 `isPublished` 的 ≥ 60。
- 三个年龄段各 ≥ 15 道；每个世界 ≥ 8 道。
- `validate.ts` 对故意改坏的样例（默认提示、非法场景）能拦住，有测试。
- 中文文案由母语水平复核：没有机翻腔（例如不要出现「让我们」开头的句子堆叠）。

### Phase 4 · 题目页：三幕流程（约 3 天）

**目标**：重写 `apps/web/app/[locale]/(platform)/questions/[questionId]/page.tsx` 为三幕体验。

任务：
1. 路由：hero 题支持 `/questions/[slug]`（旧 id 路由保留并 301 到 slug）。
2. 组件拆分（`apps/web/components/question-v2/`）：`HookStage`（钩子 + 猜测控件 + 猜后直方图）、`ExploreStage`（场景 + 问题 + `AnswerInput`（按 `answerType` 切换：数字 / 选项卡片 / 滑块 / 多值芯片 / 拖拽排序 / 表达式）+ `HintLadder` + `WrongAnswerCoach`）、`RevealStage`（场景 reveal 相位 + `Aha` + `Extension` + `DiscussionPrompt`）、`StageProgress`（顶部三步指示）。
3. 状态机（`useQuestionFlow`）：`hook → (guess | skip) → explore → (correct | gaveUp) → reveal`。游客全流程可用（猜测用 anonId、答案走 `checkAnswer`），登录才记 XP。刷新后恢复到上次相位（localStorage）。
4. 错误反馈：`wrongAnswerFeedback` 的 `match` 规则按序匹配（精确值 / 正则 / `gt:correct` / `lt:correct` / `offByFactor:2`），命中则显示针对性文案，不命中显示通用鼓励 + 建议看下一条提示。连错 3 次出现「看答案」按钮（进入 reveal，记为 `gaveUp`，给探索 XP 但不给答对 XP）。
5. XP 规则（写在 `packages/math-engine/src/xp.ts`，有测试）：猜测 +5（每题一次）；第一次尝试 +5（对错都给）；答对 +difficulty XP（EASY 10 / MEDIUM 25 / HARD 50，与现有一致）；一次提示都没用答对额外 +10；写一条 ≥ 30 字的解法评论 +10（每题一次）。
6. `EXPRESSION` 答案类型（四个 4 等题）：实现一个安全的四则 + 括号 + 幂 + 阶乘 + 开方的小解析器（`packages/math-engine/src/expr.ts`，递归下降，白名单 token，不用 `eval`/`Function`），校验「只用了允许的数字各一次」+「值等于目标」。有 fuzz 测试。
7. 直方图组件：Act 1 猜完立刻显示 `guess.histogram`（滑块型用 10 个桶；选项型用条形），标出「你」和「真相」（真相只在 reveal 后显示）。
8. 移动端：场景在上、问题在下、答案栏粘底；触屏目标 ≥ 44 px。
9. 删除：旧 `HintRevealer` 的通用提示文案、「Animation type: xxx」占位、右栏 fun fact 卡（内容合并进 reveal）。

验收：
- Playwright：对 3 道不同 `answerType` 的 hero 题走完整三幕（游客 + 登录各一次）。
- 错误反馈单元测试：每种 `match` 规则。
- `expr.ts`：恶意输入（超长、深嵌套、非法 token）在 5 ms 内被拒。
- axe-core 无严重可访问性问题；键盘可完成全流程。

### Phase 5 · 发现与进程：今日一题 + 世界（约 2 天）

**目标**：孩子打开首页知道「今天玩什么」。

任务：
1. 登录后首页（`(platform)` 的根）：顶部「今日一题」大卡（钩子文字 + 场景 hook 相位静帧 + 「已有 N 人猜过」）；下方 6 个世界的入口卡（emoji、一句话、已解 x/y 进度环）；再下「继续上次」。
2. 世界页 `/worlds/[slug]`：按 `sortOrder` 排列的题目路径（像关卡地图，但不锁题——锁题会让孩子流失，用「推荐下一题」代替）。每题卡显示钩子一句话，而不是题干。
3. 旧题库页 `/questions` 改名「练习」（导航次级位置），保留筛选。首页与导航主位置不再直达练习。
4. 「惊喜一下」按钮：随机一道未做过的 hero 题。
5. 连续天数（streak）改为按「今天做出一次猜测或一次场景操作」计，而不是答对。
6. 游客首页也能看到今日一题并完成 Act 1 猜测（这是最强的转化钩子），答案提交处再提示注册。
7. SEO：`sitemap.ts` 加 hero 题 slug 与世界页；每道 hero 题的 `generateMetadata` 用钩子句作 description。

验收：
- 首页首屏 LCP < 2.5 s（移动端模拟）。
- `daily.today` 同一天全球一致、跨天切换有测试。
- Playwright：游客从首页 → 今日一题 → 猜测 → 直方图可见。

### Phase 6 · 讨论区复活（约 1.5 天）

**目标**：讨论区有真人、有话题、安全。

任务：
1. 评论可见性：登录用户评论默认 `isApproved = true`，经过：敏感词过滤（中英词表，`packages/api/src/moderation/wordlist.ts`，命中则 `isFlagged = true, isApproved = false` 进审核队列）+ 每用户 5 条/分钟限流（Redis）+ 长度 2–500 + 不允许 URL。孩子可「举报」（新 mutation `comment.report`）。admin 审核页保留。
2. 清理机器人评论：生产执行 `SEED_MODE=community_cleanup`，并在 `seed.ts` 中把 `SEED_COMMUNITY_BOOST` 默认彻底关闭，加注释「仅本地演示」。
3. 讨论区结构：顶部显示 `discussionPrompt`；发帖时可选一个 `solutionTag`（画图 / 配对 / 列表 / 试数 / 模拟 / 其他）；列表可按标签筛；评论旁显示发帖人当时的猜测值（「我猜了 23」）。
4. 「我不同意」路径：对 `PARADOX` / `CHOICE` 类题，评论区顶部按选项分栏显示人数（来自 `Guess`），鼓励两边辩论。
5. 鼓励首帖：答完题的 reveal 阶段内嵌评论框（而不是要滚到页面底部），占位文案就是 `discussionPrompt`。

验收：
- 评论发布后立即可见（无敏感词情况），有集成测试；敏感词样例被拦并进审核。
- 限流测试：第 6 条/分钟被拒。
- 生产库 `@seed.gmq.local` / `@community.gmq.local` 用户数为 0。

### Phase 7 · 质量门禁、度量与儿童测试（约 1.5 天 + 持续）

任务：
1. CI：新增 `.github/workflows/ci.yml`，PR 上跑 `lint`、`test`、`build`、内容校验（`validate.ts`）、Playwright 冒烟。`deploy.yml` 改为依赖 CI 通过。
2. 埋点：`event.track` 在题目页关键节点调用（见 Phase 1 事件名）；admin 加「题目漏斗」页：每道 hero 题的 view → guess → interact → submit → reveal 转化、平均停留、放弃率、评论数。用 Prisma `groupBy` 即可，不引入第三方。
3. 内容回归：`scripts/content-lint.ts` 在 CI 跑，输出任何发布态 hero 题违反 rubric 机器项的清单。
4. 儿童测试协议（写到 `docs/plans/good-questions-overhaul/kid-test-protocol.md`）：5 个 8–14 岁孩子，每人 20 分钟，3 道题，边玩边说；记录：第一次笑/惊讶在哪一步、卡住在哪一步、要不要提示、答完说了什么、「会不会拿给朋友看」。测试结果反馈到题目的 `rubricNotes`。这一项 agent 只负责写协议和记录表，执行由人完成。
5. 性能：`question.getById` 与 `guess.histogram` 加 Redis 缓存（题目内容按 `updatedAt` 失效）；hero 题页用 `generateStaticParams` + ISR（60 s）。k6 脚本对题目页与 `guess.submit` 做 2× 预期峰值（假设 2000 并发）压测，P95 < 300 ms。

验收：
- CI 绿才能合并；`main` 受保护。
- admin 漏斗页能看到至少一天的真实数据。
- k6 报告存入 `docs/plans/good-questions-overhaul/perf/`。

### Phase 8 · 可选：AI 辅助出题与场景起草
- admin 题目编辑器加「AI 起草」：输入一句钩子想法 → 生成完整 `HeroQuestionBlueprint` 草稿（含场景配置）→ 预览 → 人工修改 → 保存为未发布。用 Claude API，提示词版本化在 `packages/api/src/ai/prompts/`。
- 「孩子的追问」：reveal 阶段一个「为什么？」按钮，对预置的 3 个追问给预先写好的回答（不实时调用模型，避免成本和安全问题）。
- 做这一阶段前先确认预算；不是本计划的验收范围。

---

## 6. 风险与规避

| 风险 | 规避 |
|---|---|
| 场景开发量失控（每个场景都是一个小游戏） | 严格按 `03-scene-catalog.md` 的 Tier 分级；Tier 1 先做 15 个，每个场景被 ≥ 2 道题复用才值得做；单个场景组件 ≤ 400 行，超了拆 |
| 内容质量靠「感觉」 | rubric 打分写进 blueprint；< 14 分不发布；儿童测试结果回写 |
| 中文文案机翻腔 | 先写中文再写英文（或反之），但两边都要像母语者说话；长句拆短；避免直译「让我们…」 |
| 迁移破坏生产 | 所有新列可空/带默认；先在本地 seed 库跑 `prisma migrate deploy`；部署脚本遇破坏性变更会自动停 |
| 游客猜测被刷 | `Guess` 按 `(questionId, anonId)` 唯一 + Redis 限流 30 次/小时/IP；直方图缓存 |
| 评论默认可见带来风险 | 敏感词 + 限流 + 举报 + 禁 URL + admin 审核；出问题可用环境变量一键回到「先审后发」 |
| 首屏 JS 膨胀 | 场景懒加载、`d3` 只按需引入子模块、Lighthouse 门禁 |
| 旧题隐藏后老用户找不到 | 导航保留「练习」入口；个人页显示练习进度；不删任何数据 |

---

## 7. 执行顺序与里程碑

**原则：第 1 周先打通一条「垂直切片」，让 5 道题端到端跑起来，拿去给孩子看，再铺量。**

```
Week 1  Phase 0（1 d）→ Phase 1（1 d）→ Phase 2 Tier-1 前 5 个场景 + Phase 3 前 5 道题 + Phase 4 三幕页最小版（3 d）
        里程碑 M1：/questions/gauss-sum 等 5 道题能完整走三幕，游客可猜测、可看直方图  ← 这时就应该找孩子试
Week 2  Phase 2 剩余 Tier-1 场景 + Phase 3 到 30 道题 + Phase 4 补全（错误反馈、表达式、移动端）
        里程碑 M2：30 道 hero 题上线到 staging；儿童测试第一轮，修正
Week 3  Phase 3 到 60 道 + Phase 5（首页/今日一题/世界）+ Phase 6（讨论区）
        里程碑 M3：首页改版；旧题库降级为「练习」
Week 4  Phase 7（CI、埋点、漏斗、压测、第二轮儿童测试）+ 打磨
        里程碑 M4：生产发布；一周后看 §3 指标
```

建议 PR 切分：`#1 test-infra+audit`、`#2 schema-v2+routers`、`#3 scene-engine-core+5-scenes`、`#4 hero-content-batch-1`、`#5 question-page-v2`、`#6 scenes-tier1-rest`、`#7 hero-content-batch-2/3`、`#8 home+worlds+daily`、`#9 discussion`、`#10 ci+metrics+perf`。

---

## 8. 完成的定义（整体）

- [ ] ≥ 60 道 hero 题发布，三个年龄段各 ≥ 15，每道 rubric ≥ 14，每道有通过校验的场景配置、3 条专属提示、≥ 2 条错误反馈、顿悟、延伸、讨论引导，中英双语。
- [ ] 题目页三幕流程在桌面与移动端可用，游客可完成 Act 1；错误答案得到针对性反馈。
- [ ] 首页为「今日一题 + 世界」；旧题库降为「练习」；没有任何页面显示错误/空的动画。
- [ ] 讨论区评论即时可见、有敏感词与限流保护、机器人评论清零。
- [ ] CI（lint / test / build / content-lint / e2e 冒烟）绿；admin 漏斗可看；k6 报告在仓库。
- [ ] 一轮儿童测试记录在仓库，≥ 4/5 孩子对 ≥ 3 道题说「会拿给朋友看」。

---

## 附录 A · 当前代码里需要重点改动的位置

| 路径 | 现状 | 改动 |
|---|---|---|
| `packages/db/prisma/us-k12-question-bank.ts` | 511 题 + 关键词推断动画 + 默认提示 | 保留为 DRILL 来源；`inferAnimationConfig` 改为仅返回显式配置或 `null`；`DEFAULT_HINTS` 仅用于 DRILL |
| `packages/db/prisma/seed.ts` | 全量重置 + 机器人评论 | 加 hero 题 upsert、Collection、校验；关闭 community boost |
| `packages/animation-engine/src/core/scene-builder.ts` | 8 个装饰性 builder | 新增 `schema.ts`、`contract.ts`；builder 仅服务旧类型 |
| `apps/web/components/animations/MathAnimation.tsx` | 所有场景在一个 34 KB 文件 | 拆成 `components/scenes/*` + 注册表 + 懒加载 |
| `apps/web/app/[locale]/(platform)/questions/[questionId]/page.tsx` | 单输入框、无三幕 | 重写为三幕流程 |
| `apps/web/app/[locale]/(platform)/questions/page.tsx` | 511 卡网格 | 改名「练习」，次级导航 |
| `packages/api/src/routers/question.ts` | `getById` / `submitAnswer` | 新字段、`validateAnswerV2`、XP 规则外提 |
| `packages/api/src/routers/comment.ts` | 先审后发 | 默认可见 + 过滤 + 限流 + 举报 + 解法标签 |
| `packages/math-engine/src/hints.ts` | 占位符 | 删除 `generateHints`，提示全部来自内容 |
| `packages/math-engine/src/validator.ts` | 单值校验 | `validateAnswerV2` 按类型分派；`expr.ts` |
| `packages/i18n/{en,zh}.json` | 「每道题都会变成彩色动画」 | 改为真实的承诺：「每道好题都能上手玩」 |
