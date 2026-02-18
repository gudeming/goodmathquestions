import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/questions",
          "/mastery",
          "/leaderboard",
          "/profile",
          "/admin",
          "/*/questions",
          "/*/mastery",
          "/*/leaderboard",
          "/*/profile",
          "/*/admin",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
