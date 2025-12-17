export function getInputInfo(ce, value) {
  const trimmed = stripMathDelimiters(value);
  if (!trimmed) return { isEquation: false, unknowns: [] };

  try {
    const expr = ce.parse(trimmed, { canonical: true });
    return {
      isEquation: expr.operator === "Equal",
      unknowns: expr.unknowns ?? [],
    };
  } catch {
    return { isEquation: false, unknowns: [] };
  }
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
