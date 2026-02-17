"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type MasteryRecord = {
  id: string;
  accuracy: number;
  avgTimeMs: number;
  streak: number;
  bestStreak: number;
  level: number;
  totalAttempts: number;
  totalCorrect: number;
  lastPracticedAt: Date | string | null;
  knowledgePoint: {
    id: string;
    slug: string;
    domain: string;
    nameEn: string;
    nameZh: string;
    sortOrder: number;
  };
};

type KnowledgePointEntry = {
  slug: string;
  domain: string;
  nameEn: string;
  nameZh: string;
  sortOrder: number;
  minLevel: number;
  maxLevel: number;
};

type Props = {
  masteryData: MasteryRecord[];
  allKnowledgePoints: KnowledgePointEntry[];
  isZh: boolean;
};

type MasteryStatus = "NOT_STARTED" | "LEARNING" | "PROFICIENT" | "MASTERED";

function computeStatus(record: MasteryRecord | undefined): MasteryStatus {
  if (!record || record.totalAttempts === 0) return "NOT_STARTED";
  if (record.accuracy >= 0.85 && record.level >= 4 && record.totalAttempts >= 10) return "MASTERED";
  if (record.accuracy >= 0.7 && record.level >= 3) return "PROFICIENT";
  return "LEARNING";
}

const STATUS_CONFIG: Record<MasteryStatus, { label: { en: string; zh: string }; color: string; bgColor: string }> = {
  NOT_STARTED: { label: { en: "Not Started", zh: "未开始" }, color: "text-gray-400", bgColor: "bg-gray-200" },
  LEARNING: { label: { en: "Learning", zh: "学习中" }, color: "text-blue-600", bgColor: "bg-blue-500" },
  PROFICIENT: { label: { en: "Proficient", zh: "熟练" }, color: "text-green-600", bgColor: "bg-green-500" },
  MASTERED: { label: { en: "Mastered", zh: "已掌握" }, color: "text-yellow-600", bgColor: "bg-yellow-500" },
};

const DOMAIN_NAMES: Record<string, { en: string; zh: string }> = {
  ARITHMETIC: { en: "Arithmetic", zh: "算术" },
  ALGEBRA: { en: "Algebra", zh: "代数" },
  GEOMETRY: { en: "Geometry", zh: "几何" },
  FRACTIONS: { en: "Fractions", zh: "分数" },
  NUMBER_THEORY: { en: "Number Theory", zh: "数论" },
  PROBABILITY: { en: "Probability", zh: "概率" },
  STATISTICS: { en: "Statistics", zh: "统计" },
  TRIGONOMETRY: { en: "Trigonometry", zh: "三角" },
  CALCULUS: { en: "Calculus", zh: "微积分" },
  WORD_PROBLEMS: { en: "Word Problems", zh: "应用题" },
};

export default function KnowledgePointGrid({ masteryData, allKnowledgePoints, isZh }: Props) {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState(false);

  // Build a lookup from slug to mastery record
  const masteryBySlug = new Map<string, MasteryRecord>();
  for (const r of masteryData) {
    masteryBySlug.set(r.knowledgePoint.slug, r);
  }

  // Group knowledge points by domain
  const grouped = new Map<string, KnowledgePointEntry[]>();
  for (const kp of allKnowledgePoints) {
    const existing = grouped.get(kp.domain) ?? [];
    existing.push(kp);
    grouped.set(kp.domain, existing);
  }

  // Compute domain-level stats
  const domainStats = Array.from(grouped.entries()).map(([domain, kps]) => {
    const records = kps.map((kp) => masteryBySlug.get(kp.slug));
    const attempted = records.filter((r) => r && r.totalAttempts > 0);
    const avgAccuracy =
      attempted.length > 0
        ? attempted.reduce((sum, r) => sum + (r?.accuracy ?? 0), 0) / attempted.length
        : 0;
    const masteredCount = kps.filter((kp) => computeStatus(masteryBySlug.get(kp.slug)) === "MASTERED").length;

    return { domain, kps, avgAccuracy, masteredCount, totalKps: kps.length };
  });

  if (allKnowledgePoints.length === 0) return null;

  const totalMastered = domainStats.reduce((s, d) => s + d.masteredCount, 0);

  return (
    <div className="space-y-3">
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setSectionOpen((v) => !v)}
      >
        <h2 className="font-heading font-bold text-gray-800">
          {isZh ? "知识点掌握进度" : "Knowledge Point Progress"}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {totalMastered}/{allKnowledgePoints.length} {isZh ? "已掌握" : "mastered"}
          </span>
          <span className="text-gray-400 text-sm">{sectionOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {sectionOpen && domainStats.map(({ domain, kps, avgAccuracy, masteredCount, totalKps }) => {
        const domainName = DOMAIN_NAMES[domain];
        const isExpanded = expandedDomain === domain;

        return (
          <div key={domain} className="bg-white border border-primary-100 rounded-card overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 hover:bg-primary-50/50 transition-colors"
              onClick={() => setExpandedDomain(isExpanded ? null : domain)}
            >
              <div className="flex items-center gap-3">
                <span className="font-heading font-bold text-gray-800 text-sm">
                  {isZh ? domainName?.zh : domainName?.en}
                </span>
                <span className="text-xs text-gray-400">
                  {masteredCount}/{totalKps} {isZh ? "已掌握" : "mastered"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${Math.round(avgAccuracy * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">
                  {Math.round(avgAccuracy * 100)}%
                </span>
                <span className="text-gray-400 text-sm">{isExpanded ? "▲" : "▼"}</span>
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 space-y-2">
                    {kps.map((kp) => {
                      const record = masteryBySlug.get(kp.slug);
                      const status = computeStatus(record);
                      const config = STATUS_CONFIG[status];
                      const pct = record ? Math.round(record.accuracy * 100) : 0;

                      return (
                        <div key={kp.slug} className="flex items-center gap-3 text-sm">
                          <span className="flex-1 text-gray-700">
                            {isZh ? kp.nameZh : kp.nameEn}
                          </span>
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${config.bgColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs w-16 text-right ${config.color}`}>
                            {isZh ? config.label.zh : config.label.en}
                          </span>
                          {record && record.totalAttempts > 0 && (
                            <span className="text-xs text-gray-400 w-12 text-right">
                              {record.totalCorrect}/{record.totalAttempts}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
