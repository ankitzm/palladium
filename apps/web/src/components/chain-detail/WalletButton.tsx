"use client";

import type { Chain } from "@/types";
import { addEvmChainToWallet, canAddToWallet } from "@/lib/wallet";

export function WalletButton({ chain }: { chain: Chain }) {
  if (!canAddToWallet(chain)) return null;

  return (
    <button
      type="button"
      onClick={() => addEvmChainToWallet(chain)}
      className="inline-flex items-center gap-1.5 rounded-sm bg-avax-red px-3.5 py-2 text-xs font-medium text-background"
    >
      ⊕ Add to wallet
    </button>
  );
}
