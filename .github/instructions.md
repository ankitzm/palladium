# PALLADIUM — Avalanche L1 Discovery Dashboard

## What is this project?

Palladium is an open-source Avalanche L1 chain explorer that indexes every Avalanche L1 chain, tracks health metrics (validators, TVL, transactions, gas prices), and serves a public dashboard with a REST API. Similar to "L1Beat for Avalanche."

## Repository Structure

This is a pnpm monorepo:

```
palladium/
├── apps/
│   ├── server/              # Hono backend API (port 8787)
│   │   └── src/
│   │       ├── index.ts             # Entry point: Hono app with CORS, routes
│   │       ├── seed.ts              # Manual ingestion trigger
│   │       ├── clients/             # External API clients
│   │       │   ├── glacier.ts       # Avalanche Glacier chain discovery
│   │       │   ├── pchain.ts        # P-Chain validator data
│   │       │   ├── defillama.ts     # DeFiLlama TVL data
│   │       │   └── evm-rpc.ts       # Generic EVM JSON-RPC (blocks, gas, txs)
│   │       ├── routes/
│   │       │   ├── chains.ts        # GET /api/chains, GET /api/chains/:slug
│   │       │   ├── overview.ts      # GET /api/overview
│   │       │   ├── metrics.ts       # GET /api/chains/:slug/metrics
│   │       │   └── ingest.ts        # POST /api/ingest (cron-secured)
│   │       └── services/
│   │           ├── ingestion/       # 4-step data pipeline
│   │           │   ├── run-all.ts           # Orchestrator
│   │           │   ├── discover-chains.ts   # Glacier → chains table
│   │           │   ├── fetch-validators.ts  # P-Chain → chain_metrics
│   │           │   ├── fetch-tvl.ts         # DeFiLlama → chain_metrics
│   │           │   └── fetch-evm-metrics.ts # EVM RPCs → chain_metrics
│   │           └── queries/
│   │               ├── chains.ts    # listChains(), getChainBySlug()
│   │               └── metrics.ts   # getMetricsHistory()
│   └── web/                 # Next.js 16 frontend (port 3000)
│       └── src/
│           ├── app/
│           │   ├── layout.tsx               # Root layout (dark theme, nav)
│           │   ├── globals.css              # Tailwind v4 theme variables
│           │   ├── page.tsx                 # Overview dashboard
│           │   ├── chains/
│           │   │   └── page.tsx             # Chain directory (client component)
│           │   ├── chains/[slug]/
│           │   │   ├── page.tsx             # Chain detail
│           │   │   └── metrics-chart.tsx    # Recharts area chart
│           │   └── api-docs/
│           │       └── page.tsx             # API documentation
│           └── lib/
│               ├── api.ts                   # Backend fetch helpers
│               └── format.ts                # USD, number, badge formatters
├── packages/
│   └── shared/              # Shared code across server + web
│       └── src/
│           ├── db/
│           │   ├── schema.ts        # Drizzle ORM table definitions
│           │   └── index.ts         # createDb() factory
│           ├── types.ts             # TypeScript interfaces for all APIs
│           ├── constants.ts         # Known chains, exclusion lists
│           └── utils.ts             # slugify, formatters, constants
└── scripts/                 # Manual DB operations (see scripts/README.md)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | Hono + @hono/node-server |
| Frontend framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 with `@theme inline` |
| Charts | Recharts |
| ORM | Drizzle ORM |
| Database | Neon PostgreSQL via @neondatabase/serverless |
| Language | TypeScript (strict) throughout |
| Package manager | pnpm with workspace protocol |

## Database Tables (packages/shared/src/db/schema.ts)

### chains
Main registry of all Avalanche L1 chains (~384 rows). Key columns:
- `blockchainId` (text, unique) — Avalanche blockchain ID
- `subnetId`, `vmId` — Network identifiers
- `slug` (text, unique) — URL-safe identifier
- `evmChainId` (bigint) — EVM chain ID (bigint because some exceed INT32_MAX)
- `vmType` — "subnet-evm" | "evm-custom" | "custom"
- `enabled` (boolean) — Feature flag: controls ingestion + UI visibility
- `isFeatured` (boolean) — Highlighted in UI
- `rpcUrl`, `explorerUrl`, `websiteUrl` — External links

### chain_metrics
Daily time-series metrics. Unique constraint on (chain_id, date).
- `validatorCount`, `totalStakeWeight` — From P-Chain
- `tvlUsd` — From DeFiLlama
- `latestBlockNumber`, `recentTxCount`, `estimatedDailyTxs` — From EVM RPCs
- `avgGasPrice`, `avgBlockTime` — From EVM RPCs

### chain_validators
Per-validator records. Unique on (chain_id, node_id).

### ingestion_log
Audit trail for pipeline jobs.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/overview` | Aggregate stats + top 10 by TVL and daily txs |
| GET | `/api/chains` | Paginated list with sort/filter/search (max 500) |
| GET | `/api/chains/:slug` | Single chain detail with validators |
| GET | `/api/chains/:slug/metrics?days=30` | Time-series (max 90 days) |
| POST | `/api/ingest` | Trigger ingestion (needs Bearer CRON_SECRET) |
| GET | `/health` | Health check |

Query params for `/api/chains`: sort (name|tvl|validators|daily_txs), order (asc|desc), vm_type, category, search, limit, offset, enabled.

## Data Ingestion Pipeline

4-step sequential pipeline run via `pnpm seed` or `POST /api/ingest`:

1. **discover-chains** (~20s) — Fetches all blockchains from Glacier API, enriches from `KNOWN_CHAINS_BY_EVM_ID`, upserts into `chains` table
2. **fetch-validators** (~30s) — Queries P-Chain `platform.getCurrentValidators` for each subnet (concurrency=10), writes to `chain_metrics`
3. **fetch-tvl** (~4s) — Fetches from DeFiLlama, matches by evmChainId (skipping non-Avalanche IDs like ETH=1, Polygon=137), writes tvlUsd
4. **fetch-evm-metrics** (~4s) — Calls EVM RPCs for chains with rpcUrl, computes block time, gas price, daily tx estimate

## Key Patterns & Gotchas

- **Metrics are date-keyed**: Queries JOIN on today's date. Data goes stale after midnight — run seed daily.
- **SKIP_TVL_CHAIN_IDS**: Some Avalanche L1s reuse popular chain IDs (e.g., 1 = Ethereum). These are excluded from TVL matching.
- **Shared package has no build step**: Exports raw `.ts` files via package.json `exports` field.
- **evmChainId is bigint**: Some Avalanche L1 chain IDs exceed 2^31.
- **Duplicate chains in Glacier**: Some chains appear multiple times with different blockchainIds but same evmChainId.

## Commands

```bash
pnpm dev              # Run server (8787) + web (3000) in parallel
pnpm seed             # Run full ingestion pipeline (~60s)
pnpm build            # Build all: shared first, then server + web parallel
pnpm db:push          # Push Drizzle schema changes to Neon
```

## Environment Variables

Root `.env`:
- `DATABASE_URL` — Neon PostgreSQL URL
- `CRON_SECRET` — Auth token for ingestion endpoint
- `PORT` — Server port (default 8787)

`apps/web/.env.local`:
- `NEXT_PUBLIC_API_URL` — Backend URL (default http://localhost:8787)

## Code Style

- TypeScript strict, no `any`
- Drizzle ORM for all DB access
- Hono routes return `c.json(...)`
- Next.js server components by default; `"use client"` only for charts and interactive tables
- Tailwind utility classes, no CSS modules
- Workspace imports: `@palladium/shared/db`, `@palladium/shared/types`, `@palladium/shared/constants`, `@palladium/shared/utils`
