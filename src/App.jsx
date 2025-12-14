import { useEffect, useMemo, useRef, useState } from "react";
import { ComputeEngine } from "@cortex-js/compute-engine";
import AppHeader from "@/components/AppHeader";
import GraphCard from "@/components/GraphCard";
import HistoryCard from "@/components/HistoryCard";
import InputCard from "@/components/InputCard";
import ResultCard from "@/components/ResultCard";
import { DEFAULT_GRAPH_VIEW, MAX_HISTORY_ITEMS } from "@/constants";
import { getGraphData } from "@/graph/getGraphData";
import { getGraphInfo } from "@/graph/getGraphInfo";
import { getInputInfo } from "@/logic/getInputInfo";
import { evaluateLatex } from "@/math/evaluateLatex";
import {
  getStoredHistory,
  getStoredOutputMode,
  persistHistory,
  persistOutputMode,
} from "@/utils/storage";

export default function App() {
  const [value, setValue] = useState("");
  const [lastResultLatex, setLastResultLatex] = useState("");
  const [lastError, setLastError] = useState("");
  const [lastEvaluatedInputLatex, setLastEvaluatedInputLatex] = useState("");
  const [solveFor, setSolveFor] = useState("x");
  const [outputMode, setOutputMode] = useState(getStoredOutputMode); // "exact" | "numeric"
  const [showGraph, setShowGraph] = useState(false);
  const [graphView, setGraphView] = useState(() => ({ ...DEFAULT_GRAPH_VIEW }));
  const [history, setHistory] = useState(getStoredHistory);
  const mfRef = useRef(null);

  const ce = useMemo(() => new ComputeEngine(), []);

  const inputInfo = useMemo(() => getInputInfo(ce, value), [ce, value]);
  const graphInfo = useMemo(() => getGraphInfo(ce, value), [ce, value]);
  const graphData = useMemo(
    () => getGraphData({ showGraph, graphView, graphInfo }),
    [graphInfo, graphView, showGraph],
  );

  useEffect(() => {
    if (!mfRef.current) return;

    mfRef.current.mathModeSpace = "\\:";
    mfRef.current.focus();
  }, []);

  useEffect(() => {
    if (!inputInfo.isEquation) return;
    if (inputInfo.unknowns.length === 0) return;
    if (inputInfo.unknowns.includes(solveFor)) return;
    setSolveFor(inputInfo.unknowns[0]);
  }, [inputInfo.isEquation, inputInfo.unknowns, solveFor]);

  useEffect(() => {
    persistOutputMode(outputMode);
  }, [outputMode]);

  useEffect(() => {
    persistHistory(history);
  }, [history]);

  useEffect(() => {
    if (!mfRef.current) return;
    if (mfRef.current.value !== value) mfRef.current.value = value;
  }, [value]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || !e.shiftKey || e.altKey) return;
      if (e.repeat) return;

      const key = String(e.key || "").toLowerCase();
      if (key !== "e" && key !== "n" && key !== "g") return;

      e.preventDefault();
      e.stopPropagation();

      if (key === "e") setOutputMode("exact");
      if (key === "n") setOutputMode("numeric");
      if (key === "g") {
        if (showGraph) {
          setShowGraph(false);
        } else if (graphInfo.ok) {
          setShowGraph(true);
        }
      }

      mfRef.current?.focus?.();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [graphInfo.ok, showGraph]);

  function setMathFieldValue(nextValue) {
    setValue(nextValue);
    if (mfRef.current) {
      mfRef.current.value = nextValue;
      mfRef.current.focus();
    }
  }

  function onEvaluate() {
    setLastError("");
    try {
      const evaluated = evaluateLatex({
        ce,
        latex: value,
        outputMode,
        solveFor,
      });
      if (!evaluated) return;

      setLastResultLatex(evaluated.resultLatex);
      setLastEvaluatedInputLatex(evaluated.inputLatex);
      setHistory((prev) => {
        const last = prev[0];
        if (
          last &&
          last.inputLatex === evaluated.inputLatex &&
          last.resultLatex === evaluated.resultLatex
        ) {
          return prev;
        }
        const item = {
          id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
          at: Date.now(),
          ...evaluated,
        };
        return [item, ...prev].slice(0, MAX_HISTORY_ITEMS);
      });
    } catch (err) {
      setLastResultLatex("");
      setLastEvaluatedInputLatex("");
      setLastError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    if (!lastEvaluatedInputLatex) return;
    try {
      const evaluated = evaluateLatex({
        ce,
        latex: lastEvaluatedInputLatex,
        outputMode,
        solveFor,
      });
      if (!evaluated) return;
      setLastError("");
      setLastResultLatex(evaluated.resultLatex);
    } catch (err) {
      setLastResultLatex("");
      setLastError(err instanceof Error ? err.message : String(err));
    }
    // Intentionally do not add to history.
  }, [lastEvaluatedInputLatex, outputMode, solveFor]);

  function resetGraphView() {
    setGraphView({ ...DEFAULT_GRAPH_VIEW });
  }

  function zoomGraph(scale, anchorX, anchorY) {
    setGraphView((v) => {
      const xRange = v.xMax - v.xMin;
      const yRange = v.yMax - v.yMin;
      if (
        !Number.isFinite(xRange) ||
        !Number.isFinite(yRange) ||
        xRange <= 0 ||
        yRange <= 0
      )
        return v;

      const ax = Number.isFinite(anchorX) ? anchorX : (v.xMin + v.xMax) / 2;
      const ay = Number.isFinite(anchorY) ? anchorY : (v.yMin + v.yMax) / 2;

      const nextXRange = xRange * scale;
      const nextYRange = yRange * scale;
      const xMin = ax - ((ax - v.xMin) / xRange) * nextXRange;
      const xMax = xMin + nextXRange;
      const yMin = ay - ((ay - v.yMin) / yRange) * nextYRange;
      const yMax = yMin + nextYRange;
      return { xMin, xMax, yMin, yMax };
    });
  }

  return (
    <div className="w-full h-full box-border overflow-y-auto p-2">
      <div className="mx-auto flex max-w-6xl flex-col gap-2">
        <AppHeader
          outputMode={outputMode}
          setOutputMode={(mode) => {
            setOutputMode(mode);
            mfRef.current?.focus?.();
          }}
          showGraph={showGraph}
          toggleGraph={() => {
            setShowGraph((v) => !v);
            mfRef.current?.focus?.();
          }}
          graphInfo={graphInfo}
          onZoomIn={() =>
            zoomGraph(
              0.8,
              (graphView.xMin + graphView.xMax) / 2,
              (graphView.yMin + graphView.yMax) / 2,
            )
          }
          onZoomOut={() =>
            zoomGraph(
              1.25,
              (graphView.xMin + graphView.xMax) / 2,
              (graphView.yMin + graphView.yMax) / 2,
            )
          }
          onResetGraph={() => {
            resetGraphView();
            mfRef.current?.focus?.();
          }}
          inputInfo={inputInfo}
          solveFor={solveFor}
          setSolveFor={setSolveFor}
        />

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-start">
          <section className="flex flex-col gap-2">
            <InputCard
              ref={mfRef}
              value={value}
              onValueChange={setValue}
              onEvaluate={onEvaluate}
              onClear={() => {
                setLastError("");
                setLastResultLatex("");
                setLastEvaluatedInputLatex("");
                setMathFieldValue("");
              }}
            />

            {showGraph ? (
              <GraphCard
                graphView={graphView}
                setGraphView={setGraphView}
                graphInfo={graphInfo}
                graphData={graphData}
              />
            ) : null}

            <ResultCard
              lastEvaluatedInputLatex={lastEvaluatedInputLatex}
              lastError={lastError}
              lastResultLatex={lastResultLatex}
              outputMode={outputMode}
            />
          </section>

          <HistoryCard
            history={history}
            maxItems={MAX_HISTORY_ITEMS}
            onSelectInput={setMathFieldValue}
            onRemoveItem={(id) =>
              setHistory((prev) => prev.filter((x) => x.id !== id))
            }
          />
        </div>
      </div>
    </div>
  );
}
