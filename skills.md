# Palladium — Skills & Capabilities Reference

Common tasks, workflows, and recipes for working with the Palladium codebase. Use this as a quick-action guide for AI assistants and contributors.

---

## Data Operations

### Populate fresh data
```bash
pnpm seed
```
Runs the full 4-step ingestion pipeline (~60s). Metrics are date-keyed, so this must be run daily to keep the dashboard current.

### Ingest a single chain
```bash
pnpm --filter @palladium/server exec tsx ../../scripts/ingest-single-chain.ts --slug dfk-chain
```

### Backfill historical data
```bash
pnpm --filter @palladium/server exec tsx ../../scripts/backfill-date-range.ts --from 2026-03-01 --to 2026-03-07
```
Note: TVL and EVM metrics reflect current-day values since the upstream APIs don't provide historical snapshots.

### Inspect a chain's data
```bash
pnpm --filter @palladium/server exec tsx ../../scripts/inspect-chain.ts --slug beam
```
Prints chain metadata, latest 30 days of metrics, and validator list.

### Toggle chain visibility
```bash
pnpm --filter @palladium/server exec tsx ../../scripts/toggle-chain.ts --slug some-chain --enabled false
```
The `enabled` flag controls both ingestion and UI visibility.

### Delete bad metrics
```bash
pnpm --filter @palladium/server exec tsx ../../scripts/delete-metrics.ts --slug mainnetl1 --date 2026-03-01
```

---

## Development

### Start dev servers
```bash
pnpm dev          # Both server (8787) + web (3000)
pnpm dev:server   # Hono backend only
pnpm dev:web      # Next.js frontend only
```

### Production build
```bash
pnpm build        # Builds shared → server + web
```

### Push schema changes
```bash
pnpm db:push      # Apply Drizzle schema to Neon DB
```

---

## Adding Features

### Add a new API endpoint
1. Create route file in `apps/server/src/routes/<name>.ts`
2. Export a Hono router with handlers returning `c.json(...)`
3. Mount it in `apps/server/src/index.ts` via `app.route("/api/<path>", router)`

### Add a new frontend page
1. Create `apps/web/src/app/<route>/page.tsx`
2. Use server components by default; add `"use client"` only for interactive parts
3. Fetch data via helpers in `apps/web/src/lib/api.ts`
4. Use Tailwind utility classes with theme variables (`bg-card`, `text-avax-red`, `border-border`)

### Add a new data source
1. Create API client in `apps/server/src/clients/<source>.ts`
2. Create ingestion step in `apps/server/src/services/ingestion/<step>.ts`
3. Wire it into the pipeline in `services/ingestion/run-all.ts`
4. If the source maps to existing chains, match by `evmChainId` or `blockchainId`

### Add curated chain metadata
Update `KNOWN_CHAINS_BY_EVM_ID` in `packages/shared/src/constants.ts` with:
```ts
[evmChainId]: {
  name: "Chain Name",
  slug: "chain-slug",
  defillamaId: "chain-name",  // must match DeFiLlama API's "name" field
  websiteUrl: "https://...",
  explorerUrl: "https://...",
  category: "gaming" | "defi" | "nft" | "infrastructure",
}
```

### Modify the database schema
1. Edit `packages/shared/src/db/schema.ts`
2. Run `pnpm db:push` to apply changes to Neon
3. Update any affected queries in `apps/server/src/services/queries/`

---

## Debugging

### Chain shows $0 TVL when it shouldn't
1. Check if the chain's `evmChainId` matches a DeFiLlama entry: `curl -s https://api.llama.fi/v2/chains | jq '.[] | select(.chainId == <ID>)'`
2. Verify it's not in `SKIP_TVL_CHAIN_IDS` in `fetch-tvl.ts`
3. If it's a new chain, add it to `KNOWN_CHAINS_BY_EVM_ID` with a `defillamaId`

### Chain shows inflated TVL
The chain's `evmChainId` likely matches a non-Avalanche chain (e.g., 1 = Ethereum). Add the ID to `SKIP_TVL_CHAIN_IDS` in `apps/server/src/services/ingestion/fetch-tvl.ts`.

### Dashboard shows no data
Metrics are date-keyed. If seed hasn't run today, the dashboard will be empty. Run `pnpm seed`.

### API returns empty results
1. Check the Hono server is running: `curl http://localhost:8787/health`
2. Verify `DATABASE_URL` in `.env` is correct
3. Check if chains are enabled: query `chains` table for `enabled = true`

### Frontend can't reach API
1. Verify `NEXT_PUBLIC_API_URL` in `apps/web/.env.local`
2. Check CORS is enabled in `apps/server/src/index.ts`
3. Confirm the server is running on the expected port

---

## API Quick Reference

```bash
# Overview stats
curl http://localhost:8787/api/overview

# List chains (sorted by TVL)
curl "http://localhost:8787/api/chains?sort=tvl&order=desc&limit=10"

# Search chains
curl "http://localhost:8787/api/chains?search=beam"

# Chain detail
curl http://localhost:8787/api/chains/beam

# Metrics history (30 days)
curl "http://localhost:8787/api/chains/beam/metrics?days=30"

# Trigger ingestion (requires auth)
curl -X POST http://localhost:8787/api/ingest -H "Authorization: Bearer $CRON_SECRET"
```

---

## Architecture Quick Facts

- **384 indexed chains** from Avalanche Glacier API
- **4 external data sources**: Glacier, P-Chain, DeFiLlama, EVM RPCs
- **Date-keyed metrics**: one row per chain per day, stale after midnight
- **bigint evmChainId**: some Avalanche L1s have chain IDs exceeding 2^31
- **Shared package**: exports raw `.ts` (no build step), resolved via workspace references
- **Theme**: dark background (`#0a0a0f`) + Avalanche Red (`#e84142`) accents
- **Frontend**: server components by default, `"use client"` only for charts and interactive table
