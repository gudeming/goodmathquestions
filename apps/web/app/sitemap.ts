import type { MetadataRoute } from "next";
import { locales, type Locale } from "@gmq/i18n";
import { getLocalizedUrl, getSiteUrl } from "@/lib/seo";
import { listHeroSlugs } from "@/lib/question-server";

const PUBLIC_PATHS = ["/"] as const;

// Standalone tools served from /public (not localized).
const TOOL_PATHS = ["/bytelab", "/chompulator"] as const;

// Rebuilt at most hourly so newly published hero questions show up without a deploy.
export const revalidate = 3600;

function languageAlternates(path: string) {
  const alternates = Object.fromEntries(
    locales.map((alternateLocale) => [alternateLocale, getLocalizedUrl(alternateLocale, path)])
  ) as Record<Locale, string>;
  return { ...alternates, "x-default": getLocalizedUrl("en", path) };
}

/** Hero questions by slug (published, kind != DRILL). The DB being down only drops these entries. */
async function heroEntries(): Promise<MetadataRoute.Sitemap> {
  let heroes: Awaited<ReturnType<typeof listHeroSlugs>>;
  try {
    heroes = await listHeroSlugs();
  } catch (err) {
    console.error("[sitemap] could not list hero questions:", err instanceof Error ? err.message : err);
    return [];
  }
  return heroes.flatMap(({ slug, updatedAt }) => {
    const path = `/questions/${slug}`;
    return locales.map((locale) => ({
      url: getLocalizedUrl(locale, path),
      lastModified: updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages: languageAlternates(path) },
    }));
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const toolEntries: MetadataRoute.Sitemap = TOOL_PATHS.map((path) => ({
    url: `${getSiteUrl()}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const localizedEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      url: getLocalizedUrl(locale, path),
      lastModified: now,
      changeFrequency: path === "/" ? "weekly" : "monthly",
      priority: path === "/" ? 1 : 0.7,
      alternates: { languages: languageAlternates(path) },
    }))
  );

  return [...localizedEntries, ...(await heroEntries()), ...toolEntries];
}
