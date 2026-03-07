# Palladium — Database Scripts

Manual database operations for the Palladium Avalanche L1 Explorer.

All scripts use the `DATABASE_URL` from the root `.env` file and are run via the server workspace's `tsx`:

```bash
pnpm --filter @palladium/server exec tsx ../../scripts/<script-name>.ts [args]
```

---

## Ingestion Scripts

### `ingest-single-chain.ts`

Ingest all metrics (validators, TVL, EVM) for a **single chain** by slug or DB id.

```bash
# By slug
pnpm --filter @palladium/server exec tsx ../../scripts/ingest-single-chain.ts --slug dfk-chain

# By DB id
pnpm --filter @palladium/server exec tsx ../../scripts/ingest-single-chain.ts --id 711

# Specify a date (defaults to today)
pnpm --filter @palladium/server exec tsx ../../scripts/ingest-single-chain.ts --slug beam --date 2026-03-01
```

### `ingest-multiple-chains.ts`

Ingest metrics for **multiple chains** by slug.

```bash
# Comma-separated slugs
pnpm --filter @palladium/server exec tsx ../../scripts/ingest-multiple-chains.ts --slugs dfk-chain,beam,dexalotevm

# With custom date
pnpm --filter @palladium/server exec tsx ../../scripts/ingest-multiple-chains.ts --slugs dfk-chain,beam --date 2026-03-01
```

### `ingest-all-chains.ts`

Full ingestion for **all enabled chains** (same as `pnpm seed` but allows a custom date).

```bash
# Today (same as seed)
pnpm --filter @palladium/server exec tsx ../../scripts/ingest-all-chains.ts

# Specific date
pnpm --filter @palladium/server exec tsx ../../scripts/ingest-all-chains.ts --date 2026-03-01
```

### `backfill-date-range.ts`

Backfill metrics for a **range of dates** for all or specific chains. Useful for seeding historical data.

```bash
# Backfill last 7 days for all chains
pnpm --filter @palladium/server exec tsx ../../scripts/backfill-date-range.ts --from 2026-03-01 --to 2026-03-07

# Backfill specific chains over a range
pnpm --filter @palladium/server exec tsx ../../scripts/backfill-date-range.ts --from 2026-03-01 --to 2026-03-07 --slugs dfk-chain,beam
```

---

## Data Management Scripts

### `toggle-chain.ts`

Enable or disable a chain (sets the `enabled` flag).

```bash
# Disable a chain
pnpm --filter @palladium/server exec tsx ../../scripts/toggle-chain.ts --slug some-chain --enabled false

# Re-enable it
pnpm --filter @palladium/server exec tsx ../../scripts/toggle-chain.ts --slug some-chain --enabled true
```

### `delete-metrics.ts`

Delete metric rows for a chain or date range.

```bash
# Delete all metrics for a chain
pnpm --filter @palladium/server exec tsx ../../scripts/delete-metrics.ts --slug dfk-chain

# Delete metrics for a specific date
pnpm --filter @palladium/server exec tsx ../../scripts/delete-metrics.ts --slug dfk-chain --date 2026-03-01

# Delete metrics for a date range
pnpm --filter @palladium/server exec tsx ../../scripts/delete-metrics.ts --slug dfk-chain --from 2026-03-01 --to 2026-03-05

# Delete ALL metrics for a date (all chains)
pnpm --filter @palladium/server exec tsx ../../scripts/delete-metrics.ts --date 2026-03-01
```

### `inspect-chain.ts`

Print full chain info and latest metrics for debugging.

```bash
pnpm --filter @palladium/server exec tsx ../../scripts/inspect-chain.ts --slug dfk-chain
```

---

## Existing Utility Scripts

| Script | Purpose |
|---|---|
| `check-db.ts` | Counts chains, lists chains with RPC URLs, shows featured chains |
| `check-known.ts` | Validates known chain lookups (DFK, Beam, Dexalot, etc.) |
| `fix-tvl.ts` | Clears false TVL data for mainnetl1 chain |
| `alter-schema.ts` | One-time migration: changes evm_chain_id to bigint |
