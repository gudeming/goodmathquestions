"use client";

import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

export default function AdminDashboard() {
  const locale = useLocale();
  const isZh = locale === "zh";
  const { data: stats, isLoading } = trpc.admin.dashboardStats.useQuery();

  const statCards = [
    {
      label: isZh ? "总题目数" : "Total Questions",
      value: stats?.totalQuestions ?? 0,
      icon: "📝",
      color: "from-primary-500 to-fun-purple",
    },
    {
      label: isZh ? "已发布" : "Published",
      value: stats?.publishedQuestions ?? 0,
      icon: "✅",
      color: "from-fun-green to-fun-cyan",
    },
    {
      label: isZh ? "总用户数" : "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: "👦",
      color: "from-fun-yellow to-fun-orange",
    },
    {
      label: isZh ? "总提交数" : "Total Submissions",
      value: stats?.totalSubmissions ?? 0,
      icon: "📊",
      color: "from-fun-pink to-fun-purple",
    },
    {
      label: isZh ? "今日提交" : "Today's Submissions",
      value: stats?.todaySubmissions ?? 0,
      icon: "🔥",
      color: "from-fun-orange to-fun-red",
    },
    {
      label: isZh ? "评论数" : "Comments",
      value: stats?.totalComments ?? 0,
      icon: "💬",
      color: "from-fun-cyan to-primary-500",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-heading font-bold text-gray-800 mb-2">
          {isZh ? "管理后台" : "Admin Dashboard"} 🛠️
        </h1>
        <p className="text-gray-500 font-body mb-8">
          {isZh ? "管理题目、用户和内容审核" : "Manage questions, users, and content moderation"}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            className="bg-white rounded-card shadow-md p-5 border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{card.icon}</span>
              <span className="text-sm font-heading text-gray-500">{card.label}</span>
            </div>
            <div className={`text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r ${card.color}`}>
              {isLoading ? "..." : card.value.toLocaleString()}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-heading font-bold text-gray-800 mb-4">
        {isZh ? "快速操作" : "Quick Actions"}
      </h2>
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/admin/questions">
          <motion.div
            className="card-fun text-center cursor-pointer"
            whileHover={{ scale: 1.03 }}
          >
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-heading font-bold text-gray-800">
              {isZh ? "管理题目" : "Manage Questions"}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {isZh ? "添加、编辑、发布题目" : "Add, edit, publish questions"}
            </p>
          </motion.div>
        </Link>

        <Link href="/admin/questions?action=new">
          <motion.div
            className="card-fun text-center cursor-pointer"
            whileHover={{ scale: 1.03 }}
          >
            <div className="text-4xl mb-3">➕</div>
            <h3 className="font-heading font-bold text-gray-800">
              {isZh ? "新建题目" : "New Question"}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {isZh ? "创建新的数学题目" : "Create a new math question"}
            </p>
          </motion.div>
        </Link>

        <Link href="/admin/scenes">
          <motion.div
            className="card-fun text-center cursor-pointer"
            whileHover={{ scale: 1.03 }}
          >
            <div className="text-4xl mb-3">🎬</div>
            <h3 className="font-heading font-bold text-gray-800">
              {isZh ? "场景实验室" : "Scene Playground"}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {isZh ? "编辑场景配置，预览三个相位" : "Edit scene configs, preview all three phases"}
            </p>
          </motion.div>
        </Link>

        <motion.div
          className="card-fun text-center opacity-60"
          title="Coming in Phase 4"
        >
          <div className="text-4xl mb-3">🛡️</div>
          <h3 className="font-heading font-bold text-gray-800">
            {isZh ? "内容审核" : "Content Moderation"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {isZh ? "审核评论和用户内容" : "Review comments and user content"}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
