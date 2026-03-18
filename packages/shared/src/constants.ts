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
  578: {
    name: "Bloodloop",
    rpcUrl: "https://subnets.avax.network/bloodloop/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/bloodloop",
    category: "gaming",
    tokenSymbol: "BLD",
    description: "Bloodloop gaming chain on Avalanche",
  },
  7979: {
    name: "DOS Chain",
    rpcUrl: "https://main.doschain.com",
    explorerUrl: "https://doscan.io",
    websiteUrl: "https://doschain.com",
    category: "infrastructure",
    tokenSymbol: "DOS",
    description: "DOS Chain — decentralized operating system blockchain",
  },
  33345: {
    name: "Even",
    rpcUrl: "https://rpc.even.boo",
    explorerUrl: "https://scan.even.boo",
    category: "defi",
    description: "Even Finance L1 on Avalanche",
  },
  1344: {
    name: "Blitz",
    rpcUrl: "https://subnets.avax.network/blitz/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/blitz",
    category: "gaming",
    description: "Blitz gaming chain on Avalanche",
  },
  42069: {
    name: "COQNET",
    rpcUrl: "https://subnets.avax.network/coqnet/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/coqnet",
    category: "defi",
    tokenSymbol: "COQ",
    description: "COQNET — CoqInu meme chain on Avalanche",
  },
  5506: {
    name: "Bango Chain",
    rpcUrl: "https://subnets.avax.network/bango/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/bango",
    category: "infrastructure",
    tokenSymbol: "BGO",
    description: "Bango blockchain on Avalanche",
  },
  46975: {
    name: "Blaze",
    rpcUrl: "https://subnets.avax.network/blaze/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/blaze",
    category: "defi",
    description: "Blaze chain on Avalanche",
  },
  202110: {
    name: "Dinari",
    rpcUrl: "https://rpc-mainnet.dinari.com",
    explorerUrl: "https://explorer.dinari.com",
    websiteUrl: "https://dinari.com",
    category: "defi",
    description: "Dinari — tokenized real-world assets chain",
  },
  707070: {
    name: "CXChain",
    rpcUrl: "https://subnets.avax.network/cxchain/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/cxchain",
    category: "infrastructure",
    description: "CXChain on Avalanche",
  },
  737373: {
    name: "CX",
    rpcUrl: "https://subnets.avax.network/cx/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/cx",
    category: "infrastructure",
    description: "CX chain on Avalanche",
  },
  389: {
    name: "ETX",
    rpcUrl: "https://subnets.avax.network/etx/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/etx",
    category: "infrastructure",
    description: "ETX chain on Avalanche",
  },
  8787: {
    name: "Animalia",
    rpcUrl: "https://subnets.avax.network/animalia/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/animalia",
    category: "gaming",
    description: "Animalia — NFT gaming chain",
  },
  69670: {
    name: "ETO",
    rpcUrl: "https://subnets.avax.network/eto/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/eto",
    category: "infrastructure",
    description: "ETO chain on Avalanche",
  },
  33210: {
    name: "Cloudverse",
    rpcUrl: "https://subnets.avax.network/cloudverse/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/cloudverse",
    category: "infrastructure",
    description: "Cloudverse — cloud infrastructure chain",
  },
  836: {
    name: "BNRY",
    rpcUrl: "https://subnets.avax.network/bnry/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/bnry",
    category: "infrastructure",
    description: "BNRY mainnet chain on Avalanche",
  },
  2786: {
    name: "Apertum",
    rpcUrl: "https://subnets.avax.network/apertum/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/apertum",
    category: "infrastructure",
    description: "Apertum chain on Avalanche",
  },
  2053: {
    name: "Certalink",
    rpcUrl: "https://subnets.avax.network/certalink/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/certalink",
    category: "infrastructure",
    description: "Certalink — certification chain on Avalanche",
  },
  4313: {
    name: "Artery",
    rpcUrl: "https://subnets.avax.network/artery/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/artery",
    category: "infrastructure",
    tokenSymbol: "ARTR",
    description: "Artery Network blockchain",
  },
  35414: {
    name: "Cedomis",
    rpcUrl: "https://subnets.avax.network/cedomis/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/cedomis",
    category: "infrastructure",
    description: "Cedomis chain on Avalanche",
  },
  29732: {
    name: "DeBoard",
    rpcUrl: "https://subnets.avax.network/deboard/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/deboard",
    category: "defi",
    description: "DeBoard — decentralized dashboard chain",
  },
  96786: {
    name: "Delaunch",
    rpcUrl: "https://subnets.avax.network/delaunch/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/delaunch",
    category: "defi",
    description: "Delaunch — launch platform chain",
  },
  40404: {
    name: "Bango",
    rpcUrl: "https://subnets.avax.network/bango/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/bango",
    category: "infrastructure",
    description: "Bango chain on Avalanche",
  },
  326663: {
    name: "DCOMM",
    rpcUrl: "https://subnets.avax.network/dcomm/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/dcomm",
    category: "infrastructure",
    description: "DCOMM chain on Avalanche",
  },
  28530: {
    name: "BTIC",
    rpcUrl: "https://subnets.avax.network/btic/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/btic",
    category: "defi",
    description: "BTIC chain on Avalanche",
  },
  235235: {
    name: "CodeNekt",
    rpcUrl: "https://subnets.avax.network/codenekt/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/codenekt",
    category: "infrastructure",
    description: "CodeNekt — coding infrastructure chain",
  },
  241121: {
    name: "Andromeda",
    rpcUrl: "https://subnets.avax.network/andromeda/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/andromeda",
    category: "infrastructure",
    description: "Andromeda chain on Avalanche",
  },
  80000: {
    name: "AIB Mainnet",
    rpcUrl: "https://subnets.avax.network/aib/mainnet/rpc",
    explorerUrl: "https://subnets.avax.network/aib",
    category: "ai",
    description: "AIB mainnet chain on Avalanche",
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
