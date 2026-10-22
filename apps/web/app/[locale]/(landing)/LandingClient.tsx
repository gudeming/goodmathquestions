"use client";

import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { FloatingMathSymbols } from "@/components/animations/FloatingMathSymbols";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { StatsCounter } from "@/components/landing/StatsCounter";
import { TodayPuzzleCard } from "@/components/home/TodayPuzzleCard";
import { localePath, type Locale, type TodayPuzzle } from "@/components/worlds/types";

export default function LandingClient({ today }: { today: TodayPuzzle | null }) {
  const t = useTranslations();
  const locale: Locale = useLocale() === "zh" ? "zh" : "en";

  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Background floating math symbols */}
      <FloatingMathSymbols />

      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4">
        <div className="max-w-6xl mx-auto text-center">
          {/* No opacity fade: the server-rendered hero must be visible before hydration (LCP). */}
          <motion.div
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Animated Logo / Mascot */}
            <motion.div
              className="text-8xl mb-6"
              animate={{ rotate: [0, -5, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              🧮
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-fun-purple to-fun-pink mb-6">
              {t("landing.heroTitle")}
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto mb-10 font-body">
              {t("landing.heroSubtitle")}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href={localePath(locale, "/signup")} className="btn-primary text-xl px-10 py-4 inline-block">
                  {t("landing.ctaStart")} 🚀
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href={localePath(locale, "/worlds")} className="btn-secondary text-xl px-10 py-4 inline-block">
                  {t("landing.ctaExplore")} 🗺️
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Today's Puzzle: the reason to come back every day */}
      <section className="relative -mt-16 px-4 pb-20">
        <div className="mx-auto max-w-4xl">
          <TodayPuzzleCard puzzle={today} locale={locale} />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-4xl md:text-5xl font-heading font-bold text-center text-gray-800 mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {t("landing.whyTitle")}
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🧩"
              title={t("landing.featureAnimate")}
              description={t("landing.featureAnimateDesc")}
              color="from-fun-cyan to-primary-500"
              delay={0}
            />
            <FeatureCard
              icon="🏆"
              title={t("landing.featureCompete")}
              description={t("landing.featureCompeteDesc")}
              color="from-fun-yellow to-fun-orange"
              delay={0.2}
            />
            <FeatureCard
              icon="📈"
              title={t("landing.featureLearn")}
              description={t("landing.featureLearnDesc")}
              color="from-fun-green to-fun-cyan"
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8">
            <StatsCounter
              end={500}
              suffix="+"
              label={t("landing.stats.questions")}
              icon="📝"
            />
            <StatsCounter
              end={10000}
              suffix="+"
              label={t("landing.stats.students")}
              icon="👦"
            />
            <StatsCounter
              end={30}
              suffix="+"
              label={t("landing.stats.countries")}
              icon="🌍"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            className="bg-gradient-to-r from-primary-500 via-fun-purple to-fun-pink
                        rounded-card p-12 text-white shadow-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-heading font-bold mb-4">
              {t("auth.createAccount")}
            </h2>
            <p className="text-xl mb-8 opacity-90">
              {t("landing.heroSubtitle")}
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href={localePath(locale, "/signup")}
                className="bg-white text-primary-600 font-heading font-bold
                           text-xl px-10 py-4 rounded-bubble shadow-lg
                           hover:shadow-xl transition-all duration-200 inline-block"
              >
                {t("landing.ctaStart")} 🎯
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h3 className="text-2xl font-heading font-bold mb-2">
            {t("common.appName")} 🧮
          </h3>
          <p className="text-gray-400 mb-6">{t("common.tagline")}</p>
          <p className="text-gray-500 text-sm">
            © 2026 GoodMathQuestions.com. Made by Eric ❤️ for young mathematicians.
          </p>
        </div>
      </footer>
    </div>
  );
}
