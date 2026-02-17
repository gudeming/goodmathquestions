import en from "./en.json";
import zh from "./zh.json";

export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const messages = { en, zh } as const;

export function getMessages(locale: Locale) {
  return messages[locale] ?? messages.en;
}
