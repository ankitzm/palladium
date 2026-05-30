"use client";

import { useState } from "react";
import { CopyButton } from "./CopyButton";

export interface CodeTab {
  label: string;
  raw: string;
  content: React.ReactNode;
}

interface CodeBlockProps {
  title?: string;
  method?: "GET" | "POST";
  raw?: string;
  children?: React.ReactNode;
  // When provided, renders a language/tool tab strip; overrides children/raw.
  tabs?: CodeTab[];
}

export function CodeBlock({ title, method, raw, children, tabs }: CodeBlockProps) {
  const [active, setActive] = useState(0);
  const activeTab = tabs?.[active];
  const copyText = activeTab?.raw ?? raw;
  const body = activeTab?.content ?? children;
  const showHeader = !!(title || method || tabs || raw);

  return (
    <div className="overflow-hidden rounded-md border border-border bg-code">
      {showHeader && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-line">
          {method && (
            <span
              className={`rounded px-2 py-0.5 font-mono text-[11px] ${
                method === "GET"
                  ? "bg-pos-soft text-pos-text"
                  : "bg-avax-red-soft text-avax-red-text"
              }`}
            >
              {method}
            </span>
          )}
          {title && !tabs && <span className="font-mono">{title}</span>}
          {tabs && (
            <div className="flex gap-1">
              {tabs.map((t, i) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`rounded-sm px-2 py-0.5 font-mono text-[11px] transition-colors ${
                    i === active
                      ? "bg-elevated text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          {copyText && (
            <span className="ml-auto text-[11px]">
              <CopyButton text={copyText} label="⧉ copy" />
            </span>
          )}
        </div>
      )}
      <pre className="overflow-x-auto p-3 font-mono text-[11.5px] leading-[1.7] text-line">
        {body}
      </pre>
    </div>
  );
}
