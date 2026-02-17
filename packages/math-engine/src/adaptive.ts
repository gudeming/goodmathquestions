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
    const a = randInt(20, 99);
    const b = randInt(20, 99);
    return {
      promptEn: `Compute ${a} + ${b}.`,
      promptZh: `计算 ${a} + ${b}。`,
      answer: String(a + b),
      hints: [
        { en: "Add tens first, then ones.", zh: "先加十位，再加个位。" },
      ],
      explanationEn: `${a} + ${b} = ${a + b}.`,
      explanationZh: `${a} + ${b} = ${a + b}。`,
      domain: "ARITHMETIC",
      knowledgePointSlug: "addition-subtraction",
      level,
    };
  }

  if (level <= 4) {
    const a = randInt(12, 45);
    const b = randInt(11, 29);
    return {
      promptEn: `Compute ${a} × ${b}.`,
      promptZh: `计算 ${a} × ${b}。`,
      answer: String(a * b),
      hints: [
        { en: "Use distributive property.", zh: "尝试用分配律。" },
      ],
      explanationEn: `${a} × ${b} = ${a * b}.`,
      explanationZh: `${a} × ${b} = ${a * b}。`,
      domain: "ARITHMETIC",
      knowledgePointSlug: "multiplication",
      level,
    };
  }

  const a = randInt(4, 9);
  const b = randInt(3, 5);
  return {
    promptEn: `Evaluate ${a}^${b}.`,
    promptZh: `计算 ${a} 的 ${b} 次方。`,
    answer: String(a ** b),
    hints: [{ en: "Multiply the base repeatedly.", zh: "把底数重复相乘。" }],
    explanationEn: `${a}^${b} = ${a ** b}.`,
    explanationZh: `${a}^${b} = ${a ** b}。`,
    domain: "ARITHMETIC",
    knowledgePointSlug: "exponentiation",
    level,
  };
}

function buildAlgebra(level: number): AdaptiveQuestion {
  if (level <= 2) {
    const x = randInt(4, 24);
    const b = randInt(3, 11);
    return {
      promptEn: `Solve x + ${b} = ${x + b}.`,
      promptZh: `解方程 x + ${b} = ${x + b}。`,
      answer: String(x),
      hints: [{ en: "Subtract on both sides.", zh: "方程两边同时相减。" }],
      explanationEn: `x = ${x + b} - ${b} = ${x}.`,
      explanationZh: `x = ${x + b} - ${b} = ${x}。`,
      domain: "ALGEBRA",
      knowledgePointSlug: "linear-equations-basic",
      level,
    };
  }

  if (level <= 4) {
    const x = randInt(3, 16);
    const a = randInt(2, 9);
    const b = randInt(3, 18);
    return {
      promptEn: `Solve ${a}x - ${b} = ${a * x - b}.`,
      promptZh: `解方程 ${a}x - ${b} = ${a * x - b}。`,
      answer: String(x),
      hints: [{ en: "Undo subtraction, then divide.", zh: "先消去减法，再除系数。" }],
      explanationEn: `${a}x = ${a * x}. So x = ${(a * x)}/${a} = ${x}.`,
      explanationZh: `${a}x = ${a * x}，所以 x = ${(a * x)}/${a} = ${x}。`,
      domain: "ALGEBRA",
      knowledgePointSlug: "linear-equations-multi",
      level,
    };
  }

  const r1 = randInt(2, 9);
  const r2 = randInt(10, 18);
  const b = -(r1 + r2);
  const c = r1 * r2;
  return {
    promptEn: `For x^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}x + ${c} = 0, enter the larger root.`,
    promptZh: `方程 x^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}x + ${c} = 0，输入较大的根。`,
    answer: String(Math.max(r1, r2)),
    hints: [{ en: "Try factoring the quadratic.", zh: "尝试因式分解。" }],
    explanationEn: `Factors are (x-${r1})(x-${r2})=0, larger root is ${Math.max(r1, r2)}.`,
    explanationZh: `分解为 (x-${r1})(x-${r2})=0，较大根是 ${Math.max(r1, r2)}。`,
    domain: "ALGEBRA",
    knowledgePointSlug: "quadratic-equations",
    level,
  };
}

function buildGeometry(level: number): AdaptiveQuestion {
  if (level <= 2) {
    const l = randInt(4, 16);
    const w = randInt(3, 12);
    return {
      promptEn: `A rectangle is ${l} by ${w}. Find the area.`,
      promptZh: `一个长方形长 ${l}、宽 ${w}，求面积。`,
      answer: String(l * w),
      hints: [{ en: "Area = length × width.", zh: "面积=长×宽。" }],
      explanationEn: `${l} × ${w} = ${l * w}.`,
      explanationZh: `${l} × ${w} = ${l * w}。`,
      domain: "GEOMETRY",
      knowledgePointSlug: "area-perimeter",
      level,
    };
  }

  const a = randInt(3, 12);
  const b = randInt(4, 13);
  const c = Math.hypot(a, b);
  return {
    promptEn: `Right triangle legs are ${a} and ${b}. Round hypotenuse to 2 decimals.`,
    promptZh: `直角三角形两条直角边是 ${a} 和 ${b}，斜边保留2位小数。`,
    answer: c.toFixed(2),
    hints: [{ en: "Use a² + b² = c².", zh: "使用勾股定理 a²+b²=c²。" }],
    explanationEn: `c = sqrt(${a * a}+${b * b}) = ${c.toFixed(2)}.`,
    explanationZh: `c = sqrt(${a * a}+${b * b}) = ${c.toFixed(2)}。`,
    domain: "GEOMETRY",
    knowledgePointSlug: "pythagorean-theorem",
    level,
  };
}

function buildFractions(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const den = randInt(4, 12);
    const a = randInt(1, den - 1);
    const b = randInt(1, den - a);
    return {
      promptEn: `Compute ${a}/${den} + ${b}/${den}. Simplify.`,
      promptZh: `计算 ${a}/${den} + ${b}/${den}，并化简。`,
      answer: `${a + b}/${den}`,
      hints: [{ en: "Same denominator: add numerators.", zh: "同分母，分子相加。" }],
      explanationEn: `${a}+${b} = ${a + b}, so ${(a + b)}/${den}.`,
      explanationZh: `分子相加得 ${a + b}，结果 ${(a + b)}/${den}。`,
      domain: "FRACTIONS",
      knowledgePointSlug: "same-denominator",
      level,
    };
  }

  const a = randInt(1, 7);
  const b = randInt(2, 9);
  const c = randInt(1, 7);
  const d = randInt(2, 9);
  const num = a * d + c * b;
  const den = b * d;
  return {
    promptEn: `Compute ${a}/${b} + ${c}/${d}. Answer as a fraction.`,
    promptZh: `计算 ${a}/${b} + ${c}/${d}，用分数作答。`,
    answer: `${num}/${den}`,
    hints: [{ en: "Use common denominator.", zh: "先通分到共同分母。" }],
    explanationEn: `(${a}*${d} + ${c}*${b})/(${b}*${d}) = ${num}/${den}.`,
    explanationZh: `(${a}*${d} + ${c}*${b})/(${b}*${d}) = ${num}/${den}。`,
    domain: "FRACTIONS",
    knowledgePointSlug: "different-denominator",
    level,
  };
}

function buildNumberTheory(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const a = randInt(20, 80);
    const b = randInt(20, 80);
    const g = gcd(a, b);
    return {
      promptEn: `Find gcd(${a}, ${b}).`,
      promptZh: `求 gcd(${a}, ${b})。`,
      answer: String(g),
      hints: [{ en: "List factors or use Euclidean algorithm.", zh: "可列因数或用欧几里得算法。" }],
      explanationEn: `Greatest common divisor is ${g}.`,
      explanationZh: `最大公约数是 ${g}。`,
      domain: "NUMBER_THEORY",
      knowledgePointSlug: "gcd-lcm",
      level,
    };
  }

  const n = randInt(50, 150);
  return {
    promptEn: `Is ${n} prime? Answer yes or no.`,
    promptZh: `${n} 是质数吗？回答 yes 或 no。`,
    answer: isPrime(n) ? "yes" : "no",
    hints: [{ en: "Check divisibility up to sqrt(n).", zh: "检查到 sqrt(n) 即可。" }],
    explanationEn: `${n} is ${isPrime(n) ? "prime" : "not prime"}.`,
    explanationZh: `${n}${isPrime(n) ? "是" : "不是"}质数。`,
    domain: "NUMBER_THEORY",
    knowledgePointSlug: "primality",
    level,
  };
}

function buildProbability(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const total = randInt(6, 12);
    const good = randInt(1, total - 1);
    return {
      promptEn: `A bag has ${good} red and ${total - good} blue balls. P(red)=? (fraction)`,
      promptZh: `袋子里有 ${good} 个红球和 ${total - good} 个蓝球。P(红)=？（分数）`,
      answer: `${good}/${total}`,
      hints: [{ en: "Probability = favorable/total.", zh: "概率=有利结果/总结果。" }],
      explanationEn: `P = ${good}/${total}.`,
      explanationZh: `P = ${good}/${total}。`,
      domain: "PROBABILITY",
      knowledgePointSlug: "basic-probability",
      level,
    };
  }

  const pAandB = randInt(1, 4) / 10;
  const pB = randInt(5, 9) / 10;
  const ans = (pAandB / pB).toFixed(2);
  return {
    promptEn: `If P(A∩B)=${pAandB} and P(B)=${pB}, find P(A|B). Round to 2 decimals.`,
    promptZh: `若 P(A∩B)=${pAandB} 且 P(B)=${pB}，求 P(A|B)，保留2位小数。`,
    answer: ans,
    hints: [{ en: "Use conditional formula.", zh: "使用条件概率公式。" }],
    explanationEn: `P(A|B)=P(A∩B)/P(B)=${ans}.`,
    explanationZh: `P(A|B)=P(A∩B)/P(B)=${ans}。`,
    domain: "PROBABILITY",
    knowledgePointSlug: "conditional-probability",
    level,
  };
}

function buildStatistics(level: number): AdaptiveQuestion {
  const nums = Array.from({ length: 5 }, () => randInt(60, 100));
  if (level <= 3) {
    const mean = nums.reduce((s, n) => s + n, 0) / nums.length;
    return {
      promptEn: `Find the mean of ${nums.join(", ")}.`,
      promptZh: `求 ${nums.join("、")} 的平均数。`,
      answer: mean.toFixed(2),
      hints: [{ en: "Sum then divide by count.", zh: "先求和，再除以个数。" }],
      explanationEn: `Mean = ${mean.toFixed(2)}.`,
      explanationZh: `平均数 = ${mean.toFixed(2)}。`,
      domain: "STATISTICS",
      knowledgePointSlug: "mean",
      level,
    };
  }

  nums.sort((a, b) => a - b);
  return {
    promptEn: `Find the median of ${nums.join(", ")}.`,
    promptZh: `求 ${nums.join("、")} 的中位数。`,
    answer: String(nums[2]),
    hints: [{ en: "Sort first.", zh: "先排序。" }],
    explanationEn: `The middle value is ${nums[2]}.`,
    explanationZh: `中间的数是 ${nums[2]}。`,
    domain: "STATISTICS",
    knowledgePointSlug: "median",
    level,
  };
}

function buildTrigonometry(level: number): AdaptiveQuestion {
  const specials = [
    { prompt: "sin(30°)", answer: "1/2" },
    { prompt: "cos(60°)", answer: "1/2" },
    { prompt: "tan(45°)", answer: "1" },
  ];

  if (level <= 3) {
    const q = specials[randInt(0, specials.length - 1)];
    return {
      promptEn: `Evaluate ${q.prompt}.`,
      promptZh: `计算 ${q.prompt}。`,
      answer: q.answer,
      hints: [{ en: "Recall special-angle triangle values.", zh: "回忆特殊角三角函数值。" }],
      explanationEn: `${q.prompt} = ${q.answer}.`,
      explanationZh: `${q.prompt} = ${q.answer}。`,
      domain: "TRIGONOMETRY",
      knowledgePointSlug: "special-angles",
      level,
    };
  }

  const opp = randInt(3, 10);
  const hyp = opp + randInt(2, 10);
  return {
    promptEn: `In a right triangle, opposite=${opp}, hypotenuse=${hyp}. Find sin(theta).`,
    promptZh: `直角三角形中，对边=${opp}，斜边=${hyp}，求 sin(theta)。`,
    answer: `${opp}/${hyp}`,
    hints: [{ en: "sin = opposite/hypotenuse.", zh: "sin=对边/斜边。" }],
    explanationEn: `sin(theta)=${opp}/${hyp}.`,
    explanationZh: `sin(theta)=${opp}/${hyp}。`,
    domain: "TRIGONOMETRY",
    knowledgePointSlug: "soh-cah-toa",
    level,
  };
}

function buildCalculus(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const a = randInt(2, 9);
    const n = randInt(2, 6);
    return {
      promptEn: `Find d/dx of ${a}x^${n}.`,
      promptZh: `求 ${a}x^${n} 的导数。`,
      answer: `${a * n}x^${n - 1}`,
      hints: [{ en: "Use power rule.", zh: "使用幂函数求导法则。" }],
      explanationEn: `Derivative is ${a * n}x^${n - 1}.`,
      explanationZh: `导数是 ${a * n}x^${n - 1}。`,
      domain: "CALCULUS",
      knowledgePointSlug: "derivatives-power-rule",
      level,
    };
  }

  const upper = randInt(2, 8);
  return {
    promptEn: `Compute integral from 0 to ${upper} of x dx.`,
    promptZh: `计算从 0 到 ${upper} 的积分 ∫x dx。`,
    answer: String((upper * upper) / 2),
    hints: [{ en: "Antiderivative of x is x^2/2.", zh: "x 的原函数是 x^2/2。" }],
    explanationEn: `Value = (${upper}^2)/2 = ${(upper * upper) / 2}.`,
    explanationZh: `结果 = (${upper}^2)/2 = ${(upper * upper) / 2}。`,
    domain: "CALCULUS",
    knowledgePointSlug: "definite-integrals",
    level,
  };
}

function buildWordProblem(level: number): AdaptiveQuestion {
  if (level <= 3) {
    const speed = randInt(30, 90);
    const hours = randInt(2, 6);
    return {
      promptEn: `A bike goes ${speed} miles/hour for ${hours} hours. Distance?`,
      promptZh: `自行车速度 ${speed} 英里/小时，骑行 ${hours} 小时，路程是多少？`,
      answer: String(speed * hours),
      hints: [{ en: "Distance = speed × time.", zh: "路程=速度×时间。" }],
      explanationEn: `${speed} × ${hours} = ${speed * hours}.`,
      explanationZh: `${speed} × ${hours} = ${speed * hours}。`,
      domain: "WORD_PROBLEMS",
      knowledgePointSlug: "distance-speed-time",
      level,
    };
  }

  const principal = randInt(200, 1200);
  const rate = randInt(2, 8);
  const years = randInt(1, 5);
  const interest = (principal * rate * years) / 100;
  return {
    promptEn: `Simple interest on $${principal} at ${rate}% for ${years} years?`,
    promptZh: `$${principal} 按 ${rate}% 年利率，${years} 年单利是多少？`,
    answer: String(interest),
    hints: [{ en: "Use I = P*r*t.", zh: "使用 I = P*r*t。" }],
    explanationEn: `I = ${principal} * ${rate / 100} * ${years} = ${interest}.`,
    explanationZh: `I = ${principal} * ${rate / 100} * ${years} = ${interest}。`,
    domain: "WORD_PROBLEMS",
    knowledgePointSlug: "simple-interest",
    level,
  };
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

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

export function buildAdaptiveQuestion(input: BuildInput): AdaptiveQuestion {
  const domain = inferDomainFromTag(input.tagName);
  const level = recommendNextLevel(input.profile);

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
}
