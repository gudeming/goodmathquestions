"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { SceneHost } from "@/components/scenes/SceneHost";
import { MathText } from "@/components/ui/MathText";
import { ChoiceCards } from "./ChoiceCards";
import { GuessHistogram } from "./GuessHistogram";
import { SliderControl, sliderMidpoint } from "./SliderControl";
import { hasScene } from "./scene";
import type { Track } from "./useTrack";
import { formatNumber, pick, type GuessConfig, type Locale, type OptionItem, type PublicQuestion } from "./types";

interface HookStageProps {
  question: PublicQuestion;
  locale: Locale;
  /** Saved guess, if any (from the flow). */
  guess: string | null;
  onGuessSaved: (value: string) => void;
  onSkip: () => void;
  onContinue: () => void;
  track: Track;
}

export function guessOptions(config: GuessConfig, locale: Locale, sameLabel: string): OptionItem[] {
  if (config.type === "choice") return config.options.map((o) => ({ id: o.id, label: pick(o, locale) }));
  if (config.type === "compare") {
    return [
      { id: "left", label: pick(config.left, locale) },
      { id: "same", label: sameLabel },
      { id: "right", label: pick(config.right, locale) },
    ];
  }
  return [];
}

export function guessLabel(config: GuessConfig, value: string, locale: Locale, sameLabel: string): string {
  if (config.type === "slider") {
    const unit = pick(config.unit ?? null, locale);
    const n = Number(value);
    return `${Number.isFinite(n) ? formatNumber(n, locale) : value}${unit ? ` ${unit}` : ""}`;
  }
  return guessOptions(config, locale, sameLabel).find((o) => o.id === value)?.label ?? value;
}

/** Act 1: the hook, a gut-feeling guess, then what everyone else guessed. */
export function HookStage({ question, locale, guess, onGuessSaved, onSkip, onContinue, track }: HookStageProps) {
  const t = useTranslations("questions");
  const promptId = useId();
  const config = question.guessConfig;
  const hook = pick({ en: question.hookEn, zh: question.hookZh }, locale) || pick({ en: question.contentEn, zh: question.contentZh }, locale);
  const showScene = useMemo(() => hasScene(question.animationConfig), [question.animationConfig]);

  const [sliderValue, setSliderValue] = useState<number>(() =>
    config?.type === "slider" ? sliderMidpoint(config.min, config.max, config.step, config.logScale) : 0
  );
  const [choice, setChoice] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const utils = trpc.useUtils();

  const submit = trpc.guess.submit.useMutation({
    onSuccess: (res) => {
      setError(false);
      onGuessSaved(res.value);
      track("guess_made", { value: res.value, type: config?.type ?? "none" });
      void utils.guess.histogram.invalidate({ questionId: question.id });
    },
    onError: () => setError(true),
  });

  const histogram = trpc.guess.histogram.useQuery(
    { questionId: question.id },
    { enabled: guess !== null && config !== null, retry: 1 }
  );

  const draft = config?.type === "slider" ? String(sliderValue) : choice;
  const sendGuess = () => {
    if (draft === null || submit.isPending) return;
    submit.mutate({ questionId: question.id, value: draft });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-card border-2 border-fun-purple/20 bg-white p-6 shadow-lg sm:p-8">
        <MathText as="p" className="font-heading text-2xl leading-relaxed text-gray-800 sm:text-3xl" text={hook} />
      </div>

      {showScene && (
        <div className="overflow-hidden rounded-card border-2 border-primary-100 bg-white p-4 shadow-lg" data-testid="scene-card">
          <SceneHost config={question.animationConfig} phase="hook" locale={locale} />
        </div>
      )}

      {config === null ? (
        <div className="flex justify-center">
          <button type="button" onClick={onContinue} className="btn-primary min-h-[48px] text-lg">
            {t("startHook")} →
          </button>
        </div>
      ) : guess === null ? (
        <section aria-labelledby={promptId} className="rounded-card border-2 border-fun-yellow/40 bg-gradient-to-r from-fun-yellow/10 to-fun-orange/10 p-6">
          <h2 id={promptId} className="mb-4 font-heading text-xl font-bold text-gray-800">
            🤔 {t("guessIntro")}
          </h2>

          {config.type === "slider" ? (
            <SliderControl
              min={config.min}
              max={config.max}
              step={config.step}
              logScale={config.logScale}
              unit={config.unit}
              value={sliderValue}
              onChange={setSliderValue}
              locale={locale}
              label={t("yourGuess")}
              disabled={submit.isPending}
            />
          ) : (
            <ChoiceCards
              options={guessOptions(config, locale, t("compareSame"))}
              value={choice}
              onChange={setChoice}
              labelledBy={promptId}
              disabled={submit.isPending}
              onConfirm={sendGuess}
              layout={config.type === "compare" ? "row" : "grid"}
            />
          )}

          {error && (
            <p role="alert" className="mt-4 text-center font-heading text-fun-red">
              {t("guessFailed")}
            </p>
          )}

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={sendGuess}
              disabled={draft === null || submit.isPending}
              className="btn-primary min-h-[48px] w-full text-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submit.isPending ? t("guessSaving") : `${t("guessFirst")} ✨`}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="min-h-[44px] px-3 text-sm text-gray-500 underline underline-offset-4 hover:text-gray-700"
            >
              {t("skipGuess")}
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-4" aria-live="polite">
          <p className="text-center font-heading text-lg text-gray-700">
            {t("yourGuess")}: <strong className="text-primary-700">{guessLabel(config, guess, locale, t("compareSame"))}</strong>
          </p>
          {histogram.data && <GuessHistogram histogram={histogram.data} guessConfig={config} mine={guess} locale={locale} />}
          <div className="flex justify-center">
            <button type="button" onClick={onContinue} className="btn-primary min-h-[48px] text-lg" data-testid="continue-explore">
              {t("letsFindOut")} →
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
