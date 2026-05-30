// Syntax-highlight span helpers for code blocks. Pure (no "use client"), so they
// can be called from server components (e.g. /api-docs) at module-eval time.
export const syn = {
  k: (s: string) => <span className="text-[#c792ea]">{s}</span>,
  s: (s: string) => <span className="text-[#5ee49b]">{s}</span>,
  n: (s: string | number) => <span className="text-[#ffb86b]">{s}</span>,
  p: (s: string) => <span className="text-[#7fb6ff]">{s}</span>,
  c: (s: string) => <span className="text-faint">{s}</span>,
};
