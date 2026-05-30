"use client";

import { useMemo } from "react";
import { useValidators } from "@/hooks/useValidators";
import { formatNumber, formatCompact } from "@/lib/format";
import { StatBand } from "@/components/overview/StatBand";
import { ValidatorTable } from "@/components/validators/ValidatorTable";

const PARAMS = { sort: "weight", order: "desc", limit: 200 } as const;

export function ValidatorsView() {
  const { data } = useValidators(PARAMS);
  const validators = useMemo(() => data?.validators ?? [], [data]);
  const total = data?.total ?? validators.length;

  const totalWeight = validators.reduce((s, v) => s + (v.weight ?? 0), 0);
  const connected = validators.filter((v) => v.isConnected).length;
  const chains = new Set(validators.map((v) => v.chain.slug)).size;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-medium">Validators</h1>
        <p className="mt-0.5 text-xs text-dim">
          Top {validators.length} of {formatNumber(total)} validators across Avalanche L1s
        </p>
      </div>

      <StatBand
        items={[
          { value: formatNumber(total), label: "Total validators" },
          { value: formatCompact(totalWeight), label: "Stake weight (top)" },
          { value: formatNumber(connected), label: "Connected" },
          { value: formatNumber(chains), label: "Chains represented" },
        ]}
      />

      <div className="mt-6">
        <ValidatorTable validators={validators} />
      </div>
    </div>
  );
}
