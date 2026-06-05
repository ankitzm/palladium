"use client";

import Link from "next/link";
import { useOverview } from "@/hooks/useOverview";
import type { Chain } from "@/types";
import { formatUsd, formatNumber, timeAgo } from "@/lib/format";
import { metricValue, isStale } from "@/lib/metrics-calc";
import { StatBand } from "@/components/overview/StatBand";
import { SpotlightCard } from "@/components/overview/SpotlightCard";
import { OverviewSkeleton, OverviewError } from "@/components/overview/OverviewStates";
import { ChainIcon } from "@/components/ui/ChainIcon";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { syn } from "@/components/ui/syntax";

function liveRpcCount(chains: Chain[]) {
  return chains.filter((c) => !!c.rpcUrl).length;
}

export function OverviewView() {
  const { data, isError, refetch, isFetching } = useOverview();
  if (isError && !data)
    return <OverviewError onRetry={() => refetch()} retrying={isFetching} />;
  if (!data) return <OverviewSkeleton />;

  const top = data.topChainsByTvl ?? [];
  const spotlight =
    data.spotlightChain ||
    (data.spotlightSlug && top.find((c) => c.slug === data.spotlightSlug)) ||
    top.find((c) => c.isFeatured) ||
    top[0] ||
    data.topChainsByTxs?.[0];
  const rows = top.slice(0, 8);
  const spotlightReason = !spotlight
    ? undefined
    : spotlight.isFeatured
      ? "Featured chain"
      : spotlight.id === top[0]?.id
        ? "Highest TVL on the index right now"
        : undefined;

  const latestDate =
    data.asOfDate ?? rows.find((c) => c.latestMetrics)?.latestMetrics?.date ?? null;
  const stale = isStale(latestDate);

  return (
    <div>
      <div className="py-7">
        <p className="text-[11px] tracking-[2px] text-avax-red">
          THE AVALANCHE L1 INDEX
        </p>
        <h1 className="mt-3 max-w-xl text-balance font-serif text-[34px] font-medium leading-[1.08] md:text-[40px]">
          {formatNumber(data.totalChains)} sovereign chains.
          <br />
          One source of truth.
        </h1>
      </div>

      <StatBand
        items={[
          { value: formatUsd(data.totalTvlUsd), label: "Total TVL", change: data.tvlChangePct },
          {
            value: formatNumber(data.totalValidators ?? null),
            label: "Validators",
            change: data.validatorsChangePct,
          },
          {
            value: formatNumber(data.total24hTxns ?? null),
            label: "24h txns",
            change: data.txnsChangePct,
          },
          { value: formatNumber(data.totalChains), label: "L1s indexed" },
        ]}
      />

      <div className="hidden dev:block">
        <div className="mb-3 mt-6 text-[11px] tracking-[1.5px] text-muted">
          API CONSOLE · public, no key required
        </div>
        <div className="grid gap-3.5 md:grid-cols-[1.3fr_1fr]">
          <CodeBlock method="GET" title="/api/overview" raw="curl https://palladium.xyz/api/overview">
            {syn.c("$ curl palladium.xyz/api/overview")}
            {"\n\n{\n  "}
            {syn.p('"totalChains"')}: {syn.n(data.totalChains)},{"\n  "}
            {syn.p('"totalTvlUsd"')}: {syn.n(Math.round(data.totalTvlUsd))},{"\n  "}
            {syn.p('"evmChains"')}: {syn.n(data.evmChains)}
            {"\n}"}
          </CodeBlock>
          <div className="flex flex-col gap-2">
            {[
              ["GET", "/chains"],
              ["GET", "/chains/:slug"],
              ["GET", "/chains/:slug/metrics"],
              ["POST", "/ingest"],
            ].map(([method, path]) => (
              <div key={path} className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 font-mono text-[11.5px]">
                <span className={`rounded px-2 py-0.5 text-[11px] ${method === "GET" ? "bg-pos-soft text-pos-text" : "bg-avax-red-soft text-avax-red-text"}`}>
                  {method}
                </span>
                {path}
              </div>
            ))}
          </div>
        </div>
      </div>

      {spotlight && (
        <div className="mt-6">
          <div className="mb-3 text-[11px] tracking-[1.5px] text-muted">CHAIN IN FOCUS</div>
          <SpotlightCard chain={spotlight} reason={spotlightReason} />
        </div>
      )}

      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-medium">All chains</h2>
          <div className="flex items-center gap-2.5 font-mono text-[11px]">
            {stale && latestDate && (
              <span className="rounded bg-warn-soft px-2 py-0.5 text-warn">
                data from {latestDate}
              </span>
            )}
            {data.lastIngestionAt && (
              <span className="flex items-center gap-1.5 text-faint">
                <span className="h-1.5 w-1.5 rounded-full bg-pos" />
                synced {timeAgo(data.lastIngestionAt)}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse font-mono text-xs">
            <caption className="sr-only">
              Top Avalanche L1s by total value locked
            </caption>
            <thead>
              <tr className="text-faint">
                <th className="px-3 py-2 text-left font-normal">#</th>
                <th className="px-3 py-2 text-left font-normal">CHAIN</th>
                <th className="px-3 py-2 text-right font-normal">TVL</th>
                <th className="px-3 py-2 text-right font-normal">VALID</th>
                <th className="px-3 py-2 text-right font-normal">TXNS</th>
                <th className="px-3 py-2 text-right font-normal">BLK</th>
                <th className="hidden dev:table-cell px-3 py-2 text-left font-normal text-avax-red-text">CHAIN ID</th>
                <th className="hidden dev:table-cell px-3 py-2 text-left font-normal text-avax-red-text">RPC</th>
                <th className="px-3 py-2 text-left font-normal">VM</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-faint">
                    No chains indexed yet. Run the ingestion pipeline to populate
                    the index.
                  </td>
                </tr>
              )}
              {rows.map((c, i) => {
                const m = c.latestMetrics;
                return (
                  <tr key={c.id} className={`border-t border-row-line ${i % 2 === 1 ? "bg-surface-2/40" : ""}`}>
                    <td className="px-3 py-2.5 text-left text-faint">{String(i + 1).padStart(2, "0")}</td>
                    <td className="px-3 py-2.5 text-left">
                      <Link href={`/chains/${c.slug}`} className="flex items-center gap-2 text-foreground hover:text-avax-red-text">
                        <ChainIcon name={c.name} featured={c.isFeatured} />
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right text-line">{formatUsd(m?.tvlUsd)}</td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(m?.validatorCount)}</td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(m ? metricValue(m, "dailyTxs") : null)}</td>
                    <td className="px-3 py-2.5 text-right">{m?.avgBlockTime != null ? `${m.avgBlockTime}s` : <span className="text-faint">—</span>}</td>
                    <td className="hidden dev:table-cell px-3 py-2.5 text-left text-muted">{c.evmChainId ?? "—"}</td>
                    <td className="hidden dev:table-cell px-3 py-2.5 text-left">{c.rpcUrl ? <span className="text-pos-text"><span aria-hidden="true">●</span> live</span> : <span className="text-faint"><span aria-hidden="true">○</span> none</span>}</td>
                    <td className="px-3 py-2.5 text-left text-dim">{c.vmType}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-2.5 flex items-center justify-between font-mono text-[11px] text-faint">
          <span>showing {rows.length} · {liveRpcCount(rows)} with live RPC</span>
          <Link href="/chains" className="text-avax-red-text">view all chains <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </div>
  );
}
