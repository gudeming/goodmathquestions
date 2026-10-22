"use client";

import { useTranslations } from "next-intl";
import { MathText } from "@/components/ui/MathText";
import { GIVE_UP_AFTER } from "./useQuestionFlow";
import { pick, type Bi, type CheckResult, type Locale } from "./types";

export interface WrongAnswer {
  feedback: Bi | null;
  estimate: CheckResult["estimate"];
  /** Bumps on every wrong answer so the same text is re-announced. */
  seq: number;
}

interface WrongAnswerCoachProps {
  wrong: WrongAnswer | null;
  attempts: number;
  hintsLeft: number;
  onNextHint: () => void;
  onGiveUp: () => void;
  locale: Locale;
}

/**
 * After a wrong answer: the question's targeted feedback when a rule matched,
 * otherwise encouragement + the next hint. After GIVE_UP_AFTER tries, "Show me".
 */
export function WrongAnswerCoach({ wrong, attempts, hintsLeft, onNextHint, onGiveUp, locale }: WrongAnswerCoachProps) {
  const t = useTranslations("questions");
  const canGiveUp = attempts >= GIVE_UP_AFTER;
  if (!wrong && !canGiveUp) return <div aria-live="polite" />;

  let message: string | null = null;
  if (wrong?.feedback) message = pick(wrong.feedback, locale);
  else if (wrong?.estimate?.direction === "low") message = t("tooLow");
  else if (wrong?.estimate?.direction === "high") message = t("tooHigh");
  else if (wrong) message = t("notYet");

  return (
    <div className="rounded-card border-2 border-fun-orange/40 bg-fun-orange/10 p-5" data-testid="wrong-answer-coach">
      <div aria-live="polite" aria-atomic="true">
        {message && <MathText key={wrong?.seq} as="p" className="font-heading text-lg text-gray-800" text={`🤔 ${message}`} />}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {wrong && hintsLeft > 0 && (
          <button
            type="button"
            onClick={onNextHint}
            className="min-h-[44px] rounded-bubble border-2 border-fun-purple/40 bg-white px-4 font-heading text-sm text-fun-purple hover:bg-fun-purple/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-purple/40"
          >
            💡 {t("tryNextHint")}
          </button>
        )}
        {canGiveUp && (
          <>
            <span className="text-sm text-gray-600">{t("attemptsLeftHint", { count: attempts })}</span>
            <button
              type="button"
              onClick={onGiveUp}
              className="min-h-[44px] rounded-bubble bg-gray-700 px-4 font-heading text-sm text-white hover:bg-gray-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-400"
              data-testid="show-me"
            >
              {t("showMe")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
