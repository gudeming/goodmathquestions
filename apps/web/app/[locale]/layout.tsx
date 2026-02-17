import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@gmq/i18n";
import { TRPCProvider } from "@/lib/trpc-provider";
import { AuthProvider } from "@/lib/auth-provider";

export const metadata = {
  title: "Good Math Questions - Where Math Becomes an Adventure!",
  description:
    "A fun, interactive math learning platform for kids aged 8-14. Solve puzzles, watch animated solutions, and compete with friends!",
  icons: { icon: "/favicon.ico" },
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <AuthProvider>
      <TRPCProvider>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </TRPCProvider>
    </AuthProvider>
  );
}
