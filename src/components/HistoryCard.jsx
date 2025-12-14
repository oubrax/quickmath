import { Button } from "@/components/ui/button";
import CopyButton from "@/components/CopyButton";

export default function HistoryCard({
  history,
  maxItems,
  onSelectInput,
  onRemoveItem,
}) {
  return (
    <aside className="rounded-none border bg-card p-2 lg:sticky lg:top-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">History</div>
        <div className="text-[11px] text-muted-foreground">
          {history.length}/{maxItems}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="mt-1.5 text-sm text-muted-foreground">
          Your recent results show up here.
        </div>
      ) : (
        <div className="mt-2 flex max-h-[45vh] flex-col gap-1.5 overflow-y-auto pr-1 lg:max-h-[calc(100vh-8rem)]">
          {history.map((item) => (
            <div
              key={item.id}
              className="rounded-none border bg-background hover:bg-accent/30 transition-colors"
            >
              <button
                type="button"
                className="w-full text-left p-2"
                onClick={() => onSelectInput(item.inputLatex)}
                title="Click to reuse"
              >
                <div className="grid grid-cols-1 gap-1.5">
                  <div className="text-[10px] text-muted-foreground">Input</div>
                  <math-field
                    read-only
                    tabIndex={-1}
                    class="w-full bg-transparent text-foreground"
                  >
                    {item.inputLatex}
                  </math-field>
                  <div className="text-[10px] text-muted-foreground">Output</div>
                  <math-field
                    read-only
                    tabIndex={-1}
                    class="w-full bg-transparent text-foreground"
                  >
                    {item.resultLatex}
                  </math-field>
                </div>
              </button>
              <div className="border-t px-2 py-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <CopyButton
                    text={item.inputLatex}
                    label="Copy input"
                    title="Copy input LaTeX"
                  />
                  <CopyButton
                    text={item.resultLatex}
                    label="Copy output"
                    title="Copy output LaTeX"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveItem(item.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
