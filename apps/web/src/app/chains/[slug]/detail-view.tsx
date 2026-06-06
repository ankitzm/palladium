"use client";

import Link from "next/link";
import { useChainDetail } from "@/hooks/useChainDetail";
import { formatUsd, formatNumber, formatCompact, shortId } from "@/lib/format";
import { metricValue, pctChange } from "@/lib/metrics-calc";
import { MetricsChart } from "./metrics-chart";
import { MetricCard } from "@/components/chain-detail/MetricCard";
import { NetworkParams } from "@/components/chain-detail/NetworkParams";
import { ValidatorList } from "@/components/chain-detail/ValidatorList";
import { ProtocolList } from "@/components/chain-detail/ProtocolList";
import { ConnectSnippet } from "@/components/chain-detail/ConnectSnippet";
import { WalletButton } from "@/components/chain-detail/WalletButton";
import { ChainIcon } from "@/components/ui/ChainIcon";
import { CopyButton } from "@/components/ui/CopyButton";

export function ChainDetailView({ slug, days }: { slug: string; days: number }) {
  const { chain: chainQuery, metrics: metricsQuery } = useChainDetail(slug, days);
  const chain = chainQuery.data?.chain;

  if (chainQuery.isError) {
    return (
      <div className="py-20 text-center text-sm text-muted">Chain not found.</div>
    );
  }
  if (!chain) return null;

  const m = chain.latestMetrics;
  const history = metricsQuery.data?.metrics;

  return (
    <div>
      <div className="py-3 font-mono text-xs text-faint">
        <Link href="/" className="text-muted hover:text-foreground">Palladium</Link> /{" "}
        <Link href="/chains" className="hover:text-foreground">chains</Link> /{" "}
        <span className="text-avax-red-text">{chain.slug}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <ChainIcon name={chain.name} featured={chain.isFeatured} size={48} />
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[22px] font-medium">{chain.name}</span>
              {chain.rpcUrl && (
                <span className="flex items-center gap-1 rounded bg-pos-soft px-2 py-0.5 text-[11px] text-pos-text">
                  <span className="h-1.5 w-1.5 rounded-full bg-pos" />live
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[11px]">
              <span className="rounded bg-elevated px-2 py-0.5 text-muted">{chain.vmType}</span>
              {chain.evmChainId != null && (
                <span className="rounded bg-elevated px-2 py-0.5 text-muted">chainId {chain.evmChainId}</span>
              )}
              {chain.category && (
                <span className="rounded bg-elevated px-2 py-0.5 text-muted">{chain.category}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <WalletButton chain={chain} />
          {chain.explorerUrl && (
            <a href={chain.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong bg-surface px-3.5 py-2 text-xs text-line hover:bg-elevated">
              ↗ Explorer
            </a>
          )}
          {chain.websiteUrl && (
            <a href={chain.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong bg-surface px-3.5 py-2 text-xs text-line hover:bg-elevated">
              ↗ Website
            </a>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard label="TVL" value={formatUsd(m?.tvlUsd)} change={pctChange(history, "tvlUsd")} />
        <MetricCard
          label={m?.actualDailyTxs != null ? "Daily txns" : "Est. daily txns"}
          value={formatNumber(m ? metricValue(m, "dailyTxs") : null)}
          change={pctChange(history, "dailyTxs")}
        />
        <MetricCard
          label="Validators"
          value={formatNumber(m?.validatorCount)}
          change={pctChange(history, "validatorCount")}
          sub={m?.totalStakeWeight ? `${formatCompact(m.totalStakeWeight)} staked` : undefined}
        />
        <MetricCard
          label="Avg block"
          value={m?.avgBlockTime != null ? `${m.avgBlockTime}s` : "—"}
          sub={m?.avgGasPrice != null ? `${m.avgGasPrice} gwei` : "no RPC"}
        />
      </div>

      {m &&
        (m.feesPaid != null ||
          m.activeSenders != null ||
          m.contractsDeployed != null ||
          m.cumulativeTxCount != null) && (
          <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <MetricCard
              label="Fees paid (24h)"
              value={m.feesPaid != null ? formatUsd(m.feesPaid) : "—"}
            />
            <MetricCard
              label="Active senders"
              value={formatNumber(m.activeSenders)}
              sub={m.activeAddresses != null ? `${formatNumber(m.activeAddresses)} active addrs` : undefined}
            />
            <MetricCard
              label="Contracts (24h)"
              value={formatNumber(m.contractsDeployed)}
              sub={m.cumulativeContracts != null ? `${formatNumber(m.cumulativeContracts)} total` : undefined}
            />
            <MetricCard
              label="Cumulative txns"
              value={formatNumber(m.cumulativeTxCount)}
            />
          </div>
        )}

      <div className="grid gap-3.5 md:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-3.5">
          {history && history.length > 1 ? (
            <div className="rounded-md border border-border bg-surface p-3.5">
              <MetricsChart metrics={history} />
            </div>
          ) : (
            <div className="rounded-md border border-border bg-surface p-6 text-center text-xs text-faint">
              No time-series metrics yet for this chain.
            </div>
          )}

          {chain.rpcUrl && chain.evmChainId != null && <ConnectSnippet chain={chain} />}
        </div>

        <div className="flex flex-col gap-3.5">
          <NetworkParams chain={chain} />
          <ProtocolList slug={chain.slug} />
          <ValidatorList validators={chain.validators} totalStakeWeight={m?.totalStakeWeight} />

          <div className="rounded-md border border-border bg-surface p-3.5">
            <div className="mb-3 text-[13px] text-line">Technical IDs</div>
            <div className="flex flex-col gap-2.5 font-mono text-[11px]">
              <IdRow label="subnetId" value={chain.subnetId} />
              <IdRow label="blockchainId" value={chain.blockchainId} />
              <IdRow label="vmId" value={chain.vmId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-faint">
        <span>{label}</span>
        <CopyButton text={value} />
      </div>
      <div className="truncate text-line">{shortId(value, 12, 8)}</div>
    </div>
  );
}
