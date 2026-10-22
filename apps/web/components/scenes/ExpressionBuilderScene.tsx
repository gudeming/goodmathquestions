"use client";

import { useMemo, useRef, useState } from "react";
// Deep import: only the parser ships to the client (same as the EXPRESSION answer box), so the
// live value here is exactly what the server's validator computes.
import { evaluateExpression, sameMultiset, type ExprErrorCode, type ExprOp } from "@gmq/math-engine/src/expr";
import { tilesToExpression, type ExprTile, type ExpressionBuilderConfig, type SceneProps } from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const TOLERANCE = 1e-9;
const REVEAL_MS = 4500;
const OP_TILES: Array<{ op: Exclude<ExprOp, "concat">; label: string; aria: [string, string] }> = [
  { op: "+", label: "+", aria: ["plus", "加"] },
  { op: "-", label: "−", aria: ["minus", "减"] },
  { op: "*", label: "×", aria: ["times", "乘"] },
  { op: "/", label: "÷", aria: ["divided by", "除以"] },
  { op: "^", label: "^", aria: ["to the power", "乘方"] },
  { op: "!", label: "!", aria: ["factorial", "阶乘"] },
  { op: "sqrt", label: "√", aria: ["square root", "开平方"] },
];

const ERRORS: Record<ExprErrorCode, [string, string]> = {
  empty: ["Tap the tiles to build an expression.", "点下面的方块拼一个算式。"],
  too_long: ["That's too long.", "算式太长了。"],
  invalid_token: ["Something here isn't a number or an operation.", "这里有不是数字或运算的东西。"],
  syntax: ["Not finished yet: check the brackets and operations.", "还没写完：检查一下括号和运算符。"],
  too_deep: ["Too many brackets inside brackets.", "括号套得太多了。"],
  division_by_zero: ["Dividing by zero isn't allowed.", "不能除以 0。"],
  domain: ["No square root of a negative number here.", "负数不能开平方。"],
  factorial_range: ["! only works on whole numbers up to 12.", "! 只能用在 0 到 12 的整数上。"],
  out_of_range: ["That number is too big.", "这个数太大了。"],
};

const fmt = (v: number, locale: SceneLocale) => (Number.isInteger(v) ? formatNumber(v, locale) : formatNumber(Math.round(v * 1e6) / 1e6, locale));

/** F5: four 4s (or any numbers) and a target. The value is live, from the server's own evaluator. */
export default function ExpressionBuilderScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<ExpressionBuilderConfig>) {
  const { allowedNumbers, target, allowedOps } = config;
  const events = useSceneEvents(onEvent);
  const concat = allowedOps.includes("concat");
  const [tiles, setTiles] = useState<ExprTile[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const completedRef = useRef(false);
  const explore = phase === "explore";
  const ops = OP_TILES.filter((t) => allowedOps.includes(t.op));
  const used = new Set(tiles.flatMap((t) => (t.kind === "num" ? [t.index] : [])));
  const sameDigit = allowedNumbers.every((n) => n === allowedNumbers[0]);

  const raw = tilesToExpression(tiles, concat);
  const pretty = tilesToExpression(tiles, concat, true);
  const result = useMemo(() => (raw ? evaluateExpression(raw, { allowedOps }) : null), [raw, allowedOps]);
  const numbersUsed = result?.ok ? result.numbersUsed : tiles.filter((t) => t.kind === "num").map((t) => (t as { value: number }).value);
  const numbersOk = sameMultiset(numbersUsed, allowedNumbers);
  const badOps = result?.ok ? result.opsUsed.filter((op) => !allowedOps.includes(op)) : [];
  const hitsTarget = Boolean(result?.ok && Math.abs(result.value - target) <= TOLERANCE);
  const solved = hitsTarget && numbersOk && badOps.length === 0;

  const push = (t: ExprTile) => {
    if (!explore) return;
    events.interact();
    const next = [...tiles, t];
    setTiles(next);
    const r = evaluateExpression(tilesToExpression(next, concat), { allowedOps });
    const okNumbers = r.ok && sameMultiset(r.numbersUsed, allowedNumbers);
    const win = r.ok && okNumbers && Math.abs(r.value - target) <= TOLERANCE && r.opsUsed.every((op) => allowedOps.includes(op));
    events.state({ expression: tilesToExpression(next, concat), value: r.ok ? r.value : null, numbersUsed: r.ok ? r.numbersUsed.length : null, solved: win });
    if (win) {
      const expr = tilesToExpression(next, concat, true);
      setFound((f) => (f.includes(expr) ? f : [...f, expr]));
      if (!completedRef.current) {
        completedRef.current = true;
        events.emit("completed", { moves: next.length, expression: expr });
      }
      onProposeAnswer?.(expr);
    }
  };
  const backspace = () => explore && setTiles((t) => t.slice(0, -1));
  const clear = () => explore && setTiles([]);

  // Reveal: the known solutions that really evaluate to the target (the schema can't run the evaluator).
  const solutions = useMemo(
    () =>
      (config.solutions ?? []).filter((s) => {
        const r = evaluateExpression(s, { allowedOps });
        return r.ok && Math.abs(r.value - target) <= TOLERANCE && sameMultiset(r.numbersUsed, allowedNumbers) && r.opsUsed.every((op) => allowedOps.includes(op));
      }),
    [config.solutions, allowedOps, allowedNumbers, target],
  );
  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const shown = Math.ceil(segment(progress, 0.05, 0.85) * solutions.length);

  const numberWord = sameDigit ? tr(locale, `${allowedNumbers[0]}s`, `个 ${allowedNumbers[0]}`) : tr(locale, "numbers", "个数");
  const label = tr(locale, `Make ${fmt(target, locale)} using ${allowedNumbers.join(", ")}`, `用 ${allowedNumbers.join("、")} 凑出 ${fmt(target, locale)}`);
  const status = (() => {
    if (phase === "hook") return tr(locale, `Can you make ${fmt(target, locale)} with ${allowedNumbers.join(", ")}?`, `你能用 ${allowedNumbers.join("、")} 凑出 ${fmt(target, locale)} 吗？`);
    if (phase === "reveal") return solutions.length ? tr(locale, "A few ways that work. There are more!", "几种可行的写法，还有更多！") : tr(locale, `Any expression that makes ${fmt(target, locale)} with exactly these numbers works.`, `只要正好用这些数凑出 ${fmt(target, locale)} 就对。`);
    if (!result) return tr(locale, ERRORS.empty[0], ERRORS.empty[1]);
    if (!result.ok) {
      if (result.error.code === "syntax" && !concat && /\d \d/.test(raw)) return tr(locale, "Two numbers side by side need an operation between them.", "两个数挨在一起，中间要有运算符。");
      const [en, zh] = ERRORS[result.error.code];
      return tr(locale, en, zh);
    }
    if (solved) return tr(locale, `Yes! ${pretty} = ${fmt(target, locale)}`, `成功！${pretty} = ${fmt(target, locale)}`);
    if (badOps.length) return tr(locale, `${badOps.join(" ")} isn't allowed here.`, `这里不能用 ${badOps.join(" ")}。`);
    if (hitsTarget) return tr(locale, `That makes ${fmt(target, locale)}, but count your ${numberWord}: you need exactly ${allowedNumbers.length}.`, `结果是 ${fmt(target, locale)}，但数一数：要正好用 ${allowedNumbers.length} ${numberWord}。`);
    return tr(locale, `= ${fmt(result.value, locale)}`, `= ${fmt(result.value, locale)}`);
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex items-center justify-center gap-2">
        <Counter label={tr(locale, "target", "目标")} value={fmt(target, locale)} tone="pink" />
        {phase !== "reveal" && <Counter label={tr(locale, `${numberWord} used`, `已用${sameDigit ? `的 ${allowedNumbers[0]}` : "的数"}`)} value={`${numbersUsed.length}/${allowedNumbers.length}`} tone={numbersOk ? "green" : "primary"} />}
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden px-1" aria-live="polite">
        {phase === "reveal" ? (
          <ol className="flex flex-col items-center gap-1" aria-label={tr(locale, "Some solutions", "几种解法")}>
            {solutions.map((s, i) => {
              const r = evaluateExpression(s, { allowedOps });
              return (
                <li key={s} className={`rounded-xl bg-white px-3 py-1 font-mono text-base shadow-sm transition-opacity duration-300 sm:text-xl ${i < shown ? "opacity-100" : "opacity-0"}`}>
                  {s.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−")} = <b className="text-fun-pink">{r.ok ? fmt(r.value, locale) : "?"}</b>
                </li>
              );
            })}
          </ol>
        ) : (
          <>
            <div className="flex w-full max-w-md items-center gap-1">
              <div className={`min-h-[2.75rem] min-w-0 flex-1 break-all rounded-2xl border-2 bg-white px-2 py-1 text-center font-mono text-xl font-bold sm:text-3xl ${solved ? "border-fun-green text-green-700" : "border-primary-200 text-gray-800"}`}>
                {phase === "hook" ? `${allowedNumbers.join(" ? ")} = ${fmt(target, locale)}` : pretty || "…"}
              </div>
              {explore && (
                <>
                  <SceneButton onClick={backspace} variant="ghost" disabled={tiles.length === 0} ariaLabel={tr(locale, "Delete the last tile", "删掉最后一块")}>⌫</SceneButton>
                  <SceneButton onClick={clear} variant="ghost" disabled={tiles.length === 0} className="hidden min-[340px]:inline-block">{tr(locale, "Clear", "清空")}</SceneButton>
                </>
              )}
            </div>
            {found.length > 1 && (
              <p className="text-center text-[10px] text-gray-500 sm:text-xs">
                {tr(locale, "Found:", "找到：")} {found.join(" · ")}
              </p>
            )}
          </>
        )}
      </div>
      <SceneMessage>{status}</SceneMessage>
      {explore && (
        <div className="mt-1 flex shrink-0 flex-col items-center gap-1">
          <div className="flex flex-wrap justify-center gap-1" role="group" aria-label={tr(locale, "Tiles", "数字块和运算块")}>
            {allowedNumbers.map((n, i) => (
              <SceneButton key={`n${i}`} onClick={() => push({ kind: "num", value: n, index: i })} disabled={used.has(i)} className="text-base sm:text-lg" ariaLabel={tr(locale, `Number ${n}`, `数字 ${n}`)}>
                {n}
              </SceneButton>
            ))}
            {ops.map((t) => (
              <SceneButton key={t.op} onClick={() => push({ kind: "op", op: t.op })} variant="ghost" className="text-base" ariaLabel={tr(locale, t.aria[0], t.aria[1])}>
                {t.label}
              </SceneButton>
            ))}
            <SceneButton onClick={() => push({ kind: "paren", open: true })} variant="ghost" className="text-base" ariaLabel={tr(locale, "open bracket", "左括号")}>(</SceneButton>
            <SceneButton onClick={() => push({ kind: "paren", open: false })} variant="ghost" className="text-base" ariaLabel={tr(locale, "close bracket", "右括号")}>)</SceneButton>
          </div>
          {concat && <p className="hidden text-center text-[10px] text-gray-400 sm:block">{tr(locale, "Tip: two number tiles in a row glue together, like 44.", "提示：两个数字块挨着放会拼成一个数，比如 44。")}</p>}
        </div>
      )}
    </SceneFrame>
  );
}
