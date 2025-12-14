export function getInputInfo(ce, value) {
  const trimmed = value.trim();
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
