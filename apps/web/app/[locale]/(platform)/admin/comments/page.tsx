"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { type inferRouterOutputs } from "@trpc/server";
import { type AppRouter } from "@gmq/api";
import { trpc } from "@/lib/trpc";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type QueuedComment = RouterOutputs["admin"]["flaggedComments"][number];

/**
 * Moderation queue: comments the screen held, everything posted while
 * GMQ_COMMENTS_REQUIRE_APPROVAL is on, and comments hidden by 3 reports.
 * Approve publishes; Delete removes the comment (admin.moderateComment "reject").
 */
export default function AdminCommentsPage() {
  const isZh = useLocale() === "zh";
  const utils = trpc.useUtils();
  const queue = trpc.admin.flaggedComments.useQuery();
  const ids = (queue.data ?? []).map((c) => c.id);
  const reports = trpc.comment.reportSummary.useQuery({ commentIds: ids }, { enabled: ids.length > 0 });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const moderate = trpc.admin.moderateComment.useMutation({
    onSuccess: () => {
      setConfirmDelete(null);
      void utils.admin.flaggedComments.invalidate();
    },
  });

  const comments: QueuedComment[] = queue.data ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-3xl font-bold text-gray-800">{isZh ? "评论审核" : "Comment Review"} 🛡️</h1>
      <p className="mb-6 mt-1 text-sm text-gray-500">
        {isZh
          ? `待审核 ${comments.length} 条（最多显示 50 条）。被过滤、开启先审后发、或被 3 人举报的评论会出现在这里。`
          : `${comments.length} waiting (up to 50 shown). Screened posts, posts made while approval is required, and posts hidden by 3 reports land here.`}
      </p>

      {queue.isLoading && <p className="py-8 text-center text-gray-500">{isZh ? "加载中…" : "Loading…"}</p>}
      {queue.isError && <p className="py-8 text-center text-red-600">{queue.error.message}</p>}
      {!queue.isLoading && comments.length === 0 && (
        <p className="rounded-card bg-white p-8 text-center text-gray-500 shadow">{isZh ? "队列是空的 🎉" : "The queue is empty 🎉"}</p>
      )}

      <ul className="space-y-4">
        {comments.map((c) => {
          const summary = reports.data?.[c.id];
          const busy = moderate.isPending && moderate.variables?.commentId === c.id;
          return (
            <li key={c.id} className="rounded-card border-2 border-gray-100 bg-white p-4 shadow" data-testid="queued-comment">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{c.user.displayName}</span>
                <span>@{c.user.username}</span>
                <span>·</span>
                <span>{isZh ? c.question.titleZh : c.question.titleEn}</span>
                <span>·</span>
                <time dateTime={new Date(c.createdAt).toISOString()}>{new Date(c.createdAt).toLocaleString(isZh ? "zh-CN" : "en-US")}</time>
                {c.solutionTag && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-primary-700">{c.solutionTag}</span>}
                {c.parentId && <span className="rounded-full bg-gray-100 px-2 py-0.5">{isZh ? "回复" : "reply"}</span>}
                {summary && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                    🚩 {summary.count} · {Object.entries(summary.reasons).map(([r, n]) => `${r}×${n}`).join(", ")}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-line break-words font-body text-gray-800">{c.content}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => moderate.mutate({ commentId: c.id, action: "approve" })}
                  className="rounded-lg bg-fun-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isZh ? "通过" : "Approve"}
                </button>
                {confirmDelete === c.id ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => moderate.mutate({ commentId: c.id, action: "reject" })}
                      className="rounded-lg bg-fun-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isZh ? "确认删除" : "Yes, delete"}
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-lg px-4 py-2 text-sm text-gray-500">
                      {isZh ? "取消" : "Cancel"}
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(c.id)} className="rounded-lg border-2 border-red-200 px-4 py-2 text-sm font-semibold text-red-600">
                    {isZh ? "删除" : "Delete"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
