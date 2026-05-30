"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label,
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    try {
      navigator.clipboard?.writeText(text);
    } catch {
      // clipboard unavailable
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy"
      className={`text-dim hover:text-foreground transition-colors ${className ?? ""}`}
    >
      {copied ? "✓ copied" : (label ?? "⧉")}
    </button>
  );
}
