import { defaultLocale, type Locale } from "@gmq/i18n";

const FALLBACK_SITE_URL = "https://www.goodmathquestions.com";

export function getSiteUrl(): string {
  const configured = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL
  )?.trim();
  if (!configured) {
    return FALLBACK_SITE_URL;
  }

  try {
    return new URL(configured).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function getLocalizedPath(locale: Locale, path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (locale === defaultLocale) {
    return normalizedPath;
  }

  return normalizedPath === "/"
    ? `/${locale}`
    : `/${locale}${normalizedPath}`;
}

export function getLocalizedUrl(locale: Locale, path = "/"): string {
  return `${getSiteUrl()}${getLocalizedPath(locale, path)}`;
}
