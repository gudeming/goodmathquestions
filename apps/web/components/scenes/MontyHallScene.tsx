"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  EMPTY_MONTY_STATS,
  addMontyRound,
  hostOpens,
  montyOdds,
  mulberry32,
  randomInt,
  simulateMonty,
  type MontyHallConfig,
  type MontyStats,
  type MontyStrategy,
  type Rng,
  type SceneProps,
} from "@gmq/animation-engine";
import { Histogram, SceneButton, SceneFrame, SceneMessage, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

type Stage = "pick" | "decide" | "result";
interface Round {
  prize: number;
  pick: number;
  opened: Set<number>;
  offered: number;
  final?: number;
  strategy?: MontyStrategy;
}

const AUTO_ROUNDS = 100;
const REVEAL_SIM_ROUNDS = 300;
const REVEAL_MS = 2600;

function doorLayout(doors: number) {
  const cols = doors <= 5 ? doors : Math.min(20, Math.ceil(doors / Math.ceil(doors / 20)));
  const rows = Math.ceil(doors / cols);
  const W = 360;
  const gap = doors <= 5 ? 14 : 4;
  const w = (W - gap * (cols + 1)) / cols;
  const h = doors <= 5 ? Math.min(150, w * 1.5) : Math.min(40, w * 1.6);
  return { cols, rows, W, H: rows * (h + gap) + gap, w, h, gap };
}

const pct = (wins: number, games: number) => (games === 0 ? 0 : wins / games);
const pctLabel = (wins: number, games: number) => (games === 0 ? "–" : `${Math.round((wins / games) * 100)}%`);

/** C2: pick a door, the host opens empty ones, switch or stay; the scoreboard tells the truth. */
export default function MontyHallScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<MontyHallConfig>) {
  const { doors, rounds } = config;
  const events = useSceneEvents(onEvent);
  const rngRef = useRef<Rng | null>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [round, setRound] = useState<Round | null>(null);
  const [stats, setStats] = useState<MontyStats>(EMPTY_MONTY_STATS);
  const [manual, setManual] = useState(0);
  const completedRef = useRef(false);
  const layout = useMemo(() => doorLayout(doors), [doors]);

  // Lazily seeded so server and client render the same first frame.
  const rng = () => (rngRef.current ??= mulberry32(config.seed ?? (Date.now() >>> 0)));

  const pick = (d: number) => {
    if (phase !== "explore") return;
    events.interact();
    if (stage === "pick") {
      const prize = randomInt(rng(), 0, doors - 1);
      const { opened, offered } = hostOpens(doors, prize, d, rng());
      setRound({ prize, pick: d, opened: new Set(opened), offered });
      setStage("decide");
    } else if (stage === "decide" && round && !round.opened.has(d)) {
      decide(d === round.pick ? "stay" : "switch");
    }
  };

  const decide = (strategy: MontyStrategy) => {
    if (!round) return;
    const final = strategy === "switch" ? round.offered : round.pick;
    const win = final === round.prize;
    const next = addMontyRound(stats, strategy, win);
    setRound({ ...round, final, strategy });
    setStats(next);
    setStage("result");
    const played = manual + 1;
    setManual(played);
    events.state({ ...next });
    if (played >= rounds && !completedRef.current) {
      completedRef.current = true;
      events.emit("completed", { moves: played, ...next });
    }
  };

  const autoPlay = (strategy: MontyStrategy) => {
    events.interact();
    const next = simulateMonty(doors, AUTO_ROUNDS, strategy, randomInt(rng(), 1, 2 ** 31 - 1), stats);
    setStats(next);
    events.state({ ...next });
  };

  const nextRound = () => {
    setRound(null);
    setStage("pick");
  };

  // Reveal: if the child hasn't played enough, simulate so both bars mean something.
  const revealStats = useMemo(() => {
    if (phase !== "reveal") return stats;
    const seed = config.seed ?? 3;
    let s = stats;
    if (s.switchGames < 30) s = simulateMonty(doors, REVEAL_SIM_ROUNDS, "switch", seed + 1, s);
    if (s.stayGames < 30) s = simulateMonty(doors, REVEAL_SIM_ROUNDS, "stay", seed + 2, s);
    return s;
  }, [phase, stats, doors, config.seed]);

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const label = tr(locale, `${doors} doors, one prize`, `${doors} 扇门，一个大奖`);
  const odds = montyOdds(doors);
  const shownStats = phase === "reveal" ? revealStats : phase === "hook" ? EMPTY_MONTY_STATS : stats;
  const shownRound = phase === "hook" ? null : round;
  const grow = phase === "reveal" ? segment(progress, 0, 0.6) : 1;

  const bars = [
    { key: "switch", label: tr(locale, "switch", "换"), value: pct(shownStats.switchWins, shownStats.switchGames) * grow, caption: pctLabel(shownStats.switchWins, shownStats.switchGames), fillClass: "fill-fun-green" },
    { key: "stay", label: tr(locale, "stay", "不换"), value: pct(shownStats.stayWins, shownStats.stayGames) * grow, caption: pctLabel(shownStats.stayWins, shownStats.stayGames), fillClass: "fill-fun-orange" },
  ];
  const refs =
    phase === "reveal" && progress > 0.5
      ? [
          { value: odds.stay, label: doors === 3 ? "1/3" : `1/${doors}` },
          { value: odds.switch, label: doors === 3 ? "2/3" : `${doors - 1}/${doors}` },
        ]
      : [];

  const message = (() => {
    if (phase === "hook") return tr(locale, "Switch or stay?", "换还是不换？");
    if (phase === "reveal")
      return tr(
        locale,
        `Your first pick is wrong ${doors - 1} times out of ${doors}. The host clears away the wrong doors, so switching catches that ${doors - 1}/${doors}.`,
        `你一开始选错的概率是 ${doors - 1}/${doors}。主持人替你排除了错的门，换过去就接住了这 ${doors - 1}/${doors}。`,
      );
    if (stage === "pick") return tr(locale, "Pick a door.", "选一扇门。");
    if (stage === "decide") return tr(locale, `The host opened ${doors - 2} empty door${doors - 2 === 1 ? "" : "s"}. Switch or stay?`, `主持人打开了 ${doors - 2} 扇空门。换还是不换？`);
    const won = round?.final === round?.prize;
    return round?.strategy === "switch"
      ? tr(locale, won ? "You switched and won!" : "You switched… and lost this time.", won ? "你换了，赢了！" : "你换了……这次没中。")
      : tr(locale, won ? "You stayed and won!" : "You stayed… and lost this time.", won ? "你没换，赢了！" : "你没换……这次没中。");
  })();

  const onDoorKey = (e: KeyboardEvent<SVGGElement>, d: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "ArrowDown" ? layout.cols : e.key === "ArrowUp" ? -layout.cols : 0;
    if (delta) {
      e.preventDefault();
      const target = (e.currentTarget.ownerSVGElement ?? e.currentTarget.parentElement)?.querySelector<SVGGElement>(`[data-door="${(d + delta + doors) % doors}"]`);
      target?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(d);
    }
  };

  const interactive = phase === "explore";

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="min-h-0 min-w-0 flex-1">
          {phase === "reveal" ? (
            <FirstPickDiagram locale={locale} progress={progress} doors={doors} />
          ) : (
            <svg viewBox={`0 0 ${layout.W} ${layout.H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label={label} className="h-full w-full">
              {Array.from({ length: doors }, (_, d) => {
                const x = layout.gap + (d % layout.cols) * (layout.w + layout.gap);
                const y = layout.gap + Math.floor(d / layout.cols) * (layout.h + layout.gap);
                const open = shownRound !== null && (shownRound.opened.has(d) || stage === "result");
                const isPrize = shownRound?.prize === d;
                const chosen = shownRound?.final ?? shownRound?.pick;
                const big = doors <= 5;
                return (
                  <g
                    key={d}
                    data-door={d}
                    role={interactive ? "button" : undefined}
                    tabIndex={interactive ? 0 : -1}
                    aria-label={tr(locale, `Door ${d + 1}${open ? (isPrize ? ", prize" : ", empty") : ""}`, `${d + 1} 号门${open ? (isPrize ? "，大奖" : "，空的") : ""}`)}
                    className={`outline-none [&:focus-visible>rect.door]:stroke-fun-yellow ${interactive ? "cursor-pointer" : ""}`}
                    onClick={() => pick(d)}
                    onKeyDown={(e) => onDoorKey(e, d)}
                  >
                    <motion.rect
                      className={`door ${open ? (isPrize ? "fill-fun-yellow/40" : "fill-gray-100") : "fill-fun-purple"}`}
                      x={x}
                      y={y}
                      width={layout.w}
                      height={layout.h}
                      rx={big ? 12 : 3}
                      strokeWidth={big ? 5 : 2}
                      stroke={chosen === d ? "#2563eb" : "transparent"}
                      animate={{ opacity: open && !isPrize ? 0.6 : 1 }}
                      transition={{ duration: reducedMotion ? 0.2 : 0.4 }}
                    />
                    <text x={x + layout.w / 2} y={y + layout.h / 2} textAnchor="middle" dy="0.35em" className={big ? "text-[28px]" : "text-[10px]"} style={{ pointerEvents: "none" }}>
                      {open ? (isPrize ? "🎁" : big ? "🐐" : "·") : big ? <tspan className="fill-white font-bold">{d + 1}</tspan> : ""}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
        <div className="flex w-24 shrink-0 flex-col items-center sm:w-32">
          <div className="min-h-0 w-full flex-1">
            <Histogram bars={bars} refs={refs} label={tr(locale, "Win rate: switch vs stay", "胜率：换 vs 不换")} />
          </div>
          <p className="text-center text-[10px] tabular-nums text-gray-500 sm:text-xs">
            {tr(locale, "switch", "换")} {shownStats.switchWins}/{shownStats.switchGames} · {tr(locale, "stay", "不换")} {shownStats.stayWins}/{shownStats.stayGames}
          </p>
        </div>
      </div>
      <SceneMessage>{message}</SceneMessage>
      {interactive && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {stage === "decide" && (
            <>
              <SceneButton onClick={() => decide("switch")}>{tr(locale, "Switch", "换")}</SceneButton>
              <SceneButton onClick={() => decide("stay")} variant="ghost">
                {tr(locale, "Stay", "不换")}
              </SceneButton>
            </>
          )}
          {stage === "result" && <SceneButton onClick={nextRound}>{tr(locale, "Next round", "下一局")}</SceneButton>}
          <SceneButton onClick={() => autoPlay("switch")} variant="ghost">
            {tr(locale, `Auto ${AUTO_ROUNDS} (always switch)`, `自动玩 ${AUTO_ROUNDS} 局（一直换）`)}
          </SceneButton>
          <SceneButton onClick={() => autoPlay("stay")} variant="ghost">
            {tr(locale, `Auto ${AUTO_ROUNDS} (always stay)`, `自动玩 ${AUTO_ROUNDS} 局（一直不换）`)}
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

/** Reveal diagram: three first picks, two of them wrong, and switching rescues both. */
function FirstPickDiagram({ locale, progress, doors }: { locale: SceneLocale; progress: number; doors: number }) {
  const t = segment(progress, 0.3, 0.9);
  const cases = [
    { prizeHere: true, en: "Right first time: switching loses", zh: "一开始就选对：换会输" },
    { prizeHere: false, en: "Wrong first: switching wins", zh: "一开始选错：换就赢" },
    { prizeHere: false, en: "Wrong first: switching wins", zh: "一开始选错：换就赢" },
  ];
  return (
    <svg viewBox="0 0 360 200" role="img" aria-label={tr(locale, `Your first pick is wrong ${doors - 1} out of ${doors} times`, `一开始选错的概率是 ${doors - 1}/${doors}`)} className="h-full w-full">
      {cases.map((c, i) => (
        <g key={i} transform={`translate(${12 + i * 116},16)`} opacity={0.25 + 0.75 * Math.min(1, t * 3 - i)}>
          <rect width={104} height={120} rx={12} className={c.prizeHere ? "fill-fun-orange/30" : "fill-fun-green/30"} />
          <text x={52} y={52} textAnchor="middle" className="text-[34px]">
            {c.prizeHere ? "🎁" : "🐐"}
          </text>
          <text x={52} y={92} textAnchor="middle" className="fill-gray-700 text-[11px] font-bold">
            {tr(locale, "your pick", "你的选择")}
          </text>
          <foreignObject x={0} y={126} width={104} height={50}>
            <p className="text-center text-[10px] leading-tight text-gray-600">{tr(locale, c.en, c.zh)}</p>
          </foreignObject>
        </g>
      ))}
    </svg>
  );
}
