"use client";

import { useMemo, useRef, useState } from "react";
import { aliquotSum, classify, properDivisors, type DivisorBlocksConfig, type DivisorClass, type SceneProps } from "@gmq/animation-engine";
import { SceneButton, SceneFrame, SceneMessage, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const REVEAL_MS = 3400;
const MIN = 2;
const BLOCK_FILLS = ["fill-fun-yellow", "fill-fun-orange", "fill-fun-pink", "fill-fun-purple", "fill-fun-cyan", "fill-fun-green", "fill-primary-300"];
const CLASS_FILL: Record<DivisorClass, string> = { deficient: "fill-primary-200", perfect: "fill-fun-green", abundant: "fill-fun-orange" };

function classText(c: DivisorClass, locale: SceneLocale): string {
  return { deficient: tr(locale, "short", "不够"), perfect: tr(locale, "exactly equal!", "正好相等！"), abundant: tr(locale, "too tall", "超过了") }[c];
}

/** One number's bar next to its proper divisors stacked up. */
function Pair({ n, x, top, plotH, base, grow = 1, locale }: { n: number; x: number; top: number; plotH: number; base: number; grow?: number; locale: SceneLocale }) {
  const divs = properDivisors(n);
  const sum = aliquotSum(n);
  const c = classify(n);
  const u = (plotH / top) * grow;
  let y = base;
  return (
    <g>
      <rect x={x} y={base - n * u} width={34} height={n * u} rx={4} className="fill-primary-500" />
      <text x={x + 17} y={base - n * u - 4} textAnchor="middle" className="fill-gray-800 text-[11px] font-bold">{n}</text>
      {divs.map((d, i) => {
        const h = d * u;
        y -= h;
        return (
          <g key={d}>
            <rect x={x + 42} y={y} width={34} height={Math.max(0.5, h)} className={`${BLOCK_FILLS[i % BLOCK_FILLS.length]} stroke-white`} strokeWidth={1} />
            {h >= 10 && (
              <text x={x + 59} y={y + h / 2} dy="0.35em" textAnchor="middle" className="fill-gray-800 text-[9px] font-bold">{d}</text>
            )}
          </g>
        );
      })}
      <text x={x + 59} y={base - sum * u - 4} textAnchor="middle" className="fill-gray-800 text-[11px] font-bold">{sum}</text>
      <line x1={x - 4} x2={x + 80} y1={base - n * u} y2={base - n * u} className={c === "perfect" ? "stroke-green-600" : "stroke-gray-400"} strokeWidth={1.5} strokeDasharray="3 3" />
      <text x={x + 38} y={base + 13} textAnchor="middle" className={`text-[10px] font-bold ${c === "perfect" ? "fill-green-700" : c === "abundant" ? "fill-orange-600" : "fill-gray-500"}`}>
        {classText(c, locale)}
      </text>
    </g>
  );
}

/** D9: stack a number's proper divisors next to it: short, exactly equal, or too tall? */
export default function DivisorBlocksScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<DivisorBlocksConfig>) {
  const { max, highlight } = config;
  const events = useSceneEvents(onEvent);
  const [n, setN] = useState(12);
  const [visited, setVisited] = useState<number[]>([]);
  const proposed = useRef(false);
  const done = useRef(false);
  const top = useMemo(() => {
    let t = 1;
    for (let k = MIN; k <= max; k++) t = Math.max(t, k, aliquotSum(k));
    return t;
  }, [max]);

  const pick = (v: number) => {
    if (phase !== "explore") return;
    events.interact();
    const k = Math.max(MIN, Math.min(max, v));
    setN(k);
    const next = visited.includes(k) ? visited : [...visited, k];
    setVisited(next);
    const c = classify(k);
    events.state({ n: k, sum: aliquotSum(k), kind: c, visited: next.length });
    if (c === "perfect" && k !== highlight[0] && highlight.includes(k) && !proposed.current) {
      proposed.current = true;
      onProposeAnswer?.(String(k));
    }
    if (highlight.every((h) => next.includes(h)) && !done.current) {
      done.current = true;
      events.emit("completed", { moves: next.length });
    }
  };

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const shownN = phase === "hook" ? highlight[0] : n;
  const label = tr(locale, `Stack a number's divisors (not itself). Short, equal, or too tall? (2 to ${max})`, `把一个数的因数（不算自己）叠起来。不够、正好还是超过？（2 到 ${max}）`);
  const divs = properDivisors(shownN);

  const message = (() => {
    if (phase === "hook") return `6 = 1 + 2 + 3`;
    if (phase === "reveal")
      return progress > 0.6
        ? tr(locale, `${highlight.map((h) => `${h} = ${properDivisors(h).join(" + ")}`).join(";  ")}. Perfect numbers are rare: 6, 28, 496, 8128…`, `${highlight.map((h) => `${h} = ${properDivisors(h).join(" + ")}`).join("；")}。完全数非常少：6、28、496、8128……`)
        : tr(locale, "Which stacks match exactly?", "哪些正好一样高？");
    if (visited.length === 0) return tr(locale, "Slide to pick a number.", "拖动滑块选一个数。");
    return `${shownN}: ${divs.join(" + ")} = ${aliquotSum(shownN)} (${classText(classify(shownN), locale)})`;
  })();

  const H = 200;
  const base = H - 30;
  const plotH = base - 22;

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 300 ${H}`} role="img" aria-label={message} className="h-full w-full">
          <line x1={10} x2={290} y1={base} y2={base} className="stroke-gray-300" strokeWidth={1.5} />
          {phase === "reveal" ? (
            highlight.map((h, i) => <Pair key={h} n={h} x={20 + i * (260 / highlight.length)} top={top} plotH={plotH} base={base} grow={segment(progress, i * 0.2, i * 0.2 + 0.4)} locale={locale} />)
          ) : (
            <Pair n={shownN} x={40} top={top} plotH={plotH} base={base} locale={locale} />
          )}
          {phase !== "reveal" && (
            <g>
              <text x={150} y={20} className="fill-gray-500 text-[9px]">{tr(locale, "numbers you tried:", "试过的数：")}</text>
              {Array.from({ length: max - MIN + 1 }, (_, i) => {
                const k = i + MIN;
                const cols = 10;
                const seen = visited.includes(k);
                return (
                  <g key={k} transform={`translate(${150 + (i % cols) * 14},${26 + Math.floor(i / cols) * 14})`}>
                    <rect width={12} height={12} rx={2} className={seen ? CLASS_FILL[classify(k)] : "fill-gray-100"} />
                    <text x={6} y={6} dy="0.35em" textAnchor="middle" className="fill-gray-700 text-[6px]">{k}</text>
                  </g>
                );
              })}
              <g transform={`translate(150,${30 + Math.ceil((max - MIN + 1) / 10) * 14})`} className="text-[8px]">
                {(["deficient", "perfect", "abundant"] as const).map((c, i) => (
                  <g key={c} transform={`translate(${i * 48},0)`}>
                    <rect width={8} height={8} rx={2} className={CLASS_FILL[c]} />
                    <text x={11} y={7} className="fill-gray-500">{{ deficient: tr(locale, "short", "不够"), perfect: tr(locale, "equal", "正好"), abundant: tr(locale, "too tall", "超过") }[c]}</text>
                  </g>
                ))}
              </g>
            </g>
          )}
        </svg>
      </div>
      <SceneMessage>{message}</SceneMessage>
      {phase === "explore" && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          <SceneButton onClick={() => pick(n - 1)} variant="ghost" disabled={n <= MIN} ariaLabel={tr(locale, "One less", "减一")}>
            −
          </SceneButton>
          <input type="range" min={MIN} max={max} value={n} onChange={(e) => pick(Number(e.target.value))} aria-label={tr(locale, "Pick a number", "选一个数")} aria-valuetext={`${n}`} className="h-11 w-32 accent-fun-purple sm:w-48" />
          <SceneButton onClick={() => pick(n + 1)} variant="ghost" disabled={n >= max} ariaLabel={tr(locale, "One more", "加一")}>
            +
          </SceneButton>
          <span className="min-w-[2.5rem] text-center text-lg font-bold tabular-nums text-gray-800">{n}</span>
        </div>
      )}
    </SceneFrame>
  );
}
