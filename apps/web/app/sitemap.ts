import type { MetadataRoute } from "next";
import { locales, type Locale } from "@gmq/i18n";
import { getLocalizedUrl, getSiteUrl } from "@/lib/seo";

const PUBLIC_PATHS = ["/"] as const;

// Standalone tools served from /public (not localized).
const TOOL_PATHS = ["/bytelab", "/chompulator"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const toolEntries: MetadataRoute.Sitemap = TOOL_PATHS.map((path) => ({
    url: `${getSiteUrl()}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const localizedEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => {
      const alternates = Object.fromEntries(
        locales.map((alternateLocale) => [
          alternateLocale,
          getLocalizedUrl(alternateLocale, path),
        ])
      ) as Record<Locale, string>;

      return {
        url: getLocalizedUrl(locale, path),
        lastModified: now,
        changeFrequency: path === "/" ? "weekly" : "monthly",
        priority: path === "/" ? 1 : 0.7,
        alternates: {
          languages: {
            ...alternates,
            "x-default": getLocalizedUrl("en", path),
          },
        },
      };
    })
  );

  return [...localizedEntries, ...toolEntries];
}
