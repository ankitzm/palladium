import Link from "next/link";
import type { Chain } from "@/types";
import { formatUsd, formatNumber } from "@/lib/format";
import { metricValue } from "@/lib/metrics-calc";
import { ChainIcon } from "@/components/ui/ChainIcon";

export function SpotlightCard({
  chain,
  reason,
}: {
  chain: Chain;
  reason?: string;
}) {
  const m = chain.latestMetrics;
  // Prefer the chain's own description; otherwise state the verifiable reason
  // it's featured. Never assert an unverified claim (e.g. "most active").
  const blurb = chain.description ?? reason;
  return (
    <div className="grid items-center gap-4 rounded-[12px] border border-border bg-surface p-5 md:grid-cols-[1.1fr_1fr]">
      <div>
        <div className="mb-2.5 flex items-center gap-3">
          <ChainIcon name={chain.name} featured={chain.isFeatured} size={40} />
          <div>
            <div className="text-[19px] font-medium">{chain.name}</div>
            <div className="text-xs text-dim">
              {chain.category ? `${chain.category} L1 · ` : ""}
              {chain.vmType}
            </div>
          </div>
        </div>
        {blurb && (
          <p className="max-w-sm text-[13px] leading-relaxed text-muted">
            {blurb}
          </p>
        )}
        <Link
          href={`/chains/${chain.slug}`}
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-sm bg-avax-red px-3 py-2 text-xs font-medium text-background"
        >
          View chain detail →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Mini label="TVL" value={formatUsd(m?.tvlUsd)} />
        <Mini
          label="24h txns"
          value={formatNumber(m ? metricValue(m, "dailyTxs") : null)}
        />
        <Mini label="Validators" value={formatNumber(m?.validatorCount)} />
        <Mini
          label="Avg block"
          value={m?.avgBlockTime != null ? `${m.avgBlockTime}s` : "—"}
        />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm bg-surface-2 p-3">
      <div className="text-[11px] text-dim">{label}</div>
      <div className="mt-0.5 text-lg font-medium">{value}</div>
    </div>
  );
}
