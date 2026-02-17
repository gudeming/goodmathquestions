import { getRequestConfig } from "next-intl/server";
import { locales, type Locale } from "@gmq/i18n";

export default getRequestConfig(async ({ locale }) => {
  const validLocale = locales.includes(locale as Locale)
    ? (locale as Locale)
    : "en";

  return {
    messages: (await import(`@gmq/i18n/${validLocale}.json`)).default,
  };
});
