import type { PChainValidator, PChainValidatorsResponse } from "@palladium/shared/types";

const PCHAIN_URL = "https://api.avax.network/ext/bc/P";

async function callPChain<T>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(PCHAIN_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });

  if (!res.ok) throw new Error(`P-Chain HTTP error: ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error(`P-Chain RPC error: ${data.error.message}`);
  return data.result;
}

export async function fetchCurrentValidators(
  subnetId: string,
): Promise<PChainValidator[]> {
  const result = await callPChain<PChainValidatorsResponse>(
    "platform.getCurrentValidators",
    { subnetID: subnetId },
  );
  return result.validators ?? [];
}
