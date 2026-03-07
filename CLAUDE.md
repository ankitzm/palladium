# PALLADIUM — Avalanche L1 Discovery Dashboard

## Project Overview

Palladium is an open-source Avalanche L1 chain explorer that indexes every Avalanche L1, tracks health metrics (validators, TVL, transactions, gas), and exposes a public dashboard + REST API. Think "L1Beat for Avalanche."

## Architecture

pnpm monorepo with three workspaces:

```
palladium/
├── apps/server/       # Hono backend API (port 8787)
├── apps/web/          # Next.js 16 frontend (port 3000)
├── packages/shared/   # DB schema, types, constants, utils
└── scripts/           # Manual DB operation scripts
```

## Tech Stack

- **Backend**: Hono + @hono/node-server, TypeScript
- **Frontend**: Next.js 16 (App Router, Turbopack), Tailwind CSS v4, Recharts
- **Database**: Neon PostgreSQL via `@neondatabase/serverless` + Drizzle ORM
- **Shared**: Drizzle schema, TypeScript types, constants, utils

## Key Commands

```bash
pnpm dev              # Run both server + web in parallel
pnpm dev:server       # Hono server only (port 8787)
pnpm dev:web          # Next.js only (port 3000)
pnpm build            # Build all (shared first, then server + web)
pnpm seed             # Run full ingestion pipeline (~60s)
pnpm db:push          # Push Drizzle schema to Neon
```

## Environment Variables

Required in root `.env`:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `CRON_SECRET` — Bearer token for POST /api/ingest
- `PORT` — Server port (default 8787)

Frontend uses `apps/web/.env.local`:
- `NEXT_PUBLIC_API_URL` — Backend URL (default http://localhost:8787)

## Database Schema (packages/shared/src/db/schema.ts)

4 tables:
- **chains** — All Avalanche L1 metadata (384 rows). Has `enabled` boolean toggle to control ingestion + visibility. Key fields: blockchainId, subnetId, vmId, slug, evmChainId, rpcUrl, vmType (subnet-evm | evm-custom | custom), category, isFeatured.
- **chain_metrics** — Daily time-series metrics per chain. Unique on (chain_id, date). Fields: validatorCount, totalStakeWeight, tvlUsd, latestBlockNumber, recentTxCount, avgGasPrice, avgBlockTime, estimatedDailyTxs.
- **chain_validators** — Per-validator records. Unique on (chain_id, node_id).
- **ingestion_log** — Job execution audit trail.

## API Endpoints (apps/server/src/routes/)

All read-only, no auth required:
- `GET /api/overview` — Aggregate stats + top 10 leaderboards
- `GET /api/chains?sort=tvl&order=desc&vm_type=evm-custom&search=beam&limit=50&offset=0` — Paginated chain listing with filters
- `GET /api/chains/:slug` — Single chain detail + validators
- `GET /api/chains/:slug/metrics?days=30` — Time-series metrics (max 90 days)
- `POST /api/ingest` — Trigger ingestion (requires `Authorization: Bearer <CRON_SECRET>`)
- `GET /health` — Health check

## Ingestion Pipeline (apps/server/src/services/ingestion/)

Sequential 4-step pipeline triggered by `pnpm seed` or POST /api/ingest:
1. **discover-chains** — Glacier API → upsert chains table (384 chains, ~20s)
2. **fetch-validators** — P-Chain JSON-RPC per subnet → chain_metrics.validatorCount (~30s, concurrency=10)
3. **fetch-tvl** — DeFiLlama API → chain_metrics.tvlUsd (6 chains matched)
4. **fetch-evm-metrics** — EVM RPCs → block time, gas, daily txs (4-5 chains with RPC URLs)

## External Data Sources

- **Glacier API** (`glacier-api.avax.network/v2/blockchains`) — Chain discovery, no auth
- **P-Chain** (`api.avax.network/ext/bc/P`) — Validator data via `platform.getCurrentValidators`
- **DeFiLlama** (`api.llama.fi/v2/chains`) — TVL data
- **EVM RPCs** (per-chain `rpcUrl`) — Block numbers, timestamps, gas prices, tx counts

## Frontend Pages (apps/web/src/app/)

- `/` — Overview: stat cards + TVL/txs leaderboards (server component, force-dynamic)
- `/chains` — Directory: client-side table with search, VM type filter, sortable columns
- `/chains/[slug]` — Detail: metric cards, Recharts area charts, technical details
- `/api-docs` — API documentation page

## Theme

Dark theme with Avalanche Red (`#e84142`) accents. CSS variables defined in globals.css via Tailwind v4 `@theme inline`. Custom colors: background, card, card-hover, border, muted, avax-red, avax-red-dim.

## Scripts (scripts/)

Run with: `pnpm --filter @palladium/server exec tsx ../../scripts/<name>.ts [args]`

- `ingest-single-chain.ts` — `--slug dfk-chain [--date YYYY-MM-DD]`
- `ingest-multiple-chains.ts` — `--slugs slug1,slug2 [--date YYYY-MM-DD]`
- `ingest-all-chains.ts` — `[--date YYYY-MM-DD]`
- `backfill-date-range.ts` — `--from DATE --to DATE [--slugs slug1,slug2]`
- `toggle-chain.ts` — `--slug X --enabled true|false`
- `delete-metrics.ts` — `--slug X [--date DATE | --from/--to DATE]`
- `inspect-chain.ts` — `--slug X`

## Important Patterns

- Metrics are keyed by date — queries JOIN on today's date, so data goes stale after midnight. Run seed daily.
- `KNOWN_CHAINS_BY_EVM_ID` in constants.ts has curated metadata for DFK (53935), Dexalot (432204), Beam (4337), Swimmer (73772).
- `SKIP_TVL_CHAIN_IDS` in fetch-tvl.ts prevents false DeFiLlama matches for well-known non-Avalanche chain IDs (1=ETH, 137=Polygon, etc.).
- The shared package exports raw `.ts` files (no build step) — works with tsx in dev and tsc resolves via workspace references.
- evmChainId is `bigint` in Postgres (some Avalanche L1s have chain IDs > INT32_MAX).

## Code Conventions

- TypeScript strict mode throughout
- Drizzle ORM for all DB queries (no raw SQL except in scripts/alter-schema.ts)
- Hono routes return `c.json(...)` directly
- Next.js App Router with server components by default, `"use client"` only for interactive parts (charts, chain directory table)
- Tailwind utility classes, no CSS modules
- Imports use `@palladium/shared/*` workspace paths
