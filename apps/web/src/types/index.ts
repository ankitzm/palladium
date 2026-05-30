// Frontend domain types. Single source of truth for the shapes the web app
// consumes from the Palladium API. Mirrors the backend response shapes.

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
  actualDailyTxs: number | null;
  activeAddresses: number | null;
  cumulativeAddresses: number | null;
  tps: number | null;
  peakTps: number | null;
  avgGasConsumption: number | null;
}

export interface ChainValidator {
  nodeId: string;
  weight: number | null;
  isConnected: boolean | null;
  uptimePercent: number | null;
  startTime: number | null;
  endTime: number | null;
  delegationFee: number | null;
  delegatorCount: number | null;
  delegatorWeight: number | null;
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
  // Present only on the single-chain detail response.
  validators?: ChainValidator[];
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
  // Phase C additions (optional until the backend ships them).
  totalValidators?: number;
  total24hTxns?: number;
  tvlChangePct?: number | null;
  validatorsChangePct?: number | null;
  txnsChangePct?: number | null;
  asOfDate?: string | null;
  spotlightSlug?: string | null;
  spotlightChain?: Chain | null;
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

// Phase C: cross-chain validator listing.
export interface ValidatorRow {
  nodeId: string;
  weight: number | null;
  uptimePercent: number | null;
  isConnected: boolean | null;
  startTime: number | null;
  delegatorCount: number | null;
  chain: {
    slug: string;
    name: string;
    isFeatured: boolean;
  };
}

export interface ValidatorsListResponse {
  validators: ValidatorRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface ChainsQueryParams {
  sort?: string;
  order?: string;
  vm_type?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
