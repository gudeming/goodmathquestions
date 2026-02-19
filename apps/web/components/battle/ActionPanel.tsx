"use client";

import { motion } from "framer-motion";
import { BattleXPMeter } from "./BattleXPMeter";

type AttackAction = "ATTACK_50" | "ATTACK_80" | "ATTACK_100" | "HOLD";

interface ActionPanelProps {
  battleXp: number;
  hasActed: boolean;
  onAction: (action: AttackAction) => void;
  isSubmitting?: boolean;
}

interface AttackOption {
  action: AttackAction;
  label: string;
  pct: number | null; // null for HOLD
  icon: string;
  desc: string;
  color: string;
  glowColor: string;
}

const ATTACK_OPTIONS: AttackOption[] = [
  {
    action: "ATTACK_50",
    label: "50% Strike",
    pct: 0.5,
    icon: "⚡",
    desc: "Safe bet — keep half in reserve",
    color: "from-yellow-500 to-orange-500",
    glowColor: "rgba(234,179,8,0.5)",
  },
  {
    action: "ATTACK_80",
    label: "80% Surge",
    pct: 0.8,
    icon: "🔥",
    desc: "High pressure — retain a buffer",
    color: "from-orange-500 to-red-500",
    glowColor: "rgba(249,115,22,0.5)",
  },
  {
    action: "ATTACK_100",
    label: "ALL IN!",
    pct: 1.0,
    icon: "💥",
    desc: "Full force — nothing held back",
    color: "from-red-500 to-pink-600",
    glowColor: "rgba(239,68,68,0.6)",
  },
  {
    action: "HOLD",
    label: "Hold & Shield",
    pct: null,
    icon: "🛡️",
    desc: "Save power — absorb next attack",
    color: "from-blue-500 to-indigo-600",
    glowColor: "rgba(99,102,241,0.5)",
  },
];

export function ActionPanel({ battleXp, hasActed, onAction, isSubmitting }: ActionPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20"
    >
      <h3 className="text-white font-heading font-bold text-center text-lg mb-3">
        Choose Your Move!
      </h3>

      <div className="mb-4">
        <BattleXPMeter battleXp={battleXp} label="Your Power" />
      </div>

      {hasActed ? (
        <p className="text-white/60 text-center font-heading animate-pulse py-4">
          Waiting for opponent...
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {ATTACK_OPTIONS.map((opt) => {
            const committed =
              opt.pct !== null ? Math.floor(battleXp * opt.pct) : battleXp;

            return (
              <motion.button
                key={opt.action}
                onClick={() => onAction(opt.action)}
                disabled={isSubmitting || (opt.action !== "HOLD" && battleXp === 0)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`relative overflow-hidden bg-gradient-to-br ${opt.color} text-white font-bold py-4 px-3 rounded-2xl disabled:opacity-40 font-heading text-center shadow-lg`}
              >
                {/* Subtle animated shimmer */}
                <motion.div
                  className="absolute inset-0 bg-white/10"
                  animate={{ opacity: [0, 0.15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 1 }}
                />
                <p className="text-2xl mb-1">{opt.icon}</p>
                <p className="text-sm font-bold leading-tight">{opt.label}</p>
                {opt.pct !== null && (
                  <p className="text-xs opacity-90 mt-1 font-bold">
                    {committed.toLocaleString()} dmg
                  </p>
                )}
                <p className="text-[10px] opacity-70 mt-1 leading-tight">{opt.desc}</p>
              </motion.button>
            );
          })}
        </div>
      )}

      {!hasActed && battleXp === 0 && (
        <p className="text-white/50 text-xs text-center mt-3 font-heading">
          No power yet — you can only Shield this round
        </p>
      )}
    </motion.div>
  );
}
