"use client";

import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "bg-fun-green text-white",
  MEDIUM: "bg-fun-yellow text-gray-800",
  HARD: "bg-fun-orange text-white",
  CHALLENGE: "bg-gradient-to-r from-fun-red to-fun-pink text-white",
};

const CATEGORY_ICONS: Record<string, string> = {
  ARITHMETIC: "🔢",
  ALGEBRA: "🔤",
  GEOMETRY: "📐",
  FRACTIONS: "🍕",
  NUMBER_THEORY: "🔍",
  WORD_PROBLEMS: "📖",
  LOGIC: "🧩",
  PROBABILITY: "🎲",
  TRIGONOMETRY: "📏",
  CALCULUS: "∫",
  STATISTICS: "📊",
};

const DIFFICULTY_ORDER = ["EASY", "MEDIUM", "HARD", "CHALLENGE"] as const;

export default function QuestionsPage() {
  const t = useTranslations("questions");
  const locale = useLocale();
  const isZh = locale === "zh";

  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAge, setSelectedAge] = useState<string | null>(null);

  const { data, isLoading, error } = trpc.question.list.useQuery({
    limit: 50,
    difficulty: selectedDifficulty || undefined,
    category: selectedCategory || undefined,
    ageGroup: selectedAge || undefined,
  });

  const questions = data?.questions ?? [];

  return (
    <div>
      {/* Page Header */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-fun-purple mb-2">
          {t("title")} 🧮
        </h1>
        <p className="text-gray-500 font-body">
          {isZh ? "选择一道有趣的题目开始吧！" : "Pick a fun question and start solving!"}
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="bg-white rounded-card shadow-md p-6 mb-8 border border-primary-100"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-wrap gap-6">
          {/* Difficulty Filter */}
          <div>
            <h3 className="text-sm font-heading font-medium text-gray-500 mb-2">
              {t("filterDifficulty")}
            </h3>
            <div className="flex gap-2">
              {DIFFICULTY_ORDER.map((diff) => (
                <button
                  key={diff}
                  onClick={() =>
                    setSelectedDifficulty(selectedDifficulty === diff ? null : diff)
                  }
                  className={`px-4 py-2 rounded-bubble text-sm font-heading font-medium transition-all
                    ${
                      selectedDifficulty === diff
                        ? DIFFICULTY_COLORS[diff] + " shadow-md scale-105"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {t(diff.toLowerCase() as any)}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <h3 className="text-sm font-heading font-medium text-gray-500 mb-2">
              {t("filterCategory")}
            </h3>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
                <button
                  key={cat}
                  onClick={() =>
                    setSelectedCategory(selectedCategory === cat ? null : cat)
                  }
                  className={`px-3 py-2 rounded-bubble text-sm font-heading transition-all flex items-center gap-1
                    ${
                      selectedCategory === cat
                        ? "bg-primary-500 text-white shadow-md scale-105"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {icon}{" "}
                  <span className="capitalize">
                    {cat.replace("_", " ").toLowerCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Age Group Filter */}
          <div>
            <h3 className="text-sm font-heading font-medium text-gray-500 mb-2">
              {t("filterAge")}
            </h3>
            <div className="flex gap-2">
              {[
                { value: "AGE_8_10", label: "8-10" },
                { value: "AGE_10_12", label: "10-12" },
                { value: "AGE_12_14", label: "12-14" },
                { value: "AGE_14_16", label: "14-16" },
                { value: "AGE_16_18", label: "16-18" },
              ].map((age) => (
                <button
                  key={age.value}
                  onClick={() =>
                    setSelectedAge(selectedAge === age.value ? null : age.value)
                  }
                  className={`px-4 py-2 rounded-bubble text-sm font-heading font-medium transition-all
                    ${
                      selectedAge === age.value
                        ? "bg-fun-cyan text-white shadow-md scale-105"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {isZh ? `${age.label}岁` : `Age ${age.label}`}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {(selectedDifficulty || selectedCategory || selectedAge) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedDifficulty(null);
                  setSelectedCategory(null);
                  setSelectedAge(null);
                }}
                className="text-sm text-primary-500 hover:text-primary-700 font-heading underline"
              >
                {isZh ? "清除筛选" : "Clear filters"}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-20">
          <motion.div
            className="text-5xl mb-4 inline-block"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            🧮
          </motion.div>
          <p className="text-gray-500 font-heading">{isZh ? "加载中..." : "Loading questions..."}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">😅</div>
          <p className="text-gray-500 font-heading">
            {isZh ? "加载失败，请重试" : "Failed to load. Please try again."}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && questions.length === 0 && (
        <motion.div
          className="text-center py-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-500 font-heading text-lg">
            {isZh ? "没有找到符合条件的题目" : "No questions match your filters"}
          </p>
          <button
            onClick={() => {
              setSelectedDifficulty(null);
              setSelectedCategory(null);
              setSelectedAge(null);
            }}
            className="mt-4 btn-secondary text-sm"
          >
            {isZh ? "查看所有题目" : "Show all questions"}
          </button>
        </motion.div>
      )}

      {/* Questions Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {questions.map((question, index) => (
            <motion.div
              key={question.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/questions/${question.id}`}>
                <div className="card-fun cursor-pointer h-full flex flex-col group">
                  {/* Category & Difficulty */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">
                      {CATEGORY_ICONS[question.category] || "📝"}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-heading font-bold ${
                        DIFFICULTY_COLORS[question.difficulty] || ""
                      }`}
                    >
                      {t(question.difficulty.toLowerCase() as any)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-heading font-bold text-gray-800 mb-2 group-hover:text-primary-600 transition-colors">
                    {isZh ? question.titleZh : question.titleEn}
                  </h3>

                  {/* Content Preview */}
                  <p className="text-gray-600 text-sm flex-grow mb-4 line-clamp-2 font-body">
                    {isZh ? question.contentZh : question.contentEn}
                  </p>

                  {/* Age Group Tag */}
                  <div className="mb-3">
                    <span className="text-xs bg-primary-50 text-primary-600 px-2 py-1 rounded-full font-heading">
                      {question.ageGroup === "AGE_8_10"
                        ? isZh ? "8-10岁" : "Ages 8-10"
                        : question.ageGroup === "AGE_10_12"
                        ? isZh ? "10-12岁" : "Ages 10-12"
                        : question.ageGroup === "AGE_12_14"
                        ? isZh ? "12-14岁" : "Ages 12-14"
                        : question.ageGroup === "AGE_14_16"
                        ? isZh ? "14-16岁" : "Ages 14-16"
                        : isZh ? "16-18岁" : "Ages 16-18"}
                    </span>
                  </div>

                  {/* Tags */}
                  {question.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-3">
                      {question.tags.map((tagOnQ) => (
                        <span
                          key={tagOnQ.tag.id}
                          className="text-xs bg-fun-purple/10 text-fun-purple px-2 py-0.5 rounded-full font-heading"
                        >
                          {isZh ? tagOnQ.tag.nameZh : tagOnQ.tag.nameEn}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                    <span>👥 {question._count.submissions}</span>
                    <span>💬 {question._count.comments}</span>
                    <span>❤️ {question._count.likes}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
