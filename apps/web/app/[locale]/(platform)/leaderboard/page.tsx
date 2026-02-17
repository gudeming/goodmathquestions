"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useState } from "react";

type Period = "daily" | "weekly" | "allTime";

const MOCK_LEADERBOARD = [
  { username: "MathWizard99", displayName: "Math Wizard", level: 12, xp: 2450, streak: 15, avatarUrl: null },
  { username: "NumberNinja", displayName: "Number Ninja", level: 10, xp: 2100, streak: 8, avatarUrl: null },
  { username: "AlgebraQueen", displayName: "Algebra Queen", level: 9, xp: 1890, streak: 22, avatarUrl: null },
  { username: "PiMaster", displayName: "Pi Master", level: 8, xp: 1650, streak: 5, avatarUrl: null },
  { username: "GeometryGuru", displayName: "Geometry Guru", level: 7, xp: 1420, streak: 12, avatarUrl: null },
  { username: "FractionFan", displayName: "Fraction Fan", level: 7, xp: 1380, streak: 3, avatarUrl: null },
  { username: "LogicLion", displayName: "Logic Lion", level: 6, xp: 1200, streak: 7, avatarUrl: null },
  { username: "ProbPro", displayName: "Probability Pro", level: 5, xp: 980, streak: 4, avatarUrl: null },
  { username: "CalcChamp", displayName: "Calc Champ", level: 5, xp: 920, streak: 10, avatarUrl: null },
  { username: "MathExplorer", displayName: "Math Explorer", level: 4, xp: 750, streak: 2, avatarUrl: null },
];

const RANK_STYLES = [
  "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg scale-105",
  "bg-gradient-to-r from-gray-300 to-gray-400 text-white shadow-md",
  "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md",
];

const RANK_EMOJIS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const t = useTranslations("gamification");
  const [period, setPeriod] = useState<Period>("allTime");

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="text-5xl mb-3"
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          🏆
        </motion.div>
        <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-fun-yellow to-fun-orange">
          {t("leaderboard")}
        </h1>
      </motion.div>

      {/* Period Toggle */}
      <div className="flex gap-2 mb-8 bg-primary-50 rounded-bubble p-1 max-w-md mx-auto">
        {(["daily", "weekly", "allTime"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 px-4 rounded-bubble text-sm font-heading font-medium transition-all ${
              period === p
                ? "bg-white text-primary-600 shadow-md"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t(p)}
          </button>
        ))}
      </div>

      {/* Leaderboard List */}
      <div className="space-y-3">
        {MOCK_LEADERBOARD.map((user, index) => (
          <motion.div
            key={user.username}
            className={`flex items-center gap-4 p-4 rounded-card transition-all ${
              index < 3
                ? RANK_STYLES[index]
                : "bg-white shadow-md hover:shadow-lg border border-gray-100"
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
          >
            {/* Rank */}
            <div className="w-10 text-center font-heading font-bold text-lg">
              {index < 3 ? RANK_EMOJIS[index] : `#${index + 1}`}
            </div>

            {/* Avatar */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                index < 3
                  ? "bg-white/30"
                  : "bg-gradient-to-r from-primary-400 to-fun-purple"
              }`}
            >
              {user.displayName[0]}
            </div>

            {/* Info */}
            <div className="flex-grow">
              <div className="font-heading font-bold text-sm">
                {user.displayName}
              </div>
              <div
                className={`text-xs ${
                  index < 3 ? "opacity-80" : "text-gray-400"
                }`}
              >
                @{user.username}
              </div>
            </div>

            {/* Stats */}
            <div className="text-right">
              <div className="font-heading font-bold">
                {user.xp.toLocaleString()} XP
              </div>
              <div
                className={`text-xs flex items-center gap-1 justify-end ${
                  index < 3 ? "opacity-80" : "text-gray-400"
                }`}
              >
                🔥 {user.streak}d · Lv.{user.level}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
