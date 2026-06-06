# Palladium — Verified Data Sources & Rebuild Plan

> Status: researched + live-verified (2026-06-06). Sources triangulated via direct API
> probes **and** an adversarial deep-research pass (84 claims → 22 confirmed, 3 killed;
> the killed claims match what live probes disproved). Free, no-paid-tier.

## TL;DR — source per data category

| Category | Source (verified) | Endpoint | Auth | Notes |
|---|---|---|---|---|
| **Chain metadata (rich)** | Glacier Data API | `GET glacier-api.avax.network/v1/chains?network=mainnet` | none | 32 mainnet L1s w/ `rpcUrl`, `explorerUrl`, `chainLogoUri`, `networkToken{symbol,decimals}`, `description` |
| **Chain universe (all)** | Glacier Data API | `GET /v1/networks/mainnet/blockchains` (paginated) | none | ~400+ raw blockchains; bare fields only (no rpc/logo) |
| **Activity (txns, addrs, TPS, gas)** | AvaCloud Metrics API | `GET metrics.avax.network/v2/chains/{evmChainId}/metrics/{metric}?timeInterval=day` | none | `txCount`, `activeAddresses`, `avgTps`, `maxTps`, `gasUsed`, `cumulative*`. Authoritative daily counts. |
| **L1/subnet validators** | Glacier Data API | `GET /v1/networks/mainnet/l1Validators` (paginated) | none | `validationId`, `nodeId`, `subnetId`, `weight`, `remainingBalance`, `blsCredentials`. **No uptime/delegators** (ACP-77 reality). |
| **Primary-Network validators** | Glacier Data API | `GET /v1/networks/mainnet/validators` (paginated) | none | Rich: `uptimePerformance`, `delegatorCount`, `amountStaked`, `validatorHealth`, `geolocation`. AVAX validator set, not per-L1. |
| **TVL** | DeFiLlama | `GET api.llama.fi/v2/chains` | none | Per-L1 TVL is **sparse** — only chains DeFiLlama tracks separately. Map by `gecko_id`/`chainId` exactly. |
| **Native token prices** | DeFiLlama Prices | `GET coins.llama.fi/prices/current/coingecko:{id}` | none | Verified AVAX. Use chain `gecko_id` from Glacier/DeFiLlama. |

### Rate limits (doc-verified)
- **AvaCloud Data + Metrics API**: Compute-Unit based. **6,000 req/min unauthenticated**, 8,000 free authed (optional `x-glacier-api-key`), 20,000 Pro. Reads need **no key**. Plenty for a daily cron.
- **DeFiLlama free API**: no auth, ~rate-limited but fine for once-daily.
- **Public Avalanche RPC** (`api.avax.network`): shared/throttled — use for P-Chain only as fallback, not bulk.

## Key accuracy findings (the "source mismatch" the user suspected)

1. **P-Chain `getCurrentValidators` does NOT return uptime/connected/delegators for L1 subnets** — only `nodeID/weight/startTime/validationID/balance`. Verified live + adversarially refuted (0-3, 1-2). The current code reads those missing fields → always null. **L1 validators simply do not report uptime to the P-Chain** (post-Etna/ACP-77).
2. **Per-L1 TVL is genuinely sparse.** DeFiLlama `/v2/chains` lists "Avalanche" (C-Chain) but almost no individual subnets. The old fuzzy name-matcher *is* the bug (false matches → the `SKIP_TVL_CHAIN_IDS` hack). Replace with exact mapping; accept null for most.
3. **AvaCloud accepts all 200 mainnet evmChainIds**, but most long-tail L1s return `txCount=0` / empty — real activity concentrates in a few dozen chains. This is the *true* ecosystem state (most subnets dormant), not a coverage gap.
4. **Old discovery used the bare `/blockchains` endpoint** → only ~4 hand-curated chains ever had rpcUrl. The rich `/v1/chains` endpoint (rpcUrl/logo/token for 32) was unused.

## Rebuild plan (behind the existing route contracts)

**Constraint:** the frontend (just rebuilt) consumes fixed shapes (`OverviewData`, `Chain`, `ValidatorRow`). Rebuild ingestion behind the routes; keep `c.json({...})` shapes stable (or change `types/index.ts` in lockstep).

1. **discover-chains** → pull universe from `/blockchains`, then enrich matching chains from `/v1/chains?network=mainnet` (rpcUrl, explorerUrl, logo, token symbol/decimals, description). Stop relying on `KNOWN_CHAINS_BY_EVM_ID` for RPCs.
2. **fetch-validators** → split: L1 validators from `/l1Validators` (weight/balance), Primary-Network from `/validators` (uptime/delegators). Fix the schema's wrong uptime assumption (see decision below).
3. **fetch-activity** → AvaCloud `txCount` authoritative into `actualDailyTxs`; keep RPC 50-block sampling only as fallback for chains AvaCloud lacks. Also addresses/TPS/gas from AvaCloud.
4. **fetch-tvl** → exact `gecko_id`/`chainId` map only; drop fuzzy matching; null is fine.
5. **fetch-prices** (new) → DeFiLlama prices for native tokens via `gecko_id`.

### Decisions (locked by user, 2026-06-06)
- **Validator model: BOTH, as tabs** — "L1 validators" (weight/balance/status) + "Primary Network" (uptime/delegators/geo). Schema gains a `primary_validators` table; `chain_validators` keeps L1 data (drop the uptime/delegator columns' reliance for L1 — leave nullable).
- **TVL headline: lead with populated metrics** — StatBand order = Chains · Validators · 24h txns · TVL (last, shows "—" when null).
- **Scope: whole index (~400+)** — discover all from `/blockchains`, enrich ~32 from `/v1/chains`, layer AvaCloud metrics where present.
