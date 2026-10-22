import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locales, type Locale } from "@gmq/i18n";
import { WorldGrid } from "@/components/worlds/WorldGrid";
import { getLocalizedUrl } from "@/lib/seo";

interface PageProps {
  params: { locale: string };
}

function asLocale(locale: string): Locale {
  return (locales as readonly string[]).includes(locale) ? (locale as Locale) : "en";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = asLocale(params.locale);
  const t = await getTranslations({ locale, namespace: "worlds" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: {
      canonical: getLocalizedUrl(locale, "/worlds"),
      languages: Object.fromEntries(locales.map((l) => [l, getLocalizedUrl(l, "/worlds")])),
    },
    // The platform layout defaults to noindex; the worlds are public discovery pages.
    robots: { index: true, follow: true },
  };
}

export default async function WorldsPage({ params }: PageProps) {
  const t = await getTranslations({ locale: asLocale(params.locale), namespace: "worlds" });
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 text-center">
        <h1 className="mb-2 font-heading text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-fun-purple">
          🗺️ {t("title")}
        </h1>
        <p className="mx-auto max-w-2xl font-body text-gray-600">{t("intro")}</p>
      </header>
      <WorldGrid />
    </div>
  );
}
