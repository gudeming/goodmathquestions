"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { questionPath, type Locale } from "@/components/worlds/types";

/** "Surprise me": a random published hero question the user has not solved (daily.surprise). */
export function SurpriseButton({ locale, excludeId }: { locale: Locale; excludeId?: string }) {
  const t = useTranslations("home");
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);

  const surprise = trpc.daily.surprise.useMutation({
    onSuccess: (pick) => {
      if (!pick) {
        setNote(t("surpriseFailed"));
        return;
      }
      if (pick.allSolved) setNote(t("surpriseAllSolved"));
      router.push(questionPath(locale, pick));
    },
    onError: () => setNote(t("surpriseFailed")),
  });

  return (
    <section className="rounded-card border-2 border-dashed border-fun-purple/40 bg-white/80 p-6 text-center" aria-labelledby="surprise-title">
      <h2 id="surprise-title" className="font-heading text-xl font-bold text-gray-800">
        {t("surpriseTitle")}
      </h2>
      <p className="mb-4 mt-1 font-body text-gray-600">{t("surpriseDesc")}</p>
      <button
        type="button"
        onClick={() => {
          setNote(null);
          surprise.mutate(excludeId ? { excludeId } : {});
        }}
        disabled={surprise.isPending}
        className="min-h-[48px] rounded-bubble bg-gradient-to-r from-fun-purple to-fun-pink px-8 py-3 font-heading text-lg font-bold text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-purple/40 disabled:cursor-wait disabled:opacity-70"
        data-testid="surprise-me"
      >
        🎁 {surprise.isPending ? t("surpriseLoading") : t("surpriseButton")}
      </button>
      <p className="mt-3 min-h-[1.25rem] text-sm text-gray-500" aria-live="polite">
        {note}
      </p>
    </section>
  );
}
