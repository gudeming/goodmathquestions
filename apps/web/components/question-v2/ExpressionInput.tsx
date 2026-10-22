"use client";

import { useId, useLayoutEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
// Deep imports: only the parser ships to the client, not the rest of math-engine.
import { evaluateExpression, sameMultiset, type ExprErrorCode, type ExprOp } from "@gmq/math-engine/src/expr";
import { trpc } from "@/lib/trpc";
import { formatNumber, type Locale } from "./types";

const ALL_OPS: ExprOp[] = ["+", "-", "*", "/", "^", "!", "sqrt", "concat"];
const OP_LABEL: Record<ExprOp, string> = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^", "!": "!", sqrt: "√", concat: "44" };
const KEYPAD: Array<{ insert: string; label: string; op?: ExprOp }> = [
  { insert: "(", label: "(" },
  { insert: ")", label: ")" },
  { insert: "+", label: "+", op: "+" },
  { insert: "−", label: "−", op: "-" },
  { insert: "×", label: "×", op: "*" },
  { insert: "÷", label: "÷", op: "/" },
  { insert: "^", label: "^", op: "^" },
  { insert: "!", label: "!", op: "!" },
  { insert: "√", label: "√", op: "sqrt" },
];

const ERROR_KEY: Record<ExprErrorCode, string> = {
  empty: "exprErrorEmpty",
  too_long: "exprErrorTooLong",
  invalid_token: "exprErrorToken",
  syntax: "exprErrorSyntax",
  too_deep: "exprErrorDeep",
  division_by_zero: "exprErrorDivZero",
  domain: "exprErrorDomain",
  factorial_range: "exprErrorFactorial",
  out_of_range: "exprErrorRange",
};

interface ExpressionInputProps {
  questionId: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  locale: Locale;
  labelId: string;
}

/** EXPRESSION answer: text box, symbol keypad and a live preview from the same parser the server uses. */
export function ExpressionInput({ questionId, value, onChange, onSubmit, disabled, locale, labelId }: ExpressionInputProps) {
  const t = useTranslations("questions");
  const helpId = useId();
  const previewId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rules = trpc.question.expressionRules.useQuery({ questionId }, { staleTime: Infinity, retry: 1 });
  const allowedOps = rules.data?.allowedOps ?? ALL_OPS;

  const preview = useMemo(() => {
    if (value.trim() === "") return null;
    return evaluateExpression(value, { allowedOps });
  }, [value, allowedOps]);

  // Caret as last seen in the input (a keypad tap blurs it), and where to put it after an insert.
  const caret = useRef<{ start: number; end: number } | null>(null);
  const pendingCaret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = inputRef.current;
    const at = pendingCaret.current;
    if (!el || at === null) return;
    pendingCaret.current = null;
    el.focus();
    el.setSelectionRange(at, at);
    caret.current = { start: at, end: at };
  }, [value]);

  const rememberCaret = (el: HTMLInputElement) => {
    caret.current = { start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length };
  };

  const insert = (text: string) => {
    const { start, end } = caret.current ?? { start: value.length, end: value.length };
    const s = Math.min(start, value.length);
    const e = Math.min(Math.max(end, s), value.length);
    pendingCaret.current = s + text.length;
    onChange(value.slice(0, s) + text + value.slice(e));
  };

  let previewLine: string | null = null;
  const warnings: string[] = [];
  if (preview?.ok) {
    previewLine = t("exprEquals", { value: formatNumber(preview.value, locale) });
    if (rules.data) {
      if (!sameMultiset(preview.numbersUsed, rules.data.allowedNumbers)) {
        warnings.push(t("exprNeed", { numbers: rules.data.allowedNumbers.join(", ") }));
      }
      const bad = preview.opsUsed.filter((op) => !rules.data!.allowedOps.includes(op));
      if (bad.length > 0) warnings.push(t("exprOpNotAllowed", { ops: bad.map((op) => OP_LABEL[op]).join(" ") }));
    }
  } else if (preview && !preview.ok) {
    warnings.push(t(ERROR_KEY[preview.error.code] as "exprErrorSyntax"));
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={60}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          rememberCaret(e.target);
          onChange(e.target.value);
        }}
        onSelect={(e) => rememberCaret(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        aria-labelledby={labelId}
        aria-describedby={`${helpId} ${previewId}`}
        placeholder={t("expressionPlaceholder")}
        className="input-fun text-center font-mono text-2xl"
        data-testid="answer-input"
      />
      <p id={helpId} className="mt-2 text-center text-sm text-gray-500">
        {t("expressionHelp")}
        {rules.data && ` ${t("exprNeed", { numbers: rules.data.allowedNumbers.join(", ") })}`}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {KEYPAD.filter((k) => !k.op || allowedOps.includes(k.op)).map((k) => (
          <button
            key={k.insert}
            type="button"
            disabled={disabled}
            onClick={() => insert(k.insert)}
            className="h-11 min-w-[44px] rounded-bubble border-2 border-primary-100 bg-white px-3 font-mono text-lg text-gray-800 hover:border-fun-cyan focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-cyan/50"
          >
            {k.label}
          </button>
        ))}
      </div>
      <div id={previewId} aria-live="polite" className="mt-3 min-h-[1.5rem] text-center">
        {previewLine && <p className="font-mono text-xl font-bold text-primary-700">{previewLine}</p>}
        {warnings.map((w) => (
          <p key={w} className="text-sm font-heading text-fun-orange">
            {w}
          </p>
        ))}
      </div>
    </div>
  );
}
