import CopyButton from "@/components/CopyButton";

export default function ResultCard({
  lastEvaluatedInputLatex,
  lastError,
  lastResultLatex,
  outputMode,
}) {
  return (
    <div className="rounded-none border bg-card p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">Result</div>
        <div className="flex items-center gap-1.5">
          {lastEvaluatedInputLatex ? (
            <div className="text-[11px] text-muted-foreground truncate">
              {outputMode === "numeric" ? "Numeric" : "Exact"}
            </div>
          ) : null}
        </div>
      </div>

      {lastError ? (
        <div className="mt-1.5 text-sm text-destructive">{lastError}</div>
      ) : lastResultLatex ? (
        <div className="mt-1.5 grid grid-cols-1 gap-2">
          {lastEvaluatedInputLatex ? (
            <div className="relative rounded-none border bg-background/60 p-1.5">
              <div className="absolute right-1 top-1">
                <CopyButton
                  text={lastEvaluatedInputLatex}
                  label="Copy input"
                  title="Copy input LaTeX"
                />
              </div>
              <math-field
                read-only
                tabIndex={-1}
                class="w-full bg-transparent text-foreground"
              >
                {lastEvaluatedInputLatex}
              </math-field>
            </div>
          ) : null}
          <div className="relative rounded-none border bg-background p-1.5">
            <div className="absolute right-1 top-1">
              <CopyButton
                text={lastResultLatex}
                label="Copy result"
                title="Copy result LaTeX"
              />
            </div>
            <math-field
              key={lastResultLatex}
              read-only
              tabIndex={-1}
              class="w-full bg-transparent text-foreground"
            >
              {lastResultLatex}
            </math-field>
          </div>
        </div>
      ) : (
        <div className="mt-1.5 text-sm text-muted-foreground">
          Type an expression (or equation) and press Enter.
        </div>
      )}
    </div>
  );
}
