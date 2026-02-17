"use client";

import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { type inferRouterOutputs } from "@trpc/server";
import { type AppRouter } from "@gmq/api";
import { trpc } from "@/lib/trpc";
import { QuestionForm } from "@/components/admin/QuestionForm";

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "bg-fun-green text-white",
  MEDIUM: "bg-fun-yellow text-gray-800",
  HARD: "bg-fun-orange text-white",
  CHALLENGE: "bg-fun-red text-white",
};

type RouterOutputs = inferRouterOutputs<AppRouter>;
type AdminQuestion = RouterOutputs["admin"]["listQuestions"]["questions"][number];

export default function AdminQuestionsPage() {
  const locale = useLocale();
  const isZh = locale === "zh";
  const searchParams = useSearchParams();
  const showNewForm = searchParams.get("action") === "new";

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(showNewForm);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.listQuestions.useQuery({
    limit: 100,
    search: search || undefined,
  });

  const togglePublish = trpc.admin.togglePublish.useMutation({
    onSuccess: () => utils.admin.listQuestions.invalidate(),
  });

  const deleteQuestion = trpc.admin.deleteQuestion.useMutation({
    onSuccess: () => utils.admin.listQuestions.invalidate(),
  });

  const questions: AdminQuestion[] = data?.questions ?? [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-800">
            {isZh ? "题目管理" : "Question Management"} 📝
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isZh
              ? `共 ${questions.length} 道题目`
              : `${questions.length} questions total`}
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
          }}
          className="btn-primary"
        >
          {isZh ? "➕ 新建题目" : "➕ New Question"}
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-fun max-w-md"
          placeholder={isZh ? "搜索题目..." : "Search questions..."}
        />
      </div>

      {/* Question Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="bg-white rounded-card shadow-2xl w-full max-w-3xl p-8 mb-10"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-heading font-bold">
                  {editingId
                    ? isZh ? "编辑题目" : "Edit Question"
                    : isZh ? "新建题目" : "New Question"}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-2xl text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <QuestionForm
                questionId={editingId}
                onSuccess={() => {
                  setShowForm(false);
                  setEditingId(null);
                  utils.admin.listQuestions.invalidate();
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Questions Table */}
      <div className="bg-white rounded-card shadow-md overflow-hidden border border-gray-100">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 font-heading">
              {isZh ? "加载中..." : "Loading..."}
            </p>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 font-heading">
              {isZh ? "暂无题目" : "No questions yet"}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-primary-50">
              <tr>
                <th className="text-left p-4 font-heading text-sm text-gray-600">
                  {isZh ? "题目" : "Question"}
                </th>
                <th className="text-center p-4 font-heading text-sm text-gray-600 w-24">
                  {isZh ? "难度" : "Difficulty"}
                </th>
                <th className="text-center p-4 font-heading text-sm text-gray-600 w-24">
                  {isZh ? "分类" : "Category"}
                </th>
                <th className="text-center p-4 font-heading text-sm text-gray-600 w-24">
                  {isZh ? "状态" : "Status"}
                </th>
                <th className="text-center p-4 font-heading text-sm text-gray-600 w-20">
                  {isZh ? "提交" : "Subs"}
                </th>
                <th className="text-right p-4 font-heading text-sm text-gray-600 w-40">
                  {isZh ? "操作" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questions.map((q) => (
                <tr key={q.id} className="hover:bg-primary-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-heading font-semibold text-gray-800 text-sm">
                      {isZh ? q.titleZh : q.titleEn}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                      {isZh ? q.contentZh : q.contentEn}
                    </p>
                  </td>
                  <td className="text-center p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-heading font-bold ${DIFFICULTY_COLORS[q.difficulty]}`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="text-center p-4">
                    <span className="text-xs font-heading text-gray-500">
                      {q.category}
                    </span>
                  </td>
                  <td className="text-center p-4">
                    <button
                      onClick={() => togglePublish.mutate({ id: q.id })}
                      className={`px-2 py-1 rounded-full text-xs font-heading font-bold transition-colors ${
                        q.isPublished
                          ? "bg-fun-green/20 text-fun-green hover:bg-fun-green/30"
                          : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                      }`}
                    >
                      {q.isPublished
                        ? isZh ? "已发布" : "Published"
                        : isZh ? "草稿" : "Draft"}
                    </button>
                  </td>
                  <td className="text-center p-4 text-sm text-gray-500">
                    {q._count.submissions}
                  </td>
                  <td className="text-right p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingId(q.id);
                          setShowForm(true);
                        }}
                        className="px-3 py-1 bg-primary-50 text-primary-600 rounded-bubble text-xs font-heading hover:bg-primary-100 transition-colors"
                      >
                        {isZh ? "编辑" : "Edit"}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(isZh ? "确定要删除这道题吗？" : "Delete this question?")) {
                            deleteQuestion.mutate({ id: q.id });
                          }
                        }}
                        className="px-3 py-1 bg-red-50 text-red-500 rounded-bubble text-xs font-heading hover:bg-red-100 transition-colors"
                      >
                        {isZh ? "删除" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
