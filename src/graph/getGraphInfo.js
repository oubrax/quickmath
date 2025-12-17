export function getGraphInfo(ce, value) {
  const trimmed = stripMathDelimiters(value);
  if (!trimmed)
    return { ok: false, reason: "Type an expression in x (or x and y) to graph." };
  try {
    const defs = extractMultiFunctionDefinitionsInX(trimmed);
    if (defs.length > 1) {
      const series = defs.map((d) => {
        const rhs = ce.parse(normalizeGraphInput(d.rhsLatex), { canonical: true });
        return { label: d.name, expr: rhs };
      });
      for (const s of series) {
        if ((s.expr.unknowns ?? []).some((u) => u !== "x")) {
          return { ok: false, reason: "For equations, only f(x) = ... is supported." };
        }
      }
      return { ok: true, type: "multi-line", series };
    }

    const fnDef = extractSingleVarFunctionDefinitionInX(trimmed);
    if (fnDef) {
      const rhs = ce.parse(normalizeGraphInput(fnDef.rhsLatex), { canonical: true });
      if ((rhs.unknowns ?? []).some((u) => u !== "x")) {
        return { ok: false, reason: "For equations, only f(x) = ... is supported." };
      }
      return { ok: true, type: "line", expr: rhs, label: fnDef.name };
    }

    const normalized = normalizeGraphInput(trimmed);
    const parsed = ce.parse(normalized, { canonical: true });

    const isSymbolNamed = (node, name) =>
      (node?.operator === "Symbol" && node?.symbol === name) ||
      (typeof node?.symbol === "string" && node.symbol === name);

    const functionNameIfSingleArgCallOfX = (node) => {
      // Canonical form: f(x) -> operator "f", nops 1, op1 is x
      if (
        node?.operator &&
        node.operator !== "Symbol" &&
        node.operator !== "Tuple" &&
        node.nops === 1 &&
        isSymbolNamed(node.op1, "x")
      ) {
        return node.operator;
      }

      // Some inputs can parse as a tuple (f, x) (e.g. if a comma/spacing was inserted).
      // Accept it as f(x) for graphing purposes.
      if (
        node?.operator === "Tuple" &&
        node.nops === 2 &&
        isSymbolNamed(node.op2, "x") &&
        typeof node.op1?.symbol === "string"
      ) {
        return node.op1.symbol;
      }

      return null;
    };

    if (parsed.operator === "Equal") {
      const lhs = parsed.op1;
      const rhs = parsed.op2;

      const isY = isSymbolNamed(lhs, "y");
      if (isY) {
        if ((rhs.unknowns ?? []).some((u) => u !== "x"))
          return { ok: false, reason: "For equations, only y = f(x) is supported." };
        return { ok: true, type: "line", expr: rhs, label: "y" };
      }

      const fnName = functionNameIfSingleArgCallOfX(lhs);
      if (fnName) {
        if ((rhs.unknowns ?? []).some((u) => u !== "x"))
          return { ok: false, reason: "For equations, only f(x) = ... is supported." };
        return { ok: true, type: "line", expr: rhs, label: fnName };
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

function extractSingleVarFunctionDefinitionInX(input) {
  // Allow any single-letter function name on the LHS, including symbols like e and i
  // that Compute Engine might otherwise interpret as constants.
  const s = String(input ?? "").trim();
  const ws = String.raw`(?:\s|\\,|\\;|\\:|\\!)*`;
  const m = s.match(
    new RegExp(
      `^([a-zA-Z])${ws}(?:\\\\left)?\\(${ws}x${ws}(?:\\\\right)?\\)${ws}=${ws}(.+)$`,
      "s",
    ),
  );
  if (!m) return null;
  const name = m[1];
  const rhsLatex = String(m[2] ?? "").trim();
  if (!rhsLatex) return null;
  return { name, rhsLatex };
}

function extractMultiFunctionDefinitionsInX(input) {
  const parts = splitTopLevelStatementsInMath(input);
  if (parts.length <= 1) return [];
  const defs = [];
  for (const part of parts) {
    const def = extractSingleVarFunctionDefinitionInX(part);
    if (!def) return [];
    defs.push(def);
  }
  return defs;
}

function splitTopLevelStatementsInMath(input) {
  // Split on `;` separators (common in math input). This is intentionally simple:
  // it does not try to understand TeX groups; it just avoids empty statements.
  return String(input ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function stripMathDelimiters(input) {
  let s = String(input ?? "").trim();
  if (!s) return "";

  if (s.startsWith("$$") && s.endsWith("$$") && s.length >= 4) {
    s = s.slice(2, -2).trim();
  } else if (s.startsWith("$") && s.endsWith("$") && s.length >= 2) {
    s = s.slice(1, -1).trim();
  } else if (s.startsWith("\\[") && s.endsWith("\\]") && s.length >= 4) {
    s = s.slice(2, -2).trim();
  } else if (s.startsWith("\\(") && s.endsWith("\\)") && s.length >= 4) {
    s = s.slice(2, -2).trim();
  }

  return s;
}
