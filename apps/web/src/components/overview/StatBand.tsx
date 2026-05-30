import { formatChange } from "@/lib/format";

export interface StatItem {
  value: string;
  unit?: string;
  label: string;
  change?: number | null;
}

export function StatBand({ items }: { items: StatItem[] }) {
  return (
    <div className="border-y border-border">
      <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
        {items.map((s) => {
          const ch = formatChange(s.change);
          return (
            <div key={s.label} className="bg-background px-5 py-4">
              <div className="text-[28px] font-medium leading-none">
                {s.value}
                {s.unit && <span className="text-base text-dim"> {s.unit}</span>}
              </div>
              <div className="mt-2 text-[11px] uppercase tracking-wide text-dim">
                {s.label}
                {ch && <span className={`ml-1.5 ${ch.cls}`}>{ch.text}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
