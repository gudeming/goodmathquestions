import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { locales, type Locale } from "@gmq/i18n";
import { WorldPath } from "@/components/worlds/WorldPath";
import { pickText } from "@/components/worlds/types";
import { getWorld } from "@/lib/discovery-server";
import { getLocalizedPath, getLocalizedUrl } from "@/lib/seo";

interface PageProps {
  params: { locale: string; slug: string };
}

// Worlds change only when content is published; 5 minutes of staleness is fine.
export const revalidate = 300;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function asLocale(locale: string): Locale {
  return (locales as readonly string[]).includes(locale) ? (locale as Locale) : "en";
}

function loadWorld(slug: string) {
  return SLUG_PATTERN.test(slug) ? getWorld(slug) : Promise.resolve(null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await loadWorld(params.slug);
  if (!data) return {};
  const locale = asLocale(params.locale);
  const { world } = data;
  const title = pickText(world.titleEn, world.titleZh, locale);
  const description = pickText(world.descEn, world.descZh, locale);
  const path = `/worlds/${world.slug}`;
  return {
    title,
    description,
    alternates: {
      canonical: getLocalizedUrl(locale, path),
      languages: Object.fromEntries(locales.map((l) => [l, getLocalizedUrl(l, path)])),
    },
    openGraph: { title: `${world.emoji} ${title}`, description, url: getLocalizedUrl(locale, path) },
    // Live worlds are indexable; an empty "coming soon" world is not worth a search result yet.
    robots: { index: world.questionCount > 0, follow: true },
  };
}

/** One world: header, then its hero questions as an unlocked path. */
export default async function WorldPage({ params }: PageProps) {
  const data = await loadWorld(params.slug);
  if (!data) notFound();
  const locale = asLocale(params.locale);
  const t = await getTranslations({ locale, namespace: "worlds" });
  const { world, questions } = data;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={getLocalizedPath(locale, "/worlds")} className="mb-6 inline-block font-heading text-sm font-semibold text-primary-600 hover:text-primary-800">
        ← {t("backToWorlds")}
      </Link>
      <header className="mb-8 flex items-start gap-4">
        <span aria-hidden className="text-6xl leading-none">
          {world.emoji}
        </span>
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-800 sm:text-4xl">{pickText(world.titleEn, world.titleZh, locale)}</h1>
          <p className="mt-2 font-body text-lg text-gray-600">{pickText(world.descEn, world.descZh, locale)}</p>
          <p className="mt-2 font-heading text-sm text-gray-500">
            {world.questionCount > 0 ? t("questionCount", { count: world.questionCount }) : t("comingSoon")}
          </p>
        </div>
      </header>
      <WorldPath world={world} questions={questions} />
    </div>
  );
}
