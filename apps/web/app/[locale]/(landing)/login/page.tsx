import type { Metadata } from "next";
import type { Locale } from "@gmq/i18n";
import { getLocalizedUrl } from "@/lib/seo";
import LoginClient from "./LoginClient";

type Props = {
  params: { locale: string };
};

export function generateMetadata({ params: { locale } }: Props): Metadata {
  return {
    alternates: {
      canonical: getLocalizedUrl(locale as Locale, "/login"),
    },
  };
}

export default function LoginPage() {
  return <LoginClient />;
}
