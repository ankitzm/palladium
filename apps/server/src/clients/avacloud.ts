const AVACLOUD_METRICS_BASE = "https://metrics.avax.network/v2";

export interface AvaCloudMetricResponse {
    result: {
        lastHour?: number;
        lastDay?: number;
        lastWeek?: number;
        lastMonth?: number;
        last90Days?: number;
        lastYear?: number;
        allTime?: number;
    };
}

/**
 * Fetches metrics for a specific chain using the rollingWindowMetrics endpoint.
 * Metrics can be: 'txCount', 'activeAddresses', etc.
 */
export async function fetchChainMetric(
    chainId: number,
    metric: string,
): Promise<AvaCloudMetricResponse> {
    const url = `${AVACLOUD_METRICS_BASE}/chains/${chainId}/rollingWindowMetrics/${metric}`;
    const res = await fetch(url);

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`AvaCloud Metrics API error for chain ${chainId} metric ${metric}: ${res.status} ${text}`);
    }

    return res.json();
}
