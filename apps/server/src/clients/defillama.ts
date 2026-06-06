import type { DeFiLlamaChain } from "@palladium/shared/types";

const DEFILLAMA_BASE = "https://api.llama.fi";
const COINS_BASE = "https://coins.llama.fi";

export async function fetchAllChainsTvl(): Promise<DeFiLlamaChain[]> {
  const res = await fetch(`${DEFILLAMA_BASE}/v2/chains`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`DeFiLlama API error: ${res.status}`);
  return res.json();
}

// Batch current USD prices for a set of CoinGecko ids. Free, no auth.
// Returns a map of geckoId -> price (only ids DeFiLlama could resolve).
export async function fetchPricesByGeckoId(
  geckoIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (geckoIds.length === 0) return out;

  // coins.llama.fi accepts comma-joined `coingecko:<id>` keys; chunk to keep
  // URLs sane.
  const CHUNK = 80;
  for (let i = 0; i < geckoIds.length; i += CHUNK) {
    const chunk = geckoIds.slice(i, i + CHUNK);
    const keys = chunk.map((id) => `coingecko:${id}`).join(",");
    try {
      const res = await fetch(`${COINS_BASE}/prices/current/${keys}`, {
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        coins?: Record<string, { price?: number }>;
      };
      for (const [key, val] of Object.entries(data.coins ?? {})) {
        const id = key.replace(/^coingecko:/, "");
        if (typeof val.price === "number") out.set(id, val.price);
      }
    } catch {
      // best-effort; skip this chunk on error
    }
  }
  return out;
}
