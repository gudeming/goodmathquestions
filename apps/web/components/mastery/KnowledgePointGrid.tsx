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

const STATUS_CONFIG: Record<MasteryStatus, {
  label: { en: string; zh: string };
  icon: string;
  dotColor: string;
  barColor: string;
  badgeBg: string;
  badgeText: string;
}> = {
  NOT_STARTED: { label: { en: "Not Started", zh: "未开始" }, icon: "○",  dotColor: "bg-gray-300",    barColor: "bg-gray-300",    badgeBg: "bg-gray-100",    badgeText: "text-gray-400"    },
  LEARNING:    { label: { en: "Learning",     zh: "学习中" }, icon: "📘", dotColor: "bg-blue-400",    barColor: "bg-blue-400",    badgeBg: "bg-blue-100",    badgeText: "text-blue-700"    },
  PROFICIENT:  { label: { en: "Proficient",   zh: "熟练"   }, icon: "⭐", dotColor: "bg-green-400",   barColor: "bg-green-400",   badgeBg: "bg-green-100",   badgeText: "text-green-700"   },
  MASTERED:    { label: { en: "Mastered",     zh: "已掌握" }, icon: "🏆", dotColor: "bg-yellow-400",  barColor: "bg-yellow-400",  badgeBg: "bg-yellow-100",  badgeText: "text-yellow-700"  },
};

const DOMAIN_META: Record<string, { emoji: string; nameEn: string; nameZh: string; headerBg: string; headerText: string }> = {
  ARITHMETIC:    { emoji: "🔢", nameEn: "Arithmetic",    nameZh: "算术",    headerBg: "bg-blue-50",    headerText: "text-blue-700"   },
  ALGEBRA:       { emoji: "📐", nameEn: "Algebra",       nameZh: "代数",    headerBg: "bg-purple-50",  headerText: "text-purple-700" },
  GEOMETRY:      { emoji: "📏", nameEn: "Geometry",      nameZh: "几何",    headerBg: "bg-green-50",   headerText: "text-green-700"  },
  FRACTIONS:     { emoji: "🍕", nameEn: "Fractions",     nameZh: "分数",    headerBg: "bg-orange-50",  headerText: "text-orange-700" },
  NUMBER_THEORY: { emoji: "🔍", nameEn: "Number Theory", nameZh: "数论",    headerBg: "bg-indigo-50",  headerText: "text-indigo-700" },
  PROBABILITY:   { emoji: "🎲", nameEn: "Probability",   nameZh: "概率",    headerBg: "bg-pink-50",    headerText: "text-pink-700"   },
  STATISTICS:    { emoji: "📊", nameEn: "Statistics",    nameZh: "统计",    headerBg: "bg-teal-50",    headerText: "text-teal-700"   },
  TRIGONOMETRY:  { emoji: "📡", nameEn: "Trigonometry",  nameZh: "三角函数", headerBg: "bg-cyan-50",   headerText: "text-cyan-700"   },
  CALCULUS:      { emoji: "∫",  nameEn: "Calculus",      nameZh: "微积分",  headerBg: "bg-red-50",     headerText: "text-red-700"    },
  WORD_PROBLEMS: { emoji: "📖", nameEn: "Word Problems", nameZh: "应用题",  headerBg: "bg-amber-50",   headerText: "text-amber-700"  },
};

// Radial progress ring for domain mastery overview
function MasteryRing({
  pct, color, size = 48, strokeWidth = 5,
}: { pct: number; color: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, pct / 100));
  return (
    <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.7s ease" }}
      />
    </svg>
  );
}

const DOMAIN_RING_COLORS: Record<string, string> = {
  ARITHMETIC: "#3b82f6", ALGEBRA: "#9333ea", GEOMETRY: "#16a34a",
  FRACTIONS: "#ea580c", NUMBER_THEORY: "#4f46e5", PROBABILITY: "#db2777",
  STATISTICS: "#0d9488", TRIGONOMETRY: "#0891b2", CALCULUS: "#dc2626", WORD_PROBLEMS: "#d97706",
};

export default function KnowledgePointGrid({ masteryData, allKnowledgePoints, isZh }: Props) {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState(false);

  const masteryBySlug = new Map<string, MasteryRecord>();
  for (const r of masteryData) masteryBySlug.set(r.knowledgePoint.slug, r);

  const grouped = new Map<string, KnowledgePointEntry[]>();
  for (const kp of allKnowledgePoints) {
    const arr = grouped.get(kp.domain) ?? [];
    arr.push(kp);
    grouped.set(kp.domain, arr);
  }

  const domainStats = Array.from(grouped.entries()).map(([domain, kps]) => {
    const records = kps.map((kp) => masteryBySlug.get(kp.slug));
    const attempted = records.filter((r) => r && r.totalAttempts > 0) as MasteryRecord[];
    const avgAccuracy = attempted.length > 0
      ? attempted.reduce((s, r) => s + r.accuracy, 0) / attempted.length
      : 0;
    const masteredCount = kps.filter((kp) => computeStatus(masteryBySlug.get(kp.slug)) === "MASTERED").length;
    const proficientCount = kps.filter((kp) => {
      const s = computeStatus(masteryBySlug.get(kp.slug));
      return s === "PROFICIENT" || s === "MASTERED";
    }).length;
    return { domain, kps, avgAccuracy, masteredCount, proficientCount, totalKps: kps.length, attemptedCount: attempted.length };
  });

  if (allKnowledgePoints.length === 0) return null;

  const totalMastered  = domainStats.reduce((s, d) => s + d.masteredCount, 0);
  const totalPoints    = allKnowledgePoints.length;
  const overallPct     = Math.round((totalMastered / totalPoints) * 100);

  return (
    <div className="space-y-3">
      {/* Section toggle header */}
      <button
        className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3 hover:bg-gray-50 transition-colors"
        onClick={() => setSectionOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🗺️</span>
          <div className="text-left">
            <h2 className="font-heading font-bold text-gray-800 text-sm">
              {isZh ? "知识点掌握地图" : "Knowledge Mastery Map"}
            </h2>
            <p className="text-xs text-gray-400">
              {totalMastered}/{totalPoints} {isZh ? "已掌握" : "mastered"} · {overallPct}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Overall progress ring */}
          <div className="relative flex items-center justify-center w-10 h-10">
            <MasteryRing pct={overallPct} color="#6366f1" size={40} strokeWidth={4} />
            <span className="absolute text-[10px] font-bold text-indigo-600">{overallPct}%</span>
          </div>
          <span className={`text-gray-400 text-sm transition-transform duration-200 ${sectionOpen ? "rotate-180" : ""}`}>▼</span>
        </div>
      </button>

      {/* Domain grid */}
      <AnimatePresence>
        {sectionOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {/* Domain overview cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
              {domainStats.map(({ domain, kps, avgAccuracy, masteredCount, attemptedCount }) => {
                const meta = DOMAIN_META[domain];
                const ringColor = DOMAIN_RING_COLORS[domain] ?? "#6366f1";
                const pct = Math.round(avgAccuracy * 100);
                const isExpanded = expandedDomain === domain;
                return (
                  <button
                    key={domain}
                    onClick={() => setExpandedDomain(isExpanded ? null : domain)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      isExpanded
                        ? `border-2 border-current ${meta?.headerBg ?? "bg-gray-50"} shadow-md`
                        : `border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50`
                    }`}
                  >
                    <div className="flex justify-center mb-1 relative">
                      <MasteryRing pct={pct} color={ringColor} size={44} strokeWidth={4} />
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl">{meta?.emoji ?? "📚"}</span>
                    </div>
                    <p className={`text-xs font-bold truncate ${isExpanded ? (meta?.headerText ?? "text-gray-700") : "text-gray-700"}`}>
                      {isZh ? (meta?.nameZh ?? domain) : (meta?.nameEn ?? domain)}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {masteredCount}/{kps.length} {isZh ? "掌握" : "done"}
                    </p>
                    {attemptedCount === 0 && (
                      <p className="text-[10px] text-gray-300 mt-0.5">{isZh ? "未练习" : "Not started"}</p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Expanded domain detail */}
            <AnimatePresence>
              {expandedDomain && (() => {
                const domainData = domainStats.find((d) => d.domain === expandedDomain);
                const meta = DOMAIN_META[expandedDomain];
                if (!domainData) return null;
                return (
                  <motion.div
                    key={expandedDomain}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className={`rounded-xl border-2 overflow-hidden mb-2 ${meta?.headerBg ?? "bg-gray-50"}`}
                  >
                    <div className={`flex items-center gap-2 px-4 py-3 border-b border-white/50`}>
                      <span className="text-xl">{meta?.emoji}</span>
                      <h3 className={`font-heading font-bold ${meta?.headerText ?? "text-gray-700"}`}>
                        {isZh ? meta?.nameZh : meta?.nameEn}
                      </h3>
                      <span className="ml-auto text-xs text-gray-500">
                        {domainData.masteredCount}/{domainData.totalKps} {isZh ? "已掌握" : "mastered"}
                        {domainData.attemptedCount > 0 && ` · ${Math.round(domainData.avgAccuracy * 100)}% avg`}
                      </span>
                    </div>
                    <div className="p-3 space-y-2 bg-white/60">
                      {domainData.kps.map((kp) => {
                        const record = masteryBySlug.get(kp.slug);
                        const status = computeStatus(record);
                        const cfg = STATUS_CONFIG[status];
                        const accPct = record ? Math.round(record.accuracy * 100) : 0;
                        const timeStr = record
                          ? `${(record.avgTimeMs / 1000).toFixed(0)}s avg`
                          : "";
                        return (
                          <div key={kp.slug} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-100 shadow-sm">
                            {/* Status dot */}
                            <span className="text-base flex-shrink-0">{cfg.icon}</span>

                            {/* Name */}
                            <span className="flex-1 text-sm font-medium text-gray-700">
                              {isZh ? kp.nameZh : kp.nameEn}
                            </span>

                            {/* Progress bar */}
                            {record && record.totalAttempts > 0 ? (
                              <>
                                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${cfg.barColor}`}
                                    style={{ width: `${accPct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 w-8 text-right flex-shrink-0">{accPct}%</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${cfg.badgeBg} ${cfg.badgeText}`}>
                                  {isZh ? cfg.label.zh : cfg.label.en}
                                </span>
                                <span className="text-xs text-gray-400 flex-shrink-0">
                                  {record.totalCorrect}/{record.totalAttempts}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-300 ml-auto">{isZh ? "待练习" : "Not tried"}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
