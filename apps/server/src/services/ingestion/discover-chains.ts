import { eq } from "drizzle-orm";
import { chains } from "@palladium/shared/db/schema";
import {
  KNOWN_CHAINS,
  EXCLUDED_BLOCKCHAIN_NAMES,
  EXCLUDED_EVM_CHAIN_IDS,
} from "@palladium/shared/constants";
import { slugify, dedupeSlug, SUBNET_EVM_VM_PREFIX } from "@palladium/shared/utils";
import { fetchAllBlockchains } from "../../clients/glacier.js";
import type { Database } from "@palladium/shared/db";

export async function discoverChains(db: Database): Promise<number> {
  console.log("[discover-chains] Fetching blockchains from Glacier...");
  const glacierChains = await fetchAllBlockchains();
  console.log(`[discover-chains] Found ${glacierChains.length} blockchains`);

  // Track existing slugs for deduplication
  const usedSlugs = new Set<string>();
  let processed = 0;

  for (const gc of glacierChains) {
    // Skip primary network chains
    if (EXCLUDED_BLOCKCHAIN_NAMES.has(gc.blockchainName)) continue;
    if (gc.evmChainId && EXCLUDED_EVM_CHAIN_IDS.has(gc.evmChainId)) continue;

    const isEvm = gc.vmId.startsWith(SUBNET_EVM_VM_PREFIX);
    const vmType = isEvm ? "subnet-evm" : "custom";
    const known = KNOWN_CHAINS[gc.blockchainId];

    // Generate deduplicated slug
    const baseSlug = slugify(known?.name ?? gc.blockchainName || `chain-${gc.blockchainId.slice(0, 8)}`);
    const slug = dedupeSlug(baseSlug, usedSlugs);
    usedSlugs.add(slug);

    const values = {
      blockchainId: gc.blockchainId,
      subnetId: gc.subnetId,
      vmId: gc.vmId,
      name: known?.name ?? gc.blockchainName || `Unknown (${gc.blockchainId.slice(0, 8)})`,
      slug,
      description: known?.description ?? null,
      evmChainId: gc.evmChainId ?? null,
      rpcUrl: known?.rpcUrl ?? null,
      explorerUrl: known?.explorerUrl ?? null,
      websiteUrl: known?.websiteUrl ?? null,
      vmType,
      category: known?.category ?? null,
      tokenSymbol: known?.tokenSymbol ?? null,
      logoUrl: known?.logoUrl ?? null,
      createBlockTimestamp: gc.createBlockTimestamp ?? null,
      isActive: true,
      isEvm: isEvm,
      isFeatured: !!known,
      enabled: true,
      updatedAt: new Date(),
    };

    // Upsert: insert or update on conflict
    await db
      .insert(chains)
      .values(values)
      .onConflictDoUpdate({
        target: chains.blockchainId,
        set: {
          subnetId: values.subnetId,
          vmId: values.vmId,
          name: values.name,
          // Don't overwrite slug on update to preserve URLs
          description: values.description,
          evmChainId: values.evmChainId,
          rpcUrl: values.rpcUrl,
          explorerUrl: values.explorerUrl,
          websiteUrl: values.websiteUrl,
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

    processed++;
  }

  console.log(`[discover-chains] Upserted ${processed} chains`);
  return processed;
}
