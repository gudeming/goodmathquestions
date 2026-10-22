# 03 · 交互场景目录（动画引擎 v2）

原则：**场景就是题目**。孩子的操作改变画面，画面回答问题；揭示（reveal）相位把「为什么」演出来。装饰性动画一律不做。

---

## 1. 通用契约

### 1.1 文件布局
```
packages/animation-engine/src/
  schema.ts            # 所有场景的 Zod schema；export const SceneConfigSchema = z.discriminatedUnion("type", [...])
  core/contract.ts     # ScenePhase / SceneProps / SceneEvent 类型
  core/legacy/*        # 旧 8 种类型的 builder（仅 DRILL 题使用，不再扩展）
apps/web/components/scenes/
  registry.ts          # type → React.lazy(() => import("./<Type>Scene"))
  SceneHost.tsx        # 解析 config → 查注册表 → Suspense + ErrorBoundary → 渲染；解析失败渲染 null 并上报 event "scene_config_invalid"
  <Type>Scene.tsx      # 每个场景一个文件，≤ 400 行；共享的 SVG 小部件放 ./primitives/
  primitives/          # Dot, Edge, Grid, Pan (天平), Die, Coin, Token, Counter, Histogram, Slider
```

### 1.2 类型
```ts
export type ScenePhase = "hook" | "explore" | "reveal";
// hook    : 静态或轻微循环的「海报」状态，不可操作（用在首页卡片和 Act 1 背景）
// explore : 可操作
// reveal  : 播放真相；操作禁用；播放结束触发 onEvent({ name: "reveal_done" })

export interface SceneEvent { name: string; props?: Record<string, unknown> }
// 必须实现的事件：
//   "interact"        首次任意操作（用于 streak 与漏斗）
//   "state"           每次状态变化的摘要（如 { pairs: 12 }），节流 ≤ 2/s
//   "completed"       场景内目标达成（过河成功 / 塔搬完），props 含 { moves }
//   "reveal_done"
export interface SceneProps<C> {
  config: C;
  phase: ScenePhase;
  locale: "en" | "zh";
  reducedMotion: boolean;         // 来自 useReducedMotion()；为 true 时位移动画改为 ≤ 200 ms 淡入淡出
  onEvent: (e: SceneEvent) => void;
  onProposeAnswer?: (value: string) => void; // 场景把孩子操作出的值填入答案框（不自动提交）
}
```

### 1.3 每个场景必须满足
- **尺寸**：响应式 SVG（`viewBox`），宽度 100%，高度 ≤ 360 px（移动端 ≤ 280 px）。
- **触屏**：所有可拖拽元素用 pointer events；点击目标 ≥ 44 px。
- **键盘**：可操作元素 `tabIndex=0`，Enter/Space 触发，方向键移动（有拖拽时）。
- **文字**：场景内文字走 `locale`，用 config 里的 `labels?: { en, zh }` 或内置双语。
- **性能**：不在 render 里做 O(n²) 布局；模拟类（骰子、生日）用 `requestAnimationFrame` 批量跑，单帧 ≤ 8 ms；总 chunk（gz）≤ 40 KB。
- **确定性**：模拟类接受 `seed?: number`，测试时固定 seed 结果可复现。
- **测试**：schema 合法/非法样例 ≥ 3 对；Playwright：explore 操作一次 → 收到 `interact` → 切 reveal → 收到 `reveal_done`。
- **错误**：任何运行时异常由 `SceneHost` 的 ErrorBoundary 捕获 → 渲染 null + 上报，不影响答题。

### 1.4 Schema 书写规范
```ts
const GaussPairingSchema = z.object({
  type: z.literal("gauss_pairing"),
  n: z.number().int().min(4).max(1000),
  visibleHead: z.number().int().min(3).max(10).default(6),
  visibleTail: z.number().int().min(3).max(10).default(6),
  pairSum: z.number().int(),      // 冗余字段是故意的：校验器会断言 pairSum === n + 1，防止文案与场景不一致
  pairCount: z.number().int(),
  seed: z.number().int().optional(),
}).refine(c => c.pairSum === c.n + 1 && c.pairCount === c.n / 2, { message: "pairSum/pairCount inconsistent with n" });
```
所有带「答案」语义的字段都要有 `refine` 自洽校验；`validate.ts` 还会把场景里的答案和 blueprint 的 `answer` 交叉比对。

### 1.5 优先级
- **T1（15 个，Week 1–2）**：支撑前 ~30 道题，复用率高或实现简单。
- **T2（~22 个，Week 2–3）**：各支撑 1–2 道题。
- **T3（~11 个）**：实现成本高（伪 3D、自由画线校验、表达式拖拽）。未就绪时对应题用 `illustration` 发布。

---

## 2. T1 场景

### `gauss_pairing` — A1
- explore：横排显示 1…6 … 95…100（中间省略号可展开）。拖一个数到另一个数上配对；配对成功两数合为一个「101」胶囊并计数 `pairs`。随便配：1+2 也允许，但胶囊显示 3 而不是 101，让孩子自己发现「两头配」才整齐。按钮「自动配一对」演示 1+100。
- reveal：所有数从两端飞向中间两两合并成 50 个 101 胶囊，胶囊排成 5×10，顶部出现 `50 × 101 = 5050`。
- events：`state { pairs, uniformSum: boolean }`；配满 50 对且全为 101 时 `completed` 并 `onProposeAnswer("5050")`。

### `handshake_graph` — A8
- config：`{ type, people: 3..12, names?: Bi[] }`
- explore：n 个头像围成圆。点两个人 → 画一条线并计数；重复点同一对会提示「已经握过了」。按钮「让 1 号和所有人握手」。
- reveal：按人逐个亮起连线，每人 9 条共 90 条「闪一下重叠」，然后减半到 45，并显示 `10 × 9 ÷ 2`。
- events：全部连完 `completed` + `onProposeAnswer(String(n(n-1)/2))`。

### `grid_squares` — B1
- config：`{ type, size: 3..8 }`
- explore：n×n 格。底部按钮「1×1 / 2×2 / … / n×n」切换当前尺寸；在格子上滑动时跟随显示该尺寸的正方形框；点一下计一个（去重），右侧按尺寸列表显示已找到的数量 / 总数。
- reveal：逐尺寸扫描动画，右侧表格 64 + 49 + … + 1 = 204。
- events：某尺寸找满时 `state`；全部找满 `completed`。

### `chessboard_doubling` — A2（E1 延伸复用）
- config：`{ type, squares: 8..64, unitLabel: Bi, startAmount: 1, showLogScale: true }`
- explore：棋盘，点下一格→米粒数翻倍，右侧柱子长高；超过屏幕时自动切换到对数刻度并提示「柱子已经画不下了」。显示当前格数、粒数（千分位），以及类比（> 1 碗 / > 1 卡车 / > 全球年产量）。
- reveal：快进到第 64 格，总数与「全球 1000+ 年产量」类比。
- events：到第 21 格 `onProposeAnswer("1048576")`（仅在题目 answer 对应时由宿主决定是否使用）。

### `fold_paper` — A3
- config：`{ type, thicknessMm: 0.1, maxFolds: 42, references: Array<{ heightMm: number; label: Bi }> }`（硬币、书、人、楼、珠峰、月球）
- explore：点「折一次」纸变半宽双厚，右侧高度尺对比参照物（对数刻度），折到 7 次后纸「折不动了」出现提示，但可以继续「假装折」。
- reveal：快进到 42 次到月球。

### `monty_hall` — C2
- config：`{ type, doors: 3..100, rounds: 20, seed? }`
- explore：选门 → 主持人开一扇空门 → 「换 / 不换」→ 揭示 → 记分板分别统计换/不换的胜率。按钮「自动玩 100 局（一直换）」「自动玩 100 局（一直不换）」。
- reveal：两条胜率柱并排，标 1/3 与 2/3 虚线；下方三扇门示意「你一开始选错的概率是 2/3」。
- events：每局 `state { switchWins, switchGames, stayWins, stayGames }`。

### `dice_lab` — C3 / C6 / C8
- config：`{ type, mode: "sum" | "product" | "until_target", dice: 1..3, target?: 1..6, rolls: 300, seed? }`
- explore：按钮「掷 1 次 / 掷 10 次 / 掷 300 次」。sum/product 模式下方直方图实时长高（product 模式用奇/偶两色）；until_target 模式显示每轮用了几次的直方图和运行平均值。
- reveal：sum：叠出 6×6 结果表，7 的格子亮起；product：表格奇偶着色 27:9；until_target：平均线落在 6。

### `birthday_room` — C1 / C9
- config：`{ type, mode: "any_pair" | "match_me", maxPeople: 60 | 500, trials: 200, seed? }`
- explore：滑块「房间里有几个人」；点「模拟 200 个房间」→ 显示「有重合的房间比例」折线随人数变化（可以多点几个人数值连成曲线）。any_pair 模式下重合的两人用线连起。
- reveal：曲线完整画出，50% 虚线与 23（或 253）交点高亮。

### `number_trick_stepper` — D1 / D2 / D3 / D4
- config：`{ type, input: { digits?: 1..4, min?, max?, constraint?: "distinct_ends_diff_ge_2" | "not_all_same" | "none" }, steps: Array<{ op: "double" | "add" | "halve" | "subtract_original" | "reverse" | "sort_desc_minus_asc" | "scramble_minus" | "add_reverse" | "abs_diff_reverse", arg?: number, label: Bi }>, loopUntilFixed?: boolean, maxLoops?: 7, expectFixedPoint?: number }`
- explore：孩子输入自己的数（校验 constraint），每点一次「下一步」执行一步并显示过程；可「换个数再来」保留历史列表。loop 模式显示每一轮的值直到不变。
- reveal：历史列表里所有终值高亮为同一个数；D1 额外展示 99 的倍数表；D2 显示代数版（用天平图示）。
- refine：`expectFixedPoint` 存在时校验器用 20 个随机合法输入跑一遍 steps，断言都到达该值。

### `tower_of_hanoi` — E1
- config：`{ type, discs: 3..6, askDiscs?: 4 }`
- explore：拖/点搬盘，非法落点抖动；计步器；完成后显示「用了 k 步，最少 2^n − 1」。「再加一个盘」按钮。
- reveal：自动演示 askDiscs 盘的最优解（可加速），步数表 1、3、7、15、31。
- events：`completed { moves, discs }`；若 `discs === askDiscs && moves === 2^n−1` 则 `onProposeAnswer`。

### `river_crossing` — F1
- config：`{ type, items: Array<{ id, emoji, label: Bi }>, conflicts: Array<[string, string]>, boatCapacity: 1 }`
- explore：点物品上船，点「过河」；留下冲突组合时播放「被吃」动画并回退一步（不惩罚，计失败次数）；计过河次数。
- reveal：自动演示 7 步最优解。
- events：`completed { crossings }` → 宿主判定 SCENE_COMPLETION。

### `fence_shaper` — B4
- config：`{ type, perimeter: 24, integerOnly: true, wallSide?: boolean }`
- explore：滑块或拖拽改变宽，长自动 = P/2 − 宽；地块实时重绘并显示面积；右侧小折线记录尝试过的 (宽, 面积) 点。
- reveal：面积曲线完整画出，顶点 (6, 36) 高亮。
- events：面积最大时 `onProposeAnswer("36")`。

### `visual_pattern` — E3（可复用于任何「看图找规律」）
- config：`{ type, steps: Array<{ cells: Array<[number, number]> }>, askStep: 10, cellColorRule?: "arm" | "ring" | "none" }`（给前 3–4 步的点坐标）
- explore：显示给定步；「画第 4 步」网格让孩子点亮格子，点「检查」对照模式自动延拓的第 4 步；表格记录每步点数；孩子可以切换「按胳膊着色 / 按圈着色」看不同分法。
- reveal：动画从第 1 步长到第 10 步，边上公式 4n + 1。
- 注意：延拓规则由 config 显式给（`rule: { kind: "linear", a: 4, b: 1 }`），不要让场景去「猜」规律。

### `pizza_cuts` — B2
- config：`{ type, maxCuts: 4..6 }`
- explore：在圆上拖出直线（两端点在圆外），最多 maxCuts 条；实时填色并计区域数（线段平面划分，用简单的 arrangement 算法或光栅填充计数）；按钮「把所有刀都过圆心」演示 8 块。
- reveal：逐刀加入最优排列，计数 1、2、4、7、11。

### `balance_lab` — F2 / E10
- config：`{ type, mode: "find_heavy" | "weights", items?: 9, weights?: [1, 3, 9, 27], target?: number }`
- find_heavy：拖球到左右盘，点「称」；天平倾斜或平衡；计称重次数；点一个球「这是重的」提交；重球位置随机（seed），孩子答对后可「再来一局」。reveal：演示 3-3-3 分法。
- weights：拖砝码到任一盘，物品在左盘；目标重量滑块；显示当前能否平衡；「找到所有能称的重量」进度条 1…40。reveal：三进制表格。

---

## 3. T2 场景（每条只写差异点）

- `scale_ladder` — A4 / A5 / A9：一条对数「梯子」，左列单位（秒 / 分 / 时 / 天 / 年），孩子点「×60」「×24」「÷365」把一个量一级级换算，右侧参照物；A9 模式显示 10 的幂塔，两个数的 0 的个数并排。
- `halving_bar` — A10：1 米进度条，点「走一半」填充剩余的一半，显示分数累加 1/2 + 1/4 + …，20 次后提示「剩下的比一个原子还小」；reveal 条填满。
- `circle_rope` — B3：行星选择（篓球 / 地球 / 太阳），滑块「绳子加长多少米」，缝的高度实时显示并与猫 / 手指 / 车对比；reveal：三种行星同一缝高。
- `pythagoras_squares` — B6：拖动三角形顶点（直角锁定可切换），三个正方形面积实时显示，右侧 a² + b² 与 c² 两根柱；reveal：小正方形切成单位格飞进大正方形。
- `bridges_trace` — B7：地图，点桥走过去（变灰），走不通时提示；记录尝试次数；按钮「数每块陆地的桥」显示度数；reveal：奇度数陆地闪红。config 给图 `{ nodes, edges }`，可复用到其他一笔画题。
- `clock_overlap` — B8：可拖动的钟（拖分针，时针联动），重合时「叮」并记录时刻；reveal：22 个时刻在 24 小时轴上。
- `tiling_lab` — B9：形状托盘拖到画布，自动吸附边；缝隙用红色显示；角度标签；reveal：角度除 360 的表。
- `domino_tiling` — B10：棋盘（可选剪掉哪两格），拖放骨牌；黑白计数条；reveal：颜色论证。
- `coin_flips` — C4：掷一次 / 掷到出现 10 连；连串后「下一次」的统计条；reveal：1/1024 与 50/50。
- `sock_drawer` — C5：抽屉，摸一只（颜色随机但可「最倒霉模式」），拿到配对时亮起；reveal：鸽巢示意。
- `pi_darts` — C7：点「扔 10 / 100 / 1000」，圆内外两色点，比例与 ×4 实时显示；reveal：收敛到 π 的折线。
- `collatz_path` — D5：输入起点，逐步画折线（冰雹图）；表格记录各起点步数与峰值；reveal：1–9 的步数柱状。
- `digit_slide` — D6：两位数的数字分开、中间滑入它们的和，支持进位演示。
- `fib_spiral` — D8：点「下一个」加正方形并延伸螺旋，比值表；reveal：向日葵叠加。
- `divisor_blocks` — D9：选一个数，它的真因数作为长条堆叠与自身比较（短了 / 正好 / 超了）；reveal：28 正好。
- `staircase_paths` — E2：小 n 的楼梯，拖出路径（1 步 / 2 步），系统去重计数；表格 n→ways；reveal：f(n) = f(n−1) + f(n−2) 的箭头。
- `pascal_triangle` — E4：点空格填数（或「自动填一行」），行和显示；按钮「涂偶数 / 涂 3 的倍数」；reveal：行和 2^n。
- `calendar_grid` — E7：真实月历，拖 3×3 窗口，九数和与中心 ×9 并排；reveal：对称配对连线。
- `cycle_timeline` — E8：两行年份灯（周期可调），同时亮起的年份标红，首次同时亮的年份显示；reveal：lcm 表。
- `frog_puzzle` — E9：荷叶、青蛙，点蛙跳；计步；死局提示「撤销」；reveal：最优 15 步演示。
- `water_jugs` — F6：两壶，按钮「装满 / 倒空 / 倒入另一壶」，计步；目标达成 `completed`；reveal：6 步演示。
- `queens_board` — F7：n×n 棋盘，点放皇后，攻击线高亮；找到解时记录（去重镜像可选）；reveal：两解并排。
- `guess_game` — F12：孩子猜，系统答大/小；可切换「我出题你猜」/「你出题我猜（二分演示）」；reveal：范围减半条。
- `expression_builder` — F5：数字块与运算块拖成表达式，实时求值（调用 `@gmq/math-engine` 的 `expr.ts`），显示用了几个 4；reveal：几种解并列。
- `coin_piles` — F10：100 枚硬币（正反隐藏），拖 10 枚到右堆，按钮「翻转右堆」「揭晓」；多次随机试验计数；reveal：k 与 10 − k 的代数。
- `trains_fly` — F11：时间轴拖动，火车与苍蝇位置实时，苍蝇累计里程；reveal：相遇时刻 1 h，75 km。

---

## 4. T3 场景（高成本；未就绪时用 `illustration`）

- `zoom_number_line` — A6：无限放大 0.999… 与 1 之间（每次放大 10 倍再显示一位 9）。
- `hotel_shift` — A7：无限走廊透视，房客整体右移一格。
- `dissection_slide` — B5：四块拼板拖放对齐，放大镜显示斜边缝隙。
- `mobius_cut` — B11：伪 3D 纸带与剪刀路径。
- `sequence_lineup` — C10：四串硬币序列并排，高亮最长连串与计数。
- `prime_spiral` — D7：生成并着色 Ulam 螺旋，可拖动起点。
- `money_flow` — D10：三人、老板、服务员之间的钱流动画与「数两遍」高亮。
- `polyomino_builder` — E5：网格拼方块，自动规范化（旋转 / 翻面可切）去重计数。
- `star_drawer` — E6：n 点圆与步长 k 的一笔画动画，分组着色。
- `bridge_torch` — F4：桥、手电、四个人的拖拽时间线与总时间。
- `dot_connect` — F9：自由画 4 段相连直线，校验是否覆盖 9 点（容差 8 px，线可出框）。
- `switch_room` / `dialogue_cards` — F3 / F8：轻量插图式，可并入 `illustration`。

### `illustration`（通用兜底）
```ts
{ type: "illustration", asset: "three-switches" | ..., caption: Bi, revealAsset?: string, revealCaption?: Bi }
```
资产为仓库内 SVG（`apps/web/public/scenes/*.svg`），explore 显示 `asset`，reveal 切换到 `revealAsset`。用它发布的 hero 题 ≤ 15 道，且在 blueprint `rubricNotes` 里注明「待替换为 <scene>」。

---

## 5. 旧场景处理
`pizza_slice`、`balance_scale`、`number_journey`、`triangle_angles`、`candy_jar`、`staircase`、`magic_square`、`number_combine`：
- schema 保留（用于校验 39 道显式配置的 DRILL 题）；
- 组件迁入 `components/scenes/legacy/`，不再修改；
- `staircase` 由 `staircase_paths` 取代，`balance_scale` 由 `balance_lab` 取代，`pizza_slice` 后续可被分数题的 `fraction_lab`（本计划未列）取代；
- 任何未通过 schema 的旧配置 → 渲染 null。

---

## 6. 实现顺序建议
Week 1：`SceneHost` + registry + schema 骨架 + `gauss_pairing`、`handshake_graph`、`grid_squares`、`number_trick_stepper`、`monty_hall`（M1 用这 5 个）。
Week 2：`dice_lab`、`birthday_room`、`chessboard_doubling`、`fold_paper`、`tower_of_hanoi`、`river_crossing`、`fence_shaper`、`visual_pattern`、`pizza_cuts`、`balance_lab`，然后 T2 从复用率高的开始（`scale_ladder`、`staircase_paths`、`bridges_trace`）。
Week 3：剩余 T2；T3 视时间。
