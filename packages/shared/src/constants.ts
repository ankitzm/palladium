export interface KnownChainMeta {
  name?: string;
  rpcUrl?: string;
  explorerUrl?: string;
  websiteUrl?: string;
  category?: string;
  tokenSymbol?: string;
  logoUrl?: string;
  description?: string;
  defillamaId?: string;
}

// Primary lookup: by evmChainId (more reliable than blockchainId which varies)
export const KNOWN_CHAINS_BY_EVM_ID: Record<number, KnownChainMeta> = {
  53935: {
    name: "DFK Chain",
    rpcUrl: "https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc",
    explorerUrl: "https://subnets.avax.network/defi-kingdoms",
    websiteUrl: "https://defikingdoms.com",
    category: "gaming",
    tokenSymbol: "JEWEL",
    description: "DeFi Kingdoms Crystalvale — a blockchain game with DeFi elements",
    defillamaId: "DFK",
  },
  432204: {
    name: "Dexalot",
    rpcUrl: "https://subnets.avax.network/dexalot/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/dexalot",
    websiteUrl: "https://dexalot.com",
    category: "defi",
    tokenSymbol: "ALOT",
    description: "On-chain central limit order book DEX",
    defillamaId: "Dexalot",
  },
  4337: {
    name: "Beam",
    rpcUrl: "https://subnets.avax.network/beam/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/beam",
    websiteUrl: "https://beam.gg",
    category: "gaming",
    tokenSymbol: "BEAM",
    description: "Gaming-focused blockchain by Merit Circle",
    defillamaId: "Beam",
  },
  73772: {
    name: "Swimmer Network",
    rpcUrl: "https://subnets.avax.network/swimmer/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/swimmer",
    websiteUrl: "https://swimmer.network",
    category: "gaming",
    tokenSymbol: "TUS",
    description: "Gaming subnet originally built for Crabada",
  },
};

// Chain IDs to exclude from the dashboard (primary network chains)
export const EXCLUDED_EVM_CHAIN_IDS = new Set([
  43114, // C-Chain (Avalanche mainnet)
]);

export const EXCLUDED_BLOCKCHAIN_NAMES = new Set([
  "C-Chain",
  "X-Chain",
  "P-Chain",
]);
