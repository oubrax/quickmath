import { forwardRef } from "react";
import CopyButton from "@/components/CopyButton";

const InputCard = forwardRef(function InputCard(
  { value, onValueChange, onEvaluate, onClear },
  ref,
) {
  return (
    <div className="rounded-none border bg-card p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">Input</div>
        <CopyButton text={value} label="Copy input" title="Copy input LaTeX" />
      </div>
      <math-field
        ref={ref}
        multiline
        class="mt-1 w-full text-xl bg-background text-foreground min-h-[7rem] sm:min-h-[9rem] lg:min-h-[11rem] focus:outline-none rounded-none border p-2 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        onInput={(evt) => onValueChange(evt.target.value)}
        onKeyDown={(evt) => {
          if (evt.key === "Enter" && !evt.shiftKey) {
            evt.preventDefault();
            onEvaluate();
          }
          if (evt.key === "Escape") {
            evt.preventDefault();
            onClear();
          }
          if (evt.ctrlKey && (evt.key === "+" || evt.key === "-")) {
            evt.preventDefault();
            const currentSize = window.getComputedStyle(
              evt.currentTarget,
            ).fontSize;
            const size = parseFloat(currentSize);
            const newSize = evt.key === "+" ? size * 1.1 : size * 0.9;
            evt.currentTarget.style.fontSize = `${newSize}px`;
          }
        }}
        onClick={(evt) => evt.currentTarget.focus()}
      />
    </div>
  );
});

export default InputCard;
