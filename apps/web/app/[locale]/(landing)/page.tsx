import type { Metadata } from "next";
import type { Locale } from "@gmq/i18n";
import { getLocalizedUrl } from "@/lib/seo";
import { getTodayPuzzleCard } from "@/lib/discovery-server";
import LandingClient from "./LandingClient";

type Props = {
  params: { locale: string };
};

// Today's puzzle is rendered on the server (no client fetch on first paint).
// daily.today is cached in Redis until midnight UTC; re-render at most every 5 minutes.
export const revalidate = 300;

export function generateMetadata({ params: { locale } }: Props): Metadata {
  const canonical = getLocalizedUrl(locale as Locale, "/");

  return {
    alternates: {
      canonical,
    },
  };
}

export default async function LandingPage() {
  const today = await getTodayPuzzleCard();
  return <LandingClient today={today} />;
}
