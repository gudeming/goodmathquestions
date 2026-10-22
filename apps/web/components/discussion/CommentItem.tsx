"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import type { Locale, OptionItem } from "@/components/question-v2/types";
import { CommentComposer } from "./CommentComposer";
import { TagBadge } from "./TagChips";
import { REPORT_REASONS, guessLabel, isSolutionTag, type ListedComment, type ListedReply } from "./shared";

interface CommentItemProps {
  comment: ListedComment | ListedReply;
  questionId: string;
  locale: Locale;
  guessOptions?: OptionItem[];
  /** Signed-in viewer's id (null for guests: no reply / report actions). */
  viewerId: string | null;
  isReply?: boolean;
}

/** One comment with its tag, guess, replies, a reply box and an inline report flow. */
export function CommentItem({ comment, questionId, locale, guessOptions, viewerId, isReply = false }: CommentItemProps) {
  const t = useTranslations("discussion");
  const [replying, setReplying] = useState(false);
  const replies = "replies" in comment ? comment.replies : [];
  const tag = isSolutionTag(comment.solutionTag) ? comment.solutionTag : null;
  const isMine = viewerId !== null && comment.user.id === viewerId;

  return (
    <article className={isReply ? "ml-10 mt-3 sm:ml-12" : ""} data-testid="comment-item">
      <div className="flex gap-3">
        <div aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-fun-cyan to-fun-green text-sm font-bold text-white">
          {[...comment.user.displayName][0] ?? "?"}
        </div>
        <div className="min-w-0 flex-grow">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-heading text-sm font-semibold text-gray-800">{comment.user.displayName}</span>
            <span className="badge-level px-2 py-0.5 text-xs">{t("level", { level: comment.user.level })}</span>
            {tag && <TagBadge tag={tag} />}
            {comment.guessValue && (
              <span className="rounded-full bg-fun-yellow/20 px-2 py-0.5 font-heading text-xs font-semibold text-amber-800" data-testid="comment-guess">
                🤔 {t("iGuessed", { value: guessLabel(comment.guessValue, guessOptions, locale) })}
              </span>
            )}
            <time dateTime={new Date(comment.createdAt).toISOString()} className="text-xs text-gray-500">
              {new Date(comment.createdAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}
            </time>
          </div>
          <p className="whitespace-pre-line break-words font-body text-sm text-gray-700">{comment.content}</p>

          {viewerId && (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {!isReply && !replying && (
                <button type="button" onClick={() => setReplying(true)} className="min-h-[36px] font-heading text-xs font-semibold text-primary-600 hover:underline">
                  ↩️ {t("reply")}
                </button>
              )}
              {!isMine && <ReportControl commentId={comment.id} />}
            </div>
          )}
        </div>
      </div>

      {replies.map((reply) => (
        <CommentItem key={reply.id} comment={reply} questionId={questionId} locale={locale} guessOptions={guessOptions} viewerId={viewerId} isReply />
      ))}

      {replying && (
        <div className="ml-10 mt-3 sm:ml-12">
          <CommentComposer
            questionId={questionId}
            parentId={comment.id}
            placeholder={t("replyPlaceholder", { name: comment.user.displayName })}
            onPosted={() => setReplying(false)}
            onCancel={() => setReplying(false)}
            autoFocus
          />
        </div>
      )}
    </article>
  );
}

/** "Report" -> pick a reason inline -> thank-you. No browser dialogs. */
function ReportControl({ commentId }: { commentId: string }) {
  const t = useTranslations("discussion");
  const [state, setState] = useState<"closed" | "open" | "done" | "failed">("closed");
  const report = trpc.comment.report.useMutation({
    onSuccess: () => setState("done"),
    onError: () => setState("failed"),
  });

  if (state === "done") {
    return (
      <span role="status" className="text-xs text-gray-500">
        {t("reportThanks")}
      </span>
    );
  }
  if (state === "closed") {
    return (
      <button type="button" onClick={() => setState("open")} className="min-h-[36px] font-heading text-xs font-semibold text-gray-400 hover:text-red-600" data-testid="report-open">
        🚩 {t("report")}
      </button>
    );
  }
  return (
    <div role="group" aria-label={t("reportConfirm")} className="w-full rounded-card border-2 border-red-100 bg-red-50 p-3" data-testid="report-panel">
      <p className="mb-2 font-heading text-sm font-semibold text-gray-700">{t("reportConfirm")}</p>
      <div className="flex flex-wrap gap-2">
        {REPORT_REASONS.map((reason) => (
          <button
            key={reason}
            type="button"
            disabled={report.isPending}
            onClick={() => report.mutate({ commentId, reason })}
            className="min-h-[36px] rounded-full border-2 border-red-200 bg-white px-3 font-heading text-xs font-semibold text-red-700 hover:border-red-400 disabled:opacity-50"
          >
            {t(`reportReasons.${reason}`)}
          </button>
        ))}
        <button type="button" onClick={() => setState("closed")} className="min-h-[36px] px-3 font-heading text-xs font-semibold text-gray-500 hover:text-gray-700">
          {t("reportCancel")}
        </button>
      </div>
      {state === "failed" && <p className="mt-2 text-xs text-red-600">{t("reportFailed")}</p>}
    </div>
  );
}
