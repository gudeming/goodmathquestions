"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { SceneEvent } from "@gmq/animation-engine";
import { trpc } from "@/lib/trpc";
import { SceneHost } from "@/components/scenes/SceneHost";
import { MathText } from "@/components/ui/MathText";
import { AnswerInput, initialDraft, isDraftReady, proposalToDraft } from "./AnswerInput";
import { HintLadder } from "./HintLadder";
import { WrongAnswerCoach, type WrongAnswer } from "./WrongAnswerCoach";
import { useHasScene } from "./scene";
import { usableHints } from "./hints";
import type { QuestionFlow } from "./useQuestionFlow";
import type { Track } from "./useTrack";
import { pick, type AnswerDraft, type CheckResult, type Locale, type LooseBi, type PublicQuestion } from "./types";

export interface SolvedResult {
  xpEarned: number;
  aha: LooseBi | null;
  explanation: LooseBi | null;
}

interface ExploreStageProps {
  question: PublicQuestion;
  locale: Locale;
  flow: QuestionFlow;
  isLoggedIn: boolean;
  sessionLoading: boolean;
  onSolved: (result: SolvedResult) => void;
  track: Track;
}

/** Scene events that are not the child operating the scene. */
const NON_INTERACTION_EVENTS = new Set(["scene_config_invalid", "scene_error", "reveal_done"]);
/** Compact answer types get the whole answer bar sticky on phones; tall ones only the button. */
const COMPACT_TYPES = new Set(["NUMERIC", "ESTIMATE", "EXPRESSION", "MULTI_VALUE", "OPEN"]);

/** Act 2: the scene, the real question, the answer box, hints and the coach. */
export function ExploreStage({ question, locale, flow, isLoggedIn, sessionLoading, onSolved, track }: ExploreStageProps) {
  const t = useTranslations("questions");
  const labelId = useId();
  const showScene = useHasScene(question.animationConfig);
  const hints = useMemo(() => usableHints(question.hints), [question.hints]);
  const [draft, setDraft] = useState<AnswerDraft>(() => initialDraft(question, locale));
  const [wrong, setWrong] = useState<WrongAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const interacted = useRef(false);
  const startedAt = useRef(Date.now());
  const { state } = flow;

  const handleResult = (res: CheckResult & { xpEarned?: number; attempt?: number }) => {
    setError(null);
    const attempt = res.attempt ?? state.attempts + 1;
    track("answer_submit", { correct: res.isCorrect, attempt, hintsUsed: state.hintsRevealed, answerType: question.answerType });
    flow.recordAttempt(res.isCorrect);
    if (res.isCorrect) {
      setWrong(null);
      onSolved({ xpEarned: res.xpEarned ?? 0, aha: res.aha, explanation: res.explanation });
    } else {
      setWrong((w) => ({ feedback: res.feedback, estimate: res.estimate, seq: (w?.seq ?? 0) + 1 }));
    }
  };
  const onError = (e: { message: string }) => setError(t("submitFailed", { message: e.message }));

  const check = trpc.question.checkAnswer.useMutation({ onSuccess: handleResult, onError });
  const submit = trpc.question.submitAnswer.useMutation({ onSuccess: handleResult, onError });
  const pending = check.isPending || submit.isPending;

  const send = () => {
    if (pending || sessionLoading || !isDraftReady(question.answerType, draft)) return;
    const answer = Array.isArray(draft) ? draft : draft.trim();
    if (isLoggedIn) {
      submit.mutate({
        questionId: question.id,
        answer,
        timeSpent: Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)),
        hintsUsed: state.hintsRevealed,
        guessed: state.guess !== null,
      });
    } else {
      check.mutate({ questionId: question.id, answer });
    }
  };

  const onSceneEvent = useCallback(
    (e: SceneEvent) => {
      if (interacted.current || NON_INTERACTION_EVENTS.has(e.name)) return;
      interacted.current = true;
      track("scene_interact", { event: e.name });
    },
    [track]
  );

  const onPropose = useCallback(
    (value: string) => setDraft((current) => proposalToDraft(question.answerType, value, current)),
    [question.answerType]
  );

  const revealHint = () => flow.revealHint(hints.length);
  const compact = COMPACT_TYPES.has(question.answerType);
  const prompt = pick({ en: question.contentEn, zh: question.contentZh }, locale);

  const submitButton = (
    <button
      type="button"
      onClick={send}
      disabled={pending || sessionLoading || !isDraftReady(question.answerType, draft)}
      className="btn-primary min-h-[48px] w-full text-lg disabled:cursor-not-allowed disabled:opacity-50"
      data-testid="check-answer"
    >
      {pending ? t("checking") : `${t("checkAnswer")} ✨`}
    </button>
  );

  return (
    <div className={showScene ? "grid gap-6 lg:grid-cols-2 lg:gap-8" : "mx-auto max-w-2xl"}>
      {showScene && (
        <div className="overflow-hidden rounded-card border-2 border-primary-100 bg-white p-3 shadow-lg sm:p-4 lg:sticky lg:top-24 lg:self-start" data-testid="scene-card">
          <SceneHost config={question.animationConfig} phase="explore" locale={locale} onEvent={onSceneEvent} onProposeAnswer={onPropose} />
        </div>
      )}

      <div className="space-y-5">
        <div className="rounded-card border-2 border-fun-cyan/30 bg-white p-5 shadow-lg sm:p-6">
          <h3 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-gray-500">{t("theQuestion")}</h3>
          <MathText as="p" className="font-body text-xl leading-relaxed text-gray-800" text={prompt} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="rounded-card border-2 border-primary-100 bg-white p-5 shadow-lg sm:p-6"
        >
          <h3 id={labelId} className="mb-3 font-heading text-lg font-bold text-gray-800">
            {t("answerLabel")}
          </h3>
          {/* On phones the answer bar sticks to the bottom so it stays reachable under a tall scene. */}
          <div className={compact ? "sticky bottom-0 z-20 -mx-5 space-y-3 bg-white/95 px-5 pb-3 pt-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0" : ""}>
            <AnswerInput
              question={question}
              locale={locale}
              value={draft}
              onChange={(v) => {
                setDraft(v);
                if (error) setError(null);
              }}
              onSubmit={send}
              disabled={pending}
              labelId={labelId}
              wrong={wrong !== null}
            />
            {compact && submitButton}
          </div>
          {!compact && <div className="sticky bottom-0 z-20 -mx-5 mt-4 bg-white/95 px-5 pb-3 pt-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0">{submitButton}</div>}
          {error && (
            <p role="alert" className="mt-3 text-center font-heading text-sm text-fun-red">
              {error}
            </p>
          )}
          {!isLoggedIn && !sessionLoading && <p className="mt-3 text-center text-xs text-gray-500">{t("loginForXp")}</p>}
        </form>

        <WrongAnswerCoach
          wrong={wrong}
          attempts={state.attempts}
          hintsLeft={hints.length - state.hintsRevealed}
          onNextHint={revealHint}
          onGiveUp={flow.giveUp}
          locale={locale}
        />

        <HintLadder hints={hints} revealed={state.hintsRevealed} onReveal={revealHint} locale={locale} track={track} />
      </div>
    </div>
  );
}
