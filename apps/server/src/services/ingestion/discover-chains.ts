import { chains } from "@palladium/shared/db/schema";
import {
  KNOWN_CHAINS_BY_EVM_ID,
  EXCLUDED_BLOCKCHAIN_NAMES,
  EXCLUDED_EVM_CHAIN_IDS,
} from "@palladium/shared/constants";
import { slugify, dedupeSlug, SUBNET_EVM_VM_PREFIX } from "@palladium/shared/utils";
import { fetchAllBlockchains } from "../../clients/glacier.js";
import type { Database } from "@palladium/shared/db";

const BATCH_SIZE = 20;

export async function discoverChains(db: Database): Promise<number> {
  console.log("[discover-chains] Fetching blockchains from Glacier...");
  const glacierChains = await fetchAllBlockchains();
  console.log(`[discover-chains] Found ${glacierChains.length} blockchains`);

  const usedSlugs = new Set<string>();
  const allValues: (typeof chains.$inferInsert)[] = [];

  for (const gc of glacierChains) {
    if (EXCLUDED_BLOCKCHAIN_NAMES.has(gc.blockchainName)) continue;
    if (gc.evmChainId && EXCLUDED_EVM_CHAIN_IDS.has(gc.evmChainId)) continue;

    // Enrich from known chains by evmChainId
    const known = gc.evmChainId ? KNOWN_CHAINS_BY_EVM_ID[gc.evmChainId] : undefined;

    // EVM detection: standard SubnetEVM VM prefix OR has evmChainId
    const isSubnetEvm = gc.vmId.startsWith(SUBNET_EVM_VM_PREFIX);
    const isEvm = isSubnetEvm || !!gc.evmChainId;
    const vmType = isSubnetEvm ? "subnet-evm" : gc.evmChainId ? "evm-custom" : "custom";

    const chainName = known?.name ?? (gc.blockchainName || `chain-${gc.blockchainId.slice(0, 8)}`);
    const baseSlug = slugify(chainName);
    const slug = dedupeSlug(baseSlug, usedSlugs);
    usedSlugs.add(slug);

    allValues.push({
      blockchainId: gc.blockchainId,
      subnetId: gc.subnetId,
      vmId: gc.vmId,
      name: known?.name ?? (gc.blockchainName || `Unknown (${gc.blockchainId.slice(0, 8)})`),
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
      isEvm,
      isFeatured: !!known,
      enabled: true,
      updatedAt: new Date(),
    });
  }

  // Upsert in concurrent batches
  let processed = 0;
  for (let i = 0; i < allValues.length; i += BATCH_SIZE) {
    const batch = allValues.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((values) =>
        db
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
          }),
      ),
    );
    processed += batch.length;
  }

  console.log(`[discover-chains] Upserted ${processed} chains`);
  return processed;
}
