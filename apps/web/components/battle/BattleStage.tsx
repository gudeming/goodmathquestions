"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type BattleActionType =
  | "ATTACK_50"
  | "ATTACK_80"
  | "ATTACK_100"
  | "HOLD"
  | "COUNTER"
  | "ACTIVE_ATTACK"
  | "FAILED_ATTACK"
  | null;

export type CharacterType = "mage" | "hollow_knight" | "hornet" | "bendy" | "tanjiro";

export const CHARACTER_INFO: Record<CharacterType, { name: string; tagline: string; emoji: string }> = {
  mage:          { name: "Math Mage",     tagline: "Cast spells of knowledge!",     emoji: "🧙" },
  hollow_knight: { name: "Hollow Knight", tagline: "The Pale Warrior strikes!",     emoji: "⚔️" },
  hornet:        { name: "Hornet",        tagline: "Swift as the silk needle!",     emoji: "🪡" },
  bendy:         { name: "Bendy",         tagline: "Ink-powered cartoon demon!",    emoji: "🎩" },
  tanjiro:       { name: "Tanjiro",       tagline: "Total Concentration Math!",     emoji: "🗡️" },
};

type FighterState = "idle" | "charging" | "attacking" | "blocking" | "hit";

type ProjectileKind = "lightning" | "fireball" | "beam" | null;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Wizard Mage SVG Sprite ───────────────────────────────────────────────────
function MageSprite({
  facingLeft,
  state,
  hpRatio,
  isMe,
}: {
  facingLeft: boolean;
  state: FighterState;
  hpRatio: number;
  isMe: boolean;
}) {
  const primary = isMe ? "#4F46E5" : "#DC2626";
  const dark = isMe ? "#312E81" : "#7F1D1D";
  const accent = isMe ? "#A78BFA" : "#FCA5A5";
  const skin = "#FFDAB9";

  const angry = state === "attacking" || state === "charging";
  const stunned = state === "hit";
  const blocking = state === "blocking";
  const tired = !stunned && hpRatio < 0.3;

  return (
    <svg
      width="60"
      height="78"
      viewBox="0 0 60 78"
      style={{
        transform: facingLeft ? "scaleX(-1)" : undefined,
        overflow: "visible",
        display: "block",
      }}
    >
      {/* ── Wizard Hat ── */}
      <polygon points="30,1 17,28 43,28" fill={dark} />
      <rect x="13" y="26" width="34" height="7" rx="3.5" fill={primary} />
      {/* Hat gem */}
      <circle cx="30" cy="14" r="4" fill={accent} />
      <circle cx="30" cy="14" r="2" fill="white" opacity="0.8" />

      {/* ── Head ── */}
      <circle cx="30" cy="42" r="14" fill={skin} />

      {/* ── Expression ── */}
      {stunned ? (
        <>
          {/* X eyes */}
          <line x1="22" y1="38" x2="28" y2="44" stroke="#444" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="28" y1="38" x2="22" y2="44" stroke="#444" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="32" y1="38" x2="38" y2="44" stroke="#444" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="38" y1="38" x2="32" y2="44" stroke="#444" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M25,49 Q30,47 35,49" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" />
          {/* Dizzy stars */}
          <text x="14" y="32" fontSize="8" fill="#FCD34D">★</text>
          <text x="40" y="31" fontSize="8" fill="#FCD34D">★</text>
        </>
      ) : blocking ? (
        <>
          {/* Determined squint */}
          <path d="M21,41 Q25,38 29,41" fill="none" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M31,41 Q35,38 39,41" fill="none" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M20,37 L27,38" stroke="#333" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M33,38 L40,37" stroke="#333" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M25,47 Q30,50 35,47" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : angry ? (
        <>
          {/* Fierce eyes */}
          <circle cx="25" cy="41" r="3" fill="#1a1a2e" />
          <circle cx="35" cy="41" r="3" fill="#1a1a2e" />
          <circle cx="25.7" cy="40.3" r="0.9" fill="white" />
          <circle cx="35.7" cy="40.3" r="0.9" fill="white" />
          {/* Attack brows */}
          <path d="M21,37 L27.5,39" stroke="#333" strokeWidth="2" strokeLinecap="round" />
          <path d="M32.5,39 L39,37" stroke="#333" strokeWidth="2" strokeLinecap="round" />
          <path d="M25,47 Q30,45 35,47" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : tired ? (
        <>
          {/* Half-closed tired eyes */}
          <circle cx="25" cy="41" r="3" fill="#1a1a2e" />
          <circle cx="35" cy="41" r="3" fill="#1a1a2e" />
          <path d="M22,39 Q25,42 28,39" fill="rgba(190,160,140,0.6)" />
          <path d="M32,39 Q35,42 38,39" fill="rgba(190,160,140,0.6)" />
          <path d="M25,47 Q30,47 35,47" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
          {/* Sweat drop */}
          <ellipse cx="41" cy="37" rx="2.5" ry="3.5" fill="#7DD3FC" opacity="0.8" />
        </>
      ) : (
        <>
          {/* Normal happy eyes */}
          <circle cx="25" cy="41" r="3" fill="white" />
          <circle cx="35" cy="41" r="3" fill="white" />
          <circle cx="25" cy="41" r="2" fill="#1a1a2e" />
          <circle cx="35" cy="41" r="2" fill="#1a1a2e" />
          <circle cx="25.8" cy="40.3" r="0.8" fill="white" />
          <circle cx="35.8" cy="40.3" r="0.8" fill="white" />
          <path d="M22,37 Q25,35.5 28,37" fill="none" stroke="#888" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M32,37 Q35,35.5 38,37" fill="none" stroke="#888" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M25,47 Q30,50 35,47" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}

      {/* ── Neck ── */}
      <rect x="25" y="55" width="10" height="5" rx="2" fill={skin} />

      {/* ── Robe ── */}
      <path d="M15,59 Q13,73 16,78 Q30,82 44,78 Q47,73 45,59 Z" fill={primary} />
      <path d="M15,59 Q13,73 16,78" fill="none" stroke={dark} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M45,59 Q47,73 44,78" fill="none" stroke={dark} strokeWidth="1.5" strokeLinecap="round" />
      {/* Belt */}
      <path d="M17,65 Q30,67 43,65" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />

      {/* ── Left arm ── */}
      <path d="M17,63 Q7,68 5,75" fill="none" stroke={primary} strokeWidth="7" strokeLinecap="round" />
      <circle cx="5" cy="76" r="5" fill={skin} />

      {/* ── Right arm / wand arm ── */}
      <path
        d={angry ? "M43,61 Q52,57 57,61" : "M43,63 Q52,63 57,67"}
        fill="none"
        stroke={primary}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="57" cy={angry ? "62" : "68"} r="5" fill={skin} />

      {/* ── Wand ── */}
      <line
        x1="57"
        y1={angry ? "62" : "68"}
        x2={angry ? "65" : "63"}
        y2={angry ? "47" : "53"}
        stroke="#92400E"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx={angry ? "65" : "63"} cy={angry ? "45" : "51"} r="6" fill="#FCD34D" />
      <circle cx={angry ? "65" : "63"} cy={angry ? "45" : "51"} r="3.5" fill="white" opacity="0.75" />

      {/* Wand power glow when attacking */}
      {angry && (
        <>
          <circle cx="65" cy="45" r="10" fill={primary} opacity="0.35" />
          <circle cx="65" cy="45" r="16" fill={primary} opacity="0.12" />
        </>
      )}

      {/* ── Shield when blocking ── */}
      {blocking && (
        <g>
          <path d="M44,53 L66,53 Q68,70 55,79 Q42,70 44,53 Z" fill={primary} />
          <path d="M46,55 L64,55 Q66,70 55,77 Q44,70 46,55 Z" fill="none" stroke={accent} strokeWidth="1.5" />
          <circle cx="55" cy="65" r="4.5" fill={accent} />
          <circle cx="55" cy="65" r="2.5" fill="white" opacity="0.65" />
        </g>
      )}
    </svg>
  );
}

// ─── Hollow Knight Sprite ─────────────────────────────────────────────────────
function HollowKnightSprite({
  facingLeft, state, hpRatio, isMe,
}: { facingLeft: boolean; state: FighterState; hpRatio: number; isMe: boolean }) {
  const playerColor = isMe ? "#4F46E5" : "#DC2626";
  const angry = state === "attacking" || state === "charging";
  const stunned = state === "hit";
  const blocking = state === "blocking";
  const tired = !stunned && hpRatio < 0.3;
  return (
    <svg width="60" height="78" viewBox="0 0 60 78"
      style={{ transform: facingLeft ? "scaleX(-1)" : undefined, overflow: "visible", display: "block" }}>
      {/* Horns */}
      <path d="M24,28 Q19,17 22,8" fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M36,28 Q41,17 38,8" fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="22" cy="8" r="2" fill="#1a1a1a"/>
      <circle cx="38" cy="8" r="2" fill="#1a1a1a"/>
      {/* Head */}
      <ellipse cx="30" cy="37" rx="13" ry="12" fill="#111"/>
      {/* Eyes */}
      {stunned ? (
        <>
          <line x1="21" y1="33" x2="27" y2="39" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="27" y1="33" x2="21" y2="39" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="33" y1="33" x2="39" y2="39" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="39" y1="33" x2="33" y2="39" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <text x="14" y="27" fontSize="8" fill="#FCD34D">★</text>
          <text x="40" y="26" fontSize="8" fill="#FCD34D">★</text>
        </>
      ) : blocking ? (
        <>
          <ellipse cx="23" cy="36" rx="3.5" ry="2.5" fill="white" opacity="0.85"/>
          <ellipse cx="37" cy="36" rx="3.5" ry="2.5" fill="white" opacity="0.85"/>
          <path d="M20,31 L26,33" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M34,33 L40,31" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
        </>
      ) : angry ? (
        <>
          <ellipse cx="23" cy="36" rx="4" ry="3" fill="white" opacity="0.95"/>
          <ellipse cx="37" cy="36" rx="4" ry="3" fill="white" opacity="0.95"/>
          <ellipse cx="23" cy="36" rx="2" ry="1.5" fill="#BEF9F9"/>
          <ellipse cx="37" cy="36" rx="2" ry="1.5" fill="#BEF9F9"/>
        </>
      ) : tired ? (
        <>
          <ellipse cx="23" cy="37" rx="3.5" ry="2" fill="white" opacity="0.6"/>
          <ellipse cx="37" cy="37" rx="3.5" ry="2" fill="white" opacity="0.6"/>
          <ellipse cx="41" cy="31" rx="2.5" ry="3.5" fill="#7DD3FC" opacity="0.6"/>
        </>
      ) : (
        <>
          <ellipse cx="23" cy="35" rx="3.5" ry="4.5" fill="white" opacity="0.92"/>
          <ellipse cx="37" cy="35" rx="3.5" ry="4.5" fill="white" opacity="0.92"/>
          <ellipse cx="23" cy="36" rx="2" ry="2.5" fill="#DBEAFE" opacity="0.6"/>
          <ellipse cx="37" cy="36" rx="2" ry="2.5" fill="#DBEAFE" opacity="0.6"/>
        </>
      )}
      {/* Neck */}
      <rect x="26" y="48" width="8" height="5" rx="2" fill="#1a1a1a"/>
      {/* Body/Cloak */}
      <path d="M15,52 Q12,68 16,78 Q30,82 44,78 Q48,68 45,52 Z" fill="#1a1a1a"/>
      <path d="M17,56 Q30,59 43,56" fill="none" stroke="#0d0d0d" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Left arm */}
      <path d="M18,56 Q8,62 5,68" fill="none" stroke="#1a1a1a" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="5" cy="69" r="4" fill="#222"/>
      {/* Right arm holding Nail */}
      <path d={angry ? "M42,54 Q52,50 56,46" : "M42,56 Q52,56 56,60"}
        fill="none" stroke="#1a1a1a" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="56" cy={angry ? "46" : "60"} r="4" fill="#222"/>
      {/* Nail blade */}
      <line x1="56" y1={angry ? "46" : "60"} x2={angry ? "64" : "62"} y2={angry ? "27" : "43"}
        stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Crossguard */}
      <line x1={angry ? "59" : "57"} y1={angry ? "37" : "52"} x2={angry ? "68" : "66"} y2={angry ? "37" : "52"}
        stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx={angry ? "64" : "62"} cy={angry ? "26" : "42"} r="1.8" fill="#D1D5DB"/>
      {/* Nail glow when attacking */}
      {angry && (<><circle cx="64" cy="26" r="9" fill={playerColor} opacity="0.3"/><circle cx="64" cy="26" r="15" fill={playerColor} opacity="0.12"/></>)}
      {/* Shield when blocking */}
      {blocking && (
        <g>
          <path d="M44,51 L65,51 Q67,67 55,77 Q43,67 44,51 Z" fill="#1a1a1a"/>
          <path d="M46,53 L63,53 Q65,67 55,75 Q45,67 46,53 Z" fill="none" stroke="#374151" strokeWidth="1.5"/>
          <ellipse cx="55" cy="63" r="5" fill={playerColor} opacity="0.5"/>
          <ellipse cx="55" cy="63" r="2.5" fill="white" opacity="0.4"/>
        </g>
      )}
    </svg>
  );
}

// ─── Hornet (Silksong) Sprite ─────────────────────────────────────────────────
function HornetSprite({
  facingLeft, state, hpRatio, isMe,
}: { facingLeft: boolean; state: FighterState; hpRatio: number; isMe: boolean }) {
  const playerColor = isMe ? "#4F46E5" : "#DC2626";
  const angry = state === "attacking" || state === "charging";
  const stunned = state === "hit";
  const blocking = state === "blocking";
  const tired = !stunned && hpRatio < 0.3;
  return (
    <svg width="60" height="78" viewBox="0 0 60 78"
      style={{ transform: facingLeft ? "scaleX(-1)" : undefined, overflow: "visible", display: "block" }}>
      {/* Antenna */}
      <path d="M28,24 Q26,15 29,9" fill="none" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="29" cy="8" r="2.5" fill="#2d2d2d"/>
      {/* Head */}
      <ellipse cx="30" cy="34" rx="12" ry="11" fill="#2d2d2d"/>
      {/* Face mask */}
      <ellipse cx="30" cy="35" rx="7.5" ry="8" fill="#3a3a3a"/>
      {/* Eyes */}
      {stunned ? (
        <>
          <line x1="24" y1="31" x2="28" y2="37" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round"/>
          <line x1="28" y1="31" x2="24" y2="37" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round"/>
          <line x1="32" y1="31" x2="36" y2="37" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round"/>
          <line x1="36" y1="31" x2="32" y2="37" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round"/>
          <text x="14" y="26" fontSize="7" fill="#FCD34D">★</text>
          <text x="40" y="25" fontSize="7" fill="#FCD34D">★</text>
        </>
      ) : blocking ? (
        <>
          <path d="M24,34 Q27,31 30,34" fill="none" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round"/>
          <path d="M30,34 Q33,31 36,34" fill="none" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round"/>
          <path d="M22,29 L28,31" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M32,31 L38,29" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
        </>
      ) : angry ? (
        <>
          <circle cx="26" cy="34" r="2.5" fill="#E0E0E0"/>
          <circle cx="34" cy="34" r="2.5" fill="#E0E0E0"/>
          <circle cx="26" cy="34" r="1.2" fill="#1a1a1a"/>
          <circle cx="34" cy="34" r="1.2" fill="#1a1a1a"/>
          <path d="M23,29 L27,31" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M33,31 L37,29" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
        </>
      ) : tired ? (
        <>
          <circle cx="26" cy="34" r="2.5" fill="#E0E0E0" opacity="0.6"/>
          <circle cx="34" cy="34" r="2.5" fill="#E0E0E0" opacity="0.6"/>
          <path d="M23,32 Q26,35 29,32" fill="rgba(60,60,60,0.7)"/>
          <path d="M31,32 Q34,35 37,32" fill="rgba(60,60,60,0.7)"/>
        </>
      ) : (
        <>
          <circle cx="26" cy="34" r="2.5" fill="#E0E0E0"/>
          <circle cx="34" cy="34" r="2.5" fill="#E0E0E0"/>
          <circle cx="26.5" cy="33.5" r="1" fill="#1a1a1a"/>
          <circle cx="34.5" cy="33.5" r="1" fill="#1a1a1a"/>
        </>
      )}
      {/* Red silk scarf */}
      <path d="M22,44 Q17,49 14,54" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"/>
      <path d="M25,44 Q21,51 18,56" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Neck */}
      <rect x="26" y="44" width="8" height="5" rx="2" fill="#2d2d2d"/>
      {/* Body */}
      <path d="M20,48 Q18,65 21,78 Q30,81 39,78 Q42,65 40,48 Z" fill="#2d2d2d"/>
      <path d="M22,52 Q30,55 38,52" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Left arm */}
      <path d="M21,52 Q11,58 8,64" fill="none" stroke="#2d2d2d" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="8" cy="65" r="3.5" fill="#333"/>
      {/* Right arm + needle */}
      <path d={angry ? "M39,50 Q49,46 52,42" : "M39,52 Q49,52 52,56"}
        fill="none" stroke="#2d2d2d" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="52" cy={angry ? "42" : "56"} r="3.5" fill="#333"/>
      {/* Needle */}
      <line x1="52" y1={angry ? "42" : "56"} x2={angry ? "67" : "65"} y2={angry ? "24" : "40"}
        stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx={angry ? "67" : "65"} cy={angry ? "23" : "39"} r="1.5" fill="#9CA3AF"/>
      {/* Needle glow */}
      {angry && (<><circle cx="67" cy="23" r="7" fill={playerColor} opacity="0.35"/><circle cx="67" cy="23" r="12" fill={playerColor} opacity="0.12"/></>)}
      {/* Shield (silk web) */}
      {blocking && (
        <g>
          <path d="M44,50 L64,50 Q66,65 55,75 Q44,65 44,50 Z" fill="#2d2d2d"/>
          <path d="M44,50 L64,50 Q66,65 55,75 Q44,65 44,50 Z" fill="none" stroke="#DC2626" strokeWidth="1.5"/>
          <line x1="55" y1="50" x2="55" y2="75" stroke="#DC2626" strokeWidth="1" opacity="0.5"/>
          <line x1="44" y1="62" x2="66" y2="62" stroke="#DC2626" strokeWidth="1" opacity="0.5"/>
        </g>
      )}
    </svg>
  );
}

// ─── Bendy Sprite ─────────────────────────────────────────────────────────────
function BendySprite({
  facingLeft, state, hpRatio, isMe,
}: { facingLeft: boolean; state: FighterState; hpRatio: number; isMe: boolean }) {
  const playerColor = isMe ? "#4F46E5" : "#DC2626";
  const angry = state === "attacking" || state === "charging";
  const stunned = state === "hit";
  const blocking = state === "blocking";
  const tired = !stunned && hpRatio < 0.3;
  return (
    <svg width="60" height="78" viewBox="0 0 60 78"
      style={{ transform: facingLeft ? "scaleX(-1)" : undefined, overflow: "visible", display: "block" }}>
      {/* Top hat */}
      <rect x="19" y="6" width="22" height="21" rx="3" fill="#0a0a0a"/>
      <rect x="14" y="25" width="32" height="4" rx="2" fill="#111"/>
      {/* Hat band */}
      <rect x="19" y="21" width="22" height="4" rx="1" fill="#1a1a1a"/>
      {/* Small devil horns */}
      <path d="M21,7 Q18,2 21,1" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"/>
      <path d="M39,7 Q42,2 39,1" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"/>
      {/* Head */}
      <circle cx="30" cy="41" r="14" fill="#111"/>
      {/* Pie-cut eyes */}
      {stunned ? (
        <>
          <line x1="22" y1="37" x2="28" y2="43" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="28" y1="37" x2="22" y2="43" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="32" y1="37" x2="38" y2="43" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="38" y1="37" x2="32" y2="43" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <text x="14" y="31" fontSize="8" fill="#FCD34D">★</text>
          <text x="40" y="30" fontSize="8" fill="#FCD34D">★</text>
        </>
      ) : blocking ? (
        <>
          <path d="M19,40 L25,38 L21,36 Z" fill="white" opacity="0.8"/>
          <path d="M41,40 L35,38 L39,36 Z" fill="white" opacity="0.8"/>
        </>
      ) : angry ? (
        <>
          <path d="M17,42 L26,39 L19,35 Z" fill="white"/>
          <path d="M43,42 L34,39 L41,35 Z" fill="white"/>
          <path d="M20,35 L17,42 L26,39 Z" fill="white" opacity="0.5"/>
          <path d="M40,35 L43,42 L34,39 Z" fill="white" opacity="0.5"/>
        </>
      ) : tired ? (
        <>
          <path d="M18,43 L26,41 L19,38 Z" fill="white" opacity="0.6"/>
          <path d="M42,43 L34,41 L41,38 Z" fill="white" opacity="0.6"/>
        </>
      ) : (
        <>
          <path d="M18,41 L26,38 L20,35 Z" fill="white"/>
          <path d="M42,41 L34,38 L40,35 Z" fill="white"/>
        </>
      )}
      {/* Bendy's smile */}
      {!stunned && <path d="M24,46 Q30,51 36,46" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/>}
      {/* Bowtie */}
      <polygon points="24,57 30,53 36,57 30,61" fill="#111" stroke="#2a2a2a" strokeWidth="0.8"/>
      <circle cx="30" cy="57" r="2" fill="#1a1a1a"/>
      {/* Body */}
      <ellipse cx="30" cy="70" rx="12" ry="9" fill="#111"/>
      {/* Ink drip */}
      <path d="M23,78 Q23,85 24,89" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
      <circle cx="24" cy="90" r="2.5" fill="#111" opacity="0.8"/>
      {/* Left arm - rubber hose */}
      <path d="M19,63 Q9,69 6,75" fill="none" stroke="#111" strokeWidth="7" strokeLinecap="round"/>
      <circle cx="6" cy="76" r="4.5" fill="#0d0d0d"/>
      {/* Right arm */}
      <path d={angry ? "M41,61 Q51,57 55,53" : "M41,63 Q51,63 55,67"}
        fill="none" stroke="#111" strokeWidth="7" strokeLinecap="round"/>
      <circle cx="55" cy={angry ? "53" : "67"} r="4.5" fill="#0d0d0d"/>
      {/* Ink splatter when attacking */}
      {angry && (
        <>
          <circle cx="55" cy="53" r="9" fill={playerColor} opacity="0.3"/>
          <circle cx="55" cy="53" r="15" fill={playerColor} opacity="0.12"/>
          <circle cx="68" cy="52" r="2.5" fill="#111" opacity="0.75"/>
          <circle cx="62" cy="40" r="2.5" fill="#111" opacity="0.75"/>
          <circle cx="70" cy="45" r="2" fill="#111" opacity="0.6"/>
          <circle cx="65" cy="59" r="2" fill="#111" opacity="0.6"/>
        </>
      )}
      {/* Shield */}
      {blocking && (
        <g>
          <path d="M44,57 L64,57 Q66,72 55,81 Q44,72 44,57 Z" fill="#111"/>
          <path d="M46,59 L62,59 Q64,72 55,79 Q46,72 46,59 Z" fill="none" stroke="#222" strokeWidth="1.5"/>
          <circle cx="55" cy="69" r="5" fill={playerColor} opacity="0.4"/>
        </g>
      )}
    </svg>
  );
}

// ─── Tanjiro Sprite ───────────────────────────────────────────────────────────
function TanjiroSprite({
  facingLeft, state, hpRatio, isMe,
}: { facingLeft: boolean; state: FighterState; hpRatio: number; isMe: boolean }) {
  const playerColor = isMe ? "#4F46E5" : "#DC2626";
  const skin = "#FFDAB9";
  const angry = state === "attacking" || state === "charging";
  const stunned = state === "hit";
  const blocking = state === "blocking";
  const tired = !stunned && hpRatio < 0.3;
  return (
    <svg width="60" height="78" viewBox="0 0 60 78"
      style={{ transform: facingLeft ? "scaleX(-1)" : undefined, overflow: "visible", display: "block" }}>
      {/* Hair - dark spiky */}
      <ellipse cx="30" cy="32" rx="13" ry="10" fill="#1a1a1a"/>
      <path d="M18,30 Q15,22 19,18" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round"/>
      <path d="M30,22 Q28,14 31,11" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M40,27 Q44,20 42,16" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Face */}
      <ellipse cx="30" cy="39" rx="12" ry="10" fill={skin}/>
      {/* Forehead scar */}
      <path d="M26,31 Q30,28 34,31" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
      {/* Eyes */}
      {stunned ? (
        <>
          <line x1="22" y1="36" x2="27" y2="41" stroke="#444" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="27" y1="36" x2="22" y2="41" stroke="#444" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="33" y1="36" x2="38" y2="41" stroke="#444" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="38" y1="36" x2="33" y2="41" stroke="#444" strokeWidth="2.5" strokeLinecap="round"/>
          <text x="14" y="28" fontSize="8" fill="#FCD34D">★</text>
          <text x="40" y="27" fontSize="8" fill="#FCD34D">★</text>
        </>
      ) : blocking ? (
        <>
          <path d="M22,39 Q25,36 28,39" fill="none" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M32,39 Q35,36 38,39" fill="none" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M21,35 L27,36" stroke="#333" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M33,36 L39,35" stroke="#333" strokeWidth="1.8" strokeLinecap="round"/>
        </>
      ) : angry ? (
        <>
          <circle cx="25" cy="39" r="3" fill="#8B0000"/>
          <circle cx="35" cy="39" r="3" fill="#8B0000"/>
          <circle cx="25.7" cy="38.3" r="1" fill="white" opacity="0.6"/>
          <circle cx="35.7" cy="38.3" r="1" fill="white" opacity="0.6"/>
          <path d="M21,35 L27,37" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
          <path d="M33,37 L39,35" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
          {/* Water breathing marks on cheeks */}
          <path d="M18,40 Q20,38 22,40" fill="none" stroke="#60A5FA" strokeWidth="1.2" opacity="0.8"/>
          <path d="M38,40 Q40,38 42,40" fill="none" stroke="#60A5FA" strokeWidth="1.2" opacity="0.8"/>
        </>
      ) : tired ? (
        <>
          <circle cx="25" cy="39" r="3" fill="#1a1a2e"/>
          <circle cx="35" cy="39" r="3" fill="#1a1a2e"/>
          <path d="M22,37 Q25,40 28,37" fill="rgba(190,160,140,0.6)"/>
          <path d="M32,37 Q35,40 38,37" fill="rgba(190,160,140,0.6)"/>
          <ellipse cx="41" cy="34" rx="2.5" ry="3.5" fill="#7DD3FC" opacity="0.8"/>
        </>
      ) : (
        <>
          <circle cx="25" cy="39" r="3" fill="#1a1a2e"/>
          <circle cx="35" cy="39" r="3" fill="#1a1a2e"/>
          <circle cx="25.7" cy="38.3" r="1" fill="white" opacity="0.8"/>
          <circle cx="35.7" cy="38.3" r="1" fill="white" opacity="0.8"/>
          <path d="M22,35 Q25,33.5 28,35" fill="none" stroke="#888" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M32,35 Q35,33.5 38,35" fill="none" stroke="#888" strokeWidth="1.3" strokeLinecap="round"/>
        </>
      )}
      {/* Mouth */}
      {!stunned && <path d="M26,45 Q30,48 34,45" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>}
      {/* Neck */}
      <rect x="26" y="48" width="8" height="5" rx="2" fill={skin}/>
      {/* Checkered haori - green base */}
      <path d="M15,52 Q13,68 16,78 Q30,82 44,78 Q47,68 45,52 Z" fill="#166534"/>
      {/* Checker lines */}
      <line x1="22" y1="52" x2="22" y2="78" stroke="#111" strokeWidth="2" opacity="0.6"/>
      <line x1="30" y1="52" x2="30" y2="78" stroke="#111" strokeWidth="2" opacity="0.6"/>
      <line x1="38" y1="52" x2="38" y2="78" stroke="#111" strokeWidth="2" opacity="0.6"/>
      <path d="M15,60 Q30,62 45,60" stroke="#111" strokeWidth="2" opacity="0.6" fill="none"/>
      <path d="M16,68 Q30,70 44,68" stroke="#111" strokeWidth="2" opacity="0.6" fill="none"/>
      {/* Black squares on alternating cells */}
      <rect x="15" y="52" width="7" height="8" fill="#111" opacity="0.45"/>
      <rect x="22" y="60" width="8" height="8" fill="#111" opacity="0.45"/>
      <rect x="30" y="52" width="8" height="8" fill="#111" opacity="0.45"/>
      <rect x="38" y="60" width="7" height="8" fill="#111" opacity="0.45"/>
      {/* Belt */}
      <path d="M17,62 Q30,64 43,62" fill="none" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Left arm */}
      <path d="M17,56 Q7,62 5,68" fill="none" stroke="#166534" strokeWidth="7" strokeLinecap="round"/>
      <circle cx="5" cy="69" r="5" fill={skin}/>
      {/* Right arm + Nichirin blade */}
      <path d={angry ? "M43,54 Q53,50 57,46" : "M43,56 Q53,56 57,60"}
        fill="none" stroke="#166534" strokeWidth="7" strokeLinecap="round"/>
      <circle cx="57" cy={angry ? "46" : "60"} r="5" fill={skin}/>
      {/* Nichirin blade */}
      <line x1="57" y1={angry ? "46" : "60"} x2={angry ? "65" : "63"} y2={angry ? "26" : "42"}
        stroke="#7F1D1D" strokeWidth="3" strokeLinecap="round"/>
      <line x1="57" y1={angry ? "46" : "60"} x2={angry ? "65" : "63"} y2={angry ? "26" : "42"}
        stroke="#FCA5A5" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      {/* Blade guard */}
      <line x1={angry ? "60" : "58"} y1={angry ? "36" : "51"} x2={angry ? "69" : "67"} y2={angry ? "36" : "51"}
        stroke="#78350F" strokeWidth="3" strokeLinecap="round"/>
      {/* Blade glow when attacking */}
      {angry && (
        <>
          <circle cx="65" cy="26" r="9" fill={playerColor} opacity="0.3"/>
          <circle cx="65" cy="26" r="15" fill={playerColor} opacity="0.12"/>
          {/* Water breathing water wisps */}
          <path d="M60,34 Q68,28 65,22" fill="none" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
          <path d="M62,30 Q70,26 68,20" fill="none" stroke="#BAE6FD" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
        </>
      )}
      {/* Shield */}
      {blocking && (
        <g>
          <path d="M44,53 L65,53 Q67,69 55,79 Q43,69 44,53 Z" fill="#166534"/>
          <path d="M46,55 L63,55 Q65,69 55,77 Q45,69 46,55 Z" fill="none" stroke="#15803D" strokeWidth="1.5"/>
          <circle cx="55" cy="66" r="5" fill={playerColor} opacity="0.5"/>
          <circle cx="55" cy="66" r="2.5" fill="white" opacity="0.4"/>
        </g>
      )}
    </svg>
  );
}

// ─── Fighter Sprite Router ────────────────────────────────────────────────────
export function FighterSprite({
  character = "mage",
  facingLeft,
  state,
  hpRatio,
  isMe,
}: {
  character?: CharacterType;
  facingLeft: boolean;
  state: FighterState;
  hpRatio: number;
  isMe: boolean;
}) {
  switch (character) {
    case "hollow_knight": return <HollowKnightSprite facingLeft={facingLeft} state={state} hpRatio={hpRatio} isMe={isMe}/>;
    case "hornet":        return <HornetSprite       facingLeft={facingLeft} state={state} hpRatio={hpRatio} isMe={isMe}/>;
    case "bendy":         return <BendySprite         facingLeft={facingLeft} state={state} hpRatio={hpRatio} isMe={isMe}/>;
    case "tanjiro":       return <TanjiroSprite       facingLeft={facingLeft} state={state} hpRatio={hpRatio} isMe={isMe}/>;
    default:              return <MageSprite           facingLeft={facingLeft} state={state} hpRatio={hpRatio} isMe={isMe}/>;
  }
}

// ─── Idle Bob Wrapper ─────────────────────────────────────────────────────────
function IdleWrapper({ children, paused }: { children: React.ReactNode; paused?: boolean }) {
  return (
    <motion.div
      // Return to y=0 when paused (attack/hit/block) so resume is smooth
      animate={paused ? { y: 0 } : { y: [0, -5, 0] }}
      transition={{ duration: 1.6, repeat: paused ? 0 : Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Projectile Effects ───────────────────────────────────────────────────────
function LightningBolt({ fromLeft }: { fromLeft: boolean }) {
  return (
    <motion.div
      // Full-width span so the bolt always reaches the opponent regardless of screen size
      className="absolute top-[38%] left-0 right-0 pointer-events-none z-20"
      style={{ transformOrigin: fromLeft ? "left center" : "right center" }}
      initial={{ scaleX: 0, opacity: 1 }}
      animate={{ scaleX: 1, opacity: [1, 1, 0] }}
      transition={{ duration: 0.4, ease: "easeOut", opacity: { times: [0, 0.7, 1] } }}
    >
      <svg
        width="100%"
        height="32"
        viewBox="0 0 400 32"
        preserveAspectRatio="none"
        style={{ transform: fromLeft ? "none" : "scaleX(-1)" }}
      >
        <defs>
          <filter id="lglow">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M0,16 L50,4 L90,16 L150,3 L210,16 L280,5 L340,16 L400,10"
          fill="none"
          stroke="#FACC15"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#lglow)"
        />
        <path
          d="M0,16 L50,4 L90,16 L150,3 L210,16 L280,5 L340,16 L400,10"
          fill="none"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}

function Fireball({ fromLeft }: { fromLeft: boolean }) {
  return (
    <motion.div
      className="absolute top-[32%] pointer-events-none z-20"
      // Start near the attacking fighter; use 64vw travel so it covers any screen width
      style={{
        left: fromLeft ? "18%" : "auto",
        right: fromLeft ? "auto" : "18%",
      }}
      initial={{ x: 0, scale: 0.5, opacity: 1 }}
      animate={{
        x: fromLeft ? "64vw" : "-64vw",
        scale: [0.5, 1.3, 0.9, 0],
        opacity: [1, 1, 1, 0],
      }}
      transition={{ duration: 0.48, ease: "easeOut" }}
    >
      <div className="relative w-11 h-11">
        <div
          className="absolute inset-0 rounded-full bg-orange-500"
          style={{ boxShadow: "0 0 14px 5px rgba(249,115,22,0.9), 0 0 28px rgba(251,191,36,0.5)" }}
        />
        <div className="absolute inset-1.5 rounded-full bg-yellow-300" />
        <div className="absolute inset-3 rounded-full bg-white" />
      </div>
    </motion.div>
  );
}

function PowerBeam({ fromLeft }: { fromLeft: boolean }) {
  return (
    <motion.div
      // Full-width beam, scales out from the attacking side
      className="absolute top-[28%] left-0 right-0 pointer-events-none z-20"
      style={{ transformOrigin: fromLeft ? "left center" : "right center" }}
      initial={{ scaleX: 0, opacity: 1 }}
      animate={{ scaleX: 1, opacity: [1, 1, 0] }}
      transition={{ duration: 0.42, ease: "easeOut", opacity: { times: [0, 0.75, 1] } }}
    >
      <div
        className="h-10 w-full rounded-full"
        style={{
          background: fromLeft
            ? "linear-gradient(90deg, rgba(167,139,250,0.95) 0%, rgba(139,92,246,0.9) 60%, rgba(221,214,254,0.8) 100%)"
            : "linear-gradient(90deg, rgba(221,214,254,0.8) 0%, rgba(139,92,246,0.9) 40%, rgba(167,139,250,0.95) 100%)",
          boxShadow: "0 0 22px rgba(139,92,246,0.8), 0 0 44px rgba(167,139,250,0.35)",
        }}
      />
    </motion.div>
  );
}

// ─── Impact Burst ─────────────────────────────────────────────────────────────
function ImpactBurst() {
  const shards = Array.from({ length: 12 }, (_, i) => ({
    angle: (i * 30 * Math.PI) / 180,
    len: 25 + (i % 3) * 14,
    color: ["#FCD34D", "#FB923C", "#F87171", "#FBBF24", "#FDE68A", "#FCA5A5"][i % 6],
  }));

  return (
    <div
      className="absolute pointer-events-none z-30"
      style={{ left: "50%", top: "42%", transform: "translate(-50%, -50%)" }}
    >
      {/* White flash */}
      <motion.div
        className="absolute rounded-full bg-white"
        style={{ width: 70, height: 70, left: -35, top: -35 }}
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 3.5, opacity: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      />
      {/* Shockwave ring */}
      <motion.div
        className="absolute rounded-full border-4 border-yellow-300"
        style={{ width: 24, height: 24, left: -12, top: -12 }}
        animate={{ scale: [1, 5], opacity: [0.9, 0] }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {/* Particle shards */}
      {shards.map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            background: s.color,
            left: -2.5,
            top: -2.5,
            boxShadow: `0 0 5px ${s.color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(s.angle) * s.len,
            y: Math.sin(s.angle) * s.len,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.04 }}
        />
      ))}
    </div>
  );
}

// ─── Shield Bubble ────────────────────────────────────────────────────────────
function ShieldBubble({ isMe }: { isMe: boolean }) {
  const color = isMe ? "rgba(99,102,241,0.7)" : "rgba(220,38,38,0.7)";
  const glow = isMe ? "rgba(99,102,241,0.5)" : "rgba(220,38,38,0.5)";
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-10"
      style={{ margin: "-8px" }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: [0, 0.9, 0.7, 0.9, 0.7], scale: [0.7, 1.05, 1] }}
      exit={{ opacity: 0, scale: 1.2 }}
      transition={{ duration: 0.4, opacity: { duration: 1.5, repeat: Infinity } }}
    >
      <div
        className="w-full h-full rounded-full"
        style={{
          border: `2px solid ${color}`,
          boxShadow: `0 0 18px ${glow}, inset 0 0 12px ${glow}`,
          background: `radial-gradient(circle, ${isMe ? "rgba(99,102,241,0.08)" : "rgba(220,38,38,0.08)"} 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}

// ─── Charge Aura ─────────────────────────────────────────────────────────────
function ChargeAura({ isMe, kind }: { isMe: boolean; kind: "light" | "heavy" }) {
  const color = isMe
    ? kind === "heavy" ? "rgba(139,92,246,0.7)" : "rgba(99,102,241,0.5)"
    : kind === "heavy" ? "rgba(239,68,68,0.7)" : "rgba(220,38,38,0.5)";

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-10"
      style={{ margin: kind === "heavy" ? "-12px" : "-6px" }}
      animate={{
        opacity: [0, 0.8, 0.4, 0.8],
        scale: [0.9, 1.05, 0.95, 1.05],
      }}
      transition={{ duration: kind === "heavy" ? 0.4 : 0.6, repeat: Infinity }}
    >
      <div
        className="w-full h-full rounded-full"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          boxShadow: `0 0 ${kind === "heavy" ? "28px" : "14px"} ${color}`,
        }}
      />
    </motion.div>
  );
}

// ─── Battle Stage ─────────────────────────────────────────────────────────────
interface BattleStageProps {
  phase: string;
  myAction: BattleActionType;
  opponentAction: BattleActionType;
  myHpRatio: number;
  opponentHpRatio: number;
  showingResolution: boolean;
  myCharacter?: CharacterType;
  opponentCharacter?: CharacterType;
}

function getChargeKind(action: BattleActionType): "light" | "heavy" | null {
  if (!action || action === "HOLD" || action === "FAILED_ATTACK") return null;
  if (action === "ATTACK_100" || action === "ACTIVE_ATTACK" || action === "COUNTER") return "heavy";
  return "light";
}

function getProjectile(action: BattleActionType, fromLeft: boolean): ProjectileKind {
  if (!action || action === "HOLD" || action === "FAILED_ATTACK") return null;
  if (action === "ATTACK_50" || action === "COUNTER") return "lightning";
  if (action === "ATTACK_80" || action === "ACTIVE_ATTACK") return "fireball";
  if (action === "ATTACK_100") return "beam";
  return "lightning";
}

export function BattleStage({
  phase,
  myAction,
  opponentAction,
  myHpRatio,
  opponentHpRatio,
  showingResolution,
  myCharacter = "mage",
  opponentCharacter = "mage",
}: BattleStageProps) {
  const [myState, setMyState] = useState<FighterState>("idle");
  const [oppState, setOppState] = useState<FighterState>("idle");
  const [myChargeKind, setMyChargeKind] = useState<"light" | "heavy" | null>(null);
  const [oppChargeKind, setOppChargeKind] = useState<"light" | "heavy" | null>(null);
  const [myX, setMyX] = useState(0);
  const [oppX, setOppX] = useState(0);
  const [myProjectile, setMyProjectile] = useState<ProjectileKind>(null);
  const [oppProjectile, setOppProjectile] = useState<ProjectileKind>(null);
  const [showImpact, setShowImpact] = useState(false);
  const [myShield, setMyShield] = useState(false);
  const [oppShield, setOppShield] = useState(false);
  const [myHitFlash, setMyHitFlash] = useState(false);
  const [oppHitFlash, setOppHitFlash] = useState(false);

  // ── Play battle animation sequence when overlay shows ────────────────────
  useEffect(() => {
    if (!showingResolution) {
      // Reset to idle when not showing resolution
      setMyState("idle");
      setOppState("idle");
      setMyChargeKind(null);
      setOppChargeKind(null);
      setMyX(0);
      setOppX(0);
      setMyProjectile(null);
      setOppProjectile(null);
      setShowImpact(false);
      setMyShield(false);
      setOppShield(false);
      setMyHitFlash(false);
      setOppHitFlash(false);
      return;
    }

    const myAttacking = myAction !== null && myAction !== "HOLD" && myAction !== "FAILED_ATTACK";
    const oppAttacking = opponentAction !== null && opponentAction !== "HOLD" && opponentAction !== "FAILED_ATTACK";

    let cancelled = false;

    const run = async () => {
      // Phase 1: Charge up (0–450ms)
      if (myAttacking) {
        setMyState("charging");
        setMyChargeKind(getChargeKind(myAction));
      } else {
        setMyState("blocking");
        setMyShield(true);
      }
      if (oppAttacking) {
        setOppState("charging");
        setOppChargeKind(getChargeKind(opponentAction));
      } else {
        setOppState("blocking");
        setOppShield(true);
      }

      await delay(450);
      if (cancelled) return;

      // Phase 2: Attack launch (450–850ms)
      if (myAttacking) {
        setMyState("attacking");
        setMyX(28);
        setMyChargeKind(null);
        setMyProjectile(getProjectile(myAction, true));
      }
      if (oppAttacking) {
        setOppState("attacking");
        setOppX(-28);
        setOppChargeKind(null);
        setOppProjectile(getProjectile(opponentAction, false));
      }

      await delay(380);
      if (cancelled) return;

      // Phase 3: Impact (850–1200ms)
      setMyProjectile(null);
      setOppProjectile(null);

      if (myAttacking && oppAttacking) {
        // Both attack — clash in middle
        setShowImpact(true);
        setMyX(-8);
        setOppX(8);
        setTimeout(() => setShowImpact(false), 550);
      } else if (myAttacking && !oppAttacking) {
        // I hit opponent
        setOppState("hit");
        setOppX(18);
        setOppHitFlash(true);
        setTimeout(() => setOppHitFlash(false), 350);
      } else if (!myAttacking && oppAttacking) {
        // Opponent hits me
        setMyState("hit");
        setMyX(-18);
        setMyHitFlash(true);
        setTimeout(() => setMyHitFlash(false), 350);
      }

      await delay(420);
      if (cancelled) return;

      // Phase 4: Settle (1270ms+)
      setMyState("idle");
      setOppState("idle");
      setMyX(0);
      setOppX(0);
      setMyShield(false);
      setOppShield(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [showingResolution, myAction, opponentAction]);

  // ── Show charge aura briefly when user picks an action ───────────────────
  useEffect(() => {
    if (!showingResolution && phase === "ACTING") {
      if (myAction) {
        const kind = getChargeKind(myAction);
        if (kind) {
          setMyChargeKind(kind);
          const t = setTimeout(() => setMyChargeKind(null), 800);
          return () => clearTimeout(t);
        }
      }
    }
  }, [myAction, phase, showingResolution]);

  return (
    <div className="relative w-full h-36 overflow-hidden rounded-xl my-1">
      {/* Arena background */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-900" />

      {/* Ambient glow pulse during resolution */}
      {showingResolution && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0, 0.35, 0] }}
          transition={{ duration: 0.6, times: [0, 0.3, 1] }}
          style={{
            background: "radial-gradient(ellipse at center, rgba(251,191,36,0.35) 0%, transparent 65%)",
          }}
        />
      )}

      {/* Ground */}
      <div
        className="absolute bottom-0 left-0 right-0 h-10"
        style={{
          background: "linear-gradient(to bottom, rgba(88,28,135,0.45) 0%, rgba(30,27,75,0.85) 100%)",
          borderTop: "1px solid rgba(139,92,246,0.35)",
        }}
      />
      {/* Ground grid perspective lines */}
      <div
        className="absolute bottom-0 left-0 right-0 h-10"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(139,92,246,0.12) 1px, transparent 1px)",
          backgroundSize: "26px 100%",
        }}
      />

      {/* Torches on each side */}
      {[0.12, 0.88].map((xPct, i) => (
        <div
          key={i}
          className="absolute bottom-10"
          style={{ left: `${xPct * 100}%`, transform: "translateX(-50%)" }}
        >
          <div className="w-2 h-8 bg-amber-900 rounded-sm mx-auto" />
          <motion.div
            className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-4 rounded-full"
            style={{
              background: "radial-gradient(circle, #FCD34D 0%, #F97316 60%, transparent 100%)",
            }}
            animate={{ scaleY: [1, 1.35, 0.85, 1.2, 1], scaleX: [1, 0.75, 1.15, 0.9, 1] }}
            transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      ))}

      {/* ── My Fighter (left) ── */}
      <motion.div
        className="absolute bottom-10 left-7"
        animate={{
          x: myX,
          filter: myHitFlash
            ? ["brightness(1)", "brightness(4)", "brightness(1.5)", "brightness(1)"]
            : "brightness(1)",
        }}
        transition={{
          x: { duration: 0.25, ease: "easeOut" },
          filter: { duration: 0.35 },
        }}
      >
        <div className="relative">
          {/* Charge aura */}
          <AnimatePresence>
            {myChargeKind && (
              <ChargeAura key="my-charge" isMe={true} kind={myChargeKind} />
            )}
          </AnimatePresence>
          {/* Shield bubble */}
          <AnimatePresence>
            {myShield && <ShieldBubble key="my-shield" isMe={true} />}
          </AnimatePresence>
          <IdleWrapper paused={myState !== "idle"}>
            <FighterSprite
              character={myCharacter}
              facingLeft={false}
              state={myState}
              hpRatio={myHpRatio}
              isMe={true}
            />
          </IdleWrapper>
        </div>
        <p className="text-center mt-0.5 text-[9px] text-indigo-300 font-bold tracking-wider">YOU</p>
      </motion.div>

      {/* ── Opponent Fighter (right) ── */}
      <motion.div
        className="absolute bottom-10 right-7"
        animate={{
          x: oppX,
          filter: oppHitFlash
            ? ["brightness(1)", "brightness(4)", "brightness(1.5)", "brightness(1)"]
            : "brightness(1)",
        }}
        transition={{
          x: { duration: 0.25, ease: "easeOut" },
          filter: { duration: 0.35 },
        }}
      >
        <div className="relative">
          <AnimatePresence>
            {oppChargeKind && (
              <ChargeAura key="opp-charge" isMe={false} kind={oppChargeKind} />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {oppShield && <ShieldBubble key="opp-shield" isMe={false} />}
          </AnimatePresence>
          <IdleWrapper paused={oppState !== "idle"}>
            <FighterSprite
              character={opponentCharacter}
              facingLeft={true}
              state={oppState}
              hpRatio={opponentHpRatio}
              isMe={false}
            />
          </IdleWrapper>
        </div>
        <p className="text-center mt-0.5 text-[9px] text-red-400 font-bold tracking-wider">RIVAL</p>
      </motion.div>

      {/* ── Projectile Effects ── */}
      <AnimatePresence>
        {myProjectile === "lightning" && <LightningBolt key="my-l" fromLeft={true} />}
        {myProjectile === "fireball" && <Fireball key="my-f" fromLeft={true} />}
        {myProjectile === "beam" && <PowerBeam key="my-b" fromLeft={true} />}
        {oppProjectile === "lightning" && <LightningBolt key="opp-l" fromLeft={false} />}
        {oppProjectile === "fireball" && <Fireball key="opp-f" fromLeft={false} />}
        {oppProjectile === "beam" && <PowerBeam key="opp-b" fromLeft={false} />}
      </AnimatePresence>

      {/* ── Impact Burst (on clash) ── */}
      <AnimatePresence>
        {showImpact && <ImpactBurst key="impact" />}
      </AnimatePresence>
    </div>
  );
}
