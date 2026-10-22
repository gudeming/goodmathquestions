"use client";

import { Suspense, lazy, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { ThreeActQuestion } from "./ThreeActQuestion";
import { useTrack } from "./useTrack";
import type { Locale } from "./types";

// Legacy DRILL questions are a minority and have their own UI: a separate chunk, so
// hero questions don't ship it (ThreeActQuestion stays in the page bundle).
const DrillQuestion = lazy(() => import("./DrillQuestion").then((mod) => ({ default: mod.DrillQuestion })));

/**
 * Client entry of the question page. The server page has already resolved the
 * route param (id or slug) to `questionId` and handled redirects / 404.
 */
export function QuestionView({ questionId }: { questionId: string }) {
  const t = useTranslations("questions");
  const locale: Locale = useLocale() === "zh" ? "zh" : "en";
  const reduced = useReducedMotion();
  const query = trpc.question.getById.useQuery({ id: questionId }, { retry: 1 });
  const track = useTrack(questionId);
  const viewed = useRef(false);
  const kind = query.data?.kind;

  useEffect(() => {
    if (!kind || viewed.current) return;
    viewed.current = true;
    track("question_view", { kind });
  }, [kind, track]);

  if (query.isLoading) return <QuestionLoading label={t("loading")} reduced={reduced} />;

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center" role="alert">
        <p className="mb-4 font-heading text-lg text-gray-700">{t("loadFailed")}</p>
        <button type="button" onClick={() => void query.refetch()} className="btn-primary min-h-[48px]">
          {t("retry")}
        </button>
      </div>
    );
  }

  return query.data.kind === "DRILL" ? (
    <Suspense fallback={<QuestionLoading label={t("loading")} reduced={reduced} />}>
      <DrillQuestion question={query.data} locale={locale} track={track} />
    </Suspense>
  ) : (
    <ThreeActQuestion question={query.data} locale={locale} track={track} />
  );
}

function QuestionLoading({ label, reduced }: { label: string; reduced: boolean | null }) {
  return (
    <div className="mx-auto max-w-4xl py-20 text-center" role="status">
      <motion.div
        aria-hidden
        className="mb-4 inline-block text-5xl"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        🧮
      </motion.div>
      <p className="font-heading text-gray-500">{label}</p>
    </div>
  );
}
