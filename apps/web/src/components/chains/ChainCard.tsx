import Link from "next/link";
import type { Chain } from "@/types";
import { formatUsd, formatNumber } from "@/lib/format";
import { metricValue } from "@/lib/metrics-calc";
import { ChainIcon } from "@/components/ui/ChainIcon";

// Mobile representation of a chain row — tables convert to these stacked cards
// rather than horizontally cramping.
export function ChainCard({ chain }: { chain: Chain }) {
  const m = chain.latestMetrics;
  const dimmed = !chain.rpcUrl;
  return (
    <Link
      href={`/chains/${chain.slug}`}
      className={`flex flex-col gap-2 rounded-md border border-border bg-surface p-3 ${
        dimmed ? "opacity-75" : ""
      }`}
    >
      <div className="flex items-center gap-2.5">
        <ChainIcon name={chain.name} featured={chain.isFeatured} size={28} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{chain.name}</div>
          <div className="font-mono text-[11px] text-faint">
            {chain.evmChainId != null ? `id ${chain.evmChainId} · ` : ""}
            {chain.vmType}
          </div>
        </div>
        <span className="font-mono text-[11px]">
          {chain.rpcUrl ? (
            <span className="text-pos-text">● live</span>
          ) : (
            <span className="text-faint">○ none</span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-4 font-mono text-[11px] text-dim">
        <span>
          TVL <span className="text-line">{formatUsd(m?.tvlUsd)}</span>
        </span>
        <span>
          val{" "}
          <span className="text-line">{formatNumber(m?.validatorCount)}</span>
        </span>
        <span>
          txns{" "}
          <span className="text-line">
            {formatNumber(m ? metricValue(m, "dailyTxs") : null)}
          </span>
        </span>
      </div>
    </Link>
  );
}
