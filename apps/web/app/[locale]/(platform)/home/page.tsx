import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import HomeClient from "./HomeClient";

interface PageProps {
  params: { locale: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "home" });
  return { title: t("metaTitle") };
}

/** Signed-in home (works for guests too, without progress): today's puzzle, worlds, continue, surprise. */
export default function HomePage() {
  return <HomeClient />;
}
