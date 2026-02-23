import type { Metadata } from "next";
import type { Locale } from "@gmq/i18n";
import { getLocalizedUrl } from "@/lib/seo";
import LandingClient from "./LandingClient";

type Props = {
  params: { locale: string };
};

export function generateMetadata({ params: { locale } }: Props): Metadata {
  const canonical = getLocalizedUrl(locale as Locale, "/");

  return {
    alternates: {
      canonical,
    },
  };
}

export default function LandingPage() {
  return <LandingClient />;
}
