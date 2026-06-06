import {
  pgTable,
  text,
  integer,
  bigint,
  real,
  boolean,
  timestamp,
  date,
  serial,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── chains ─────────────────────────────────────────────────────────
export const chains = pgTable(
  "chains",
  {
    id: serial("id").primaryKey(),
    blockchainId: text("blockchain_id").notNull().unique(),
    subnetId: text("subnet_id").notNull(),
    vmId: text("vm_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    evmChainId: bigint("evm_chain_id", { mode: "number" }),
    rpcUrl: text("rpc_url"),
    explorerUrl: text("explorer_url"),
    websiteUrl: text("website_url"),
    vmType: text("vm_type").notNull().default("unknown"),
    category: text("category"),
    tokenSymbol: text("token_symbol"),
    logoUrl: text("logo_url"),
    createBlockTimestamp: bigint("create_block_timestamp", { mode: "number" }),
    isActive: boolean("is_active").notNull().default(true),
    isEvm: boolean("is_evm").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("chains_subnet_id_idx").on(table.subnetId),
    index("chains_evm_chain_id_idx").on(table.evmChainId),
    uniqueIndex("chains_slug_idx").on(table.slug),
    index("chains_vm_type_idx").on(table.vmType),
    index("chains_enabled_idx").on(table.enabled),
  ],
);

// ─── chain_metrics ──────────────────────────────────────────────────
export const chainMetrics = pgTable(
  "chain_metrics",
  {
    id: serial("id").primaryKey(),
    chainId: integer("chain_id")
      .notNull()
      .references(() => chains.id, { onDelete: "cascade" }),
    date: date("date").notNull(),

    // Validator data (from P-Chain)
    validatorCount: integer("validator_count"),
    totalStakeWeight: bigint("total_stake_weight", { mode: "number" }),

    // TVL + native token price (from DeFiLlama)
    tvlUsd: real("tvl_usd"),
    nativeTokenPriceUsd: real("native_token_price_usd"),

    // EVM RPC sampled data (legacy/fallback)
    latestBlockNumber: bigint("latest_block_number", { mode: "number" }),
    recentTxCount: integer("recent_tx_count"),
    avgGasPrice: real("avg_gas_price"),
    avgBlockTime: real("avg_block_time"),
    estimatedDailyTxs: integer("estimated_daily_txs"),

    // AvaCloud Metrics API (accurate, pre-aggregated)
    actualDailyTxs: integer("actual_daily_txs"),
    activeAddresses: integer("active_addresses"),
    cumulativeAddresses: integer("cumulative_addresses"),
    tps: real("tps"),
    peakTps: real("peak_tps"),
    avgGasConsumption: real("avg_gas_consumption"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("chain_metrics_chain_date_idx").on(table.chainId, table.date),
    index("chain_metrics_date_idx").on(table.date),
  ],
);

// ─── chain_validators ───────────────────────────────────────────────
export const chainValidators = pgTable(
  "chain_validators",
  {
    id: serial("id").primaryKey(),
    chainId: integer("chain_id")
      .notNull()
      .references(() => chains.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    // Post-Etna/ACP-77 L1 validator identity + remaining continuous-fee balance.
    validationId: text("validation_id"),
    remainingBalance: bigint("remaining_balance", { mode: "number" }),
    weight: bigint("weight", { mode: "number" }),
    // The following are populated only for Primary-Network-style records; L1
    // (subnet) validators do not report uptime/connection/delegation to P-Chain.
    isConnected: boolean("is_connected"),
    uptimePercent: real("uptime_percent"),
    startTime: bigint("start_time", { mode: "number" }),
    endTime: bigint("end_time", { mode: "number" }),
    delegationFee: real("delegation_fee"),
    delegatorCount: integer("delegator_count"),
    delegatorWeight: bigint("delegator_weight", { mode: "number" }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("chain_validators_chain_node_idx").on(
      table.chainId,
      table.nodeId,
    ),
    index("chain_validators_chain_idx").on(table.chainId),
  ],
);

// ─── primary_validators ─────────────────────────────────────────────
// Avalanche Primary-Network (AVAX) validators — network-wide, NOT per-L1.
// Sourced from Glacier GET /v1/networks/mainnet/validators, which (unlike L1
// validators) carries uptime, delegation, and geolocation. Kept in its own
// table because its shape and meaning differ from per-L1 chain_validators.
export const primaryValidators = pgTable(
  "primary_validators",
  {
    id: serial("id").primaryKey(),
    nodeId: text("node_id").notNull().unique(),
    txHash: text("tx_hash"),
    amountStaked: bigint("amount_staked", { mode: "number" }),
    amountDelegated: bigint("amount_delegated", { mode: "number" }),
    delegationFee: real("delegation_fee"),
    delegatorCount: integer("delegator_count"),
    uptimePercent: real("uptime_percent"),
    validatorHealth: real("validator_health"),
    stakePercentage: real("stake_percentage"),
    potentialRewards: bigint("potential_rewards", { mode: "number" }),
    startTimestamp: bigint("start_timestamp", { mode: "number" }),
    endTimestamp: bigint("end_timestamp", { mode: "number" }),
    validationStatus: text("validation_status"),
    country: text("country"),
    countryCode: text("country_code"),
    avalanchegoVersion: text("avalanchego_version"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("primary_validators_node_idx").on(table.nodeId),
    index("primary_validators_weight_idx").on(table.amountStaked),
  ],
);

// ─── ingestion_log ──────────────────────────────────────────────────
export const ingestionLog = pgTable("ingestion_log", {
  id: serial("id").primaryKey(),
  jobName: text("job_name").notNull(),
  status: text("status").notNull(),
  chainsProcessed: integer("chains_processed"),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
