"use client";

import { useChains } from "@/hooks/useChains";
import { ChainTable } from "@/components/chains/ChainTable";
import { TableSkeleton, ViewError } from "@/components/ui/ViewStates";

const PARAMS = { limit: 500, sort: "tvl", order: "desc" } as const;

export function ChainsView() {
  const { data, isError, isLoading, refetch, isFetching } = useChains(PARAMS);

  if (isError && !data) {
    return (
      <div>
        <Header />
        <ViewError
          title="Couldn’t load chains"
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div>
        <Header />
        <TableSkeleton rows={12} />
      </div>
    );
  }

  const chains = data.chains ?? [];
  const total = data.total ?? chains.length;
  const withTvl = chains.filter((c) => (c.latestMetrics?.tvlUsd ?? 0) > 0).length;
  const withRpc = chains.filter((c) => !!c.rpcUrl).length;

  return (
    <div>
      <Header subtitle={`${total} Avalanche L1s · ${withTvl} with TVL · ${withRpc} with live RPC`} />
      <ChainTable initialChains={chains} />
    </div>
  );
}

function Header({ subtitle }: { subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-lg font-medium">Chains</h1>
      <p className="mt-0.5 text-xs text-dim">
        {subtitle ?? "Every indexed Avalanche L1, searchable and sortable."}
      </p>
    </div>
  );
}
