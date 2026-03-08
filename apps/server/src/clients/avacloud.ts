const AVACLOUD_METRICS_BASE = "https://metrics.avax.network/v2";

export interface AvaCloudMetricValue {
    value: number;
    timestamp: number;
}

export interface AvaCloudMetricResponse {
    results: AvaCloudMetricValue[];
    nextPageToken?: string;
}

/**
 * Fetches metrics for a specific chain.
 * Metrics can be: 'txCount', 'activeAddresses', etc.
 */
export async function fetchChainMetric(
    chainId: number,
    metric: string,
): Promise<AvaCloudMetricResponse> {
    const url = `${AVACLOUD_METRICS_BASE}/chains/${chainId}/metrics/${metric}?granularity=daily`;
    const res = await fetch(url);

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`AvaCloud Metrics API error for chain ${chainId} metric ${metric}: ${res.status} ${text}`);
    }

    return res.json();
}
