"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface PlayerHPBarProps {
  displayName: string;
  avatarUrl?: string | null;
  hp: number;
  maxHp?: number;
  isMe?: boolean;
  hasAnswered?: boolean;
  damageReceived?: number; // trigger shake when > 0
  avatarColorClass?: string; // e.g. "from-blue-400 to-blue-600"
}

/** Returns up to 2 initials: "John Smith" → "JS", "Alice" → "AL", "You" → "ME" */
function getInitials(name: string): string {
  if (name === "You") return "ME";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function PlayerHPBar({
  displayName,
  avatarUrl,
  hp,
  maxHp = 5000,
  isMe = false,
  hasAnswered = false,
  damageReceived = 0,
  avatarColorClass = "from-primary-400 to-fun-purple",
}: PlayerHPBarProps) {
  const [shaking, setShaking] = useState(false);
  const ratio = Math.max(0, Math.min(1, hp / maxHp));

  // HP bar color: green → yellow → red
  const barColor =
    ratio > 0.6
      ? "from-green-400 to-green-500"
      : ratio > 0.3
      ? "from-yellow-400 to-orange-400"
      : "from-red-400 to-red-600";

  useEffect(() => {
    if (damageReceived > 0) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 600);
      return () => clearTimeout(t);
    }
  }, [damageReceived]);

  return (
    <motion.div
      className={`flex flex-col gap-2 ${isMe ? "items-start" : "items-end"}`}
      animate={shaking ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Player info */}
      <div className={`flex items-center gap-2 ${isMe ? "" : "flex-row-reverse"}`}>
        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${avatarColorClass} flex items-center justify-center text-white font-bold text-sm overflow-hidden`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            getInitials(displayName)
          )}
        </div>
        <div className={isMe ? "text-left" : "text-right"}>
          <p className="text-white font-heading font-bold text-sm truncate max-w-24">
            {displayName}
          </p>
          <p className="text-white/70 text-xs">
            {hp.toLocaleString()} / {maxHp.toLocaleString()} HP
          </p>
        </div>
        {hasAnswered && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-green-400 text-lg"
          >
            ✓
          </motion.span>
        )}
      </div>

      {/* HP Bar */}
      <div className="w-48 md:w-64 h-4 bg-white/20 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </div>

      {/* Damage indicator */}
      <AnimatePresence>
        {damageReceived > 0 && (
          <motion.div
            key={damageReceived}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -30, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute text-red-400 font-bold text-xl pointer-events-none"
          >
            -{damageReceived.toLocaleString()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
