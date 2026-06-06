"use client";

import { useMemo, useState } from "react";
import type { PrimaryValidatorRow } from "@/types";
import { shortId } from "@/lib/format";

type SortField = "stake" | "uptime" | "delegators";
const PAGE_SIZE = 25;

function formatAvax(nAvax: number | null): string {
  if (nAvax == null) return "—";
  const avax = nAvax / 1e9;
  if (avax >= 1e6) return `${(avax / 1e6).toFixed(2)}M`;
  if (avax >= 1e3) return `${(avax / 1e3).toFixed(1)}K`;
  return avax.toFixed(0);
}

function sortValue(v: PrimaryValidatorRow, field: SortField): number {
  switch (field) {
    case "uptime":
      return v.uptimePercent ?? 0;
    case "delegators":
      return v.delegatorCount ?? 0;
    default:
      return v.amountStaked ?? 0;
  }
}

export function PrimaryValidatorTable({
  validators,
}: {
  validators: PrimaryValidatorRow[];
}) {
  const [sortField, setSortField] = useState<SortField>("stake");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const r = [...validators];
    r.sort((a, b) => {
      const d = sortValue(a, sortField) - sortValue(b, sortField);
      return order === "asc" ? d : -d;
    });
    return r;
  }, [validators, sortField, order]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(f: SortField) {
    if (sortField === f) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortField(f);
      setOrder("desc");
    }
    setPage(0);
  }

  const arrow = (f: SortField) =>
    sortField === f ? (order === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse font-mono text-xs">
          <thead>
            <tr className="text-faint">
              <th className="px-3 py-2 text-left font-normal">#</th>
              <th className="px-3 py-2 text-left font-normal">NODE ID</th>
              <Th onClick={() => toggleSort("stake")}>STAKE{arrow("stake")}</Th>
              <Th onClick={() => toggleSort("uptime")}>UPTIME{arrow("uptime")}</Th>
              <Th onClick={() => toggleSort("delegators")}>
                DELEG{arrow("delegators")}
              </Th>
              <th className="px-3 py-2 text-left font-normal">GEO</th>
              <th className="px-3 py-2 text-left font-normal">VERSION</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v, i) => (
              <tr
                key={v.nodeId}
                className={`border-t border-row-line ${i % 2 === 1 ? "bg-surface-2/40" : ""}`}
              >
                <td className="px-3 py-2.5 text-left text-faint">
                  {String(safePage * PAGE_SIZE + i + 1).padStart(2, "0")}
                </td>
                <td className="px-3 py-2.5 text-left text-line">
                  {shortId(v.nodeId, 14, 4)}
                </td>
                <td className="px-3 py-2.5 text-right text-line">
                  {formatAvax(v.amountStaked)}
                  {v.amountStaked != null && <span className="text-faint"> A</span>}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {v.uptimePercent != null ? (
                    <span
                      className={
                        v.uptimePercent >= 95 ? "text-pos-text" : "text-warn"
                      }
                    >
                      {v.uptimePercent.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {v.delegatorCount != null ? (
                    v.delegatorCount
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-left text-dim">
                  {v.countryCode ? (
                    <span title={v.country ?? undefined}>{v.countryCode}</span>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-left text-dim">
                  {v.avalanchegoVersion ?? <span className="text-faint">—</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-muted">
                  No primary-network validator data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] text-faint">
          <span>
            {safePage * PAGE_SIZE + 1}–
            {Math.min((safePage + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}{" "}
            · page {safePage + 1} of {pageCount}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage(Math.max(0, safePage - 1))}
              className="rounded border border-border bg-surface px-2.5 py-1 hover:text-foreground disabled:opacity-40"
            >
              ‹ prev
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
              className="rounded border border-border bg-surface px-2.5 py-1 hover:text-foreground disabled:opacity-40"
            >
              next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  onClick,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-2 text-right font-normal ${
        onClick ? "cursor-pointer select-none hover:text-foreground" : ""
      }`}
    >
      {children}
    </th>
  );
}
