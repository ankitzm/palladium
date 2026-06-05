"use client";

import { useMemo } from "react";
import { useValidators } from "@/hooks/useValidators";
import { formatNumber, formatCompact } from "@/lib/format";
import { StatBand } from "@/components/overview/StatBand";
import { ValidatorTable } from "@/components/validators/ValidatorTable";
import { TableSkeleton, ViewError, ViewEmpty } from "@/components/ui/ViewStates";

const PARAMS = { sort: "weight", order: "desc", limit: 200 } as const;

export function ValidatorsView() {
  const { data, isError, isLoading, refetch, isFetching } = useValidators(PARAMS);
  const validators = useMemo(() => data?.validators ?? [], [data]);

  if (isError && !data) {
    return (
      <div>
        <Header />
        <ViewError
          title="Validators aren’t available yet"
          message="The validators endpoint didn’t respond. This route ships with the latest backend — once it’s deployed and indexed, per-validator data shows up here automatically."
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
        <TableSkeleton rows={12} withBand />
      </div>
    );
  }

  const total = data.total ?? validators.length;
  const totalWeight = validators.reduce((s, v) => s + (v.weight ?? 0), 0);
  const connected = validators.filter((v) => v.isConnected).length;
  const chains = new Set(validators.map((v) => v.chain.slug)).size;

  return (
    <div>
      <Header
        subtitle={`Top ${validators.length} of ${formatNumber(total)} validators across Avalanche L1s`}
      />

      <StatBand
        items={[
          { value: formatNumber(total), label: "Total validators" },
          { value: formatCompact(totalWeight), label: "Stake weight (top)" },
          { value: formatNumber(connected), label: "Connected" },
          { value: formatNumber(chains), label: "Chains represented" },
        ]}
      />

      <div className="mt-6">
        {validators.length === 0 ? (
          <ViewEmpty
            title="No validators indexed yet"
            message="Run the ingestion pipeline to populate per-validator records. They’ll appear here ranked by stake weight."
          />
        ) : (
          <ValidatorTable validators={validators} />
        )}
      </div>
    </div>
  );
}

function Header({ subtitle }: { subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-lg font-medium">Validators</h1>
      <p className="mt-0.5 text-xs text-dim">
        {subtitle ?? "Per-validator records across every Avalanche L1, ranked by stake."}
      </p>
    </div>
  );
}
