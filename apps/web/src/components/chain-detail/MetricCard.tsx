import { formatChange } from "@/lib/format";

export function MetricCard({
  label,
  value,
  sub,
  subClass,
  change,
}: {
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
  change?: number | null;
}) {
  const ch = formatChange(change);
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <p className="text-[11px] text-dim">{label}</p>
      <p className="mt-1 text-xl font-medium text-foreground">{value}</p>
      {ch ? (
        <p className={`mt-0.5 text-[11px] ${ch.cls}`}>{ch.text}</p>
      ) : sub ? (
        <p className={`mt-0.5 text-[11px] ${subClass ?? "text-dim"}`}>{sub}</p>
      ) : null}
    </div>
  );
}
