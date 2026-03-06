import type { DeFiLlamaChain } from "@palladium/shared/types";

const DEFILLAMA_BASE = "https://api.llama.fi";

export async function fetchAllChainsTvl(): Promise<DeFiLlamaChain[]> {
  const res = await fetch(`${DEFILLAMA_BASE}/v2/chains`);
  if (!res.ok) throw new Error(`DeFiLlama API error: ${res.status}`);
  return res.json();
}
