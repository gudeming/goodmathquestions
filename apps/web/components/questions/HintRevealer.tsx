"use client";

import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { MathText } from "@/components/ui/MathText";

interface Hint {
  en: string;
  zh: string;
}

interface HintRevealerProps {
  hints: Hint[];
  isZh: boolean;
}

export function HintRevealer({ hints, isZh }: HintRevealerProps) {
  const t = useTranslations("questions");
  const [revealedCount, setRevealedCount] = useState(0);

  const revealNext = () => {
    if (revealedCount < hints.length) {
      setRevealedCount((prev) => prev + 1);
    }
  };

  return (
    <motion.div
      className="bg-gradient-to-r from-fun-purple/10 to-fun-pink/10 rounded-card p-6 border-2 border-fun-purple/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-heading font-bold text-lg text-gray-800">
          💡 {t("hint")}
        </h3>
        {revealedCount < hints.length && (
          <motion.button
            onClick={revealNext}
            className="bg-fun-purple text-white text-sm font-heading font-medium
                       px-4 py-2 rounded-bubble hover:bg-fun-purple/80 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {revealedCount === 0 ? t("hint") : t("nextHint")} 🔮
          </motion.button>
        )}
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {hints.slice(0, revealedCount).map((hint, i) => (
            <motion.div
              key={i}
              className="bg-white/70 rounded-bubble px-4 py-3 flex items-start gap-3"
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-fun-purple font-bold text-sm mt-0.5">
                #{i + 1}
              </span>
              <MathText as="p" className="text-gray-700 font-body" text={isZh ? hint.zh : hint.en} />
            </motion.div>
          ))}
        </AnimatePresence>

        {revealedCount === 0 && (
          <p className="text-sm text-gray-500 italic font-body">
            {isZh
              ? "觉得卡住了？点击上面的按钮获取提示！"
              : "Feeling stuck? Click the button above for a hint!"}
          </p>
        )}
      </div>
    </motion.div>
  );
}
