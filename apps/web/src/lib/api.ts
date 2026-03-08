const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export interface ChainMetrics {
  date: string;
  validatorCount: number | null;
  totalStakeWeight: number | null;
  tvlUsd: number | null;
  latestBlockNumber: number | null;
  recentTxCount: number | null;
  avgGasPrice: number | null;
  avgBlockTime: number | null;
  estimatedDailyTxs: number | null;
}

export interface Chain {
  id: number;
  blockchainId: string;
  subnetId: string;
  vmId: string;
  name: string;
  slug: string;
  description: string | null;
  evmChainId: number | null;
  rpcUrl: string | null;
  explorerUrl: string | null;
  websiteUrl: string | null;
  vmType: string;
  category: string | null;
  tokenSymbol: string | null;
  logoUrl: string | null;
  createBlockTimestamp: number | null;
  isActive: boolean;
  isEvm: boolean;
  isFeatured: boolean;
  enabled: boolean;
  latestMetrics: ChainMetrics | null;
}

export interface OverviewData {
  totalChains: number;
  totalSubnets: number;
  evmChains: number;
  enabledChains: number;
  totalTvlUsd: number;
  topChainsByTvl: Chain[];
  topChainsByTxs: Chain[];
  lastIngestionAt: string | null;
}

export interface ChainsListResponse {
  chains: Chain[];
  total: number;
  limit: number;
  offset: number;
}

export interface MetricsHistoryResponse {
  chainId: number;
  slug: string;
  metrics: ChainMetrics[];
}

export async function getOverview(): Promise<OverviewData> {
  return fetchApi("/api/overview");
}

export async function getChains(params?: {
  sort?: string;
  order?: string;
  vm_type?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ChainsListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined) searchParams.set(key, String(val));
    }
  }
  const qs = searchParams.toString();
  return fetchApi(`/api/chains${qs ? `?${qs}` : ""}`);
}

export async function getChainBySlug(slug: string): Promise<{ chain: Chain }> {
  return fetchApi(`/api/chains/${slug}`);
}

export async function getMetricsHistory(
  slug: string,
  days = 30,
): Promise<MetricsHistoryResponse> {
  return fetchApi(`/api/chains/${slug}/metrics?days=${days}`);
}
