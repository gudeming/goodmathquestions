"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { handshakes, pairKey, type HandshakeGraphConfig, type SceneProps } from "@gmq/animation-engine";
import { Counter, Dot, Edge, SceneButton, SceneFrame, SceneMessage, SceneSvg, bi, tr } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 400;
const H = 300;
const CX = W / 2;
const CY = H / 2;
const RADIUS = 112;
const AVATAR_FILLS = ["fill-fun-pink", "fill-fun-purple", "fill-fun-cyan", "fill-fun-green", "fill-fun-yellow", "fill-primary-500", "fill-fun-orange"];
const PER_PERSON_MS = 520;
const HALVE_MS = 1600;

/** A8: n people on a circle; tap two people to shake hands. */
export default function HandshakeGraphScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<HandshakeGraphConfig>) {
  const n = config.people;
  const total = handshakes(n);
  const events = useSceneEvents(onEvent);
  const [edges, setEdges] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const completedRef = useRef(false);
  const moves = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const nodes = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        return { x: CX + RADIUS * Math.cos(a), y: CY + RADIUS * Math.sin(a) };
      }),
    [n],
  );
  const names = (i: number) => (config.names ? bi(locale, config.names[i]) : String(i + 1));
  const shortName = (i: number) => names(i).slice(0, 3);
  const edgeSet = useMemo(() => new Set(edges), [edges]);

  const commit = (next: string[]) => {
    setEdges(next);
    events.state({ handshakes: next.length, total });
    if (next.length === total && !completedRef.current) {
      completedRef.current = true;
      events.emit("completed", { moves: moves.current });
      onProposeAnswer?.(String(total));
      setMessage(tr(locale, `Everyone shook everyone's hand: ${total} handshakes.`, `每两个人都握过手了：一共 ${total} 次。`));
    }
  };

  const activate = (i: number) => {
    if (phase !== "explore") return;
    events.interact();
    if (selected === null) {
      setSelected(i);
      setMessage(tr(locale, `${names(i)} is ready. Who shakes hands with ${names(i)}?`, `${names(i)} 准备好了，和谁握手？`));
      return;
    }
    if (selected === i) {
      setSelected(null);
      setMessage("");
      return;
    }
    setSelected(null);
    moves.current++;
    const key = pairKey(selected, i);
    if (edgeSet.has(key)) {
      setMessage(tr(locale, `${names(selected)} and ${names(i)} already shook hands!`, `${names(selected)} 和 ${names(i)} 已经握过手了！`));
      return;
    }
    setMessage(tr(locale, `${names(selected)} 🤝 ${names(i)}`, `${names(selected)} 🤝 ${names(i)}`));
    commit([...edges, key]);
  };

  const firstShakesAll = () => {
    events.interact();
    moves.current++;
    const next = [...edges];
    for (let j = 1; j < n; j++) {
      const key = pairKey(0, j);
      if (!edgeSet.has(key)) next.push(key);
    }
    setSelected(null);
    setMessage(tr(locale, `${names(0)} shook ${n - 1} hands.`, `${names(0)} 握了 ${n - 1} 次手。`));
    commit(next);
  };

  const reset = () => {
    setEdges([]);
    setSelected(null);
    setMessage("");
    completedRef.current = false;
  };

  const onNodeKey = (e: KeyboardEvent<SVGGElement>, i: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    svgRef.current?.querySelector<SVGGElement>(`[data-key="p${(i + delta + n) % n}"]`)?.focus();
  };

  const revealMs = n * PER_PERSON_MS + HALVE_MS;
  const progress = useRevealProgress(phase === "reveal", revealMs, reducedMotion, () => events.emit("reveal_done"));
  const label = tr(locale, `${n} friends at a party`, `派对上的 ${n} 个朋友`);
  const coords = (key: string) => {
    const [a, b] = key.split("-").map(Number);
    return { a, b, x1: nodes[a].x, y1: nodes[a].y, x2: nodes[b].x, y2: nodes[b].y };
  };

  if (phase === "reveal") {
    const personPhase = (n * PER_PERSON_MS) / revealMs;
    const current = progress >= personPhase ? n : Math.floor((progress / personPhase) * n);
    const counted = Math.min(n, current) * (n - 1);
    const halved = segment(progress, personPhase, 1) > 0.4;
    const all: string[] = [];
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) all.push(pairKey(a, b));
    return (
      <SceneFrame label={label}>
        <div className="flex min-h-0 flex-1 items-center gap-2">
          <motion.div className="h-full min-w-0 flex-1" initial={reducedMotion ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <SceneSvg viewBox={`0 0 ${W} ${H}`} label={label}>
              {all.map((key) => {
                const { a, b, x1, y1, x2, y2 } = coords(key);
                // Each line is counted once from each end: after both ends have had their turn it is "double".
                const times = (a < current ? 1 : 0) + (b < current ? 1 : 0);
                const lit = a === current || b === current;
                const cls = halved ? "stroke-fun-green" : lit ? "stroke-fun-pink" : times === 2 ? "stroke-fun-purple" : times === 1 ? "stroke-fun-cyan" : "stroke-gray-200";
                return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} className={cls} strokeWidth={halved ? 2.5 : lit ? 3 : 1.5 + times * 1.5} strokeLinecap="round" />;
              })}
              {nodes.map((p, i) => (
                <Dot key={i} x={p.x} y={p.y} label={shortName(i)} ariaLabel={names(i)} fillClass={i === current ? "fill-fun-pink" : AVATAR_FILLS[i % AVATAR_FILLS.length]} interactive={false} />
              ))}
            </SceneSvg>
          </motion.div>
          <div className="flex w-28 shrink-0 flex-col items-center gap-2 text-center sm:w-36">
            <Counter label={tr(locale, "counted", "数了")} value={halved ? total * 2 : counted} tone="pink" />
            <p className="text-xs text-gray-500">{tr(locale, `Each person shakes ${n - 1} hands.`, `每人握 ${n - 1} 次手。`)}</p>
            {halved && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-base font-bold text-gray-800 sm:text-lg">
                {n} × {n - 1} ÷ 2 = <span className="text-fun-green">{total}</span>
              </motion.p>
            )}
          </div>
        </div>
        <SceneMessage>
          {halved
            ? tr(locale, "Every handshake was counted twice, once by each person. Halve it.", "每次握手被两个人各数了一遍，所以要除以 2。")
            : tr(locale, "Counting each person's handshakes…", "一个一个人数握手……")}
        </SceneMessage>
      </SceneFrame>
    );
  }

  const posterEdges = phase === "hook" ? [...new Set([pairKey(0, Math.floor(n / 2)), pairKey(1, n - 1), pairKey(0, 1)])] : edges;
  const interactive = phase === "explore";

  return (
    <SceneFrame label={label} inert={!interactive}>
      <div className="min-h-0 flex-1">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={label} preserveAspectRatio="xMidYMid meet" className="h-full w-full">
          {posterEdges.map((key) => {
            const { x1, y1, x2, y2 } = coords(key);
            return <Edge key={key} x1={x1} y1={y1} x2={x2} y2={y2} reducedMotion={reducedMotion} />;
          })}
          {nodes.map((p, i) => (
            <Dot
              key={i}
              dataKey={`p${i}`}
              x={p.x}
              y={p.y}
              label={shortName(i)}
              ariaLabel={tr(locale, `Person ${names(i)}`, `${names(i)} 号`)}
              fillClass={AVATAR_FILLS[i % AVATAR_FILLS.length]}
              selected={selected === i}
              interactive={interactive}
              onActivate={() => activate(i)}
              onKeyDown={(e) => onNodeKey(e, i)}
            />
          ))}
          {phase === "hook" && (
            <text x={CX} y={CY} textAnchor="middle" dy="0.35em" className="fill-fun-purple text-[48px] font-bold">
              ?
            </text>
          )}
        </svg>
      </div>
      {interactive && (
        <>
          <SceneMessage>{message || tr(locale, "Tap two people to make them shake hands.", "点两个人，让他们握手。")}</SceneMessage>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Counter label={tr(locale, "handshakes", "握手")} value={edges.length} tone={edges.length === total ? "green" : "primary"} />
            <SceneButton onClick={firstShakesAll}>{tr(locale, `${names(0)} shakes everyone's hand`, `让 ${names(0)} 和所有人握手`)}</SceneButton>
            <SceneButton onClick={reset} variant="ghost" disabled={edges.length === 0}>
              {tr(locale, "Reset", "重来")}
            </SceneButton>
          </div>
        </>
      )}
    </SceneFrame>
  );
}
