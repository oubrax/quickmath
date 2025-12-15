import { MAX_SOLUTIONS_DISPLAY } from "@/constants";
import { solveUnivariateNumerically } from "@/math/numericSolve";
import { roundForDisplay } from "@/utils/number";

function toLatexOrString(expr) {
  if (!expr) return "";
  if (typeof expr === "string") return expr;
  if (typeof expr.latex === "string" && expr.latex) return expr.latex;
  return String(expr);
}

function bestExactLatex(expr) {
  const candidates = [];
  const push = (x) => {
    const s = toLatexOrString(x);
    if (s) candidates.push(s);
  };

  push(expr);

  try {
    push(expr.simplify());
  } catch {}

  try {
    push(expr.evaluate());
  } catch {}

  try {
    push(expr.evaluate().simplify());
  } catch {}

  try {
    if (typeof expr.expand === "function") {
      const expanded = expr.expand();
      push(expanded);
      try {
        push(expanded.simplify());
      } catch {}
    }
  } catch {}

  const seen = new Set();
  const unique = [];
  for (const s of candidates) {
    if (seen.has(s)) continue;
    seen.add(s);
    unique.push(s);
  }

  unique.sort((a, b) => a.length - b.length);
  return unique[0] ?? "";
}

function isSymbolNamed(node, name) {
  return (
    (node?.operator === "Symbol" && node?.symbol === name) ||
    (typeof node?.symbol === "string" && node.symbol === name)
  );
}

function isSingleArgCallOfX(node) {
  return (
    node?.operator &&
    node.operator !== "Symbol" &&
    node.nops === 1 &&
    isSymbolNamed(node.op1, "x")
  );
}

export function evaluateLatex({ ce, latex, outputMode, solveFor }) {
  const trimmed = latex.trim();
  if (!trimmed) return null;

  const expr = ce.parse(trimmed);
  if (expr.operator === "Equal") {
    // Treat y=f(x) and f(x)=... as a definition-like display, not as an equation to solve.
    // This avoids errors like "Can't solve for multiple variables: y, x" when graphing.
    const lhs = expr.op1;
    const rhs = expr.op2;
    const rhsUnknowns = rhs?.unknowns ?? [];
    const rhsOnlyUsesX = rhsUnknowns.every((u) => u === "x");
    if (rhsOnlyUsesX && (isSymbolNamed(lhs, "y") || isSingleArgCallOfX(lhs))) {
      const rhsLatex =
        outputMode === "numeric" ? bestExactLatex(rhs.N()) : bestExactLatex(rhs);
      const lhsLatex = toLatexOrString(lhs);
      return { inputLatex: trimmed, resultLatex: `${lhsLatex}=${rhsLatex}` };
    }

    const vars = expr.unknowns ?? [];
    if (vars.length === 0) {
      const evaluated = outputMode === "numeric" ? expr.N() : expr.evaluate();
      return {
        inputLatex: trimmed,
        resultLatex:
          outputMode === "numeric"
            ? String(evaluated)
            : bestExactLatex(evaluated),
      };
    }
    if (vars.length > 1)
      throw new Error(`Can't solve for multiple variables: ${vars.join(", ")}`);

    const variable = vars.includes(solveFor) ? solveFor : vars[0];
    const solutions = expr.solve(variable);
    let isApproximate = false;
    let roots =
      solutions?.map((s) =>
        outputMode === "numeric" ? String(s.N()) : bestExactLatex(s),
      ) ?? null;

    if (!roots || roots.length === 0) {
      const diff = ce.function("Subtract", [expr.op1, expr.op2]).simplify();
      const numericRoots = solveUnivariateNumerically(diff, variable);
      if (numericRoots.length === 0) throw new Error("No solutions found.");
      isApproximate = true;
      roots = numericRoots.map((x) =>
        outputMode === "numeric"
          ? String(roundForDisplay(x))
          : ce.number(roundForDisplay(x)).latex,
      );
    }
    roots = Array.from(new Set(roots));
    if (roots.length > MAX_SOLUTIONS_DISPLAY) {
      roots = [...roots.slice(0, MAX_SOLUTIONS_DISPLAY), "\\ldots"];
    }

    const rhsLatex =
      roots.length === 1 ? roots[0] : `\\left\\{${roots.join(", ")}\\right\\}`;
    const equalsLatex =
      outputMode === "numeric" || isApproximate ? "\\approx" : "=";
    return { inputLatex: trimmed, resultLatex: `${variable}${equalsLatex}${rhsLatex}` };
  }

  const result = outputMode === "numeric" ? expr.N() : expr.evaluate();
  return {
    inputLatex: trimmed,
    resultLatex:
      outputMode === "numeric" ? String(result) : bestExactLatex(result),
  };
}
