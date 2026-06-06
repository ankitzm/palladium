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

// Rich chain metadata from Glacier GET /v1/chains (the ~32 onboarded mainnet L1s).
export interface GlacierChain {
  chainId: string; // EVM chain id, as a string
  status?: string;
  chainName: string;
  description?: string;
  platformChainId?: string; // = blockchainId
  subnetId?: string;
  vmId?: string;
  vmName?: string;
  explorerUrl?: string;
  rpcUrl?: string;
  isTestnet?: boolean;
  chainLogoUri?: string;
  private?: boolean;
  networkToken?: {
    name?: string;
    symbol?: string;
    decimals?: number;
    logoUri?: string;
  };
}

export interface GlacierChainsResponse {
  chains: GlacierChain[];
  nextPageToken?: string;
}

// L1 (subnet) validator from Glacier GET /v1/networks/{network}/l1Validators.
// Note: NO uptime/delegators — L1 validators do not report these to the P-Chain.
export interface GlacierL1Validator {
  validationId: string;
  validationIdHex?: string;
  nodeId: string;
  subnetId: string;
  weight: number;
  remainingBalance?: number;
  creationTimestamp?: number;
  blsCredentials?: { publicKey?: string; proofOfPossession?: string };
}

export interface GlacierL1ValidatorsResponse {
  validators: GlacierL1Validator[];
  blockHeight?: number;
  nextPageToken?: string;
}

// Primary-Network validator from Glacier GET /v1/networks/{network}/validators.
// Rich: uptime, delegation, geolocation. This is the AVAX validator set.
export interface GlacierPrimaryValidator {
  txHash?: string;
  nodeId: string;
  subnetId: string;
  amountStaked?: string;
  amountDelegated?: string;
  delegationFee?: string;
  delegatorCount?: number;
  startTimestamp?: number;
  endTimestamp?: number;
  stakePercentage?: number;
  validatorHealth?: number | { reachabilityPercent?: number };
  uptimePerformance?: number;
  potentialRewards?: { validationRewardAmount?: string } | string;
  avalancheGoVersion?: string;
  delegationCapacity?: string;
  validationStatus?: string;
  geolocation?: { country?: string; countryCode?: string; city?: string };
}

export interface GlacierPrimaryValidatorsResponse {
  validators: GlacierPrimaryValidator[];
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
    nativeTokenPriceUsd: number | null;
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
