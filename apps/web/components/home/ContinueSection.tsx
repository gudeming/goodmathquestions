"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { pickText, questionPath, type Locale } from "@/components/worlds/types";

/** "Pick up where you left off": hidden when there is nothing to continue (or it fails). */
export function ContinueSection({ locale }: { locale: Locale }) {
  const t = useTranslations("home");
  const query = trpc.user.continueQuestion.useQuery(undefined, { retry: 1 });
  const card = query.data;
  if (!card) return null;

  const hook = pickText(card.hookEn, card.hookZh, locale) || pickText(card.titleEn, card.titleZh, locale);
  return (
    <section aria-labelledby="continue-title" data-testid="continue-section">
      <h2 id="continue-title" className="mb-3 font-heading text-2xl font-bold text-gray-800">
        ⏯️ {t("continueTitle")}
      </h2>
      <Link
        href={questionPath(locale, card)}
        className="group flex flex-col gap-3 rounded-card border-2 border-primary-100 bg-white p-5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300 sm:flex-row sm:items-center"
      >
        <p className="flex-1 font-body text-gray-800 line-clamp-2">{hook}</p>
        <span className="shrink-0 font-heading font-semibold text-primary-600 group-hover:text-primary-800">{t("continueButton")} →</span>
      </Link>
    </section>
  );
}
