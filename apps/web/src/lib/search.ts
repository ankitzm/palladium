import type { Chain } from "@/types";
import { parseHumanNum } from "./format";

// Query-syntax search for the chain table. Grammar:
//   - input is split on whitespace into tokens; tokens are AND-combined
//   - a `key:value` token with a recognized key applies that typed filter
//   - any other token (bare word, or unknown key:value) falls through to a
//     case-insensitive substring match on name/slug
// Example: `vm:subnet-evm tvl:>100M beam`
//   = vmType == subnet-evm  AND  tvl > 100M  AND  name/slug contains "beam"

type Predicate = (c: Chain) => boolean;

function tvlOf(c: Chain): number {
  return c.latestMetrics?.tvlUsd ?? 0;
}

function numericCompare(value: string): Predicate | null {
  const m = value.match(/^([<>]=?)?\s*(.+)$/);
  if (!m) return null;
  const op = m[1] ?? ">=";
  const n = parseHumanNum(m[2]);
  if (n == null) return null;
  return (c) => {
    const v = tvlOf(c);
    switch (op) {
      case ">":
        return v > n;
      case ">=":
        return v >= n;
      case "<":
        return v < n;
      case "<=":
        return v <= n;
      default:
        return v >= n;
    }
  };
}

function substringMatch(q: string): Predicate {
  const lower = q.toLowerCase();
  return (c) =>
    c.name.toLowerCase().includes(lower) ||
    c.slug.toLowerCase().includes(lower) ||
    String(c.evmChainId ?? "").includes(lower) ||
    c.blockchainId.toLowerCase().includes(lower);
}

function tokenPredicate(token: string): Predicate {
  const colon = token.indexOf(":");

  // Raw on-chain identifier — match against blockchainId / subnetId.
  if ((token.startsWith("0x") || token.length >= 40) && colon === -1) {
    const lower = token.toLowerCase();
    return (c) =>
      c.blockchainId.toLowerCase().includes(lower) ||
      c.subnetId.toLowerCase().includes(lower);
  }

  if (colon > 0) {
    const key = token.slice(0, colon).toLowerCase();
    const value = token.slice(colon + 1);
    switch (key) {
      case "chainid":
      case "id": {
        const n = value.replace(/^0x/i, "");
        return (c) =>
          c.evmChainId != null &&
          (String(c.evmChainId) === value ||
            c.evmChainId.toString(16).toLowerCase() === n.toLowerCase());
      }
      case "vm":
        return (c) => c.vmType.toLowerCase() === value.toLowerCase();
      case "tvl": {
        const cmp = numericCompare(value);
        if (cmp) return cmp;
        break;
      }
      case "rpc":
        if (value.toLowerCase() === "live") return (c) => !!c.rpcUrl;
        if (value.toLowerCase() === "none") return (c) => !c.rpcUrl;
        break;
    }
  }

  // Unrecognized token → substring fallback.
  return substringMatch(token);
}

// Builds a single predicate from a query string. Empty query matches everything.
export function parseChainQuery(input: string): Predicate {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return () => true;
  const predicates = tokens.map(tokenPredicate);
  return (c) => predicates.every((p) => p(c));
}
