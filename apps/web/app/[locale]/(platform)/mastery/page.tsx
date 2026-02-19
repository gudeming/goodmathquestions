"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";
import { useMemo, useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { KNOWLEDGE_POINT_TAXONOMY } from "@gmq/math-engine";
import KnowledgePointGrid from "@/components/mastery/KnowledgePointGrid";
import DiagnosticReportCard from "@/components/mastery/DiagnosticReportCard";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileState = {
  accuracy: number;
  avgTimeMs: number;
  streak: number;
  level: number;
};

type FeedbackState = {
  title: string;
  explanation?: string;
  concept?: string;
  encouragement?: string;
  coachingTip?: string;
  isCorrect: boolean;
};

type ActiveQuestion = {
  questionId: string;
  promptEn: string;
  promptZh: string;
  hints: Array<{ en: string; zh: string }>;
  funFactEn?: string;
  funFactZh?: string;
  level: number;
  domain: string;
  knowledgePointSlug: string;
};

const INITIAL_PROFILE: ProfileState = {
  accuracy: 0.7,
  avgTimeMs: 30000,
  streak: 0,
  level: 2,
};

// ─── Domain Visual Config ─────────────────────────────────────────────────────

const DOMAIN_META: Record<string, {
  emoji: string;
  nameEn: string;
  nameZh: string;
  border: string;
  bg: string;
  activeBg: string;
  text: string;
  ring: string;
}> = {
  ARITHMETIC:    { emoji: "🔢", nameEn: "Arithmetic",    nameZh: "算术",   border: "border-blue-300",   bg: "bg-blue-50",   activeBg: "bg-blue-100",   text: "text-blue-700",   ring: "#3b82f6" },
  ALGEBRA:       { emoji: "📐", nameEn: "Algebra",       nameZh: "代数",   border: "border-purple-300", bg: "bg-purple-50", activeBg: "bg-purple-100", text: "text-purple-700", ring: "#9333ea" },
  GEOMETRY:      { emoji: "📏", nameEn: "Geometry",      nameZh: "几何",   border: "border-green-300",  bg: "bg-green-50",  activeBg: "bg-green-100",  text: "text-green-700",  ring: "#16a34a" },
  FRACTIONS:     { emoji: "🍕", nameEn: "Fractions",     nameZh: "分数",   border: "border-orange-300", bg: "bg-orange-50", activeBg: "bg-orange-100", text: "text-orange-700", ring: "#ea580c" },
  NUMBER_THEORY: { emoji: "🔍", nameEn: "Number Theory", nameZh: "数论",   border: "border-indigo-300", bg: "bg-indigo-50", activeBg: "bg-indigo-100", text: "text-indigo-700", ring: "#4f46e5" },
  PROBABILITY:   { emoji: "🎲", nameEn: "Probability",   nameZh: "概率",   border: "border-pink-300",   bg: "bg-pink-50",   activeBg: "bg-pink-100",   text: "text-pink-700",   ring: "#db2777" },
  STATISTICS:    { emoji: "📊", nameEn: "Statistics",    nameZh: "统计",   border: "border-teal-300",   bg: "bg-teal-50",   activeBg: "bg-teal-100",   text: "text-teal-700",   ring: "#0d9488" },
  TRIGONOMETRY:  { emoji: "📡", nameEn: "Trigonometry",  nameZh: "三角函数", border: "border-cyan-300",  bg: "bg-cyan-50",   activeBg: "bg-cyan-100",   text: "text-cyan-700",   ring: "#0891b2" },
  CALCULUS:      { emoji: "∫",  nameEn: "Calculus",      nameZh: "微积分", border: "border-red-300",    bg: "bg-red-50",    activeBg: "bg-red-100",    text: "text-red-700",    ring: "#dc2626" },
  WORD_PROBLEMS: { emoji: "📖", nameEn: "Word Problems", nameZh: "应用题", border: "border-amber-300",  bg: "bg-amber-50",  activeBg: "bg-amber-100",  text: "text-amber-700",  ring: "#d97706" },
};

const GRADE_META: Record<string, { emoji: string; label: string; border: string; bg: string; text: string }> = {
  "4": { emoji: "🟢", label: "Grade 4", border: "border-emerald-300", bg: "bg-emerald-50 hover:bg-emerald-100", text: "text-emerald-700" },
  "5": { emoji: "🔵", label: "Grade 5", border: "border-blue-300",    bg: "bg-blue-50 hover:bg-blue-100",       text: "text-blue-700"    },
  "6": { emoji: "🟡", label: "Grade 6", border: "border-yellow-300",  bg: "bg-yellow-50 hover:bg-yellow-100",   text: "text-yellow-700"  },
  "7": { emoji: "🟠", label: "Grade 7", border: "border-orange-300",  bg: "bg-orange-50 hover:bg-orange-100",   text: "text-orange-700"  },
  "8": { emoji: "🔴", label: "Grade 8", border: "border-red-300",     bg: "bg-red-50 hover:bg-red-100",         text: "text-red-700"     },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDomainForTag(tagName: string): string | null {
  const n = tagName.toLowerCase().replace(/[-_\s]/g, "");
  if (n.includes("arith") || n.includes("addsub") || n.includes("addition") || n.includes("multiply")) return "ARITHMETIC";
  if (n.includes("alg"))  return "ALGEBRA";
  if (n.includes("geo") || n.includes("angle") || n.includes("area") || n.includes("perimeter")) return "GEOMETRY";
  if (n.includes("frac") || n.includes("ratio") || n.includes("proportion")) return "FRACTIONS";
  if (n.includes("number") || n.includes("prime") || n.includes("gcd") || n.includes("lcm")) return "NUMBER_THEORY";
  if (n.includes("prob") || n.includes("chance") || n.includes("likelihood")) return "PROBABILITY";
  if (n.includes("stat") || n.includes("data") || n.includes("mean") || n.includes("median")) return "STATISTICS";
  if (n.includes("trig") || n.includes("sin") || n.includes("cos") || n.includes("tan")) return "TRIGONOMETRY";
  if (n.includes("calc") || n.includes("deriv") || n.includes("integ")) return "CALCULUS";
  if (n.includes("word") || n.includes("problem") || n.includes("application") || n.includes("speed") || n.includes("distance")) return "WORD_PROBLEMS";
  // Match domain names directly
  for (const domain of Object.keys(DOMAIN_META)) {
    const dn = domain.toLowerCase().replace("_", "");
    if (n === dn || n.startsWith(dn.slice(0, 4))) return domain;
  }
  return null;
}

function getTagNote(tagName: string, isZh: boolean): string {
  const lower = tagName.toLowerCase();
  if (tagName.startsWith("CCSS-")) return isZh ? "美国学校 Common Core 标准考点" : "US Common Core standards topic";
  if (tagName.startsWith("AP-"))   return isZh ? "美国高中 AP 课程进阶题" : "Advanced Placement high-school topic";
  if (/^knowledge_check$/i.test(tagName) || tagName === "知识检查") return isZh ? "分阶段诊断：小学→初中→高中" : "Progressive diagnostic: elementary → middle → high school";
  if (/^grade[_\s-]?[4-8]$/i.test(tagName)) return isZh ? "覆盖该年级主要考点，自动调难度" : "Covers core topics for this grade with adaptive difficulty";
  if (lower.includes("alg"))  return isZh ? "重点：方程、函数和代数表达式" : "Focus: equations, functions, and algebraic expressions";
  if (lower.includes("geo") || lower.includes("angle")) return isZh ? "重点：图形、角度、面积和几何关系" : "Focus: shapes, angles, area, and geometry";
  if (lower.includes("trig")) return isZh ? "重点：三角函数与直角三角形" : "Focus: trigonometric ratios and right triangles";
  if (lower.includes("calc")) return isZh ? "重点：导数、积分与变化率" : "Focus: derivatives, integrals, and rates of change";
  if (lower.includes("stat") || lower.includes("data")) return isZh ? "重点：平均数、分布和数据解读" : "Focus: averages, distributions, and data";
  if (lower.includes("prob")) return isZh ? "重点：事件发生的可能性与概率计算" : "Focus: probability calculation and events";
  if (lower.includes("frac")) return isZh ? "重点：分数、比率和比例" : "Focus: fractions, ratios, and proportional reasoning";
  return isZh ? "系统会围绕这个标签自动生成对应题目" : "The system will generate questions around this topic";
}

function splitConceptSections(text: string, isZh: boolean): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const newlineParts = normalized.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (newlineParts.length > 1) return newlineParts;
  const markers = isZh
    ? /(知识点：|原理：|公式：|方法：|步骤：|验算：|总结：)/g
    : /(Concept:|Principle:|Formula:|Method:|Steps?:|Check:|Summary:)/g;
  const withBreaks = normalized.replace(markers, "\n$1").trim();
  const parts = withBreaks.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [normalized];
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimerRing({ seconds, total = 30 }: { seconds: number; total?: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clampPct(seconds / total) / 100);
  const strokeColor = seconds > 15 ? "#3b82f6" : seconds > 8 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center w-12 h-12 flex-shrink-0">
      <svg className="absolute w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s ease" }}
        />
      </svg>
      <span className="text-sm font-bold tabular-nums" style={{ color: strokeColor }}>{seconds}</span>
    </div>
  );
}

function LevelBadge({ level }: { level: number }) {
  const colors = ["", "bg-gray-100 text-gray-600", "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-orange-100 text-orange-700", "bg-yellow-100 text-yellow-800"];
  const labels = ["", "★", "★★", "★★★", "★★★★", "★★★★★"];
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[level] ?? colors[1]}`}>
      Lv.{level} {labels[level] ?? ""}
    </span>
  );
}

function StreakPill({ streak, isZh }: { streak: number; isZh: boolean }) {
  if (streak === 0) return <span className="text-xs text-gray-400">{isZh ? "无连击" : "No streak"}</span>;
  const isHot = streak >= 3;
  const isFire = streak >= 5;
  return (
    <motion.span
      key={streak}
      initial={{ scale: 1.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", bounce: 0.6 }}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border ${
        isFire   ? "bg-red-100 border-red-300 text-red-700" :
        isHot    ? "bg-orange-100 border-orange-300 text-orange-700" :
                   "bg-yellow-100 border-yellow-300 text-yellow-700"
      }`}
    >
      {isFire ? "🔥" : isHot ? "⚡" : "✨"} ×{streak}
      <span className="font-normal text-xs">{isZh ? "连击" : "streak"}</span>
    </motion.span>
  );
}

function HeartRow({ lives, max = 3 }: { lives: number; max?: number }) {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <motion.span
          key={i}
          animate={i >= lives ? { scale: [1, 0.7, 1], opacity: 0.25 } : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-lg"
        >
          ❤️
        </motion.span>
      ))}
    </div>
  );
}

function XpFloatBubble({ amount, onDone }: { amount: number; onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: 0 }}
      animate={{ opacity: 0, y: -56, x: 8 }}
      transition={{ duration: 1.4, ease: "easeOut" }}
      onAnimationComplete={onDone}
      className="absolute top-2 right-3 text-yellow-500 font-bold text-base pointer-events-none z-20 drop-shadow"
    >
      +{amount} ⭐
    </motion.div>
  );
}

function MilestoneOverlay({ count, isZh, onDone }: { count: number; isZh: boolean; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onDone}
    >
      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.4, opacity: 0 }}
        transition={{ type: "spring", bounce: 0.55 }}
        className="bg-white rounded-3xl shadow-2xl p-10 text-center border-4 border-yellow-400 max-w-xs mx-4"
      >
        <div className="text-7xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          {count} {isZh ? "题答对！" : "Correct!"}
        </h2>
        <p className="text-gray-500">{isZh ? "你太棒了，继续冲！" : "You're amazing, keep going!"}</p>
        <p className="text-xs text-gray-400 mt-4">{isZh ? "点击继续" : "Tap to continue"}</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MasteryPage() {
  const locale = useLocale();
  const isZh = locale === "zh";
  const { data: session } = useSession();

  // Core state
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [profile, setProfile] = useState<ProfileState>(INITIAL_PROFILE);
  const [answer, setAnswer] = useState("");
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const [visibleHints, setVisibleHints] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<FeedbackState | null>(null);

  // Gamification state
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const [xpFloat, setXpFloat] = useState<number | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const answerRef = useRef<HTMLInputElement>(null);
  const isKnowledgeCheckSelected = /^knowledge_check$/i.test(selectedTag) || selectedTag === "知识检查";

  // ─── API ──────────────────────────────────────────────────────────────────

  const { data: tags, isLoading: tagsLoading } = trpc.mastery.listFocusTags.useQuery();
  const { data: masteryData } = trpc.mastery.getMyMastery.useQuery(undefined, { enabled: !!session?.user });

  const nextQuestion = trpc.mastery.nextQuestion.useMutation({
    onSuccess: (data) => {
      setActiveQuestion({
        questionId: data.questionId,
        promptEn: data.question.promptEn,
        promptZh: data.question.promptZh,
        hints: data.question.hints,
        funFactEn: data.question.funFactEn,
        funFactZh: data.question.funFactZh,
        level: data.question.level,
        domain: data.question.domain,
        knowledgePointSlug: data.question.knowledgePointSlug,
      });
      setAnswer("");
      setVisibleHints(0);
      setStartedAt(Date.now());
      setLastFeedback(null);
      setTimeout(() => answerRef.current?.focus(), 100);
    },
  });

  const submitAttempt = trpc.mastery.submitAttempt.useMutation({
    onSuccess: (data) => {
      setAttempts((v) => v + 1);
      if (data.isCorrect) {
        const newCorrect = correctCount + 1;
        setCorrectCount(newCorrect);
        // XP = base difficulty reward scaled by speed
        const speedBonus = Math.max(0.5, 1.5 - profile.avgTimeMs / 40000);
        const xp = Math.round((50 + profile.level * 30) * speedBonus);
        setXpFloat(xp);
        if (newCorrect % 5 === 0) setMilestone(newCorrect);
      } else {
        setLives((v) => Math.max(0, v - 1));
      }
      setProfile(data.updatedProfile);
      setLastFeedback({
        isCorrect: data.isCorrect,
        title: data.isCorrect ? (isZh ? "答对了！🎊" : "Correct! 🎊") : (isZh ? "再想想，你可以的！" : "Not quite, try again!"),
        explanation: isZh ? data.explanation?.zh : data.explanation?.en,
        concept: isZh ? data.conceptNote?.zh : data.conceptNote?.en,
        encouragement: isZh ? (data.encouragement?.zh ?? "继续加油！") : (data.encouragement?.en ?? "Keep going!"),
        coachingTip: isZh ? data.coachingTip?.zh : data.coachingTip?.en,
      });
      setActiveQuestion(null);
    },
  });

  // ─── Timer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeQuestion) return;
    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeQuestion?.questionId]);

  // ─── Tag Categorization ────────────────────────────────────────────────────

  const gradeTagPattern    = /^grade[_\s-]?[4-8]$/i;
  const apTagPattern       = /^AP-/i;
  const ccssTagPattern     = /^CCSS-/i;
  const knowledgeCheckPattern = /^knowledge_check$/i;

  const { gradeTags, knowledgeCheckTag, coreTags, advancedTags } = useMemo(() => {
    if (!tags) return { gradeTags: [], knowledgeCheckTag: undefined, coreTags: [], advancedTags: [] };
    return {
      gradeTags:       tags.filter((t) => gradeTagPattern.test(t.nameEn)).sort((a, b) => a.nameEn.localeCompare(b.nameEn)),
      knowledgeCheckTag: tags.find((t) => knowledgeCheckPattern.test(t.nameEn)),
      coreTags:        tags.filter((t) => !gradeTagPattern.test(t.nameEn) && !apTagPattern.test(t.nameEn) && !ccssTagPattern.test(t.nameEn) && !knowledgeCheckPattern.test(t.nameEn)),
      advancedTags:    tags.filter((t) => apTagPattern.test(t.nameEn) || ccssTagPattern.test(t.nameEn)),
    };
  }, [tags]);

  // Group core tags by domain
  const coreTagsByDomain = useMemo(() => {
    const map = new Map<string, typeof coreTags>();
    const unmatched: typeof coreTags = [];
    for (const tag of coreTags) {
      const d = getDomainForTag(tag.nameEn);
      if (d) {
        const arr = map.get(d) ?? [];
        arr.push(tag);
        map.set(d, arr);
      } else {
        unmatched.push(tag);
      }
    }
    return { byDomain: map, unmatched };
  }, [coreTags]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const selectAndStart = (tagName: string) => {
    setSelectedTag(tagName);
    setActiveQuestion(null);
    setLastFeedback(null);
    setAnswer("");
    setVisibleHints(0);
    nextQuestion.mutate({ tagName, profile, attempts });
  };

  const startNext = () => {
    if (!selectedTag) return;
    nextQuestion.mutate({ tagName: selectedTag, profile, attempts });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion || !answer.trim() || submitAttempt.isPending) return;
    submitAttempt.mutate({
      questionId: activeQuestion.questionId,
      userAnswer: answer.trim(),
      responseTimeMs: Math.max(0, Date.now() - startedAt),
      profile,
    });
  };

  // ─── Computed Display Values ────────────────────────────────────────────────

  const accuracyPct = attempts === 0 ? 0 : Math.round((correctCount / attempts) * 100);
  const domainMeta  = activeQuestion ? DOMAIN_META[activeQuestion.domain] : null;

  // ─── Phase 1: Tag Lobby ────────────────────────────────────────────────────

  if (!selectedTag) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-2">
          <h1 className="text-4xl font-heading font-bold text-gray-800 mb-2">
            {isZh ? "选择你的挑战！" : "Choose Your Challenge!"} 🚀
          </h1>
          <p className="text-gray-500 text-base">
            {isZh ? "点击任意领域，系统将自动生成适合你难度的题目" : "Tap any topic and we'll generate questions matched to your level"}
          </p>
        </motion.div>

        {/* Grade Quick Start */}
        {gradeTags.length > 0 && (
          <section>
            <h2 className="font-heading font-bold text-gray-700 mb-3 text-base flex items-center gap-2">
              🎒 {isZh ? "年级快速挑战" : "Grade Quick Start"}
            </h2>
            <div className="grid grid-cols-5 gap-3">
              {gradeTags.map((tag) => {
                const gradeNum = tag.nameEn.match(/\d+/)?.[0] ?? "";
                const meta = GRADE_META[gradeNum];
                return (
                  <motion.button
                    key={tag.nameEn}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => selectAndStart(tag.nameEn)}
                    className={`p-4 rounded-2xl border-2 text-center transition-colors cursor-pointer font-bold ${meta?.border ?? "border-gray-300"} ${meta?.bg ?? "bg-gray-50 hover:bg-gray-100"} ${meta?.text ?? "text-gray-700"}`}
                  >
                    <div className="text-3xl mb-1">{meta?.emoji ?? "📚"}</div>
                    <div className="text-sm font-bold">{isZh ? tag.nameZh : tag.nameEn}</div>
                    <div className="text-xs opacity-60 mt-0.5">{tag._count.questions} Q</div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}

        {/* Knowledge Diagnostic */}
        {knowledgeCheckTag && (
          <motion.button
            whileHover={{ scale: 1.01, boxShadow: "0 4px 20px rgba(99,102,241,0.18)" }}
            whileTap={{ scale: 0.99 }}
            onClick={() => selectAndStart(knowledgeCheckTag.nameEn)}
            className="w-full p-5 rounded-2xl border-2 border-dashed border-primary-400 bg-gradient-to-r from-primary-50 to-indigo-50 hover:from-primary-100 hover:to-indigo-100 transition-all text-left flex items-center gap-5"
          >
            <div className="text-5xl flex-shrink-0">🔬</div>
            <div className="flex-1">
              <div className="font-heading font-bold text-primary-800 text-lg mb-0.5">
                {isZh ? "全阶段知识诊断" : "Full Knowledge Diagnostic"}
              </div>
              <div className="text-sm text-primary-600">
                {isZh ? "分阶段检测你的知识储备：小学 → 初中 → 高中，生成专属诊断报告" : "Tests your knowledge from elementary → middle → high school and generates a personal report"}
              </div>
            </div>
            <div className="text-primary-400 text-2xl flex-shrink-0">→</div>
          </motion.button>
        )}

        {/* Topic Cards by Domain */}
        <section>
          <h2 className="font-heading font-bold text-gray-700 mb-3 text-base flex items-center gap-2">
            📚 {isZh ? "按知识域练习" : "Practice by Topic"}
          </h2>

          {tagsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Domain cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(DOMAIN_META).map(([domain, meta]) => {
                  return (
                    <motion.button
                      key={domain}
                      whileHover={{ scale: 1.05, y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => selectAndStart(domain)}
                      className={`p-4 rounded-2xl border-2 text-center transition-all cursor-pointer ${meta.border} ${meta.bg}`}
                    >
                      <div className="text-3xl mb-2">{meta.emoji}</div>
                      <div className={`text-sm font-bold ${meta.text}`}>
                        {isZh ? meta.nameZh : meta.nameEn}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Unmatched core tags as pills */}
              {coreTagsByDomain.unmatched.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {coreTagsByDomain.unmatched.map((tag) => (
                    <button
                      key={tag.nameEn}
                      onClick={() => selectAndStart(tag.nameEn)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                      {isZh ? tag.nameZh : tag.nameEn}
                      <span className="ml-1 text-xs text-gray-400">({tag._count.questions})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Advanced / AP / CCSS */}
        {advancedTags.length > 0 && (
          <section>
            <button
              className="font-heading font-bold text-gray-700 mb-3 text-base flex items-center gap-2 w-full text-left"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              🎓 {isZh ? "进阶挑战 (AP / CCSS)" : "Advanced Topics (AP / CCSS)"}
              <span className={`ml-auto text-gray-400 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}>▼</span>
            </button>
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 pb-2">
                    {advancedTags.map((tag) => (
                      <button
                        key={tag.nameEn}
                        onClick={() => selectAndStart(tag.nameEn)}
                        className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm hover:bg-indigo-100 transition-all"
                      >
                        {isZh ? tag.nameZh : tag.nameEn}
                        <span className="text-xs opacity-60 ml-1">({tag._count.questions})</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* Knowledge Progress Map */}
        {session?.user && (
          <KnowledgePointGrid
            masteryData={masteryData ?? []}
            allKnowledgePoints={KNOWLEDGE_POINT_TAXONOMY.map((kp, i) => ({
              slug: kp.slug, domain: kp.domain, nameEn: kp.nameEn, nameZh: kp.nameZh,
              sortOrder: i, minLevel: kp.minLevel, maxLevel: kp.maxLevel,
            }))}
            isZh={isZh}
          />
        )}
      </div>
    );
  }

  // ─── Phase 2 & 3: Active Session View ────────────────────────────────────────

  const isLoading = nextQuestion.isPending;
  const isSubmitting = submitAttempt.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-16">
      {/* Milestone overlay */}
      <AnimatePresence>
        {milestone !== null && (
          <MilestoneOverlay count={milestone} isZh={isZh} onDone={() => setMilestone(null)} />
        )}
      </AnimatePresence>

      {/* ── Session HUD ───────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
        {/* Back button */}
        <button
          onClick={() => { setSelectedTag(""); setActiveQuestion(null); setLastFeedback(null); }}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-gray-100"
          title={isZh ? "返回选择" : "Back to topics"}
        >
          ←
        </button>

        {/* Domain icon + tag name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">{domainMeta?.emoji ?? "📚"}</span>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 leading-none">{isZh ? "当前挑战" : "Challenge"}</p>
            <p className="text-sm font-semibold text-gray-700 truncate">
              {isZh ? (tags?.find(t => t.nameEn === selectedTag)?.nameZh ?? selectedTag) : selectedTag}
            </p>
          </div>
        </div>

        {/* Streak */}
        <StreakPill streak={profile.streak} isZh={isZh} />

        {/* Lives */}
        <HeartRow lives={lives} />

        {/* Session score */}
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-400">{isZh ? "正确率" : "Accuracy"}</p>
          <p className="text-sm font-bold text-gray-700">
            {attempts === 0 ? "—" : `${accuracyPct}%`}
          </p>
          <p className="text-xs text-gray-400">{correctCount}/{attempts}</p>
        </div>
      </div>

      {/* ── Loading State ─────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="text-4xl inline-block mb-4"
          >
            ⚙️
          </motion.div>
          <p className="text-gray-500">{isZh ? "正在生成题目…" : "Generating question…"}</p>
        </div>
      )}

      {/* ── Active Question Card ──────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeQuestion && !isLoading && (
          <motion.div
            key={activeQuestion.questionId}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-md relative"
          >
            {/* Question header bar */}
            <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 ${domainMeta?.bg ?? "bg-gray-50"}`}>
              <div className="flex items-center gap-2">
                <LevelBadge level={activeQuestion.level} />
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${domainMeta?.bg ?? "bg-gray-100"} ${domainMeta?.text ?? "text-gray-600"} border ${domainMeta?.border ?? "border-gray-200"}`}>
                  {domainMeta?.emoji} {isZh ? (domainMeta?.nameZh ?? activeQuestion.domain) : (domainMeta?.nameEn ?? activeQuestion.domain)}
                </span>
              </div>
              <TimerRing seconds={timeLeft} total={30} />
            </div>

            {/* Question body */}
            <div className="px-5 py-5 relative">
              {/* XP float */}
              {xpFloat !== null && (
                <XpFloatBubble amount={xpFloat} onDone={() => setXpFloat(null)} />
              )}

              <p className="text-xl text-gray-800 font-body leading-relaxed mb-5">
                {isZh ? activeQuestion.promptZh : activeQuestion.promptEn}
              </p>

              {/* Fun fact */}
              {(activeQuestion.funFactEn || activeQuestion.funFactZh) && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-gray-700">
                  <span className="font-semibold text-amber-700 mr-1">🌟 {isZh ? "趣味数学：" : "Fun fact:"}</span>
                  {isZh ? activeQuestion.funFactZh : activeQuestion.funFactEn}
                </div>
              )}

              {/* Answer form */}
              <form onSubmit={onSubmit} className="space-y-3">
                <input
                  ref={answerRef}
                  className="input-fun text-lg w-full"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={isZh ? "输入你的答案…" : "Type your answer…"}
                  disabled={isSubmitting}
                  autoComplete="off"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={!answer.trim() || isSubmitting}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {isSubmitting ? (isZh ? "提交中…" : "Checking…") : (isZh ? "提交答案" : "Submit Answer")}
                  </button>
                  {visibleHints < activeQuestion.hints.length && (
                    <button
                      type="button"
                      className="btn-secondary flex-shrink-0"
                      onClick={() => setVisibleHints((h) => h + 1)}
                    >
                      🔮 {isZh ? "提示" : "Hint"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary flex-shrink-0 text-xs"
                    onClick={startNext}
                    disabled={isLoading}
                    title={isZh ? "跳过这道题" : "Skip this question"}
                  >
                    {isZh ? "跳过" : "Skip"}
                  </button>
                </div>
              </form>

              {/* Hints */}
              <AnimatePresence>
                {visibleHints > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 space-y-2 overflow-hidden"
                  >
                    {activeQuestion.hints.slice(0, visibleHints).map((h, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="bg-fun-yellow/20 border border-fun-yellow/50 rounded-xl px-4 py-2.5 text-sm text-gray-700"
                      >
                        💡 {isZh ? h.zh : h.en}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Feedback Card ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!activeQuestion && lastFeedback && !isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.35 }}
            className={`rounded-2xl border-2 overflow-hidden shadow-md ${
              lastFeedback.isCorrect
                ? "border-green-300 bg-green-50"
                : "border-orange-300 bg-orange-50"
            }`}
          >
            {/* Result banner */}
            <div className={`px-5 py-4 flex items-center gap-3 ${lastFeedback.isCorrect ? "bg-green-100" : "bg-orange-100"}`}>
              <span className="text-4xl">{lastFeedback.isCorrect ? "✅" : "💪"}</span>
              <div>
                <h3 className={`font-heading font-bold text-xl ${lastFeedback.isCorrect ? "text-green-800" : "text-orange-800"}`}>
                  {lastFeedback.title}
                </h3>
                {lastFeedback.isCorrect && profile.streak >= 3 && (
                  <p className="text-sm text-green-700">
                    {isZh ? `🔥 ${profile.streak} 连击！` : `🔥 ${profile.streak} streak!`}
                  </p>
                )}
              </div>
              {lastFeedback.isCorrect && (
                <div className="ml-auto text-right">
                  <p className="text-xs text-green-600">{isZh ? "等级" : "Level"}</p>
                  <LevelBadge level={profile.level} />
                </div>
              )}
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Explanation */}
              {lastFeedback.explanation && (
                <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">
                    {isZh ? "📖 题目解析" : "📖 Explanation"}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{lastFeedback.explanation}</p>
                </div>
              )}

              {/* Concept & Formula */}
              {lastFeedback.concept && (
                <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">
                    {isZh ? "💡 知识点 & 公式" : "💡 Concept & Formula"}
                  </p>
                  <div className="space-y-1.5">
                    {splitConceptSections(lastFeedback.concept, isZh).map((section, idx) => (
                      <p key={idx} className="text-sm text-gray-700 leading-relaxed">{section}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Encouragement (on wrong) */}
              {!lastFeedback.isCorrect && (lastFeedback.encouragement || lastFeedback.coachingTip) && (
                <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm space-y-1">
                  {lastFeedback.encouragement && (
                    <p className="text-sm text-gray-700">{lastFeedback.encouragement}</p>
                  )}
                  {lastFeedback.coachingTip && (
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{isZh ? "建议：" : "Tip: "}</span>
                      {lastFeedback.coachingTip}
                    </p>
                  )}
                </div>
              )}

              {/* Continue button */}
              <button
                onClick={startNext}
                disabled={isLoading}
                className="btn-primary w-full mt-1 disabled:opacity-50"
              >
                {isLoading
                  ? (isZh ? "加载中…" : "Loading…")
                  : lastFeedback.isCorrect
                  ? (isZh ? "继续下一题 →" : "Next Question →")
                  : (isZh ? "再试一道 →" : "Try Another →")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag info strip */}
      {selectedTag && !activeQuestion && !lastFeedback && !isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm mb-1">{getTagNote(selectedTag, isZh)}</p>
          <button onClick={startNext} className="btn-primary mt-3">
            {isZh ? "开始挑战" : "Start Challenge"}
          </button>
        </div>
      )}

      {/* Diagnostic report (knowledge check) */}
      {session?.user && isKnowledgeCheckSelected && (
        <DiagnosticReportCard masteryData={masteryData ?? []} isZh={isZh} />
      )}

      {/* Knowledge point progress (bottom, for logged-in users) */}
      {session?.user && (
        <KnowledgePointGrid
          masteryData={masteryData ?? []}
          allKnowledgePoints={KNOWLEDGE_POINT_TAXONOMY.map((kp, i) => ({
            slug: kp.slug, domain: kp.domain, nameEn: kp.nameEn, nameZh: kp.nameZh,
            sortOrder: i, minLevel: kp.minLevel, maxLevel: kp.maxLevel,
          }))}
          isZh={isZh}
        />
      )}
    </div>
  );
}
