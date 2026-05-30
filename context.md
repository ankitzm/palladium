# Palladium — Complete Code Context

> An open-source Avalanche L1 (subnet) discovery dashboard. It indexes **every** Avalanche L1 chain, tracks health metrics (validators, TVL, transactions, gas, addresses, TPS), and exposes both a public web dashboard and a read-only REST API. Conceptually it is "L1Beat for Avalanche."

This document explains **everything the code does and how**, end to end: architecture, data model, the ingestion pipeline, the API, the frontend, and the operational scripts.

---

## 1. High-Level Architecture

Palladium is a **pnpm monorepo** with three workspaces plus a scripts folder:

```
palladium/
├── apps/server/       # Hono backend API + ingestion pipeline (port 8787)
├── apps/web/          # Next.js 16 frontend dashboard (port 3000)
├── packages/shared/   # DB schema, TS types, constants, utils (raw .ts, no build)
└── scripts/           # Manual/operational DB scripts (run with tsx)
```

**Data flow** (the whole system in one sentence): external data sources → ingestion pipeline writes daily rows into Postgres → Hono API reads/aggregates those rows → Next.js frontend renders them.

```
┌─────────────────────────────────────────────────────────────────┐
│  EXTERNAL SOURCES                                                 │
│  Glacier API · P-Chain RPC · DeFiLlama · EVM RPCs · AvaCloud      │
└───────────────────────────┬─────────────────────────────────────┘
                            │  (ingestion pipeline, 5 sequential steps)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  NEON POSTGRES (Drizzle ORM)                                      │
│  chains · chain_metrics · chain_validators · ingestion_log        │
└───────────────────────────┬─────────────────────────────────────┘
                            │  (Drizzle read queries / SQL aggregates)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  HONO API  (apps/server, :8787)                                   │
│  /api/overview · /api/chains · /api/chains/:slug · .../metrics     │
│  /api/ingest (auth) · /health                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │  (fetch + ISR revalidate:30s)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  NEXT.JS 16 WEB  (apps/web, :3000)                                │
│  / (overview) · /chains (directory) · /chains/[slug] · /api-docs   │
└─────────────────────────────────────────────────────────────────┘
```

### Tech stack
- **Backend**: Hono + `@hono/node-server`, TypeScript (ESM, strict mode).
- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, Recharts 3.
- **Database**: Neon serverless PostgreSQL via `@neondatabase/serverless` + Drizzle ORM 0.38.
- **Shared package**: exports raw `.ts` files (no build step) — works with `tsx` in dev; consumers resolve via TypeScript workspace references. ESM imports use `.js` extensions that map to the `.ts` sources.

### Environment variables
Root `.env`:
- `DATABASE_URL` — Neon Postgres connection string (required everywhere).
- `CRON_SECRET` — bearer token guarding `POST /api/ingest`.
- `PORT` — server port (default `8787`).

Frontend `apps/web/.env.local`:
- `NEXT_PUBLIC_API_URL` — backend base URL (default `http://localhost:8787`).

### Key root commands (`package.json`)
- `pnpm dev` — run server + web in parallel.
- `pnpm dev:server` / `pnpm dev:web` — individual dev servers.
- `pnpm build` — build shared first, then server + web in parallel.
- `pnpm seed` — run the full ingestion pipeline once (`apps/server/src/seed.ts`).
- `pnpm db:push` / `db:generate` / `db:studio` — Drizzle Kit schema operations.

---

## 2. Shared Package (`packages/shared`)

The single source of truth for the data model, types, and shared logic. Exports map (from `package.json`):
`@palladium/shared/db`, `/db/schema`, `/types`, `/constants`, `/utils`.

### 2.1 Database schema — `src/db/schema.ts`

Four Drizzle/Postgres tables.

**`chains`** — one row per discovered Avalanche L1 (~384 rows).
| column | type | notes |
|---|---|---|
| `id` | serial PK | internal id |
| `blockchainId` | text, unique | Glacier blockchain id (upsert key) |
| `subnetId` | text | groups chains for validator lookups |
| `vmId` | text | VM identifier; prefix detects SubnetEVM |
| `name`, `slug` (unique), `description` | text | display metadata |
| `evmChainId` | **bigint** (mode number) | nullable; some L1s exceed INT32_MAX |
| `rpcUrl`, `explorerUrl`, `websiteUrl`, `logoUrl` | text | links |
| `vmType` | text default `"unknown"` | `subnet-evm` \| `evm-custom` \| `custom` |
| `category`, `tokenSymbol` | text | curated metadata |
| `createBlockTimestamp` | bigint | chain genesis time |
| `isActive` | bool default true | discovered & live |
| `isEvm` | bool default false | EVM-compatible |
| `isFeatured` | bool default false | set when matched to a curated known chain |
| `enabled` | bool default true | controls API visibility + which chains get ingested |
| `createdAt`, `updatedAt` | timestamp | |

Indexes on `subnetId`, `evmChainId`, `slug` (unique), `vmType`, `enabled`.

**`chain_metrics`** — daily time-series, **unique on `(chainId, date)`** (this uniqueness underpins all upserts). FK to `chains` with `onDelete: cascade`. Fields by source:
- *Validators (P-Chain)*: `validatorCount`, `totalStakeWeight`.
- *TVL (DeFiLlama)*: `tvlUsd` (real).
- *EVM RPC sampling (legacy/fallback)*: `latestBlockNumber`, `recentTxCount`, `avgGasPrice`, `avgBlockTime`, `estimatedDailyTxs`.
- *AvaCloud Metrics API (accurate, pre-aggregated)*: `actualDailyTxs`, `activeAddresses`, `cumulativeAddresses`, `tps`, `peakTps`, `avgGasConsumption`.
- `createdAt`, `updatedAt`.

Indexes: unique `(chainId, date)`, plus `date`.

**`chain_validators`** — per-validator records, **unique on `(chainId, nodeId)`**, FK cascade. Fields: `nodeId`, `weight`, `isConnected`, `uptimePercent`, `startTime`, `endTime`, `delegationFee`, `delegatorCount`, `delegatorWeight`, `updatedAt`.

**`ingestion_log`** — audit trail of pipeline jobs: `jobName`, `status` (`success`/`error`), `chainsProcessed`, `errorMessage`, `durationMs`, `startedAt`, `completedAt`.

### 2.2 Types — `src/types.ts`
TypeScript interfaces for: Glacier responses (`GlacierBlockchain`, `GlacierBlockchainsResponse`), P-Chain (`PChainValidator`, `PChainValidatorsResponse`), DeFiLlama (`DeFiLlamaChain`), EVM RPC (`EvmBlock`), and the API response shapes `ChainWithMetrics` (chain row + flattened `latestMetrics`) and `OverviewStats`.

### 2.3 Constants — `src/constants.ts`
- **`KNOWN_CHAINS_BY_EVM_ID`** — a hand-curated map (~30 entries) keyed by `evmChainId`, providing name/rpcUrl/explorer/website/category/tokenSymbol/description and an optional `defillamaId`. Used during discovery to enrich and **feature** well-known chains (DFK 53935, Dexalot 432204, Beam 4337, Swimmer 73772, plus many smaller subnets). Lookups are by `evmChainId` because it's more reliable than the variable `blockchainId`.
- **`EXCLUDED_EVM_CHAIN_IDS`** — `{43114}` (C-Chain / Avalanche mainnet) is excluded from the dashboard.
- **`EXCLUDED_BLOCKCHAIN_NAMES`** — `{C-Chain, X-Chain, P-Chain}` (the primary network chains) are excluded.

### 2.4 Utils — `src/utils.ts`
- `slugify(name)` — lowercase, non-alnum → `-`, trim, cap 60 chars.
- `dedupeSlug(slug, existingSet)` — appends `-2`, `-3`, … to avoid slug collisions.
- `hexToNumber`, `weiToGwei` — hex/wei helpers for EVM data.
- `formatUsd`, `formatNumber` — human-readable B/M/K formatting (server-side variant).
- `todayDateString()` — `YYYY-MM-DD` for today (UTC ISO date). **This is the key that ties metrics to "today."**
- Constants: `SUBNET_EVM_VM_PREFIX = "srEXiWaH"` (used to detect SubnetEVM chains by `vmId`), `PRIMARY_NETWORK_SUBNET_ID = "11111111111111111111111111111111LpoYY"` (skipped during validator fetch).

### 2.5 DB factory — `src/db/index.ts`
`createDb(databaseUrl)` wires `neon()` to Drizzle (`neon-http` driver) with the schema, returning a typed `Database`. Used by the server and every script.

---

## 3. Backend Server (`apps/server`)

### 3.1 Entry point — `src/index.ts`
Creates the DB, builds a Hono app, applies `logger()` and permissive `cors()` (origin `*`, GET/POST/OPTIONS). Mounts:
- `GET /health` — `{ status: "ok", timestamp }`.
- `/api/chains` ← `chainsRoutes` **and** `metricsRoutes` (both mounted under the same prefix; metrics adds the `:slug/metrics` sub-route).
- `/api/overview` ← `overviewRoutes`.
- `/api/ingest` ← `ingestRoutes`.

Starts `@hono/node-server` on `PORT` (default 8787).

### 3.2 External API clients (`src/clients/`)
Thin `fetch` wrappers, one per data source:

- **`glacier.ts`** — `fetchAllBlockchains()` pages through `https://glacier-api.avax.network/v1/networks/mainnet/blockchains` (pageSize 500, follows `nextPageToken`) and returns all blockchains. *(Note: the project README/CLAUDE.md mentions a `v2/blockchains` URL; the actual code calls the `v1/networks/mainnet` endpoint.)*
- **`pchain.ts`** — JSON-RPC 2.0 POST to `https://api.avax.network/ext/bc/P`. `fetchCurrentValidators(subnetId)` calls `platform.getCurrentValidators` and returns the validators array.
- **`defillama.ts`** — `fetchAllChainsTvl()` GETs `https://api.llama.fi/v2/chains` (TVL per chain).
- **`evm-rpc.ts`** — generic JSON-RPC with a 10s `AbortController` timeout. Helpers: `fetchBlockNumber` (`eth_blockNumber`), `fetchBlockByNumber` (`eth_getBlockByNumber`, txs as hashes only), `fetchChainId` (`eth_chainId`).
- **`avacloud.ts`** — AvaCloud Metrics API at `https://metrics.avax.network/v2`. `fetchSupportedChains()` lists mainnet-only supported chains; `fetchChainMetric(evmChainId, metric, opts)` fetches one metric (day/hour interval, pageSize); `fetchAllChainMetrics(evmChainId)` fetches 8 metrics in parallel (`txCount`, `activeAddresses`, `cumulativeAddresses`, `avgTps`, `maxTps`, `gasUsed`, `avgGasPrice`, `cumulativeTxCount`) using `Promise.allSettled`, returning `null` per-metric on failure. It prefers the most-recent data point but accepts up to ~72h-old data, falling back to the second point if the latest is stale.

### 3.3 Ingestion pipeline (`src/services/ingestion/`)

Triggered by `pnpm seed` (`seed.ts` → `runAllIngestion`) or `POST /api/ingest`. **Five sequential steps**, each wrapped by `runJob()` which logs to `ingestion_log` and returns a `{name, status, chainsProcessed, durationMs}` result. Steps run in order because each depends on `chains` being populated/updated first.

**Orchestrator — `run-all.ts`**
`runAllIngestion(db)` runs, in sequence:
1. `discover-chains`
2. `fetch-validators`
3. `fetch-tvl`
4. `fetch-evm-metrics`
5. `fetch-avacloud-metrics`

Each is timed and audited; the function prints a summary and returns all job results. `seed.ts` exits non-zero if any job errored.

**Step 1 — `discover-chains.ts`**
- Fetches all blockchains from Glacier.
- Pre-loads existing slugs and a `blockchainId → slug` map so re-runs reuse slugs (avoids unique-constraint churn).
- For each blockchain: skips excluded names (`C/X/P-Chain`) and excluded EVM ids (43114). Enriches from `KNOWN_CHAINS_BY_EVM_ID`. Detects EVM-ness: `isSubnetEvm = vmId.startsWith("srEXiWaH")`; `isEvm = isSubnetEvm || !!evmChainId`; `vmType = subnet-evm | evm-custom | custom`. Builds a name (known name → Glacier name → `chain-<id8>`) and a deduped slug for new chains.
- **Upserts** into `chains` in concurrent batches of 20 via `onConflictDoUpdate` on `blockchainId`. New known chains get `isFeatured = true`. Returns count processed.

**Step 2 — `fetch-validators.ts`**
- Selects active chains, groups their ids by `subnetId` (skipping the primary network subnet).
- Processes subnets with **concurrency 10**. For each subnet: fetch current validators from P-Chain, compute `validatorCount` and summed `totalStakeWeight`. For every chain in that subnet, upsert today's `chain_metrics` row (validator count + weight) and upsert each individual validator into `chain_validators` (weight, connected, uptime, start/end, delegation fee, delegator count/weight) keyed on `(chainId, nodeId)`.

**Step 3 — `fetch-tvl.ts`**
- Fetches DeFiLlama chains, builds three lookup maps: by `chainId`, by exact `name`, and by `normalizeName(name)` (strips suffixes like chain/network/subnet/l1/l2/mainnet/evm and non-alnum).
- For each active chain, tries to find TVL in priority order: **(1)** by `evmChainId` (skipping `SKIP_TVL_CHAIN_IDS` — a big set of well-known non-Avalanche chain ids like 1=ETH, 137=Polygon, 8453=Base, etc., to prevent false matches), **(2)** curated `defillamaId` from known map, **(3)** exact name, **(4)** fuzzy normalized name (≥3 chars). On a positive match, upserts today's `tvlUsd`. Returns matched count (typically a handful of chains).

**Step 4 — `fetch-evm-metrics.ts`** (multi-block sampling — the more accurate, current approach)
- Selects active EVM chains that have an `rpcUrl`. Processes with **concurrency 5**.
- Per chain (`processChain`): get latest block number + timestamp; probe a block ~100 back to estimate block time; compute blocks-in-24h and a capped lookback (`MIN 100 … MAX 50000` blocks, also capped to a day's worth). Fetch the oldest block to measure the true time span and compute `avgBlockTime`. **Sample `SAMPLE_POINTS = 50`** evenly-spaced blocks across the range (fetched in sub-batches of 10), count txs per block and collect `baseFeePerGas`. Then: `avgTxsPerBlock × blocksPerDay = estimatedDailyTxs`, average gas price across samples, `recentTxCount` = last block's tx count. Upserts these into today's metrics row. Errors are caught per-chain (non-fatal). Returns success count.

**Step 5 — `fetch-avacloud-metrics.ts`** (accurate, pre-aggregated — the preferred source)
- Fetches AvaCloud's supported mainnet chains; intersects with our active EVM chains that have an `evmChainId`.
- For each eligible chain (**concurrency 5**), `fetchAllChainMetrics` and upsert `actualDailyTxs` (from txCount), `activeAddresses`, `cumulativeAddresses`, `tps` (avgTps), `peakTps` (maxTps), `avgGasConsumption` (gasUsed) into today's metrics row. Failures are logged but non-fatal.

**Why two transaction sources?** EVM RPC sampling (`estimatedDailyTxs`) is a best-effort estimate available for any chain with an RPC. AvaCloud (`actualDailyTxs`) is accurate but only covers chains AvaCloud supports. Throughout the API and UI, **`actualDailyTxs` is preferred and falls back to `estimatedDailyTxs`** (`COALESCE(actualDailyTxs, estimatedDailyTxs, 0)`).

### 3.4 Query services (`src/services/queries/`)

**`chains.ts`**
- `listChains(db, opts)` — the workhorse. Builds WHERE from `enabled` (default true), `vmType` (≠`all`), `category`, `search` (`ilike` on name). LEFT JOINs `chain_metrics` **on today's date only** (so data goes stale after UTC midnight). Sorts by `tvl` / `validators` / `daily_txs` (COALESCE-based, daily_txs = actual→estimated) or `name`, with default order asc for name and desc otherwise. Paginates (`limit` capped at 500, `offset`). Also runs a `count(*)` for `total`. Maps rows into `ChainWithMetrics` (chain + flattened `latestMetrics` or null).
- `getChainBySlug(db, slug)` — same today-join for one chain, plus all `chain_validators` for it ordered by weight desc. Returns chain + `latestMetrics` + `validators[]`, or null.

**`metrics.ts`**
- `getMetricsHistory(db, slug, days=30)` — resolves chain by slug, computes a `fromDate = today − days`, returns all `chain_metrics` rows since then ordered date-desc, mapping every metric field. Returns null if the chain doesn't exist.

### 3.5 Routes (`src/routes/`)
- **`chains.ts`** — `GET /api/chains` (reads query params: `sort`, `order`, `vm_type`, `category`, `search`, `enabled`, `limit≤500`, `offset`) → `listChains`. `GET /api/chains/:slug` → `getChainBySlug`, 404 if missing.
- **`metrics.ts`** — `GET /api/chains/:slug/metrics?days=` (capped at 90) → `getMetricsHistory`, 404 if missing.
- **`overview.ts`** — `GET /api/overview`: aggregate counts via SQL (`totalChains`, `totalSubnets` = distinct subnetId, `evmChains` = filter isEvm, `enabledChains` = filter enabled), total TVL = `sum(tvlUsd)` for today, top-10 by TVL and top-10 by daily_txs via `listChains`, and `lastIngestionAt` from the latest successful `ingestion_log`. Returns the `OverviewStats` shape.
- **`ingest.ts`** — `POST /api/ingest`: if `CRON_SECRET` is set, requires `Authorization: Bearer <secret>` (else 401). Runs `runAllIngestion` and returns `{status: success|partial, jobs}`. Designed to be called by an external cron.

---

## 4. Frontend (`apps/web`)

Next.js 16 App Router, dark theme, Avalanche-red accents.

### 4.1 Shared frontend lib (`src/lib/`)
- **`api.ts`** — `fetchApi` wraps `fetch` against `NEXT_PUBLIC_API_URL` with **ISR `next: { revalidate: 30 }`** (30s cache). Re-declares `Chain`, `ChainMetrics`, `OverviewData`, `ChainsListResponse`, `MetricsHistoryResponse` types (mirrors backend). Exposes `getOverview`, `getChains(params)`, `getChainBySlug(slug)`, `getMetricsHistory(slug, days)`.
- **`format.ts`** — UI formatters: `formatUsd`/`formatNumber`/`formatCompact` (return `—` for null), `vmTypeBadge` (label+Tailwind color for SubnetEVM/EVM/Custom), `categoryBadge` (gaming/defi/infra/nft colors).

### 4.2 Layout & theme
- **`app/layout.tsx`** — root layout, forces `dark` class, Geist Sans/Mono fonts, sticky header (logo + nav: Overview / Chains / API), centered `<main>`, footer crediting data sources. Sets page `<title>`/description.
- **`app/globals.css`** — Tailwind v4 `@import` + `@theme inline` defining CSS color variables: `background #0a0a0f`, `card #111118`, `border #222233`, `muted #888899`, `avax-red #e84142` (+ dim/hover), success/warning, and font vars. Custom thin scrollbar.

### 4.3 Pages (`app/`)
- **`/` — `page.tsx`** (`force-dynamic`, server component): awaits `getOverview()`. Renders a hero, four `StatCard`s (Total L1s, Subnets, EVM Chains, Total TVL), and two leaderboards ("Top by TVL", "Top by Daily Transactions") built from `topChainsByTvl`/`topChainsByTxs` (filtered to >0, sliced to 8) via `ChainRow`, plus a "last updated" line. Each row links to `/chains/[slug]` and shows VM/category badges and the relevant metric (txs row uses `actualDailyTxs ?? estimatedDailyTxs`).
- **`/chains` — `page.tsx`** (`"use client"`): on mount fetches `/api/chains?limit=500` directly, then does **all filtering/sorting client-side** with `useMemo`. Search matches name/slug/blockchainId; VM-type `<select>` filter; sortable columns (Chain/Validators/TVL/Daily Txs) with toggle arrows. Renders a responsive table; columns hide at breakpoints. Daily-txs uses actual→estimated fallback.
- **`/chains/[slug]` — `page.tsx`** (server component): in parallel awaits `getChainBySlug` and `getMetricsHistory(slug, 30)` (history failures swallowed). Renders breadcrumb, header (badges, token symbol, description, website/explorer links), five `MetricCard`s (Validators+stake weight, TVL, Daily/Est. Daily Txs, Gas Price gwei, Block Time s), the metrics chart (only if >1 data point), and a "Technical Details" panel (blockchainId, subnetId, vmId, evmChainId, rpcUrl, latest block, created date). Includes small inline `CopyButton`/`DetailRow` helpers.
- **`/chains/[slug]/metrics-chart.tsx`** (`"use client"`): Recharts `AreaChart` with three tabbed series — TVL, Daily Txs (actual→estimated), Validators — each with its own value formatter. Shows an empty state when a series has no data. Red gradient fill, custom dark tooltip.
- **`/api-docs` — `page.tsx`**: static documentation listing the four read-only endpoints with params and example `curl` commands, using `NEXT_PUBLIC_API_URL` as the base.

---

## 5. Operational Scripts (`scripts/`)

Run via the server workspace's tsx:
```bash
pnpm --filter @palladium/server exec tsx ../../scripts/<name>.ts [args]
```
All load `dotenv`, build `createDb(DATABASE_URL)`, and parse `--flag value` args. Scripts import the server's clients directly (`../apps/server/src/clients/*.js`).

**Ingestion scripts** (re-implement pipeline logic, allow a custom `--date`, defaulting to today):
- `ingest-single-chain.ts` — `--slug` or `--id` [`--date`]: validators + TVL + EVM (simple 10-block estimate, not the 50-sample method) for one chain.
- `ingest-multiple-chains.ts` — `--slugs a,b,c` [`--date`]: same, for several chains (concurrency 5), pre-fetching DeFiLlama once.
- `ingest-all-chains.ts` — [`--date`]: the **full 4-source pipeline for all enabled chains** with the multi-block (50-sample) EVM method + AvaCloud; effectively `pnpm seed` with a date override and a larger `SKIP_TVL_CHAIN_IDS` set.
- `backfill-date-range.ts` — `--from --to` [`--slugs`]: seeds a **range of dates**. Pre-fetches external data once (validators, TVL, multi-block EVM, and AvaCloud *historical* series via larger pageSize), then writes rows per date. AvaCloud historical data is mapped per-date and overwrites EVM estimates. Note: validator/TVL/EVM reflect *current* state across all dates (no historical snapshots from those sources); only AvaCloud provides real historical values.

**Data management / debugging scripts:**
- `toggle-chain.ts` — `--slug --enabled true|false`: flips the `enabled` flag (controls visibility + ingestion).
- `delete-metrics.ts` — delete metric rows by `--slug`, `--date`, or `--from/--to` (refuses to run with no conditions; counts before deleting).
- `inspect-chain.ts` — `--slug`/`--id`: prints full chain JSON, a table of recent metrics, and stored validators.
- `check-db.ts` — totals, chains with RPC URLs, featured chains, EVM count.
- `check-known.ts` — verifies curated known chains (DFK/Beam/Dexalot/Swimmer) resolved correctly.
- `fix-tvl.ts` — one-off: clears false TVL on the `mainnetl1` chain.
- `alter-schema.ts` — one-time migration: `TRUNCATE chains CASCADE` then `ALTER COLUMN evm_chain_id TYPE bigint` (some L1 chain ids exceed INT32).

---

## 6. Important Patterns & Gotchas

- **"Today" coupling**: list/overview/detail queries JOIN `chain_metrics` on `todayDateString()`. After UTC midnight, today's metrics don't exist yet, so values appear blank until the day's ingestion runs. The pipeline is meant to run **daily**. (`getMetricsHistory` is the exception — it returns a date range.)
- **Idempotent upserts**: every metric write uses `onConflictDoUpdate` on the relevant unique index (`(chainId, date)` for metrics, `(chainId, nodeId)` for validators, `blockchainId` for chains), so re-running is safe and only updates the supplied columns.
- **Two tx-count sources, one preference**: `actualDailyTxs` (AvaCloud, accurate) is always preferred over `estimatedDailyTxs` (RPC sampling) via COALESCE in SQL and `??` in the UI. The most recent commits on this branch are about prioritizing actual over estimated daily transactions and improving multi-block sampling/TVL matching.
- **EVM detection** relies on the SubnetEVM `vmId` prefix (`srEXiWaH`) or the presence of an `evmChainId`.
- **TVL false-match prevention**: `SKIP_TVL_CHAIN_IDS` blocks well-known non-Avalanche chain ids so a subnet that happens to reuse id 1/137/8453/etc. isn't credited with Ethereum/Polygon/Base TVL. The set in `discover/fetch-tvl` is smaller than the expanded set in `ingest-all-chains.ts`.
- **Curated metadata**: `KNOWN_CHAINS_BY_EVM_ID` is how chains get nice names, RPC URLs, categories, token symbols, and the featured ★ — keyed by `evmChainId` for reliability.
- **`enabled` vs `isActive`**: `isActive` marks a chain as discovered/live (set during discovery); `enabled` is the operator toggle that controls API visibility and which chains the all-chains scripts ingest. The main pipeline steps filter on `isActive`; the `ingest-all-chains.ts` script filters on `enabled`.
- **bigint columns**: `evmChainId`, `totalStakeWeight`, `latestBlockNumber`, validator weights, timestamps — stored as Postgres `bigint` (Drizzle `mode: number`).
- **Shared package has no build**: it ships raw `.ts`; this is why imports work under `tsx` and why scripts can import server client `.ts` files via `.js` specifiers.
- **Frontend caching**: server-fetched data uses ISR `revalidate: 30`, except the overview page which is `force-dynamic`; the `/chains` directory fetches client-side on mount (no SSR cache).

---

## 7. Request/Response Quick Reference

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /health` | none | liveness check |
| `GET /api/overview` | none | aggregate stats + top-10 TVL/txs leaderboards + last ingestion time |
| `GET /api/chains?sort&order&vm_type&category&search&enabled&limit&offset` | none | paginated chain list + today's metrics; `{chains, total}` |
| `GET /api/chains/:slug` | none | one chain + today's metrics + validators; `{chain}` or 404 |
| `GET /api/chains/:slug/metrics?days=` (≤90) | none | time-series metrics; `{chainId, slug, metrics[]}` or 404 |
| `POST /api/ingest` | `Bearer CRON_SECRET` | run full 5-step pipeline; `{status, jobs}` |
```
