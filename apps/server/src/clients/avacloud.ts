const BASE_URL = "https://metrics.avax.network/v2";

export type AvaCloudMetricName =
  | "txCount"
  | "activeAddresses"
  | "activeSenders"
  | "cumulativeAddresses"
  | "cumulativeTxCount"
  | "cumulativeContracts"
  | "cumulativeDeployers"
  | "contracts"
  | "deployers"
  | "avgTps"
  | "maxTps"
  | "avgGps"
  | "maxGps"
  | "gasUsed"
  | "avgGasPrice"
  | "maxGasPrice"
  | "feesPaid";

export type AvaCloudNetworkMetricName =
  | "validatorCount"
  | "validatorWeight"
  | "delegatorCount"
  | "delegatorWeight";

interface MetricResult {
  value: number;
  timestamp: number;
}

interface MetricsResponse {
  results: MetricResult[];
  nextPageToken?: string;
}

interface SupportedChain {
  evmChainId: number;
  subnetId: string;
  chainName: string;
  blockchainId: string;
  network: "mainnet" | "testnet";
}

interface ChainsResponse {
  chains: SupportedChain[];
}

/**
 * Fetch the list of all chains supported by the AvaCloud Metrics API.
 * Returns only mainnet chains.
 */
export async function fetchSupportedChains(): Promise<SupportedChain[]> {
  const res = await fetch(`${BASE_URL}/chains`);
  if (!res.ok) throw new Error(`AvaCloud /chains failed: ${res.status}`);
  const data: ChainsResponse = await res.json();
  return data.chains.filter((c) => c.network === "mainnet");
}

/**
 * Fetch a single metric for a chain (by EVM chain ID).
 * Returns the latest data point(s) for the given timeInterval (default: day).
 */
export async function fetchChainMetric(
  evmChainId: number,
  metric: AvaCloudMetricName,
  opts?: { timeInterval?: "hour" | "day"; pageSize?: number },
): Promise<MetricResult[]> {
  const timeInterval = opts?.timeInterval ?? "day";
  const pageSize = opts?.pageSize ?? 1;
  const url = `${BASE_URL}/chains/${evmChainId}/metrics/${metric}?timeInterval=${timeInterval}&pageSize=${pageSize}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    throw new Error(`AvaCloud metric ${metric} for chain ${evmChainId}: ${res.status}`);
  }
  const data: MetricsResponse = await res.json();
  return data.results;
}

/**
 * Fetch all relevant daily metrics for a chain in parallel.
 * Returns null values for any metric that fails (non-fatal).
 * 
 * For txCount, we fetch the last 2 data points so we can verify
 * the most recent one is non-zero and recent.
 */
export type ChainMetricsBundle = Record<AvaCloudMetricName, number | null>;

const ALL_CHAIN_METRICS: AvaCloudMetricName[] = [
  "txCount",
  "activeAddresses",
  "activeSenders",
  "cumulativeAddresses",
  "cumulativeTxCount",
  "cumulativeContracts",
  "cumulativeDeployers",
  "contracts",
  "deployers",
  "avgTps",
  "maxTps",
  "avgGps",
  "maxGps",
  "gasUsed",
  "avgGasPrice",
  "maxGasPrice",
  "feesPaid",
];

export async function fetchAllChainMetrics(
  evmChainId: number,
): Promise<ChainMetricsBundle> {
  const results = await Promise.allSettled(
    ALL_CHAIN_METRICS.map((m) =>
      fetchChainMetric(evmChainId, m, { timeInterval: "day", pageSize: 2 }),
    ),
  );

  const valueAt = (idx: number): number | null => {
    const r = results[idx];
    if (r.status === "fulfilled" && r.value.length > 0) {
      const latest = r.value[0];
      const now = Math.floor(Date.now() / 1000);
      const age = now - latest.timestamp;
      if (age <= 72 * 3600) return latest.value;
      if (r.value.length > 1) return r.value[1].value;
      return latest.value;
    }
    return null;
  };

  const out = {} as ChainMetricsBundle;
  ALL_CHAIN_METRICS.forEach((m, i) => {
    out[m] = valueAt(i);
  });
  return out;
}

// Network-wide daily staking rollups (validatorCount/Weight, delegatorCount/Weight).
export async function fetchNetworkMetrics(): Promise<
  Record<AvaCloudNetworkMetricName, number | null>
> {
  const names: AvaCloudNetworkMetricName[] = [
    "validatorCount",
    "validatorWeight",
    "delegatorCount",
    "delegatorWeight",
  ];
  const results = await Promise.allSettled(
    names.map(async (m) => {
      const res = await fetch(
        `${BASE_URL}/networks/mainnet/metrics/${m}?pageSize=1`,
        { signal: AbortSignal.timeout(15_000) },
      );
      if (!res.ok) throw new Error(`network metric ${m}: ${res.status}`);
      const data: MetricsResponse = await res.json();
      return data.results;
    }),
  );
  const out = {} as Record<AvaCloudNetworkMetricName, number | null>;
  names.forEach((m, i) => {
    const r = results[i];
    out[m] = r.status === "fulfilled" && r.value.length > 0 ? r.value[0].value : null;
  });
  return out;
}
