"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatUsd, formatNumber, vmTypeBadge, categoryBadge } from "@/lib/format";
import type { Chain } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

type SortField = "name" | "tvl" | "validators" | "daily_txs";

export default function ChainsPage() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vmFilter, setVmFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("tvl");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetch(`${API_URL}/api/chains?limit=500`)
      .then((r) => r.json())
      .then((data) => {
        setChains(data.chains);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = chains;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.slug.includes(q) ||
          c.blockchainId.toLowerCase().includes(q),
      );
    }

    if (vmFilter !== "all") {
      result = result.filter((c) => c.vmType === vmFilter);
    }

    result.sort((a, b) => {
      const m1 = a.latestMetrics;
      const m2 = b.latestMetrics;
      let v1: number, v2: number;
      switch (sortField) {
        case "name":
          return sortOrder === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case "tvl":
          v1 = m1?.tvlUsd ?? 0;
          v2 = m2?.tvlUsd ?? 0;
          break;
        case "validators":
          v1 = m1?.validatorCount ?? 0;
          v2 = m2?.validatorCount ?? 0;
          break;
        case "daily_txs":
          v1 = Math.max(m1?.actualDailyTxs ?? 0, m1?.estimatedDailyTxs ?? 0);
          v2 = Math.max(m2?.actualDailyTxs ?? 0, m2?.estimatedDailyTxs ?? 0);
          break;
        default:
          v1 = 0;
          v2 = 0;
      }
      return sortOrder === "asc" ? v1 - v2 : v2 - v1;
    });

    return result;
  }, [chains, search, vmFilter, sortField, sortOrder]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
  }

  const arrow = (field: SortField) =>
    sortField === field ? (sortOrder === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Chain Directory</h1>
        <p className="text-sm text-muted mt-1">
          {loading
            ? "Loading..."
            : `${filtered.length} of ${chains.length} chains`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search chains..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-avax-red w-64"
        />
        <select
          value={vmFilter}
          onChange={(e) => setVmFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-avax-red"
        >
          <option value="all">All VM Types</option>
          <option value="subnet-evm">SubnetEVM</option>
          <option value="evm-custom">EVM Custom</option>
          <option value="custom">Custom VM</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card text-left text-muted">
              <th
                className="px-4 py-3 font-medium cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("name")}
              >
                Chain{arrow("name")}
              </th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">
                Type
              </th>
              <th
                className="px-4 py-3 font-medium text-right cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("validators")}
              >
                Validators{arrow("validators")}
              </th>
              <th
                className="px-4 py-3 font-medium text-right cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("tvl")}
              >
                TVL{arrow("tvl")}
              </th>
              <th
                className="px-4 py-3 font-medium text-right cursor-pointer hover:text-foreground hidden sm:table-cell"
                onClick={() => toggleSort("daily_txs")}
              >
                Daily Txs{arrow("daily_txs")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  Loading chains...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  No chains match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((chain) => {
                const m = chain.latestMetrics;
                const vm = vmTypeBadge(chain.vmType);
                const cat = categoryBadge(chain.category);
                return (
                  <tr
                    key={chain.id}
                    className="hover:bg-card-hover transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/chains/${chain.slug}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-avax-red-dim text-avax-red font-bold text-[10px]">
                          {chain.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-foreground truncate block">
                            {chain.name}
                          </span>
                          {chain.tokenSymbol && (
                            <span className="text-xs text-muted">
                              {chain.tokenSymbol}
                            </span>
                          )}
                        </div>
                        {chain.isFeatured && (
                          <span className="text-avax-red text-[10px]">★</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
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
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {formatNumber(m?.validatorCount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {formatUsd(m?.tvlUsd)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground hidden sm:table-cell">
                      {m?.actualDailyTxs != null ? (
                        <div>
                          <span>{formatNumber(m.actualDailyTxs)}</span>
                          {m.tps != null && (
                            <span className="text-[10px] text-muted ml-1">
                              ({m.tps.toFixed(2)} TPS)
                            </span>
                          )}
                        </div>
                      ) : (
                        formatNumber(m?.estimatedDailyTxs)
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
