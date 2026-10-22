"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { WorldCard } from "./WorldCard";
import type { Locale } from "./types";

/** Every world as a card, with the signed-in user's solved x/y on each. */
export function WorldGrid() {
  const t = useTranslations("worlds");
  const tc = useTranslations("common");
  const locale: Locale = useLocale() === "zh" ? "zh" : "en";
  const { status } = useSession();
  const signedIn = status === "authenticated";

  const worlds = trpc.collection.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const solved = trpc.user.solvedHeroIds.useQuery(undefined, { enabled: signedIn, retry: 1 });

  if (worlds.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label={tc("loading")}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-card bg-primary-50" />
        ))}
      </div>
    );
  }

  if (worlds.isError || !worlds.data) {
    return (
      <div className="rounded-card bg-white p-6 text-center" role="alert">
        <p className="mb-3 font-heading text-gray-600">{t("loadFailed")}</p>
        <button type="button" onClick={() => void worlds.refetch()} className="btn-secondary min-h-[44px] text-sm">
          {tc("retry")}
        </button>
      </div>
    );
  }

  if (worlds.data.length === 0) {
    return <p className="py-8 text-center font-heading text-gray-500">{t("empty")}</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="world-grid">
      {worlds.data.map((world) => (
        <li key={world.id}>
          <WorldCard world={world} locale={locale} solved={signedIn && solved.data ? solved.data.byCollection[world.id] ?? 0 : null} />
        </li>
      ))}
    </ul>
  );
}
