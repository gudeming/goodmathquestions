"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { areAdjacent, cellColour, colourBalance, dominoTiling, rcKey, type CellRC, type DominoTilingConfig, type SceneProps } from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const B = 200;
const REVEAL_MS = 4500;
const ARROWS: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

type Placed = readonly [CellRC, CellRC];

/** B10: cover the board with 1 × 2 dominoes — or find out why you can't. */
export default function DominoTilingScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<DominoTilingConfig>) {
  const { size } = config;
  const cell = B / size;
  const events = useSceneEvents(onEvent);
  const removed = useMemo(() => new Set(config.removed.map(([r, c]) => rcKey(r, c))), [config.removed]);
  const tiling = useMemo(() => dominoTiling(config), [config]);
  const balance = useMemo(() => colourBalance(config), [config]);
  const [dominoes, setDominoes] = useState<Placed[]>([]);
  const [selected, setSelected] = useState<CellRC | null>(null);
  const [focus, setFocus] = useState<CellRC>([0, 0]);
  const [note, setNote] = useState("");
  const keyFocus = useRef(false);
  const dragFrom = useRef<CellRC | null>(null);
  const suppressClick = useRef(false);
  const completedRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const explore = phase === "explore";

  const coveredBy = useMemo(() => {
    const m = new Map<string, number>();
    dominoes.forEach(([a, b], i) => {
      m.set(rcKey(a[0], a[1]), i);
      m.set(rcKey(b[0], b[1]), i);
    });
    return m;
  }, [dominoes]);
  const isFree = (r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size && !removed.has(rcKey(r, c)) && !coveredBy.has(rcKey(r, c));

  const free = useMemo(() => {
    const out: CellRC[] = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!removed.has(rcKey(r, c)) && !coveredBy.has(rcKey(r, c))) out.push([r, c]);
    return out;
  }, [size, removed, coveredBy]);
  const freeBlack = free.filter(([r, c]) => cellColour(r, c) === "black").length;
  const freeWhite = free.length - freeBlack;
  const stuck = free.length > 0 && !free.some(([r, c]) => isFree(r, c + 1) || isFree(r + 1, c));
  const done = free.length === 0;

  useEffect(() => {
    if (!keyFocus.current) return;
    keyFocus.current = false;
    svgRef.current?.querySelector<SVGElement>(`[data-cell="${focus[0]},${focus[1]}"]`)?.focus();
  }, [focus]);

  const placeDomino = (a: CellRC, b: CellRC) => {
    const next = [...dominoes, [a, b] as Placed];
    setDominoes(next);
    setSelected(null);
    setNote("");
    const left = free.length - 2;
    events.state({ dominoes: next.length, uncovered: left });
    if (left === 0 && !completedRef.current) {
      completedRef.current = true;
      events.emit("completed", { moves: next.length });
    }
  };

  const activate = (r: number, c: number) => {
    if (!explore || removed.has(rcKey(r, c)) || suppressClick.current) return;
    events.interact();
    const d = coveredBy.get(rcKey(r, c));
    if (d !== undefined) {
      const next = dominoes.filter((_, i) => i !== d);
      setDominoes(next);
      setSelected(null);
      events.state({ dominoes: next.length, uncovered: free.length + 2 });
      return;
    }
    if (!selected) return setSelected([r, c]);
    if (selected[0] === r && selected[1] === c) return setSelected(null);
    if (areAdjacent(selected, [r, c])) return placeDomino(selected, [r, c]);
    setSelected([r, c]);
    setNote(tr(locale, "A domino covers two squares side by side. Tap a neighbour.", "一块骨牌盖住相邻的两格。点旁边的一格。"));
  };

  const cellAt = (e: PointerEvent<SVGSVGElement>): CellRC | null => {
    const m = e.currentTarget.getScreenCTM?.();
    if (!m) return null;
    const pt = e.currentTarget.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(m.inverse());
    const r = Math.floor(p.y / cell);
    const c = Math.floor(p.x / cell);
    return r >= 0 && c >= 0 && r < size && c < size ? [r, c] : null;
  };
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!explore) return;
    const at = cellAt(e);
    dragFrom.current = at && isFree(at[0], at[1]) ? at : null;
  };
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    const to = cellAt(e);
    if (!from || !to || (from[0] === to[0] && from[1] === to[1])) return;
    if (areAdjacent(from, to) && isFree(to[0], to[1])) {
      events.interact();
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      placeDomino(from, to);
    }
  };

  const onCellKey = (e: KeyboardEvent<SVGRectElement>, r: number, c: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(r, c);
      return;
    }
    const d = ARROWS[e.key];
    if (!d) return;
    e.preventDefault();
    keyFocus.current = true;
    setFocus([Math.max(0, Math.min(size - 1, r + d[0])), Math.max(0, Math.min(size - 1, c + d[1]))]);
  };

  const reset = () => {
    setDominoes([]);
    setSelected(null);
    setNote("");
    completedRef.current = false;
  };

  // Reveal: lay out a real tiling if one exists; otherwise the colour argument.
  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const shownDominoes: readonly Placed[] =
    phase === "reveal" ? (tiling ? tiling.slice(0, Math.round(segment(progress, 0.05, 0.85) * tiling.length)) : []) : phase === "hook" ? [] : dominoes;
  const removedColour = config.removed.length ? cellColour(config.removed[0][0], config.removed[0][1]) : null;
  const pulse = phase === "reveal" && !tiling && !reducedMotion ? 0.5 + 0.5 * Math.abs(Math.sin(progress * Math.PI * 5)) : 1;
  const nDominoes = Math.floor((balance.black + balance.white) / 2);

  const label = tr(locale, `Cover the ${size} × ${size} board with dominoes`, `用骨牌铺满 ${size} × ${size} 棋盘`);
  const colourName = (c: "black" | "white") => (c === "black" ? tr(locale, "dark", "深色") : tr(locale, "light", "浅色"));
  const msg = (() => {
    const total = balance.black + balance.white;
    if (phase === "hook") return tr(locale, `${total} squares, ${nDominoes} dominoes. Can they cover it exactly?`, `${total} 格，${nDominoes} 块骨牌。能正好铺满吗？`);
    if (phase === "reveal") {
      if (tiling) return tr(locale, `${balance.black} dark and ${balance.white} light squares: equal, and here is a tiling.`, `深色 ${balance.black} 格、浅色 ${balance.white} 格，一样多，而且真的铺得出来。`);
      if (balance.black !== balance.white) {
        const fewer = Math.min(balance.black, balance.white);
        const few = balance.black < balance.white ? "black" : "white";
        return tr(
          locale,
          `Every domino covers one dark + one light square, so ${nDominoes} dominoes cover ${nDominoes} of each — but there are only ${fewer} ${colourName(few)} squares. Impossible!`,
          `每块骨牌盖一格深色 + 一格浅色，${nDominoes} 块就要各 ${nDominoes} 格——可${colourName(few)}只有 ${fewer} 格。不可能！`,
        );
      }
      return tr(locale, "The colours balance, but the squares that are left can't be paired up side by side.", "颜色数量一样，但剩下的格子没法两两相邻配对。");
    }
    if (done) return tr(locale, `Covered with ${dominoes.length} dominoes!`, `用 ${dominoes.length} 块骨牌铺满了！`);
    if (stuck) {
      const same = freeBlack === 0 || freeWhite === 0;
      const col = colourName(freeBlack ? "black" : "white");
      return same
        ? tr(locale, `Stuck: ${free.length} squares left — all ${col}. Can a domino cover two ${col} squares?`, `卡住了：剩下 ${free.length} 格，全是${col}。一块骨牌能盖住两格${col}吗？`)
        : tr(locale, `Stuck: ${free.length} squares left, none side by side. Lift a domino and try again.`, `卡住了：剩下 ${free.length} 格，没有两格相邻。拿掉一块再试。`);
    }
    if (note) return note;
    return selected ? tr(locale, "Now tap a square next to it.", "再点旁边的一格。") : tr(locale, "Tap two neighbouring squares (or drag) to lay a domino. Tap a domino to lift it.", "点两个相邻的格子（或拖动）放一块骨牌。点骨牌可以拿掉。");
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="min-h-0 min-w-0 flex-1">
          <svg
            ref={svgRef}
            viewBox={`-2 -2 ${B + 4} ${B + 4}`}
            role="group"
            aria-label={label}
            className={`h-full w-full ${explore ? "touch-none" : ""}`}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            {Array.from({ length: size * size }, (_, i) => {
              const r = Math.floor(i / size);
              const c = i % size;
              const gone = removed.has(rcKey(r, c));
              const black = cellColour(r, c) === "black";
              const sel = selected?.[0] === r && selected?.[1] === c;
              const lit = phase === "reveal" && !tiling && black === (removedColour === "black");
              if (gone)
                return (
                  <g key={i} opacity={phase === "reveal" ? pulse : 1}>
                    <rect x={c * cell + 1} y={r * cell + 1} width={cell - 2} height={cell - 2} rx={3} fill="none" className={phase === "reveal" ? "stroke-fun-red" : "stroke-gray-300"} strokeWidth={phase === "reveal" ? 2.5 : 1.5} strokeDasharray="3 3" />
                    <text x={(c + 0.5) * cell} y={(r + 0.5) * cell} textAnchor="middle" dy="0.35em" className="fill-gray-400" style={{ fontSize: cell * 0.45 }}>
                      ✂
                    </text>
                  </g>
                );
              return (
                <rect
                  key={i}
                  data-cell={`${r},${c}`}
                  x={c * cell}
                  y={r * cell}
                  width={cell}
                  height={cell}
                  className={`outline-none ${black ? "fill-slate-500" : "fill-amber-50"} ${sel ? "stroke-fun-yellow" : lit ? "stroke-fun-pink" : "stroke-slate-300"} focus-visible:stroke-fun-yellow ${explore ? "cursor-pointer" : ""}`}
                  strokeWidth={sel ? 3 : lit ? 2 * pulse : 0.5}
                  role={explore ? "button" : undefined}
                  tabIndex={explore ? (focus[0] === r && focus[1] === c ? 0 : -1) : -1}
                  aria-label={tr(locale, `Row ${r + 1}, column ${c + 1}, ${black ? "dark" : "light"}${coveredBy.has(rcKey(r, c)) ? ", covered" : ""}`, `第 ${r + 1} 行第 ${c + 1} 列，${black ? "深色" : "浅色"}${coveredBy.has(rcKey(r, c)) ? "，已盖住" : ""}`)}
                  onClick={() => activate(r, c)}
                  onFocus={() => setFocus([r, c])}
                  onKeyDown={(e) => onCellKey(e, r, c)}
                />
              );
            })}
            {shownDominoes.map(([a, b], i) => {
              const x = Math.min(a[1], b[1]) * cell + 3;
              const y = Math.min(a[0], b[0]) * cell + 3;
              const wide = a[0] === b[0];
              return (
                <g key={i} style={{ pointerEvents: "none" }}>
                  <rect x={x} y={y} width={(wide ? 2 : 1) * cell - 6} height={(wide ? 1 : 2) * cell - 6} rx={cell * 0.18} className="fill-fun-orange stroke-white" strokeWidth={1.5} />
                  <line x1={wide ? x + cell - 3 : x + 4} x2={wide ? x + cell - 3 : x + cell - 10} y1={wide ? y + 4 : y + cell - 3} y2={wide ? y + cell - 10 : y + cell - 3} className="stroke-white/80" strokeWidth={1} />
                </g>
              );
            })}
          </svg>
        </div>
        <ColourBars locale={locale} black={phase === "explore" ? freeBlack : balance.black} white={phase === "explore" ? freeWhite : balance.white} grow={phase === "reveal" ? segment(progress, 0.25, 0.7) : 1} />
      </div>
      <SceneMessage>{msg}</SceneMessage>
      {explore && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Counter label={tr(locale, "dominoes", "骨牌")} value={dominoes.length} tone={done ? "green" : "primary"} />
          <SceneButton onClick={reset} variant={stuck ? "accent" : "ghost"} disabled={dominoes.length === 0}>
            {tr(locale, "Clear", "清空")}
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

/** Uncovered (explore) or total (reveal) dark vs light squares. */
function ColourBars({ locale, black, white, grow }: { locale: SceneLocale; black: number; white: number; grow: number }) {
  const max = Math.max(1, black, white);
  const bar = (n: number, cls: string, name: string) => (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs font-bold tabular-nums">{n}</span>
      <div className="flex h-24 w-5 items-end rounded bg-gray-100 sm:h-36">
        <div className={`w-full rounded ${cls}`} style={{ height: `${(n / max) * 100 * grow}%`, transition: "height 250ms" }} />
      </div>
      <span className="text-[10px] text-gray-500">{name}</span>
    </div>
  );
  return (
    <div className="flex shrink-0 items-end gap-2 self-center" aria-label={tr(locale, `${black} dark, ${white} light squares`, `深色 ${black} 格，浅色 ${white} 格`)} role="img">
      {bar(black, "bg-slate-500", tr(locale, "dark", "深"))}
      {bar(white, "bg-amber-200", tr(locale, "light", "浅"))}
    </div>
  );
}
