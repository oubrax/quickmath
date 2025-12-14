export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function niceStep(roughStep) {
  if (!Number.isFinite(roughStep) || roughStep <= 0) return 1;
  const exponent = Math.floor(Math.log10(roughStep));
  const fraction = roughStep / 10 ** exponent;
  const niceFraction =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * 10 ** exponent;
}

export function buildTicks(min, max, targetCount = 6) {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) return [];
  const step = niceStep(span / Math.max(2, targetCount));
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(v);
  return ticks;
}

export function uniqueByTolerance(values, tolerance = 1e-7) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  const result = [];
  for (const x of sorted) {
    const prev = result[result.length - 1];
    if (prev === undefined || Math.abs(prev - x) > tolerance) result.push(x);
  }
  return result;
}

export function roundForDisplay(x, significantDigits = 12) {
  if (!Number.isFinite(x)) return x;
  if (Math.abs(x) < 1e-12) return 0;
  return Number.parseFloat(x.toPrecision(significantDigits));
}

