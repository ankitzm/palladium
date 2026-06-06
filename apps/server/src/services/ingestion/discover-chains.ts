import { chains } from "@palladium/shared/db/schema";
import {
  KNOWN_CHAINS_BY_EVM_ID,
  EXCLUDED_BLOCKCHAIN_NAMES,
  EXCLUDED_EVM_CHAIN_IDS,
} from "@palladium/shared/constants";
import { slugify, dedupeSlug, SUBNET_EVM_VM_PREFIX } from "@palladium/shared/utils";
import {
  fetchAllBlockchains,
  fetchRichChains,
} from "../../clients/glacier.js";
import type { GlacierChain } from "@palladium/shared/types";
import type { Database } from "@palladium/shared/db";

const BATCH_SIZE = 20;

interface RichMeta {
  name?: string;
  description?: string | null;
  rpcUrl?: string | null;
  wsUrl?: string | null;
  explorerUrl?: string | null;
  logoUrl?: string | null;
  tokenSymbol?: string | null;
  glacierStatus?: string | null;
  enabledFeatures?: string[] | null;
}

// Build lookup maps from the rich /v1/chains response, keyed by both the
// platform (blockchain) id and the evm chain id, so we can enrich the bare
// /blockchains universe with rpc/logo/token wherever Glacier has them.
function indexRichChains(rich: GlacierChain[]) {
  const byBlockchainId = new Map<string, RichMeta>();
  const byEvmId = new Map<number, RichMeta>();
  for (const c of rich) {
    const meta: RichMeta = {
      name: c.chainName || undefined,
      description: c.description || null,
      rpcUrl: c.rpcUrl || null,
      wsUrl: c.wsUrl || null,
      explorerUrl: c.explorerUrl || null,
      logoUrl: c.chainLogoUri || c.networkToken?.logoUri || null,
      tokenSymbol: c.networkToken?.symbol || null,
      glacierStatus: c.status || null,
      enabledFeatures: c.enabledFeatures && c.enabledFeatures.length ? c.enabledFeatures : null,
    };
    if (c.platformChainId) byBlockchainId.set(c.platformChainId, meta);
    const evmId = c.chainId ? Number(c.chainId) : NaN;
    if (Number.isFinite(evmId)) byEvmId.set(evmId, meta);
  }
  return { byBlockchainId, byEvmId };
}

export async function discoverChains(db: Database): Promise<number> {
  console.log("[discover-chains] Fetching universe + rich metadata from Glacier...");
  const [universe, rich] = await Promise.all([
    fetchAllBlockchains(),
    fetchRichChains().catch((e) => {
      console.warn(`[discover-chains] rich /chains failed: ${e}`);
      return [] as GlacierChain[];
    }),
  ]);
  console.log(
    `[discover-chains] ${universe.length} blockchains, ${rich.length} rich mainnet chains`,
  );
  const { byBlockchainId, byEvmId } = indexRichChains(rich);

  // Pre-load existing slugs to avoid unique-constraint churn.
  const existingRows = await db
    .select({ blockchainId: chains.blockchainId, slug: chains.slug })
    .from(chains);
  const usedSlugs = new Set<string>(existingRows.map((r) => r.slug));
  const existingSlugByBlockchainId = new Map<string, string>(
    existingRows.map((r) => [r.blockchainId, r.slug]),
  );

  const allValues: (typeof chains.$inferInsert)[] = [];

  for (const gc of universe) {
    if (EXCLUDED_BLOCKCHAIN_NAMES.has(gc.blockchainName)) continue;
    if (gc.evmChainId && EXCLUDED_EVM_CHAIN_IDS.has(gc.evmChainId)) continue;

    // Enrichment precedence: curated known-chains > Glacier rich > bare.
    const known = gc.evmChainId ? KNOWN_CHAINS_BY_EVM_ID[gc.evmChainId] : undefined;
    const richMeta =
      byBlockchainId.get(gc.blockchainId) ??
      (gc.evmChainId ? byEvmId.get(gc.evmChainId) : undefined);

    const isSubnetEvm = gc.vmId.startsWith(SUBNET_EVM_VM_PREFIX);
    const isEvm = isSubnetEvm || !!gc.evmChainId;
    const vmType = isSubnetEvm ? "subnet-evm" : gc.evmChainId ? "evm-custom" : "custom";

    const chainName =
      known?.name ??
      richMeta?.name ??
      gc.blockchainName ??
      `chain-${gc.blockchainId.slice(0, 8)}`;

    let slug = existingSlugByBlockchainId.get(gc.blockchainId);
    if (!slug) {
      slug = dedupeSlug(slugify(chainName), usedSlugs);
      usedSlugs.add(slug);
    }

    // Featured = either curated OR has rich onboarded metadata (rpc + logo).
    const isFeatured = !!known || (!!richMeta?.rpcUrl && !!richMeta?.logoUrl);

    allValues.push({
      blockchainId: gc.blockchainId,
      subnetId: gc.subnetId,
      vmId: gc.vmId,
      name:
        known?.name ??
        richMeta?.name ??
        gc.blockchainName ??
        `Unknown (${gc.blockchainId.slice(0, 8)})`,
      slug,
      description: known?.description ?? richMeta?.description ?? null,
      evmChainId: gc.evmChainId ?? null,
      rpcUrl: known?.rpcUrl ?? richMeta?.rpcUrl ?? null,
      wsUrl: richMeta?.wsUrl ?? null,
      explorerUrl: known?.explorerUrl ?? richMeta?.explorerUrl ?? null,
      websiteUrl: known?.websiteUrl ?? null,
      glacierStatus: richMeta?.glacierStatus ?? null,
      enabledFeatures: richMeta?.enabledFeatures ?? null,
      vmType,
      category: known?.category ?? null,
      tokenSymbol: known?.tokenSymbol ?? richMeta?.tokenSymbol ?? null,
      logoUrl: known?.logoUrl ?? richMeta?.logoUrl ?? null,
      createBlockTimestamp: gc.createBlockTimestamp ?? null,
      isActive: true,
      isEvm,
      isFeatured,
      enabled: true,
      updatedAt: new Date(),
    });
  }

  let processed = 0;
  let enriched = 0;
  for (let i = 0; i < allValues.length; i += BATCH_SIZE) {
    const batch = allValues.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((values) => {
        if (values.rpcUrl) enriched++;
        return db
          .insert(chains)
          .values(values)
          .onConflictDoUpdate({
            target: chains.blockchainId,
            set: {
              subnetId: values.subnetId,
              vmId: values.vmId,
              name: values.name,
              description: values.description,
              evmChainId: values.evmChainId,
              rpcUrl: values.rpcUrl,
              wsUrl: values.wsUrl,
              explorerUrl: values.explorerUrl,
              websiteUrl: values.websiteUrl,
              glacierStatus: values.glacierStatus,
              enabledFeatures: values.enabledFeatures,
              vmType: values.vmType,
              category: values.category,
              tokenSymbol: values.tokenSymbol,
              logoUrl: values.logoUrl,
              createBlockTimestamp: values.createBlockTimestamp,
              isEvm: values.isEvm,
              isFeatured: values.isFeatured,
              updatedAt: values.updatedAt,
            },
          });
      }),
    );
    processed += batch.length;
  }

  console.log(
    `[discover-chains] Upserted ${processed} chains (${enriched} with rpcUrl)`,
  );
  return processed;
}
