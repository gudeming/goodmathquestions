import type { MetadataRoute } from "next";
import { locales, type Locale } from "@gmq/i18n";
import { getLocalizedUrl } from "@/lib/seo";

const PUBLIC_PATHS = ["/", "/login", "/signup"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return locales.flatMap((locale) =>
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
}
