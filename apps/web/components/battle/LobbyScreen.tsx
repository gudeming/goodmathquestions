"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { WaitingScreen } from "./WaitingScreen";
import { CharacterSelectScreen } from "./CharacterSelectScreen";
import { CHARACTER_INFO, CharacterType } from "./BattleStage";

const STORAGE_KEY = "ohmygame_character";

const PLAYER_COUNT_OPTIONS = [
  { count: 2, label: "1v1", emoji: "⚔️", desc: "Classic duel" },
  { count: 3, label: "3 Players", emoji: "🔥", desc: "Triple threat" },
  { count: 4, label: "4 Players", emoji: "💥", desc: "Squad battle" },
  { count: 6, label: "6 Players", emoji: "🌪️", desc: "All-out war" },
];

export function LobbyScreen() {
  const t = useTranslations("battle");
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";

  const [inviteCode, setInviteCode] = useState("");
  const [mode, setMode] = useState<"idle" | "waiting">("idle");
  const [waitingBattleId, setWaitingBattleId] = useState<string | null>(null);
  const [waitingInviteCode, setWaitingInviteCode] = useState<string | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [myCharacter, setMyCharacter] = useState<CharacterType | null>(null);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as CharacterType | null;
    if (saved && saved in CHARACTER_INFO) {
      setMyCharacter(saved);
    } else {
      setShowCharacterSelect(true);
    }
  }, []);

  const { data: me, refetch: refetchMe } = trpc.user.me.useQuery();
  const { data: history, refetch: refetchHistory } = trpc.battle.getHistory.useQuery({ limit: 5 });

  // Auto-cancel stale WAITING battle
  const autoCancel = trpc.battle.cancelWaiting.useMutation({
    onSuccess() {
      void refetchMe();
      void refetchHistory();
    },
  });
  useEffect(() => {
    if (!history) return;
    const stale = history.items.find((item) => item.status === "WAITING");
    if (stale) {
      autoCancel.mutate({ battleId: stale.battleId });
    }
  }, [history]); // eslint-disable-line react-hooks/exhaustive-deps

  const createMutation = trpc.battle.create.useMutation({
    onSuccess(data) {
      setCreateError(null);
      if (data.status === "ACTIVE") {
        router.push(`/${locale !== "en" ? locale + "/" : ""}ohmygame/battle/${data.battleId}`);
      } else {
        setWaitingBattleId(data.battleId);
        setWaitingInviteCode(data.inviteCode);
        setMode("waiting");
      }
    },
    onError(err) {
      setCreateError(err.message);
    },
  });

  const joinMutation = trpc.battle.join.useMutation({
    onSuccess(data) {
      if (data.status === "ACTIVE") {
        router.push(`/${locale !== "en" ? locale + "/" : ""}ohmygame/battle/${data.battleId}`);
      } else {
        // Still waiting for more players
        setWaitingBattleId(data.battleId);
        setWaitingInviteCode(null);
        setMode("waiting");
      }
    },
  });

  const hasEnoughXp = (me?.xp ?? 0) >= 1000;

  const handleCharacterSelect = (character: CharacterType) => {
    setMyCharacter(character);
    localStorage.setItem(STORAGE_KEY, character);
    setShowCharacterSelect(false);
  };

  // Derived prize info
  const startingHP = maxPlayers * 1000;
  const entryFee = 1000;
  const winnerBonus = maxPlayers * 1000;

  if (showCharacterSelect) {
    return <CharacterSelectScreen onSelect={handleCharacterSelect} />;
  }

  if (mode === "waiting" && waitingBattleId) {
    return (
      <WaitingScreen
        battleId={waitingBattleId}
        inviteCode={waitingInviteCode}
        maxPlayers={maxPlayers}
        onCancelled={() => {
          setMode("idle");
          setWaitingBattleId(null);
          setWaitingInviteCode(null);
        }}
        onMatchFound={(battleId) =>
          router.push(
            `/${locale !== "en" ? locale + "/" : ""}ohmygame/battle/${battleId}`
          )
        }
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-fun-pink">
          ⚔️ OhMyGame
        </h1>
        <p className="text-white/60 mt-2">{t("subtitle")}</p>
        {myCharacter && (
          <button
            onClick={() => setShowCharacterSelect(true)}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-sm text-white/80 font-heading transition-colors"
          >
            <span className="text-base">{CHARACTER_INFO[myCharacter].emoji}</span>
            <span>{CHARACTER_INFO[myCharacter].name}</span>
            <span className="text-white/40 text-xs">Change</span>
          </button>
        )}
      </motion.div>

      {/* User XP banner */}
      {me && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 border border-white/20 rounded-2xl p-4 flex items-center justify-between"
        >
          <div>
            <p className="text-white/60 text-sm">Your XP Balance</p>
            <p className="text-yellow-400 font-bold text-2xl font-heading">
              {me.xp.toLocaleString()} XP
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-sm">Battles Won</p>
            <p className="text-white font-bold text-xl">{me.battlesWon ?? 0}</p>
          </div>
          <div className="text-5xl">🏆</div>
        </motion.div>
      )}

      {/* Player count selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white/8 border border-white/15 rounded-2xl p-4 space-y-3"
      >
        <h3 className="text-white/70 font-heading text-sm uppercase tracking-wider text-center">
          ⚙️ Battle Size
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {PLAYER_COUNT_OPTIONS.map((opt) => (
            <motion.button
              key={opt.count}
              onClick={() => setMaxPlayers(opt.count)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className={`py-3 rounded-xl border font-heading text-center transition-all ${
                maxPlayers === opt.count
                  ? "bg-gradient-to-b from-orange-500 to-red-600 border-orange-400 text-white shadow-lg"
                  : "bg-white/5 border-white/15 text-white/60 hover:bg-white/10"
              }`}
            >
              <p className="text-xl">{opt.emoji}</p>
              <p className="text-xs font-bold mt-1">{opt.label}</p>
              <p className="text-[10px] opacity-60 mt-0.5">{opt.desc}</p>
            </motion.button>
          ))}
        </div>

        {/* Battle stats for chosen player count */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-[10px] text-white/40 font-heading uppercase">Starting HP</p>
            <p className="text-green-400 font-bold text-sm font-heading">
              {startingHP.toLocaleString()}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-[10px] text-white/40 font-heading uppercase">Entry Fee</p>
            <p className="text-yellow-400 font-bold text-sm font-heading">
              {entryFee.toLocaleString()} XP
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-[10px] text-white/40 font-heading uppercase">Winner Bonus</p>
            <p className="text-purple-400 font-bold text-sm font-heading">
              +{winnerBonus.toLocaleString()} XP
            </p>
          </div>
        </div>

        <p className="text-center text-white/30 text-[11px] font-heading">
          Kill an opponent → earn their 1,000 XP entry fee!
        </p>
      </motion.div>

      {/* Error banner */}
      {createError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/15 border border-red-500/40 rounded-2xl p-4 text-center"
        >
          <p className="text-red-400 font-heading text-sm">⚠️ {createError}</p>
        </motion.div>
      )}

      {/* Insufficient XP warning */}
      {!hasEnoughXp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-center"
        >
          <p className="text-red-400 text-sm">{t("notEnoughXp")}</p>
        </motion.div>
      )}

      {/* Actions */}
      <div className="grid gap-4">
        {/* Random Match */}
        <motion.button
          onClick={() => {
            setCreateError(null);
            createMutation.mutate({ mode: "RANDOM", maxPlayers });
          }}
          disabled={!hasEnoughXp || createMutation.isPending}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-5 bg-gradient-to-r from-orange-500 via-red-500 to-fun-pink text-white font-bold text-xl rounded-2xl font-heading shadow-xl disabled:opacity-40"
        >
          {createMutation.isPending
            ? maxPlayers === 2
              ? "Finding opponent..."
              : `Waiting for ${maxPlayers} players...`
            : maxPlayers === 2
            ? t("randomMatch")
            : `🔥 Find ${maxPlayers}-Player Battle`}
        </motion.button>

        {/* Invite a friend */}
        <div className="bg-white/10 border border-white/20 rounded-2xl p-5 space-y-3">
          <h3 className="text-white font-heading font-bold">{t("challengeFriend")}</h3>
          <motion.button
            onClick={() => {
              setCreateError(null);
              createMutation.mutate({ mode: "INVITE", maxPlayers });
            }}
            disabled={!hasEnoughXp || createMutation.isPending}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-fun-purple text-white font-bold rounded-xl font-heading disabled:opacity-40"
          >
            {maxPlayers === 2
              ? "Create Invite Link"
              : `Create ${maxPlayers}-Player Lobby`}
          </motion.button>

          {/* Join with code */}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder={t("enterCode")}
              maxLength={10}
              className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-400 font-heading uppercase tracking-widest"
            />
            <motion.button
              onClick={() => joinMutation.mutate({ inviteCode })}
              disabled={!inviteCode.trim() || !hasEnoughXp || joinMutation.isPending}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-3 bg-white/20 text-white font-bold rounded-xl font-heading disabled:opacity-40 hover:bg-white/30"
            >
              {joinMutation.isPending ? "..." : t("joinBattle")}
            </motion.button>
          </div>
          {joinMutation.error && (
            <p className="text-red-400 text-sm">{joinMutation.error.message}</p>
          )}
        </div>
      </div>

      {/* Battle History */}
      {history && history.items.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h3 className="text-white/60 font-heading uppercase text-sm tracking-wider">
            {t("history")}
          </h3>
          {history.items.map((item) => (
            <div
              key={item.battleId}
              className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.isWinner ? "🏆" : "💪"}</span>
                <div>
                  <p className="text-white font-bold text-sm">vs {item.opponentName}</p>
                  <p className="text-white/40 text-xs">
                    {item.rounds} rounds
                    {(item.maxPlayers ?? 2) > 2 && ` · ${item.maxPlayers}P`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-bold font-heading ${
                    item.isWinner ? "text-yellow-400" : "text-red-400"
                  }`}
                >
                  {item.isWinner ? "+" : ""}
                  {item.xpChange?.toLocaleString()} XP
                </p>
                <p className="text-white/40 text-xs">
                  {item.isWinner ? "Victory" : "Defeat"}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
