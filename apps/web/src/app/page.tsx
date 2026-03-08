export const dynamic = "force-dynamic";

import Link from "next/link";
import { getOverview } from "@/lib/api";
import { formatUsd, formatNumber, vmTypeBadge, categoryBadge } from "@/lib/format";
import type { Chain } from "@/lib/api";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs font-medium text-muted uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function ChainRow({ chain, metric }: { chain: Chain; metric: "tvl" | "txs" }) {
  const m = chain.latestMetrics;
  const cat = categoryBadge(chain.category);
  const vm = vmTypeBadge(chain.vmType);

  return (
    <Link
      href={`/chains/${chain.slug}`}
      className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-card-hover transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-avax-red-dim text-avax-red font-bold text-xs">
          {chain.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">
              {chain.name}
            </span>
            {chain.isFeatured && (
              <span className="text-avax-red text-[10px]">★</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${vm.color}`}
            >
              {vm.label}
            </span>
            {cat && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${cat.color}`}
              >
                {cat.label}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        {metric === "tvl" ? (
          <>
            <p className="font-semibold text-foreground">
              {formatUsd(m?.tvlUsd)}
            </p>
            <p className="text-xs text-muted">
              {formatNumber(m?.validatorCount)} validators
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-foreground">
              {formatNumber(m?.estimatedDailyTxs)}
            </p>
            <p className="text-xs text-muted">daily txs</p>
          </>
        )}
      </div>
    </Link>
  );
}

export default async function OverviewPage() {
  const data = await getOverview();

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-avax-red">PALLADIUM</span>
        </h1>
        <p className="mt-2 text-muted max-w-lg mx-auto">
          Discover, compare, and evaluate every Avalanche L1 chain.
          Real-time validators, TVL, and on-chain activity.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total L1s" value={formatNumber(data.totalChains)} />
        <StatCard label="Subnets" value={formatNumber(data.totalSubnets)} />
        <StatCard label="EVM Chains" value={formatNumber(data.evmChains)} />
        <StatCard label="Total TVL" value={formatUsd(data.totalTvlUsd)} />
      </div>

      {/* Leaderboards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Top by TVL</h2>
            <Link
              href="/chains?sort=tvl"
              className="text-xs text-avax-red hover:text-avax-red-hover"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {data.topChainsByTvl
              .filter((c) => (c.latestMetrics?.tvlUsd ?? 0) > 0)
              .slice(0, 8)
              .map((chain) => (
                <ChainRow key={chain.id} chain={chain} metric="tvl" />
              ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">
              Top by Daily Transactions
            </h2>
            <Link
              href="/chains?sort=daily_txs"
              className="text-xs text-avax-red hover:text-avax-red-hover"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {data.topChainsByTxs
              .filter((c) => (c.latestMetrics?.estimatedDailyTxs ?? 0) > 0)
              .slice(0, 8)
              .map((chain) => (
                <ChainRow key={chain.id} chain={chain} metric="txs" />
              ))}
          </div>
        </div>
      </div>

      {/* Last updated */}
      {data.lastIngestionAt && (
        <p className="text-center text-xs text-muted">
          Last updated:{" "}
          {new Date(data.lastIngestionAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
