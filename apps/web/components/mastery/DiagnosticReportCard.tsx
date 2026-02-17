"use client";

type MasteryRecord = {
  accuracy: number;
  totalAttempts: number;
  knowledgePoint: {
    domain: string;
  };
};

type Props = {
  masteryData: MasteryRecord[];
  isZh: boolean;
};

type StageKey = "ELEMENTARY" | "MIDDLE" | "HIGH";

const STAGES: Array<{
  key: StageKey;
  domains: string[];
  labelEn: string;
  labelZh: string;
}> = [
  {
    key: "ELEMENTARY",
    domains: ["ARITHMETIC", "FRACTIONS", "GEOMETRY", "WORD_PROBLEMS", "NUMBER_THEORY", "PROBABILITY"],
    labelEn: "Elementary Check",
    labelZh: "小学阶段",
  },
  {
    key: "MIDDLE",
    domains: ["ARITHMETIC", "FRACTIONS", "ALGEBRA", "GEOMETRY", "NUMBER_THEORY", "PROBABILITY", "STATISTICS", "WORD_PROBLEMS"],
    labelEn: "Middle School Check",
    labelZh: "初中阶段",
  },
  {
    key: "HIGH",
    domains: ["ALGEBRA", "GEOMETRY", "TRIGONOMETRY", "PROBABILITY", "STATISTICS", "CALCULUS", "WORD_PROBLEMS"],
    labelEn: "High School Check",
    labelZh: "高中阶段",
  },
];

const DOMAIN_NAME: Record<string, { en: string; zh: string }> = {
  ARITHMETIC: { en: "Arithmetic", zh: "算术" },
  ALGEBRA: { en: "Algebra", zh: "代数" },
  GEOMETRY: { en: "Geometry", zh: "几何" },
  FRACTIONS: { en: "Fractions", zh: "分数" },
  NUMBER_THEORY: { en: "Number Theory", zh: "数论" },
  PROBABILITY: { en: "Probability", zh: "概率" },
  STATISTICS: { en: "Statistics", zh: "统计" },
  TRIGONOMETRY: { en: "Trigonometry", zh: "三角函数" },
  CALCULUS: { en: "Calculus", zh: "微积分" },
  WORD_PROBLEMS: { en: "Word Problems", zh: "应用题" },
};

function pct(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v * 100)));
}

function recommendation(score: number, isZh: boolean): string {
  if (score >= 0.85) {
    return isZh
      ? "状态优秀：继续做混合难度题，保持稳定输出。"
      : "Excellent: keep mixed-difficulty practice to maintain consistency.";
  }
  if (score >= 0.7) {
    return isZh
      ? "基础较稳：优先强化薄弱模块，再提升速度。"
      : "Solid base: target weaker modules first, then improve speed.";
  }
  if (score >= 0.5) {
    return isZh
      ? "建议复习：回到同主题基础题，先提正确率。"
      : "Recommended: revisit fundamentals in the same topics to raise accuracy first.";
  }
  return isZh
    ? "需要重点巩固：分模块训练，每次只攻克一个知识点。"
    : "Needs reinforcement: train by module and focus on one concept at a time.";
}

export default function DiagnosticReportCard({ masteryData, isZh }: Props) {
  if (!masteryData || masteryData.length === 0) {
    return (
      <div className="bg-white border border-primary-100 rounded-card p-4">
        <h3 className="font-heading font-bold text-gray-800 mb-2">
          {isZh ? "知识检查报告" : "Knowledge Check Report"}
        </h3>
        <p className="text-sm text-gray-500">
          {isZh
            ? "完成几道知识检查题后，这里会生成你的诊断报告。"
            : "Complete a few Knowledge Check questions and your diagnostic report will appear here."}
        </p>
      </div>
    );
  }

  const byDomain = new Map<string, { attempts: number; weightedAcc: number }>();
  for (const r of masteryData) {
    const domain = r.knowledgePoint.domain;
    const old = byDomain.get(domain) ?? { attempts: 0, weightedAcc: 0 };
    const attempts = Math.max(1, r.totalAttempts || 1);
    byDomain.set(domain, {
      attempts: old.attempts + attempts,
      weightedAcc: old.weightedAcc + r.accuracy * attempts,
    });
  }

  const domainScores = Array.from(byDomain.entries()).map(([domain, v]) => ({
    domain,
    score: v.attempts > 0 ? v.weightedAcc / v.attempts : 0,
    attempts: v.attempts,
  }));

  const strengths = domainScores
    .filter((d) => d.attempts >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const weaknesses = domainScores
    .filter((d) => d.attempts >= 2)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return (
    <div className="bg-white border border-primary-100 rounded-card p-4 space-y-4">
      <h3 className="font-heading font-bold text-gray-800">
        {isZh ? "知识检查报告" : "Knowledge Check Report"}
      </h3>

      <div className="grid md:grid-cols-3 gap-3">
        {STAGES.map((stage) => {
          const items = domainScores.filter((d) => stage.domains.includes(d.domain));
          const score =
            items.length > 0
              ? items.reduce((s, i) => s + i.score, 0) / items.length
              : 0;

          return (
            <div key={stage.key} className="border border-gray-100 rounded-bubble p-3 bg-primary-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-heading font-semibold text-gray-700">
                  {isZh ? stage.labelZh : stage.labelEn}
                </span>
                <span className="text-sm font-bold text-primary-700">{pct(score)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct(score)}%` }} />
              </div>
              <p className="text-xs text-gray-500">{recommendation(score, isZh)}</p>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="border border-green-100 rounded-bubble p-3 bg-green-50/50">
          <h4 className="text-sm font-heading font-semibold text-green-700 mb-1">
            {isZh ? "优势模块" : "Strengths"}
          </h4>
          {strengths.length === 0 ? (
            <p className="text-xs text-gray-500">{isZh ? "答题后会显示" : "Will appear after more attempts"}</p>
          ) : (
            <ul className="text-xs text-gray-600 space-y-1">
              {strengths.map((s) => (
                <li key={s.domain}>
                  {(isZh ? DOMAIN_NAME[s.domain]?.zh : DOMAIN_NAME[s.domain]?.en) ?? s.domain}: {pct(s.score)}%
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-orange-100 rounded-bubble p-3 bg-orange-50/50">
          <h4 className="text-sm font-heading font-semibold text-orange-700 mb-1">
            {isZh ? "建议加强" : "Needs Focus"}
          </h4>
          {weaknesses.length === 0 ? (
            <p className="text-xs text-gray-500">{isZh ? "答题后会显示" : "Will appear after more attempts"}</p>
          ) : (
            <ul className="text-xs text-gray-600 space-y-1">
              {weaknesses.map((w) => (
                <li key={w.domain}>
                  {(isZh ? DOMAIN_NAME[w.domain]?.zh : DOMAIN_NAME[w.domain]?.en) ?? w.domain}: {pct(w.score)}%
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
