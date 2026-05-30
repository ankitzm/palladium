import type { ChainValidator } from "@/types";
import { formatCompact, shortId } from "@/lib/format";

const PREVIEW = 6;

export function ValidatorList({
  validators,
  totalStakeWeight,
}: {
  validators: ChainValidator[] | undefined;
  totalStakeWeight: number | null | undefined;
}) {
  const list = validators ?? [];
  const shown = list.slice(0, PREVIEW);
  const remaining = list.length - shown.length;

  return (
    <div className="rounded-md border border-border bg-surface p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] text-line">Validators</span>
        <span className="font-mono text-[11px] text-faint">{list.length}</span>
      </div>

      {list.length === 0 ? (
        <p className="text-xs text-faint">No validator data yet.</p>
      ) : (
        <div className="flex flex-col gap-2 font-mono text-[11px]">
          {shown.map((v) => (
            <div key={v.nodeId} className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-line">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    v.isConnected ? "bg-pos" : "bg-chip"
                  }`}
                />
                {shortId(v.nodeId, 12, 4)}
              </span>
              <span className="text-dim">
                {v.uptimePercent != null
                  ? `${v.uptimePercent.toFixed(1)}%`
                  : v.weight != null
                    ? formatCompact(v.weight)
                    : "—"}
              </span>
            </div>
          ))}
          {remaining > 0 && (
            <div className="pt-1 text-faint">+ {remaining} more</div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-row-line pt-2.5 text-[11px]">
        <span className="text-dim">total stake weight</span>
        <span className="font-mono text-line">
          {totalStakeWeight ? formatCompact(totalStakeWeight) : "—"}
        </span>
      </div>
    </div>
  );
}
