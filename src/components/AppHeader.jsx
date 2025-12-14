import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/logo.svg";

export default function AppHeader({
  outputMode,
  setOutputMode,
  showGraph,
  toggleGraph,
  graphInfo,
  onZoomIn,
  onZoomOut,
  onResetGraph,
  inputInfo,
  solveFor,
  setSolveFor,
}) {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <img
            src={logoUrl}
            alt="QuickMath"
            className="h-6 w-auto dark:invert"
            draggable={false}
          />
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          Enter to run · Esc clears · Ctrl± zoom · Ctrl+Shift+E/N/G modes
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={outputMode === "exact" ? "default" : "outline"}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOutputMode("exact")}
          >
            Exact
          </Button>
          <Button
            size="sm"
            variant={outputMode === "numeric" ? "default" : "outline"}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOutputMode("numeric")}
          >
            Number
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={showGraph ? "default" : "outline"}
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleGraph}
            title={graphInfo.ok ? "Toggle graph" : graphInfo.reason}
          >
            Graph
          </Button>
          {showGraph ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onZoomIn}
                title="Zoom in"
              >
                +
              </Button>
              <Button
                size="sm"
                variant="outline"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onZoomOut}
                title="Zoom out"
              >
                −
              </Button>
              <Button
                size="sm"
                variant="outline"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onResetGraph}
                title="Reset range"
              >
                Reset
              </Button>
            </>
          ) : null}
        </div>

        {inputInfo.isEquation && inputInfo.unknowns.length > 0 ? (
          <div
            key={inputInfo.unknowns.join(",")}
            className="flex items-center gap-1 animate-in fade-in duration-200 motion-reduce:animate-none"
          >
            <span className="text-xs text-muted-foreground">Solve for</span>
            {inputInfo.unknowns.slice(0, 8).map((name) => (
              <Button
                key={name}
                size="sm"
                variant={name === solveFor ? "default" : "outline"}
                onClick={() => setSolveFor(name)}
              >
                {name}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
