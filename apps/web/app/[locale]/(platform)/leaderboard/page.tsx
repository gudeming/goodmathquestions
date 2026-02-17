"use client";

import { useTranslations, useLocale } from "next-intl";
import { motion } from "framer-motion";
import { useState } from "react";
import { type inferRouterOutputs } from "@trpc/server";
import { type AppRouter } from "@gmq/api";
import { trpc } from "@/lib/trpc";

type Period = "daily" | "weekly" | "allTime";

const RANK_STYLES = [
  "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg scale-[1.02]",
  "bg-gradient-to-r from-gray-300 to-gray-400 text-white shadow-md",
  "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md",
];

const RANK_EMOJIS = ["🥇", "🥈", "🥉"];

type RouterOutputs = inferRouterOutputs<AppRouter>;
type LeaderboardUser = RouterOutputs["user"]["leaderboard"][number];

export default function LeaderboardPage() {
  const t = useTranslations("gamification");
  const locale = useLocale();
  const isZh = locale === "zh";
  const [period, setPeriod] = useState<Period>("allTime");

  const { data, isLoading } = trpc.user.leaderboard.useQuery({
    period,
    limit: 50,
  });
  const users: LeaderboardUser[] = data ?? [];

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

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12">
          <motion.div
            className="text-4xl inline-block"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            🏆
          </motion.div>
          <p className="text-gray-500 mt-2 font-heading">
            {isZh ? "加载排行榜..." : "Loading leaderboard..."}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && users.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500 font-heading">
            {isZh ? "暂无数据" : "No data yet. Be the first!"}
          </p>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-3">
        {users.map((user, index) => (
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
            whileHover={{ scale: 1.01 }}
          >
            {/* Rank */}
            <div className="w-10 text-center font-heading font-bold text-lg shrink-0">
              {index < 3 ? RANK_EMOJIS[index] : `#${index + 1}`}
            </div>

            {/* Avatar */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${
                index < 3
                  ? "bg-white/30"
                  : "bg-gradient-to-r from-primary-400 to-fun-purple"
              }`}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full" />
              ) : (
                user.displayName[0]
              )}
            </div>

            {/* Info */}
            <div className="flex-grow min-w-0">
              <div className="font-heading font-bold text-sm truncate">
                {user.displayName}
              </div>
              <div className={`text-xs ${index < 3 ? "opacity-80" : "text-gray-400"}`}>
                @{user.username}
              </div>
            </div>

            {/* Stats */}
            <div className="text-right shrink-0">
              <div className="font-heading font-bold">
                {Number("periodXp" in user ? user.periodXp : user.xp).toLocaleString()} XP
              </div>
              <div className={`text-xs flex items-center gap-1 justify-end ${index < 3 ? "opacity-80" : "text-gray-400"}`}>
                🔥 {user.streak}d · Lv.{user.level}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
