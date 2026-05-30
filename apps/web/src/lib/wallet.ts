import type { Chain } from "@/types";

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function getProvider(): Eip1193Provider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
}

export function canAddToWallet(chain: Chain): boolean {
  return chain.evmChainId != null && !!chain.rpcUrl;
}

// Prompts the injected wallet to add this EVM chain. No-op if the chain lacks an
// evmChainId/rpcUrl or no provider is present. Single source for the call so the
// table and detail button stay in sync.
export async function addEvmChainToWallet(chain: Chain): Promise<void> {
  const eth = getProvider();
  if (!eth || chain.evmChainId == null || !chain.rpcUrl) return;
  try {
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: `0x${chain.evmChainId.toString(16)}`,
          chainName: chain.name,
          nativeCurrency: {
            name: chain.tokenSymbol ?? chain.name,
            symbol: chain.tokenSymbol ?? "TOKEN",
            decimals: 18,
          },
          rpcUrls: [chain.rpcUrl],
          blockExplorerUrls: chain.explorerUrl ? [chain.explorerUrl] : undefined,
        },
      ],
    });
  } catch {
    // user rejected / wallet error — nothing to do
  }
}

export function copyRpcUrl(chain: Chain): void {
  if (chain.rpcUrl) navigator.clipboard?.writeText(chain.rpcUrl).catch(() => {});
}
