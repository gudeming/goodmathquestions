"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useState } from "react";

interface Comment {
  id: string;
  content: string;
  user: {
    displayName: string;
    avatarUrl?: string;
    level: number;
  };
  createdAt: string;
  replies: Comment[];
}

// Mock comments
const MOCK_COMMENTS: Comment[] = [
  {
    id: "c1",
    content: "I drew this out on paper and it made so much more sense! 🍕",
    user: { displayName: "MathNinja", level: 5 },
    createdAt: "2 hours ago",
    replies: [
      {
        id: "c1r1",
        content: "Me too! The animation helped me understand fractions better.",
        user: { displayName: "PizzaLover", level: 3 },
        createdAt: "1 hour ago",
        replies: [],
      },
    ],
  },
  {
    id: "c2",
    content: "Is there a way to do this with decimals too? Like 0.625?",
    user: { displayName: "CuriousCat", level: 7 },
    createdAt: "5 hours ago",
    replies: [],
  },
];

interface DiscussionSectionProps {
  questionId: string;
}

export function DiscussionSection({ questionId }: DiscussionSectionProps) {
  const t = useTranslations("questions");
  const [newComment, setNewComment] = useState("");
  const [comments] = useState<Comment[]>(MOCK_COMMENTS);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Will connect to tRPC mutation
    setNewComment("");
  };

  return (
    <motion.div
      className="bg-white rounded-card shadow-lg p-6 border-2 border-primary-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
    >
      <h2 className="text-2xl font-heading font-bold text-gray-800 mb-6">
        💬 {t("discussion")}
      </h2>

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-400 to-fun-purple flex items-center justify-center text-white font-bold">
            😊
          </div>
          <div className="flex-grow">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="input-fun resize-none"
              rows={2}
              placeholder={t("addComment")}
              maxLength={500}
            />
            {newComment.length > 0 && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-400">
                  {newComment.length}/500
                </span>
                <motion.button
                  type="submit"
                  className="btn-primary text-sm py-2 px-4"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t("submit")} 💬
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment, i) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <CommentItem comment={comment} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function CommentItem({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
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
            <span className="text-xs text-gray-400">{comment.createdAt}</span>
          </div>
          <p className="text-gray-700 font-body text-sm">{comment.content}</p>
        </div>
      </div>

      {/* Replies */}
      {comment.replies.map((reply) => (
        <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );
}
