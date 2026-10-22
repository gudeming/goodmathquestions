"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { degrees, eulerPath, hasEulerPath, oddDegreeNodes, openEdgesAt, otherEnd, type BridgesTraceConfig, type SceneProps } from "@gmq/animation-engine";
import { Counter, Dot, SceneButton, SceneFrame, SceneMessage, bi, tr } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 200;
const H = 130;
const X = (x: number) => 12 + x * 1.76;
const Y = (y: number) => 10 + y * 1.1;
const REVEAL_MS = 4000;

/** River Pregel behind the Königsberg layout (node coordinates as in KONIGSBERG). */
function KonigsbergArt() {
  return (
    <g aria-hidden>
      <rect x={0} y={0} width={W} height={H} className="fill-green-100" />
      <path d={`M0 ${Y(30)} C ${X(30)} ${Y(26)}, ${X(60)} ${Y(34)}, ${X(70)} ${Y(30)} L ${W} ${Y(24)} L ${W} ${Y(76)} L ${X(70)} ${Y(70)} C ${X(60)} ${Y(66)}, ${X(30)} ${Y(74)}, 0 ${Y(70)} Z`} className="fill-primary-200" />
      <ellipse cx={X(38)} cy={Y(50)} rx={34} ry={13} className="fill-green-200 stroke-green-300" />
      <ellipse cx={X(84)} cy={Y(50)} rx={20} ry={17} className="fill-green-200 stroke-green-300" />
    </g>
  );
}

/** B7 (and any one-stroke puzzle): walk every bridge exactly once. */
export default function BridgesTraceScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<BridgesTraceConfig>) {
  const events = useSceneEvents(onEvent);
  const deg = useMemo(() => degrees(config), [config]);
  const odd = useMemo(() => oddDegreeNodes(config), [config]);
  const solvable = useMemo(() => hasEulerPath(config), [config]);
  const solution = useMemo(() => eulerPath(config), [config]);
  const [at, setAt] = useState<string | null>(null);
  const [walk, setWalk] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [showDeg, setShowDeg] = useState(false);
  const [note, setNote] = useState("");
  const [won, setWon] = useState(false);

  const node = (id: string) => config.nodes.find((n) => n.id === id)!;
  const name = (id: string) => {
    const n = node(id);
    return n.label ? bi(locale, n.label) : id.toUpperCase();
  };
  const used = new Set(walk);
  const explore = phase === "explore";
  const stuck = explore && at !== null && walk.length > 0 && walk.length < config.edges.length && openEdgesAt(config, at, used).length === 0;

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const revealWalk = phase === "reveal" && solution ? solution.edges.slice(0, Math.round(segment(progress, 0.1, 0.8) * solution.edges.length)) : [];

  const tapNode = (id: string) => {
    if (!explore) return;
    events.interact();
    if (walk.length === 0) {
      setAt(id);
      setNote(tr(locale, `Starting on ${name(id)}. Tap a bridge to cross it.`, `从${name(id)}出发。点一座桥走过去。`));
    } else setNote(tr(locale, "Walk by tapping a bridge next to you.", "点你身边的桥走过去。"));
  };

  const tapEdge = (i: number) => {
    if (!explore || won) return;
    events.interact();
    if (at === null) return setNote(tr(locale, "First tap a piece of land to start from.", "先点一块陆地作为起点。"));
    if (used.has(i)) return setNote(tr(locale, "You already crossed that bridge.", "这座桥已经走过了。"));
    if (!openEdgesAt(config, at, used).includes(i)) return setNote(tr(locale, "That bridge doesn't touch where you are.", "这座桥不在你身边。"));
    const next = [...walk, i];
    const to = otherEnd(config, i, at);
    setWalk(next);
    setAt(to);
    setNote("");
    events.state({ crossed: next.length, total: config.edges.length, at: to, attempts });
    if (next.length === config.edges.length) {
      setWon(true);
      events.emit("completed", { moves: next.length, attempts: attempts + 1 });
    }
  };

  const retry = () => {
    if (walk.length > 0) setAttempts((a) => a + 1);
    setWalk([]);
    setAt(null);
    setWon(false);
    setNote(tr(locale, "Pick a new starting place.", "换个地方出发。"));
  };
  const undo = () => {
    if (walk.length === 0 || at === null) return;
    const last = walk[walk.length - 1];
    setAt(otherEnd(config, last, at));
    setWalk(walk.slice(0, -1));
    setWon(false);
    setNote("");
  };

  // Parallel edges bow apart so each bridge is its own target.
  const paths = useMemo(() => {
    const byId = new Map(config.nodes.map((n) => [n.id, n]));
    const groups = new Map<string, number[]>();
    config.edges.forEach(([a, b], i) => {
      const k = [a, b].sort().join("|");
      groups.set(k, [...(groups.get(k) ?? []), i]);
    });
    return config.edges.map(([a, b], i) => {
      const k = [a, b].sort().join("|");
      const g = groups.get(k)!;
      const [p, q] = [a, b].sort().map((id) => byId.get(id)!);
      const off = (g.indexOf(i) - (g.length - 1) / 2) * 26;
      const [x1, y1, x2, y2] = [X(p.x), Y(p.y), X(q.x), Y(q.y)];
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const cx = (x1 + x2) / 2 + (-(y2 - y1) / len) * off;
      const cy = (y1 + y2) / 2 + ((x2 - x1) / len) * off;
      return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
    });
  }, [config]);

  const label = tr(locale, `Walk every bridge exactly once (${config.edges.length} bridges)`, `每座桥正好走一次（共 ${config.edges.length} 座桥）`);
  const oddNames = odd.map(name).join(locale === "zh" ? "、" : ", ");
  const message = (() => {
    if (phase === "hook") return tr(locale, "Can you cross every bridge exactly once?", "能不能每座桥正好走一次？");
    if (phase === "reveal") {
      if (progress < 0.1) return tr(locale, "Count the bridges at each piece of land…", "数一数每块陆地连着几座桥……");
      return solvable
        ? tr(locale, `Only ${odd.length} land${odd.length === 1 ? "" : "s"} with an odd count${odd.length ? ` (${oddNames})` : ""}: start${odd.length ? " at one, finish at the other" : " anywhere and come back"}.`, `奇数座桥的陆地只有 ${odd.length} 块${odd.length ? `（${oddNames}）` : ""}：${odd.length ? "从一块出发，到另一块结束" : "从哪出发都能走回来"}。`)
        : tr(locale, `${odd.length} lands have an odd number of bridges. Walking through a land uses 2 bridges (in + out), so an odd land must be the start or the end. A walk has only 2 ends: impossible!`, `有 ${odd.length} 块陆地连着奇数座桥。经过一块陆地要用掉 2 座桥（进 + 出），所以奇数的陆地只能是起点或终点。一条路只有 2 个端点：不可能！`);
    }
    if (won) return tr(locale, `You did it in ${walk.length} crossings!`, `成功！走了 ${walk.length} 座桥！`);
    if (stuck) return tr(locale, `Stuck! ${config.edges.length - walk.length} bridge${config.edges.length - walk.length === 1 ? "" : "s"} never crossed.`, `走不通了！还有 ${config.edges.length - walk.length} 座桥没走过。`);
    return note || tr(locale, "Tap a piece of land to start, then tap bridges to walk.", "先点一块陆地出发，再点桥走过去。");
  })();

  const onEdgeKey = (i: number) => (e: KeyboardEvent<SVGPathElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tapEdge(i);
    }
  };
  const showDegrees = showDeg || phase === "reveal";
  const pulse = phase === "reveal" && !reducedMotion ? 0.55 + 0.45 * Math.abs(Math.sin(progress * Math.PI * 6)) : 1;

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={label} className="h-full w-full">
          {config.layout === "konigsberg" && <KonigsbergArt />}
          {paths.map((d, i) => {
            const crossed = used.has(i) || revealWalk.includes(i);
            const open = explore && at !== null && !used.has(i) && openEdgesAt(config, at, used).includes(i);
            return (
              <g key={i}>
                <path d={d} fill="none" className={crossed ? (phase === "reveal" ? "stroke-fun-green" : "stroke-gray-400") : open ? "stroke-amber-500" : "stroke-amber-800"} strokeWidth={6} strokeLinecap="round" strokeDasharray={crossed && phase !== "reveal" ? "3 4" : undefined} />
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={24}
                  role={explore ? "button" : undefined}
                  tabIndex={explore ? 0 : -1}
                  aria-label={tr(locale, `Bridge ${i + 1}: ${name(config.edges[i][0])} to ${name(config.edges[i][1])}${used.has(i) ? " (crossed)" : ""}`, `第 ${i + 1} 座桥：${name(config.edges[i][0])} — ${name(config.edges[i][1])}${used.has(i) ? "（已走过）" : ""}`)}
                  className={`outline-none focus-visible:stroke-fun-yellow/60 ${explore ? "cursor-pointer" : ""}`}
                  onClick={() => tapEdge(i)}
                  onKeyDown={onEdgeKey(i)}
                />
              </g>
            );
          })}
          {config.nodes.map((n) => {
            const isOdd = deg[n.id] % 2 === 1;
            const red = phase === "reveal" && isOdd;
            return (
              <g key={n.id} opacity={red ? pulse : 1}>
                <Dot
                  x={X(n.x)}
                  y={Y(n.y)}
                  r={9}
                  label={showDegrees ? String(deg[n.id]) : ""}
                  ariaLabel={`${name(n.id)}${showDegrees ? tr(locale, `: ${deg[n.id]} bridges`, `：${deg[n.id]} 座桥`) : ""}`}
                  fillClass={red ? "fill-fun-red" : at === n.id ? "fill-fun-pink" : "fill-primary-500"}
                  selected={at === n.id && explore}
                  interactive={explore}
                  onActivate={() => tapNode(n.id)}
                />
                {n.label && (
                  <text x={X(n.x)} y={Y(n.y) + 18} textAnchor="middle" className="fill-gray-600 text-[7px]" style={{ pointerEvents: "none" }}>
                    {bi(locale, n.label)}
                  </text>
                )}
                {at === n.id && explore && (
                  <text x={X(n.x) + 10} y={Y(n.y) - 8} className="text-[11px]" style={{ pointerEvents: "none" }}>
                    🚶
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <SceneMessage>{message}</SceneMessage>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
        <Counter label={tr(locale, "bridges", "桥")} value={`${phase === "reveal" ? revealWalk.length : walk.length}/${config.edges.length}`} />
        {explore && (
          <>
            <Counter label={tr(locale, "tries", "尝试")} value={attempts + (walk.length > 0 ? 1 : 0)} tone="pink" />
            <SceneButton onClick={undo} variant="ghost" disabled={walk.length === 0}>
              {tr(locale, "Undo", "撤销")}
            </SceneButton>
            <SceneButton onClick={retry} variant={stuck ? "accent" : "ghost"} disabled={walk.length === 0 && at === null}>
              {tr(locale, "Try again", "再试一次")}
            </SceneButton>
            <SceneButton onClick={() => setShowDeg((s) => !s)} variant={showDeg ? "primary" : "ghost"} ariaPressed={showDeg}>
              {tr(locale, "Count the bridges", "数每块地的桥")}
            </SceneButton>
          </>
        )}
      </div>
    </SceneFrame>
  );
}
