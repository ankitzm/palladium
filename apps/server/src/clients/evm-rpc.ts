import type { EvmBlock } from "@palladium/shared/types";

const RPC_TIMEOUT_MS = 5000;

async function callEvmRpc<T>(
  rpcUrl: string,
  method: string,
  params: unknown[] = [],
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`EVM RPC HTTP error: ${res.status}`);

    const data = await res.json();
    if (data.error) throw new Error(`EVM RPC error: ${data.error.message}`);
    return data.result;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchBlockNumber(rpcUrl: string): Promise<number> {
  const hex = await callEvmRpc<string>(rpcUrl, "eth_blockNumber");
  return parseInt(hex, 16);
}

export async function fetchBlockByNumber(
  rpcUrl: string,
  blockNum: number,
): Promise<EvmBlock> {
  const hex = `0x${blockNum.toString(16)}`;
  return callEvmRpc<EvmBlock>(rpcUrl, "eth_getBlockByNumber", [hex, false]);
}

export async function fetchChainId(rpcUrl: string): Promise<number> {
  const hex = await callEvmRpc<string>(rpcUrl, "eth_chainId");
  return parseInt(hex, 16);
}
