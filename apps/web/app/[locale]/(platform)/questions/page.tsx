"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";

// Mock data until tRPC is connected
const MOCK_QUESTIONS = [
  {
    id: "1",
    titleEn: "The Pizza Problem",
    titleZh: "披萨问题",
    contentEn: "If you cut a pizza into 8 equal slices and eat 3, what fraction is left?",
    contentZh: "如果你把一个披萨切成8等份，吃了3片，还剩下多少？",
    difficulty: "EASY" as const,
    category: "FRACTIONS" as const,
    ageGroup: "AGE_8_10" as const,
    _count: { submissions: 142, comments: 23, likes: 87 },
  },
  {
    id: "2",
    titleEn: "The Mystery Number",
    titleZh: "神秘数字",
    contentEn: "I am a number. When you multiply me by 6 and add 4, you get 40. What am I?",
    contentZh: "我是一个数字。当你把我乘以6再加4，你得到40。我是什么？",
    difficulty: "MEDIUM" as const,
    category: "ALGEBRA" as const,
    ageGroup: "AGE_10_12" as const,
    _count: { submissions: 89, comments: 15, likes: 56 },
  },
  {
    id: "3",
    titleEn: "Triangle Detective",
    titleZh: "三角形侦探",
    contentEn: "A triangle has angles of 60° and 80°. What is the third angle?",
    contentZh: "一个三角形有60°和80°的角。第三个角是多少？",
    difficulty: "EASY" as const,
    category: "GEOMETRY" as const,
    ageGroup: "AGE_8_10" as const,
    _count: { submissions: 203, comments: 31, likes: 112 },
  },
  {
    id: "4",
    titleEn: "The Staircase Challenge",
    titleZh: "楼梯挑战",
    contentEn: "You can climb 1 or 2 stairs at a time. How many different ways can you climb 5 stairs?",
    contentZh: "你每次可以爬1级或2级台阶。爬5级台阶有多少种不同的方法？",
    difficulty: "HARD" as const,
    category: "LOGIC" as const,
    ageGroup: "AGE_12_14" as const,
    _count: { submissions: 67, comments: 42, likes: 95 },
  },
  {
    id: "5",
    titleEn: "Prime Number Hunter",
    titleZh: "质数猎人",
    contentEn: "How many prime numbers are there between 1 and 20?",
    contentZh: "1到20之间有多少个质数？",
    difficulty: "MEDIUM" as const,
    category: "NUMBER_THEORY" as const,
    ageGroup: "AGE_10_12" as const,
    _count: { submissions: 156, comments: 28, likes: 73 },
  },
  {
    id: "6",
    titleEn: "The Candy Jar",
    titleZh: "糖果罐",
    contentEn: "A jar has 5 red, 3 blue, and 2 green candies. If you pick one randomly, what is the probability of getting a blue candy?",
    contentZh: "一个罐子里有5颗红糖果、3颗蓝糖果和2颗绿糖果。随机拿一颗，拿到蓝糖果的概率是多少？",
    difficulty: "MEDIUM" as const,
    category: "PROBABILITY" as const,
    ageGroup: "AGE_10_12" as const,
    _count: { submissions: 118, comments: 19, likes: 64 },
  },
];

const DIFFICULTY_COLORS = {
  EASY: "bg-fun-green text-white",
  MEDIUM: "bg-fun-yellow text-gray-800",
  HARD: "bg-fun-orange text-white",
  CHALLENGE: "bg-fun-red text-white",
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
};

export default function QuestionsPage() {
  const t = useTranslations("questions");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Determine locale from hook (simplified)
  const isZh = typeof window !== "undefined" && window.location.pathname.includes("/zh");

  const filteredQuestions = MOCK_QUESTIONS.filter((q) => {
    if (selectedDifficulty && q.difficulty !== selectedDifficulty) return false;
    if (selectedCategory && q.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div>
      {/* Page Header */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-fun-purple">
          {t("title")} 🧮
        </h1>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-6 mb-8">
        {/* Difficulty Filter */}
        <div>
          <h3 className="text-sm font-heading font-medium text-gray-500 mb-2">
            {t("filterDifficulty")}
          </h3>
          <div className="flex gap-2">
            {(["EASY", "MEDIUM", "HARD", "CHALLENGE"] as const).map((diff) => (
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
                {icon} {cat.replace("_", " ").toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Questions Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuestions.map((question, index) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={`/questions/${question.id}`}>
              <div className="card-fun cursor-pointer h-full flex flex-col">
                {/* Category & Difficulty */}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-2xl">
                    {CATEGORY_ICONS[question.category]}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-heading font-bold ${
                      DIFFICULTY_COLORS[question.difficulty]
                    }`}
                  >
                    {t(question.difficulty.toLowerCase() as any)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-heading font-bold text-gray-800 mb-2">
                  {isZh ? question.titleZh : question.titleEn}
                </h3>

                {/* Content Preview */}
                <p className="text-gray-600 text-sm flex-grow mb-4 line-clamp-2">
                  {isZh ? question.contentZh : question.contentEn}
                </p>

                {/* Stats */}
                <div className="flex justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                  <span>👥 {question._count.submissions} {t("attempts")}</span>
                  <span>💬 {question._count.comments}</span>
                  <span>❤️ {question._count.likes}</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
