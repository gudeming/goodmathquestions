"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { BattleRedisState } from "@gmq/api/src/battle-state";

type RoundSummary = NonNullable<BattleRedisState["lastRoundSummary"]>;

interface ResolutionOverlayProps {
  summary: RoundSummary | null;
  myUserId: string;
  visible: boolean;
}

export function ResolutionOverlay({ summary, myUserId, visible }: ResolutionOverlayProps) {
  if (!summary || !visible) return null;

  const myResult = summary.participants[myUserId];
  const opponentResult = Object.entries(summary.participants).find(
    ([id]) => id !== myUserId
  )?.[1];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-slate-900/95 border border-white/20 rounded-3xl p-8 max-w-sm w-full mx-4 text-center"
          >
            <p className="text-white/60 text-sm font-heading uppercase tracking-widest mb-4">
              Round {summary.round + 1} Result
            </p>

            {/* My stats */}
            {myResult && (
              <div className="mb-4">
                <p className="text-white font-bold text-lg mb-2">You</p>
                <div className="flex justify-center gap-6 text-sm">
                  <div>
                    <p className="text-white/50">Action</p>
                    <p className="text-white font-bold">
                      {myResult.action === "ATTACK_50" ? "⚡ 50%" :
                       myResult.action === "ATTACK_80" ? "🔥 80%" :
                       myResult.action === "ATTACK_100" ? "💥 100%" :
                       myResult.action === "HOLD" ? "🛡️ Hold" :
                       myResult.action === "COUNTER" ? "⚡️ Counter" :
                       myResult.action === "ACTIVE_ATTACK" ? "🔥 Assault" :
                       myResult.action === "FAILED_ATTACK" ? "❌ Failed" : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/50">Damage dealt</p>
                    <p className="text-orange-400 font-bold">{myResult.damageDealt.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Taken</p>
                    <p className="text-red-400 font-bold">{myResult.damageReceived.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-green-400 text-sm mt-2">HP: {myResult.hpAfter.toLocaleString()}</p>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-white/10 my-4" />

            {/* Opponent stats */}
            {opponentResult && (
              <div>
                <p className="text-white font-bold text-lg mb-2">Opponent</p>
                <div className="flex justify-center gap-6 text-sm">
                  <div>
                    <p className="text-white/50">Action</p>
                    <p className="text-white font-bold">
                      {opponentResult.action === "ATTACK_50" ? "⚡ 50%" :
                       opponentResult.action === "ATTACK_80" ? "🔥 80%" :
                       opponentResult.action === "ATTACK_100" ? "💥 100%" :
                       opponentResult.action === "HOLD" ? "🛡️ Hold" :
                       opponentResult.action === "COUNTER" ? "⚡️ Counter" :
                       opponentResult.action === "ACTIVE_ATTACK" ? "🔥 Assault" :
                       opponentResult.action === "FAILED_ATTACK" ? "❌ Failed" : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/50">Dealt</p>
                    <p className="text-orange-400 font-bold">{opponentResult.damageDealt.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/50">HP left</p>
                    <p className="text-green-400 font-bold">{opponentResult.hpAfter.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            <motion.div
              className="mt-6 text-white/40 text-xs"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              Next round starting...
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
