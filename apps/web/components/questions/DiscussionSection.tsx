"use client";

import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

interface DiscussionSectionProps {
  questionId: string;
}

export function DiscussionSection({ questionId }: DiscussionSectionProps) {
  const t = useTranslations("questions");
  const locale = useLocale();
  const isZh = locale === "zh";
  const { data: session } = useSession();
  const [newComment, setNewComment] = useState("");

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.comment.list.useQuery({
    questionId,
    limit: 20,
  });

  const addComment = trpc.comment.create.useMutation({
    onSuccess: () => {
      setNewComment("");
      utils.comment.list.invalidate({ questionId });
    },
  });

  const comments = data?.comments ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !session?.user) return;

    addComment.mutate({
      questionId,
      content: newComment.trim(),
    });
  };

  return (
    <motion.div
      className="bg-white rounded-card shadow-lg p-6 border-2 border-primary-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
    >
      <h2 className="text-2xl font-heading font-bold text-gray-800 mb-6">
        💬 {t("discussion")} ({comments.length})
      </h2>

      {/* Comment Input */}
      {session?.user ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-400 to-fun-purple flex items-center justify-center text-white font-bold shrink-0">
              {session.user.name?.[0] || "?"}
            </div>
            <div className="flex-grow">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="input-fun resize-none"
                rows={2}
                placeholder={t("addComment")}
                maxLength={500}
                disabled={addComment.isPending}
              />
              <AnimatePresence>
                {newComment.length > 0 && (
                  <motion.div
                    className="flex justify-between items-center mt-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <span className="text-xs text-gray-400">
                      {newComment.length}/500
                    </span>
                    <motion.button
                      type="submit"
                      disabled={addComment.isPending}
                      className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {addComment.isPending
                        ? isZh ? "发送中..." : "Sending..."
                        : isZh ? "发送" : "Post"} 💬
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-primary-50 rounded-card p-4 mb-6 text-center">
          <p className="text-gray-600 font-body text-sm">
            {isZh ? "登录后参与讨论" : "Log in to join the discussion"}
          </p>
          <Link href="/login" className="text-primary-600 font-heading font-semibold text-sm hover:underline">
            {isZh ? "登录" : "Log In"} →
          </Link>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-6">
          <p className="text-gray-400 font-heading text-sm">
            {isZh ? "加载评论..." : "Loading comments..."}
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {comments.length === 0 && !isLoading && (
          <p className="text-center text-gray-400 py-6 font-body">
            {isZh ? "还没有评论，来做第一个发言的人吧！" : "No comments yet. Be the first to share your thoughts!"}
          </p>
        )}

        {comments.map((comment, i) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <CommentItem comment={comment} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function CommentItem({
  comment,
  depth = 0,
}: {
  comment: any;
  depth?: number;
}) {
  return (
    <div className={`${depth > 0 ? "ml-12 mt-3" : ""}`}>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-fun-cyan to-fun-green flex items-center justify-center text-white text-sm font-bold shrink-0">
          {comment.user.displayName[0]}
        </div>
        <div className="flex-grow">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-heading font-semibold text-gray-800 text-sm">
              {comment.user.displayName}
            </span>
            <span className="badge-level text-xs py-0.5 px-2">
              Lv.{comment.user.level}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-gray-700 font-body text-sm">{comment.content}</p>
        </div>
      </div>

      {/* Replies */}
      {comment.replies?.map((reply: any) => (
        <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );
}
