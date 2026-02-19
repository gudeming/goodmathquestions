"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CHARACTER_INFO, CharacterType, FighterSprite } from "./BattleStage";

const CHARACTERS = Object.keys(CHARACTER_INFO) as CharacterType[];

interface CharacterSelectScreenProps {
  onSelect: (character: CharacterType) => void;
}

export function CharacterSelectScreen({ onSelect }: CharacterSelectScreenProps) {
  const [selected, setSelected] = useState<CharacterType>("mage");

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-fun-pink">
          ⚔️ Choose Your Fighter!
        </h1>
        <p className="text-white/60 mt-2">Pick your champion for the math battle</p>
      </motion.div>

      {/* Character grid */}
      <div className="grid grid-cols-5 gap-3">
        {CHARACTERS.map((char, i) => {
          const info = CHARACTER_INFO[char];
          const isSelected = selected === char;
          return (
            <motion.button
              key={char}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setSelected(char)}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-colors ${
                isSelected
                  ? "border-orange-400 bg-orange-400/15 shadow-lg shadow-orange-500/20"
                  : "border-white/20 bg-white/5 hover:border-white/40"
              }`}
            >
              {/* Sprite preview */}
              <div className="flex items-center justify-center w-16 h-20 overflow-visible">
                <FighterSprite
                  character={char}
                  facingLeft={false}
                  state="idle"
                  hpRatio={1}
                  isMe={true}
                />
              </div>

              {/* Emoji badge */}
              <span className="text-xl leading-none">{info.emoji}</span>

              {/* Name */}
              <p className="text-white font-bold text-xs font-heading text-center leading-tight">
                {info.name}
              </p>

              {/* Selected checkmark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center"
                >
                  <span className="text-white text-[10px] font-bold">✓</span>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected character tagline */}
      <motion.div
        key={selected}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-white/70 text-sm italic">
          &ldquo;{CHARACTER_INFO[selected].tagline}&rdquo;
        </p>
      </motion.div>

      {/* Confirm button */}
      <motion.button
        onClick={() => onSelect(selected)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 bg-gradient-to-r from-orange-500 via-red-500 to-fun-pink text-white font-bold text-xl rounded-2xl font-heading shadow-xl"
      >
        Fight as {CHARACTER_INFO[selected].name}! {CHARACTER_INFO[selected].emoji}
      </motion.button>
    </div>
  );
}
