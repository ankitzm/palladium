import type {
  GlacierBlockchain,
  GlacierBlockchainsResponse,
  GlacierChain,
  GlacierChainsResponse,
  GlacierL1Validator,
  GlacierL1ValidatorsResponse,
  GlacierPrimaryValidator,
  GlacierPrimaryValidatorsResponse,
  GlacierSubnet,
  GlacierSubnetsResponse,
} from "@palladium/shared/types";

// Glacier (AvaCloud Data API). Free, no auth required for reads. ~6000 req/min
// unauthenticated. Two base shapes: the bare /blockchains universe and the rich
// /chains + /networks/{network}/* endpoints.
const GLACIER = "https://glacier-api.avax.network/v1";
const NETWORK = "mainnet";
const TIMEOUT_MS = 20_000;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Glacier ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

// ─── Chain universe (bare): every blockchain, no rpc/logo ────────────
export async function fetchAllBlockchains(): Promise<GlacierBlockchain[]> {
  const all: GlacierBlockchain[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${GLACIER}/networks/${NETWORK}/blockchains`);
    url.searchParams.set("pageSize", "500");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await getJson<GlacierBlockchainsResponse>(url.toString());
    all.push(...data.blockchains);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return all;
}

// ─── Rich chain metadata: the onboarded mainnet L1s (rpc/logo/token) ──
export async function fetchRichChains(): Promise<GlacierChain[]> {
  const all: GlacierChain[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${GLACIER}/chains`);
    url.searchParams.set("network", "mainnet");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await getJson<GlacierChainsResponse>(url.toString());
    all.push(...(data.chains ?? []).filter((c) => !c.isTestnet));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return all;
}

// ─── L1 (subnet) validators: weight/balance, NO uptime/delegators ────
export async function fetchL1Validators(
  opts: { maxPages?: number } = {},
): Promise<GlacierL1Validator[]> {
  const maxPages = opts.maxPages ?? 50; // safety cap
  const all: GlacierL1Validator[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const url = new URL(`${GLACIER}/networks/${NETWORK}/l1Validators`);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await getJson<GlacierL1ValidatorsResponse>(url.toString());
    all.push(...(data.validators ?? []));
    pageToken = data.nextPageToken;
    pages++;
  } while (pageToken && pages < maxPages);
  return all;
}

// ─── Subnets: ownership, threshold, L1-conversion status ─────────────
export async function fetchSubnets(
  opts: { maxPages?: number } = {},
): Promise<GlacierSubnet[]> {
  const maxPages = opts.maxPages ?? 50;
  const all: GlacierSubnet[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const url = new URL(`${GLACIER}/networks/${NETWORK}/subnets`);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await getJson<GlacierSubnetsResponse>(url.toString());
    all.push(...(data.subnets ?? []));
    pageToken = data.nextPageToken;
    pages++;
  } while (pageToken && pages < maxPages);
  return all;
}

// ─── Primary-Network validators: rich uptime/delegation/geo ──────────
export async function fetchPrimaryValidators(
  opts: { maxPages?: number; status?: "active" | "pending" | "completed" } = {},
): Promise<GlacierPrimaryValidator[]> {
  const maxPages = opts.maxPages ?? 30;
  const status = opts.status ?? "active";
  const all: GlacierPrimaryValidator[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const url = new URL(`${GLACIER}/networks/${NETWORK}/validators`);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("validationStatus", status);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await getJson<GlacierPrimaryValidatorsResponse>(url.toString());
    all.push(...(data.validators ?? []));
    pageToken = data.nextPageToken;
    pages++;
  } while (pageToken && pages < maxPages);
  return all;
}
