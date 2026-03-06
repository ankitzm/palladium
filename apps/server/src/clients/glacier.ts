import type { GlacierBlockchain, GlacierBlockchainsResponse } from "@palladium/shared/types";

const GLACIER_BASE = "https://glacier-api.avax.network/v1/networks/mainnet";

export async function fetchAllBlockchains(): Promise<GlacierBlockchain[]> {
  const all: GlacierBlockchain[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${GLACIER_BASE}/blockchains`);
    url.searchParams.set("pageSize", "500");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Glacier API error: ${res.status} ${res.statusText}`);

    const data: GlacierBlockchainsResponse = await res.json();
    all.push(...data.blockchains);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return all;
}
