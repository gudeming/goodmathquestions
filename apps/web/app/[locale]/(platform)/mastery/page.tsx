"use client";

import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { KNOWLEDGE_POINT_TAXONOMY } from "@gmq/math-engine";
import KnowledgePointGrid from "@/components/mastery/KnowledgePointGrid";
import DiagnosticReportCard from "@/components/mastery/DiagnosticReportCard";

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

const INITIAL_PROFILE: ProfileState = {
  accuracy: 0.7,
  avgTimeMs: 30000,
  streak: 0,
  level: 2,
};

function getTagNote(tagName: string, isZh: boolean): string {
  const lower = tagName.toLowerCase();

  if (tagName.startsWith("CCSS-")) {
    return isZh
      ? "这是美国学校常用课程标准代码（Common Core）。"
      : "This is a US school Common Core standards code.";
  }

  if (tagName.startsWith("AP-")) {
    return isZh
      ? "这是美国高中 AP 课程考点（进阶难度）。"
      : "This is an AP high-school topic (advanced level).";
  }
  if (/^knowledge_check$/i.test(tagName) || tagName === "知识检查") {
    return isZh
      ? "系统将分阶段抽查小学→初中→高中考点，评估你的知识状态。"
      : "The system will progressively check elementary -> middle -> high school topics to assess your knowledge state.";
  }
  if (/^grade[_\s-]?[4-8]$/i.test(tagName)) {
    return isZh
      ? "这是年级专属闯关：会覆盖该年级主要考点并自动调难度。"
      : "This is a grade-specific challenge covering core topics with adaptive difficulty.";
  }

  if (lower.includes("alg")) {
    return isZh ? "重点：方程、函数和代数表达式。" : "Focus: equations, functions, and algebraic expressions.";
  }
  if (lower.includes("geo") || lower.includes("angle") || lower.includes("shape")) {
    return isZh ? "重点：图形、角度、面积和几何关系。" : "Focus: shapes, angles, area, and geometry relations.";
  }
  if (lower.includes("trig") || lower.includes("sin") || lower.includes("cos")) {
    return isZh ? "重点：三角函数与直角三角形关系。" : "Focus: trigonometric ratios and right triangles.";
  }
  if (lower.includes("calc") || lower.includes("derivative") || lower.includes("integral")) {
    return isZh ? "重点：导数、积分与变化率。" : "Focus: derivatives, integrals, and rates of change.";
  }
  if (lower.includes("stat") || lower.includes("data")) {
    return isZh ? "重点：平均数、分布和数据解读。" : "Focus: averages, distributions, and data interpretation.";
  }
  if (lower.includes("prob")) {
    return isZh ? "重点：事件发生的可能性与概率计算。" : "Focus: chance of events and probability calculation.";
  }
  if (lower.includes("fraction") || lower.includes("ratio")) {
    return isZh ? "重点：分数、比率和比例关系。" : "Focus: fractions, ratios, and proportional reasoning.";
  }

  return isZh
    ? "系统会围绕这个标签自动生成对应考点题目。"
    : "The system will generate questions around this focus tag.";
}

function getRecommendedAge(tagName: string, isZh: boolean): string {
  const lower = tagName.toLowerCase();

  if (tagName.startsWith("AP-") || lower.includes("calc")) {
    return isZh ? "推荐年龄：16-18岁（高中进阶）" : "Recommended age: 16-18 (advanced high school)";
  }
  if (/^knowledge_check$/i.test(tagName) || tagName === "知识检查") {
    return isZh ? "推荐年龄：9-18岁（全学段诊断）" : "Recommended age: 9-18 (full K-12 diagnostic)";
  }
  if (/^grade[_\s-]?4$/i.test(tagName)) {
    return isZh ? "推荐年龄：9-10岁（4年级）" : "Recommended age: 9-10 (Grade 4)";
  }
  if (/^grade[_\s-]?5$/i.test(tagName)) {
    return isZh ? "推荐年龄：10-11岁（5年级）" : "Recommended age: 10-11 (Grade 5)";
  }
  if (/^grade[_\s-]?6$/i.test(tagName)) {
    return isZh ? "推荐年龄：11-12岁（6年级）" : "Recommended age: 11-12 (Grade 6)";
  }
  if (/^grade[_\s-]?7$/i.test(tagName)) {
    return isZh ? "推荐年龄：12-13岁（7年级）" : "Recommended age: 12-13 (Grade 7)";
  }
  if (/^grade[_\s-]?8$/i.test(tagName)) {
    return isZh ? "推荐年龄：13-14岁（8年级）" : "Recommended age: 13-14 (Grade 8)";
  }
  if (lower.includes("trig") || lower.includes("stat") || lower.includes("ccss-hsf") || lower.includes("ccss-hsa")) {
    return isZh ? "推荐年龄：14-18岁（高中）" : "Recommended age: 14-18 (high school)";
  }
  if (lower.includes("fraction") || lower.includes("ratio") || lower.includes("number") || lower.includes("prob")) {
    return isZh ? "推荐年龄：10-14岁（小学高年级到初中）" : "Recommended age: 10-14 (upper elementary to middle school)";
  }
  if (lower.includes("geo") || lower.includes("alg")) {
    return isZh ? "推荐年龄：12-16岁（初中到高中）" : "Recommended age: 12-16 (middle to high school)";
  }

  return isZh ? "推荐年龄：8-18岁（系统会自动调节难度）" : "Recommended age: 8-18 (difficulty adapts automatically)";
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

function getPerformanceMood(accuracyPct: number, streak: number, avgTimeMs: number, isZh: boolean): { emoji: string; text: string } {
  if (accuracyPct >= 85 && streak >= 3 && avgTimeMs <= 22000) {
    return { emoji: "🌟", text: isZh ? "超棒状态！继续冲刺！" : "Awesome form. Keep the streak!" };
  }
  if (accuracyPct >= 70) {
    return { emoji: "🔥", text: isZh ? "表现很稳，继续加速！" : "Great consistency. Speed up a bit!" };
  }
  if (accuracyPct >= 50) {
    return { emoji: "💪", text: isZh ? "正在进步，基础在变强！" : "Good progress. Your base is improving!" };
  }
  return { emoji: "🌱", text: isZh ? "别担心，练习会让你更强！" : "No worries. Practice will make you stronger!" };
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export default function MasteryPage() {
  const locale = useLocale();
  const isZh = locale === "zh";
  const { data: session } = useSession();

  const [selectedTag, setSelectedTag] = useState<string>("");
  const [profile, setProfile] = useState<ProfileState>(INITIAL_PROFILE);
  const [answer, setAnswer] = useState("");
  const [activeQuestion, setActiveQuestion] = useState<{
    questionId: string;
    promptEn: string;
    promptZh: string;
    hints: Array<{ en: string; zh: string }>;
    funFactEn?: string;
    funFactZh?: string;
    level: number;
    domain: string;
    knowledgePointSlug: string;
  } | null>(null);
  const [visibleHints, setVisibleHints] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<FeedbackState | null>(null);
  const isKnowledgeCheckSelected = /^knowledge_check$/i.test(selectedTag) || selectedTag === "知识检查";

  const { data: tags, isLoading: tagsLoading } =
    trpc.mastery.listFocusTags.useQuery();

  const { data: masteryData } = trpc.mastery.getMyMastery.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

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
    },
  });

  const submitAttempt = trpc.mastery.submitAttempt.useMutation({
    onSuccess: (data) => {
      setAttempts((v) => v + 1);
      if (data.isCorrect) {
        setCorrectCount((v) => v + 1);
      }
      setProfile(data.updatedProfile);
      setLastFeedback({
        isCorrect: data.isCorrect,
        title: data.isCorrect
          ? (isZh ? "答对了！" : "Correct!")
          : (isZh ? "再试一次，你可以的！" : "Try again, you can do it!"),
        explanation: isZh ? data.explanation?.zh : data.explanation?.en,
        concept: isZh ? data.conceptNote?.zh : data.conceptNote?.en,
        encouragement: isZh
          ? (data.encouragement?.zh ?? "继续加油！")
          : (data.encouragement?.en ?? "Keep going!"),
        coachingTip: isZh ? data.coachingTip?.zh : data.coachingTip?.en,
      });
      setActiveQuestion(null);
    },
  });

  const accuracyPct = useMemo(() => {
    if (attempts === 0) return 0;
    return Math.round((correctCount / attempts) * 100);
  }, [attempts, correctCount]);
  const levelProgressPct = clampPct(Math.round((profile.level / 5) * 100));
  const speedScore = clampPct(Math.round(100 - (profile.avgTimeMs / 70000) * 100));
  const streakScore = clampPct(profile.streak * 15);
  const speedLabel = profile.avgTimeMs <= 22000
    ? (isZh ? "闪电速度" : "Lightning Fast")
    : profile.avgTimeMs <= 40000
    ? (isZh ? "稳定速度" : "Steady Speed")
    : (isZh ? "先求稳，再提速" : "Build accuracy, then speed");
  const mood = getPerformanceMood(accuracyPct, profile.streak, profile.avgTimeMs, isZh);

  const startOrNext = () => {
    if (!selectedTag) return;
    nextQuestion.mutate({
      tagName: selectedTag,
      profile,
      attempts,
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion || !answer.trim()) return;

    submitAttempt.mutate({
      questionId: activeQuestion.questionId,
      userAnswer: answer.trim(),
      responseTimeMs: Math.max(0, Date.now() - startedAt),
      profile,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-800">
          {isZh ? "闯关模式" : "Mastery Mode"} 🚀
        </h1>
        <p className="text-gray-500 mt-1">
          {isZh
            ? "选择考点标签，系统会随机出题，并根据正确率和速度自动调整难度。"
            : "Pick a focus tag. Questions are generated randomly, and difficulty adapts to your accuracy and speed."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-primary-100 rounded-card p-4">
          <h2 className="font-heading font-bold mb-3 text-gray-800">
            {isZh ? "选择考点标签" : "Choose Focus Tag"}
          </h2>
          {tagsLoading ? (
            <p className="text-gray-500 text-sm">{isZh ? "加载中..." : "Loading..."}</p>
          ) : (
            <div className="space-y-2">
              <select
                className="input-fun"
                value={selectedTag}
                onChange={(e) => {
                  setSelectedTag(e.target.value);
                  setActiveQuestion(null);
                  setLastFeedback(null);
                  setAnswer("");
                  setVisibleHints(0);
                  setStartedAt(0);
                }}
              >
                <option value="">{isZh ? "请选择" : "Select one"}</option>
                {(tags ?? []).map((tag) => (
                  <option key={tag.nameEn} value={tag.nameEn}>
                    {isZh ? tag.nameZh : tag.nameEn} ({tag._count.questions})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                {selectedTag
                  ? getTagNote(selectedTag, isZh)
                  : isZh
                  ? "提示：先选一个标签，系统会按这个考点连续出题。"
                  : "Tip: choose a tag first. Questions will keep focusing on this topic."}
              </p>
              {selectedTag && (
                <p className="text-xs text-primary-600 font-medium">
                  {getRecommendedAge(selectedTag, isZh)}
                </p>
              )}
            </div>
          )}

          <button
            onClick={startOrNext}
            disabled={!selectedTag || nextQuestion.isPending || submitAttempt.isPending}
            className="btn-primary mt-4 w-full disabled:opacity-50"
          >
            {activeQuestion
              ? isZh
                ? "跳到下一题"
                : "Skip to Next"
              : isZh
              ? "开始闯关"
              : "Start Challenge"}
          </button>
        </div>

        <div className="bg-white border border-primary-100 rounded-card p-4 bg-gradient-to-br from-primary-50/60 via-fun-cyan/10 to-fun-yellow/20">
          <h2 className="font-heading font-bold mb-3 text-gray-800">
            {isZh ? "当前表现" : "Performance"}
          </h2>
          <div className="rounded-bubble border border-primary-100 bg-white/80 p-3 mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{isZh ? "本轮状态" : "Session Mood"}</p>
              <p className="text-sm font-heading font-semibold text-gray-700">{mood.text}</p>
            </div>
            <div className="text-3xl" aria-hidden>{mood.emoji}</div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="bg-slate-900 text-white rounded-bubble p-3 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{isZh ? "吃豆豆挑战地图" : "Pac-Math Track"}</span>
                <span>Lv.{profile.level}/5</span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                    <span>{isZh ? "正确率赛道" : "Accuracy Lane"}</span>
                    <span>{accuracyPct}%</span>
                  </div>
                  <div className="relative h-7 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-around px-2 text-[10px] text-fun-yellow/80">
                      <span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span>
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 text-lg transition-all duration-500" style={{ left: `calc(${clampPct(accuracyPct)}% - 10px)` }}>
                      🟡
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                    <span>{isZh ? "连击赛道" : "Streak Lane"}</span>
                    <span>x{profile.streak}</span>
                  </div>
                  <div className="relative h-7 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-around px-2 text-[10px] text-fun-orange/80">
                      <span>✦</span><span>✦</span><span>✦</span><span>✦</span><span>✦</span><span>✦</span><span>✦</span><span>✦</span>
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 text-lg transition-all duration-500" style={{ left: `calc(${streakScore}% - 10px)` }}>
                      👾
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                    <span>{isZh ? "速度赛道" : "Speed Lane"}</span>
                    <span>{(profile.avgTimeMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="relative h-7 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-around px-2 text-[10px] text-fun-cyan/80">
                      <span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span>
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 text-lg transition-all duration-500" style={{ left: `calc(${speedScore}% - 10px)` }}>
                      🚀
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/80 rounded-bubble p-3 border border-primary-100">
                <p className="text-xs text-gray-500 mb-1">{isZh ? "等级进度" : "Level Progress"}</p>
                <p className="text-lg font-bold text-primary-700">{levelProgressPct}%</p>
              </div>
              <div className="bg-white/80 rounded-bubble p-3 border border-cyan-100">
                <p className="text-xs text-gray-500 mb-1">{isZh ? "速度评级" : "Speed Rating"}</p>
                <p className="text-sm font-semibold text-cyan-700">{speedLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeQuestion && (
        <motion.div
          className="bg-white border-2 border-fun-cyan/30 rounded-card p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex gap-2 mb-3 text-xs">
            <span className="badge-level">Lv.{activeQuestion.level}</span>
            <span className="badge-xp">{activeQuestion.domain}</span>
          </div>
          <p className="text-xl text-gray-800 font-body mb-4">
            {isZh ? activeQuestion.promptZh : activeQuestion.promptEn}
          </p>
          {(activeQuestion.funFactEn || activeQuestion.funFactZh) && (
            <div className="mb-4 rounded-bubble border border-fun-orange/40 bg-fun-orange/10 px-3 py-2 text-sm text-gray-700">
              <span className="font-semibold mr-1">{isZh ? "趣味数学：" : "Fun fact:"}</span>
              {isZh ? activeQuestion.funFactZh : activeQuestion.funFactEn}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <input
              className="input-fun text-lg"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={isZh ? "输入你的答案" : "Type your answer"}
              autoFocus
            />

            <div className="flex gap-3">
              <button
                type="submit"
                className="btn-primary"
                disabled={!answer.trim() || submitAttempt.isPending}
              >
                {isZh ? "提交答案" : "Submit"}
              </button>

              {visibleHints < activeQuestion.hints.length && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setVisibleHints((h) => h + 1)}
                >
                  {isZh ? "显示提示" : "Show Hint"}
                </button>
              )}
            </div>
          </form>

          {visibleHints > 0 && (
            <div className="mt-4 space-y-2">
              {activeQuestion.hints.slice(0, visibleHints).map((h, idx) => (
                <div key={idx} className="bg-fun-yellow/20 border border-fun-yellow/40 rounded-bubble px-3 py-2 text-sm">
                  💡 {isZh ? h.zh : h.en}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {!activeQuestion && lastFeedback && (
        <div className="bg-white border border-primary-100 rounded-card p-4 space-y-3">
          <p className={`font-heading font-bold ${lastFeedback.isCorrect ? "text-green-700" : "text-orange-700"}`}>
            {lastFeedback.title}
          </p>
          {lastFeedback.explanation && (
            <div className="bg-primary-50 rounded-bubble p-3">
              <p className="text-xs font-semibold text-primary-700 mb-1">{isZh ? "题目解析" : "Explanation"}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{lastFeedback.explanation}</p>
            </div>
          )}
          {lastFeedback.concept && (
            <div className="bg-fun-cyan/10 border border-fun-cyan/30 rounded-bubble p-3">
              <p className="text-xs font-semibold text-cyan-700 mb-1">{isZh ? "知识点与公式" : "Concept & Formula"}</p>
              <div className="space-y-2">
                {splitConceptSections(lastFeedback.concept, isZh).map((section, idx) => (
                  <p key={idx} className="text-sm text-gray-700 leading-relaxed">
                    {section}
                  </p>
                ))}
              </div>
            </div>
          )}
          {!lastFeedback.isCorrect && (lastFeedback.encouragement || lastFeedback.coachingTip) && (
            <div className="bg-fun-yellow/20 border border-fun-yellow/40 rounded-bubble p-3 space-y-1">
              {lastFeedback.encouragement && <p className="text-sm text-gray-700">{lastFeedback.encouragement}</p>}
              {lastFeedback.coachingTip && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{isZh ? "建议：" : "Tip: "}</span>
                  {lastFeedback.coachingTip}
                </p>
              )}
            </div>
          )}
          <button
            onClick={startOrNext}
            className="btn-primary mt-3"
            disabled={!selectedTag || nextQuestion.isPending}
          >
            {isZh ? "继续下一题" : "Continue"}
          </button>
        </div>
      )}

      {session?.user && isKnowledgeCheckSelected && (
        <DiagnosticReportCard masteryData={masteryData ?? []} isZh={isZh} />
      )}

      {session?.user && (
        <KnowledgePointGrid
          masteryData={masteryData ?? []}
          allKnowledgePoints={KNOWLEDGE_POINT_TAXONOMY.map((kp, i) => ({
            slug: kp.slug,
            domain: kp.domain,
            nameEn: kp.nameEn,
            nameZh: kp.nameZh,
            sortOrder: i,
            minLevel: kp.minLevel,
            maxLevel: kp.maxLevel,
          }))}
          isZh={isZh}
        />
      )}
    </div>
  );
}
