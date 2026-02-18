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

interface BuildInput {
  tagName: string;
  profile: MasteryProfile;
}

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
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
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

export function inferDomainFromTag(tagName: string): MasteryDomain {
  const t = tagName.toLowerCase();

  if (t.includes("trig") || t.includes("triangle") || t.includes("sin") || t.includes("cos")) {
    return "TRIGONOMETRY";
  }
  if (t.includes("calc") || t.includes("derivative") || t.includes("integral") || t.includes("limit")) {
    return "CALCULUS";
  }
  if (t.includes("stat") || t.includes("data") || t.includes("mean") || t.includes("ap-stats")) {
    return "STATISTICS";
  }
  if (t.includes("prob") || t.includes("chance")) {
    return "PROBABILITY";
  }
  if (t.includes("fraction") || t.includes("ratio")) {
    return "FRACTIONS";
  }
  if (t.includes("number") || t.includes("prime") || t.includes("factor")) {
    return "NUMBER_THEORY";
  }
  if (t.includes("geo") || t.includes("shape") || t.includes("angle")) {
    return "GEOMETRY";
  }
  if (t.includes("word") || t.includes("real") || t.includes("story")) {
    return "WORD_PROBLEMS";
  }
  if (t.includes("alg") || t.includes("equation") || t.includes("function") || t.includes("ccss-hsa") || t.includes("ccss-hsf")) {
    return "ALGEBRA";
  }

  return "ARITHMETIC";
}

export function recommendNextLevel(profile: MasteryProfile): number {
  let level = clamp(Math.round(profile.level), 1, 5);

  if (profile.accuracy >= 0.85 && profile.avgTimeMs > 0 && profile.avgTimeMs <= 22000) {
    level += 1;
  }
  if (profile.streak >= 5) {
    level += 1;
  }
  if (profile.accuracy <= 0.55) {
    level -= 1;
  }
  if (profile.avgTimeMs >= 65000) {
    level -= 1;
  }

  return clamp(level, 1, 5);
}

function buildArithmetic(level: number): AdaptiveQuestion {
  if (level <= 2) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const a = randInt(36, 99);
        const b = randInt(18, 89);
        const total = a + b;
        return {
          promptEn: `At the school charity fair, Class A sold ${a} tickets in round 1 and ${b} in round 2. How many tickets in total?`,
          promptZh: `学校义卖活动中，A班第一轮卖出 ${a} 张票，第二轮卖出 ${b} 张。总共卖出多少张？`,
          answer: String(total),
          hints: [
            { en: "Add tens first, then ones.", zh: "先加十位，再加个位。" },
            { en: "Estimate with rounded numbers to check reasonableness.", zh: "先用凑整估算，再检查答案是否合理。" },
          ],
          explanationEn: `${a} + ${b} = ${total}. Insight: place-value regrouping reduces carry mistakes in mental math.`,
          explanationZh: `${a} + ${b} = ${total}。数学洞察：按数位重组能减少进位计算中的失误。`,
          domain: "ARITHMETIC" as const,
          knowledgePointSlug: "addition-subtraction",
          level,
        };
      },
      () => {
        const start = randInt(70, 160);
        const left = randInt(12, 55);
        const remain = start - left;
        return {
          promptEn: `A game event starts with ${start} energy points. After spending ${left}, how many points remain?`,
          promptZh: `某游戏活动初始有 ${start} 点能量，消耗了 ${left} 点后还剩多少？`,
          answer: String(remain),
          hints: [
            { en: "This is a take-away model: remaining = total - used.", zh: "这是“拿走型”问题：剩余 = 总量 - 用掉。" },
            { en: "Check by reverse operation: remain + used should return start.", zh: "用逆运算检查：剩余 + 用掉应回到初始值。" },
          ],
          explanationEn: `Remaining = ${start} - ${left} = ${remain}. Insight: subtraction can be validated by addition as a reverse check.`,
          explanationZh: `剩余 = ${start} - ${left} = ${remain}。数学洞察：减法可通过加法逆向验证，可靠性更高。`,
          domain: "ARITHMETIC" as const,
          knowledgePointSlug: "addition-subtraction",
          level,
        };
      },
    ];

    return pick(templates)();
  }

  if (level <= 4) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const rows = randInt(12, 28);
        const cols = randInt(11, 26);
        const ans = rows * cols;
        return {
          promptEn: `A pixel-art board has ${rows} rows and ${cols} columns. How many pixels are there in total?`,
          promptZh: `像素画板有 ${rows} 行、${cols} 列，总像素数量是多少？`,
          answer: String(ans),
          hints: [
            { en: "Use array model: total = rows × columns.", zh: "用阵列模型：总数 = 行数 × 列数。" },
            { en: "Alternative: split one factor, e.g., 23×18 = 23×(20-2).", zh: "可用拆分法：如 23×18 = 23×(20-2)。" },
          ],
          explanationEn: `${rows} × ${cols} = ${ans}. Insight: multiplication is area/array counting, not only repeated addition.`,
          explanationZh: `${rows} × ${cols} = ${ans}。数学洞察：乘法既是重复加法，也是面积与阵列计数模型。`,
          domain: "ARITHMETIC" as const,
          knowledgePointSlug: "multiplication",
          level,
        };
      },
      () => {
        const boxes = randInt(15, 36);
        const each = randInt(8, 19);
        const bonus = randInt(20, 75);
        const ans = boxes * each + bonus;
        return {
          promptEn: `A club prepares ${boxes} gift boxes, each with ${each} stickers, then adds ${bonus} extra stickers. Total stickers?`,
          promptZh: `社团准备了 ${boxes} 盒礼物，每盒 ${each} 张贴纸，另外再补充 ${bonus} 张。总贴纸数是多少？`,
          answer: String(ans),
          hints: [
            { en: "Compute product first, then add extras.", zh: "先算乘法，再加额外数量。" },
            { en: "You can use distributive structure to organize steps.", zh: "可以用结构化分步，避免漏算。" },
          ],
          explanationEn: `Total = ${boxes}×${each} + ${bonus} = ${ans}. Insight: parse story problems into operation order before calculating.`,
          explanationZh: `总数 = ${boxes}×${each} + ${bonus} = ${ans}。数学洞察：先把情境翻译为运算顺序，再计算会更稳。`,
          domain: "ARITHMETIC" as const,
          knowledgePointSlug: "multiplication",
          level,
        };
      },
    ];

    return pick(templates)();
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const base = randInt(2, 8);
      const exp = randInt(3, 5);
      const ans = base ** exp;
      return {
        promptEn: `In a game combo chain, the score multiplier is ${base} applied for ${exp} levels. Evaluate ${base}^${exp}.`,
        promptZh: `游戏连击中，得分倍率 ${base} 连续作用 ${exp} 级。计算 ${base}^${exp}。`,
        answer: String(ans),
        hints: [
          { en: "Exponent means repeated multiplication of the same base.", zh: "幂表示同底数重复相乘。" },
          { en: "Write the expanded product before computing.", zh: "先把连乘式展开再计算。" },
        ],
        explanationEn: `${base}^${exp} = ${ans}. Insight: exponential growth quickly outpaces linear growth.`,
        explanationZh: `${base}^${exp} = ${ans}。数学洞察：指数增长会很快超过线性增长。`,
        domain: "ARITHMETIC" as const,
        knowledgePointSlug: "exponentiation",
        level,
      };
    },
    () => {
      const base = randInt(3, 9);
      const exp = randInt(2, 4);
      const scale = randInt(2, 5);
      const ans = scale * base ** exp;
      return {
        promptEn: `A visual effect score is modeled by ${scale}×${base}^${exp}. Compute its value.`,
        promptZh: `某视觉特效分值模型为 ${scale}×${base}^${exp}。求其数值。`,
        answer: String(ans),
        hints: [
          { en: "Evaluate the power part first.", zh: "先计算幂的部分。" },
          { en: "Then multiply by the coefficient.", zh: "再乘外部系数。" },
        ],
        explanationEn: `${scale}×${base}^${exp} = ${scale}×${base ** exp} = ${ans}. Insight: operation order matters when powers and products mix.`,
        explanationZh: `${scale}×${base}^${exp} = ${scale}×${base ** exp} = ${ans}。数学洞察：幂和乘法混合时，运算顺序非常关键。`,
        domain: "ARITHMETIC" as const,
        knowledgePointSlug: "exponentiation",
        level,
      };
    },
  ];

  return pick(templates)();
}

function buildAlgebra(level: number): AdaptiveQuestion {
  if (level <= 2) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const x = randInt(4, 21);
        const k = randInt(3, 12);
        return {
          promptEn: `A mystery meter follows x + ${k} = ${x + k}. Find x.`,
          promptZh: `某神秘计数器满足 x + ${k} = ${x + k}。求 x。`,
          answer: String(x),
          hints: [
            { en: "Undo +k by subtracting k on both sides.", zh: "两边同时减去 k，消去 +k。" },
            { en: "Keep both sides balanced after every step.", zh: "每一步都保持等号两边平衡。" },
          ],
          explanationEn: `x + ${k} = ${x + k} => x = ${x}. Insight: solving equations is reversible arithmetic with equality preserved.`,
          explanationZh: `x + ${k} = ${x + k}，所以 x = ${x}。数学洞察：解方程本质是“保持平衡的逆运算”。`,
          domain: "ALGEBRA",
          knowledgePointSlug: "linear-equations-basic",
          level,
        };
      },
      () => {
        const x = randInt(6, 24);
        const k = randInt(2, 8);
        return {
          promptEn: `A badge system says x - ${k} = ${x - k}. What is x?`,
          promptZh: `徽章系统给出 x - ${k} = ${x - k}。x 是多少？`,
          answer: String(x),
          hints: [
            { en: "Undo subtraction by adding k to both sides.", zh: "要消去减 k，就在两边加 k。" },
            { en: "Verify by substitution at the end.", zh: "最后把答案代回原式验证。" },
          ],
          explanationEn: `x - ${k} = ${x - k} => x = ${x}. Insight: inverse operations can be used in either direction (+/-).`,
          explanationZh: `x - ${k} = ${x - k}，解得 x = ${x}。数学洞察：加减互为逆运算，可双向撤销。`,
          domain: "ALGEBRA",
          knowledgePointSlug: "linear-equations-basic",
          level,
        };
      },
    ];

    return pick(templates)();
  }

  if (level <= 4) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const x = randInt(3, 15);
        const a = randInt(2, 9);
        const b = randInt(4, 20);
        const rhs = a * x + b;
        return {
          promptEn: `A puzzle machine outputs ${rhs} from rule ${a}x + ${b}. Find x.`,
          promptZh: `某解谜机器按规则 ${a}x + ${b} 计算，输出为 ${rhs}。求 x。`,
          answer: String(x),
          hints: [
            { en: "First remove +b from both sides.", zh: "先两边同时减去 b。" },
            { en: "Then divide by a to isolate x.", zh: "再两边同时除以 a。" },
          ],
          explanationEn: `${a}x + ${b} = ${rhs} => ${a}x = ${rhs - b} => x = ${x}. Insight: multi-step equations are undone in reverse order.`,
          explanationZh: `${a}x + ${b} = ${rhs} => ${a}x = ${rhs - b} => x = ${x}。数学洞察：多步方程按“逆序”消元最稳定。`,
          domain: "ALGEBRA",
          knowledgePointSlug: "linear-equations-multi",
          level,
        };
      },
      () => {
        const x = randInt(2, 16);
        const leftDen = randInt(2, 9);
        const rightNum = randInt(2, 9);
        const rightDen = randInt(2, 9);
        const numerator = x * rightNum;
        const denominator = leftDen * rightDen;
        const [sn, sd] = reduceFraction(numerator, denominator);
        return {
          promptEn: `Solve the proportion x/${leftDen} = ${rightNum}/${rightDen}.`,
          promptZh: `解比例方程：x/${leftDen} = ${rightNum}/${rightDen}。`,
          answer: String(x),
          hints: [
            { en: "Cross-multiply to remove denominators.", zh: "交叉相乘，先去分母。" },
            { en: "Equivalent path: multiply both sides by the LCM of denominators.", zh: "等价方法：两边同乘分母的最小公倍数。" },
          ],
          explanationEn: `x/${leftDen} = ${rightNum}/${rightDen} => x = ${leftDen}×${rightNum}/${rightDen} = ${numerator}/${denominator} = ${sn}/${sd} = ${x}. Insight: proportions link ratio reasoning and equation solving.`,
          explanationZh: `x/${leftDen} = ${rightNum}/${rightDen}，可得 x = ${leftDen}×${rightNum}/${rightDen} = ${numerator}/${denominator} = ${sn}/${sd} = ${x}。数学洞察：比例问题本质上也是方程变形。`,
          domain: "ALGEBRA",
          knowledgePointSlug: "linear-equations-multi",
          level,
        };
      },
    ];

    return pick(templates)();
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const r1 = randInt(2, 9);
      const r2 = randInt(10, 18);
      const b = -(r1 + r2);
      const c = r1 * r2;
      return {
        promptEn: `Given x^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}x + ${c} = 0, enter the larger root.`,
        promptZh: `已知方程 x^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}x + ${c} = 0，输入较大的根。`,
        answer: String(r2),
        hints: [
          { en: "Find two numbers with sum -b and product c.", zh: "找两个数：和为 -b，积为 c。" },
          { en: "Factor and use the zero-product rule.", zh: "因式分解后用零乘积定理。" },
        ],
        explanationEn: `x^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}x + ${c} = (x-${r1})(x-${r2}). Roots: ${r1}, ${r2}; larger root = ${r2}. Insight: structure recognition speeds up quadratic solving.`,
        explanationZh: `方程可写为 (x-${r1})(x-${r2})=0，根是 ${r1} 和 ${r2}，较大根为 ${r2}。数学洞察：识别“和与积”结构可快速解二次方程。`,
        domain: "ALGEBRA",
        knowledgePointSlug: "quadratic-equations",
        level,
      };
    },
    () => {
      const r = randInt(2, 11);
      const shift = randInt(1, 7);
      const c = shift * shift;
      return {
        promptEn: `Solve (x - ${shift})^2 = ${c}. Enter the larger solution.`,
        promptZh: `解方程 (x - ${shift})^2 = ${c}，输入较大的解。`,
        answer: String(shift + Math.sqrt(c)),
        hints: [
          { en: "Take square roots on both sides: x - a = ±sqrt(c).", zh: "两边开平方：x-a=±sqrt(c)。" },
          { en: "Then shift back by adding a.", zh: "最后再把 a 移项加回去。" },
        ],
        explanationEn: `x - ${shift} = ±${Math.sqrt(c)} => x = ${shift - Math.sqrt(c)} or ${shift + Math.sqrt(c)}. Larger solution: ${shift + Math.sqrt(c)}. Insight: some quadratics are fastest in square form instead of factoring.`,
        explanationZh: `x-${shift}=±${Math.sqrt(c)}，所以 x=${shift - Math.sqrt(c)} 或 ${shift + Math.sqrt(c)}，较大解是 ${shift + Math.sqrt(c)}。数学洞察：平方形式有时比因式分解更直接。`,
        domain: "ALGEBRA",
        knowledgePointSlug: "quadratic-equations",
        level,
      };
    },
  ];

  return pick(templates)();
}

function buildGeometry(level: number): AdaptiveQuestion {
  if (level <= 2) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const l = randInt(5, 16);
        const w = randInt(4, 12);
        const ans = l * w;
        return {
          promptEn: `A classroom wall is ${l} m by ${w} m. What area is covered by the poster board?`,
          promptZh: `教室墙面长 ${l} 米、宽 ${w} 米。海报板覆盖面积是多少？`,
          answer: String(ans),
          hints: [
            { en: "Rectangle area formula: A = length × width.", zh: "长方形面积：A = 长 × 宽。" },
            { en: "Area uses square units, not linear units.", zh: "面积单位是平方单位，不是长度单位。" },
          ],
          explanationEn: `A = ${l}×${w} = ${ans}. Insight: area measures coverage, while perimeter measures boundary length.`,
          explanationZh: `A = ${l}×${w} = ${ans}。数学洞察：面积看覆盖，周长看边界。`,
          domain: "GEOMETRY",
          knowledgePointSlug: "area-perimeter",
          level,
        };
      },
      () => {
        const outerL = randInt(8, 15);
        const outerW = randInt(6, 12);
        const cutL = randInt(2, Math.max(2, outerL - 4));
        const cutW = randInt(2, Math.max(2, outerW - 3));
        const ans = outerL * outerW - cutL * cutW;
        return {
          promptEn: `A stage floor is ${outerL}×${outerW} m, with a ${cutL}×${cutW} m square trapdoor removed. Remaining area?`,
          promptZh: `舞台地板是 ${outerL}×${outerW} 米，其中去掉一块 ${cutL}×${cutW} 米的方形区域。剩余面积是多少？`,
          answer: String(ans),
          hints: [
            { en: "Find full rectangle area first.", zh: "先求完整大长方形面积。" },
            { en: "Subtract the missing part; this is geometric decomposition.", zh: "再减去缺失部分，这是“几何分解”思路。" },
          ],
          explanationEn: `Remaining area = ${outerL}×${outerW} - ${cutL}×${cutW} = ${ans}. Insight: complex shapes can be solved by add/subtract simple shapes.`,
          explanationZh: `剩余面积 = ${outerL}×${outerW} - ${cutL}×${cutW} = ${ans}。数学洞察：复杂图形可拆成简单图形做加减。`,
          domain: "GEOMETRY",
          knowledgePointSlug: "area-perimeter",
          level,
        };
      },
    ];
    return pick(templates)();
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const a = randInt(3, 12);
      const b = randInt(4, 13);
      const c = Math.hypot(a, b);
      return {
        promptEn: `A rescue drone flies ${a} km east then ${b} km north. Straight-line distance to start (2 decimals)?`,
        promptZh: `救援无人机先向东飞 ${a} km，再向北飞 ${b} km。到起点的直线距离是多少（保留2位小数）？`,
        answer: c.toFixed(2),
        hints: [
          { en: "Model the path as a right triangle.", zh: "把路径建模成直角三角形。" },
          { en: "Use c = sqrt(a^2 + b^2), then round at the end.", zh: "用 c = sqrt(a^2 + b^2)，最后再四舍五入。" },
        ],
        explanationEn: `c = sqrt(${a}^2 + ${b}^2) = ${c.toFixed(2)}. Insight: Pythagorean theorem converts perpendicular moves into direct displacement.`,
        explanationZh: `c = sqrt(${a}^2 + ${b}^2) = ${c.toFixed(2)}。数学洞察：勾股定理把“折线路径”转成“位移长度”。`,
        domain: "GEOMETRY",
        knowledgePointSlug: "pythagorean-theorem",
        level,
      };
    },
    () => {
      const hyp = randInt(10, 20);
      const leg = randInt(6, hyp - 1);
      const other = Math.sqrt(hyp * hyp - leg * leg);
      const rounded = other.toFixed(2);
      return {
        promptEn: `In a right triangle, hypotenuse = ${hyp}, one leg = ${leg}. Find the other leg (2 decimals).`,
        promptZh: `直角三角形中，斜边为 ${hyp}，一条直角边为 ${leg}。求另一条直角边（保留2位小数）。`,
        answer: rounded,
        hints: [
          { en: "Rearrange theorem: missing^2 = hypotenuse^2 - known_leg^2.", zh: "变形：未知边² = 斜边² - 已知直角边²。" },
          { en: "Take square root only after subtraction.", zh: "先做平方差，最后开方。" },
        ],
        explanationEn: `missing = sqrt(${hyp}^2 - ${leg}^2) = ${rounded}. Insight: same theorem supports both forward and reverse unknowns.`,
        explanationZh: `未知边 = sqrt(${hyp}^2 - ${leg}^2) = ${rounded}。数学洞察：同一公式既可求斜边，也可反求直角边。`,
        domain: "GEOMETRY",
        knowledgePointSlug: "pythagorean-theorem",
        level,
      };
    },
  ];

  return pick(templates)();
}

function buildFractions(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const den = randInt(4, 12);
        const a = randInt(1, den - 1);
        const b = randInt(1, den - a);
        const ans = fractionString(a + b, den);
        return {
          promptEn: `A reading challenge shows ${a}/${den} done on Monday and ${b}/${den} on Tuesday. Total completed? Simplify.`,
          promptZh: `阅读挑战中，周一完成 ${a}/${den}，周二完成 ${b}/${den}。总完成量是多少？请化简。`,
          answer: ans,
          hints: [
            { en: "Same denominator: add numerators directly.", zh: "同分母：分子直接相加。" },
            { en: "Reduce by greatest common divisor.", zh: "最后用最大公约数约分。" },
          ],
          explanationEn: `${a}/${den} + ${b}/${den} = ${(a + b)}/${den} = ${ans}. Insight: denominator stays because unit size is unchanged.`,
          explanationZh: `${a}/${den} + ${b}/${den} = ${(a + b)}/${den} = ${ans}。数学洞察：同分母表示单位份额一致，分母先不变。`,
          domain: "FRACTIONS",
          knowledgePointSlug: "same-denominator",
          level,
        };
      },
      () => {
        const den = randInt(5, 12);
        const whole = randInt(20, 60);
        const num = randInt(1, den - 1);
        const ans = (whole * num) / den;
        return {
          promptEn: `A team completed ${num}/${den} of ${whole} missions. How many missions is that?`,
          promptZh: `团队完成了 ${whole} 个任务中的 ${num}/${den}。对应完成了多少个任务？`,
          answer: String(ans),
          hints: [
            { en: "Interpret fraction of a quantity as multiplication.", zh: "“一个数的几分之几”要用乘法。" },
            { en: "Compute whole ÷ denominator first if divisible.", zh: "若方便，可先做“总数 ÷ 分母”再乘分子。" },
          ],
          explanationEn: `${num}/${den} of ${whole} = ${whole}×${num}/${den} = ${ans}. Insight: fractions scale quantities, not just compare parts.`,
          explanationZh: `${whole} 的 ${num}/${den} = ${whole}×${num}/${den} = ${ans}。数学洞察：分数既能表示比例，也能表示“缩放因子”。`,
          domain: "FRACTIONS",
          knowledgePointSlug: "same-denominator",
          level,
        };
      },
    ];

    return pick(templates)();
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const a = randInt(1, 8);
      const b = randInt(2, 10);
      const c = randInt(1, 8);
      const d = randInt(2, 10);
      const ans = fractionString(a * d + c * b, b * d);
      return {
        promptEn: `A smoothie recipe uses ${a}/${b} cup yogurt and ${c}/${d} cup milk. Total amount? Simplify.`,
        promptZh: `某奶昔配方用了 ${a}/${b} 杯酸奶和 ${c}/${d} 杯牛奶。总量是多少？请化简。`,
        answer: ans,
        hints: [
          { en: "Find a common denominator before adding.", zh: "相加前先通分到共同分母。" },
          { en: "Use gcd to reduce the final fraction.", zh: "最终结果用最大公约数约分。" },
        ],
        explanationEn: `${a}/${b} + ${c}/${d} = (${a}×${d} + ${c}×${b})/(${b}×${d}) = ${ans}. Insight: common denominator aligns unit sizes before combination.`,
        explanationZh: `${a}/${b} + ${c}/${d} = (${a}×${d} + ${c}×${b})/(${b}×${d}) = ${ans}。数学洞察：通分的本质是统一“每一份”的大小。`,
        domain: "FRACTIONS",
        knowledgePointSlug: "different-denominator",
        level,
      };
    },
    () => {
      const num = randInt(2, 9);
      const den = randInt(num + 1, 12);
      const multiplier = randInt(2, 7);
      const ans = fractionString(num * multiplier, den);
      return {
        promptEn: `Scale ${num}/${den} by a factor of ${multiplier}. Give simplified fraction.`,
        promptZh: `把 ${num}/${den} 放大 ${multiplier} 倍，结果写成最简分数。`,
        answer: ans,
        hints: [
          { en: "Multiply the numerator by the whole-number factor.", zh: "分数乘整数时，先乘分子。" },
          { en: "Then simplify if numerator and denominator share factors.", zh: "若分子分母有公因数，再约分。" },
        ],
        explanationEn: `${num}/${den} × ${multiplier} = ${(num * multiplier)}/${den} = ${ans}. Insight: multiplying fractions often changes numerator scale first.`,
        explanationZh: `${num}/${den} × ${multiplier} = ${(num * multiplier)}/${den} = ${ans}。数学洞察：分数乘整数可先看“份数放大”。`,
        domain: "FRACTIONS",
        knowledgePointSlug: "different-denominator",
        level,
      };
    },
  ];

  return pick(templates)();
}

function buildNumberTheory(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const a = randInt(24, 84);
        const b = randInt(24, 84);
        const g = gcd(a, b);
        return {
          promptEn: `Two light signals blink every ${a}s and ${b}s. Their largest common interval is gcd(${a}, ${b}). Find it.`,
          promptZh: `两个信号灯分别每 ${a} 秒和 ${b} 秒闪烁。它们最大的公共间隔是 gcd(${a}, ${b})，求该值。`,
          answer: String(g),
          hints: [
            { en: "Use Euclidean algorithm for fast gcd.", zh: "用欧几里得算法快速求最大公约数。" },
            { en: "GCD is the largest number dividing both values.", zh: "GCD 是能同时整除两数的最大整数。" },
          ],
          explanationEn: `gcd(${a}, ${b}) = ${g}. Insight: gcd gives the largest shared unit size.`,
          explanationZh: `gcd(${a}, ${b}) = ${g}。数学洞察：GCD 表示两者可共同切分的最大单位。`,
          domain: "NUMBER_THEORY",
          knowledgePointSlug: "gcd-lcm",
          level,
        };
      },
      () => {
        const a = randInt(6, 16);
        const b = randInt(8, 20);
        const ans = lcm(a, b);
        return {
          promptEn: `A bus arrives every ${a} minutes and a train every ${b} minutes. After how many minutes do they coincide again?`,
          promptZh: `公交每 ${a} 分钟一班，列车每 ${b} 分钟一班。再次同时到站要过多少分钟？`,
          answer: String(ans),
          hints: [
            { en: "This is an LCM scenario, not GCD.", zh: "这是最小公倍数场景，不是最大公约数。" },
            { en: "Use lcm(a,b)=a*b/gcd(a,b).", zh: "可用公式 lcm(a,b)=a*b/gcd(a,b)。" },
          ],
          explanationEn: `lcm(${a}, ${b}) = ${ans}. Insight: LCM models first future synchronization time.`,
          explanationZh: `lcm(${a}, ${b}) = ${ans}。数学洞察：LCM 描述“下一个共同时刻”。`,
          domain: "NUMBER_THEORY",
          knowledgePointSlug: "gcd-lcm",
          level,
        };
      },
    ];

    return pick(templates)();
  }

  const n = randInt(53, 181);
  const prime = isPrime(n);
  return {
    promptEn: `A security code accepts only prime numbers. Should ${n} pass? Answer yes or no.`,
    promptZh: `安全码只接受质数。${n} 可以通过吗？回答 yes 或 no。`,
    answer: prime ? "yes" : "no",
    hints: [
      { en: "Only test divisors up to sqrt(n).", zh: "只需检验到 sqrt(n) 的因数。" },
      { en: "If any non-trivial divisor exists, answer is no.", zh: "若存在非 1 与自身的因数，则答案是 no。" },
    ],
    explanationEn: `${n} is ${prime ? "prime" : "not prime"}. Insight: sqrt-bound checking removes redundant divisor tests.`,
    explanationZh: `${n}${prime ? "是" : "不是"}质数。数学洞察：检验到 sqrt(n) 足够，后面的因数会成对出现。`,
    domain: "NUMBER_THEORY",
    knowledgePointSlug: "primality",
    level,
  };
}

function buildProbability(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const total = randInt(7, 14);
        const good = randInt(1, total - 1);
        const ans = fractionString(good, total);
        return {
          promptEn: `A loot box has ${good} rare cards and ${total - good} common cards. Find P(rare) as a simplified fraction.`,
          promptZh: `卡包里有 ${good} 张稀有卡和 ${total - good} 张普通卡。抽到稀有卡的概率是多少（最简分数）？`,
          answer: ans,
          hints: [
            { en: "Probability = favorable / total.", zh: "概率 = 有利结果 / 总结果。" },
            { en: "Always reduce the fraction to simplest form.", zh: "最后一定化成最简分数。" },
          ],
          explanationEn: `P = ${good}/${total} = ${ans}. Insight: probability is part-to-whole reasoning in uncertain settings.`,
          explanationZh: `P = ${good}/${total} = ${ans}。数学洞察：概率是“不确定情境下的部分占整体”。`,
          domain: "PROBABILITY",
          knowledgePointSlug: "basic-probability",
          level,
        };
      },
      () => {
        const total = randInt(8, 15);
        const rain = randInt(2, total - 2);
        const notRain = total - rain;
        const ans = fractionString(notRain, total);
        return {
          promptEn: `In a weather simulator, P(rain) = ${fractionString(rain, total)}. What is P(not rain)? Simplify.`,
          promptZh: `天气模拟器中 P(下雨) = ${fractionString(rain, total)}。求 P(不下雨) 并化简。`,
          answer: ans,
          hints: [
            { en: "Use complement rule: P(not A) = 1 - P(A).", zh: "用补事件公式：P(非A)=1-P(A)。" },
            { en: "Convert 1 to a fraction with the same denominator first.", zh: "先把 1 写成同分母分数再相减。" },
          ],
          explanationEn: `P(not rain) = 1 - ${rain}/${total} = ${notRain}/${total} = ${ans}. Insight: complement events can avoid direct counting.`,
          explanationZh: `P(不下雨) = 1 - ${rain}/${total} = ${notRain}/${total} = ${ans}。数学洞察：补事件常比“直接数有利情况”更快。`,
          domain: "PROBABILITY",
          knowledgePointSlug: "basic-probability",
          level,
        };
      },
    ];

    return pick(templates)();
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const base = randInt(10, 20);
      const pBNum = randInt(5, base - 1);
      const pABNum = randInt(1, pBNum - 1);
      const ans = fractionString(pABNum, pBNum);
      return {
        promptEn: `A platform logs P(A∩B)=${fractionString(pABNum, base)} and P(B)=${fractionString(pBNum, base)}. Find P(A|B).`,
        promptZh: `某平台记录 P(A∩B)=${fractionString(pABNum, base)}，P(B)=${fractionString(pBNum, base)}。求 P(A|B)。`,
        answer: ans,
        hints: [
          { en: "Use P(A|B)=P(A∩B)/P(B).", zh: "公式：P(A|B)=P(A∩B)/P(B)。" },
          { en: "Dividing two fractions is multiply by reciprocal.", zh: "分数相除等于乘倒数，再约分。" },
        ],
        explanationEn: `P(A|B) = (${pABNum}/${base}) / (${pBNum}/${base}) = ${pABNum}/${pBNum} = ${ans}. Insight: conditioning shrinks sample space to B.`,
        explanationZh: `P(A|B)=(${pABNum}/${base})/(${pBNum}/${base})=${pABNum}/${pBNum}=${ans}。数学洞察：条件概率把样本空间收缩到 B 内部。`,
        domain: "PROBABILITY",
        knowledgePointSlug: "conditional-probability",
        level,
      };
    },
    () => {
      const p1Num = randInt(1, 5);
      const p1Den = randInt(p1Num + 1, 8);
      const p2Num = randInt(1, 5);
      const p2Den = randInt(p2Num + 1, 8);
      const ans = fractionString(p1Num * p2Num, p1Den * p2Den);
      return {
        promptEn: `An event game needs two independent successes with probabilities ${p1Num}/${p1Den} and ${p2Num}/${p2Den}. Probability both happen?`,
        promptZh: `活动游戏需要两个独立事件成功，概率分别为 ${p1Num}/${p1Den} 和 ${p2Num}/${p2Den}。两者都成功的概率是多少？`,
        answer: ans,
        hints: [
          { en: "Independent both-happen probability uses multiplication.", zh: "独立事件“同时发生”用乘法。" },
          { en: "Multiply numerators and denominators, then simplify.", zh: "分子分母分别相乘，再约分。" },
        ],
        explanationEn: `P(both) = ${p1Num}/${p1Den} × ${p2Num}/${p2Den} = ${ans}. Insight: multiplication rule encodes chained uncertainty.`,
        explanationZh: `P(都成功) = ${p1Num}/${p1Den} × ${p2Num}/${p2Den} = ${ans}。数学洞察：乘法法则描述“连续不确定”叠加。`,
        domain: "PROBABILITY",
        knowledgePointSlug: "conditional-probability",
        level,
      };
    },
  ];

  return pick(templates)();
}

function buildStatistics(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const nums = Array.from({ length: 5 }, () => randInt(60, 100));
        const sum = nums.reduce((s, n) => s + n, 0);
        const mean = (sum / nums.length).toFixed(2);
        return {
          promptEn: `Quiz scores are ${nums.join(", ")}. Find the mean (2 decimals).`,
          promptZh: `测验分数为 ${nums.join("、")}。求平均数（保留2位小数）。`,
          answer: mean,
          hints: [
            { en: "Mean = total sum / number of data points.", zh: "平均数 = 总和 / 数据个数。" },
            { en: "Do not round until the final step.", zh: "中间尽量不四舍五入，最后一步再保留位数。" },
          ],
          explanationEn: `Sum = ${sum}, mean = ${sum}/5 = ${mean}. Insight: mean uses every value, so outliers can pull it strongly.`,
          explanationZh: `总和 = ${sum}，平均数 = ${sum}/5 = ${mean}。数学洞察：平均数会被每个数据点影响，易受极端值拉动。`,
          domain: "STATISTICS",
          knowledgePointSlug: "mean",
          level,
        };
      },
      () => {
        const days = Array.from({ length: 4 }, () => randInt(120, 280));
        const total = days.reduce((s, n) => s + n, 0);
        const mean = (total / days.length).toFixed(2);
        return {
          promptEn: `A streamer gained ${days.join(", ")} followers over 4 days. What is the average daily gain (2 decimals)?`,
          promptZh: `某主播 4 天分别涨粉 ${days.join("、")}。日均涨粉是多少（保留2位小数）？`,
          answer: mean,
          hints: [
            { en: "Average per day means divide by 4 after summing.", zh: "“日均”就是总数除以 4。" },
            { en: "Check magnitude: result should be near the middle of the data.", zh: "检查量级：结果应大致位于数据中间水平。" },
          ],
          explanationEn: `Average = (${days.join("+")})/4 = ${mean}. Insight: mean is a fair-share model for total quantity.`,
          explanationZh: `平均值 = (${days.join("+")})/4 = ${mean}。数学洞察：平均数可理解为“均分总量”的公平份额。`,
          domain: "STATISTICS",
          knowledgePointSlug: "mean",
          level,
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
        promptEn: `Data values are ${nums.join(", ")}. Find the median.`,
        promptZh: `数据为 ${nums.join("、")}。求中位数。`,
        answer: String(median),
        hints: [
          { en: "Median needs sorted order first.", zh: "中位数必须先排序。" },
          { en: "For 7 values, choose the 4th value.", zh: "7 个数据时取第 4 个。" },
        ],
        explanationEn: `Sorted list middle value is ${median}. Insight: median resists outliers better than mean.`,
        explanationZh: `排序后中间值是 ${median}。数学洞察：中位数对极端值更稳健。`,
        domain: "STATISTICS",
        knowledgePointSlug: "median",
        level,
      };
    },
    () => {
      const nums = Array.from({ length: 6 }, () => randInt(30, 95)).sort((a, b) => a - b);
      const leftMid = nums[2];
      const rightMid = nums[3];
      const median = ((leftMid + rightMid) / 2).toFixed(2);
      return {
        promptEn: `Packet delays (ms) are ${nums.join(", ")}. Find the median (2 decimals).`,
        promptZh: `网络延迟（毫秒）为 ${nums.join("、")}。求中位数（保留2位小数）。`,
        answer: median,
        hints: [
          { en: "With even count, median is average of two middle values.", zh: "偶数个数据时，中位数是中间两项的平均。" },
          { en: "Middle pair here is the 3rd and 4th values.", zh: "这里中间两项是第 3 和第 4 个值。" },
        ],
        explanationEn: `Median = (${leftMid}+${rightMid})/2 = ${median}. Insight: even-sized datasets use a midpoint between two central values.`,
        explanationZh: `中位数 = (${leftMid}+${rightMid})/2 = ${median}。数学洞察：偶数样本的“中心”是两中间值的平衡点。`,
        domain: "STATISTICS",
        knowledgePointSlug: "median",
        level,
      };
    },
  ];

  return pick(templates)();
}

function buildTrigonometry(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const specials = [
      { prompt: "sin(30°)", answer: "1/2" },
      { prompt: "cos(60°)", answer: "1/2" },
      { prompt: "tan(45°)", answer: "1" },
      { prompt: "sin(45°)", answer: "0.7071" },
      { prompt: "cos(30°)", answer: "0.8660" },
    ];

    const q = pick(specials);
    return {
      promptEn: `A navigation module needs ${q.prompt}. Evaluate it (fraction or decimal accepted).`,
      promptZh: `导航模块需要 ${q.prompt} 的值，请计算（分数或小数均可）。`,
      answer: q.answer,
      hints: [
        { en: "Use 30-60-90 and 45-45-90 triangle facts.", zh: "回忆 30-60-90 与 45-45-90 三角形结论。" },
        { en: "Unit circle values give the same results.", zh: "也可用单位圆对应坐标记忆。" },
      ],
      explanationEn: `${q.prompt} = ${q.answer}. Insight: special angles are anchors for estimating nearby trig values.`,
      explanationZh: `${q.prompt} = ${q.answer}。数学洞察：特殊角值是估算邻近角三角函数的“锚点”。`,
      domain: "TRIGONOMETRY",
      knowledgePointSlug: "special-angles",
      level,
    };
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const opp = randInt(3, 12);
      const hyp = opp + randInt(2, 10);
      const ans = fractionString(opp, hyp);
      return {
        promptEn: `In a right triangle, opposite=${opp}, hypotenuse=${hyp}. Find sin(theta), simplified.`,
        promptZh: `直角三角形中，对边=${opp}，斜边=${hyp}。求 sin(theta)（最简分数）。`,
        answer: ans,
        hints: [
          { en: "SOH: sin = opposite/hypotenuse.", zh: "SOH：sin = 对边/斜边。" },
          { en: "Simplify the ratio with gcd.", zh: "最后用最大公约数化简比值。" },
        ],
        explanationEn: `sin(theta) = ${opp}/${hyp} = ${ans}. Insight: trig ratios are scale-invariant shape descriptors.`,
        explanationZh: `sin(theta) = ${opp}/${hyp} = ${ans}。数学洞察：三角比不依赖三角形整体大小，只依赖形状。`,
        domain: "TRIGONOMETRY",
        knowledgePointSlug: "soh-cah-toa",
        level,
      };
    },
    () => {
      const adj = randInt(4, 11);
      const hyp = adj + randInt(2, 9);
      const ans = fractionString(adj, hyp);
      return {
        promptEn: `A camera tilt forms a right triangle with adjacent=${adj}, hypotenuse=${hyp}. Find cos(theta).`,
        promptZh: `镜头俯仰形成直角三角形，邻边=${adj}，斜边=${hyp}。求 cos(theta)。`,
        answer: ans,
        hints: [
          { en: "CAH: cos = adjacent/hypotenuse.", zh: "CAH：cos = 邻边/斜边。" },
          { en: "Reduce the resulting fraction.", zh: "计算后约分成最简。" },
        ],
        explanationEn: `cos(theta) = ${adj}/${hyp} = ${ans}. Insight: choosing the right ratio (sin/cos/tan) depends on known sides.`,
        explanationZh: `cos(theta) = ${adj}/${hyp} = ${ans}。数学洞察：先识别已知边类型，再选对应三角函数。`,
        domain: "TRIGONOMETRY",
        knowledgePointSlug: "soh-cah-toa",
        level,
      };
    },
  ];

  return pick(templates)();
}

function buildCalculus(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const a = randInt(2, 9);
        const n = randInt(2, 6);
        const coef = a * n;
        return {
          promptEn: `Given s(x)=${a}x^${n}, find s'(x).`,
          promptZh: `已知 s(x)=${a}x^${n}，求 s'(x)。`,
          answer: `${coef}x^${n - 1}`,
          hints: [
            { en: "Power rule: d/dx(x^n)=n*x^(n-1).", zh: "幂函数求导：d/dx(x^n)=n*x^(n-1)。" },
            { en: "Keep constant multipliers outside.", zh: "常数系数保留在外部。" },
          ],
          explanationEn: `s'(x) = ${a}*${n}x^${n - 1} = ${coef}x^${n - 1}. Insight: derivative maps a state function to a rate function.`,
          explanationZh: `s'(x) = ${a}*${n}x^${n - 1} = ${coef}x^${n - 1}。数学洞察：导数把“状态”转化为“变化率”。`,
          domain: "CALCULUS",
          knowledgePointSlug: "derivatives-power-rule",
          level,
        };
      },
      () => {
        const a = randInt(2, 6);
        const n = randInt(2, 5);
        const b = randInt(3, 12);
        return {
          promptEn: `Find d/dx of f(x)=${a}x^${n}+${b}x.`,
          promptZh: `求 f(x)=${a}x^${n}+${b}x 的导数。`,
          answer: `${a * n}x^${n - 1}+${b}`,
          hints: [
            { en: "Differentiate term by term.", zh: "逐项求导。" },
            { en: "Use linearity: d/dx(u+v)=u'+v'.", zh: "利用线性性质：和的导数等于导数的和。" },
          ],
          explanationEn: `f'(x) = ${a * n}x^${n - 1}+${b}. Insight: linearity plus power rule handles many basic polynomials.`,
          explanationZh: `f'(x) = ${a * n}x^${n - 1}+${b}。数学洞察：线性性质 + 幂函数法则可覆盖大多数基础多项式。`,
          domain: "CALCULUS",
          knowledgePointSlug: "derivatives-power-rule",
          level,
        };
      },
    ];

    return pick(templates)();
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const upper = randInt(2, 9);
      const ans = fractionString(upper * upper, 2);
      return {
        promptEn: `Compute integral_0^${upper} t dt.`,
        promptZh: `计算 integral_0^${upper} t dt。`,
        answer: ans,
        hints: [
          { en: "Antiderivative of t is t^2/2.", zh: "t 的原函数是 t^2/2。" },
          { en: "Apply Fundamental Theorem: F(upper)-F(lower).", zh: "用微积分基本定理：上限代入减下限代入。" },
        ],
        explanationEn: `Integral = [t^2/2]_0^${upper} = ${upper ** 2}/2 = ${ans}. Insight: definite integral accumulates continuous rate into total change.`,
        explanationZh: `积分 = [t^2/2]_0^${upper} = ${upper ** 2}/2 = ${ans}。数学洞察：定积分把连续变化率累加为总变化量。`,
        domain: "CALCULUS",
        knowledgePointSlug: "definite-integrals",
        level,
      };
    },
    () => {
      const a = randInt(1, 4);
      const b = randInt(1, 6);
      const upper = randInt(2, 6);
      const num = a * upper * upper + 2 * b * upper;
      const ans = fractionString(num, 2);
      return {
        promptEn: `A rate function is r(t)=${a}t+${b}. Compute integral_0^${upper} r(t) dt.`,
        promptZh: `变化率函数 r(t)=${a}t+${b}。求 integral_0^${upper} r(t) dt。`,
        answer: ans,
        hints: [
          { en: "Integrate each term: ∫(at+b)dt = a*t^2/2 + b*t.", zh: "分项积分：∫(at+b)dt = a*t^2/2 + b*t。" },
          { en: "Evaluate at upper and subtract value at 0.", zh: "代上限并减去 0 处函数值。" },
        ],
        explanationEn: `Integral = [${a}t^2/2 + ${b}t]_0^${upper} = ${ans}. Insight: area under a line captures total accumulated quantity.`,
        explanationZh: `积分 = [${a}t^2/2 + ${b}t]_0^${upper} = ${ans}。数学洞察：直线下方面积对应累计总量。`,
        domain: "CALCULUS",
        knowledgePointSlug: "definite-integrals",
        level,
      };
    },
  ];

  return pick(templates)();
}

function buildWordProblem(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const templates: Array<() => AdaptiveQuestion> = [
      () => {
        const speed = randInt(30, 95);
        const hours = randInt(2, 6);
        const ans = speed * hours;
        return {
          promptEn: `A school cycling team rides at ${speed} miles/hour for ${hours} hours. Distance traveled?`,
          promptZh: `校队骑行速度为 ${speed} 英里/小时，持续 ${hours} 小时。总路程是多少？`,
          answer: String(ans),
          hints: [
            { en: "Use d = v × t.", zh: "使用 d = v × t。" },
            { en: "Check that time and speed units match before multiplying.", zh: "先确认速度和时间单位匹配。" },
          ],
          explanationEn: `d = ${speed}×${hours} = ${ans}. Insight: unit analysis helps prevent formula misuse.`,
          explanationZh: `d = ${speed}×${hours} = ${ans}。数学洞察：先做单位检查，能显著降低套错公式概率。`,
          domain: "WORD_PROBLEMS",
          knowledgePointSlug: "distance-speed-time",
          level,
        };
      },
      () => {
        const dist = randInt(120, 360);
        const time = randInt(2, 8);
        const ans = dist / time;
        return {
          promptEn: `A delivery robot covers ${dist} meters in ${time} minutes at constant speed. What is its speed (m/min)?`,
          promptZh: `配送机器人 ${time} 分钟走了 ${dist} 米，速度恒定。它的速度是多少（米/分钟）？`,
          answer: String(ans),
          hints: [
            { en: "Rearrange d = v*t to v = d/t.", zh: "由 d=v*t 变形得到 v=d/t。" },
            { en: "Interpret the result as “per 1 minute”.", zh: "把结果理解为“每 1 分钟走多少米”。" },
          ],
          explanationEn: `v = ${dist}/${time} = ${ans} m/min. Insight: rate means quantity per one unit of time.`,
          explanationZh: `v = ${dist}/${time} = ${ans} 米/分钟。数学洞察：速度本质是单位时间内的变化量。`,
          domain: "WORD_PROBLEMS",
          knowledgePointSlug: "distance-speed-time",
          level,
        };
      },
    ];

    return pick(templates)();
  }

  const templates: Array<() => AdaptiveQuestion> = [
    () => {
      const principal = randInt(300, 1500);
      const rate = randInt(2, 9);
      const years = randInt(1, 5);
      const interest = (principal * rate * years) / 100;
      return {
        promptEn: `A student account has principal $${principal}, simple interest ${rate}% per year, for ${years} years. Interest earned?`,
        promptZh: `学生账户本金 $${principal}，年单利 ${rate}% ，存 ${years} 年。可得利息多少？`,
        answer: String(interest),
        hints: [
          { en: "Use I = P×r×t.", zh: "使用公式 I = P×r×t。" },
          { en: "Convert ${rate}% to ${rate / 100} before multiplying.", zh: `先把 ${rate}% 转为小数 ${rate / 100}。` },
        ],
        explanationEn: `I = ${principal}×${rate / 100}×${years} = ${interest}. Insight: simple interest grows linearly in time.`,
        explanationZh: `I = ${principal}×${rate / 100}×${years} = ${interest}。数学洞察：单利对时间是线性增长。`,
        domain: "WORD_PROBLEMS",
        knowledgePointSlug: "simple-interest",
        level,
      };
    },
    () => {
      const principal = randInt(500, 1800);
      const target = randInt(50, 300);
      const rate = randInt(2, 8);
      const years = fractionString(100 * target, principal * rate);
      return {
        promptEn: `Simple interest plan: principal $${principal}, annual rate ${rate}%. How many years to earn $${target} interest?`,
        promptZh: `单利方案：本金 $${principal}，年利率 ${rate}%。要获得 $${target} 利息需要多少年？`,
        answer: years,
        hints: [
          { en: "Start from I = P×r×t and solve for t.", zh: "从 I = P×r×t 出发，变形求 t。" },
          { en: "Use fraction form to keep exactness before simplification.", zh: "先保留分数形式，再做约分更精确。" },
        ],
        explanationEn: `t = I/(P×r) = ${target}/(${principal}×${rate / 100}) = ${years}. Insight: algebraic rearrangement turns financial formulas into unknown-time models.`,
        explanationZh: `t = I/(P×r) = ${target}/(${principal}×${rate / 100}) = ${years}。数学洞察：金融公式本质也是代数方程变形。`,
        domain: "WORD_PROBLEMS",
        knowledgePointSlug: "simple-interest",
        level,
      };
    },
  ];

  return pick(templates)();
}

function buildFunFact(domain: MasteryDomain, knowledgePointSlug: string): { funFactEn: string; funFactZh: string } {
  const byDomain: Record<MasteryDomain, Array<{ en: string; zh: string }>> = {
    ARITHMETIC: [
      { en: "Mental math gets faster when you group numbers into easy chunks first.", zh: "心算先“凑整分组”，速度会明显提升。" },
      { en: "Many quick calculations are just smart rearrangements, not harder operations.", zh: "很多快算并不是更难计算，而是更聪明的重排。" },
    ],
    ALGEBRA: [
      { en: "The equal sign means balance, not “write the answer next”.", zh: "等号表示“平衡关系”，不只是“写答案”。" },
      { en: "Good algebra is often careful bookkeeping of operations in reverse order.", zh: "代数的关键常是按逆序严谨“撤销运算”。" },
    ],
    GEOMETRY: [
      { en: "Complex shapes are often solved by cutting them into rectangles and triangles.", zh: "复杂图形常可拆成矩形和三角形来求解。" },
      { en: "A distance on a map can often be seen as a right-triangle side.", zh: "地图上的位移经常可以转化为直角三角形边长问题。" },
    ],
    FRACTIONS: [
      { en: "A denominator tells the unit size; matching unit sizes is the key to adding fractions.", zh: "分母决定单位大小；分数相加先统一单位最关键。" },
      { en: "Simplifying fractions is preserving value while changing representation.", zh: "分数约分是“数值不变、表示更简”。" },
    ],
    NUMBER_THEORY: [
      { en: "GCD and LCM are two views of the same structure: factors and multiples.", zh: "GCD 与 LCM 是同一结构的两面：因数与倍数。" },
      { en: "Prime testing up to sqrt(n) works because factors come in pairs.", zh: "只检验到 sqrt(n) 就够，因为因数总成对出现。" },
    ],
    PROBABILITY: [
      { en: "Complement events can turn hard counting into easy subtraction from 1.", zh: "补事件能把复杂计数变成“从 1 减去”。" },
      { en: "Conditional probability changes the sample space before you compute.", zh: "条件概率先改变样本空间，再进行计算。" },
    ],
    STATISTICS: [
      { en: "Mean is sensitive to extremes, median is usually more robust.", zh: "平均数对极端值敏感，中位数通常更稳健。" },
      { en: "Reading data well is often more valuable than just computing a formula.", zh: "会读数据结构，往往比机械代公式更重要。" },
    ],
    TRIGONOMETRY: [
      { en: "Trig ratios describe shape, so similar triangles share the same ratio values.", zh: "三角比描述的是形状，因此相似三角形比值相同。" },
      { en: "Special-angle values are anchors for quick estimates in navigation and physics.", zh: "特殊角函数值是导航和物理估算的重要锚点。" },
    ],
    CALCULUS: [
      { en: "Derivative asks “how fast now”, integral asks “how much in total”.", zh: "导数问“此刻多快”，积分问“总共多少”。" },
      { en: "The Fundamental Theorem links rates and accumulation in one bridge.", zh: "微积分基本定理把“变化率”和“累积量”连接起来。" },
    ],
    WORD_PROBLEMS: [
      { en: "Most word problems become easier after rewriting the story as variables and units.", zh: "应用题先翻译成“变量+单位”，难度会立刻下降。" },
      { en: "Unit checks catch many mistakes before you finish calculating.", zh: "单位检查常能在计算结束前抓住大部分错误。" },
    ],
  };

  const byKnowledgePoint: Record<string, { en: string; zh: string }> = {
    "conditional-probability": {
      en: "P(A|B) is not the same as P(B|A); direction matters.",
      zh: "P(A|B) 与 P(B|A) 一般不相同，方向非常关键。",
    },
    "pythagorean-theorem": {
      en: "The 3-4-5 triangle is a classic integer right triangle used everywhere.",
      zh: "3-4-5 是最经典的整数组直角三角形之一。",
    },
  };

  const selected = byKnowledgePoint[knowledgePointSlug] ?? pick(byDomain[domain]);
  return { funFactEn: selected.en, funFactZh: selected.zh };
}

export function buildAdaptiveQuestion(input: BuildInput): AdaptiveQuestion {
  const domain = inferDomainFromTag(input.tagName);
  const level = recommendNextLevel(input.profile);

  const coreQuestion = (() => {
    switch (domain) {
    case "ARITHMETIC":
      return buildArithmetic(level);
    case "ALGEBRA":
      return buildAlgebra(level);
    case "GEOMETRY":
      return buildGeometry(level);
    case "FRACTIONS":
      return buildFractions(level);
    case "NUMBER_THEORY":
      return buildNumberTheory(level);
    case "PROBABILITY":
      return buildProbability(level);
    case "STATISTICS":
      return buildStatistics(level);
    case "TRIGONOMETRY":
      return buildTrigonometry(level);
    case "CALCULUS":
      return buildCalculus(level);
    case "WORD_PROBLEMS":
      return buildWordProblem(level);
    default:
      return buildArithmetic(level);
    }
  })();

  return {
    ...coreQuestion,
    ...buildFunFact(coreQuestion.domain, coreQuestion.knowledgePointSlug),
  };
}
