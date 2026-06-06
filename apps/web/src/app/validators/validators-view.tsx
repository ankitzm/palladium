"use client";

import { useMemo, useState } from "react";
import { useValidators, usePrimaryValidators } from "@/hooks/useValidators";
import { formatNumber, formatCompact } from "@/lib/format";
import { StatBand } from "@/components/overview/StatBand";
import { ValidatorTable } from "@/components/validators/ValidatorTable";
import { PrimaryValidatorTable } from "@/components/validators/PrimaryValidatorTable";
import { TableSkeleton, ViewError, ViewEmpty } from "@/components/ui/ViewStates";

const L1_PARAMS = { sort: "weight", order: "desc", limit: 200 } as const;
const PRIMARY_PARAMS = { sort: "stake", order: "desc", limit: 200 } as const;

type Tab = "l1" | "primary";

export function ValidatorsView() {
  const [tab, setTab] = useState<Tab>("l1");

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-medium">Validators</h1>
        <p className="mt-0.5 text-xs text-dim">
          {tab === "l1"
            ? "Per-L1 (subnet) validators, ranked by stake weight."
            : "Avalanche Primary-Network validators — the AVAX staking set with uptime, delegation & geo."}
        </p>
      </div>

      <div className="mb-5 inline-flex rounded-md border border-border bg-surface p-0.5 text-xs">
        <TabButton active={tab === "l1"} onClick={() => setTab("l1")}>
          L1 validators
        </TabButton>
        <TabButton active={tab === "primary"} onClick={() => setTab("primary")}>
          Primary Network
        </TabButton>
      </div>

      {tab === "l1" ? <L1Tab /> : <PrimaryTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[5px] px-3 py-1.5 font-medium transition-colors ${
        active
          ? "bg-elevated text-foreground"
          : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function L1Tab() {
  const { data, isError, isLoading, refetch, isFetching } = useValidators(L1_PARAMS);
  const validators = useMemo(() => data?.validators ?? [], [data]);

  if (isError && !data)
    return (
      <ViewError
        title="L1 validators aren’t available yet"
        message="The validators endpoint didn’t respond. Once the latest backend is deployed and indexed, per-L1 validators appear here automatically."
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  if (isLoading || !data) return <TableSkeleton rows={12} withBand />;

  const total = data.total ?? validators.length;
  const totalWeight = validators.reduce((s, v) => s + (v.weight ?? 0), 0);
  const chains = new Set(validators.map((v) => v.chain.slug)).size;

  return (
    <div>
      <StatBand
        items={[
          { value: formatNumber(total), label: "L1 validators" },
          { value: formatCompact(totalWeight), label: "Stake weight (top)" },
          { value: formatNumber(chains), label: "Chains represented" },
          { value: formatNumber(validators.length), label: "Shown" },
        ]}
      />
      <div className="mt-6">
        {validators.length === 0 ? (
          <ViewEmpty
            title="No L1 validators indexed yet"
            message="Run the ingestion pipeline to populate per-L1 validator records."
          />
        ) : (
          <ValidatorTable validators={validators} />
        )}
      </div>
    </div>
  );
}

function PrimaryTab() {
  const { data, isError, isLoading, refetch, isFetching } =
    usePrimaryValidators(PRIMARY_PARAMS);
  const validators = useMemo(() => data?.validators ?? [], [data]);

  if (isError && !data)
    return (
      <ViewError
        title="Primary-Network validators aren’t available yet"
        message="The /validators/primary endpoint didn’t respond. It ships with the latest backend — once deployed and indexed, the AVAX validator set appears here."
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  if (isLoading || !data) return <TableSkeleton rows={12} withBand />;

  const total = data.total ?? validators.length;
  const totalStake = validators.reduce((s, v) => s + (v.amountStaked ?? 0), 0);
  const avgUptime =
    validators.filter((v) => v.uptimePercent != null).length > 0
      ? validators.reduce((s, v) => s + (v.uptimePercent ?? 0), 0) /
        validators.filter((v) => v.uptimePercent != null).length
      : null;
  const countries = new Set(
    validators.map((v) => v.countryCode).filter(Boolean),
  ).size;

  return (
    <div>
      <StatBand
        items={[
          { value: formatNumber(total), label: "Primary validators" },
          {
            value:
              totalStake > 0 ? `${(totalStake / 1e9 / 1e6).toFixed(1)}M` : "—",
            label: "AVAX staked (top)",
          },
          {
            value: avgUptime != null ? `${avgUptime.toFixed(1)}%` : "—",
            label: "Avg uptime (top)",
          },
          { value: formatNumber(countries), label: "Countries" },
        ]}
      />
      <div className="mt-6">
        {validators.length === 0 ? (
          <ViewEmpty
            title="No primary-network validators yet"
            message="Run the ingestion pipeline to populate the AVAX validator set."
          />
        ) : (
          <PrimaryValidatorTable validators={validators} />
        )}
      </div>
    </div>
  );
}
