import Link from "next/link";
import type { ValidatorRow } from "@/types";
import { formatCompact, shortId } from "@/lib/format";
import { ChainIcon } from "@/components/ui/ChainIcon";

export function ValidatorTable({ validators }: { validators: ValidatorRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse font-mono text-xs">
        <thead>
          <tr className="text-faint">
            <th className="px-3 py-2 text-left font-normal">#</th>
            <th className="px-3 py-2 text-left font-normal">NODE ID</th>
            <th className="px-3 py-2 text-left font-normal">CHAIN</th>
            <th className="px-3 py-2 text-right font-normal">WEIGHT</th>
            <th className="px-3 py-2 text-right font-normal">UPTIME</th>
            <th className="px-3 py-2 text-right font-normal">DELEGATORS</th>
            <th className="px-3 py-2 text-left font-normal">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {validators.map((v, i) => (
            <tr
              key={`${v.chain.slug}-${v.nodeId}`}
              className={`border-t border-row-line ${i % 2 === 1 ? "bg-surface-2/40" : ""}`}
            >
              <td className="px-3 py-2.5 text-left text-faint">{String(i + 1).padStart(2, "0")}</td>
              <td className="px-3 py-2.5 text-left text-line">{shortId(v.nodeId, 14, 4)}</td>
              <td className="px-3 py-2.5 text-left">
                <Link href={`/chains/${v.chain.slug}`} className="flex items-center gap-2 text-foreground hover:text-avax-red-text">
                  <ChainIcon name={v.chain.name} featured={v.chain.isFeatured} />
                  {v.chain.name}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-right text-line">
                {v.weight != null ? formatCompact(v.weight) : <span className="text-faint">—</span>}
              </td>
              <td className="px-3 py-2.5 text-right">
                {v.uptimePercent != null ? `${v.uptimePercent.toFixed(1)}%` : <span className="text-faint">—</span>}
              </td>
              <td className="px-3 py-2.5 text-right">
                {v.delegatorCount != null ? v.delegatorCount : <span className="text-faint">—</span>}
              </td>
              <td className="px-3 py-2.5 text-left">
                {v.isConnected ? (
                  <span className="text-pos-text">● connected</span>
                ) : (
                  <span className="text-faint">○ offline</span>
                )}
              </td>
            </tr>
          ))}
          {validators.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-12 text-center text-muted">
                No validator data available yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
