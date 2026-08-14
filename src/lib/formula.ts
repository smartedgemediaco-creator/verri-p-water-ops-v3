/**
 * Tiny safe expression evaluator for raw-material custom columns.
 * Supports + - * / % ( ) with named field tokens (e.g. unitPrice * receivedQuantity).
 * No eval() — tokenized + shunting-yard + stack evaluation.
 */

export const BATCH_FORMULA_TOKENS = [
  { token: "receivedQuantity", label: "Received qty" },
  { token: "availableQuantity", label: "Available qty" },
  { token: "consumedQuantity", label: "Consumed qty" },
  { token: "itemCount", label: "Item count (e.g. rolls)" },
  { token: "itemConsumed", label: "Items consumed" },
  { token: "itemAvailable", label: "Items remaining" },
  { token: "unitPrice", label: "Unit price (₦)" },
  { token: "totalCost", label: "Total cost (₦)" },
  { token: "paidAmount", label: "Paid (₦)" },
  { token: "amountOwed", label: "Owed (₦)" },
];

type Token =
  | { type: "num"; value: number }
  | { type: "id"; value: string }
  | { type: "op"; value: string };

const OPS = new Set(["+", "-", "*", "/", "%", "(", ")"]);

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.trim();
  while (i < s.length) {
    const ch = s[i];
    if (ch === " ") { i += 1; continue; }
    if (OPS.has(ch)) {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }
    if (ch === "-" && tokens.length === 0) return null;
    const numMatch = s.slice(i).match(/^\d+(\.\d+)?/);
    if (numMatch) {
      tokens.push({ type: "num", value: Number(numMatch[0]) });
      i += numMatch[0].length;
      continue;
    }
    const idMatch = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (idMatch) {
      tokens.push({ type: "id", value: idMatch[0] });
      i += idMatch[0].length;
      continue;
    }
    return null;
  }
  return tokens.length > 0 ? tokens : null;
}

function toPostfix(tokens: Token[]): Token[] | null {
  const out: Token[] = [];
  const stack: string[] = [];
  const prec: Record<string, number> = { "*": 2, "/": 2, "%": 2, "+": 1, "-": 1 };

  for (const t of tokens) {
    if (t.type === "num" || t.type === "id") {
      out.push(t);
      continue;
    }
    if (t.type !== "op") return null;
    const op = t.value;
    if (op === "(") {
      stack.push(op);
      continue;
    }
    if (op === ")") {
      let found = false;
      while (stack.length > 0) {
        const top = stack.pop();
        if (top === "(") { found = true; break; }
        if (top) out.push({ type: "op", value: top });
      }
      if (!found) return null;
      continue;
    }
    while (
      stack.length > 0 &&
      stack[stack.length - 1] !== "(" &&
      (prec[stack[stack.length - 1]] ?? 0) >= (prec[op] ?? 0)
    ) {
      const top = stack.pop();
      if (top) out.push({ type: "op", value: top });
    }
    stack.push(op);
  }

  while (stack.length > 0) {
    const top = stack.pop();
    if (top === "(" || top === ")") return null;
    if (top) out.push({ type: "op", value: top });
  }
  return out;
}

function evalPostfix(postfix: Token[], ctx: Record<string, number>): number | null {
  const stack: number[] = [];
  for (const t of postfix) {
    if (t.type === "num") {
      stack.push(t.value);
      continue;
    }
    if (t.type === "id") {
      const v = ctx[t.value];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      stack.push(v);
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) return null;
    switch (t.value) {
      case "+": stack.push(a + b); break;
      case "-": stack.push(a - b); break;
      case "*": stack.push(a * b); break;
      case "/": stack.push(b === 0 ? NaN : a / b); break;
      case "%": stack.push(b === 0 ? NaN : a % b); break;
      default: return null;
    }
  }
  if (stack.length !== 1) return null;
  const result = stack[0];
  return Number.isFinite(result) ? result : null;
}

export function evaluateFormula(formula: string, ctx: Record<string, number>): number | null {
  const tokens = tokenize(formula);
  if (!tokens) return null;
  const postfix = toPostfix(tokens);
  if (!postfix) return null;
  return evalPostfix(postfix, ctx);
}

/** Validate a formula string without executing it against data. */
export function isValidFormula(formula: string): boolean {
  const tokens = tokenize(formula);
  if (!tokens) return false;
  return toPostfix(tokens) !== null;
}
