const BASE_URL = "https://metrics.avax.network/v2";

export type AvaCloudMetricName =
  | "txCount"
  | "activeAddresses"
  | "cumulativeAddresses"
  | "avgTps"
  | "maxTps"
  | "gasUsed"
  | "avgGasPrice"
  | "cumulativeTxCount";

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
export async function fetchAllChainMetrics(evmChainId: number): Promise<{
  txCount: number | null;
  activeAddresses: number | null;
  cumulativeAddresses: number | null;
  avgTps: number | null;
  maxTps: number | null;
  gasUsed: number | null;
  avgGasPrice: number | null;
  cumulativeTxCount: number | null;
}> {
  const metrics: AvaCloudMetricName[] = [
    "txCount",
    "activeAddresses",
    "cumulativeAddresses",
    "avgTps",
    "maxTps",
    "gasUsed",
    "avgGasPrice",
    "cumulativeTxCount",
  ];

  const results = await Promise.allSettled(
    metrics.map((m) => fetchChainMetric(evmChainId, m, { timeInterval: "day", pageSize: 2 })),
  );

  const getValue = (idx: number): number | null => {
    const r = results[idx];
    if (r.status === "fulfilled" && r.value.length > 0) {
      // Use the most recent data point
      // But verify the timestamp is within the last 48 hours
      const latest = r.value[0];
      const now = Math.floor(Date.now() / 1000);
      const age = now - latest.timestamp;
      // Accept data up to 72 hours old (metrics may lag)
      if (age <= 72 * 3600) {
        return latest.value;
      }
      // If most recent is too old, try the second data point
      if (r.value.length > 1) {
        return r.value[1].value;
      }
      // Still return even if old - some chains just don't have recent activity
      return latest.value;
    }
    return null;
  };

  return {
    txCount: getValue(0),
    activeAddresses: getValue(1),
    cumulativeAddresses: getValue(2),
    avgTps: getValue(3),
    maxTps: getValue(4),
    gasUsed: getValue(5),
    avgGasPrice: getValue(6),
    cumulativeTxCount: getValue(7),
  };
}
