"use client";

import { motion } from "framer-motion";

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
  emoji: string;
  color: string;
  barColor: string;
  bg: string;
  border: string;
}> = [
  {
    key: "ELEMENTARY",
    domains: ["ARITHMETIC", "FRACTIONS", "GEOMETRY", "WORD_PROBLEMS", "NUMBER_THEORY", "PROBABILITY"],
    labelEn: "Elementary", labelZh: "小学阶段",
    emoji: "🌱",
    color: "text-emerald-700",
    barColor: "bg-emerald-400",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    key: "MIDDLE",
    domains: ["ARITHMETIC", "FRACTIONS", "ALGEBRA", "GEOMETRY", "NUMBER_THEORY", "PROBABILITY", "STATISTICS", "WORD_PROBLEMS"],
    labelEn: "Middle School", labelZh: "初中阶段",
    emoji: "📘",
    color: "text-blue-700",
    barColor: "bg-blue-400",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    key: "HIGH",
    domains: ["ALGEBRA", "GEOMETRY", "TRIGONOMETRY", "PROBABILITY", "STATISTICS", "CALCULUS", "WORD_PROBLEMS"],
    labelEn: "High School", labelZh: "高中阶段",
    emoji: "🎓",
    color: "text-purple-700",
    barColor: "bg-purple-400",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
];

const DOMAIN_NAME: Record<string, { en: string; zh: string; emoji: string }> = {
  ARITHMETIC:    { en: "Arithmetic",    zh: "算术",    emoji: "🔢" },
  ALGEBRA:       { en: "Algebra",       zh: "代数",    emoji: "📐" },
  GEOMETRY:      { en: "Geometry",      zh: "几何",    emoji: "📏" },
  FRACTIONS:     { en: "Fractions",     zh: "分数",    emoji: "🍕" },
  NUMBER_THEORY: { en: "Number Theory", zh: "数论",    emoji: "🔍" },
  PROBABILITY:   { en: "Probability",   zh: "概率",    emoji: "🎲" },
  STATISTICS:    { en: "Statistics",    zh: "统计",    emoji: "📊" },
  TRIGONOMETRY:  { en: "Trigonometry",  zh: "三角函数", emoji: "📡" },
  CALCULUS:      { en: "Calculus",      zh: "微积分",  emoji: "∫"  },
  WORD_PROBLEMS: { en: "Word Problems", zh: "应用题",  emoji: "📖" },
};

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v * 100)));
}

function getStageLabel(score: number, isZh: boolean): { text: string; icon: string; color: string } {
  if (score >= 0.85) return { text: isZh ? "优秀 — 继续混合难度练习" : "Excellent — keep mixed-difficulty practice", icon: "🌟", color: "text-emerald-700" };
  if (score >= 0.70) return { text: isZh ? "良好 — 优先强化薄弱模块" : "Good — target weaker areas first", icon: "⭐", color: "text-blue-700" };
  if (score >= 0.50) return { text: isZh ? "进步中 — 先回基础题提正确率" : "Improving — revisit fundamentals to raise accuracy", icon: "📈", color: "text-yellow-700" };
  return { text: isZh ? "需巩固 — 分模块一次攻克一个考点" : "Needs work — focus on one concept at a time", icon: "💪", color: "text-orange-700" };
}

export default function DiagnosticReportCard({ masteryData, isZh }: Props) {
  if (!masteryData || masteryData.length === 0) {
    return (
      <div className="bg-white border border-primary-100 rounded-2xl p-6 text-center">
        <div className="text-5xl mb-3">🔬</div>
        <h3 className="font-heading font-bold text-gray-800 mb-2">
          {isZh ? "知识检查报告" : "Knowledge Diagnostic Report"}
        </h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          {isZh
            ? "完成几道知识检查题后，你的专属诊断报告将在这里生成。"
            : "Complete a few Knowledge Check questions and your personalized report will appear here."}
        </p>
      </div>
    );
  }

  // Compute domain scores
  const byDomain = new Map<string, { attempts: number; weightedAcc: number }>();
  for (const r of masteryData) {
    const domain = r.knowledgePoint.domain;
    const prev = byDomain.get(domain) ?? { attempts: 0, weightedAcc: 0 };
    const attempts = Math.max(1, r.totalAttempts || 1);
    byDomain.set(domain, {
      attempts: prev.attempts + attempts,
      weightedAcc: prev.weightedAcc + r.accuracy * attempts,
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

  // Overall score
  const overallScore = domainScores.length > 0
    ? domainScores.reduce((s, d) => s + d.score, 0) / domainScores.length
    : 0;

  return (
    <div className="bg-white border border-primary-100 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4 border-b border-indigo-100 flex items-center gap-3">
        <span className="text-4xl">🔬</span>
        <div>
          <h3 className="font-heading font-bold text-gray-800">
            {isZh ? "知识检查诊断报告" : "Knowledge Diagnostic Report"}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {isZh ? `已覆盖 ${domainScores.length} 个知识域` : `${domainScores.length} domain(s) assessed`}
          </p>
        </div>
        {/* Overall score badge */}
        <div className="ml-auto text-right">
          <div className="text-3xl font-bold text-indigo-700">{clamp(overallScore)}%</div>
          <p className="text-xs text-gray-400">{isZh ? "综合得分" : "Overall"}</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Stage breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-heading font-semibold text-gray-600">
            {isZh ? "各学段表现" : "Stage Performance"}
          </h4>
          <div className="grid md:grid-cols-3 gap-3">
            {STAGES.map((stage, stageIdx) => {
              const items = domainScores.filter((d) => stage.domains.includes(d.domain));
              const score = items.length > 0
                ? items.reduce((s, i) => s + i.score, 0) / items.length
                : 0;
              const pct = clamp(score);
              const lbl = getStageLabel(score, isZh);

              return (
                <div key={stage.key} className={`rounded-xl border ${stage.border} ${stage.bg} p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base">{stage.emoji}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.bg} ${stage.color} border ${stage.border}`}>
                      {pct}%
                    </span>
                  </div>
                  <p className={`text-sm font-heading font-bold mb-2 ${stage.color}`}>
                    {isZh ? stage.labelZh : stage.labelEn}
                  </p>

                  {/* Animated progress bar */}
                  <div className="h-2.5 bg-white rounded-full overflow-hidden border border-white shadow-inner mb-2">
                    <motion.div
                      className={`h-full rounded-full ${stage.barColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: stageIdx * 0.15, ease: "easeOut" }}
                    />
                  </div>

                  {/* Recommendation */}
                  <p className={`text-xs leading-snug ${lbl.color}`}>
                    {lbl.icon} {lbl.text}
                  </p>

                  {/* Domain coverage dots */}
                  {items.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {items.map((d) => {
                        const dn = DOMAIN_NAME[d.domain];
                        const dpct = clamp(d.score);
                        return (
                          <span
                            key={d.domain}
                            title={`${isZh ? dn?.zh : dn?.en}: ${dpct}%`}
                            className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border ${
                              d.score >= 0.7 ? "bg-white border-green-200 text-green-700" : "bg-white border-gray-200 text-gray-500"
                            }`}
                          >
                            {dn?.emoji} {dpct}%
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {items.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">{isZh ? "尚未覆盖" : "No data yet"}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div className="grid md:grid-cols-2 gap-3">
            {/* Strengths */}
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <h4 className="text-sm font-heading font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                💪 {isZh ? "你的优势" : "Your Strengths"}
              </h4>
              {strengths.length === 0 ? (
                <p className="text-xs text-gray-400">{isZh ? "答题后显示" : "Appears after more attempts"}</p>
              ) : (
                <div className="space-y-2">
                  {strengths.map((s) => {
                    const dn = DOMAIN_NAME[s.domain];
                    return (
                      <div key={s.domain} className="flex items-center gap-2">
                        <span className="text-base">{dn?.emoji ?? "📚"}</span>
                        <span className="text-sm text-gray-700 flex-1">
                          {isZh ? dn?.zh : dn?.en}
                        </span>
                        <div className="w-16 h-2 bg-green-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-green-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${clamp(s.score)}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                        <span className="text-xs font-bold text-green-700 w-8 text-right">{clamp(s.score)}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Weaknesses */}
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <h4 className="text-sm font-heading font-semibold text-orange-700 mb-2 flex items-center gap-1.5">
                🎯 {isZh ? "重点提升方向" : "Focus Areas"}
              </h4>
              {weaknesses.length === 0 ? (
                <p className="text-xs text-gray-400">{isZh ? "答题后显示" : "Appears after more attempts"}</p>
              ) : (
                <div className="space-y-2">
                  {weaknesses.map((w) => {
                    const dn = DOMAIN_NAME[w.domain];
                    return (
                      <div key={w.domain} className="flex items-center gap-2">
                        <span className="text-base">{dn?.emoji ?? "📚"}</span>
                        <span className="text-sm text-gray-700 flex-1">
                          {isZh ? dn?.zh : dn?.en}
                        </span>
                        <div className="w-16 h-2 bg-orange-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-orange-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${clamp(w.score)}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                        <span className="text-xs font-bold text-orange-700 w-8 text-right">{clamp(w.score)}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
