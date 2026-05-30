"use client";

import { useDevMode } from "@/hooks/useDevMode";

export function DevModeToggle() {
  const { dev, toggle } = useDevMode();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dev}
      className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors"
    >
      <span className="hidden sm:inline">Developer mode</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          dev ? "bg-avax-red" : "bg-chip"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            dev ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}
