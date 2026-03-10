// ─── Glacier API types ──────────────────────────────────────────────
export interface GlacierBlockchain {
  blockchainId: string;
  blockchainName: string;
  vmId: string;
  subnetId: string;
  evmChainId?: number;
  createBlockTimestamp?: number;
  createBlockNumber?: string;
}

export interface GlacierBlockchainsResponse {
  blockchains: GlacierBlockchain[];
  nextPageToken?: string;
}

// ─── P-Chain API types ──────────────────────────────────────────────
export interface PChainValidator {
  nodeID: string;
  weight: string;
  startTime: string;
  validationID?: string;
  publicKey?: string;
  balance?: string;
  minNonce?: number;
  // Primary network only:
  uptime?: string;
  connected?: boolean;
  delegatorCount?: string;
  delegatorWeight?: string;
  delegationFee?: string;
  endTime?: string;
}

export interface PChainValidatorsResponse {
  validators: PChainValidator[];
}

// ─── DeFiLlama types ────────────────────────────────────────────────
export interface DeFiLlamaChain {
  name: string;
  chainId: number | null;
  tvl: number;
  gecko_id: string | null;
  tokenSymbol: string | null;
  cmcId: string | null;
}

// ─── EVM RPC types ──────────────────────────────────────────────────
export interface EvmBlock {
  number: string;
  timestamp: string;
  transactions: string[];
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas?: string;
  hash: string;
}

// ─── API response types ─────────────────────────────────────────────
export interface ChainWithMetrics {
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
  latestMetrics: {
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
  } | null;
}

export interface OverviewStats {
  totalChains: number;
  totalSubnets: number;
  evmChains: number;
  enabledChains: number;
  totalTvlUsd: number;
  topChainsByTvl: ChainWithMetrics[];
  topChainsByTxs: ChainWithMetrics[];
  lastIngestionAt: string | null;
}
