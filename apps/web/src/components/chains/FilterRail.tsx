"use client";

import { VM_TYPES } from "@/hooks/useChainFilters";

export function FilterRail({
  vms,
  liveOnly,
  total,
  onToggleVm,
  onToggleLiveOnly,
}: {
  vms: Set<string>;
  liveOnly: boolean;
  total: number;
  onToggleVm: (v: string) => void;
  onToggleLiveOnly: () => void;
}) {
  const hasActive = vms.size > 0 || liveOnly;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-faint">VM</span>
        {VM_TYPES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onToggleVm(v)}
            className={`rounded-md px-2.5 py-1 font-mono text-[11px] ${
              vms.has(v)
                ? "bg-avax-red text-background"
                : "border border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {v}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border-strong" />
        <span className="text-[11px] text-faint">RPC</span>
        <button
          type="button"
          onClick={onToggleLiveOnly}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] ${
            liveOnly
              ? "bg-avax-red text-background"
              : "border border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-pos" />
          live only
        </button>
        <span className="ml-auto font-mono text-[11px] text-muted">
          {total} results
        </span>
      </div>

      {hasActive && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-faint">Active:</span>
          {[...vms].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onToggleVm(v)}
              className="flex items-center gap-1 rounded-sm bg-avax-red-soft px-2 py-0.5 font-mono text-[11px] text-avax-red-text"
            >
              {v} ×
            </button>
          ))}
          {liveOnly && (
            <button
              type="button"
              onClick={onToggleLiveOnly}
              className="flex items-center gap-1 rounded-sm bg-avax-red-soft px-2 py-0.5 font-mono text-[11px] text-avax-red-text"
            >
              live only ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
