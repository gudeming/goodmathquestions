"use client";

import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { type inferRouterOutputs } from "@trpc/server";
import { type AppRouter } from "@gmq/api";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CurrentUser = NonNullable<RouterOutputs["user"]["me"]>;
type UserStats = RouterOutputs["user"]["stats"];

export default function ProfilePage() {
  const locale = useLocale();
  const isZh = locale === "zh";
  const { data: session } = useSession();

  const { data: userData, isLoading: userLoading } = trpc.user.me.useQuery(
    undefined,
    { enabled: !!session?.user }
  );
  const { data: statsData, isLoading: statsLoading } = trpc.user.stats.useQuery(
    undefined,
    { enabled: !!session?.user }
  );
  const user: CurrentUser | undefined = userData ?? undefined;
  const stats: UserStats | undefined = statsData ?? undefined;

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-2xl font-heading font-bold text-gray-800 mb-2">
          {isZh ? "请先登录" : "Please Log In"}
        </h2>
        <p className="text-gray-500 mb-6">
          {isZh ? "登录后查看你的个人主页" : "Log in to see your profile"}
        </p>
        <Link href="/login" className="btn-primary">
          {isZh ? "登录" : "Log In"}
        </Link>
      </div>
    );
  }

  if (userLoading || !user) {
    return (
      <div className="text-center py-20">
        <motion.div
          className="text-5xl mb-4 inline-block"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          🧮
        </motion.div>
      </div>
    );
  }

  const levelProgress = (user.xp % 100) / 100;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile Header */}
      <motion.div
        className="bg-gradient-to-r from-primary-500 via-fun-purple to-fun-pink rounded-card p-8 text-white mb-8 relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          {["π", "∑", "√", "∞", "+", "×"].map((sym, i) => (
            <span
              key={i}
              className="absolute text-4xl font-mono"
              style={{
                left: `${10 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                transform: `rotate(${i * 15}deg)`,
              }}
            >
              {sym}
            </span>
          ))}
        </div>

        <div className="relative flex items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl shadow-lg border-4 border-white/30">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full" />
            ) : (
              "😎"
            )}
          </div>

          <div className="flex-grow">
            <h1 className="text-3xl font-heading font-bold">{user.displayName}</h1>
            <p className="text-white/80 font-body">@{user.username}</p>

            {/* Level & XP Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-heading font-bold">
                  {isZh ? "等级" : "Level"} {user.level}
                </span>
                <span className="text-white/80">
                  {user.xp} XP
                </span>
              </div>
              <div className="bg-white/20 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="bg-fun-yellow h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress * 100}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
              <p className="text-xs text-white/60 mt-1">
                {100 - (user.xp % 100)} XP {isZh ? "升级" : "to next level"}
              </p>
            </div>
          </div>

          {/* Streak */}
          <div className="text-center">
            <div className="text-3xl mb-1">🔥</div>
            <div className="text-2xl font-heading font-bold">{user.streak}</div>
            <div className="text-xs text-white/80">
              {isZh ? "天连续" : "day streak"}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            icon: "📝",
            label: isZh ? "尝试题目" : "Attempted",
            value: stats?.uniqueQuestions ?? 0,
          },
          {
            icon: "✅",
            label: isZh ? "已解决" : "Solved",
            value: stats?.uniqueSolved ?? 0,
          },
          {
            icon: "🎯",
            label: isZh ? "正确率" : "Accuracy",
            value: `${stats?.accuracy ?? 0}%`,
          },
          {
            icon: "⚡",
            label: isZh ? "总提交" : "Submissions",
            value: stats?.totalAttempted ?? 0,
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="bg-white rounded-card shadow-md p-4 text-center border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-heading font-bold text-gray-800">{stat.value}</div>
            <div className="text-xs text-gray-500 font-heading">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Badges */}
      <motion.div
        className="bg-white rounded-card shadow-md p-6 mb-8 border border-gray-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-xl font-heading font-bold text-gray-800 mb-4">
          🏅 {isZh ? "徽章" : "Badges"}
        </h2>

        {user.badges.length === 0 ? (
          <p className="text-gray-500 text-center py-6 font-body">
            {isZh
              ? "还没有徽章，继续解题来赢得徽章！"
              : "No badges yet. Keep solving questions to earn badges!"}
          </p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {user.badges.map((ub) => (
              <motion.div
                key={ub.badge.id}
                className="text-center group"
                whileHover={{ scale: 1.1 }}
              >
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-fun-yellow to-fun-orange rounded-full flex items-center justify-center text-2xl shadow-md mb-2">
                  🏆
                </div>
                <p className="text-xs font-heading font-bold text-gray-700">
                  {isZh ? ub.badge.nameZh : ub.badge.nameEn}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(ub.earnedAt).toLocaleDateString()}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Classroom info */}
      {user.classroom && (
        <motion.div
          className="bg-fun-cyan/10 rounded-card p-6 border-2 border-fun-cyan/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-xl font-heading font-bold text-gray-800 mb-2">
            🏫 {isZh ? "我的班级" : "My Class"}
          </h2>
          <p className="font-heading text-gray-700">{user.classroom.name}</p>
          <p className="text-sm text-gray-500">
            {isZh ? "班级代码" : "Class code"}: <span className="font-mono font-bold">{user.classroom.classCode}</span>
          </p>
        </motion.div>
      )}
    </div>
  );
}
