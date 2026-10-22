/**
 * Helpers for expression_builder (F5). The value of an expression is computed by
 * `evaluateExpression` in @gmq/math-engine (the server's validator); this file only knows the
 * tile vocabulary and how tiles become the string that evaluator reads.
 */

/** Operator names, identical to EXPRESSION_OPS in @gmq/math-engine (answer-spec.ts). */
export const EXPR_TILE_OPS = ["+", "-", "*", "/", "^", "!", "sqrt", "concat"] as const;
export type ExprTileOp = (typeof EXPR_TILE_OPS)[number];

export type ExprTile = { kind: "num"; value: number; index: number } | { kind: "op"; op: Exclude<ExprTileOp, "concat"> } | { kind: "paren"; open: boolean };

const OP_TEXT: Record<Exclude<ExprTileOp, "concat">, string> = { "+": "+", "-": "-", "*": "*", "/": "/", "^": "^", "!": "!", sqrt: "√" };
const OP_PRETTY: Record<Exclude<ExprTileOp, "concat">, string> = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^", "!": "!", sqrt: "√" };

const tileText = (t: ExprTile, pretty: boolean) => (t.kind === "num" ? String(t.value) : t.kind === "paren" ? (t.open ? "(" : ")") : (pretty ? OP_PRETTY : OP_TEXT)[t.op]);

/**
 * The string the evaluator reads. Adjacent number tiles are glued ("4","4" → "44") only when
 * `concat` is allowed; otherwise a space keeps them apart, which the parser rejects as a syntax
 * error. `pretty` uses × ÷ − and spaces around binary operators (the evaluator accepts both forms).
 */
export function tilesToExpression(tiles: readonly ExprTile[], concat: boolean, pretty = false): string {
  let out = "";
  tiles.forEach((t, i) => {
    const prev = tiles[i - 1];
    if (prev?.kind === "num" && t.kind === "num" && !concat) out += " ";
    const text = tileText(t, pretty);
    out += pretty && t.kind === "op" && BINARY.has(t.op) ? ` ${text} ` : text;
  });
  return pretty ? out.replace(/\s+/g, " ").trim() : out;
}

const BINARY = new Set<string>(["+", "-", "*", "/", "^"]);

/**
 * Number literals as the evaluator reports them (`numbersUsed`): with concat every digit of a
 * multi-digit literal counts on its own, without it each literal is one number.
 */
export function literalNumbers(expression: string, concat: boolean): number[] {
  const lits = expression.match(/\d+/g) ?? [];
  return concat ? lits.flatMap((l) => [...l].map(Number)) : lits.map(Number);
}

/** Operators an expression string mentions, in the evaluator's vocabulary (unary minus counts as "-"). */
export function literalOps(expression: string, concat: boolean): ExprTileOp[] {
  const ops = new Set<ExprTileOp>();
  const map: Record<string, ExprTileOp> = { "+": "+", "-": "-", "−": "-", "*": "*", "×": "*", "/": "/", "÷": "/", "^": "^", "!": "!", "√": "sqrt" };
  for (const ch of expression) if (map[ch]) ops.add(map[ch]);
  if (/sqrt/.test(expression)) ops.add("sqrt");
  if (concat && /\d\d/.test(expression)) ops.add("concat");
  return [...ops];
}

export function sameNumbers(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((x, i) => x === sb[i]);
}
