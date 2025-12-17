import { useEffect, useRef, useState } from "react";
import { buildTicks, clamp, roundForDisplay } from "@/utils/number";

export default function GraphCard({ graphView, setGraphView, graphInfo, graphData }) {
  const [graphHover, setGraphHover] = useState(null);
  const [fieldImageUrl, setFieldImageUrl] = useState(null);
  const graphDragRef = useRef(null);
  const graphSvgRef = useRef(null);
  const hoverSnapRef = useRef(null);
  const hoverSmoothRef = useRef(null);

  const VIEWBOX_W = 600;
  const VIEWBOX_H = 260;
  const ASPECT = VIEWBOX_H / VIEWBOX_W;
  const is2D = graphInfo?.ok && (graphInfo.type === "field" || graphInfo.type === "implicit");

  useEffect(() => {
    if (!is2D) return;
    setGraphView((v) => {
      const xSpan = v.xMax - v.xMin;
      if (!(xSpan > 0)) return v;
      const targetYSpan = xSpan * ASPECT;
      const ySpan = v.yMax - v.yMin;
      if (!(ySpan > 0)) return v;

      const relDiff = Math.abs(targetYSpan - ySpan) / Math.max(1e-12, ySpan);
      if (relDiff < 1e-6) return v;

      const yMid = (v.yMin + v.yMax) / 2;
      return {
        ...v,
        yMin: yMid - targetYSpan / 2,
        yMax: yMid + targetYSpan / 2,
      };
    });
  }, [ASPECT, is2D, setGraphView, graphView.xMin, graphView.xMax, graphView.yMin, graphView.yMax]);

  useEffect(() => {
    if (!graphData?.ok || graphData.type !== "field") {
      setFieldImageUrl(null);
      return;
    }

    try {
      const { gridW, gridH, values, maxAbs } = graphData;
      const canvas = document.createElement("canvas");
      canvas.width = gridW;
      canvas.height = gridH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setFieldImageUrl(null);
        return;
      }

      const img = ctx.createImageData(gridW, gridH);
      const data = img.data;
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        const o = i * 4;
        if (!(typeof v === "number" && Number.isFinite(v))) {
          data[o + 3] = 0;
          continue;
        }

        const t = clamp(v / maxAbs, -1, 1);
        const s = Math.sign(t) * Math.pow(Math.abs(t), 0.65);

        let r = 255;
        let g = 255;
        let b = 255;
        if (s >= 0) {
          g = Math.round(255 * (1 - s));
          b = Math.round(255 * (1 - s));
        } else {
          r = Math.round(255 * (1 + s));
          g = Math.round(255 * (1 + s));
        }

        data[o + 0] = r;
        data[o + 1] = g;
        data[o + 2] = b;
        data[o + 3] = 255;
      }

      ctx.putImageData(img, 0, 0);
      setFieldImageUrl(canvas.toDataURL());
    } catch {
      setFieldImageUrl(null);
    }
  }, [graphData]);

  useEffect(() => {
    const svg = graphSvgRef.current;
    if (!svg) return;

    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = svg.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;

      const nx = (e.clientX - rect.left) / w;
      const ny = (e.clientY - rect.top) / h;
      if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;

      const scale = e.deltaY > 0 ? 1.12 : 0.9;
      setGraphView((v) => {
        const xSpan = v.xMax - v.xMin;
        const ySpan = v.yMax - v.yMin;
        if (!(xSpan > 0 && ySpan > 0)) return v;

        const anchorX = v.xMin + nx * xSpan;
        const anchorY = v.yMax - ny * ySpan;
        const nextXSpan = xSpan * scale;
        const nextYSpan = is2D ? nextXSpan * ASPECT : ySpan * scale;

        const xMin = anchorX - ((anchorX - v.xMin) / xSpan) * nextXSpan;
        const xMax = xMin + nextXSpan;
        const yMin = anchorY - ((anchorY - v.yMin) / ySpan) * nextYSpan;
        const yMax = yMin + nextYSpan;
        return { xMin, xMax, yMin, yMax };
      });
    };

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [setGraphView]);

  return (
    <div className="rounded-none border bg-card p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">Graph</div>
        <div className="text-[11px] text-muted-foreground">
          x ∈ [{roundForDisplay(graphView.xMin)}, {roundForDisplay(graphView.xMax)}]
          {" · "}y ∈ [{roundForDisplay(graphView.yMin)}, {roundForDisplay(graphView.yMax)}]
        </div>
      </div>

      <div className="relative mt-1.5 select-none overscroll-contain">
        <svg
          className="block w-full h-auto aspect-[600/260] border bg-background"
          ref={graphSvgRef}
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          preserveAspectRatio="none"
          style={{ touchAction: "none" }}
          onPointerLeave={() => {
            setGraphHover(null);
            hoverSnapRef.current = null;
            hoverSmoothRef.current = null;
          }}
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;
            if (w <= 0 || h <= 0) return;
            graphDragRef.current = {
              pointerId: e.pointerId,
              startClientX: e.clientX,
              startClientY: e.clientY,
              startView: { ...graphView },
              width: w,
              height: h,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerUp={(e) => {
            if (graphDragRef.current?.pointerId === e.pointerId) {
              graphDragRef.current = null;
            }
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
          }}
          onPointerCancel={() => {
            graphDragRef.current = null;
          }}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;
            if (w <= 0 || h <= 0) return;

            const viewYSpan = graphView.yMax - graphView.yMin;
            const viewXSpan = graphView.xMax - graphView.xMin;
            if (!(viewXSpan > 0 && viewYSpan > 0)) return;

            const px = ((e.clientX - rect.left) / w) * VIEWBOX_W;
            const py = ((e.clientY - rect.top) / h) * VIEWBOX_H;
            if (!Number.isFinite(px) || !Number.isFinite(py)) return;

            const x = graphView.xMin + (px / VIEWBOX_W) * viewXSpan;
            const y = graphView.yMax - (py / VIEWBOX_H) * viewYSpan;

            const isField = graphData?.ok && graphData.type === "field";
            if (isField) {
              hoverSnapRef.current = null;

              let value = NaN;
              try {
                value = graphData.fn({ x, y });
                if (!(typeof value === "number" && Number.isFinite(value))) value = NaN;
              } catch {
                value = NaN;
              }

              if (!hoverSmoothRef.current) {
                hoverSmoothRef.current = { px, py };
              } else {
                const alpha = 0.35;
                hoverSmoothRef.current = {
                  px: hoverSmoothRef.current.px + (px - hoverSmoothRef.current.px) * alpha,
                  py: hoverSmoothRef.current.py + (py - hoverSmoothRef.current.py) * alpha,
                };
              }

              setGraphHover({
                px: hoverSmoothRef.current.px,
                py: hoverSmoothRef.current.py,
                x,
                y,
                value,
              });
            } else {
              const xToPx = (x) => ((x - graphView.xMin) / viewXSpan) * VIEWBOX_W;
              const yToPx = (y) =>
                VIEWBOX_H - ((y - graphView.yMin) / viewYSpan) * VIEWBOX_H;

              const nearestInt = Math.round(x);
              const snapInPx = 10;
              const snapOutPx = 16;
              const currentSnap = hoverSnapRef.current;
              if (typeof currentSnap === "number" && Number.isFinite(currentSnap)) {
                const currentSnapPx = xToPx(currentSnap);
                if (
                  !Number.isFinite(currentSnapPx) ||
                  Math.abs(currentSnapPx - px) > snapOutPx
                ) {
                  hoverSnapRef.current = null;
                }
              } else {
                const snapPx = xToPx(nearestInt);
                if (Number.isFinite(snapPx) && Math.abs(snapPx - px) <= snapInPx) {
                  hoverSnapRef.current = nearestInt;
                }
              }

              const snappedX =
                typeof hoverSnapRef.current === "number" ? hoverSnapRef.current : x;

              let yAtX = NaN;
              let label = null;
              if (graphData?.ok && graphData.type === "multi-line") {
                let best = null;
                for (const s of graphData.series ?? []) {
                  let yv = NaN;
                  try {
                    yv = s.fn({ x: snappedX });
                    if (!(typeof yv === "number" && Number.isFinite(yv))) yv = NaN;
                  } catch {
                    yv = NaN;
                  }
                  if (!Number.isFinite(yv)) continue;
                  const dist = Math.abs(yToPx(yv) - py);
                  if (!best || dist < best.dist) best = { dist, y: yv, label: s.label };
                }
                if (best) {
                  yAtX = best.y;
                  label = best.label;
                }
              } else if (graphData?.ok) {
                try {
                  yAtX = graphData.fn({ x: snappedX });
                  if (!(typeof yAtX === "number" && Number.isFinite(yAtX)))
                    yAtX = NaN;
                } catch {
                  yAtX = NaN;
                }
              }

              const targetPx =
                typeof hoverSnapRef.current === "number" ? xToPx(snappedX) : px;
              const targetPy = Number.isFinite(yAtX) ? yToPx(yAtX) : py;

              if (!hoverSmoothRef.current) {
                hoverSmoothRef.current = { px: targetPx, py: targetPy };
              } else {
                const alpha = 0.35;
                hoverSmoothRef.current = {
                  px:
                    hoverSmoothRef.current.px +
                    (targetPx - hoverSmoothRef.current.px) * alpha,
                  py:
                    hoverSmoothRef.current.py +
                    (targetPy - hoverSmoothRef.current.py) * alpha,
                };
              }

              setGraphHover({
                px: hoverSmoothRef.current.px,
                py: hoverSmoothRef.current.py,
                x: snappedX,
                yAtX,
                label,
              });
            }

            const drag = graphDragRef.current;
            if (!drag || drag.pointerId !== e.pointerId) return;

            const dx = e.clientX - drag.startClientX;
            const dy = e.clientY - drag.startClientY;
            const xSpan = drag.startView.xMax - drag.startView.xMin;
            const ySpan = drag.startView.yMax - drag.startView.yMin;
            const shiftX = -(dx / drag.width) * xSpan;
            const shiftY = (dy / drag.height) * ySpan;
            setGraphView({
              xMin: drag.startView.xMin + shiftX,
              xMax: drag.startView.xMax + shiftX,
              yMin: drag.startView.yMin + shiftY,
              yMax: drag.startView.yMax + shiftY,
            });
          }}
        >
          <rect x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} fill="transparent" />
          {(() => {
            const w = VIEWBOX_W;
            const h = VIEWBOX_H;
            const { xMin, xMax, yMin, yMax } = graphView;
            const xToPx = (x) => ((x - xMin) / (xMax - xMin)) * w;
            const yToPx = (y) => h - ((y - yMin) / (yMax - yMin)) * h;

            const xTicks = buildTicks(xMin, xMax, 6);
            const yTicks = buildTicks(yMin, yMax, 5);

            const zeroX = xMin <= 0 && 0 <= xMax ? xToPx(0) : null;
            const zeroY = yMin <= 0 && 0 <= yMax ? yToPx(0) : null;

            const ySpan = Math.max(1e-9, yMax - yMin);
            const jump = ySpan * 0.35;

            const buildLinePath = ({ xs, ys, safeEval }) => {
              let d = "";
              let started = false;
              let prevX = null;
              let prevY = null;
              for (let i = 0; i < xs.length; i++) {
                const y = ys[i];
                if (!Number.isFinite(y)) {
                  started = false;
                  prevX = null;
                  prevY = null;
                  continue;
                }

                const x = xs[i];
                const py = yToPx(y);
                const px = xToPx(x);

                if (prevX !== null && prevY !== null) {
                  const maxAbs = Math.max(Math.abs(prevY), Math.abs(y), 1);
                  const jumpCap = Math.min(jump, maxAbs * 5);
                  const largeJump = Math.abs(y - prevY) > jumpCap;

                  let discontinuity = largeJump;
                  if (!discontinuity) {
                    const xMid = (prevX + x) / 2;
                    const yMid = safeEval(xMid);
                    if (!Number.isFinite(yMid)) {
                      discontinuity = true;
                    } else if (Math.abs(yMid) > maxAbs * 10) {
                      discontinuity = true;
                    } else {
                      const xQ1 = prevX + (x - prevX) * 0.25;
                      const xQ3 = prevX + (x - prevX) * 0.75;
                      const yQ1 = safeEval(xQ1);
                      const yQ3 = safeEval(xQ3);
                      if (
                        !Number.isFinite(yQ1) ||
                        !Number.isFinite(yQ3) ||
                        Math.abs(yQ1) > maxAbs * 10 ||
                        Math.abs(yQ3) > maxAbs * 10
                      ) {
                        discontinuity = true;
                      }
                    }
                  }

                  if (discontinuity) started = false;
                }

                prevX = x;
                prevY = y;
                if (!started) {
                  d += `M ${px} ${py} `;
                  started = true;
                } else {
                  d += `L ${px} ${py} `;
                }
              }
              return d;
            };

            const linePaths = [];
            if (graphData?.ok && graphData.type === "line") {
              const safeEval = (x) => {
                try {
                  const y = graphData.fn({ x });
                  return typeof y === "number" && Number.isFinite(y) ? y : NaN;
                } catch {
                  try {
                    const y = graphData.fn(x);
                    return typeof y === "number" && Number.isFinite(y) ? y : NaN;
                  } catch {
                    return NaN;
                  }
                }
              };
              const d = buildLinePath({ xs: graphData.xs, ys: graphData.ys, safeEval });
              if (d) linePaths.push({ d, label: graphInfo?.label ?? "y", color: "currentColor" });
            } else if (graphData?.ok && graphData.type === "multi-line") {
              const palette = [
                "var(--chart-1)",
                "var(--chart-2)",
                "var(--chart-3)",
                "var(--chart-4)",
                "var(--chart-5)",
              ];
              const xs = graphData.xs;
              for (let i = 0; i < (graphData.series ?? []).length; i++) {
                const s = graphData.series[i];
                const safeEval = (x) => {
                  try {
                    const y = s.fn({ x });
                    return typeof y === "number" && Number.isFinite(y) ? y : NaN;
                  } catch {
                    try {
                      const y = s.fn(x);
                      return typeof y === "number" && Number.isFinite(y) ? y : NaN;
                    } catch {
                      return NaN;
                    }
                  }
                };
                const d = buildLinePath({ xs, ys: s.ys, safeEval });
                if (d) linePaths.push({ d, label: s.label, color: palette[i % palette.length] });
              }
            }

            const hover = graphHover;
            const isLine = graphData?.ok && (graphData.type === "line" || graphData.type === "multi-line");
            const hoverPoint =
              isLine && hover?.x != null && Number.isFinite(hover?.yAtX)
                ? { px: xToPx(hover.x), py: yToPx(hover.yAtX) }
                : null;

            return (
              <>
                {graphData?.ok && graphData.type === "field" && fieldImageUrl ? (
                  <image
                    href={fieldImageUrl}
                    x="0"
                    y="0"
                    width={w}
                    height={h}
                    preserveAspectRatio="none"
                    opacity="0.95"
                  />
                ) : null}
                {xTicks.map((t) => (
                  <line
                    key={`gx-${t}`}
                    x1={xToPx(t)}
                    y1="0"
                    x2={xToPx(t)}
                    y2={h}
                    stroke="currentColor"
                    opacity="0.06"
                  />
                ))}
                {yTicks.map((t) => (
                  <line
                    key={`gy-${t}`}
                    x1="0"
                    y1={yToPx(t)}
                    x2={w}
                    y2={yToPx(t)}
                    stroke="currentColor"
                    opacity="0.06"
                  />
                ))}

                {zeroX !== null ? (
                  <line
                    x1={zeroX}
                    y1="0"
                    x2={zeroX}
                    y2={h}
                    stroke="currentColor"
                    opacity="0.25"
                  />
                ) : null}
                {zeroY !== null ? (
                  <line
                    x1="0"
                    y1={zeroY}
                    x2={w}
                    y2={zeroY}
                    stroke="currentColor"
                    opacity="0.25"
                  />
                ) : null}

                {xTicks.map((t) => (
                  <g key={`xt-${t}`}>
                    <line
                      x1={xToPx(t)}
                      y1={h - 10}
                      x2={xToPx(t)}
                      y2={h}
                      stroke="currentColor"
                      opacity="0.35"
                    />
                    <text
                      x={xToPx(t)}
                      y={h - 12}
                      textAnchor="middle"
                      fontSize="10"
                      fill="currentColor"
                      opacity="0.6"
                    >
                      {roundForDisplay(t)}
                    </text>
                  </g>
                ))}
                {yTicks.map((t) => (
                  <g key={`yt-${t}`}>
                    <line
                      x1="0"
                      y1={yToPx(t)}
                      x2="10"
                      y2={yToPx(t)}
                      stroke="currentColor"
                      opacity="0.35"
                    />
                    <text
                      x="12"
                      y={yToPx(t) + 3}
                      textAnchor="start"
                      fontSize="10"
                      fill="currentColor"
                      opacity="0.6"
                    >
                      {roundForDisplay(t)}
                    </text>
                  </g>
                ))}

                {linePaths.map((p, idx) => (
                  <path
                    key={`${p.label}-${idx}`}
                    d={p.d}
                    fill="none"
                    stroke={p.color}
                    strokeWidth="2"
                    opacity="0.9"
                  />
                ))}

                {graphData?.ok && graphData.type === "implicit" ? (
                  <path
                    d={(() => {
                      const segs = graphData.segments ?? [];
                      let dd = "";
                      for (let i = 0; i < segs.length; i++) {
                        const a = segs[i][0];
                        const b = segs[i][1];
                        const ax = xMin + ((a.x / (graphData.gridW - 1)) * (xMax - xMin));
                        const ay = yMax - ((a.y / (graphData.gridH - 1)) * (yMax - yMin));
                        const bx = xMin + ((b.x / (graphData.gridW - 1)) * (xMax - xMin));
                        const by = yMax - ((b.y / (graphData.gridH - 1)) * (yMax - yMin));
                        dd += `M ${xToPx(ax)} ${yToPx(ay)} L ${xToPx(bx)} ${yToPx(by)} `;
                      }
                      return dd;
                    })()}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.9"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null}

                {graphHover ? (
                  <>
                    <line
                      x1={graphHover.px}
                      y1="0"
                      x2={graphHover.px}
                      y2={h}
                      stroke="currentColor"
                      opacity="0.12"
                    />
                    <line
                      x1="0"
                      y1={graphHover.py}
                      x2={w}
                      y2={graphHover.py}
                      stroke="currentColor"
                      opacity="0.12"
                    />
                  </>
                ) : null}
                {hoverPoint ? (
                  <circle
                    cx={clamp(hoverPoint.px, 0, w)}
                    cy={clamp(hoverPoint.py, 0, h)}
                    r="3"
                    fill="currentColor"
                    opacity="0.9"
                  />
                ) : graphHover && graphData?.ok && graphData.type === "field" ? (
                  <circle
                    cx={clamp(graphHover.px, 0, w)}
                    cy={clamp(graphHover.py, 0, h)}
                    r="3"
                    fill="currentColor"
                    opacity="0.6"
                  />
                ) : null}
              </>
            );
          })()}
        </svg>

        {graphHover ? (
          <div className="pointer-events-none absolute left-2 top-2 border bg-background px-2 py-1 text-[11px] text-foreground">
            {"value" in graphHover ? (
              <>
                <div>x: {roundForDisplay(graphHover.x)}</div>
                <div>y: {roundForDisplay(graphHover.y)}</div>
                <div>
                  f:{" "}
                  {Number.isFinite(graphHover.value)
                    ? roundForDisplay(graphHover.value)
                    : "—"}
                </div>
              </>
            ) : (
              <>
                <div>x: {roundForDisplay(graphHover.x)}</div>
                {graphHover.label ? <div>{graphHover.label}(x)</div> : null}
                <div>
                  y:{" "}
                  {Number.isFinite(graphHover.yAtX)
                    ? roundForDisplay(graphHover.yAtX)
                    : "—"}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {!graphData?.ok ? (
        <div className="mt-2 text-sm text-muted-foreground">
          {graphData?.reason ?? graphInfo.reason}
        </div>
      ) : null}
    </div>
  );
}
