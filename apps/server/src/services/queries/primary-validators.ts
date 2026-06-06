import { asc, desc, sql } from "drizzle-orm";
import { primaryValidators } from "@palladium/shared/db/schema";
import type { Database } from "@palladium/shared/db";

export interface PrimaryValidatorRow {
  nodeId: string;
  amountStaked: number | null;
  amountDelegated: number | null;
  delegatorCount: number | null;
  delegationFee: number | null;
  uptimePercent: number | null;
  validatorHealth: number | null;
  stakePercentage: number | null;
  validationStatus: string | null;
  country: string | null;
  countryCode: string | null;
  avalanchegoVersion: string | null;
}

interface ListOptions {
  sort?: "stake" | "uptime" | "delegators";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

// Primary-Network (AVAX) validator listing — the network-wide staking set with
// uptime, delegation, and geolocation. Mirrors the {rows,total} shape of the
// other list queries.
export async function listPrimaryValidators(
  db: Database,
  opts: ListOptions = {},
): Promise<{ validators: PrimaryValidatorRow[]; total: number }> {
  const { sort = "stake", order = "desc", limit = 100, offset = 0 } = opts;
  const cappedLimit = Math.min(limit, 200);

  const sortCol =
    sort === "uptime"
      ? sql`COALESCE(${primaryValidators.uptimePercent}, 0)`
      : sort === "delegators"
        ? sql`COALESCE(${primaryValidators.delegatorCount}, 0)`
        : sql`COALESCE(${primaryValidators.amountStaked}, 0)`;

  const rows = await db
    .select({
      nodeId: primaryValidators.nodeId,
      amountStaked: primaryValidators.amountStaked,
      amountDelegated: primaryValidators.amountDelegated,
      delegatorCount: primaryValidators.delegatorCount,
      delegationFee: primaryValidators.delegationFee,
      uptimePercent: primaryValidators.uptimePercent,
      validatorHealth: primaryValidators.validatorHealth,
      stakePercentage: primaryValidators.stakePercentage,
      validationStatus: primaryValidators.validationStatus,
      country: primaryValidators.country,
      countryCode: primaryValidators.countryCode,
      avalanchegoVersion: primaryValidators.avalanchegoVersion,
    })
    .from(primaryValidators)
    .orderBy(order === "asc" ? asc(sortCol) : desc(sortCol))
    .limit(cappedLimit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(primaryValidators);

  return { validators: rows, total: Number(count) };
}
