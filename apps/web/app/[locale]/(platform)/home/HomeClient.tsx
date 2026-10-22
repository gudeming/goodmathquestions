"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { TodayPuzzleCard } from "@/components/home/TodayPuzzleCard";
import { ContinueSection } from "@/components/home/ContinueSection";
import { SurpriseButton } from "@/components/home/SurpriseButton";
import { WorldGrid } from "@/components/worlds/WorldGrid";
import { localePath, type Locale } from "@/components/worlds/types";

export default function HomeClient() {
  const t = useTranslations("home");
  const locale: Locale = useLocale() === "zh" ? "zh" : "en";
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated";

  const today = trpc.daily.today.useQuery(undefined, { staleTime: 5 * 60 * 1000, retry: 1 });
  const streak = trpc.user.streak.useQuery(undefined, { enabled: signedIn, retry: 1 });
  const name = session?.user?.name ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-heading text-3xl font-bold text-gray-800 sm:text-4xl">
          {signedIn && name ? t("greeting", { name }) : t("greetingGuest")}
        </h1>
        {signedIn && streak.data && (
          <p className="flex items-center gap-2 font-heading text-gray-700" title={t("streakHint")} data-testid="home-streak">
            <span aria-hidden className="text-2xl">🔥</span>
            <span className="font-bold">{t("streak", { count: streak.data.streak })}</span>
          </p>
        )}
      </header>

      <TodayPuzzleCard puzzle={today.isError ? null : today.data} locale={locale} />

      <section aria-labelledby="worlds-title">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id="worlds-title" className="font-heading text-2xl font-bold text-gray-800">
            🗺️ {t("worldsTitle")}
          </h2>
          <Link href={localePath(locale, "/worlds")} className="font-heading text-sm font-semibold text-primary-600 hover:text-primary-800">
            {t("seeAllWorlds")} →
          </Link>
        </div>
        <WorldGrid />
      </section>

      {signedIn && <ContinueSection locale={locale} />}

      <SurpriseButton locale={locale} />

      {status === "unauthenticated" && (
        <p className="rounded-card bg-primary-50 p-5 text-center font-body text-gray-700">
          {t("guestNudge")}{" "}
          <Link href={localePath(locale, "/signup")} className="font-heading font-semibold text-primary-600 underline underline-offset-4">
            {t("guestSignup")}
          </Link>
        </p>
      )}
    </div>
  );
}
