"use client";

import { useProtocols } from "@/hooks/useProtocols";
import { formatUsd } from "@/lib/format";

// DeFi protocols on this chain, from DeFiLlama (Bucket B). Renders nothing while
// loading or when the chain has no tracked protocols — keeps the detail page
// honest rather than showing an empty shell.
export function ProtocolList({ slug }: { slug: string }) {
  const { data, isLoading } = useProtocols({ chain: slug, limit: 12 });
  const protocols = data?.protocols ?? [];

  if (isLoading || protocols.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-surface p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] text-line">DeFi protocols</span>
        <span className="font-mono text-[11px] text-faint">
          {data?.total ?? protocols.length} on chain · via DeFiLlama
        </span>
      </div>
      <div className="flex flex-col">
        {protocols.map((p, i) => (
          <a
            key={`${p.slug}-${p.chainKey}`}
            href={p.url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2.5 py-2 ${
              i > 0 ? "border-t border-row-line" : ""
            } ${p.url ? "hover:text-avax-red-text" : "cursor-default"}`}
          >
            {p.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.logoUrl}
                alt=""
                className="h-5 w-5 rounded-full bg-elevated object-cover"
              />
            ) : (
              <span className="h-5 w-5 rounded-full bg-elevated" />
            )}
            <span className="min-w-0 flex-1 truncate text-[13px]">{p.name}</span>
            {p.category && (
              <span className="hidden rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">
                {p.category}
              </span>
            )}
            <span className="font-mono text-[12px] text-line">
              {formatUsd(p.tvlUsd)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
