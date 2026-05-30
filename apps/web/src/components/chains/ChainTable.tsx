"use client";

import { useRouter } from "next/navigation";
import type { Chain } from "@/types";
import { formatUsd, formatNumber } from "@/lib/format";
import { metricValue } from "@/lib/metrics-calc";
import {
  useChainFilters,
  type SortField,
} from "@/hooks/useChainFilters";
import { addEvmChainToWallet, canAddToWallet, copyRpcUrl } from "@/lib/wallet";
import { ChainIcon } from "@/components/ui/ChainIcon";
import { SearchBar } from "./SearchBar";
import { FilterRail } from "./FilterRail";
import { ChainCard } from "./ChainCard";

export function ChainTable({ initialChains }: { initialChains: Chain[] }) {
  const router = useRouter();
  const { state, derived, actions } = useChainFilters(initialChains);
  const { rows, pageCount, total } = derived;

  const arrow = (f: SortField) =>
    state.sortField === f ? (state.order === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="flex flex-col gap-3">
      <SearchBar value={state.search} onChange={actions.updateSearch} />
      <FilterRail
        vms={state.vms}
        liveOnly={state.liveOnly}
        total={total}
        onToggleVm={actions.toggleVm}
        onToggleLiveOnly={actions.toggleLiveOnly}
      />

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-collapse font-mono text-xs">
          <thead>
            <tr className="text-faint">
              <Th className="text-left" onClick={() => actions.toggleSort("name")}>
                CHAIN{arrow("name")}
              </Th>
              <Th className="hidden text-left dev:table-cell">CHAIN ID</Th>
              <Th onClick={() => actions.toggleSort("tvl")}>TVL{arrow("tvl")}</Th>
              <Th onClick={() => actions.toggleSort("validators")}>
                VALID{arrow("validators")}
              </Th>
              <Th onClick={() => actions.toggleSort("daily_txs")}>
                TXNS{arrow("daily_txs")}
              </Th>
              <Th>BLK</Th>
              <Th className="text-left">VM</Th>
              <Th className="hidden text-left dev:table-cell">RPC</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => {
              const m = c.latestMetrics;
              return (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/chains/${c.slug}`)}
                  className={`cursor-pointer border-t border-row-line hover:bg-elevated ${
                    i % 2 === 1 ? "bg-surface-2/40" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 text-left text-foreground">
                    <span className="flex items-center gap-2">
                      <ChainIcon name={c.name} featured={c.isFeatured} />
                      {c.name}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 text-left text-muted dev:table-cell">
                    {c.evmChainId ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right text-line">{formatUsd(m?.tvlUsd)}</td>
                  <td className="px-3 py-2.5 text-right">{formatNumber(m?.validatorCount)}</td>
                  <td className="px-3 py-2.5 text-right">
                    {formatNumber(m ? metricValue(m, "dailyTxs") : null)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {m?.avgBlockTime != null ? (
                      `${m.avgBlockTime}s`
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-left text-dim">{c.vmType}</td>
                  <td className="hidden px-3 py-2.5 text-left dev:table-cell">
                    {c.rpcUrl ? (
                      <span className="text-pos-text">● live</span>
                    ) : (
                      <span className="text-faint">○ none</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-faint">
                    <span className="inline-flex gap-2">
                      {canAddToWallet(c) && (
                        <button
                          type="button"
                          aria-label="Add to wallet"
                          onClick={(e) => {
                            e.stopPropagation();
                            addEvmChainToWallet(c);
                          }}
                          className="hover:text-foreground"
                        >
                          ⊕
                        </button>
                      )}
                      {c.rpcUrl && (
                        <button
                          type="button"
                          aria-label="Copy RPC"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyRpcUrl(c);
                          }}
                          className="hover:text-foreground"
                        >
                          ⧉
                        </button>
                      )}
                      <span>→</span>
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-muted">
                  No chains match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((c) => (
          <ChainCard key={c.id} chain={c} />
        ))}
        {rows.length === 0 && (
          <p className="py-12 text-center text-sm text-muted">
            No chains match your filters.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] text-faint">
        <span>
          page {state.page + 1} of {pageCount}
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={state.page === 0}
            onClick={() => actions.setPage(Math.max(0, state.page - 1))}
            className="rounded border border-border bg-surface px-2.5 py-1 hover:text-foreground disabled:opacity-40"
          >
            ‹ prev
          </button>
          <button
            type="button"
            disabled={state.page >= pageCount - 1}
            onClick={() => actions.setPage(Math.min(pageCount - 1, state.page + 1))}
            className="rounded border border-border bg-surface px-2.5 py-1 hover:text-foreground disabled:opacity-40"
          >
            next ›
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  className,
  onClick,
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-2 font-normal ${className ?? "text-right"} ${
        onClick ? "cursor-pointer hover:text-foreground" : ""
      }`}
    >
      {children}
    </th>
  );
}
