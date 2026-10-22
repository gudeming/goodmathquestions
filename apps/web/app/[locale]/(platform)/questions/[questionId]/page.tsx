import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { locales, type Locale } from "@gmq/i18n";
import { QuestionView } from "@/components/question-v2/QuestionView";
import { listHeroSlugs, resolveQuestion } from "@/lib/question-server";
import { getLocalizedPath, getLocalizedUrl } from "@/lib/seo";

interface PageProps {
  params: { locale: string; questionId: string };
}

const DESCRIPTION_MAX = 200;

/**
 * ISR (README Phase 7 item 5). Nothing here reads the session, cookies or headers:
 * the server part only resolves the public question (metadata, redirect, 404) and
 * the three acts are client components that fetch per-viewer state over tRPC. So
 * the HTML is the same for everyone and can be cached for 60 s.
 *
 * It only takes effect once `app/[locale]/layout.tsx` calls `setRequestLocale(locale)`
 * (next-intl): without it, `NextIntlClientProvider` reads `headers()` for the time
 * zone and every page under `[locale]` renders dynamically (no error, just no cache).
 */
export const revalidate = 60;

/**
 * Hero slugs are prerendered at build; other ids/slugs render on first request and
 * are then cached the same way (dynamicParams stays true). A database that is
 * unreachable at build time only skips prerendering, it never fails the build.
 */
export async function generateStaticParams(): Promise<Array<PageProps["params"]>> {
  try {
    const heroes = await listHeroSlugs();
    return heroes.flatMap(({ slug }) => locales.map((locale) => ({ locale, questionId: slug })));
  } catch (err) {
    console.warn("[questions] generateStaticParams: no prerendering:", err instanceof Error ? err.message : err);
    return [];
  }
}

function asLocale(locale: string): Locale {
  return (locales as readonly string[]).includes(locale) ? (locale as Locale) : "en";
}

function truncate(text: string, max: number): string {
  const plain = text.replace(/\s+/g, " ").trim();
  return plain.length <= max ? plain : `${plain.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const question = await resolveQuestion(params.questionId);
  if (!question) return {};
  const locale = asLocale(params.locale);
  const zh = locale === "zh";
  const title = (zh ? question.titleZh || question.titleEn : question.titleEn || question.titleZh) ?? "";

  if (question.kind === "DRILL" || !question.slug) return { title };

  // Hero questions: the hook is the description, the slug URL is canonical, and
  // they are indexable (the platform layout defaults to noindex).
  const hook = (zh ? question.hookZh || question.hookEn : question.hookEn || question.hookZh) ?? "";
  const path = `/questions/${question.slug}`;
  const description = hook ? truncate(hook, DESCRIPTION_MAX) : undefined;
  return {
    title,
    description,
    alternates: {
      canonical: getLocalizedUrl(locale, path),
      languages: Object.fromEntries(locales.map((l) => [l, getLocalizedUrl(l, path)])),
    },
    openGraph: { title, description, url: getLocalizedUrl(locale, path), type: "article" },
    robots: { index: true, follow: true },
  };
}

/**
 * `/questions/[questionId]` takes a legacy id or a hero slug. A question that has
 * a slug but was opened by id is permanently redirected to its slug URL.
 */
export default async function QuestionPage({ params }: PageProps) {
  const param = decodeURIComponent(params.questionId);
  const question = await resolveQuestion(param);
  if (!question) notFound();

  if (question.slug && param !== question.slug) {
    permanentRedirect(getLocalizedPath(asLocale(params.locale), `/questions/${question.slug}`));
  }

  return <QuestionView questionId={question.id} />;
}
