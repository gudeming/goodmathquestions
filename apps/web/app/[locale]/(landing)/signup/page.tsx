"use client";

import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";

type AuthMode = "email" | "class";

export default function SignupPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
    age: 10,
    parentEmail: "",
    classCode: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        ...form,
        locale,
        parentEmail: mode === "email" ? form.parentEmail : undefined,
        classCode: mode === "class" ? form.classCode : undefined,
      };

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      // Auto-login after signup
      router.push("/login");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              🚀
            </motion.div>
            <h1 className="text-3xl font-heading font-bold text-gray-800">
              {t("createAccount")}
            </h1>
          </div>

          {/* Auth Mode Toggle */}
          <div className="flex gap-2 mb-6 bg-primary-50 rounded-bubble p-1">
            <button
              onClick={() => setMode("email")}
              className={`flex-1 py-2 px-4 rounded-bubble text-sm font-heading font-medium transition-all ${
                mode === "email"
                  ? "bg-white text-primary-600 shadow-md"
                  : "text-gray-500"
              }`}
            >
              {t("signupWithEmail")}
            </button>
            <button
              onClick={() => setMode("class")}
              className={`flex-1 py-2 px-4 rounded-bubble text-sm font-heading font-medium transition-all ${
                mode === "class"
                  ? "bg-white text-primary-600 shadow-md"
                  : "text-gray-500"
              }`}
            >
              {t("signupWithClass")}
            </button>
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
            {/* Display Name */}
            <div>
              <label className="block text-sm font-heading font-medium text-gray-700 mb-1">
                {t("displayName")}
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => updateForm("displayName", e.target.value)}
                className="input-fun"
                placeholder="MathWizard"
                required
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-heading font-medium text-gray-700 mb-1">
                {t("username")}
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => updateForm("username", e.target.value)}
                className="input-fun"
                placeholder="math_ninja_123"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-heading font-medium text-gray-700 mb-1">
                {t("password")}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
                className="input-fun"
                placeholder="••••••"
                required
                minLength={6}
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-heading font-medium text-gray-700 mb-1">
                {t("age")}
              </label>
              <div className="flex gap-2 flex-wrap">
                {[8, 9, 10, 11, 12, 13, 14].map((age) => (
                  <button
                    key={age}
                    type="button"
                    onClick={() => updateForm("age", age)}
                    className={`w-12 h-12 rounded-full font-heading font-bold text-lg transition-all ${
                      form.age === age
                        ? "bg-gradient-to-r from-primary-500 to-fun-purple text-white shadow-lg scale-110"
                        : "bg-primary-50 text-gray-600 hover:bg-primary-100"
                    }`}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional: Parent Email or Class Code */}
            <AnimatePresence mode="wait">
              {mode === "email" ? (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <label className="block text-sm font-heading font-medium text-gray-700 mb-1">
                    {t("parentEmail")}
                  </label>
                  <input
                    type="email"
                    value={form.parentEmail}
                    onChange={(e) => updateForm("parentEmail", e.target.value)}
                    className="input-fun"
                    placeholder="parent@example.com"
                    required={mode === "email"}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t("parentEmailHint")}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="class"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <label className="block text-sm font-heading font-medium text-gray-700 mb-1">
                    {t("classCode")}
                  </label>
                  <input
                    type="text"
                    value={form.classCode}
                    onChange={(e) =>
                      updateForm("classCode", e.target.value.toUpperCase())
                    }
                    className="input-fun uppercase tracking-widest text-center"
                    placeholder="MATH-2024-ABC"
                    required={mode === "class"}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t("classCodeHint")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? tc("loading") : `${t("createAccount")} 🎉`}
            </motion.button>
          </form>

          {/* Login Link */}
          <p className="text-center mt-6 text-gray-600">
            {t("alreadyHaveAccount")}{" "}
            <Link
              href="/login"
              className="text-primary-600 font-heading font-semibold hover:underline"
            >
              {tc("login")}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
