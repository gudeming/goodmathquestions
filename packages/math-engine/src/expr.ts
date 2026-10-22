/**
 * Safe arithmetic expression parser for EXPRESSION answers ("four fours", "make 24").
 *
 * Recursive descent over a whitelisted token set. No `eval`, no `Function`, no regex
 * backtracking on user input. Every limit is checked before work is done, so hostile
 * input (very long, deeply nested, huge powers / factorials) is rejected in well under 1 ms.
 *
 * Grammar (lowest to highest precedence):
 *   expr    := term (("+" | "-") term)*
 *   term    := unary (("*" | "/") unary)*
 *   unary   := "-" unary | power
 *   power   := postfix ("^" unary)?          right-associative; 2^-1 is allowed
 *   postfix := primary "!"*
 *   primary := NUMBER | "(" expr ")" | "sqrt" "(" expr ")" | "√" primary
 *
 * `-2^2` is `-(2^2)` (as in maths class); `√4!` is `(√4)!`, like `sqrt(4)!`.
 */

export const EXPR_MAX_LENGTH = 60;
export const EXPR_MAX_DEPTH = 20;
export const EXPR_MAX_FACTORIAL = 12;
/** Any intermediate value beyond this is rejected (keeps results exact enough to compare). */
export const EXPR_MAX_MAGNITUDE = 1e12;

/** Operator names, matching EXPRESSION_OPS in answer-spec.ts. Parentheses are always allowed. */
export type ExprOp = "+" | "-" | "*" | "/" | "^" | "!" | "sqrt" | "concat";

export type ExprErrorCode =
  | "empty"
  | "too_long"
  | "invalid_token"
  | "syntax"
  | "too_deep"
  | "division_by_zero"
  | "domain"
  | "factorial_range"
  | "out_of_range";

export interface ExprError {
  code: ExprErrorCode;
  /** 0-based index in the normalised input, when meaningful. */
  position?: number;
}

export interface ExprValue {
  value: number;
  /** Every number literal, in reading order. With `concat` allowed, "44" contributes 4 and 4. */
  numbersUsed: number[];
  /** Operators that appear (unary minus counts as "-", "√" as "sqrt", multi-digit literals as "concat"). */
  opsUsed: ExprOp[];
}

export type ExprResult = ({ ok: true } & ExprValue) | { ok: false; error: ExprError };

export interface ExprOptions {
  /**
   * Only `concat` changes parsing: with it, a multi-digit literal is read as adjacent
   * single digits glued together (numbersUsed gets each digit). Without it, a literal
   * is one number ("10" is the number ten). Other ops are reported in `opsUsed` and
   * checked by the caller, so the live preview can say which op is not allowed.
   */
  allowedOps?: readonly ExprOp[];
}

type Token =
  | { kind: "num"; text: string; pos: number }
  | { kind: "op"; op: "+" | "-" | "*" | "/" | "^" | "!"; pos: number }
  | { kind: "lparen" | "rparen" | "sqrt"; pos: number };

/** Lookalike characters kids (and phone keyboards) type. */
const CHAR_MAP: Record<string, string> = {
  "×": "*",
  "·": "*",
  "x": "*",
  "X": "*",
  "÷": "/",
  "−": "-",
  "–": "-",
  "—": "-",
  "（": "(",
  "）": ")",
  "！": "!",
};

class ExprFailure extends Error {
  constructor(readonly detail: ExprError) {
    super(detail.code);
  }
}

const fail = (code: ExprErrorCode, position?: number): never => {
  throw new ExprFailure(position === undefined ? { code } : { code, position });
};

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const raw = src[i];
    const c = CHAR_MAP[raw] ?? raw;
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    if (c >= "0" && c <= "9") {
      const start = i;
      while (i < src.length && src[i] >= "0" && src[i] <= "9") i++;
      tokens.push({ kind: "num", text: src.slice(start, i), pos: start });
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "^" || c === "!") {
      tokens.push({ kind: "op", op: c, pos: i });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ kind: "lparen", pos: i });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ kind: "rparen", pos: i });
      i++;
      continue;
    }
    if (c === "√") {
      tokens.push({ kind: "sqrt", pos: i });
      i++;
      continue;
    }
    if (src.startsWith("sqrt", i)) {
      // `sqrt` must be followed by "(": marked so the parser can require it.
      tokens.push({ kind: "sqrt", pos: -1 - i });
      i += 4;
      continue;
    }
    fail("invalid_token", i);
  }
  return tokens;
}

function checkRange(n: number, pos: number): number {
  if (Number.isNaN(n)) fail("domain", pos);
  if (!Number.isFinite(n) || Math.abs(n) > EXPR_MAX_MAGNITUDE) fail("out_of_range", pos);
  return n;
}

function factorial(n: number, pos: number): number {
  if (!Number.isInteger(n) || n < 0 || n > EXPR_MAX_FACTORIAL) fail("factorial_range", pos);
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

class Parser {
  private i = 0;
  private depth = 0;
  readonly numbers: number[] = [];
  readonly ops = new Set<ExprOp>();

  constructor(
    private readonly tokens: Token[],
    private readonly concat: boolean,
    private readonly length: number
  ) {}

  parse(): number {
    const v = this.expr();
    if (this.i < this.tokens.length) fail("syntax", this.posAt(this.i));
    return v;
  }

  private posAt(i: number): number {
    const t = this.tokens[i];
    if (!t) return this.length;
    return t.pos < 0 ? -1 - t.pos : t.pos;
  }

  private enter(): void {
    if (++this.depth > EXPR_MAX_DEPTH) fail("too_deep", this.posAt(this.i));
  }

  private leave(): void {
    this.depth--;
  }

  private peekOp(...ops: string[]): string | null {
    const t = this.tokens[this.i];
    return t && t.kind === "op" && ops.includes(t.op) ? t.op : null;
  }

  private expr(): number {
    let v = this.term();
    for (let op = this.peekOp("+", "-"); op; op = this.peekOp("+", "-")) {
      const pos = this.posAt(this.i);
      this.i++;
      this.ops.add(op as ExprOp);
      const r = this.term();
      v = checkRange(op === "+" ? v + r : v - r, pos);
    }
    return v;
  }

  private term(): number {
    let v = this.unary();
    for (let op = this.peekOp("*", "/"); op; op = this.peekOp("*", "/")) {
      const pos = this.posAt(this.i);
      this.i++;
      this.ops.add(op as ExprOp);
      const r = this.unary();
      if (op === "/" && r === 0) fail("division_by_zero", pos);
      v = checkRange(op === "*" ? v * r : v / r, pos);
    }
    return v;
  }

  private unary(): number {
    if (!this.peekOp("-")) return this.power();
    this.enter();
    this.i++;
    this.ops.add("-");
    const v = -this.unary();
    this.leave();
    return v;
  }

  private power(): number {
    const base = this.postfix();
    let v = base;
    if (this.peekOp("^")) {
      const pos = this.posAt(this.i);
      this.i++;
      this.ops.add("^");
      this.enter();
      const exp = this.unary();
      this.leave();
      if (base === 0 && exp < 0) fail("division_by_zero", pos);
      // Cheap magnitude pre-check so 9^999999 never reaches Math.pow.
      if (Math.abs(base) > 1 && exp * Math.log10(Math.abs(base)) > Math.log10(EXPR_MAX_MAGNITUDE)) {
        fail("out_of_range", pos);
      }
      v = checkRange(Math.pow(base, exp), pos);
    }
    return v;
  }

  private postfix(): number {
    let v = this.primary();
    while (this.peekOp("!")) {
      const pos = this.posAt(this.i);
      this.i++;
      this.ops.add("!");
      v = factorial(v, pos);
    }
    return v;
  }

  private primary(): number {
    const t = this.tokens[this.i];
    if (!t) return fail("syntax", this.length);
    if (t.kind === "num") {
      this.i++;
      return this.literal(t.text, t.pos);
    }
    if (t.kind === "lparen") {
      this.enter();
      this.i++;
      const v = this.expr();
      if (this.tokens[this.i]?.kind !== "rparen") fail("syntax", this.posAt(this.i));
      this.i++;
      this.leave();
      return v;
    }
    if (t.kind === "sqrt") {
      this.enter();
      const pos = this.posAt(this.i);
      this.i++;
      this.ops.add("sqrt");
      // The word form needs parentheses: "sqrt(4)", not "sqrt4".
      if (t.pos < 0 && this.tokens[this.i]?.kind !== "lparen") fail("syntax", this.posAt(this.i));
      const arg = this.primary();
      if (arg < 0) fail("domain", pos);
      this.leave();
      return Math.sqrt(arg);
    }
    return fail("syntax", this.posAt(this.i));
  }

  private literal(text: string, pos: number): number {
    if (this.concat && text.length > 1) {
      this.ops.add("concat");
      for (const d of text) this.numbers.push(Number(d));
    } else {
      this.numbers.push(Number(text));
    }
    return checkRange(Number(text), pos);
  }
}

/**
 * Parses and evaluates an arithmetic expression. Never throws for any string input:
 * every problem comes back as `{ ok: false, error }`.
 */
export function evaluateExpression(input: string, options: ExprOptions = {}): ExprResult {
  if (typeof input !== "string") return { ok: false, error: { code: "invalid_token" } };
  if (input.length > EXPR_MAX_LENGTH) return { ok: false, error: { code: "too_long" } };
  const src = input.trim();
  if (src === "") return { ok: false, error: { code: "empty" } };

  try {
    const tokens = tokenize(src);
    const parser = new Parser(tokens, options.allowedOps?.includes("concat") === true, src.length);
    const value = parser.parse();
    // Normalise -0 so callers comparing with Object.is or printing never see "-0".
    return {
      ok: true,
      value: value === 0 ? 0 : value,
      numbersUsed: parser.numbers,
      opsUsed: [...parser.ops],
    };
  } catch (err) {
    if (err instanceof ExprFailure) return { ok: false, error: err.detail };
    // Defensive: a RangeError (stack) or anything unexpected is still a rejection, never a crash.
    return { ok: false, error: { code: "too_deep" } };
  }
}

/** True when the two lists hold the same numbers with the same multiplicities. */
export function sameMultiset(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((x, i) => x === sb[i]);
}
