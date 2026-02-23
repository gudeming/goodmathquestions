import type { Metadata } from "next";
import type { Locale } from "@gmq/i18n";
import { getLocalizedUrl } from "@/lib/seo";
import SignupClient from "./SignupClient";

type Props = {
  params: { locale: string };
};

export function generateMetadata({ params: { locale } }: Props): Metadata {
  return {
    alternates: {
      canonical: getLocalizedUrl(locale as Locale, "/signup"),
    },
  };
}

export default function SignupPage() {
  return <SignupClient />;
}
