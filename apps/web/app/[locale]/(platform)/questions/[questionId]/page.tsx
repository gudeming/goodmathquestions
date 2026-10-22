import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { locales, type Locale } from "@gmq/i18n";
import { QuestionView } from "@/components/question-v2/QuestionView";
import { resolveQuestion } from "@/lib/question-server";
import { getLocalizedPath, getLocalizedUrl } from "@/lib/seo";

interface PageProps {
  params: { locale: string; questionId: string };
}

const DESCRIPTION_MAX = 200;

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
