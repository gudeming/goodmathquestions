"use client";

import { useTranslations, useLocale } from "next-intl";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function Navbar() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const switchLocale = () => {
    const newLocale = locale === "en" ? "zh" : "en";
    const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";
    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  return (
    <motion.nav
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary-100 shadow-sm"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <motion.span
            className="text-3xl"
            whileHover={{ rotate: 20 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            🧮
          </motion.span>
          <span className="text-xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-fun-purple hidden sm:inline">
            {t("appName")}
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/questions"
            className="font-heading font-medium text-gray-600 hover:text-primary-600 transition-colors"
          >
            {t("questions")}
          </Link>
          <Link
            href="/leaderboard"
            className="font-heading font-medium text-gray-600 hover:text-primary-600 transition-colors"
          >
            {t("leaderboard")}
          </Link>

          {/* Language Toggle */}
          <button
            onClick={switchLocale}
            className="px-3 py-1 rounded-full bg-primary-50 text-primary-600 font-medium
                       hover:bg-primary-100 transition-colors text-sm"
          >
            {t("switchLang")}
          </button>

          {/* Auth Buttons */}
          <Link href="/login" className="btn-secondary text-sm py-2 px-4">
            {t("login")}
          </Link>
          <Link href="/signup" className="btn-primary text-sm py-2 px-4">
            {t("signup")}
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-2xl"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          className="md:hidden bg-white border-t border-primary-100 px-4 py-4 space-y-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <Link
            href="/questions"
            className="block font-heading text-gray-600 py-2"
            onClick={() => setMobileOpen(false)}
          >
            {t("questions")}
          </Link>
          <Link
            href="/leaderboard"
            className="block font-heading text-gray-600 py-2"
            onClick={() => setMobileOpen(false)}
          >
            {t("leaderboard")}
          </Link>
          <button
            onClick={switchLocale}
            className="block w-full text-left font-heading text-gray-600 py-2"
          >
            {t("switchLang")}
          </button>
          <div className="flex gap-3 pt-2">
            <Link href="/login" className="btn-secondary text-sm py-2 px-4 flex-1 text-center">
              {t("login")}
            </Link>
            <Link href="/signup" className="btn-primary text-sm py-2 px-4 flex-1 text-center">
              {t("signup")}
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
