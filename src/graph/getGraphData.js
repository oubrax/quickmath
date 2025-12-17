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

  if (graphInfo.type === "multi-line") {
    const sampleCount = 720;
    const xs = [];
    for (let i = 0; i < sampleCount; i++) {
      const t = i / (sampleCount - 1);
      xs.push(xMin + (xMax - xMin) * t);
    }

    const series = graphInfo.series.map((s) => {
      let fn = null;
      try {
        fn = s.expr.compile({ fallback: false });
      } catch {
        fn = s.expr.compile();
      }

      const ys = [];
      for (let i = 0; i < xs.length; i++) {
        const x = xs[i];
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
        ys.push(typeof y === "number" ? y : NaN);
      }

      return { label: s.label, fn, ys };
    });

    return { ok: true, type: "multi-line", xs, series, xMin, xMax, yMin, yMax };
  }

  let fn = null;
  let expr = graphInfo.expr ?? null;
  if (graphInfo.type === "implicit") {
    const ce = graphInfo.lhs.engine;
    // Compile g(x,y) = lhs - rhs; contour g=0 is the solution set.
    expr = ce.box(["Subtract", graphInfo.lhs, graphInfo.rhs], { canonical: true });
  }
  try {
    fn = expr.compile({ fallback: false });
  } catch {
    fn = expr.compile();
  }

  if (graphInfo.type === "field") {
    // Keep this relatively small: field graphs are re-sampled frequently during pan/zoom.
    const gridW = 140;
    const gridH = 62;
    const values = new Float32Array(gridW * gridH);

    let minV = Infinity;
    let maxV = -Infinity;
    let finiteCount = 0;

    for (let row = 0; row < gridH; row++) {
      const ty = (row + 0.5) / gridH;
      const y = yMax - (yMax - yMin) * ty;
      for (let col = 0; col < gridW; col++) {
        const tx = (col + 0.5) / gridW;
        const x = xMin + (xMax - xMin) * tx;
        let v = NaN;
        try {
          v = fn({ x, y });
        } catch {
          v = NaN;
        }
        const idx = row * gridW + col;
        if (typeof v === "number" && Number.isFinite(v)) {
          values[idx] = v;
          finiteCount++;
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        } else {
          values[idx] = NaN;
        }
      }
    }

    if (finiteCount === 0) {
      return {
        ok: false,
        reason: "No finite values in the current view.",
        xMin,
        xMax,
        yMin,
        yMax,
      };
    }

    const maxAbs = Math.max(Math.abs(minV), Math.abs(maxV), 1e-12);
    return {
      ok: true,
      type: "field",
      xMin,
      xMax,
      yMin,
      yMax,
      fn,
      gridW,
      gridH,
      values,
      minV,
      maxV,
      maxAbs,
    };
  }

  if (graphInfo.type === "implicit") {
    const gridW = 160;
    const gridH = 72;

    const values = new Float32Array(gridW * gridH);
    let finiteCount = 0;

    for (let row = 0; row < gridH; row++) {
      const ty = row / (gridH - 1);
      const y = yMax - (yMax - yMin) * ty;
      for (let col = 0; col < gridW; col++) {
        const tx = col / (gridW - 1);
        const x = xMin + (xMax - xMin) * tx;
        let v = NaN;
        try {
          v = fn({ x, y });
        } catch {
          v = NaN;
        }
        const idx = row * gridW + col;
        if (typeof v === "number" && Number.isFinite(v)) {
          values[idx] = v;
          finiteCount++;
        } else {
          values[idx] = NaN;
        }
      }
    }

    if (finiteCount === 0) {
      return {
        ok: false,
        reason: "No finite values in the current view.",
        xMin,
        xMax,
        yMin,
        yMax,
      };
    }

    const segments = marchingSquaresZero(values, gridW, gridH);
    return {
      ok: true,
      type: "implicit",
      xMin,
      xMax,
      yMin,
      yMax,
      fn,
      gridW,
      gridH,
      segments,
    };
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

  return { ok: true, type: "line", xs, ys, xMin, xMax, yMin, yMax, fn };
}

function marchingSquaresZero(values, gridW, gridH) {
  const segments = [];

  const at = (x, y) => values[y * gridW + x];
  const isFiniteNumber = (v) => typeof v === "number" && Number.isFinite(v);

  const interp = (vA, vB) => {
    if (!isFiniteNumber(vA) || !isFiniteNumber(vB)) return 0.5;
    const d = vB - vA;
    if (!Number.isFinite(d) || Math.abs(d) < 1e-12) return 0.5;
    return (0 - vA) / d;
  };

  // Returns up to 2 segments in cell-local coords (x..x+1, y..y+1).
  for (let y = 0; y < gridH - 1; y++) {
    for (let x = 0; x < gridW - 1; x++) {
      const v0 = at(x, y); // top-left
      const v1 = at(x + 1, y); // top-right
      const v2 = at(x + 1, y + 1); // bottom-right
      const v3 = at(x, y + 1); // bottom-left
      if (!(isFiniteNumber(v0) && isFiniteNumber(v1) && isFiniteNumber(v2) && isFiniteNumber(v3)))
        continue;

      const s0 = v0 >= 0 ? 1 : 0;
      const s1 = v1 >= 0 ? 1 : 0;
      const s2 = v2 >= 0 ? 1 : 0;
      const s3 = v3 >= 0 ? 1 : 0;
      const idx = (s0 << 3) | (s1 << 2) | (s2 << 1) | s3;
      if (idx === 0 || idx === 15) continue;

      const tTop = interp(v0, v1);
      const tRight = interp(v1, v2);
      const tBottom = interp(v3, v2);
      const tLeft = interp(v0, v3);

      const top = { x: x + tTop, y };
      const right = { x: x + 1, y: y + tRight };
      const bottom = { x: x + tBottom, y: y + 1 };
      const left = { x, y: y + tLeft };

      // Ambiguous cases 5 and 10: choose split based on cell center value.
      if (idx === 5 || idx === 10) {
        const center = (v0 + v1 + v2 + v3) / 4;
        if (idx === 5) {
          if (center >= 0) {
            segments.push([top, left]);
            segments.push([right, bottom]);
          } else {
            segments.push([top, right]);
            segments.push([left, bottom]);
          }
        } else {
          if (center >= 0) {
            segments.push([top, right]);
            segments.push([left, bottom]);
          } else {
            segments.push([top, left]);
            segments.push([right, bottom]);
          }
        }
        continue;
      }

      // Standard marching squares table (edges: top, right, bottom, left).
      // Each entry is a list of edge pairs.
      switch (idx) {
        case 1:
        case 14:
          segments.push([left, bottom]);
          break;
        case 2:
        case 13:
          segments.push([bottom, right]);
          break;
        case 3:
        case 12:
          segments.push([left, right]);
          break;
        case 4:
        case 11:
          segments.push([top, right]);
          break;
        case 6:
        case 9:
          segments.push([top, bottom]);
          break;
        case 7:
        case 8:
          segments.push([top, left]);
          break;
        default:
          break;
      }
    }
  }

  return segments;
}
