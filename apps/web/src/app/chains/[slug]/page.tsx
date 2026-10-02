import Link from "next/link";
import { getChainBySlug, getMetricsHistory } from "@/lib/api";
import { formatUsd, formatNumber, formatCompact, vmTypeBadge, categoryBadge } from "@/lib/format";
import { MetricsChart } from "./metrics-chart";

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="ml-2 text-[10px] text-muted hover:text-foreground transition-colors"
      title="Copy"
    >
      [copy]
    </button>
  );
}

function DetailRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted shrink-0">{label}</span>
      <span className="text-xs text-foreground font-mono text-right ml-4 truncate max-w-[400px]">
        {value}
      </span>
    </div>
  );
}

export default async function ChainDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ chain }, metricsData] = await Promise.all([
    getChainBySlug(slug),
    getMetricsHistory(slug, 30).catch(() => null),
  ]);

  const m = chain.latestMetrics;
  const vm = vmTypeBadge(chain.vmType);
  const cat = categoryBadge(chain.category);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted">
        <Link href="/chains" className="hover:text-foreground transition-colors">
          Chains
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{chain.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-avax-red-dim text-avax-red font-bold text-lg">
            {chain.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                {chain.name}
              </h1>
              {chain.isFeatured && (
                <span className="text-avax-red">★</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${vm.color}`}
              >
                {vm.label}
              </span>
              {cat && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${cat.color}`}
                >
                  {cat.label}
                </span>
              )}
              {chain.tokenSymbol && (
                <span className="text-xs text-muted">
                  {chain.tokenSymbol}
                </span>
              )}
            </div>
            {chain.description && (
              <p className="text-sm text-muted mt-2 max-w-xl">
                {chain.description}
              </p>
            )}
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-2">
          {chain.websiteUrl && (
            <a
              href={chain.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-md border border-border bg-card hover:bg-card-hover text-foreground transition-colors"
            >
              Website ↗
            </a>
          )}
          {chain.explorerUrl && (
            <a
              href={chain.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-md border border-border bg-card hover:bg-card-hover text-foreground transition-colors"
            >
              Explorer ↗
            </a>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          label="Validators"
          value={formatNumber(m?.validatorCount)}
          sub={
            m?.totalStakeWeight
              ? `${formatCompact(m.totalStakeWeight)} weight`
              : undefined
          }
        />
        <MetricCard label="TVL" value={formatUsd(m?.tvlUsd)} />
        <MetricCard
          label={m?.actualDailyTxs != null ? "Daily Txs" : "Est. Daily Txs"}
          value={formatNumber(m?.actualDailyTxs ?? m?.estimatedDailyTxs)}
        />
        <MetricCard
          label="Gas Price"
          value={m?.avgGasPrice != null ? `${m.avgGasPrice} gwei` : "—"}
        />
        <MetricCard
          label="Block Time"
          value={m?.avgBlockTime != null ? `${m.avgBlockTime}s` : "—"}
        />
      </div>

      {/* Chart */}
      {metricsData && metricsData.metrics.length > 1 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground mb-4">Metrics History</h2>
          <MetricsChart metrics={metricsData.metrics} />
        </div>
      )}

      {/* Technical Details */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-semibold text-foreground mb-3">
          Technical Details
        </h2>
        <div className="space-y-0">
          <DetailRow label="Blockchain ID" value={chain.blockchainId} copyable />
          <DetailRow label="Subnet ID" value={chain.subnetId} copyable />
          <DetailRow label="VM ID" value={chain.vmId} copyable />
          {chain.evmChainId && (
            <DetailRow
              label="EVM Chain ID"
              value={String(chain.evmChainId)}
            />
          )}
          {chain.rpcUrl && (
            <DetailRow label="RPC URL" value={chain.rpcUrl} copyable />
          )}
          {m?.latestBlockNumber && (
            <DetailRow
              label="Latest Block"
              value={formatCompact(m.latestBlockNumber)}
            />
          )}
          {chain.createBlockTimestamp && (
            <DetailRow
              label="Created"
              value={new Date(
                chain.createBlockTimestamp * 1000,
              ).toLocaleDateString()}
            />
          )}
        </div>
      </div>
    </div>
  );
}
