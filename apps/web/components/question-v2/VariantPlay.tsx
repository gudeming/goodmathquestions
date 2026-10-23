"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
// Deep import keeps the rest of math-engine out of the client bundle.
import { XP_RULES } from "@gmq/math-engine/src/xp";
import { trpc } from "@/lib/trpc";
import { SceneHost } from "@/components/scenes/SceneHost";
import { CelebrationEffect } from "@/components/animations/CelebrationEffect";
import { MathText } from "@/components/ui/MathText";
import { ExploreStage, type SolvedResult } from "./ExploreStage";
import { answerOptions } from "./AnswerInput";
import { flowStorageKey, useQuestionFlow } from "./useQuestionFlow";
import { useHasScene } from "./scene";
import type { Track } from "./useTrack";
import { pick, type Locale, type PublicQuestion, type PublicVariant } from "./types";

const CELEBRATION_MS = 3000;

const solvedKey = (questionId: string) => `gmq:variants:solved:${questionId}`;
/** Flow state of one variant lives next to the question's own (`gmq:qflow:<id>~<variant>`). */
const variantFlowId = (questionId: string, variantId: string) => `${questionId}~${variantId}`;

function readSolved(questionId: string): string[] {
  try {
    const v: unknown = JSON.parse(window.localStorage.getItem(solvedKey(questionId)) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 20) : [];
  } catch {
    return [];
  }
}

function writeSolved(questionId: string, ids: string[]): void {
  try {
    window.localStorage.setItem(solvedKey(questionId), JSON.stringify(ids));
  } catch {
    // Storage blocked: "solved" just isn't remembered across visits.
  }
}

/** Next variant: never the one just played, unsolved ones first, otherwise any. Exported for tests. */
export function pickNextVariant(ids: readonly string[], solved: ReadonlySet<string>, current: string | null, random = Math.random): string | null {
  const others = ids.filter((id) => id !== current);
  const pool = others.filter((id) => !solved.has(id));
  const from = pool.length > 0 ? pool : others.length > 0 ? others : [...ids];
  return from.length === 0 ? null : from[Math.floor(random() * from.length)]!;
}

/** The question as the explore stage needs it, with the variant's prompt, scene, hints and options. */
export function variantQuestion(question: PublicQuestion, variant: PublicVariant): PublicQuestion {
  return {
    ...question,
    contentEn: variant.prompt.en,
    contentZh: variant.prompt.zh,
    animationConfig: variant.scene as PublicQuestion["animationConfig"],
    hints: variant.hints,
    choices: variant.choices,
    // An estimate keeps the standard slider (the build checks every variant's range is on it);
    // any other guess is about the standard numbers, and a variant has no guess act.
    guessConfig: question.answerType === "ESTIMATE" && question.guessConfig?.type === "slider" ? question.guessConfig : null,
    hookEn: null,
    hookZh: null,
  };
}

interface VariantPlayProps {
  question: PublicQuestion;
  locale: Locale;
  track: Track;
}

/**
 * "Try another number", offered on the reveal: the same question with other numbers, straight
 * into "try it" (no guess, no histogram), then a short reveal of its own.
 */
export function VariantPlay({ question, locale, track }: VariantPlayProps) {
  const t = useTranslations("questions");
  const { data: session, status } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const sessionLoading = status === "loading";
  const variants = trpc.question.variants.useQuery({ questionId: question.id }, { retry: 1, staleTime: Infinity });
  const [solved, setSolved] = useState<string[]>([]);
  const [active, setActive] = useState<{ id: string; round: number } | null>(null);
  const roundRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => setSolved(readSolved(question.id)), [question.id]);

  const list = useMemo(() => variants.data ?? [], [variants.data]);
  const ids = useMemo(() => list.map((v) => v.id), [list]);
  // Solved on this device, plus (signed in) what the server has on record from any device.
  const solvedSet = useMemo(() => new Set([...solved, ...list.filter((v) => v.solved).map((v) => v.id)]), [solved, list]);
  const solvedCount = ids.filter((id) => solvedSet.has(id)).length;
  const current = active ? list.find((v) => v.id === active.id) ?? null : null;

  const start = () => {
    const id = pickNextVariant(ids, solvedSet, active?.id ?? null);
    if (!id) return;
    // A replay starts fresh rather than restoring the last reveal of that variant.
    try {
      window.localStorage.removeItem(flowStorageKey(variantFlowId(question.id, id)));
    } catch {
      // Storage blocked: nothing was stored either.
    }
    setActive((a) => ({ id, round: (a?.round ?? 0) + 1 }));
    track("variant_start", { variant: id });
    requestAnimationFrame(() => roundRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }));
  };

  const markSolved = (id: string) => {
    setSolved((s) => {
      if (s.includes(id)) return s;
      const next = [...s, id];
      writeSolved(question.id, next);
      return next;
    });
  };

  if (variants.isError) {
    return <p className="rounded-card bg-white p-5 text-sm text-gray-600 shadow">{t("variantLoadFailed")}</p>;
  }
  if (list.length === 0) return null;

  return (
    <section className="rounded-card border-2 border-fun-purple/30 bg-gradient-to-r from-fun-purple/5 to-fun-cyan/5 p-5 sm:p-6" data-testid="variant-play">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold text-gray-800">🔁 {t("variantTitle")}</h3>
          <p className="mt-1 font-body text-gray-700">{solvedCount === ids.length ? t("variantSolvedAll") : t("variantIntro")}</p>
          {isLoggedIn && <p className="mt-1 text-xs text-gray-500">{t("variantXpNote", { xp: XP_RULES.variant })}</p>}
        </div>
        <span className="rounded-full bg-white px-3 py-1 font-heading text-sm text-purple-700 shadow-sm" data-testid="variant-progress">
          {solvedCount}/{ids.length}
        </span>
      </div>

      {!current && (
        <button type="button" onClick={start} className="btn-primary mt-4 min-h-[48px]" data-testid="variant-start">
          {t("variantStart")} 🎲
        </button>
      )}

      <div ref={roundRef} className="scroll-mt-24">
        {current && active && (
          <VariantRound
            key={active.round}
            question={question}
            variant={current}
            locale={locale}
            isLoggedIn={isLoggedIn}
            sessionLoading={sessionLoading}
            track={track}
            onSolved={() => markSolved(current.id)}
            onNext={start}
            onBack={() => {
              setActive(null);
              window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
            }}
          />
        )}
      </div>
    </section>
  );
}

interface VariantRoundProps {
  question: PublicQuestion;
  variant: PublicVariant;
  locale: Locale;
  isLoggedIn: boolean;
  sessionLoading: boolean;
  track: Track;
  onSolved: () => void;
  onNext: () => void;
  onBack: () => void;
}

/** One variant: explore → reveal, with the same answer box, hints and coach as the standard version. */
function VariantRound({ question, variant, locale, isLoggedIn, sessionLoading, track, onSolved, onNext, onBack }: VariantRoundProps) {
  const t = useTranslations("questions");
  const q = useMemo(() => variantQuestion(question, variant), [question, variant]);
  const flow = useQuestionFlow(variantFlowId(question.id, variant.id), "explore");
  const [solved, setSolved] = useState<SolvedResult | null>(null);
  const { phase, gaveUp } = flow.state;

  return (
    <div className="mt-5 space-y-5" data-testid="variant-round" data-variant={variant.id} data-phase={phase}>
      <h4 className="font-heading text-base font-semibold uppercase tracking-wide text-purple-700">{t("variantHeading")}</h4>
      {phase !== "reveal" ? (
        <ExploreStage
          question={q}
          locale={locale}
          flow={flow}
          isLoggedIn={isLoggedIn}
          sessionLoading={sessionLoading}
          onSolved={(r) => {
            setSolved(r);
            onSolved();
          }}
          track={track}
          variantId={variant.id}
        />
      ) : (
        <VariantReveal question={q} variantId={variant.id} locale={locale} gaveUp={gaveUp} solved={solved} />
      )}
      <div className="flex flex-wrap gap-3">
        {phase === "reveal" && (
          <button type="button" onClick={onNext} className="btn-primary min-h-[48px]" data-testid="variant-next">
            {t("variantNext")} 🎲
          </button>
        )}
        <button type="button" onClick={onBack} className="btn-secondary min-h-[48px]" data-testid="variant-back">
          {t("variantBack")}
        </button>
      </div>
    </div>
  );
}

function VariantReveal({ question, variantId, locale, gaveUp, solved }: { question: PublicQuestion; variantId: string; locale: Locale; gaveUp: boolean; solved: SolvedResult | null }) {
  const t = useTranslations("questions");
  const reduced = useReducedMotion();
  const showScene = useHasScene(question.animationConfig);
  // Solved in this view: aha and explanation came with the answer. Otherwise ("Show me" or a refresh) ask for them.
  const reveal = trpc.question.revealVariant.useQuery({ questionId: question.id, variantId }, { enabled: solved === null, retry: 1, staleTime: Infinity });
  const [celebrate, setCelebrate] = useState(solved !== null && !reduced);

  useEffect(() => {
    if (!celebrate) return;
    const timer = setTimeout(() => setCelebrate(false), CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [celebrate]);

  const aha = pick(solved?.aha ?? reveal.data?.aha ?? null, locale);
  const explanation = pick(solved?.explanation ?? reveal.data?.explanation ?? null, locale);
  const raw = reveal.data?.answer;
  const answerText = raw ? (question.answerType === "CHOICE" ? answerOptions(question, locale).find((o) => o.id === raw)?.label ?? raw : raw) : null;

  return (
    <div className="space-y-4">
      <AnimatePresence>{celebrate && <CelebrationEffect xp={solved?.xpEarned ?? 0} />}</AnimatePresence>
      {showScene && (
        <div className="overflow-hidden rounded-card border-2 border-primary-100 bg-white p-3 shadow-lg sm:p-4">
          <SceneHost config={question.animationConfig} phase="reveal" locale={locale} />
        </div>
      )}
      <div className="rounded-card border-2 border-fun-green/40 bg-white p-5" data-testid="variant-aha">
        <p className="font-heading text-lg font-bold text-green-700">
          {gaveUp ? `🔑 ${t("gaveUpTitle")}` : `🎉 ${t("youGotIt")}`}
          {solved && solved.xpEarned > 0 && <span className="badge-xp ml-3 align-middle">{t("xpGained", { xp: solved.xpEarned })}</span>}
        </p>
        {gaveUp && answerText && <MathText as="p" className="mt-2 font-heading text-2xl font-bold text-gray-800" text={t("answerWas", { answer: answerText })} />}
        {aha && <MathText as="p" className="mt-2 font-body text-lg text-gray-800" text={`💡 ${aha}`} />}
        {explanation && <MathText as="p" className="mt-3 font-body text-gray-700" text={explanation} />}
        {reveal.isError && <p className="mt-2 text-sm text-gray-600">{t("revealFailed")}</p>}
      </div>
    </div>
  );
}
