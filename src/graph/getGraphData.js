export function getGraphData({ showGraph, graphView, graphInfo }) {
  if (!showGraph) return null;
  const xMin = graphView.xMin;
  const xMax = graphView.xMax;
  const yMin = graphView.yMin;
  const yMax = graphView.yMax;
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax)
    return { ok: false, reason: "Invalid x-range.", xMin, xMax, yMin, yMax };
  if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMin >= yMax)
    return { ok: false, reason: "Invalid y-range.", xMin, xMax, yMin, yMax };

  if (!graphInfo.ok)
    return { ok: false, reason: graphInfo.reason, xMin, xMax, yMin, yMax };

  let fn = null;
  try {
    fn = graphInfo.expr.compile({ fallback: false });
  } catch {
    fn = graphInfo.expr.compile();
  }
  const sampleCount = 720;
  const xs = [];
  const ys = [];

  for (let i = 0; i < sampleCount; i++) {
    const t = i / (sampleCount - 1);
    const x = xMin + (xMax - xMin) * t;
    let y = NaN;
    try {
      y = fn({ x });
    } catch {
      try {
        y = fn(x);
      } catch {
        y = NaN;
      }
    }
    xs.push(x);
    ys.push(typeof y === "number" ? y : NaN);
  }

  return { ok: true, xs, ys, xMin, xMax, yMin, yMax, fn };
}
