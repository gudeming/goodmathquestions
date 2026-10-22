"use client";

import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useId, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { getLocalizedPath } from "@/lib/seo";
import { MathText } from "@/components/ui/MathText";

interface DiscussionSectionProps {
  questionId: string;
  /** A specific question to answer ("How did you pair them?"); hero questions pass their discussionPrompt. */
  prompt?: string | null;
  /** Called after a comment is posted (analytics). */
  onPosted?: (content: string) => void;
}

const MAX_COMMENT = 500;

/** Comment box + list. Used by the DRILL layout and, with a prompt, by the hero reveal. */
export function DiscussionSection({ questionId, prompt, onPosted }: DiscussionSectionProps) {
  const t = useTranslations("questions");
  const locale = useLocale() === "zh" ? "zh" : "en";
  const reduced = useReducedMotion();
  const { data: session } = useSession();
  const [newComment, setNewComment] = useState("");
  const [status, setStatus] = useState<"idle" | "posted" | "failed">("idle");
  const inputId = useId();

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.comment.list.useQuery({ questionId, limit: 20 });

  const addComment = trpc.comment.create.useMutation({
    onSuccess: (_, vars) => {
      setNewComment("");
      setStatus("posted");
      onPosted?.(vars.content);
      void utils.comment.list.invalidate({ questionId });
    },
    onError: () => setStatus("failed"),
  });

  const comments = data?.comments ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !session?.user || addComment.isPending) return;
    addComment.mutate({ questionId, content: newComment.trim() });
  };

  return (
    <section aria-labelledby={`${inputId}-title`} className="rounded-card border-2 border-primary-100 bg-white p-6 shadow-lg" data-testid="discussion">
      <h2 id={`${inputId}-title`} className="mb-2 font-heading text-2xl font-bold text-gray-800">
        💬 {prompt ? t("howDidYouSolve") : t("discussion")} ({comments.length})
      </h2>
      {prompt && <MathText as="p" className="mb-5 font-body text-lg text-gray-700" text={prompt} />}

      {session?.user ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <label htmlFor={inputId} className="sr-only">
            {prompt ? t("howDidYouSolve") : t("addComment")}
          </label>
          <textarea
            id={inputId}
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              if (status !== "idle") setStatus("idle");
            }}
            className="input-fun resize-none"
            rows={3}
            placeholder={prompt ? t("commentPlaceholder") : t("addComment")}
            maxLength={MAX_COMMENT}
            disabled={addComment.isPending}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-gray-500" aria-live="polite">
              {status === "posted" ? t("posted") : status === "failed" ? t("postFailed") : `${newComment.length}/${MAX_COMMENT}`}
            </span>
            <button
              type="submit"
              disabled={addComment.isPending || newComment.trim() === ""}
              className="btn-primary min-h-[44px] px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addComment.isPending ? t("posting") : t("post")} 💬
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 rounded-card bg-primary-50 p-4 text-center">
          <p className="font-body text-sm text-gray-600">{t("loginToComment")}</p>
          <Link href={getLocalizedPath(locale, "/login")} className="inline-flex min-h-[44px] items-center font-heading text-sm font-semibold text-primary-600 hover:underline">
            {t("logIn")} →
          </Link>
        </div>
      )}

      {isLoading && <p className="py-6 text-center font-heading text-sm text-gray-500">{t("loadingComments")}</p>}

      <ul className="space-y-6">
        {comments.length === 0 && !isLoading && <li className="py-6 text-center font-body text-gray-500">{t("noComments")}</li>}
        <AnimatePresence initial={false}>
          {comments.map((comment, i) => (
            <motion.li
              key={comment.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : Math.min(i, 10) * 0.05 }}
            >
              <CommentItem comment={comment} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

interface CommentView {
  id: string;
  content: string;
  createdAt: Date | string;
  user: { displayName: string; level: number };
  replies?: CommentView[];
}

function CommentItem({ comment, depth = 0 }: { comment: CommentView; depth?: number }) {
  return (
    <div className={depth > 0 ? "ml-12 mt-3" : ""}>
      <div className="flex gap-3">
        <div aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-fun-cyan to-fun-green text-sm font-bold text-white">
          {comment.user.displayName[0] ?? "?"}
        </div>
        <div className="flex-grow">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-heading text-sm font-semibold text-gray-800">{comment.user.displayName}</span>
            <span className="badge-level px-2 py-0.5 text-xs">Lv.{comment.user.level}</span>
            <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="font-body text-sm text-gray-700">{comment.content}</p>
        </div>
      </div>
      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );
}
