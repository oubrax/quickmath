export function getGraphInfo(ce, value) {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: "Type a function of x to graph." };
  try {
    const parsed = ce.parse(trimmed, { canonical: true });

    if (parsed.operator === "Equal") {
      const lhs = parsed.op1;
      const rhs = parsed.op2;

      const isY =
        (lhs.operator === "Symbol" && lhs.symbol === "y") ||
        (lhs.symbol && lhs.symbol === "y");
      if (isY) {
        if ((rhs.unknowns ?? []).some((u) => u !== "x"))
          return { ok: false, reason: "Only functions of x are supported." };
        return { ok: true, expr: rhs, label: "y" };
      }

      const looksLikeFX =
        lhs.operator &&
        lhs.operator !== "Symbol" &&
        lhs.nops === 1 &&
        lhs.op1?.operator === "Symbol" &&
        lhs.op1?.symbol === "x";
      if (looksLikeFX) {
        if ((rhs.unknowns ?? []).some((u) => u !== "x"))
          return { ok: false, reason: "Only functions of x are supported." };
        return { ok: true, expr: rhs, label: lhs.operator };
      }
    }

    if ((parsed.unknowns ?? []).length === 0)
      return { ok: false, reason: "No variable found (use x)." };
    if ((parsed.unknowns ?? []).some((u) => u !== "x"))
      return { ok: false, reason: "Only functions of x are supported." };
    return { ok: true, expr: parsed, label: "y" };
  } catch {
    return { ok: false, reason: "Invalid expression." };
  }
}

