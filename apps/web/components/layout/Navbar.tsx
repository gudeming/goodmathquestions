"use client";

import { useTranslations, useLocale } from "next-intl";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { trpc } from "@/lib/trpc";

export function Navbar() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const updateProfile = trpc.user.updateProfile.useMutation();

  const getLocalizedPath = (targetLocale: "en" | "zh") => {
    const currentPath = pathname || "/";
    const segments = currentPath.split("/").filter(Boolean);
    if (segments[0] === "en" || segments[0] === "zh") {
      segments.shift();
    }
    const basePath = segments.length > 0 ? `/${segments.join("/")}` : "/";
    return targetLocale === "en"
      ? basePath
      : basePath === "/"
      ? "/zh"
      : `/zh${basePath}`;
  };

  const toCurrentLocalePath = (path: string) => {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    if (locale === "zh") {
      return normalized === "/" ? "/zh" : `/zh${normalized}`;
    }
    return normalized;
  };

  const switchLocale = () => {
    const newLocale = (locale === "en" ? "zh" : "en") as "en" | "zh";
    const targetPath = getLocalizedPath(newLocale);

    // Persist language globally for next requests and direct visits.
    document.cookie = `NEXT_LOCALE=${newLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;

    if (session?.user) {
      updateProfile.mutate({ locale: newLocale });
    }
    router.push(targetPath);
  };

  const isLoggedIn = !!session?.user;

  return (
    <motion.nav
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary-100 shadow-sm"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href={toCurrentLocalePath("/")} className="flex items-center gap-2 group">
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
        <div className="hidden md:flex items-center gap-5">
          <Link
            href={toCurrentLocalePath("/questions")}
            className="font-heading font-medium text-gray-600 hover:text-primary-600 transition-colors"
          >
            {t("questions")}
          </Link>
          <Link
            href={toCurrentLocalePath("/leaderboard")}
            className="font-heading font-medium text-gray-600 hover:text-primary-600 transition-colors"
          >
            {t("leaderboard")}
          </Link>
          <Link
            href={toCurrentLocalePath("/mastery")}
            className="font-heading font-medium text-gray-600 hover:text-primary-600 transition-colors"
          >
            {t("mastery")}
          </Link>

          {/* Language Toggle */}
          <button
            onClick={switchLocale}
            className="px-3 py-1 rounded-full bg-primary-50 text-primary-600 font-medium
                       hover:bg-primary-100 transition-colors text-sm"
          >
            {t("switchLang")}
          </button>

          {/* Authenticated / Guest buttons */}
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <Link
                href={toCurrentLocalePath("/profile")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-bubble bg-gradient-to-r from-primary-50 to-fun-purple/10 hover:from-primary-100 hover:to-fun-purple/20 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-primary-400 to-fun-purple flex items-center justify-center text-white text-xs font-bold">
                  {session.user?.name?.[0] || "?"}
                </div>
                <span className="text-sm font-heading font-medium text-gray-700">
                  {session.user?.name}
                </span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: toCurrentLocalePath("/") })}
                className="text-sm text-gray-400 hover:text-gray-600 font-heading transition-colors"
              >
                {t("logout")}
              </button>
            </div>
          ) : (
            <>
              <Link href={toCurrentLocalePath("/login")} className="btn-secondary text-sm py-2 px-4">
                {t("login")}
              </Link>
              <Link href={toCurrentLocalePath("/signup")} className="btn-primary text-sm py-2 px-4">
                {t("signup")}
              </Link>
            </>
          )}
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
            href={toCurrentLocalePath("/questions")}
            className="block font-heading text-gray-600 py-2"
            onClick={() => setMobileOpen(false)}
          >
            {t("questions")}
          </Link>
          <Link
            href={toCurrentLocalePath("/leaderboard")}
            className="block font-heading text-gray-600 py-2"
            onClick={() => setMobileOpen(false)}
          >
            {t("leaderboard")}
          </Link>
          <Link
            href={toCurrentLocalePath("/mastery")}
            className="block font-heading text-gray-600 py-2"
            onClick={() => setMobileOpen(false)}
          >
            {t("mastery")}
          </Link>
          <button
            onClick={switchLocale}
            className="block w-full text-left font-heading text-gray-600 py-2"
          >
            {t("switchLang")}
          </button>

          {isLoggedIn ? (
            <div className="pt-2 space-y-2">
              <Link
                href={toCurrentLocalePath("/profile")}
                className="block w-full text-center btn-secondary text-sm py-2"
                onClick={() => setMobileOpen(false)}
              >
                {t("profile")}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: toCurrentLocalePath("/") })}
                className="block w-full text-center text-sm text-gray-400 py-2"
              >
                {t("logout")}
              </button>
            </div>
          ) : (
            <div className="flex gap-3 pt-2">
              <Link
                href={toCurrentLocalePath("/login")}
                className="btn-secondary text-sm py-2 px-4 flex-1 text-center"
                onClick={() => setMobileOpen(false)}
              >
                {t("login")}
              </Link>
              <Link
                href={toCurrentLocalePath("/signup")}
                className="btn-primary text-sm py-2 px-4 flex-1 text-center"
                onClick={() => setMobileOpen(false)}
              >
                {t("signup")}
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </motion.nav>
  );
}
