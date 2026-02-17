import { NextIntlClientProvider, useMessages } from "next-intl";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@gmq/i18n";
import "../globals.css";

export const metadata = {
  title: "Good Math Questions - Where Math Becomes an Adventure!",
  description:
    "A fun, interactive math learning platform for kids aged 8-14. Solve puzzles, watch animated solutions, and compete with friends!",
};

export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = useMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-body antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
