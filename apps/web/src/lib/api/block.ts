import { buildQuery, fetchJson } from "./client";

// Polls our own backend proxy (GET /api/block-height) rather than the subnet RPC
// directly — subnet RPCs don't send CORS headers, so the browser can't reach them.
// Returns null on any failure so the ticker degrades gracefully.
export async function getBlockHeight(
  slug: string,
  signal?: AbortSignal,
): Promise<number | null> {
  try {
    const { blockNumber } = await fetchJson<{ blockNumber: number }>(
      `/api/block-height${buildQuery({ slug } as Record<string, unknown>)}`,
      { signal },
    );
    return Number.isFinite(blockNumber) ? blockNumber : null;
  } catch {
    return null;
  }
}
