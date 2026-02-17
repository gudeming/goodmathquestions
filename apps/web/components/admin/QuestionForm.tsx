"use client";

import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface QuestionFormProps {
  questionId?: string | null;
  onSuccess: () => void;
}

const CATEGORIES = [
  "ARITHMETIC", "ALGEBRA", "GEOMETRY", "FRACTIONS",
  "NUMBER_THEORY", "WORD_PROBLEMS", "LOGIC", "PROBABILITY",
  "TRIGONOMETRY", "CALCULUS", "STATISTICS",
];

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "CHALLENGE"];
const AGE_GROUPS = ["AGE_8_10", "AGE_10_12", "AGE_12_14", "AGE_14_16", "AGE_16_18"];

const ANIMATION_TYPES = [
  { value: "pizza_slice", label: "Pizza/Fraction" },
  { value: "balance_scale", label: "Balance Scale (Algebra)" },
  { value: "number_journey", label: "Number Line Journey" },
  { value: "triangle_angles", label: "Triangle Angles" },
  { value: "candy_jar", label: "Candy Jar (Probability)" },
  { value: "staircase", label: "Staircase (Logic)" },
  { value: "number_combine", label: "Number Combine (Arithmetic)" },
  { value: "magic_square", label: "Magic Square" },
];

export function QuestionForm({ questionId, onSuccess }: QuestionFormProps) {
  const locale = useLocale();
  const isZh = locale === "zh";

  const [form, setForm] = useState({
    titleEn: "",
    titleZh: "",
    contentEn: "",
    contentZh: "",
    difficulty: "EASY",
    category: "ARITHMETIC",
    ageGroup: "AGE_8_10",
    answer: "",
    answerExplainEn: "",
    answerExplainZh: "",
    funFactEn: "",
    funFactZh: "",
    isPublished: false,
    sortOrder: 0,
    animationType: "pizza_slice",
    hints: [{ en: "", zh: "" }],
  });

  const createQuestion = trpc.admin.createQuestion.useMutation({
    onSuccess: () => onSuccess(),
  });

  const updateQuestion = trpc.admin.updateQuestion.useMutation({
    onSuccess: () => onSuccess(),
  });

  const update = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addHint = () => {
    setForm((prev) => ({
      ...prev,
      hints: [...prev.hints, { en: "", zh: "" }],
    }));
  };

  const removeHint = (index: number) => {
    setForm((prev) => ({
      ...prev,
      hints: prev.hints.filter((_, i) => i !== index),
    }));
  };

  const updateHint = (index: number, lang: "en" | "zh", value: string) => {
    setForm((prev) => ({
      ...prev,
      hints: prev.hints.map((h, i) =>
        i === index ? { ...h, [lang]: value } : h
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      titleEn: form.titleEn,
      titleZh: form.titleZh,
      contentEn: form.contentEn,
      contentZh: form.contentZh,
      difficulty: form.difficulty as any,
      category: form.category as any,
      ageGroup: form.ageGroup as any,
      answer: form.answer,
      answerExplainEn: form.answerExplainEn || undefined,
      answerExplainZh: form.answerExplainZh || undefined,
      funFactEn: form.funFactEn || undefined,
      funFactZh: form.funFactZh || undefined,
      isPublished: form.isPublished,
      sortOrder: form.sortOrder,
      hints: form.hints.filter((h) => h.en || h.zh),
      animationConfig: { type: form.animationType },
    };

    if (questionId) {
      updateQuestion.mutate({ id: questionId, data });
    } else {
      createQuestion.mutate(data);
    }
  };

  const isPending = createQuestion.isPending || updateQuestion.isPending;
  const error = createQuestion.error || updateQuestion.error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-card text-sm">
          {error.message}
        </div>
      )}

      {/* Title (EN/ZH) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-heading font-medium text-gray-600 mb-1">
            Title (English) *
          </label>
          <input
            type="text"
            value={form.titleEn}
            onChange={(e) => update("titleEn", e.target.value)}
            className="input-fun text-sm"
            placeholder="The Pizza Problem"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-heading font-medium text-gray-600 mb-1">
            标题 (中文) *
          </label>
          <input
            type="text"
            value={form.titleZh}
            onChange={(e) => update("titleZh", e.target.value)}
            className="input-fun text-sm"
            placeholder="披萨问题"
            required
          />
        </div>
      </div>

      {/* Content (EN/ZH) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-heading font-medium text-gray-600 mb-1">
            Question (English) *
          </label>
          <textarea
            value={form.contentEn}
            onChange={(e) => update("contentEn", e.target.value)}
            className="input-fun text-sm resize-none"
            rows={3}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-heading font-medium text-gray-600 mb-1">
            题目内容 (中文) *
          </label>
          <textarea
            value={form.contentZh}
            onChange={(e) => update("contentZh", e.target.value)}
            className="input-fun text-sm resize-none"
            rows={3}
            required
          />
        </div>
      </div>

      {/* Difficulty / Category / Age */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-heading font-medium text-gray-600 mb-1">
            {isZh ? "难度" : "Difficulty"} *
          </label>
          <select
            value={form.difficulty}
            onChange={(e) => update("difficulty", e.target.value)}
            className="input-fun text-sm"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-heading font-medium text-gray-600 mb-1">
            {isZh ? "分类" : "Category"} *
          </label>
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className="input-fun text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-heading font-medium text-gray-600 mb-1">
            {isZh ? "年龄段" : "Age Group"} *
          </label>
          <select
            value={form.ageGroup}
            onChange={(e) => update("ageGroup", e.target.value)}
            className="input-fun text-sm"
          >
            {AGE_GROUPS.map((a) => (
              <option key={a} value={a}>
                {a.replace("AGE_", "").replace("_", "-")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Answer */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-heading font-medium text-gray-600 mb-1">
            {isZh ? "正确答案" : "Correct Answer"} *
          </label>
          <input
            type="text"
            value={form.answer}
            onChange={(e) => update("answer", e.target.value)}
            className="input-fun text-sm font-mono"
            placeholder="5/8"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-heading font-medium text-gray-600 mb-1">
            {isZh ? "动画类型" : "Animation Type"}
          </label>
          <select
            value={form.animationType}
            onChange={(e) => update("animationType", e.target.value)}
            className="input-fun text-sm"
          >
            {ANIMATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Explanation (EN/ZH) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-heading font-medium text-gray-600 mb-1">
            Explanation (English)
          </label>
          <textarea
            value={form.answerExplainEn}
            onChange={(e) => update("answerExplainEn", e.target.value)}
            className="input-fun text-sm resize-none"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-heading font-medium text-gray-600 mb-1">
            解题思路 (中文)
          </label>
          <textarea
            value={form.answerExplainZh}
            onChange={(e) => update("answerExplainZh", e.target.value)}
            className="input-fun text-sm resize-none"
            rows={2}
          />
        </div>
      </div>

      {/* Hints */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-heading font-medium text-gray-600">
            {isZh ? "提示 (从模糊到具体)" : "Hints (vague to specific)"}
          </label>
          <button
            type="button"
            onClick={addHint}
            className="text-xs text-primary-600 hover:text-primary-700 font-heading"
          >
            + {isZh ? "添加提示" : "Add Hint"}
          </button>
        </div>
        <div className="space-y-3">
          {form.hints.map((hint, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-xs text-gray-400 mt-3 w-6">#{i + 1}</span>
              <input
                type="text"
                value={hint.en}
                onChange={(e) => updateHint(i, "en", e.target.value)}
                className="input-fun text-sm flex-1"
                placeholder="English hint"
              />
              <input
                type="text"
                value={hint.zh}
                onChange={(e) => updateHint(i, "zh", e.target.value)}
                className="input-fun text-sm flex-1"
                placeholder="中文提示"
              />
              {form.hints.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeHint(i)}
                  className="text-red-400 hover:text-red-600 mt-3"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fun Facts */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-heading font-medium text-gray-600 mb-1">
            Fun Fact (English)
          </label>
          <input
            type="text"
            value={form.funFactEn}
            onChange={(e) => update("funFactEn", e.target.value)}
            className="input-fun text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-heading font-medium text-gray-600 mb-1">
            趣味知识 (中文)
          </label>
          <input
            type="text"
            value={form.funFactZh}
            onChange={(e) => update("funFactZh", e.target.value)}
            className="input-fun text-sm"
          />
        </div>
      </div>

      {/* Options row */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => update("isPublished", e.target.checked)}
            className="w-5 h-5 rounded-md accent-primary-500"
          />
          <span className="text-sm font-heading text-gray-600">
            {isZh ? "立即发布" : "Publish immediately"}
          </span>
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm font-heading text-gray-600">
            {isZh ? "排序" : "Sort Order"}:
          </label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => update("sortOrder", parseInt(e.target.value) || 0)}
            className="input-fun text-sm w-20 text-center"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <motion.button
          type="submit"
          disabled={isPending}
          className="btn-primary px-8 disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isPending
            ? isZh ? "保存中..." : "Saving..."
            : questionId
            ? isZh ? "更新题目" : "Update Question"
            : isZh ? "创建题目" : "Create Question"}
        </motion.button>
      </div>
    </form>
  );
}
