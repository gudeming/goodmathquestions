"use client";

import { motion } from "framer-motion";

interface BattleXPMeterProps {
  battleXp: number;
  label?: string;
}

export function BattleXPMeter({ battleXp, label = "Battle Power" }: BattleXPMeterProps) {
  // Max visual scale: 2000 Battle XP = full bar
  const ratio = Math.min(1, battleXp / 2000);
  const isPowered = battleXp > 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-white/70 text-xs font-heading uppercase tracking-wider">{label}</p>

      {/* Meter container */}
      <div className="relative w-full h-6 bg-white/10 rounded-full overflow-hidden border border-white/20">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-yellow-300"
          animate={{ width: `${ratio * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 15 }}
        />

        {/* Glow overlay when powered */}
        {isPowered && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: [
                "0 0 0px rgba(251,191,36,0)",
                "0 0 12px rgba(251,191,36,0.8)",
                "0 0 0px rgba(251,191,36,0)",
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* XP count */}
      <motion.p
        className="text-yellow-300 font-bold text-lg font-heading"
        animate={isPowered ? { scale: [1, 1.1, 1] } : { scale: 1 }}
        transition={{ duration: 0.8, repeat: isPowered ? Infinity : 0, repeatDelay: 1 }}
      >
        ⚡ {battleXp.toLocaleString()} BXP
      </motion.p>
    </div>
  );
}
