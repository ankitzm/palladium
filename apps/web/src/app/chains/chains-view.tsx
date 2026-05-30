"use client";

import { useChains } from "@/hooks/useChains";
import { ChainTable } from "@/components/chains/ChainTable";

const PARAMS = { limit: 500, sort: "tvl", order: "desc" } as const;

export function ChainsView() {
  const { data } = useChains(PARAMS);
  const chains = data?.chains ?? [];
  const total = data?.total ?? chains.length;
  const withTvl = chains.filter((c) => (c.latestMetrics?.tvlUsd ?? 0) > 0).length;
  const withRpc = chains.filter((c) => !!c.rpcUrl).length;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-medium">Chains</h1>
        <p className="mt-0.5 text-xs text-dim">
          {total} Avalanche L1s · {withTvl} with TVL · {withRpc} with live RPC
        </p>
      </div>
      <ChainTable initialChains={chains} />
    </div>
  );
}
