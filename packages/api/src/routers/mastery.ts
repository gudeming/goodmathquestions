import { randomUUID } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  buildAdaptiveQuestion,
  KNOWLEDGE_POINT_TAXONOMY,
  validateAnswer,
  type MasteryDomain,
  type MasteryProfile,
} from "@gmq/math-engine";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

const profileSchema = z.object({
  accuracy: z.number().min(0).max(1),
  avgTimeMs: z.number().min(0).max(300000),
  streak: z.number().int().min(0).max(10000),
  level: z.number().int().min(1).max(5),
});

type ActiveGeneratedQuestion = {
  answer: string;
  explanationEn: string;
  explanationZh: string;
  hints: Array<{ en: string; zh: string }>;
  createdAt: number;
  level: number;
  domain: string;
  knowledgePointSlug: string;
};

const activeQuestionStore = new Map<string, ActiveGeneratedQuestion>();
const recentTemplateStore = new Map<string, string[]>();
const RECENT_TEMPLATE_WINDOW = 6;

const GRADE_DOMAIN_MAP: Record<string, MasteryDomain[]> = {
  GRADE_4: ["ARITHMETIC", "FRACTIONS", "GEOMETRY", "WORD_PROBLEMS", "NUMBER_THEORY", "PROBABILITY"],
  GRADE_5: ["ARITHMETIC", "FRACTIONS", "GEOMETRY", "ALGEBRA", "WORD_PROBLEMS", "PROBABILITY"],
  GRADE_6: ["ARITHMETIC", "FRACTIONS", "ALGEBRA", "GEOMETRY", "NUMBER_THEORY", "PROBABILITY", "STATISTICS"],
  GRADE_7: ["ALGEBRA", "GEOMETRY", "NUMBER_THEORY", "PROBABILITY", "STATISTICS", "WORD_PROBLEMS"],
  GRADE_8: ["ALGEBRA", "GEOMETRY", "TRIGONOMETRY", "PROBABILITY", "STATISTICS", "WORD_PROBLEMS"],
};

const ENCOURAGEMENTS_EN = [
  "Great effort. You're getting stronger with each try.",
  "Nice persistence. Mistakes are part of learning math.",
  "Good attempt. Let's adjust and tackle the next one.",
];

const ENCOURAGEMENTS_ZH = [
  "你已经很努力了，每次尝试都在进步。",
  "坚持得很好，做错是学会数学的一部分。",
  "这次尝试不错，我们调整一下继续下一题。",
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const ELEMENTARY_CHECK_DOMAINS: MasteryDomain[] = [
  "ARITHMETIC",
  "FRACTIONS",
  "GEOMETRY",
  "WORD_PROBLEMS",
  "NUMBER_THEORY",
  "PROBABILITY",
];

const MIDDLE_CHECK_DOMAINS: MasteryDomain[] = [
  "ARITHMETIC",
  "FRACTIONS",
  "ALGEBRA",
  "GEOMETRY",
  "NUMBER_THEORY",
  "PROBABILITY",
  "STATISTICS",
  "WORD_PROBLEMS",
];

const HIGH_CHECK_DOMAINS: MasteryDomain[] = [
  "ALGEBRA",
  "GEOMETRY",
  "TRIGONOMETRY",
  "PROBABILITY",
  "STATISTICS",
  "CALCULUS",
  "WORD_PROBLEMS",
];

function isKnowledgeCheckTag(tagName: string): boolean {
  const t = tagName.trim().toLowerCase();
  return t === "knowledge_check" || t === "知识检查";
}

function resolveKnowledgeCheckDomain(attempts: number): MasteryDomain {
  // 0-5: elementary, 6-11: middle, 12+: high school
  if (attempts <= 5) {
    return ELEMENTARY_CHECK_DOMAINS[attempts % ELEMENTARY_CHECK_DOMAINS.length];
  }
  if (attempts <= 11) {
    const idx = (attempts - 6) % MIDDLE_CHECK_DOMAINS.length;
    return MIDDLE_CHECK_DOMAINS[idx];
  }
  const idx = (attempts - 12) % HIGH_CHECK_DOMAINS.length;
  return HIGH_CHECK_DOMAINS[idx];
}

function resolveGenerationTag(tagName: string, attempts = 0): string {
  if (isKnowledgeCheckTag(tagName)) {
    return resolveKnowledgeCheckDomain(attempts);
  }

  const normalized = tagName.trim().toUpperCase().replace(/\s+/g, "_");
  const gradeDomains = GRADE_DOMAIN_MAP[normalized];
  if (gradeDomains && gradeDomains.length > 0) {
    return pickRandom(gradeDomains);
  }
  return tagName;
}

const KNOWLEDGE_POINT_DETAILED_NOTES: Record<
  string,
  {
    en: string;
    zh: string;
  }
> = {
  "addition-subtraction": {
    en: "Concept: Addition and subtraction are inverse operations. Principle: keep place values aligned (ones, tens, hundreds). Method: compute from right to left, carry when sum >= 10, borrow when top digit is smaller. Check: result + subtrahend should return minuend.",
    zh: "知识点：加减法互为逆运算。原理：按位对齐（个位、十位、百位）再运算。方法：从右向左计算；加法满10进1，减法不够减就借1。验算：差 + 减数 = 被减数，或和 - 一个加数 = 另一个加数。",
  },
  multiplication: {
    en: "Concept: Multiplication is repeated addition and area scaling. Formula: a x b = sum of b repeated a times. Principle: distributive law a(b + c) = ab + ac helps mental math and decomposition. Method: split numbers by place value, multiply parts, then add.",
    zh: "知识点：乘法是重复加法，也可理解为面积放大。公式：a x b 表示把 b 重复相加 a 次。原理：分配律 a(b + c) = ab + ac。方法：按位拆分后分别相乘，再把部分积相加。",
  },
  exponentiation: {
    en: "Concept: Exponentiation is repeated multiplication. Formula: a^n = a x a x ... x a (n terms). Core rules: a^m x a^n = a^(m+n), (a^m)^n = a^(mn), a^0 = 1 (a != 0). Use exponent rules before expanding to reduce errors.",
    zh: "知识点：幂运算是重复乘法。公式：a^n = a x a x ... x a（共 n 个）。核心法则：a^m x a^n = a^(m+n)，(a^m)^n = a^(mn)，a^0 = 1（a != 0）。先用幂的法则化简，再展开计算更稳。",
  },
  "linear-equations-basic": {
    en: "Concept: Solve for unknown by keeping equation balanced. Principle: whatever you do to one side, do to the other side. Method: move constants and coefficients step by step until x = value. Typical form: ax + b = c, so x = (c - b)/a.",
    zh: "知识点：解方程本质是保持等式平衡。原理：等式两边同时进行相同运算。方法：逐步移项和化简，直到 x = 数值。常见形式 ax + b = c，解为 x = (c - b)/a。",
  },
  "linear-equations-multi": {
    en: "Concept: Multi-step linear equations require simplifying both sides first. Principle: combine like terms and clear parentheses using distributive law. Method: simplify -> move variable terms to one side -> constants to the other -> divide by coefficient.",
    zh: "知识点：多步一元一次方程先化简再求解。原理：合并同类项，利用分配律去括号。方法：先化简两边，再把含 x 的项移到一边、常数移到另一边，最后除以系数得到解。",
  },
  "quadratic-equations": {
    en: "Concept: Quadratic equation has degree 2. Forms: ax^2 + bx + c = 0. Methods: factoring, completing square, or quadratic formula x = (-b ± sqrt(b^2 - 4ac)) / (2a). Discriminant Delta = b^2 - 4ac determines root type.",
    zh: "知识点：一元二次方程次数为 2。标准式：ax^2 + bx + c = 0。解法：因式分解、配方法、求根公式 x = (-b ± sqrt(b^2 - 4ac)) / (2a)。判别式 Delta = b^2 - 4ac 决定根的个数与类型。",
  },
  "area-perimeter": {
    en: "Concept: Perimeter measures boundary length; area measures covered surface. Formulas: rectangle perimeter P = 2(l + w), area A = l x w; triangle area A = 1/2 x base x height. Keep units consistent and square units for area.",
    zh: "知识点：周长是边界总长度，面积是平面覆盖大小。常用公式：长方形周长 P = 2(长+宽)，面积 A = 长 x 宽；三角形面积 A = 1/2 x 底 x 高。注意单位统一，面积用平方单位。",
  },
  "pythagorean-theorem": {
    en: "Concept: In a right triangle, square of hypotenuse equals sum of squares of legs. Formula: a^2 + b^2 = c^2 (c is hypotenuse). Use it to find missing side or verify right triangle.",
    zh: "知识点：直角三角形中，斜边平方等于两直角边平方和。公式：a^2 + b^2 = c^2（c 为斜边）。可用于求未知边，也可检验是否为直角三角形。",
  },
  "same-denominator": {
    en: "Concept: Fractions with same denominator compare/add/subtract by numerators. Formula: a/n ± b/n = (a ± b)/n. Principle: denominator stays because unit size is unchanged.",
    zh: "知识点：同分母分数比较或加减只处理分子。公式：a/n ± b/n = (a ± b)/n。原理：分母表示单位大小不变，所以分母保持不变。",
  },
  "different-denominator": {
    en: "Concept: Different denominators must be converted to common denominator first. Formula: a/b ± c/d = (ad ± bc)/bd; usually simplify by LCM. Method: find common denominator -> convert -> operate -> reduce fraction.",
    zh: "知识点：异分母分数先通分再计算。公式：a/b ± c/d = (ad ± bc)/bd，实际常先用最小公倍数通分。步骤：找公分母 -> 改写分数 -> 计算 -> 约分。",
  },
  "gcd-lcm": {
    en: "Concept: GCD is largest common divisor; LCM is smallest common multiple. Relationship: gcd(a,b) x lcm(a,b) = a x b (for positive integers). Use prime factorization to compute both efficiently.",
    zh: "知识点：最大公约数（GCD）是共同约数里最大的；最小公倍数（LCM）是共同倍数里最小的。关系：gcd(a,b) x lcm(a,b) = a x b（正整数）。可用质因数分解高效求解。",
  },
  primality: {
    en: "Concept: A prime number has exactly two positive divisors: 1 and itself. Method: test divisibility only up to sqrt(n). If no divisor in [2, sqrt(n)], n is prime.",
    zh: "知识点：质数只有两个正因数：1 和它本身。方法：只需检验到 sqrt(n) 为止；若在 [2, sqrt(n)] 内无因数，则 n 为质数。",
  },
  "basic-probability": {
    en: "Concept: Probability quantifies chance. Formula: P(E) = favorable outcomes / total equally likely outcomes. Range: 0 <= P(E) <= 1. Use counting carefully and avoid double counting.",
    zh: "知识点：概率用于量化事件发生可能性。公式：P(E) = 有利结果数 / 总结果数（等可能前提）。范围：0 <= P(E) <= 1。计数时要避免重复统计。",
  },
  "conditional-probability": {
    en: "Concept: Conditional probability measures chance of A given B occurred. Formula: P(A|B) = P(A ∩ B) / P(B), with P(B) > 0. For independent events, P(A|B) = P(A).",
    zh: "知识点：条件概率是“在 B 已发生前提下 A 的概率”。公式：P(A|B) = P(A ∩ B) / P(B)，且 P(B) > 0。若 A 与 B 独立，则 P(A|B) = P(A)。",
  },
  mean: {
    en: "Concept: Mean is arithmetic average. Formula: mean = (sum of all values) / (number of values). Sensitive to outliers, so compare with median when data has extremes.",
    zh: "知识点：平均数是算术平均。公式：平均数 = 全部数据之和 / 数据个数。平均数受极端值影响较大，数据偏斜时应结合中位数一起分析。",
  },
  median: {
    en: "Concept: Median is middle value after sorting. If count is odd, take center; if even, average two center values. Median is robust to outliers.",
    zh: "知识点：中位数是数据排序后的中间值。奇数个数据取正中；偶数个取中间两个的平均。中位数对极端值不敏感，更稳健。",
  },
  "special-angles": {
    en: "Concept: Special angles have memorized trig values. Common values: sin30 = 1/2, cos30 = sqrt(3)/2, sin45 = cos45 = sqrt(2)/2, sin60 = sqrt(3)/2, cos60 = 1/2.",
    zh: "知识点：特殊角有常用三角函数值。常见：sin30 = 1/2，cos30 = sqrt(3)/2，sin45 = cos45 = sqrt(2)/2，sin60 = sqrt(3)/2，cos60 = 1/2。",
  },
  "soh-cah-toa": {
    en: "Concept: Right-triangle trig ratios. Formulas: sin(theta)=Opp/Hyp, cos(theta)=Adj/Hyp, tan(theta)=Opp/Adj. Strategy: identify angle first, then label opposite/adjacent/hypotenuse correctly.",
    zh: "知识点：直角三角形三角函数比。公式：sin(theta)=对边/斜边，cos(theta)=邻边/斜边，tan(theta)=对边/邻边。关键是先确定参考角，再正确标出对边、邻边、斜边。",
  },
  "derivatives-power-rule": {
    en: "Concept: Derivative represents instantaneous rate of change/slope. Power rule: d/dx(x^n) = n*x^(n-1). Extend linearly: d/dx[a*f(x)+b*g(x)] = a*f'(x)+b*g'(x).",
    zh: "知识点：导数表示瞬时变化率（切线斜率）。幂函数求导公式：d/dx(x^n) = n*x^(n-1)。并满足线性：d/dx[a*f(x)+b*g(x)] = a*f'(x)+b*g'(x)。",
  },
  "definite-integrals": {
    en: "Concept: Definite integral gives signed area accumulation. Fundamental theorem: integral_a^b f(x)dx = F(b)-F(a), where F' = f. Steps: find antiderivative, substitute bounds, subtract.",
    zh: "知识点：定积分表示区间上的累积量（带符号面积）。微积分基本定理：integral_a^b f(x)dx = F(b)-F(a)，其中 F' = f。步骤：先求原函数，再代入上下限相减。",
  },
  "distance-speed-time": {
    en: "Concept: Motion problems connect distance, speed, and time. Core formulas: d = v*t, v = d/t, t = d/v. Keep units consistent (e.g., km/h with hours).",
    zh: "知识点：行程问题的核心关系是路程、速度、时间。公式：d = v*t，v = d/t，t = d/v。注意单位一致（如 km/h 要配小时）。",
  },
  "simple-interest": {
    en: "Concept: Simple interest grows linearly with time. Formula: I = P*r*t, total amount A = P + I = P(1 + r*t). Here P principal, r annual rate, t years.",
    zh: "知识点：单利随时间线性增长。公式：I = P*r*t，总额 A = P + I = P(1 + r*t)。其中 P 是本金，r 是年利率，t 是年数。",
  },
};

function getKnowledgePointConcept(knowledgePointSlug: string): { en: string; zh: string } {
  const kp = KNOWLEDGE_POINT_TAXONOMY.find((item) => item.slug === knowledgePointSlug);
  const detailed = KNOWLEDGE_POINT_DETAILED_NOTES[knowledgePointSlug];
  if (detailed) return detailed;

  if (!kp) {
    return {
      en: "Concept summary: identify knowns/unknowns, choose the correct formula, then solve step by step and verify with units/bounds.",
      zh: "知识点总结：先识别已知与未知，再选择对应公式，按步骤计算并检查单位与结果范围。",
    };
  }

  return {
    en: `Knowledge point: ${kp.nameEn}. Principle: map the problem to its standard model, apply the core formula, then validate by substitution or estimation.`,
    zh: `知识点：${kp.nameZh}。原理：先把题目映射到标准模型，应用核心公式，再用代入或估算做验算。`,
  };
}

function pruneStore() {
  const now = Date.now();
  const ttlMs = 1000 * 60 * 60; // 1h
  for (const [id, q] of activeQuestionStore.entries()) {
    if (now - q.createdAt > ttlMs) {
      activeQuestionStore.delete(id);
    }
  }

  // hard cap for runaway memory
  if (activeQuestionStore.size > 10000) {
    const ids = Array.from(activeQuestionStore.keys()).slice(0, 2000);
    for (const id of ids) activeQuestionStore.delete(id);
  }

  if (recentTemplateStore.size > 2000) {
    const keys = Array.from(recentTemplateStore.keys()).slice(0, 300);
    for (const key of keys) recentTemplateStore.delete(key);
  }
}

function buildTemplateSignature(input: { domain: string; knowledgePointSlug: string; promptEn: string }): string {
  const normalizedPrompt = input.promptEn
    .toLowerCase()
    .replace(/\d+(\.\d+)?/g, "#")
    .replace(/\s+/g, " ")
    .trim();
  return `${input.domain}|${input.knowledgePointSlug}|${normalizedPrompt}`;
}

function nextProfile(profile: MasteryProfile, isCorrect: boolean, responseTimeMs: number): MasteryProfile {
  const attemptWeight = 0.2;
  const nextAccuracy = isCorrect
    ? profile.accuracy + (1 - profile.accuracy) * attemptWeight
    : profile.accuracy * (1 - attemptWeight);

  const boundedTime = Math.max(1000, Math.min(180000, responseTimeMs));
  const nextAvgTimeMs = profile.avgTimeMs <= 0
    ? boundedTime
    : Math.round(profile.avgTimeMs * 0.7 + boundedTime * 0.3);

  const streak = isCorrect ? profile.streak + 1 : 0;

  let level = profile.level;
  if (nextAccuracy >= 0.85 && nextAvgTimeMs <= 22000 && streak >= 3) level += 1;
  if (nextAccuracy <= 0.55 || nextAvgTimeMs >= 65000) level -= 1;
  level = Math.max(1, Math.min(5, level));

  return {
    accuracy: Math.max(0, Math.min(1, nextAccuracy)),
    avgTimeMs: nextAvgTimeMs,
    streak,
    level,
  };
}

export const masteryRouter = createTRPCRouter({
  listFocusTags: publicProcedure.query(async ({ ctx }) => {
    const tags = await ctx.db.tag.findMany({
      select: {
        nameEn: true,
        nameZh: true,
        _count: { select: { questions: true } },
      },
      orderBy: { questions: { _count: "desc" } },
      take: 80,
    });

    const visibleTags = tags.filter((t) => t._count.questions > 0);
    visibleTags.unshift({
      nameEn: "KNOWLEDGE_CHECK",
      nameZh: "知识检查",
      _count: { questions: 999 },
    });
    return visibleTags;
  }),

  nextQuestion: publicProcedure
    .input(
      z.object({
        tagName: z.string().min(1),
        profile: profileSchema,
        attempts: z.number().int().min(0).max(10000).default(0),
      })
    )
    .mutation(async ({ input }) => {
      pruneStore();

      const generationTag = resolveGenerationTag(input.tagName, input.attempts);
      const recentKey = input.tagName.trim().toUpperCase().replace(/\s+/g, "_");
      const recentSignatures = recentTemplateStore.get(recentKey) ?? [];

      let generated = buildAdaptiveQuestion({
        tagName: generationTag,
        profile: input.profile,
      });
      let signature = buildTemplateSignature(generated);

      // Avoid showing very recent templates in the same challenge track.
      for (let i = 0; i < 8 && recentSignatures.includes(signature); i++) {
        generated = buildAdaptiveQuestion({
          tagName: generationTag,
          profile: input.profile,
        });
        signature = buildTemplateSignature(generated);
      }

      const updatedRecent = [...recentSignatures, signature].slice(-RECENT_TEMPLATE_WINDOW);
      recentTemplateStore.set(recentKey, updatedRecent);

      const id = randomUUID();
      activeQuestionStore.set(id, {
        answer: generated.answer,
        explanationEn: generated.explanationEn,
        explanationZh: generated.explanationZh,
        hints: generated.hints,
        createdAt: Date.now(),
        level: generated.level,
        domain: generated.domain,
        knowledgePointSlug: generated.knowledgePointSlug,
      });

      return {
        questionId: id,
        question: {
          promptEn: generated.promptEn,
          promptZh: generated.promptZh,
          hints: generated.hints,
          level: generated.level,
          domain: generated.domain,
          knowledgePointSlug: generated.knowledgePointSlug,
          funFactEn: generated.funFactEn,
          funFactZh: generated.funFactZh,
        },
      };
    }),

  submitAttempt: publicProcedure
    .input(
      z.object({
        questionId: z.string().min(1),
        userAnswer: z.string().min(1),
        responseTimeMs: z.number().int().min(0).max(300000),
        profile: profileSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      pruneStore();

      const active = activeQuestionStore.get(input.questionId);
      if (!active) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question expired. Please generate a new one.",
        });
      }

      const isCorrect = validateAnswer(input.userAnswer, active.answer);
      const updatedProfile = nextProfile(input.profile, isCorrect, input.responseTimeMs);

      // one-shot question to avoid replay attempts
      activeQuestionStore.delete(input.questionId);

      // Persist per-knowledge-point mastery for authenticated users.
      // Wrapped in try-catch: mastery tracking is best-effort and must
      // never block the answer response (e.g. stale JWT after DB reset).
      const userId = (ctx.session?.user as { id?: string })?.id;
      if (userId && active.knowledgePointSlug) {
        try {
          const kp = await ctx.db.knowledgePoint.findUnique({
            where: { slug: active.knowledgePointSlug },
          });
          if (kp) {
            const existing = await ctx.db.userKnowledgePointMastery.findUnique({
              where: { userId_knowledgePointId: { userId, knowledgePointId: kp.id } },
            });

            if (existing) {
              const newStreak = isCorrect ? existing.streak + 1 : 0;
              await ctx.db.userKnowledgePointMastery.update({
                where: { id: existing.id },
                data: {
                  accuracy: updatedProfile.accuracy,
                  avgTimeMs: updatedProfile.avgTimeMs,
                  streak: newStreak,
                  bestStreak: Math.max(existing.bestStreak, newStreak),
                  level: updatedProfile.level,
                  totalAttempts: { increment: 1 },
                  totalCorrect: isCorrect ? { increment: 1 } : undefined,
                  lastPracticedAt: new Date(),
                },
              });
            } else {
              await ctx.db.userKnowledgePointMastery.create({
                data: {
                  userId,
                  knowledgePointId: kp.id,
                  accuracy: isCorrect ? 0.7 : 0.3,
                  avgTimeMs: input.responseTimeMs,
                  streak: isCorrect ? 1 : 0,
                  bestStreak: isCorrect ? 1 : 0,
                  level: updatedProfile.level,
                  totalAttempts: 1,
                  totalCorrect: isCorrect ? 1 : 0,
                  lastPracticedAt: new Date(),
                },
              });
            }
          }
        } catch (err) {
          console.warn("Mastery tracking failed (non-blocking):", err);
        }
      }

      return {
        isCorrect,
        explanation: { en: active.explanationEn, zh: active.explanationZh },
        conceptNote: getKnowledgePointConcept(active.knowledgePointSlug),
        encouragement: isCorrect
          ? null
          : {
              en: pickRandom(ENCOURAGEMENTS_EN),
              zh: pickRandom(ENCOURAGEMENTS_ZH),
            },
        coachingTip: isCorrect
          ? null
          : {
              en: active.hints[0]?.en ?? "Try breaking the question into smaller steps.",
              zh: active.hints[0]?.zh ?? "试着把题目拆成更小的步骤。",
            },
        updatedProfile,
      };
    }),

  getMyMastery: protectedProcedure.query(async ({ ctx }) => {
    const records = await ctx.db.userKnowledgePointMastery.findMany({
      where: { userId: ctx.session.user.id },
      include: { knowledgePoint: true },
      orderBy: { knowledgePoint: { sortOrder: "asc" } },
    });
    return records;
  }),

  getMyMasteryByDomain: protectedProcedure
    .input(z.object({ domain: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const records = await ctx.db.userKnowledgePointMastery.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input?.domain && {
            knowledgePoint: { domain: input.domain as any },
          }),
        },
        include: { knowledgePoint: true },
        orderBy: { knowledgePoint: { sortOrder: "asc" } },
      });

      const grouped: Record<string, typeof records> = {};
      for (const r of records) {
        const d = r.knowledgePoint.domain;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(r);
      }
      return grouped;
    }),

  listKnowledgePoints: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.knowledgePoint.findMany({
      orderBy: [{ domain: "asc" }, { sortOrder: "asc" }],
    });
  }),
});
