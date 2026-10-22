"use client";

import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { StageProgress } from "./StageProgress";
import { HookStage } from "./HookStage";
import { ExploreStage, type SolvedResult } from "./ExploreStage";
import { preloadAnswerControl } from "./AnswerInput";
import { useQuestionFlow, type FlowPhase } from "./useQuestionFlow";
import type { Track } from "./useTrack";
import { pick, type Locale, type PublicQuestion } from "./types";

interface ThreeActQuestionProps {
  question: PublicQuestion;
  locale: Locale;
  track: Track;
}

// The reveal (with celebration and discussion) is its own chunk, fetched as soon as
// the question mounts so it is in long before the kid gets there.
const loadRevealStage = () => import("./RevealStage");
const RevealStage = lazy(() => loadRevealStage().then((mod) => ({ default: mod.RevealStage })));

const STAGE_HEADING: Record<FlowPhase, "stageGuess" | "exploreHeading" | "revealHeading"> = {
  hook: "stageGuess",
  explore: "exploreHeading",
  reveal: "revealHeading",
};

/** Hero question page: hook → explore → reveal (see useQuestionFlow for the state machine). */
export function ThreeActQuestion({ question, locale, track }: ThreeActQuestionProps) {
  const t = useTranslations("questions");
  const hasHook = question.guessConfig !== null || Boolean(question.hookEn || question.hookZh);
  const flow = useQuestionFlow(question.id, hasHook ? "hook" : "explore");
  const { phase } = flow.state;
  const { data: session, status } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const reduced = useReducedMotion() ?? false;
  const [solved, setSolved] = useState<SolvedResult | null>(null);
  const lastPhase = useRef(phase);
  const [phaseChanged, setPhaseChanged] = useState(false);

  useEffect(() => {
    loadRevealStage().catch(() => undefined);
    preloadAnswerControl(question.answerType);
  }, [question.answerType]);

  // On every act change: back to the top; the new act's heading then takes focus (see StageHeading).
  useEffect(() => {
    if (lastPhase.current === phase) return;
    lastPhase.current = phase;
    setPhaseChanged(true);
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [phase, reduced]);

  const transition = reduced ? { duration: 0.15 } : { duration: 0.3, ease: "easeOut" as const };
  const offset = reduced ? 0 : 16;

  return (
    <div className="mx-auto max-w-5xl pb-24 sm:pb-8" data-testid="three-act" data-phase={phase}>
      <header className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-gray-800 sm:text-4xl">{pick({ en: question.titleEn, zh: question.titleZh }, locale)}</h1>
      </header>

      <StageProgress phase={phase} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={phase}
          initial={{ opacity: 0, y: offset }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -offset }}
          transition={transition}
          aria-labelledby="stage-heading"
          data-testid={`stage-${phase}`}
        >
          <StageHeading text={t(STAGE_HEADING[phase])} focusOnMount={phaseChanged} />

          {phase === "hook" && (
            <HookStage
              question={question}
              locale={locale}
              guess={flow.state.guess}
              onGuessSaved={flow.saveGuess}
              onSkip={flow.skipGuess}
              onContinue={flow.startExplore}
              track={track}
            />
          )}

          {phase === "explore" && (
            <ExploreStage
              question={question}
              locale={locale}
              flow={flow}
              isLoggedIn={isLoggedIn}
              sessionLoading={status === "loading"}
              onSolved={setSolved}
              track={track}
            />
          )}

          {phase === "reveal" && (
            <Suspense fallback={<div aria-hidden className="h-64 w-full animate-pulse rounded-card bg-primary-50" />}>
              <RevealStage
                question={question}
                locale={locale}
                gaveUp={flow.state.gaveUp}
                guess={flow.state.guess}
                solved={solved}
                isLoggedIn={isLoggedIn}
                track={track}
              />
            </Suspense>
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

/**
 * Visually hidden heading for the current act. It mounts after the previous act's
 * exit animation (AnimatePresence mode="wait"), so it focuses itself on mount.
 */
function StageHeading({ text, focusOnMount }: { text: string; focusOnMount: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus({ preventScroll: true });
    // Mount only: re-renders of the same act must not steal focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <h2 id="stage-heading" ref={ref} tabIndex={-1} className="sr-only">
      {text}
    </h2>
  );
}
