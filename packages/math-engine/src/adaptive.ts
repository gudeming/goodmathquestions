export type MasteryDomain =
  | "ARITHMETIC"
  | "ALGEBRA"
  | "GEOMETRY"
  | "FRACTIONS"
  | "NUMBER_THEORY"
  | "PROBABILITY"
  | "STATISTICS"
  | "TRIGONOMETRY"
  | "CALCULUS"
  | "WORD_PROBLEMS";

export interface MasteryProfile {
  accuracy: number; // 0..1
  avgTimeMs: number;
  streak: number;
  level: number; // 1..5
}

export interface AdaptiveQuestion {
  promptEn: string;
  promptZh: string;
  answer: string;
  hints: Array<{ en: string; zh: string }>;
  explanationEn: string;
  explanationZh: string;
  funFactEn?: string;
  funFactZh?: string;
  domain: MasteryDomain;
  knowledgePointSlug: string;
  level: number;
}

export interface KnowledgePointDef {
  slug: string;
  domain: MasteryDomain;
  nameEn: string;
  nameZh: string;
  minLevel: number;
  maxLevel: number;
}

export const KNOWLEDGE_POINT_TAXONOMY: KnowledgePointDef[] = [
  { slug: "addition-subtraction", domain: "ARITHMETIC", nameEn: "Addition & Subtraction", nameZh: "加减法", minLevel: 1, maxLevel: 2 },
  { slug: "multiplication", domain: "ARITHMETIC", nameEn: "Multiplication", nameZh: "乘法", minLevel: 3, maxLevel: 4 },
  { slug: "exponentiation", domain: "ARITHMETIC", nameEn: "Exponentiation", nameZh: "幂运算", minLevel: 5, maxLevel: 5 },
  { slug: "linear-equations-basic", domain: "ALGEBRA", nameEn: "Linear Equations (Basic)", nameZh: "一元一次方程(基础)", minLevel: 1, maxLevel: 2 },
  { slug: "linear-equations-multi", domain: "ALGEBRA", nameEn: "Linear Equations (Multi-step)", nameZh: "一元一次方程(进阶)", minLevel: 3, maxLevel: 4 },
  { slug: "quadratic-equations", domain: "ALGEBRA", nameEn: "Quadratic Equations", nameZh: "一元二次方程", minLevel: 5, maxLevel: 5 },
  { slug: "area-perimeter", domain: "GEOMETRY", nameEn: "Area & Perimeter", nameZh: "面积与周长", minLevel: 1, maxLevel: 2 },
  { slug: "pythagorean-theorem", domain: "GEOMETRY", nameEn: "Pythagorean Theorem", nameZh: "勾股定理", minLevel: 3, maxLevel: 5 },
  { slug: "same-denominator", domain: "FRACTIONS", nameEn: "Same Denominator", nameZh: "同分母分数", minLevel: 1, maxLevel: 3 },
  { slug: "different-denominator", domain: "FRACTIONS", nameEn: "Different Denominator", nameZh: "异分母分数", minLevel: 4, maxLevel: 5 },
  { slug: "gcd-lcm", domain: "NUMBER_THEORY", nameEn: "GCD & LCM", nameZh: "最大公约数与最小公倍数", minLevel: 1, maxLevel: 3 },
  { slug: "primality", domain: "NUMBER_THEORY", nameEn: "Primality Testing", nameZh: "质数判断", minLevel: 4, maxLevel: 5 },
  { slug: "basic-probability", domain: "PROBABILITY", nameEn: "Basic Probability", nameZh: "基础概率", minLevel: 1, maxLevel: 3 },
  { slug: "conditional-probability", domain: "PROBABILITY", nameEn: "Conditional Probability", nameZh: "条件概率", minLevel: 4, maxLevel: 5 },
  { slug: "mean", domain: "STATISTICS", nameEn: "Mean", nameZh: "平均数", minLevel: 1, maxLevel: 3 },
  { slug: "median", domain: "STATISTICS", nameEn: "Median", nameZh: "中位数", minLevel: 4, maxLevel: 5 },
  { slug: "special-angles", domain: "TRIGONOMETRY", nameEn: "Special Angles", nameZh: "特殊角", minLevel: 1, maxLevel: 3 },
  { slug: "soh-cah-toa", domain: "TRIGONOMETRY", nameEn: "SOH-CAH-TOA", nameZh: "三角函数比", minLevel: 4, maxLevel: 5 },
  { slug: "derivatives-power-rule", domain: "CALCULUS", nameEn: "Derivatives (Power Rule)", nameZh: "幂函数求导", minLevel: 1, maxLevel: 3 },
  { slug: "definite-integrals", domain: "CALCULUS", nameEn: "Definite Integrals", nameZh: "定积分", minLevel: 4, maxLevel: 5 },
  { slug: "distance-speed-time", domain: "WORD_PROBLEMS", nameEn: "Distance, Speed & Time", nameZh: "路程速度时间", minLevel: 1, maxLevel: 3 },
  { slug: "simple-interest", domain: "WORD_PROBLEMS", nameEn: "Simple Interest", nameZh: "单利计算", minLevel: 4, maxLevel: 5 },
];

// ─── Math Utilities ───────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num));
}

function pick<T>(items: readonly T[]): T {
  return items[randInt(0, items.length - 1)];
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) { const t = y; y = x % y; x = t; }
  return x;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

function reduceFraction(num: number, den: number): [number, number] {
  if (den === 0) return [num, den];
  if (num === 0) return [0, 1];
  const sign = den < 0 ? -1 : 1;
  const g = gcd(num, den);
  return [(num / g) * sign, (den / g) * sign];
}

function fractionString(num: number, den: number): string {
  const [sn, sd] = reduceFraction(num, den);
  if (sd === 1) return String(sn);
  return `${sn}/${sd}`;
}

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

// ─── Domain Inference ─────────────────────────────────────────────────────────

export function inferDomainFromTag(tagName: string): MasteryDomain {
  const t = tagName.toLowerCase();
  if (t.includes("trig") || t.includes("triangle") || t.includes("sin") || t.includes("cos")) return "TRIGONOMETRY";
  if (t.includes("calc") || t.includes("derivative") || t.includes("integral") || t.includes("limit")) return "CALCULUS";
  if (t.includes("stat") || t.includes("data") || t.includes("mean") || t.includes("ap-stats")) return "STATISTICS";
  if (t.includes("prob") || t.includes("chance")) return "PROBABILITY";
  if (t.includes("fraction") || t.includes("ratio")) return "FRACTIONS";
  if (t.includes("number") || t.includes("prime") || t.includes("factor")) return "NUMBER_THEORY";
  if (t.includes("geo") || t.includes("shape") || t.includes("angle")) return "GEOMETRY";
  if (t.includes("word") || t.includes("real") || t.includes("story")) return "WORD_PROBLEMS";
  if (t.includes("alg") || t.includes("equation") || t.includes("function") || t.includes("ccss-hsa") || t.includes("ccss-hsf")) return "ALGEBRA";
  return "ARITHMETIC";
}

// ─── Level Recommendation ─────────────────────────────────────────────────────
// Fixed: max +1 per call to avoid jarring 2-level jumps.
// Promote: high accuracy + speed, OR sustained streak.
// Demote: persistently low accuracy, OR very slow AND inaccurate.

export function recommendNextLevel(profile: MasteryProfile): number {
  let level = clamp(Math.round(profile.level), 1, 5);

  const highAccuracy = profile.accuracy >= 0.82;
  const fastEnough   = profile.avgTimeMs > 0 && profile.avgTimeMs <= 28000;
  const hotStreak    = profile.streak >= 4;

  if ((highAccuracy && fastEnough) || (profile.accuracy >= 0.90 && hotStreak)) {
    level += 1;
  } else if (profile.accuracy <= 0.45 || (profile.accuracy <= 0.58 && profile.avgTimeMs >= 60000)) {
    level -= 1;
  }

  return clamp(level, 1, 5);
}

// ─── ARITHMETIC ───────────────────────────────────────────────────────────────

function buildArithmetic(level: number): AdaptiveQuestion {
  if (level <= 2) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const a = randInt(36, 99); const b = randInt(18, 89); const total = a + b;
        return {
          promptEn: `At the school charity fair, Class A sold ${a} tickets in round 1 and ${b} in round 2. How many tickets in total?`,
          promptZh: `学校义卖活动中，A班第一轮卖出 ${a} 张票，第二轮卖出 ${b} 张。总共卖出多少张？`,
          answer: String(total),
          hints: [
            { en: "Add tens first: how much from the tens digits?", zh: "先加十位：两个数的十位相加是多少？" },
            { en: "Now add the ones digits. Did you need to carry?", zh: "再加个位，是否需要进位？" },
          ],
          explanationEn: `${a} + ${b} = ${total}. Tip: add tens before ones to reduce carry errors.`,
          explanationZh: `${a} + ${b} = ${total}。技巧：先加十位再加个位，减少进位失误。`,
          domain: "ARITHMETIC", knowledgePointSlug: "addition-subtraction", level,
        };
      },
      () => {
        const start = randInt(70, 160); const left = randInt(12, 55); const remain = start - left;
        return {
          promptEn: `A game starts with ${start} energy points. You spend ${left} on a power-up. How many remain?`,
          promptZh: `游戏初始有 ${start} 点能量，使用道具消耗了 ${left} 点。还剩多少点？`,
          answer: String(remain),
          hints: [
            { en: "Subtraction model: remaining = total − used.", zh: "【剩余】模型：剩余 = 总量 − 用掉。" },
            { en: "Check by adding back: remain + spent should equal start.", zh: "验证：剩余 + 花掉 应等于初始值。" },
          ],
          explanationEn: `${start} − ${left} = ${remain}. Checking: ${remain} + ${left} = ${start} ✓`,
          explanationZh: `${start} − ${left} = ${remain}。验算：${remain} + ${left} = ${start} ✓`,
          domain: "ARITHMETIC", knowledgePointSlug: "addition-subtraction", level,
        };
      },
      () => {
        const redPoints = randInt(20, 60); const bluePoints = randInt(30, 80);
        const total = redPoints + bluePoints;
        return {
          promptEn: `In a basketball game, the red team scored ${redPoints} points and the blue team scored ${bluePoints}. Combined total?`,
          promptZh: `篮球比赛中，红队得了 ${redPoints} 分，蓝队得了 ${bluePoints} 分。两队合计得分是多少？`,
          answer: String(total),
          hints: [
            { en: "Line them up by place value before adding.", zh: "按数位对齐后再相加。" },
            { en: "Try rounding both to the nearest 10 to estimate first.", zh: "先把两数各凑整到10，估算大致范围。" },
          ],
          explanationEn: `${redPoints} + ${bluePoints} = ${total}. Estimation: ~${Math.round(redPoints/10)*10} + ~${Math.round(bluePoints/10)*10} = ${Math.round(redPoints/10)*10+Math.round(bluePoints/10)*10} ≈ ${total} ✓`,
          explanationZh: `${redPoints} + ${bluePoints} = ${total}。估算：约${Math.round(redPoints/10)*10} + 约${Math.round(bluePoints/10)*10} ≈ ${total} ✓`,
          domain: "ARITHMETIC", knowledgePointSlug: "addition-subtraction", level,
        };
      },
      () => {
        const collected = randInt(150, 400); const given = randInt(30, 100); const kept = collected - given;
        return {
          promptEn: `You collected ${collected} coins in a dungeon, then gave ${given} to a friend. How many do you keep?`,
          promptZh: `你在地下城收集了 ${collected} 枚金币，送给朋友 ${given} 枚。你还有多少枚？`,
          answer: String(kept),
          hints: [
            { en: "This is a 'take away' situation: start − give = keep.", zh: "【送出】情境：剩余 = 初始 − 送出。" },
            { en: "Subtract ones digit first, then tens, then hundreds.", zh: "先减个位，再减十位，再减百位。" },
          ],
          explanationEn: `${collected} − ${given} = ${kept}. Always read the question to decide + or −.`,
          explanationZh: `${collected} − ${given} = ${kept}。先判断题目是"合并"还是"去掉"，再选运算。`,
          domain: "ARITHMETIC", knowledgePointSlug: "addition-subtraction", level,
        };
      },
      () => {
        const morning = randInt(50, 200); const afternoon = randInt(80, 300);
        const evening = randInt(40, 150); const total = morning + afternoon + evening;
        return {
          promptEn: `A content creator got ${morning} views in the morning, ${afternoon} in the afternoon, ${evening} in the evening. Total views?`,
          promptZh: `某创作者早上获得 ${morning} 次播放，下午 ${afternoon} 次，晚上 ${evening} 次。当天总播放量是多少？`,
          answer: String(total),
          hints: [
            { en: "Add the first two, then add the third.", zh: "先加前两个数，再加第三个。" },
            { en: "Look for pairs that add to a round number (like 100 or 50).", zh: "找能凑成整十整百的搭档，顺序加更快。" },
          ],
          explanationEn: `${morning} + ${afternoon} + ${evening} = ${total}. Adding in smart order can reduce mistakes.`,
          explanationZh: `${morning} + ${afternoon} + ${evening} = ${total}。利用结合律，找整数搭档加起来更顺。`,
          domain: "ARITHMETIC", knowledgePointSlug: "addition-subtraction", level,
        };
      },
    ];
    return pick(templates)();
  }

  if (level <= 4) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const rows = randInt(12, 28); const cols = randInt(11, 26); const ans = rows * cols;
        return {
          promptEn: `A pixel-art grid has ${rows} rows and ${cols} columns. How many pixels in total?`,
          promptZh: `像素画板有 ${rows} 行、${cols} 列，总像素数量是多少？`,
          answer: String(ans),
          hints: [
            { en: "Think of it as an array: total = rows × columns.", zh: "把它想成阵列：总数 = 行数 × 列数。" },
            { en: "Try breaking one factor: e.g. ${rows} × ${cols} = ${rows} × (${Math.ceil(cols/10)*10} − ${Math.ceil(cols/10)*10-cols}).", zh: "拆分法：把其中一个因数拆成整十再乘。" },
          ],
          explanationEn: `${rows} × ${cols} = ${ans}. Array model: every row has the same number of pixels.`,
          explanationZh: `${rows} × ${cols} = ${ans}。阵列模型：每行像素数相同，直接乘。`,
          domain: "ARITHMETIC", knowledgePointSlug: "multiplication", level,
        };
      },
      () => {
        const boxes = randInt(15, 36); const each = randInt(8, 19); const bonus = randInt(20, 75);
        const ans = boxes * each + bonus;
        return {
          promptEn: `A club packs ${boxes} gift boxes, each with ${each} stickers, then adds ${bonus} extra stickers on top. Total stickers?`,
          promptZh: `社团装了 ${boxes} 盒礼物，每盒 ${each} 张贴纸，额外又补充了 ${bonus} 张。总贴纸数是多少？`,
          answer: String(ans),
          hints: [
            { en: "Step 1: multiply for the boxes. Step 2: add the bonus.", zh: "第一步算盒子里的，第二步加额外的。" },
            { en: "Careful with order of operations: multiplication before addition.", zh: "记住先乘后加的运算顺序。" },
          ],
          explanationEn: `${boxes} × ${each} + ${bonus} = ${boxes * each} + ${bonus} = ${ans}.`,
          explanationZh: `${boxes} × ${each} + ${bonus} = ${boxes * each} + ${bonus} = ${ans}。`,
          domain: "ARITHMETIC", knowledgePointSlug: "multiplication", level,
        };
      },
      () => {
        const priceEach = randInt(3, 15); const qty = randInt(12, 40); const discount = randInt(5, 30);
        const ans = priceEach * qty - discount;
        return {
          promptEn: `A school store sells pencils at $${priceEach} each. You buy ${qty} pencils and get a $${discount} discount. Total cost?`,
          promptZh: `学校小卖部铅笔每支 $${priceEach}，你买了 ${qty} 支并享受 $${discount} 折扣。实际花了多少？`,
          answer: String(ans),
          hints: [
            { en: "First calculate the full price, then subtract the discount.", zh: "先算定价总额，再减去折扣。" },
            { en: "Multiplication first, then subtraction.", zh: "先乘后减，顺序别搞反。" },
          ],
          explanationEn: `${priceEach} × ${qty} − ${discount} = ${priceEach * qty} − ${discount} = ${ans}.`,
          explanationZh: `${priceEach} × ${qty} − ${discount} = ${priceEach * qty} − ${discount} = ${ans}。`,
          domain: "ARITHMETIC", knowledgePointSlug: "multiplication", level,
        };
      },
      () => {
        const rows = randInt(8, 20); const cols = randInt(10, 25); const empty = randInt(3, 15);
        const ans = rows * cols - empty;
        return {
          promptEn: `A cinema has ${rows} rows of ${cols} seats, but ${empty} seats are broken. How many usable seats?`,
          promptZh: `电影院有 ${rows} 排、每排 ${cols} 个座位，其中 ${empty} 个坏了。可用座位有多少？`,
          answer: String(ans),
          hints: [
            { en: "Total seats = rows × columns.", zh: "先算总座位数：排数 × 每排座位数。" },
            { en: "Subtract the broken ones from the total.", zh: "再减去坏了的座位数。" },
          ],
          explanationEn: `${rows} × ${cols} − ${empty} = ${rows * cols} − ${empty} = ${ans}.`,
          explanationZh: `${rows} × ${cols} − ${empty} = ${rows * cols} − ${empty} = ${ans}。`,
          domain: "ARITHMETIC", knowledgePointSlug: "multiplication", level,
        };
      },
    ];
    return pick(templates)();
  }

  // Level 5: exponentiation
  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const base = randInt(2, 8); const exp = randInt(3, 5); const ans = base ** exp;
      return {
        promptEn: `A viral post doubles view count by a factor of ${base} each round for ${exp} rounds. Evaluate ${base}^${exp}.`,
        promptZh: `某帖子每轮传播量是上一轮的 ${base} 倍，经历了 ${exp} 轮。计算 ${base}^${exp}。`,
        answer: String(ans),
        hints: [
          { en: "Write out the product: " + Array(exp).fill(base).join(" × "), zh: "把连乘展开：" + Array(exp).fill(base).join(" × ") },
          { en: "Compute step by step, don't skip directly to the answer.", zh: "一步步累乘，不要跳跃计算。" },
        ],
        explanationEn: `${base}^${exp} = ${Array(exp).fill(base).join(" × ")} = ${ans}. Exponential growth is much faster than linear.`,
        explanationZh: `${base}^${exp} = ${Array(exp).fill(base).join(" × ")} = ${ans}。指数增长远快于线性增长。`,
        domain: "ARITHMETIC", knowledgePointSlug: "exponentiation", level,
      };
    },
    () => {
      const base = randInt(3, 9); const exp = randInt(2, 4); const scale = randInt(2, 5);
      const ans = scale * base ** exp;
      return {
        promptEn: `A game score formula is ${scale} × ${base}^${exp}. Compute its value.`,
        promptZh: `游戏得分公式为 ${scale} × ${base}^${exp}，求该值。`,
        answer: String(ans),
        hints: [
          { en: "Power of operations: evaluate the exponent part first.", zh: "运算顺序：先算指数部分。" },
          { en: `${base}^${exp} = ${base ** exp}, then multiply by ${scale}.`, zh: `${base}^${exp} = ${base ** exp}，再乘以 ${scale}。` },
        ],
        explanationEn: `${scale} × ${base}^${exp} = ${scale} × ${base ** exp} = ${ans}. Powers come before multiplication in order of operations.`,
        explanationZh: `${scale} × ${base}^${exp} = ${scale} × ${base ** exp} = ${ans}。在运算顺序中，幂运算先于乘法。`,
        domain: "ARITHMETIC", knowledgePointSlug: "exponentiation", level,
      };
    },
    () => {
      const base = randInt(2, 5); const exp = randInt(3, 6); const ans = base ** exp;
      return {
        promptEn: `Bacteria in a dish double every hour starting from 1 cell. There are ${base} types of mutation — after ${exp} generations, each type has ${base}^${exp} variations. What is ${base}^${exp}?`,
        promptZh: `某细菌有 ${base} 种变异类型，经过 ${exp} 代后每种产生 ${base}^${exp} 个变体。${base}^${exp} 等于多少？`,
        answer: String(ans),
        hints: [
          { en: `Break it down: ${base}^${Math.floor(exp/2)} = ${base**Math.floor(exp/2)}, then square/extend.`, zh: `分步：${base}^${Math.floor(exp/2)} = ${base**Math.floor(exp/2)}，再继续乘。` },
          { en: "Exponent tells you how many times to multiply the base by itself.", zh: "指数告诉你底数自乘几次。" },
        ],
        explanationEn: `${base}^${exp} = ${ans}. Real-world exponential examples: cell division, compound growth.`,
        explanationZh: `${base}^${exp} = ${ans}。现实中的指数：细胞分裂、复利增长都是指数模型。`,
        domain: "ARITHMETIC", knowledgePointSlug: "exponentiation", level,
      };
    },
  ];
  return pick(templates)();
}

// ─── ALGEBRA ──────────────────────────────────────────────────────────────────

function buildAlgebra(level: number): AdaptiveQuestion {
  if (level <= 2) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const x = randInt(4, 21); const k = randInt(3, 12);
        return {
          promptEn: `A piggy bank has x coins. After adding ${k} more coins, there are ${x + k} total. Find x.`,
          promptZh: `存钱罐里有 x 枚硬币，再放入 ${k} 枚后共有 ${x + k} 枚。求 x。`,
          answer: String(x),
          hints: [
            { en: `Both sides are equal: x + ${k} = ${x + k}. To isolate x, subtract ${k} from both sides.`, zh: `方程两边相等：x + ${k} = ${x + k}。要求 x，两边同时减去 ${k}。` },
            { en: `x = ${x + k} − ${k} = ?`, zh: `x = ${x + k} − ${k} = ?` },
          ],
          explanationEn: `x + ${k} = ${x + k}  →  x = ${x + k} − ${k} = ${x}.`,
          explanationZh: `x + ${k} = ${x + k}  →  x = ${x + k} − ${k} = ${x}。`,
          domain: "ALGEBRA", knowledgePointSlug: "linear-equations-basic", level,
        };
      },
      () => {
        const x = randInt(6, 24); const k = randInt(2, 8);
        return {
          promptEn: `A leaderboard shows x − ${k} = ${x - k}. What is the original score x?`,
          promptZh: `排行榜显示 x − ${k} = ${x - k}，x 的原始分数是多少？`,
          answer: String(x),
          hints: [
            { en: `Subtraction is the opposite of addition. Add ${k} to both sides.`, zh: `减法的逆运算是加法。两边同时加 ${k}。` },
            { en: `x = ${x - k} + ${k} = ?`, zh: `x = ${x - k} + ${k} = ?` },
          ],
          explanationEn: `x − ${k} = ${x - k}  →  x = ${x}.`,
          explanationZh: `x − ${k} = ${x - k}  →  x = ${x}。`,
          domain: "ALGEBRA", knowledgePointSlug: "linear-equations-basic", level,
        };
      },
      () => {
        const x = randInt(5, 20); const k = randInt(2, 7); const total = x * k;
        return {
          promptEn: `Each of ${k} friends brings the same number of snacks. Together they have ${total}. How many did each bring?`,
          promptZh: `${k} 位朋友各带了相同数量的零食，共 ${total} 份。每人带了几份？`,
          answer: String(x),
          hints: [
            { en: `Write it as: ${k} × x = ${total}. To find x, divide both sides by ${k}.`, zh: `写成方程：${k} × x = ${total}。两边除以 ${k} 求解 x。` },
            { en: `x = ${total} ÷ ${k} = ?`, zh: `x = ${total} ÷ ${k} = ?` },
          ],
          explanationEn: `${k}x = ${total}  →  x = ${total} ÷ ${k} = ${x}.`,
          explanationZh: `${k}x = ${total}  →  x = ${total} ÷ ${k} = ${x}。`,
          domain: "ALGEBRA", knowledgePointSlug: "linear-equations-basic", level,
        };
      },
      () => {
        const x = randInt(8, 30); const add = randInt(5, 20);
        return {
          promptEn: `A plant is x cm tall. In one week it grows ${add} cm more and reaches ${x + add} cm. Find x.`,
          promptZh: `一棵植物高 x 厘米，一周后长高了 ${add} 厘米，变为 ${x + add} 厘米。求 x。`,
          answer: String(x),
          hints: [
            { en: "Set up: x + growth = final height.", zh: "建立方程：x + 生长量 = 最终高度。" },
            { en: `Subtract ${add} from both sides: x = ${x + add} − ${add}.`, zh: `两边减去 ${add}：x = ${x + add} − ${add}。` },
          ],
          explanationEn: `x + ${add} = ${x + add}  →  x = ${x}.`,
          explanationZh: `x + ${add} = ${x + add}  →  x = ${x}。`,
          domain: "ALGEBRA", knowledgePointSlug: "linear-equations-basic", level,
        };
      },
    ];
    return pick(templates)();
  }

  if (level <= 4) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const x = randInt(3, 15); const a = randInt(2, 9); const b = randInt(4, 20); const rhs = a * x + b;
        return {
          promptEn: `A vending machine charges ${a} coins per item plus a ${b}-coin service fee. You spent ${rhs} coins total. How many items did you buy?`,
          promptZh: `自动售货机每件商品收 ${a} 枚硬币，另加 ${b} 枚服务费。你共花了 ${rhs} 枚。买了几件？`,
          answer: String(x),
          hints: [
            { en: `Write: ${a}x + ${b} = ${rhs}. First subtract ${b} from both sides.`, zh: `建立方程：${a}x + ${b} = ${rhs}。先两边减去 ${b}。` },
            { en: `Now divide both sides by ${a}: x = ${rhs - b} ÷ ${a}.`, zh: `再两边除以 ${a}：x = ${rhs - b} ÷ ${a}。` },
          ],
          explanationEn: `${a}x + ${b} = ${rhs}  →  ${a}x = ${rhs - b}  →  x = ${x}.`,
          explanationZh: `${a}x + ${b} = ${rhs}  →  ${a}x = ${rhs - b}  →  x = ${x}。`,
          domain: "ALGEBRA", knowledgePointSlug: "linear-equations-multi", level,
        };
      },
      () => {
        const x = randInt(2, 16); const leftDen = randInt(2, 9); const rightNum = randInt(2, 9); const rightDen = randInt(2, 9);
        const numerator = x * rightNum; const denominator = leftDen * rightDen;
        const [sn, sd] = reduceFraction(numerator, denominator);
        return {
          promptEn: `Solve the proportion: x / ${leftDen} = ${rightNum} / ${rightDen}.`,
          promptZh: `解比例方程：x / ${leftDen} = ${rightNum} / ${rightDen}。`,
          answer: String(x),
          hints: [
            { en: "Cross-multiply: x × (right denominator) = (right numerator) × (left denominator).", zh: "交叉相乘：x × 右分母 = 右分子 × 左分母。" },
            { en: `So: x × ${rightDen} = ${rightNum} × ${leftDen} = ${rightNum * leftDen}. Now divide by ${rightDen}.`, zh: `所以：x × ${rightDen} = ${rightNum} × ${leftDen} = ${rightNum * leftDen}，再除以 ${rightDen}。` },
          ],
          explanationEn: `x / ${leftDen} = ${rightNum} / ${rightDen}  →  x = ${leftDen} × ${rightNum} / ${rightDen} = ${x}.`,
          explanationZh: `x / ${leftDen} = ${rightNum} / ${rightDen}  →  x = ${leftDen} × ${rightNum} / ${rightDen} = ${x}。`,
          domain: "ALGEBRA", knowledgePointSlug: "linear-equations-multi", level,
        };
      },
      () => {
        const x = randInt(4, 18); const a = randInt(2, 6); const b = randInt(3, 15); const c = randInt(2, 8);
        const rhs = a * x - b + c;
        return {
          promptEn: `An equation: ${a}x − ${b} + ${c} = ${rhs}. Solve for x.`,
          promptZh: `方程：${a}x − ${b} + ${c} = ${rhs}，求 x。`,
          answer: String(x),
          hints: [
            { en: `Combine constants on the right: ${rhs} + ${b} − ${c} = ${rhs + b - c}.`, zh: `右边整理常数：${rhs} + ${b} − ${c} = ${rhs + b - c}。` },
            { en: `Now solve: ${a}x = ${rhs + b - c}  →  x = ?`, zh: `然后求解：${a}x = ${rhs + b - c}  →  x = ?` },
          ],
          explanationEn: `${a}x = ${rhs + b - c}  →  x = ${x}.`,
          explanationZh: `${a}x = ${rhs + b - c}  →  x = ${x}。`,
          domain: "ALGEBRA", knowledgePointSlug: "linear-equations-multi", level,
        };
      },
      () => {
        const x = randInt(3, 20); const a = randInt(2, 5); const b = randInt(1, 6); const c = randInt(1, 5);
        const rhs = a * x + b * x + c;
        return {
          promptEn: `Solve: ${a}x + ${b}x + ${c} = ${rhs}.`,
          promptZh: `求解：${a}x + ${b}x + ${c} = ${rhs}。`,
          answer: String(x),
          hints: [
            { en: `Combine like terms first: ${a}x + ${b}x = (${a + b})x.`, zh: `先合并同类项：${a}x + ${b}x = (${a + b})x。` },
            { en: `Then: (${a + b})x = ${rhs - c}  →  x = ?`, zh: `然后：(${a + b})x = ${rhs - c}  →  x = ?` },
          ],
          explanationEn: `(${a + b})x + ${c} = ${rhs}  →  (${a + b})x = ${rhs - c}  →  x = ${x}.`,
          explanationZh: `(${a + b})x + ${c} = ${rhs}  →  (${a + b})x = ${rhs - c}  →  x = ${x}。`,
          domain: "ALGEBRA", knowledgePointSlug: "linear-equations-multi", level,
        };
      },
    ];
    return pick(templates)();
  }

  // Level 5: quadratics
  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const r1 = randInt(2, 9); const r2 = randInt(10, 18);
      const b = -(r1 + r2); const c = r1 * r2;
      return {
        promptEn: `Solve x² ${b < 0 ? "−" : "+"} ${Math.abs(b)}x + ${c} = 0. Enter the larger root.`,
        promptZh: `解方程 x² ${b < 0 ? "−" : "+"} ${Math.abs(b)}x + ${c} = 0，输入较大的根。`,
        answer: String(r2),
        hints: [
          { en: `Find two numbers whose sum is ${-b} and product is ${c}.`, zh: `找两个数：和为 ${-b}，积为 ${c}。` },
          { en: `They are ${r1} and ${r2}. So (x − ${r1})(x − ${r2}) = 0.`, zh: `答案是 ${r1} 和 ${r2}，即 (x − ${r1})(x − ${r2}) = 0。` },
        ],
        explanationEn: `Roots are ${r1} and ${r2}. Larger root = ${r2}. Factoring works when you spot the sum/product pair.`,
        explanationZh: `方程的根是 ${r1} 和 ${r2}，较大根 = ${r2}。找到"和与积"就能快速因式分解。`,
        domain: "ALGEBRA", knowledgePointSlug: "quadratic-equations", level,
      };
    },
    () => {
      const shift = randInt(1, 7); const c = shift * shift;
      const larger = shift + Math.sqrt(c);
      return {
        promptEn: `Solve (x − ${shift})² = ${c}. Enter the larger solution.`,
        promptZh: `解方程 (x − ${shift})² = ${c}，输入较大的解。`,
        answer: String(larger),
        hints: [
          { en: `Take square roots: x − ${shift} = ±√${c} = ±${Math.sqrt(c)}.`, zh: `两边开方：x − ${shift} = ±√${c} = ±${Math.sqrt(c)}。` },
          { en: `Add ${shift}: x = ${shift} + ${Math.sqrt(c)} or x = ${shift} − ${Math.sqrt(c)}.`, zh: `移项：x = ${shift} + ${Math.sqrt(c)} 或 x = ${shift} − ${Math.sqrt(c)}。` },
        ],
        explanationEn: `x = ${shift} ± ${Math.sqrt(c)}, so x = ${shift - Math.sqrt(c)} or ${shift + Math.sqrt(c)}. Larger = ${larger}. Square-root form is faster than expanding then factoring.`,
        explanationZh: `x = ${shift} ± ${Math.sqrt(c)}，较大解 = ${larger}。平方形式有时比展开后因式分解更直接。`,
        domain: "ALGEBRA", knowledgePointSlug: "quadratic-equations", level,
      };
    },
    () => {
      const r1 = randInt(1, 7); const r2 = randInt(1, 7);
      const bCoef = r1 + r2; const cCoef = r1 * r2;
      return {
        promptEn: `A ball thrown upward follows x² − ${bCoef}x + ${cCoef} = 0. Find both times it's at ground level (sum of roots).`,
        promptZh: `一个抛出的球按 x² − ${bCoef}x + ${cCoef} = 0 飞行。求两次落地时刻之和（两根之和）。`,
        answer: String(bCoef),
        hints: [
          { en: "By Vieta's formulas, sum of roots = b coefficient (with sign flipped).", zh: "韦达定理：两根之和 = 方程 b 项系数取反。" },
          { en: `For x² − ${bCoef}x + ${cCoef} = 0, sum = ${bCoef}.`, zh: `对 x² − ${bCoef}x + ${cCoef} = 0，两根之和 = ${bCoef}。` },
        ],
        explanationEn: `Roots are ${r1} and ${r2}. Sum = ${r1} + ${r2} = ${bCoef}. Vieta: sum of roots = −(b/a).`,
        explanationZh: `方程的根是 ${r1} 和 ${r2}，和 = ${bCoef}。韦达定理：两根之和 = −(b/a)。`,
        domain: "ALGEBRA", knowledgePointSlug: "quadratic-equations", level,
      };
    },
  ];
  return pick(templates)();
}

// ─── GEOMETRY ─────────────────────────────────────────────────────────────────

function buildGeometry(level: number): AdaptiveQuestion {
  if (level <= 2) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const l = randInt(5, 16); const w = randInt(4, 12); const ans = l * w;
        return {
          promptEn: `A classroom whiteboard is ${l} m long and ${w} m wide. What is its area?`,
          promptZh: `教室白板长 ${l} 米、宽 ${w} 米。白板面积是多少平方米？`,
          answer: String(ans),
          hints: [
            { en: "Rectangle area = length × width.", zh: "长方形面积 = 长 × 宽。" },
            { en: "Area is in square units (m²), not linear units (m).", zh: "面积单位是平方米，不是米。" },
          ],
          explanationEn: `A = ${l} × ${w} = ${ans} m². Area measures how much surface is covered.`,
          explanationZh: `A = ${l} × ${w} = ${ans} 平方米。面积表示平面的覆盖量。`,
          domain: "GEOMETRY", knowledgePointSlug: "area-perimeter", level,
        };
      },
      () => {
        const l = randInt(4, 20); const w = randInt(3, 15); const ans = 2 * (l + w);
        return {
          promptEn: `A soccer field is ${l} m long and ${w} m wide. How much fencing is needed to go all the way around?`,
          promptZh: `足球场长 ${l} 米、宽 ${w} 米。围一圈需要多少米栏杆？`,
          answer: String(ans),
          hints: [
            { en: "Perimeter = all four sides added together.", zh: "周长 = 四条边加起来。" },
            { en: "For rectangles: P = 2 × (length + width).", zh: "长方形公式：P = 2 × (长 + 宽)。" },
          ],
          explanationEn: `P = 2 × (${l} + ${w}) = 2 × ${l + w} = ${ans} m.`,
          explanationZh: `P = 2 × (${l} + ${w}) = 2 × ${l + w} = ${ans} 米。`,
          domain: "GEOMETRY", knowledgePointSlug: "area-perimeter", level,
        };
      },
      () => {
        const b = randInt(6, 18); const h = randInt(4, 14); const ans = (b * h) / 2;
        return {
          promptEn: `A triangular garden has a base of ${b} m and a height of ${h} m. What is its area?`,
          promptZh: `一块三角形花园底边 ${b} 米、高 ${h} 米。面积是多少？`,
          answer: String(ans),
          hints: [
            { en: "Triangle area = (base × height) ÷ 2.", zh: "三角形面积 = (底 × 高) ÷ 2。" },
            { en: "A triangle is half of a rectangle with the same base and height.", zh: "三角形是同底高长方形面积的一半。" },
          ],
          explanationEn: `A = (${b} × ${h}) / 2 = ${b * h} / 2 = ${ans} m².`,
          explanationZh: `A = (${b} × ${h}) / 2 = ${b * h} / 2 = ${ans} 平方米。`,
          domain: "GEOMETRY", knowledgePointSlug: "area-perimeter", level,
        };
      },
      () => {
        const outerL = randInt(8, 15); const outerW = randInt(6, 12);
        const cutL = randInt(2, Math.max(2, outerL - 4)); const cutW = randInt(2, Math.max(2, outerW - 3));
        const ans = outerL * outerW - cutL * cutW;
        return {
          promptEn: `A stage is ${outerL}×${outerW} m, with a ${cutL}×${cutW} m square cutout removed. Remaining area?`,
          promptZh: `舞台地板 ${outerL}×${outerW} 米，中间去掉 ${cutL}×${cutW} 米的方形区域。剩余面积？`,
          answer: String(ans),
          hints: [
            { en: "Find the full area, then subtract the removed piece.", zh: "先算整体面积，再减去去掉的部分。" },
            { en: `Full: ${outerL} × ${outerW} = ${outerL * outerW}. Removed: ${cutL} × ${cutW} = ${cutL * cutW}.`, zh: `整体：${outerL} × ${outerW} = ${outerL * outerW}。去掉：${cutL} × ${cutW} = ${cutL * cutW}。` },
          ],
          explanationEn: `${outerL * outerW} − ${cutL * cutW} = ${ans} m². Decomposition: break complex shapes into simple parts.`,
          explanationZh: `${outerL * outerW} − ${cutL * cutW} = ${ans} 平方米。几何分解：把复杂图形拆成简单部分处理。`,
          domain: "GEOMETRY", knowledgePointSlug: "area-perimeter", level,
        };
      },
    ];
    return pick(templates)();
  }

  // Level 3+: Pythagorean Theorem
  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const a = randInt(3, 12); const b = randInt(4, 13); const c = Math.hypot(a, b);
      return {
        promptEn: `A rescue drone flies ${a} km east then ${b} km north. What is the straight-line distance back to start (2 decimals)?`,
        promptZh: `救援无人机先向东飞 ${a} km，再向北飞 ${b} km。到起点的直线距离是多少（保留2位小数）？`,
        answer: c.toFixed(2),
        hints: [
          { en: "The two legs of travel form a right angle, giving a right triangle.", zh: "两段行程互相垂直，构成直角三角形。" },
          { en: `Use c = √(${a}² + ${b}²) = √(${a * a} + ${b * b}).`, zh: `用 c = √(${a}² + ${b}²) = √(${a * a} + ${b * b})。` },
        ],
        explanationEn: `c = √(${a * a} + ${b * b}) = √${a * a + b * b} ≈ ${c.toFixed(2)} km.`,
        explanationZh: `c = √(${a * a} + ${b * b}) = √${a * a + b * b} ≈ ${c.toFixed(2)} km。`,
        domain: "GEOMETRY", knowledgePointSlug: "pythagorean-theorem", level,
      };
    },
    () => {
      const hyp = randInt(10, 20); const leg = randInt(6, hyp - 1);
      const other = Math.sqrt(hyp * hyp - leg * leg);
      return {
        promptEn: `In a right triangle, hypotenuse = ${hyp}, one leg = ${leg}. Find the other leg (2 decimals).`,
        promptZh: `直角三角形中，斜边 = ${hyp}，一条直角边 = ${leg}。求另一条直角边（保留2位小数）。`,
        answer: other.toFixed(2),
        hints: [
          { en: "Rearrange: missing² = hypotenuse² − known_leg².", zh: "变形：未知边² = 斜边² − 已知直角边²。" },
          { en: `= ${hyp}² − ${leg}² = ${hyp * hyp} − ${leg * leg} = ${hyp * hyp - leg * leg}.`, zh: `= ${hyp}² − ${leg}² = ${hyp * hyp} − ${leg * leg} = ${hyp * hyp - leg * leg}。` },
        ],
        explanationEn: `missing = √(${hyp * hyp} − ${leg * leg}) = √${hyp * hyp - leg * leg} ≈ ${other.toFixed(2)}.`,
        explanationZh: `未知边 = √(${hyp * hyp} − ${leg * leg}) = √${hyp * hyp - leg * leg} ≈ ${other.toFixed(2)}。`,
        domain: "GEOMETRY", knowledgePointSlug: "pythagorean-theorem", level,
      };
    },
    () => {
      const screenH = randInt(9, 16); const screenW = randInt(12, 22);
      const diag = Math.hypot(screenH, screenW);
      return {
        promptEn: `A monitor screen is ${screenH} inches tall and ${screenW} inches wide. What is its diagonal measurement (2 decimals)?`,
        promptZh: `显示器屏幕高 ${screenH} 英寸、宽 ${screenW} 英寸。对角线长度是多少（保留2位小数）？`,
        answer: diag.toFixed(2),
        hints: [
          { en: "The diagonal of a rectangle forms a right triangle with the two sides.", zh: "矩形的对角线与两边构成直角三角形。" },
          { en: `diagonal = √(height² + width²) = √(${screenH * screenH} + ${screenW * screenW}).`, zh: `对角线 = √(高² + 宽²) = √(${screenH * screenH} + ${screenW * screenW})。` },
        ],
        explanationEn: `Diagonal = √(${screenH * screenH + screenW * screenW}) ≈ ${diag.toFixed(2)} inches.`,
        explanationZh: `对角线 = √(${screenH * screenH + screenW * screenW}) ≈ ${diag.toFixed(2)} 英寸。`,
        domain: "GEOMETRY", knowledgePointSlug: "pythagorean-theorem", level,
      };
    },
    () => {
      const wallH = randInt(4, 12); const groundD = randInt(3, 8);
      const ladderLen = Math.hypot(wallH, groundD);
      return {
        promptEn: `A ladder leans against a wall. Its base is ${groundD} m from the wall and it reaches ${wallH} m up. How long is the ladder (2 decimals)?`,
        promptZh: `梯子底端距墙 ${groundD} 米，顶端靠墙高 ${wallH} 米。梯子有多长（保留2位小数）？`,
        answer: ladderLen.toFixed(2),
        hints: [
          { en: "Ladder, wall, and ground form a right triangle. Ladder = hypotenuse.", zh: "梯子、墙和地面构成直角三角形，梯子是斜边。" },
          { en: `hypotenuse = √(${wallH}² + ${groundD}²).`, zh: `斜边 = √(${wallH}² + ${groundD}²)。` },
        ],
        explanationEn: `Ladder = √(${wallH * wallH} + ${groundD * groundD}) = √${wallH * wallH + groundD * groundD} ≈ ${ladderLen.toFixed(2)} m.`,
        explanationZh: `梯子 = √(${wallH * wallH} + ${groundD * groundD}) = √${wallH * wallH + groundD * groundD} ≈ ${ladderLen.toFixed(2)} 米。`,
        domain: "GEOMETRY", knowledgePointSlug: "pythagorean-theorem", level,
      };
    },
  ];
  return pick(templates)();
}

// ─── FRACTIONS ────────────────────────────────────────────────────────────────

function buildFractions(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const den = randInt(4, 12); const a = randInt(1, den - 1); const b = randInt(1, den - a);
        const ans = fractionString(a + b, den);
        return {
          promptEn: `You read ${a}/${den} of a book on Monday and ${b}/${den} on Tuesday. What total fraction did you read? Simplify.`,
          promptZh: `周一读了一本书的 ${a}/${den}，周二读了 ${b}/${den}。总共读了多少？请化简。`,
          answer: ans,
          hints: [
            { en: "Same denominator: just add the numerators.", zh: "同分母分数：分子直接相加，分母不变。" },
            { en: `${a} + ${b} = ${a + b}. Then simplify ${a + b}/${den}.`, zh: `${a} + ${b} = ${a + b}，再化简 ${a + b}/${den}。` },
          ],
          explanationEn: `${a}/${den} + ${b}/${den} = ${a + b}/${den} = ${ans}.`,
          explanationZh: `${a}/${den} + ${b}/${den} = ${a + b}/${den} = ${ans}。`,
          domain: "FRACTIONS", knowledgePointSlug: "same-denominator", level,
        };
      },
      () => {
        const den = randInt(5, 12); const whole = randInt(20, 60); const num = randInt(1, den - 1);
        const ans = (whole * num) / den;
        return {
          promptEn: `A sports team completed ${num}/${den} of ${whole} drills. How many drills did they finish?`,
          promptZh: `运动队完成了 ${whole} 个训练中的 ${num}/${den}。完成了多少个训练？`,
          answer: String(ans),
          hints: [
            { en: `"${num}/${den} of ${whole}" means multiply: ${whole} × ${num}/${den}.`, zh: `"${whole} 的 ${num}/${den}" 表示乘法：${whole} × ${num}/${den}。` },
            { en: `Divide first: ${whole} ÷ ${den} = ${whole / den}, then × ${num}.`, zh: `先除以分母：${whole} ÷ ${den} = ${whole / den}，再乘分子 ${num}。` },
          ],
          explanationEn: `${whole} × ${num}/${den} = ${whole * num}/${den} = ${ans}.`,
          explanationZh: `${whole} × ${num}/${den} = ${whole * num}/${den} = ${ans}。`,
          domain: "FRACTIONS", knowledgePointSlug: "same-denominator", level,
        };
      },
      () => {
        const den = randInt(6, 15); const total = randInt(1, den - 1); const eaten = randInt(1, total);
        const left = total - eaten; const ans = fractionString(left, den);
        return {
          promptEn: `A pizza has ${den} slices. ${eaten} slices were eaten. What fraction of the pizza remains? Simplify.`,
          promptZh: `一个披萨分成 ${den} 块，已吃了 ${eaten} 块。还剩多少分数的披萨？请化简。`,
          answer: ans,
          hints: [
            { en: `Remaining slices = ${den} − ${eaten} = ${left}.`, zh: `剩余块数 = ${den} − ${eaten} = ${left}。` },
            { en: `Fraction remaining = ${left}/${den}. Simplify if possible.`, zh: `剩余分数 = ${left}/${den}，看是否可以约分。` },
          ],
          explanationEn: `${left}/${den} = ${ans}.`,
          explanationZh: `${left}/${den} = ${ans}。`,
          domain: "FRACTIONS", knowledgePointSlug: "same-denominator", level,
        };
      },
    ];
    return pick(templates)();
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const a = randInt(1, 8); const b = randInt(2, 10); const c = randInt(1, 8); const d = randInt(2, 10);
      const ans = fractionString(a * d + c * b, b * d);
      return {
        promptEn: `A smoothie recipe uses ${a}/${b} cup yogurt and ${c}/${d} cup milk. Total amount? Simplify.`,
        promptZh: `冰沙配方用了 ${a}/${b} 杯酸奶和 ${c}/${d} 杯牛奶。总量是多少？请化简。`,
        answer: ans,
        hints: [
          { en: "Different denominators: find a common denominator first.", zh: "分母不同，先通分找公分母。" },
          { en: `Common denominator = ${b} × ${d} = ${b * d}. Rewrite both fractions.`, zh: `公分母 = ${b} × ${d} = ${b * d}，把两个分数都改写成它。` },
        ],
        explanationEn: `${a}/${b} + ${c}/${d} = ${a * d}/${b * d} + ${c * b}/${b * d} = ${a * d + c * b}/${b * d} = ${ans}.`,
        explanationZh: `${a}/${b} + ${c}/${d} = ${a * d}/${b * d} + ${c * b}/${b * d} = ${a * d + c * b}/${b * d} = ${ans}。`,
        domain: "FRACTIONS", knowledgePointSlug: "different-denominator", level,
      };
    },
    () => {
      const num = randInt(2, 9); const den = randInt(num + 1, 12); const multiplier = randInt(2, 7);
      const ans = fractionString(num * multiplier, den);
      return {
        promptEn: `Scale ${num}/${den} by a factor of ${multiplier}. Give the simplified fraction.`,
        promptZh: `把 ${num}/${den} 放大 ${multiplier} 倍，结果写成最简分数。`,
        answer: ans,
        hints: [
          { en: "Multiply the numerator by the whole number.", zh: "分数乘整数：用分子乘这个整数。" },
          { en: `${num} × ${multiplier} = ${num * multiplier}. Fraction becomes ${num * multiplier}/${den}.`, zh: `${num} × ${multiplier} = ${num * multiplier}，分数变为 ${num * multiplier}/${den}。` },
        ],
        explanationEn: `${num}/${den} × ${multiplier} = ${num * multiplier}/${den} = ${ans}.`,
        explanationZh: `${num}/${den} × ${multiplier} = ${num * multiplier}/${den} = ${ans}。`,
        domain: "FRACTIONS", knowledgePointSlug: "different-denominator", level,
      };
    },
    () => {
      const a = randInt(2, 7); const b = randInt(3, 11); const c = randInt(1, a - 1);
      const ans = fractionString(a * b - c * b, b * b);
      return {
        promptEn: `Subtract ${c}/${b} from ${a}/${b}. Give simplified result.`,
        promptZh: `计算 ${a}/${b} − ${c}/${b}，化简结果。`,
        answer: fractionString(a - c, b),
        hints: [
          { en: "Same denominator: subtract numerators directly.", zh: "同分母：分子直接相减，分母不变。" },
          { en: `${a} − ${c} = ${a - c}. Result: ${a - c}/${b}. Can it be simplified?`, zh: `${a} − ${c} = ${a - c}，结果为 ${a - c}/${b}，可以约分吗？` },
        ],
        explanationEn: `${a}/${b} − ${c}/${b} = ${a - c}/${b} = ${fractionString(a - c, b)}.`,
        explanationZh: `${a}/${b} − ${c}/${b} = ${a - c}/${b} = ${fractionString(a - c, b)}。`,
        domain: "FRACTIONS", knowledgePointSlug: "different-denominator", level,
      };
    },
  ];
  return pick(templates)();
}

// ─── NUMBER THEORY ────────────────────────────────────────────────────────────

function buildNumberTheory(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const a = randInt(24, 84); const b = randInt(24, 84); const g = gcd(a, b);
        return {
          promptEn: `Two light signals blink every ${a}s and ${b}s. Their greatest common interval is gcd(${a}, ${b}). Find it.`,
          promptZh: `两个信号灯分别每 ${a} 秒和 ${b} 秒闪烁一次。它们最大的公共间隔是 gcd(${a}, ${b})，求该值。`,
          answer: String(g),
          hints: [
            { en: `Use the Euclidean algorithm: gcd(${a}, ${b}) = gcd(${b}, ${a % b})…`, zh: `欧几里得算法：gcd(${a}, ${b}) = gcd(${b}, ${a % b})……` },
            { en: "GCD is the largest number that divides both evenly.", zh: "GCD 是能同时整除两数的最大整数。" },
          ],
          explanationEn: `gcd(${a}, ${b}) = ${g}. GCD gives the largest shared unit between two quantities.`,
          explanationZh: `gcd(${a}, ${b}) = ${g}。GCD 表示两个量能共用的最大单位。`,
          domain: "NUMBER_THEORY", knowledgePointSlug: "gcd-lcm", level,
        };
      },
      () => {
        const a = randInt(6, 16); const b = randInt(8, 20); const ans = lcm(a, b);
        return {
          promptEn: `A bus arrives every ${a} minutes and a train every ${b} minutes. After how many minutes do they arrive at the same time again?`,
          promptZh: `公交每 ${a} 分钟一班，列车每 ${b} 分钟一班。再次同时到站要过多少分钟？`,
          answer: String(ans),
          hints: [
            { en: "You need the LCM (Least Common Multiple), not GCD.", zh: "这是最小公倍数（LCM）问题，不是最大公约数。" },
            { en: `lcm(${a}, ${b}) = ${a} × ${b} ÷ gcd(${a}, ${b}) = ${a * b} ÷ ${gcd(a, b)}.`, zh: `lcm(${a}, ${b}) = ${a} × ${b} ÷ gcd(${a}, ${b}) = ${a * b} ÷ ${gcd(a, b)}。` },
          ],
          explanationEn: `lcm(${a}, ${b}) = ${ans}. LCM finds the first future moment two events coincide.`,
          explanationZh: `lcm(${a}, ${b}) = ${ans}。LCM 描述两个周期事件"下一次同时发生"的时刻。`,
          domain: "NUMBER_THEORY", knowledgePointSlug: "gcd-lcm", level,
        };
      },
      () => {
        const a = randInt(12, 48); const b = randInt(12, 48); const g = gcd(a, b);
        return {
          promptEn: `You have ${a} red tiles and ${b} blue tiles. What is the largest square size (side length) you can tile using all of them with no leftover?`,
          promptZh: `你有 ${a} 块红砖和 ${b} 块蓝砖，想用全部砖块铺一个正方形区域且不浪费。正方形边长最大是多少？`,
          answer: String(g),
          hints: [
            { en: "The side length must divide into both ${a} and ${b} evenly.", zh: "边长必须能同时整除 ${a} 和 ${b}。" },
            { en: `The largest such number is gcd(${a}, ${b}).`, zh: `最大的这样的数就是 gcd(${a}, ${b})。` },
          ],
          explanationEn: `gcd(${a}, ${b}) = ${g}. This is the largest length that divides evenly into both tile counts.`,
          explanationZh: `gcd(${a}, ${b}) = ${g}，这是能同时整除两种砖数的最大边长。`,
          domain: "NUMBER_THEORY", knowledgePointSlug: "gcd-lcm", level,
        };
      },
    ];
    return pick(templates)();
  }

  // Level 4-5: primality — multiple templates
  const primalityTemplates: Array<() => AdaptiveQuestion> = [
    () => {
      const n = randInt(53, 181); const prime = isPrime(n);
      return {
        promptEn: `A security code only accepts prime numbers. Should ${n} pass? Answer yes or no.`,
        promptZh: `安全系统只接受质数。${n} 应该被接受吗？回答 yes 或 no。`,
        answer: prime ? "yes" : "no",
        hints: [
          { en: `Only check divisors up to √${n} ≈ ${Math.floor(Math.sqrt(n))}.`, zh: `只需检验到 √${n} ≈ ${Math.floor(Math.sqrt(n))} 的因数。` },
          { en: prime ? `${n} has no divisors other than 1 and itself.` : `Try dividing ${n} by small primes: 2, 3, 5, 7…`, zh: prime ? `${n} 除了 1 和自身没有其他因数。` : `试着用小质数 2、3、5、7 等整除 ${n}。` },
        ],
        explanationEn: `${n} is ${prime ? "prime" : "composite (not prime)"}. Testing up to √n is enough because factors pair up.`,
        explanationZh: `${n}${prime ? "是质数" : "是合数（非质数）"}。只检验到 √n 就够，因为因数总是成对的。`,
        domain: "NUMBER_THEORY", knowledgePointSlug: "primality", level,
      };
    },
    () => {
      const candidates = [97, 101, 113, 127, 131, 137, 139, 149, 151, 89, 83, 79].filter(isPrime);
      const composites = [91, 119, 121, 143, 169, 91, 77, 49, 63].filter(n => !isPrime(n));
      const useComposite = Math.random() < 0.5;
      const n = useComposite ? pick(composites) : pick(candidates);
      const prime = isPrime(n);
      return {
        promptEn: `Is ${n} a prime number? Answer yes or no.`,
        promptZh: `${n} 是质数吗？回答 yes 或 no。`,
        answer: prime ? "yes" : "no",
        hints: [
          { en: `Start by checking if it's even. Then try 3, 5, 7…`, zh: `先看是否是偶数，再试 3、5、7 等。` },
          { en: `You only need to check up to √${n} ≈ ${Math.floor(Math.sqrt(n))}.`, zh: `只需检验到 √${n} ≈ ${Math.floor(Math.sqrt(n))}。` },
        ],
        explanationEn: `${n} is ${prime ? "prime" : "composite"}. ${prime ? "It has no factors other than 1 and itself." : `It equals ${[2,3,5,7,11,13].find(p => n % p === 0) ?? "a factor"} × ${n / ([2,3,5,7,11,13].find(p => n % p === 0) ?? 1)}.`}`,
        explanationZh: `${n}${prime ? "是质数，除1和自身外无其他因数" : `是合数，${n} = ${[2,3,5,7,11,13].find(p => n % p === 0) ?? "某因数"} × ${n / ([2,3,5,7,11,13].find(p => n % p === 0) ?? 1)}`}。`,
        domain: "NUMBER_THEORY", knowledgePointSlug: "primality", level,
      };
    },
  ];
  return pick(primalityTemplates)();
}

// ─── PROBABILITY ──────────────────────────────────────────────────────────────

function buildProbability(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const total = randInt(7, 14); const good = randInt(1, total - 1);
        const ans = fractionString(good, total);
        return {
          promptEn: `A loot box has ${good} rare cards and ${total - good} common cards. Find P(rare) as a simplified fraction.`,
          promptZh: `卡包里有 ${good} 张稀有卡和 ${total - good} 张普通卡。抽到稀有卡的概率是多少（最简分数）？`,
          answer: ans,
          hints: [
            { en: "Probability = (favorable outcomes) ÷ (total outcomes).", zh: "概率 = 有利结果数 ÷ 总结果数。" },
            { en: `Favorable = ${good}, total = ${total}. Simplify ${good}/${total}.`, zh: `有利数 = ${good}，总数 = ${total}。化简 ${good}/${total}。` },
          ],
          explanationEn: `P = ${good}/${total} = ${ans}. Probability is always between 0 and 1.`,
          explanationZh: `P = ${good}/${total} = ${ans}。概率的值永远在 0 到 1 之间。`,
          domain: "PROBABILITY", knowledgePointSlug: "basic-probability", level,
        };
      },
      () => {
        const total = randInt(8, 15); const rain = randInt(2, total - 2);
        const notRain = total - rain; const ans = fractionString(notRain, total);
        return {
          promptEn: `In a simulation, P(rain) = ${fractionString(rain, total)}. What is P(no rain)? Simplify.`,
          promptZh: `模拟中 P(下雨) = ${fractionString(rain, total)}。P(不下雨) 是多少？化简。`,
          answer: ans,
          hints: [
            { en: "Complement rule: P(not A) = 1 − P(A).", zh: "补事件公式：P(非A) = 1 − P(A)。" },
            { en: `1 − ${rain}/${total} = ${total}/${total} − ${rain}/${total} = ${notRain}/${total}.`, zh: `1 − ${rain}/${total} = ${total}/${total} − ${rain}/${total} = ${notRain}/${total}。` },
          ],
          explanationEn: `P(no rain) = 1 − ${rain}/${total} = ${ans}. Complements always add to exactly 1.`,
          explanationZh: `P(不下雨) = 1 − ${rain}/${total} = ${ans}。互补事件概率之和永远等于 1。`,
          domain: "PROBABILITY", knowledgePointSlug: "basic-probability", level,
        };
      },
      () => {
        const sides = 6; const target = randInt(1, 5);
        const count = target <= 3 ? target : sides - target;
        const isAtLeast = target > 3;
        const desc = isAtLeast ? `at least ${sides - target + 1}` : `at most ${target}`;
        const favorable = isAtLeast ? target : count;
        const ans = fractionString(favorable, sides);
        return {
          promptEn: `You roll a fair 6-sided die. What is the probability of rolling ${desc}? Simplify.`,
          promptZh: `掷一个均匀6面骰子，出现"${isAtLeast ? `至少 ${sides - target + 1}` : `至多 ${target}`}"的概率是多少？化简。`,
          answer: ans,
          hints: [
            { en: "List the favorable outcomes, then divide by 6.", zh: "列出满足条件的结果，再除以 6。" },
            { en: `Favorable outcomes: ${Array.from({length: favorable}, (_, i) => isAtLeast ? sides - favorable + 1 + i : i + 1).join(", ")}.`, zh: `满足条件的结果：${Array.from({length: favorable}, (_, i) => isAtLeast ? sides - favorable + 1 + i : i + 1).join("、")}。` },
          ],
          explanationEn: `P = ${favorable}/${sides} = ${ans}. Count carefully before dividing.`,
          explanationZh: `P = ${favorable}/${sides} = ${ans}。先数清楚满足条件的结果数再相除。`,
          domain: "PROBABILITY", knowledgePointSlug: "basic-probability", level,
        };
      },
      () => {
        const red = randInt(2, 6); const blue = randInt(2, 6); const green = randInt(1, 4);
        const total = red + blue + green;
        const ans = fractionString(red + blue, total);
        return {
          promptEn: `A bag has ${red} red, ${blue} blue, and ${green} green marbles. P(not green)? Simplify.`,
          promptZh: `袋子里有 ${red} 个红球、${blue} 个蓝球、${green} 个绿球。P(非绿球) 是多少？化简。`,
          answer: ans,
          hints: [
            { en: "P(not green) = (red + blue) ÷ total.", zh: "P(非绿) = (红 + 蓝) ÷ 总数。" },
            { en: `Or use complement: 1 − P(green) = 1 − ${green}/${total}.`, zh: `或用补事件：1 − P(绿) = 1 − ${green}/${total}。` },
          ],
          explanationEn: `P(not green) = ${red + blue}/${total} = ${ans}.`,
          explanationZh: `P(非绿) = ${red + blue}/${total} = ${ans}。`,
          domain: "PROBABILITY", knowledgePointSlug: "basic-probability", level,
        };
      },
    ];
    return pick(templates)();
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const base = randInt(10, 20); const pBNum = randInt(5, base - 1); const pABNum = randInt(1, pBNum - 1);
      const ans = fractionString(pABNum, pBNum);
      return {
        promptEn: `P(A∩B) = ${fractionString(pABNum, base)}, P(B) = ${fractionString(pBNum, base)}. Find P(A|B).`,
        promptZh: `P(A∩B) = ${fractionString(pABNum, base)}，P(B) = ${fractionString(pBNum, base)}。求 P(A|B)。`,
        answer: ans,
        hints: [
          { en: "Conditional probability formula: P(A|B) = P(A∩B) / P(B).", zh: "条件概率公式：P(A|B) = P(A∩B) / P(B)。" },
          { en: `Divide: (${pABNum}/${base}) ÷ (${pBNum}/${base}) = ${pABNum}/${pBNum}.`, zh: `计算：(${pABNum}/${base}) ÷ (${pBNum}/${base}) = ${pABNum}/${pBNum}。` },
        ],
        explanationEn: `P(A|B) = (${pABNum}/${base}) / (${pBNum}/${base}) = ${pABNum}/${pBNum} = ${ans}. Conditioning restricts the sample space to event B.`,
        explanationZh: `P(A|B) = (${pABNum}/${base}) / (${pBNum}/${base}) = ${pABNum}/${pBNum} = ${ans}。条件概率把样本空间限制在 B 内部。`,
        domain: "PROBABILITY", knowledgePointSlug: "conditional-probability", level,
      };
    },
    () => {
      const p1Num = randInt(1, 5); const p1Den = randInt(p1Num + 1, 8);
      const p2Num = randInt(1, 5); const p2Den = randInt(p2Num + 1, 8);
      const ans = fractionString(p1Num * p2Num, p1Den * p2Den);
      return {
        promptEn: `Two independent events succeed with probabilities ${p1Num}/${p1Den} and ${p2Num}/${p2Den}. What is P(both succeed)?`,
        promptZh: `两个独立事件分别以 ${p1Num}/${p1Den} 和 ${p2Num}/${p2Den} 的概率成功。P(都成功) 是多少？`,
        answer: ans,
        hints: [
          { en: "For independent events: P(A and B) = P(A) × P(B).", zh: "独立事件：P(A 且 B) = P(A) × P(B)。" },
          { en: `Multiply: ${p1Num}/${p1Den} × ${p2Num}/${p2Den} = ${p1Num * p2Num}/${p1Den * p2Den}.`, zh: `相乘：${p1Num}/${p1Den} × ${p2Num}/${p2Den} = ${p1Num * p2Num}/${p1Den * p2Den}。` },
        ],
        explanationEn: `P = ${p1Num * p2Num}/${p1Den * p2Den} = ${ans}. Independence allows us to multiply probabilities directly.`,
        explanationZh: `P = ${p1Num * p2Num}/${p1Den * p2Den} = ${ans}。独立性让我们可以直接把概率相乘。`,
        domain: "PROBABILITY", knowledgePointSlug: "conditional-probability", level,
      };
    },
    () => {
      const total = randInt(20, 40); const passSport = randInt(8, total - 5); const passArtAndSport = randInt(3, passSport - 3);
      const ans = fractionString(passArtAndSport, passSport);
      return {
        promptEn: `In a class survey: ${passSport} students like sports, ${passArtAndSport} of those also like art. If a student likes sports, P(they also like art)?`,
        promptZh: `班级调查：${passSport} 人喜欢体育，其中 ${passArtAndSport} 人也喜欢美术。已知某人喜欢体育，P(也喜欢美术) 是多少？`,
        answer: ans,
        hints: [
          { en: "This is a conditional probability. Given 'likes sports', how many also like art?", zh: "这是条件概率问题。在「喜欢体育」的条件下，有多少人也喜欢美术？" },
          { en: `P(art | sports) = ${passArtAndSport} ÷ ${passSport}.`, zh: `P(美术 | 体育) = ${passArtAndSport} ÷ ${passSport}。` },
        ],
        explanationEn: `P(art | sports) = ${passArtAndSport}/${passSport} = ${ans}. Conditioning means we only look within the sports group.`,
        explanationZh: `P(美术 | 体育) = ${passArtAndSport}/${passSport} = ${ans}。条件概率只看"体育"这个子群体。`,
        domain: "PROBABILITY", knowledgePointSlug: "conditional-probability", level,
      };
    },
  ];
  return pick(templates)();
}

// ─── STATISTICS ───────────────────────────────────────────────────────────────

function buildStatistics(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const nums = Array.from({ length: 5 }, () => randInt(60, 100));
        const sum = nums.reduce((s, n) => s + n, 0);
        const mean = (sum / nums.length).toFixed(2);
        return {
          promptEn: `Quiz scores: ${nums.join(", ")}. Find the mean (2 decimals).`,
          promptZh: `测验分数：${nums.join("、")}。求平均数（保留2位小数）。`,
          answer: mean,
          hints: [
            { en: `Step 1: Add all scores: ${nums.join(" + ")} = ${sum}.`, zh: `第一步：所有分数求和：${nums.join(" + ")} = ${sum}。` },
            { en: `Step 2: Divide by the count: ${sum} ÷ ${nums.length} = ?`, zh: `第二步：除以数据个数：${sum} ÷ ${nums.length} = ?` },
          ],
          explanationEn: `Mean = ${sum} ÷ 5 = ${mean}. Outliers can pull the mean away from the "typical" value.`,
          explanationZh: `平均数 = ${sum} ÷ 5 = ${mean}。极端值会把均值拉偏，远离"典型值"。`,
          domain: "STATISTICS", knowledgePointSlug: "mean", level,
        };
      },
      () => {
        const days = Array.from({ length: 4 }, () => randInt(120, 280));
        const total = days.reduce((s, n) => s + n, 0);
        const mean = (total / days.length).toFixed(2);
        return {
          promptEn: `A creator gained ${days.join(", ")} followers over 4 days. Average daily gain (2 decimals)?`,
          promptZh: `创作者4天涨粉 ${days.join("、")}。日均涨粉是多少（保留2位小数）？`,
          answer: mean,
          hints: [
            { en: "Sum all four days first.", zh: "先把4天都加起来。" },
            { en: "Then divide by 4 to find the average per day.", zh: "再除以4得到每天平均值。" },
          ],
          explanationEn: `Average = (${days.join("+")})/4 = ${total}/4 = ${mean}.`,
          explanationZh: `平均值 = (${days.join("+")})/4 = ${total}/4 = ${mean}。`,
          domain: "STATISTICS", knowledgePointSlug: "mean", level,
        };
      },
      () => {
        const scores = Array.from({ length: 6 }, () => randInt(55, 95));
        const sum = scores.reduce((s, n) => s + n, 0);
        const mean = (sum / scores.length).toFixed(2);
        return {
          promptEn: `A student scored ${scores.join(", ")} on 6 assignments. What is the mean score (2 decimals)?`,
          promptZh: `学生6次作业得分：${scores.join("、")}。平均分是多少（保留2位小数）？`,
          answer: mean,
          hints: [
            { en: `Sum: ${scores.join(" + ")} = ${sum}.`, zh: `求和：${scores.join(" + ")} = ${sum}。` },
            { en: `Mean = ${sum} ÷ 6 = ?`, zh: `平均分 = ${sum} ÷ 6 = ?` },
          ],
          explanationEn: `Mean = ${sum} / 6 = ${mean}. The mean represents the "fair share" if scores were redistributed equally.`,
          explanationZh: `平均分 = ${sum} / 6 = ${mean}。平均数可以理解为把总分"均分"给每次作业。`,
          domain: "STATISTICS", knowledgePointSlug: "mean", level,
        };
      },
    ];
    return pick(templates)();
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const nums = Array.from({ length: 7 }, () => randInt(50, 120)).sort((a, b) => a - b);
      const median = nums[3];
      return {
        promptEn: `Data set: ${nums.join(", ")}. Find the median.`,
        promptZh: `数据集：${nums.join("、")}。求中位数。`,
        answer: String(median),
        hints: [
          { en: "The data is already sorted. Median = the middle value.", zh: "数据已排好序。中位数 = 正中间那个值。" },
          { en: `For 7 values, the middle is the 4th one: ${nums[3]}.`, zh: `7个数据中，中位数是第4个：${nums[3]}。` },
        ],
        explanationEn: `Sorted: ${nums.join(", ")}. Median = ${median} (4th of 7). Median resists outliers better than mean.`,
        explanationZh: `排序后：${nums.join("、")}。中位数 = ${median}（第4个）。中位数比均值更能抵抗极端值干扰。`,
        domain: "STATISTICS", knowledgePointSlug: "median", level,
      };
    },
    () => {
      const nums = Array.from({ length: 6 }, () => randInt(30, 95)).sort((a, b) => a - b);
      const leftMid = nums[2]; const rightMid = nums[3];
      const median = ((leftMid + rightMid) / 2).toFixed(2);
      return {
        promptEn: `Network delays (ms): ${nums.join(", ")}. Find the median (2 decimals).`,
        promptZh: `网络延迟（毫秒）：${nums.join("、")}。求中位数（保留2位小数）。`,
        answer: median,
        hints: [
          { en: "Even number of values: median = average of the two middle values.", zh: "偶数个数据：中位数 = 中间两个数的平均值。" },
          { en: `Middle pair: ${leftMid} and ${rightMid}. Average = (${leftMid} + ${rightMid}) / 2.`, zh: `中间两个：${leftMid} 和 ${rightMid}，平均 = (${leftMid} + ${rightMid}) / 2。` },
        ],
        explanationEn: `Median = (${leftMid} + ${rightMid}) / 2 = ${median}. For even-length sets, the median sits between the two central values.`,
        explanationZh: `中位数 = (${leftMid} + ${rightMid}) / 2 = ${median}。偶数数据集的中位数在两个中间值之间。`,
        domain: "STATISTICS", knowledgePointSlug: "median", level,
      };
    },
    () => {
      const typical = Array.from({ length: 5 }, () => randInt(40, 80));
      const outlier = randInt(200, 400);
      const all = [...typical, outlier].sort((a, b) => a - b);
      const mid = all[3];
      const mean = all.reduce((s, n) => s + n, 0) / all.length;
      return {
        promptEn: `Salaries ($K): ${all.join(", ")}. Which better represents the typical salary: mean (${mean.toFixed(1)}) or median? Enter: median.`,
        promptZh: `薪资（千元）：${all.join("、")}。哪个更能代表典型薪资：平均数 (${mean.toFixed(1)}) 还是中位数？输入：median。`,
        answer: "median",
        hints: [
          { en: "The very high outlier pulls the mean upward significantly.", zh: "极端高值会把均值明显拉高。" },
          { en: "Median ignores how large the outlier is; it only uses position.", zh: "中位数只看排名位置，不受极端值数值大小影响。" },
        ],
        explanationEn: `Mean is inflated by the outlier (${outlier}K). Median = ${mid}K is more representative. The answer is: median.`,
        explanationZh: `均值被极端值 (${outlier}K) 拉高，中位数 = ${mid}K 更有代表性。答案：median。`,
        domain: "STATISTICS", knowledgePointSlug: "median", level,
      };
    },
  ];
  return pick(templates)();
}

// ─── TRIGONOMETRY ─────────────────────────────────────────────────────────────

function buildTrigonometry(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const allSpecials = [
      { prompt: "sin(30°)", answer: "1/2", note: "30-60-90 triangle: opposite = 1, hyp = 2." },
      { prompt: "cos(60°)", answer: "1/2", note: "cos(60°) = sin(30°) = 1/2." },
      { prompt: "tan(45°)", answer: "1",   note: "45-45-90: opposite = adjacent, so tan = 1." },
      { prompt: "sin(45°)", answer: "0.7071", note: "√2/2 ≈ 0.7071. From 45-45-90 triangle." },
      { prompt: "cos(30°)", answer: "0.8660", note: "√3/2 ≈ 0.8660. From 30-60-90 triangle." },
      { prompt: "sin(60°)", answer: "0.8660", note: "√3/2 ≈ 0.8660. Same ratio as cos(30°)." },
      { prompt: "cos(45°)", answer: "0.7071", note: "√2/2 ≈ 0.7071. Same as sin(45°)." },
      { prompt: "tan(30°)", answer: "0.5774", note: "1/√3 ≈ 0.5774. From 30-60-90 triangle." },
    ];

    const contexts = [
      (p: string) => ({ en: `A navigation module needs ${p}. Evaluate it.`, zh: `导航模块需要 ${p} 的值，请计算。` }),
      (p: string) => ({ en: `A physics simulation requires ${p}. Compute the value.`, zh: `物理模拟需要 ${p} 的值，请求出。` }),
      (p: string) => ({ en: `Evaluate the exact value of ${p}.`, zh: `求 ${p} 的精确值。` }),
    ];

    const q = pick(allSpecials);
    const ctx = pick(contexts)(q.prompt);

    return {
      promptEn: ctx.en,
      promptZh: ctx.zh,
      answer: q.answer,
      hints: [
        { en: "Memorize 30-60-90 (1, √3, 2) and 45-45-90 (1, 1, √2) ratios.", zh: "记住 30-60-90（1, √3, 2）和 45-45-90（1, 1, √2）三角形比值。" },
        { en: q.note, zh: q.note },
      ],
      explanationEn: `${q.prompt} = ${q.answer}. ${q.note}`,
      explanationZh: `${q.prompt} = ${q.answer}。${q.note}`,
      domain: "TRIGONOMETRY", knowledgePointSlug: "special-angles", level,
    };
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const opp = randInt(3, 12); const hyp = opp + randInt(2, 10);
      const ans = fractionString(opp, hyp);
      return {
        promptEn: `In a right triangle, opposite = ${opp}, hypotenuse = ${hyp}. Find sin(θ) as a simplified fraction.`,
        promptZh: `直角三角形中，对边 = ${opp}，斜边 = ${hyp}。求 sin(θ)（最简分数）。`,
        answer: ans,
        hints: [
          { en: "SOH: sin = Opposite / Hypotenuse.", zh: "SOH：sin = 对边 / 斜边。" },
          { en: `sin(θ) = ${opp}/${hyp}. Simplify using gcd(${opp}, ${hyp}) = ${gcd(opp, hyp)}.`, zh: `sin(θ) = ${opp}/${hyp}，用 gcd(${opp}, ${hyp}) = ${gcd(opp, hyp)} 约分。` },
        ],
        explanationEn: `sin(θ) = ${opp}/${hyp} = ${ans}. SOH-CAH-TOA: trig ratios depend on shape, not size.`,
        explanationZh: `sin(θ) = ${opp}/${hyp} = ${ans}。SOH-CAH-TOA：三角比取决于形状，与大小无关。`,
        domain: "TRIGONOMETRY", knowledgePointSlug: "soh-cah-toa", level,
      };
    },
    () => {
      const adj = randInt(4, 11); const hyp = adj + randInt(2, 9);
      const ans = fractionString(adj, hyp);
      return {
        promptEn: `A ramp has adjacent = ${adj} m and hypotenuse = ${hyp} m. Find cos(θ) (simplified fraction).`,
        promptZh: `一段坡道邻边 = ${adj} 米，斜边 = ${hyp} 米。求 cos(θ)（最简分数）。`,
        answer: ans,
        hints: [
          { en: "CAH: cos = Adjacent / Hypotenuse.", zh: "CAH：cos = 邻边 / 斜边。" },
          { en: `cos(θ) = ${adj}/${hyp}. Check if it simplifies.`, zh: `cos(θ) = ${adj}/${hyp}，看是否可以化简。` },
        ],
        explanationEn: `cos(θ) = ${adj}/${hyp} = ${ans}. Identify whether you know opposite, adjacent, or hypotenuse first.`,
        explanationZh: `cos(θ) = ${adj}/${hyp} = ${ans}。先识别已知的是对边、邻边还是斜边，再选对应公式。`,
        domain: "TRIGONOMETRY", knowledgePointSlug: "soh-cah-toa", level,
      };
    },
    () => {
      const opp = randInt(3, 10); const adj = randInt(3, 10);
      const ans = fractionString(opp, adj);
      return {
        promptEn: `In a right triangle, opposite = ${opp}, adjacent = ${adj}. Find tan(θ) as a simplified fraction.`,
        promptZh: `直角三角形中，对边 = ${opp}，邻边 = ${adj}。求 tan(θ)（最简分数）。`,
        answer: ans,
        hints: [
          { en: "TOA: tan = Opposite / Adjacent.", zh: "TOA：tan = 对边 / 邻边。" },
          { en: `tan(θ) = ${opp}/${adj}. Use gcd to simplify.`, zh: `tan(θ) = ${opp}/${adj}，用最大公约数化简。` },
        ],
        explanationEn: `tan(θ) = ${opp}/${adj} = ${ans}. tan is useful when you know both legs but not the hypotenuse.`,
        explanationZh: `tan(θ) = ${opp}/${adj} = ${ans}。tan 在知道两条直角边时特别实用。`,
        domain: "TRIGONOMETRY", knowledgePointSlug: "soh-cah-toa", level,
      };
    },
  ];
  return pick(templates)();
}

// ─── CALCULUS ─────────────────────────────────────────────────────────────────

function buildCalculus(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const a = randInt(2, 9); const n = randInt(2, 6); const coef = a * n;
        return {
          promptEn: `Given f(x) = ${a}x^${n}, find f'(x).`,
          promptZh: `已知 f(x) = ${a}x^${n}，求 f'(x)。`,
          answer: `${coef}x^${n - 1}`,
          hints: [
            { en: "Power Rule: d/dx(xⁿ) = n · xⁿ⁻¹.", zh: "幂函数求导：d/dx(xⁿ) = n · xⁿ⁻¹。" },
            { en: `Constant ${a} stays: f'(x) = ${a} × ${n} · x^${n - 1} = ${coef}x^${n - 1}.`, zh: `常数 ${a} 保留：f'(x) = ${a} × ${n} · x^${n - 1} = ${coef}x^${n - 1}。` },
          ],
          explanationEn: `f'(x) = ${a} · ${n} · x^${n - 1} = ${coef}x^${n - 1}. The derivative gives the instantaneous rate of change.`,
          explanationZh: `f'(x) = ${a} · ${n} · x^${n - 1} = ${coef}x^${n - 1}。导数表示函数在某点的瞬时变化速率。`,
          domain: "CALCULUS", knowledgePointSlug: "derivatives-power-rule", level,
        };
      },
      () => {
        const a = randInt(2, 6); const n = randInt(2, 5); const b = randInt(3, 12);
        return {
          promptEn: `Find d/dx of f(x) = ${a}x^${n} + ${b}x.`,
          promptZh: `求 f(x) = ${a}x^${n} + ${b}x 的导数。`,
          answer: `${a * n}x^${n - 1}+${b}`,
          hints: [
            { en: "Differentiate each term separately (linearity of differentiation).", zh: "逐项求导（微分的线性性质）。" },
            { en: `d/dx(${a}x^${n}) = ${a * n}x^${n - 1}, and d/dx(${b}x) = ${b}.`, zh: `d/dx(${a}x^${n}) = ${a * n}x^${n - 1}，d/dx(${b}x) = ${b}。` },
          ],
          explanationEn: `f'(x) = ${a * n}x^${n - 1} + ${b}. Each term is differentiated independently.`,
          explanationZh: `f'(x) = ${a * n}x^${n - 1} + ${b}。各项分别求导，再合并。`,
          domain: "CALCULUS", knowledgePointSlug: "derivatives-power-rule", level,
        };
      },
      () => {
        const n = randInt(2, 5); const c = randInt(3, 10);
        const deriv = n === 2 ? `${2 * c}x` : `${c * n}x^${n - 1}`;
        return {
          promptEn: `A position function is s(t) = ${c}t^${n}. Find the velocity function s'(t).`,
          promptZh: `位移函数 s(t) = ${c}t^${n}。求速度函数 s'(t)。`,
          answer: deriv,
          hints: [
            { en: "Velocity = derivative of position (rate of change).", zh: "速度 = 位移函数对时间的导数（变化率）。" },
            { en: `Apply power rule: bring down ${n}, reduce exponent by 1.`, zh: `用幂函数求导：把指数 ${n} 提下来，指数减1。` },
          ],
          explanationEn: `s'(t) = ${c}·${n}·t^${n - 1} = ${deriv}. Derivatives turn position into velocity.`,
          explanationZh: `s'(t) = ${c}·${n}·t^${n - 1} = ${deriv}。导数把位移函数变成速度函数。`,
          domain: "CALCULUS", knowledgePointSlug: "derivatives-power-rule", level,
        };
      },
    ];
    return pick(templates)();
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const upper = randInt(2, 9); const ans = fractionString(upper * upper, 2);
      return {
        promptEn: `Compute ∫₀^${upper} t dt.`,
        promptZh: `计算 ∫₀^${upper} t dt。`,
        answer: ans,
        hints: [
          { en: "Antiderivative of t is t²/2.", zh: "t 的原函数（不定积分）是 t²/2。" },
          { en: `Apply Fundamental Theorem: [t²/2]₀^${upper} = ${upper}²/2 − 0 = ${upper * upper}/2.`, zh: `用微积分基本定理：[t²/2]₀^${upper} = ${upper}²/2 − 0 = ${upper * upper}/2。` },
        ],
        explanationEn: `∫₀^${upper} t dt = [t²/2]₀^${upper} = ${upper * upper}/2 = ${ans}. Definite integral = accumulated area under the curve.`,
        explanationZh: `∫₀^${upper} t dt = [t²/2]₀^${upper} = ${upper * upper}/2 = ${ans}。定积分 = 曲线下方的累积面积。`,
        domain: "CALCULUS", knowledgePointSlug: "definite-integrals", level,
      };
    },
    () => {
      const a = randInt(1, 4); const b = randInt(1, 6); const upper = randInt(2, 6);
      const num = a * upper * upper + 2 * b * upper; const ans = fractionString(num, 2);
      return {
        promptEn: `A rainfall rate is r(t) = ${a}t + ${b} (mm/hr). Compute total rainfall ∫₀^${upper} r(t) dt.`,
        promptZh: `降雨速率 r(t) = ${a}t + ${b}（毫米/小时）。求总降雨量 ∫₀^${upper} r(t) dt。`,
        answer: ans,
        hints: [
          { en: `Integrate each term: ∫(${a}t + ${b})dt = ${a}t²/2 + ${b}t + C.`, zh: `逐项积分：∫(${a}t + ${b})dt = ${a}t²/2 + ${b}t + C。` },
          { en: `Evaluate from 0 to ${upper}: plug in ${upper} and subtract value at 0.`, zh: `代入上下限：把 ${upper} 代入再减去 0 处的值。` },
        ],
        explanationEn: `[${a}t²/2 + ${b}t]₀^${upper} = ${a * upper * upper / 2 + b * upper} − 0 = ${ans} mm. Total from a rate function.`,
        explanationZh: `[${a}t²/2 + ${b}t]₀^${upper} = ${a * upper * upper / 2 + b * upper} − 0 = ${ans} 毫米。从速率函数求累计总量。`,
        domain: "CALCULUS", knowledgePointSlug: "definite-integrals", level,
      };
    },
    () => {
      const n = randInt(1, 3); const upper = randInt(2, 5);
      const antideriv = (t: number) => Math.pow(t, n + 1) / (n + 1);
      const result = antideriv(upper) - antideriv(0);
      const ans = fractionString(upper ** (n + 1), n + 1);
      return {
        promptEn: `Compute ∫₀^${upper} x^${n} dx.`,
        promptZh: `计算 ∫₀^${upper} x^${n} dx。`,
        answer: ans,
        hints: [
          { en: `Power rule for integrals: ∫xⁿdx = xⁿ⁺¹/(n+1).`, zh: `积分幂函数法则：∫xⁿdx = xⁿ⁺¹/(n+1)。` },
          { en: `Here n = ${n}: ∫x^${n}dx = x^${n + 1}/${n + 1}. Evaluate from 0 to ${upper}.`, zh: `这里 n = ${n}：∫x^${n}dx = x^${n + 1}/${n + 1}，代入 0 到 ${upper}。` },
        ],
        explanationEn: `[x^${n + 1}/${n + 1}]₀^${upper} = ${upper ** (n + 1)}/${n + 1} = ${ans}.`,
        explanationZh: `[x^${n + 1}/${n + 1}]₀^${upper} = ${upper ** (n + 1)}/${n + 1} = ${ans}。`,
        domain: "CALCULUS", knowledgePointSlug: "definite-integrals", level,
      };
    },
  ];
  return pick(templates)();
}

// ─── WORD PROBLEMS ────────────────────────────────────────────────────────────

function buildWordProblem(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const speed = randInt(30, 95); const hours = randInt(2, 6); const ans = speed * hours;
        return {
          promptEn: `A school cycling team rides at ${speed} km/h for ${hours} hours. Total distance traveled?`,
          promptZh: `校队骑行速度为 ${speed} 千米/小时，持续了 ${hours} 小时。总路程是多少？`,
          answer: String(ans),
          hints: [
            { en: "Distance = Speed × Time (d = v × t).", zh: "路程 = 速度 × 时间 (d = v × t)。" },
            { en: `${speed} × ${hours} = ?`, zh: `${speed} × ${hours} = ?` },
          ],
          explanationEn: `d = ${speed} × ${hours} = ${ans} km. Always check units match before multiplying.`,
          explanationZh: `d = ${speed} × ${hours} = ${ans} 千米。相乘前先确认单位匹配。`,
          domain: "WORD_PROBLEMS", knowledgePointSlug: "distance-speed-time", level,
        };
      },
      () => {
        const dist = randInt(120, 360); const time = randInt(2, 8); const ans = dist / time;
        return {
          promptEn: `A delivery robot covers ${dist} m in ${time} minutes at constant speed. What is its speed (m/min)?`,
          promptZh: `配送机器人 ${time} 分钟走了 ${dist} 米，速度恒定。它的速度是多少（米/分钟）？`,
          answer: String(ans),
          hints: [
            { en: "Rearrange d = v × t to get v = d / t.", zh: "由 d = v × t 变形，得到 v = d / t。" },
            { en: `v = ${dist} ÷ ${time} = ?`, zh: `v = ${dist} ÷ ${time} = ?` },
          ],
          explanationEn: `v = ${dist} / ${time} = ${ans} m/min. Speed is distance per unit of time.`,
          explanationZh: `v = ${dist} / ${time} = ${ans} 米/分钟。速度 = 单位时间内走的距离。`,
          domain: "WORD_PROBLEMS", knowledgePointSlug: "distance-speed-time", level,
        };
      },
      () => {
        const totalDist = randInt(100, 400); const speed = randInt(40, 80);
        const ans = totalDist / speed;
        if (!Number.isInteger(ans)) {
          return buildWordProblem(level); // retry if not clean
        }
        return {
          promptEn: `A school trip of ${totalDist} km is made at ${speed} km/h. How many hours does it take?`,
          promptZh: `学校旅行路程 ${totalDist} 千米，车速 ${speed} 千米/小时。需要几小时？`,
          answer: String(ans),
          hints: [
            { en: "Rearrange d = v × t to get t = d / v.", zh: "由 d = v × t 变形，得到 t = d / v。" },
            { en: `t = ${totalDist} ÷ ${speed} = ?`, zh: `t = ${totalDist} ÷ ${speed} = ?` },
          ],
          explanationEn: `t = ${totalDist} / ${speed} = ${ans} hours.`,
          explanationZh: `t = ${totalDist} / ${speed} = ${ans} 小时。`,
          domain: "WORD_PROBLEMS", knowledgePointSlug: "distance-speed-time", level,
        };
      },
      () => {
        const trainA = randInt(50, 90); const trainB = randInt(40, 80);
        const initDist = randInt(200, 400);
        const timeToMeet = initDist / (trainA + trainB);
        if (!Number.isInteger(timeToMeet * 10)) {
          return buildWordProblem(level); // retry if messy decimal
        }
        return {
          promptEn: `Two trains start ${initDist} km apart and move toward each other at ${trainA} km/h and ${trainB} km/h. In how many hours do they meet? (Use decimals if needed, e.g. 1.5)`,
          promptZh: `两列火车相距 ${initDist} 千米，分别以 ${trainA} 和 ${trainB} 千米/小时相向而行。几小时后相遇？（可用小数，如 1.5）`,
          answer: String(Math.round(timeToMeet * 10) / 10),
          hints: [
            { en: "They're closing the gap together: combined speed = sum of both.", zh: "两车一起缩短距离：合速 = 两速之和。" },
            { en: `Combined speed = ${trainA} + ${trainB} = ${trainA + trainB}. Time = ${initDist} ÷ ${trainA + trainB}.`, zh: `合速 = ${trainA} + ${trainB} = ${trainA + trainB}，时间 = ${initDist} ÷ ${trainA + trainB}。` },
          ],
          explanationEn: `t = ${initDist} / (${trainA} + ${trainB}) = ${Math.round(timeToMeet * 10) / 10} hours. Meeting problems use combined speed.`,
          explanationZh: `t = ${initDist} / (${trainA} + ${trainB}) = ${Math.round(timeToMeet * 10) / 10} 小时。相遇问题用两速之和。`,
          domain: "WORD_PROBLEMS", knowledgePointSlug: "distance-speed-time", level,
        };
      },
    ];
    return pick(templates)();
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const principal = randInt(300, 1500); const rate = randInt(2, 9); const years = randInt(1, 5);
      const interest = (principal * rate * years) / 100;
      return {
        promptEn: `A student account: principal $${principal}, simple interest ${rate}%/year, for ${years} years. Interest earned?`,
        promptZh: `学生账户：本金 $${principal}，年单利 ${rate}%，存 ${years} 年。可得利息多少？`,
        answer: String(interest),
        hints: [
          { en: "Simple Interest formula: I = P × r × t.", zh: "单利公式：I = P × r × t。" },
          { en: `Convert ${rate}% to ${rate / 100}. Then I = ${principal} × ${rate / 100} × ${years}.`, zh: `把 ${rate}% 转为 ${rate / 100}，再计算 I = ${principal} × ${rate / 100} × ${years}。` },
        ],
        explanationEn: `I = ${principal} × ${rate / 100} × ${years} = ${interest}. Simple interest grows linearly with time.`,
        explanationZh: `I = ${principal} × ${rate / 100} × ${years} = ${interest}。单利随时间线性增长。`,
        domain: "WORD_PROBLEMS", knowledgePointSlug: "simple-interest", level,
      };
    },
    () => {
      const principal = randInt(500, 1800); const target = randInt(50, 300); const rate = randInt(2, 8);
      const years = fractionString(100 * target, principal * rate);
      return {
        promptEn: `Simple interest plan: principal $${principal}, annual rate ${rate}%. Years to earn $${target} interest?`,
        promptZh: `单利方案：本金 $${principal}，年利率 ${rate}%。获得 $${target} 利息需要多少年？`,
        answer: years,
        hints: [
          { en: "Start from I = P × r × t and solve for t: t = I / (P × r).", zh: "从 I = P × r × t 变形求 t：t = I / (P × r)。" },
          { en: `t = ${target} / (${principal} × ${rate / 100}) = ${target} / ${(principal * rate / 100).toFixed(0)}.`, zh: `t = ${target} / (${principal} × ${rate / 100}) = ${target} / ${(principal * rate / 100).toFixed(0)}。` },
        ],
        explanationEn: `t = I/(P×r) = ${target}/(${principal} × ${rate / 100}) = ${years}. Rearranging financial formulas is just algebra.`,
        explanationZh: `t = I/(P×r) = ${target}/(${principal} × ${rate / 100}) = ${years}。金融公式变形本质上就是代数方程求解。`,
        domain: "WORD_PROBLEMS", knowledgePointSlug: "simple-interest", level,
      };
    },
    () => {
      const principal = randInt(1000, 5000); const rate = randInt(3, 10); const years = randInt(2, 8);
      const totalAmount = principal + (principal * rate * years) / 100;
      return {
        promptEn: `You invest $${principal} at ${rate}% simple interest for ${years} years. What is the total amount (principal + interest)?`,
        promptZh: `你投资 $${principal}，年单利 ${rate}%，存 ${years} 年。本金加利息总共多少？`,
        answer: String(totalAmount),
        hints: [
          { en: "Interest I = P × r × t. Total = P + I.", zh: "先算利息 I = P × r × t，再加上本金。" },
          { en: `I = ${principal} × ${rate / 100} × ${years} = ${(principal * rate * years) / 100}. Total = ${principal} + I.`, zh: `I = ${principal} × ${rate / 100} × ${years} = ${(principal * rate * years) / 100}，总额 = ${principal} + I。` },
        ],
        explanationEn: `I = ${(principal * rate * years) / 100}. Total = ${principal} + ${(principal * rate * years) / 100} = ${totalAmount}.`,
        explanationZh: `I = ${(principal * rate * years) / 100}，总额 = ${principal} + ${(principal * rate * years) / 100} = ${totalAmount}。`,
        domain: "WORD_PROBLEMS", knowledgePointSlug: "simple-interest", level,
      };
    },
  ];
  return pick(templates)();
}

// ─── Fun Facts ─────────────────────────────────────────────────────────────────

function buildFunFact(domain: MasteryDomain, knowledgePointSlug: string): { funFactEn: string; funFactZh: string } {
  const byDomain: Record<MasteryDomain, Array<{ en: string; zh: string }>> = {
    ARITHMETIC: [
      { en: "Mental math pros group numbers into easy chunks — like adding 8+7 as (8+2)+5 = 15.", zh: "心算高手把数字分组：比如 8+7 = (8+2)+5 = 15，更快更准。" },
      { en: "The ancient Egyptians multiplied by repeatedly doubling — no multiplication tables needed!", zh: "古埃及人靠不断翻倍来做乘法，根本不需要乘法表！" },
      { en: "A googol is 10^100 — more than the number of atoms in the observable universe.", zh: "古戈尔（Googol）= 10^100，比可见宇宙中原子总数还多！" },
      { en: "Lightning fast arithmetic champions use 'casting out nines' to verify big calculations instantly.", zh: "数学速算冠军用「弃九法」瞬间验证大数计算结果。" },
    ],
    ALGEBRA: [
      { en: "The word 'algebra' comes from Arabic 'al-jabr', meaning 'restoration' — balancing broken equations.", zh: "代数（algebra）来自阿拉伯语「al-jabr」，意为「恢复平衡」——修复方程！" },
      { en: "Every equation is a balance: whatever you do to one side, do to the other to keep it equal.", zh: "每个方程都是一架天平：对一边做什么，另一边也要做同样的事。" },
      { en: "Al-Khwarizmi, the 'father of algebra', wrote the first algebra textbook in 820 AD.", zh: "代数之父花剌子模（al-Khwarizmi）于公元820年写成第一本代数教科书。" },
      { en: "Quadratic equations were first solved geometrically — as literal squares of land in Mesopotamia.", zh: "二次方程最初是几何解法——古美索不达米亚人把它想象成土地的正方形！" },
    ],
    GEOMETRY: [
      { en: "The word 'geometry' means 'earth measurement' in Greek — used for land surveying!", zh: "「几何」（geometry）在希腊语中意为「土地测量」——最初用于测量田地！" },
      { en: "Architects use right triangles everywhere: to check if corners are truly 90° they use 3-4-5 triangles.", zh: "建筑师到处用直角三角形：用3-4-5三角形检查角落是否真正是90°。" },
      { en: "A hexagonal honeycomb tile pattern packs the most bees with the least wax used — nature's efficient geometry.", zh: "蜂巢的六边形结构是自然界最节省蜡的铺砖方式——几何的最优解！" },
      { en: "Pi (π) ≈ 3.14159... has been calculated to over 100 trillion decimal places with computers.", zh: "圆周率 π ≈ 3.14159...，计算机已将其算到超过100万亿位小数！" },
    ],
    FRACTIONS: [
      { en: "Ancient Egyptians only used 'unit fractions' like 1/2, 1/3, 1/4 — never numerators greater than 1!", zh: "古埃及人只用分子为1的分数（如1/2、1/3），从不用分子大于1的分数！" },
      { en: "A fraction's denominator tells you the 'unit size': 1/4 means each piece is 1/4 of the whole.", zh: "分母决定「单位大小」：1/4 表示每份是整体的四分之一。" },
      { en: "Adding fractions with different denominators is like adding meters and centimeters — you must convert first.", zh: "不同分母的分数相加，就像米和厘米相加——必须先统一单位。" },
    ],
    NUMBER_THEORY: [
      { en: "The largest known prime number (as of 2024) has over 41 million digits — discovered by a volunteer computing project.", zh: "截至2024年已知最大质数超过4100万位数，由志愿者分布式计算项目发现。" },
      { en: "GCD and LCM are 'brother' operations: lcm(a,b) × gcd(a,b) = a × b always.", zh: "GCD 和 LCM 是「兄弟」：lcm(a,b) × gcd(a,b) = a × b，永远成立。" },
      { en: "Cicadas emerge every 13 or 17 years (both prime!) to avoid predators that have non-prime cycles.", zh: "某些蝉每13年或17年（都是质数！）才出现一次，以躲避周期非质数的天敌。" },
    ],
    PROBABILITY: [
      { en: "The 'birthday paradox': in a group of just 23 people, there's a 50% chance two share a birthday!", zh: "生日悖论：仅仅23人的团体中，有两人同一天生日的概率竟然超过50%！" },
      { en: "Complement events can turn hard counting problems into easy subtraction from 1.", zh: "补事件把「直接数有利情况」变成「从1减去」，难题瞬间变简单。" },
      { en: "Probability was invented to solve gambling disputes in 1654 between Pascal and Fermat.", zh: "概率论发明于1654年，帕斯卡和费马为了解决一个赌博纠纷而发展出这门学科。" },
    ],
    STATISTICS: [
      { en: "Florence Nightingale invented rose diagrams to visualize hospital death statistics — saving thousands of lives.", zh: "南丁格尔发明了玫瑰图来呈现医院死亡数据统计，由此拯救了数千人的生命！" },
      { en: "Mean, median, and mode can all be 'average' — choosing the right one depends on your data's shape.", zh: "均值、中位数和众数都可以叫「平均值」——选哪个取决于数据的分布形状。" },
      { en: "The concept of 'standard deviation' was invented in 1893 by Karl Pearson to measure data spread.", zh: "标准差概念由卡尔·皮尔逊于1893年发明，用来衡量数据的离散程度。" },
    ],
    TRIGONOMETRY: [
      { en: "SOH-CAH-TOA is a memory trick — each trio is: (function)(opposite/hypotenuse), (cos adj/hyp), (tan opp/adj).", zh: "SOH-CAH-TOA 是记忆口诀，分别对应三角函数的「对/斜」、「邻/斜」、「对/邻」。" },
      { en: "Trig ratios are scale-invariant: a 3-4-5 triangle and a 30-40-50 triangle have identical trig values.", zh: "三角比与三角形大小无关：3-4-5三角形和30-40-50三角形的三角函数值完全相同。" },
      { en: "The Babylonians divided a circle into 360 degrees around 2400 BC — possibly linked to their 360-day calendar.", zh: "约公元前2400年，巴比伦人把圆分成360度——可能与他们的360天历法有关。" },
    ],
    CALCULUS: [
      { en: "Newton and Leibniz independently invented calculus — then fought about who discovered it first for decades!", zh: "牛顿和莱布尼茨独立发明了微积分，然后争了几十年谁才是真正的发明者！" },
      { en: "Derivatives tell you 'how fast right now'; integrals tell you 'how much in total'. Two sides of the same coin.", zh: "导数问「此刻有多快」，积分问「总共有多少」——是同一枚硬币的两面。" },
      { en: "GPS satellites use calculus to correct for tiny time-rate differences caused by Einstein's relativity.", zh: "GPS卫星用微积分来修正由爱因斯坦相对论导致的微小时间差！" },
    ],
    WORD_PROBLEMS: [
      { en: "The best way to solve any word problem: translate every sentence into a variable equation first.", zh: "解应用题的最佳方法：先把每句话翻译成含变量的等式。" },
      { en: "Unit analysis can catch most word problem mistakes before you finish calculating.", zh: "单位分析法能在计算结束前帮你抓住大多数应用题错误。" },
      { en: "Ancient Egyptians used word problems in the Rhind Papyrus (1650 BC) — the world's oldest math textbook!", zh: "古埃及人在《莱因德纸草书》（公元前1650年）中就用应用题——世界最古老的数学教材！" },
    ],
  };

  const byKnowledgePoint: Record<string, { en: string; zh: string }> = {
    "conditional-probability": { en: "P(A|B) and P(B|A) are usually NOT equal — direction matters in conditional probability!", zh: "P(A|B) 和 P(B|A) 通常不相等——条件概率的方向至关重要！" },
    "pythagorean-theorem": { en: "The 3-4-5 right triangle is so common that builders have used it to verify 90° corners for 4000 years.", zh: "3-4-5直角三角形如此经典，建筑师用它验证直角已有4000年历史！" },
    "quadratic-equations": { en: "Quadratic equations model everything: projectile motion, satellite orbits, bridge cable curves!", zh: "二次方程无处不在：抛体运动、卫星轨道、桥梁缆绳曲线都是它！" },
    "derivatives-power-rule": { en: "The power rule was one of Newton's key discoveries, enabling him to describe planetary motion mathematically.", zh: "幂函数求导是牛顿的关键发现之一，帮助他用数学描述行星运动规律。" },
    "definite-integrals": { en: "Archimedes computed the area of a parabola using sums — 1800 years before calculus was formally invented.", zh: "阿基米德用求和法算出抛物线面积——比微积分正式发明早了1800年！" },
    "gcd-lcm": { en: "The Euclidean algorithm for GCD is over 2300 years old and still one of the fastest algorithms ever devised.", zh: "欧几里得GCD算法已有2300多年历史，至今仍是效率最高的算法之一！" },
  };

  const specific = byKnowledgePoint[knowledgePointSlug];
  const domainList = byDomain[domain];
  const selected = specific ?? pick(domainList);
  return { funFactEn: selected.en, funFactZh: selected.zh };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface BuildInput {
  tagName: string;
  profile: MasteryProfile;
}

export function buildAdaptiveQuestion(input: BuildInput): AdaptiveQuestion {
  const domain = inferDomainFromTag(input.tagName);
  const level = recommendNextLevel(input.profile);

  const coreQuestion = (() => {
    switch (domain) {
      case "ARITHMETIC":    return buildArithmetic(level);
      case "ALGEBRA":       return buildAlgebra(level);
      case "GEOMETRY":      return buildGeometry(level);
      case "FRACTIONS":     return buildFractions(level);
      case "NUMBER_THEORY": return buildNumberTheory(level);
      case "PROBABILITY":   return buildProbability(level);
      case "STATISTICS":    return buildStatistics(level);
      case "TRIGONOMETRY":  return buildTrigonometry(level);
      case "CALCULUS":      return buildCalculus(level);
      case "WORD_PROBLEMS": return buildWordProblem(level);
      default:              return buildArithmetic(level);
    }
  })();

  return {
    ...coreQuestion,
    ...buildFunFact(coreQuestion.domain, coreQuestion.knowledgePointSlug),
  };
}
