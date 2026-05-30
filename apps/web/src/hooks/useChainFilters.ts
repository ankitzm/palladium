"use client";

import { useMemo, useState } from "react";
import type { Chain } from "@/types";
import { parseChainQuery } from "@/lib/search";
import { metricValue } from "@/lib/metrics-calc";

export type SortField = "name" | "tvl" | "validators" | "daily_txs";
export const VM_TYPES = ["subnet-evm", "evm-custom", "custom"];
const PAGE_SIZE = 50;

function sortValue(c: Chain, field: SortField): number {
  switch (field) {
    case "tvl":
      return c.latestMetrics?.tvlUsd ?? 0;
    case "validators":
      return c.latestMetrics?.validatorCount ?? 0;
    case "daily_txs":
      return c.latestMetrics ? (metricValue(c.latestMetrics, "dailyTxs") ?? 0) : 0;
    default:
      return 0;
  }
}

// Owns all client-side filter/sort/pagination state for the chain table and
// returns the derived page of rows. Keeps ChainTable presentational.
export function useChainFilters(chains: Chain[]) {
  const [search, setSearch] = useState("");
  const [vms, setVms] = useState<Set<string>>(new Set());
  const [liveOnly, setLiveOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("tvl");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const matches = parseChainQuery(search);
    let r = chains.filter(matches);
    if (vms.size) r = r.filter((c) => vms.has(c.vmType));
    if (liveOnly) r = r.filter((c) => !!c.rpcUrl);

    r = [...r].sort((a, b) => {
      if (sortField === "name") {
        return order === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      const v1 = sortValue(a, sortField);
      const v2 = sortValue(b, sortField);
      return order === "asc" ? v1 - v2 : v2 - v1;
    });
    return r;
  }, [chains, search, vms, liveOnly, sortField, order]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(f: SortField) {
    if (sortField === f) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(f);
      setOrder(f === "name" ? "asc" : "desc");
    }
    setPage(0);
  }

  function toggleVm(v: string) {
    setVms((prev) => {
      const n = new Set(prev);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });
    setPage(0);
  }

  function updateSearch(v: string) {
    setSearch(v);
    setPage(0);
  }

  function toggleLiveOnly() {
    setLiveOnly((l) => !l);
    setPage(0);
  }

  return {
    state: { search, vms, liveOnly, sortField, order, page: safePage },
    derived: { rows, pageCount, total: filtered.length, sourceTotal: chains.length },
    actions: {
      updateSearch,
      toggleVm,
      toggleLiveOnly,
      toggleSort,
      setPage,
    },
  };
}
