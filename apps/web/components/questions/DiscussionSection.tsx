"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { getLocalizedPath } from "@/lib/seo";
import { MathText } from "@/components/ui/MathText";
import type { OptionItem } from "@/components/question-v2/types";
import { CommentComposer } from "@/components/discussion/CommentComposer";
import { CommentItem } from "@/components/discussion/CommentItem";
import { GuessSplitBar } from "@/components/discussion/GuessSplitBar";
import { TagBadge, TagChips } from "@/components/discussion/TagChips";
import { SOLUTION_TAGS, guessLabel, isSolutionTag, type SolutionTag } from "@/components/discussion/shared";

interface DiscussionSectionProps {
  questionId: string;
  /** A specific question to answer ("How did you pair them?"); hero questions pass their discussionPrompt. */
  prompt?: string | null;
  /** Called after a comment is posted (analytics). */
  onPosted?: (content: string) => void;
  /** The child's Act 1 guess, attached to their post ("I guessed 23"). */
  guessValue?: string | null;
  /** The question's intended approaches; the composer offers these (+ "other"). */
  solutionTags?: readonly SolutionTag[];
  /** Choice / compare guess options: enables the "who thinks what" bar and labels guesses. */
  guessOptions?: OptionItem[];
}

const PAGE_SIZE = 20;

/** Discussion: prompt, guess split, composer with method chips, filterable thread list. */
export function DiscussionSection({ questionId, prompt, onPosted, guessValue, solutionTags, guessOptions }: DiscussionSectionProps) {
  const t = useTranslations("discussion");
  const locale = useLocale() === "zh" ? "zh" : "en";
  const reduced = useReducedMotion();
  const titleId = useId();
  const { data: session } = useSession();
  const viewerId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const [filter, setFilter] = useState<SolutionTag | null>(null);

  const list = trpc.comment.list.useInfiniteQuery(
    { questionId, limit: PAGE_SIZE, ...(filter ? { solutionTag: filter } : {}) },
    { getNextPageParam: (last) => last.nextCursor, placeholderData: (prev) => prev }
  );
  const split = trpc.comment.guessSplit.useQuery(
    { questionId },
    { enabled: (guessOptions?.length ?? 0) > 0, staleTime: 60_000, retry: 1 }
  );

  const firstPage = list.data?.pages[0];
  const comments = useMemo(() => list.data?.pages.flatMap((p) => p.comments) ?? [], [list.data]);
  const myPending = firstPage?.myPending ?? [];
  const tagCounts = firstPage?.tagCounts ?? {};
  const total = firstPage?.total ?? comments.length;
  const filterTags = SOLUTION_TAGS.filter((tag) => (tagCounts[tag] ?? 0) > 0);

  const composerTags = useMemo<readonly SolutionTag[]>(() => {
    const suggested = (solutionTags ?? []).filter((tag) => tag !== "other");
    return suggested.length > 0 ? [...suggested, "other"] : SOLUTION_TAGS;
  }, [solutionTags]);

  return (
    <section aria-labelledby={titleId} className="rounded-card border-2 border-primary-100 bg-white p-5 shadow-lg sm:p-6" data-testid="discussion">
      <p className="mb-1 font-heading text-sm font-semibold uppercase tracking-wide text-primary-600">
        💬 {t("title")}
        {total > 0 && <span className="ml-1 text-gray-500">· {t("count", { count: total })}</span>}
      </p>
      <h2 id={titleId} className="mb-4 font-heading text-2xl font-bold text-gray-800">
        {prompt ? <MathText text={prompt} /> : t("defaultPrompt")}
      </h2>

      {split.data && split.data.total > 0 && guessOptions && (
        <GuessSplitBar split={split.data} options={guessOptions} mine={guessValue ?? null} />
      )}

      {viewerId ? (
        <div className="mb-8">
          <CommentComposer
            questionId={questionId}
            placeholder={prompt || t("placeholder")}
            tags={composerTags}
            guessValue={guessValue ?? null}
            onPosted={onPosted}
          />
        </div>
      ) : (
        <div className="mb-6 rounded-card bg-primary-50 p-4 text-center">
          <p className="font-body text-sm text-gray-600">{t("loginToComment")}</p>
          <Link href={getLocalizedPath(locale, "/login")} className="inline-flex min-h-[44px] items-center font-heading text-sm font-semibold text-primary-600 hover:underline">
            {t("logIn")} →
          </Link>
        </div>
      )}

      {myPending.length > 0 && (
        <div className="mb-6 rounded-card border-2 border-dashed border-amber-300 bg-amber-50 p-4" data-testid="my-pending">
          <p className="mb-2 font-heading text-sm font-bold text-amber-800">⏳ {t("yourPendingTitle")}</p>
          <ul className="space-y-2">
            {myPending.map((c) => (
              <li key={c.id} className="font-body text-sm text-gray-700">
                <span className="mr-2 inline-flex flex-wrap items-center gap-2 align-middle">
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 font-heading text-xs font-semibold text-amber-900">{t("waitingBadge")}</span>
                  {isSolutionTag(c.solutionTag) && <TagBadge tag={c.solutionTag} />}
                  {c.guessValue && <span className="text-xs text-amber-800">{t("iGuessed", { value: guessLabel(c.guessValue, guessOptions, locale) })}</span>}
                </span>
                <span className="whitespace-pre-line break-words">{c.content}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {filterTags.length > 0 && (
        <div className="mb-5">
          <TagChips
            tags={filterTags}
            value={filter}
            onChange={setFilter}
            label={t("filterLabel")}
            counts={tagCounts}
            allCount={total}
            size="sm"
          />
        </div>
      )}

      {list.isLoading && <p className="py-6 text-center font-heading text-sm text-gray-500">{t("loading")}</p>}
      {list.isError && <p className="py-6 text-center font-body text-sm text-gray-500">{t("loadFailed")}</p>}

      {!list.isLoading && !list.isError && comments.length === 0 && (
        <div className="py-8 text-center" data-testid="discussion-empty">
          <p aria-hidden className="mb-2 text-4xl">🌱</p>
          <p className="font-heading text-lg font-bold text-gray-700">{filter ? t("emptyFiltered") : t("emptyTitle")}</p>
          {!filter && <p className="mt-1 font-body text-sm text-gray-500">{t("emptyBody")}</p>}
        </div>
      )}

      <ul className="space-y-6">
        <AnimatePresence initial={false}>
          {comments.map((comment, i) => (
            <motion.li
              key={comment.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : Math.min(i, 10) * 0.04 }}
            >
              <CommentItem comment={comment} questionId={questionId} locale={locale} guessOptions={guessOptions} viewerId={viewerId} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {list.hasNextPage && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage} className="btn-secondary min-h-[44px] px-5 py-2 text-sm disabled:opacity-50">
            {list.isFetchingNextPage ? t("loading") : t("loadMore")}
          </button>
        </div>
      )}
    </section>
  );
}
