"use client";

import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";

export default function LoginClient() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
        return;
      }

      router.push("/questions");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-md mx-auto px-4 py-12">
        <motion.div
          className="bg-white rounded-card shadow-xl p-8 border-2 border-primary-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              className="text-5xl mb-3"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              👋
            </motion.div>
            <h1 className="text-3xl font-heading font-bold text-gray-800">
              {t("welcomeBack")}
            </h1>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="bg-red-50 text-red-600 px-4 py-3 rounded-card mb-4 text-sm font-medium"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-heading font-medium text-gray-700 mb-1">
                {t("username")}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-fun"
                placeholder="math_ninja_123"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-heading font-medium text-gray-700 mb-1">
                {t("password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-fun"
                placeholder="••••••"
                required
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? tc("loading") : `${tc("login")} 🎮`}
            </motion.button>
          </form>

          {/* Signup Link */}
          <p className="text-center mt-6 text-gray-600">
            {t("noAccount")}{" "}
            <Link
              href="/signup"
              className="text-primary-600 font-heading font-semibold hover:underline"
            >
              {tc("signup")}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
