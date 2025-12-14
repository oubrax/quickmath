import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/utils/copyToClipboard";

export default function CopyButton({
  text,
  label = "Copy",
  title,
  className,
  variant = "ghost",
  size = "icon-sm",
  stopPropagation = true,
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const value = String(text ?? "");
  const disabled = !value;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      onClick={async (e) => {
        if (stopPropagation) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (!value) return;

        const ok = await copyToClipboard(value);
        if (!ok) return;

        setCopied(true);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          setCopied(false);
        }, 1200);
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  );
}

