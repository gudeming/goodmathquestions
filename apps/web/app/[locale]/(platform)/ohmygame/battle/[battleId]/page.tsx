"use client";

import { useRouter, useParams } from "next/navigation";
import { BattleArena } from "@/components/battle/BattleArena";

export default function BattlePage() {
  const router = useRouter();
  const params = useParams();
  const battleId = params?.battleId as string;
  const locale = (params?.locale as string) ?? "en";

  function handlePlayAgain() {
    router.push(`/${locale !== "en" ? locale + "/" : ""}ohmygame`);
  }

  if (!battleId) return null;

  return <BattleArena battleId={battleId} onPlayAgain={handlePlayAgain} />;
}
