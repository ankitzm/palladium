export function formatUsd(value: number | null | undefined): string {
  // Honest by default: missing data AND a genuine zero both render as "—".
  // The brand never shows an invented "$0" (DESIGN.md / PRODUCT.md).
  if (!value) return "—";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${Math.round(value / 1e3)}K`;
  return value.toLocaleString();
}

export function formatCompact(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

export function formatChange(
  pct: number | null | undefined,
): { text: string; label: string; cls: string } | null {
  if (pct == null) return null;
  const up = pct >= 0;
  const magnitude = `${Math.abs(pct).toFixed(1)}%`;
  return {
    // Visible text keeps the ▲/▼ shape so state is never color-only.
    text: `${up ? "▲" : "▼"}${magnitude}`,
    // Accessible name for screen readers (the glyph alone reads poorly).
    label: `${up ? "up" : "down"} ${magnitude}`,
    cls: up ? "text-pos-text" : "text-neg",
  };
}

// Parses human-readable magnitudes ("100M", "1.5b", "50k", "200") into a number.
// Inverse of formatUsd/formatNumber. Returns null for unparseable input so
// callers (e.g. query search) can ignore bad tokens.
export function parseHumanNum(input: string): number | null {
  const m = input.trim().match(/^([\d.]+)\s*([kmbt]?)$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const mult: Record<string, number> = { "": 1, k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
  return n * mult[m[2].toLowerCase()];
}

export function chainIdLabel(id: number | null | undefined): string {
  if (id == null) return "—";
  return `${id} · 0x${id.toString(16)}`;
}

export function shortId(s: string | null | undefined, head = 10, tail = 8): string {
  if (!s) return "—";
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function vmTypeBadge(vmType: string): { label: string } {
  switch (vmType) {
    case "subnet-evm":
      return { label: "subnet-evm" };
    case "evm-custom":
      return { label: "evm-custom" };
    default:
      return { label: vmType || "custom" };
  }
}

export function categoryBadge(category: string | null): { label: string } | null {
  if (!category) return null;
  return { label: category.charAt(0).toUpperCase() + category.slice(1) };
}

// Compact relative time, e.g. "just now", "5 min ago", "3 hr ago", "2 days ago".
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
