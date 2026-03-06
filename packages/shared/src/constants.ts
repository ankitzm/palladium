export interface KnownChainMeta {
  name?: string;
  rpcUrl?: string;
  explorerUrl?: string;
  websiteUrl?: string;
  category?: string;
  tokenSymbol?: string;
  logoUrl?: string;
  description?: string;
  defillamaId?: string; // Name in DeFiLlama's /v2/chains response
}

// Key is blockchainId from Glacier
export const KNOWN_CHAINS: Record<string, KnownChainMeta> = {
  // DFK Chain (DeFi Kingdoms)
  q2aTwKuyzgs8pynF7UXBZCU7DejbZbZ6EUyHr3JQzYgwNPUPi: {
    name: "DFK Chain",
    rpcUrl: "https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc",
    explorerUrl: "https://subnets.avax.network/defi-kingdoms",
    websiteUrl: "https://defikingdoms.com",
    category: "gaming",
    tokenSymbol: "JEWEL",
    description:
      "DeFi Kingdoms Crystalvale — a blockchain game with DeFi elements",
    defillamaId: "DFK",
  },
  // Dexalot
  "21Ths5Afqi5r4PaoV8r8MVGW5GRPezMT9kGMKNRqsDpKsNLHp": {
    name: "Dexalot",
    rpcUrl: "https://subnets.avax.network/dexalot/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/dexalot",
    websiteUrl: "https://dexalot.com",
    category: "defi",
    tokenSymbol: "ALOT",
    description: "On-chain central limit order book DEX",
    defillamaId: "Dexalot",
  },
  // Beam (Merit Circle / Beam gaming)
  "2tmrrBo1Lgt1mzzvPSFt73kkQKFas5d1AP88tv9cicwoFp8BSn": {
    name: "Beam",
    rpcUrl: "https://subnets.avax.network/beam/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/beam",
    websiteUrl: "https://beam.gg",
    category: "gaming",
    tokenSymbol: "BEAM",
    description: "Gaming-focused blockchain by Merit Circle",
    defillamaId: "Beam",
  },
  // Swimmer (Crabada)
  "2K33xS9AyP9oCDiHYKVrHe7F54h2La5D8erpTChaAhdzTF2cpe": {
    name: "Swimmer Network",
    rpcUrl: "https://subnets.avax.network/swimmer/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/swimmer",
    websiteUrl: "https://swimmer.network",
    category: "gaming",
    tokenSymbol: "TUS",
    description: "Gaming subnet originally built for Crabada",
  },
};

// Additional known chain metadata by evmChainId (for chains we know but may not have blockchainId)
export const KNOWN_CHAINS_BY_EVM_ID: Record<number, KnownChainMeta> = {
  53935: {
    name: "DFK Chain",
    category: "gaming",
    defillamaId: "DFK",
  },
  432204: {
    name: "Dexalot",
    category: "defi",
    defillamaId: "Dexalot",
  },
  4337: {
    name: "Beam",
    category: "gaming",
    defillamaId: "Beam",
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
