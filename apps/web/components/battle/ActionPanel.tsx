"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BattleXPMeter } from "./BattleXPMeter";

const ACTION_TIMEOUT_SEC = 5;

type AttackAction = "ATTACK_50" | "ATTACK_80" | "ATTACK_100" | "HOLD";

export interface OpponentTarget {
  userId: string;
  displayName: string;
  hp: number;
  isEliminated: boolean;
}

interface ActionPanelProps {
  battleXp: number;
  hasActed: boolean;
  onAction: (action: AttackAction, targetUserId?: string) => void;
  isSubmitting?: boolean;
  /** Provided for 3+ player battles — list of alive opponents to target */
  opponents?: OpponentTarget[];
}

interface AttackOption {
  action: AttackAction;
  label: string;
  pct: number | null;
  icon: string;
  desc: string;
  color: string;
}

const ATTACK_OPTIONS: AttackOption[] = [
  {
    action: "ATTACK_50",
    label: "50% Strike",
    pct: 0.5,
    icon: "⚡",
    desc: "Safe bet — keep half in reserve",
    color: "from-yellow-500 to-orange-500",
  },
  {
    action: "ATTACK_80",
    label: "80% Surge",
    pct: 0.8,
    icon: "🔥",
    desc: "High pressure — retain a buffer",
    color: "from-orange-500 to-red-500",
  },
  {
    action: "ATTACK_100",
    label: "ALL IN!",
    pct: 1.0,
    icon: "💥",
    desc: "Full force — nothing held back",
    color: "from-red-500 to-pink-600",
  },
  {
    action: "HOLD",
    label: "Hold & Shield",
    pct: null,
    icon: "🛡️",
    desc: "Save power — absorb next attack",
    color: "from-blue-500 to-indigo-600",
  },
];

export function ActionPanel({
  battleXp,
  hasActed,
  onAction,
  isSubmitting,
  opponents,
}: ActionPanelProps) {
  const isMultiplayer = opponents && opponents.length > 1;
  const aliveOpponents = opponents?.filter((o) => !o.isEliminated) ?? [];

  // Multi-player: two-step flow — pick target first, then pick attack
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  // 5-second countdown — auto-submit HOLD on expiry
  const [countdown, setCountdown] = useState(ACTION_TIMEOUT_SEC);
  const autoFiredRef = useRef(false);

  useEffect(() => {
    if (hasActed) return;
    autoFiredRef.current = false;
    setCountdown(ACTION_TIMEOUT_SEC);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!autoFiredRef.current) {
            autoFiredRef.current = true;
            onAction("HOLD");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasActed]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAction(action: AttackAction) {
    autoFiredRef.current = true; // prevent double-fire
    if (isMultiplayer && action !== "HOLD") {
      onAction(action, selectedTarget ?? aliveOpponents[0]?.userId);
    } else {
      onAction(action);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-heading font-bold text-lg">
          Choose Your Move!
        </h3>
        {!hasActed && (
          <motion.span
            key={countdown}
            initial={{ scale: 1.4, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`font-heading font-bold text-2xl tabular-nums ${
              countdown <= 2 ? "text-red-400" : "text-yellow-300"
            }`}
          >
            {countdown}s
          </motion.span>
        )}
      </div>

      <div className="mb-4">
        <BattleXPMeter battleXp={battleXp} label="Your Power" />
      </div>

      {hasActed ? (
        <p className="text-white/60 text-center font-heading animate-pulse py-4">
          Waiting for others...
        </p>
      ) : (
        <>
          {/* Multi-player: target selection */}
          <AnimatePresence>
            {isMultiplayer && aliveOpponents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-4"
              >
                <p className="text-white/50 text-xs font-heading text-center mb-2 uppercase tracking-wider">
                  🎯 Choose Target
                </p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {aliveOpponents.map((op) => (
                    <motion.button
                      key={op.userId}
                      onClick={() => setSelectedTarget(op.userId)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-3 py-2 rounded-xl text-sm font-heading border transition-all ${
                        (selectedTarget ?? aliveOpponents[0]?.userId) === op.userId
                          ? "bg-red-500/40 border-red-400 text-white"
                          : "bg-white/5 border-white/15 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      <span className="block font-bold text-xs">{op.displayName}</span>
                      <span className="block text-[10px] opacity-70">
                        {op.hp.toLocaleString()} HP
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Attack options */}
          <div className="grid grid-cols-2 gap-3">
            {ATTACK_OPTIONS.map((opt) => {
              const committed =
                opt.pct !== null ? Math.floor(battleXp * opt.pct) : battleXp;

              return (
                <motion.button
                  key={opt.action}
                  onClick={() => handleAction(opt.action)}
                  disabled={
                    isSubmitting || (opt.action !== "HOLD" && battleXp === 0)
                  }
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={`relative overflow-hidden bg-gradient-to-br ${opt.color} text-white font-bold py-4 px-3 rounded-2xl disabled:opacity-40 font-heading text-center shadow-lg`}
                >
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

          {!hasActed && battleXp === 0 && (
            <p className="text-white/50 text-xs text-center mt-3 font-heading">
              No power yet — you can only Shield this round
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}
