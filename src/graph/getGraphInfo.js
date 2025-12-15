export function getGraphInfo(ce, value) {
  const trimmed = value.trim();
  if (!trimmed)
    return { ok: false, reason: "Type an expression in x (or x and y) to graph." };
  try {
    const normalized = normalizeGraphInput(trimmed);
    const parsed = ce.parse(normalized, { canonical: true });

    if (parsed.operator === "Equal") {
      const lhs = parsed.op1;
      const rhs = parsed.op2;

      const isY =
        (lhs.operator === "Symbol" && lhs.symbol === "y") ||
        (lhs.symbol && lhs.symbol === "y");
      if (isY) {
        if ((rhs.unknowns ?? []).some((u) => u !== "x"))
          return { ok: false, reason: "For equations, only y = f(x) is supported." };
        return { ok: true, type: "line", expr: rhs, label: "y" };
      }

      const looksLikeFX =
        lhs.operator &&
        lhs.operator !== "Symbol" &&
        lhs.nops === 1 &&
        lhs.op1?.operator === "Symbol" &&
        lhs.op1?.symbol === "x";
      if (looksLikeFX) {
        if ((rhs.unknowns ?? []).some((u) => u !== "x"))
          return { ok: false, reason: "For equations, only f(x) = ... is supported." };
        return { ok: true, type: "line", expr: rhs, label: lhs.operator };
      }

      const unknowns = parsed.unknowns ?? [];
      if (unknowns.some((u) => u !== "x" && u !== "y")) {
        return { ok: false, reason: "Only variables x and y are supported." };
      }

      // Implicit equation in x/y: graph the solution set where lhs - rhs = 0.
      if (unknowns.includes("x") && unknowns.includes("y")) {
        return { ok: true, type: "implicit", lhs, rhs, label: "=" };
      }

      return {
        ok: false,
        reason:
          "Graph supports y=f(x), expressions in x (or x and y), and implicit x/y equations (e.g. x^2+y^2=1).",
      };
    }

    const unknowns = parsed.unknowns ?? [];
    if (unknowns.length === 0)
      return { ok: false, reason: "No variable found (use x or y)." };
    if (unknowns.some((u) => u !== "x" && u !== "y"))
      return { ok: false, reason: "Only variables x and y are supported." };

    // If y is present, graph as a 2D scalar field f(x, y).
    if (unknowns.includes("y")) return { ok: true, type: "field", expr: parsed, label: "f" };

    return { ok: true, type: "line", expr: parsed, label: "y" };
  } catch {
    return { ok: false, reason: "Invalid expression." };
  }
}

function normalizeGraphInput(input) {
  // Users sometimes type plain-text functions/constants (e.g. cos, sqrt, pi) instead of LaTeX.
  // Convert a small subset to their LaTeX equivalents, but avoid double-escaping.
  let s = input;
  s = s.replace(/(?<!\\)\bpi\b/g, "\\pi");
  s = s.replace(/(?<!\\)\b(sin|cos|tan|ln|log)\s*\(/g, "\\$1(");
  s = s.replace(/(?<!\\)\bsqrt\s*\(/g, "\\sqrt(");
  return s;
}
