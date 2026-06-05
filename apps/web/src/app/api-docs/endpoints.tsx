// Endpoint catalog for the interactive API reference. Single source of truth for
// every public Palladium route — method, path, params, request samples, and a
// representative response shape. The response bodies are illustrative schema
// examples (standard for API docs); the "Try it" panel on the page fetches the
// REAL response live, so nothing here is a stand-in for actual data.

import type { ReactNode } from "react";
import { syn } from "@/components/ui/syntax";
import type { CodeTab } from "@/components/ui/CodeBlock";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export interface Param {
  name: string;
  type: string;
  desc: string;
}

export interface Endpoint {
  id: string;
  method: "GET" | "POST";
  /** Path shown in the UI, e.g. /chains/:slug */
  path: string;
  /** Concrete path used for the live "Try it" call, e.g. /api/chains?limit=5 */
  examplePath: string;
  summary: string;
  description: string;
  /** Bearer-token / non-GET routes can't be safely fired from the browser. */
  tryable: boolean;
  /** /health lives at the root; everything else is mounted under /api. */
  rootMounted?: boolean;
  params?: Param[];
  response: ReactNode;
}

/** Absolute URL used by both the request samples and the live "Try it" call. */
export function urlFor(e: Endpoint): string {
  return e.rootMounted
    ? `${API_BASE}${e.examplePath}`
    : `${API_BASE}/api${e.examplePath}`;
}

function requestTabs(fullUrl: string): CodeTab[] {
  return [
    {
      label: "cURL",
      raw: `curl '${fullUrl}'`,
      content: (
        <>
          curl {syn.s(`'${fullUrl}'`)}
        </>
      ),
    },
    {
      label: "fetch",
      raw: `const res = await fetch('${fullUrl}')\nconst data = await res.json()`,
      content: (
        <>
          {syn.k("const")} res = {syn.k("await")} {syn.p("fetch")}(
          {syn.s(`'${fullUrl}'`)})
          {"\n"}
          {syn.k("const")} data = {syn.k("await")} res.{syn.p("json")}()
        </>
      ),
    },
    {
      label: "react-query",
      raw: `import { useQuery } from '@tanstack/react-query'\n\nuseQuery({\n  queryKey: ['palladium'],\n  queryFn: () => fetch('${fullUrl}').then(r => r.json()),\n})`,
      content: (
        <>
          {syn.k("import")} {"{ useQuery } "}
          {syn.k("from")} {syn.s("'@tanstack/react-query'")}
          {"\n\n"}
          {syn.p("useQuery")}({"{"}
          {"\n  "}
          {syn.p("queryKey")}: [{syn.s("'palladium'")}],
          {"\n  "}
          {syn.p("queryFn")}: () {"=>"} {syn.p("fetch")}({syn.s(`'${fullUrl}'`)}).
          {syn.p("then")}(r {"=>"} r.{syn.p("json")}()),
          {"\n})"}
        </>
      ),
    },
  ];
}

/** Tabs for the request panel, derived from an endpoint's example path. */
export function tabsFor(e: Endpoint): CodeTab[] {
  const url = urlFor(e);
  if (e.method === "POST") {
    return [
      {
        label: "cURL",
        raw: `curl -X POST '${url}' \\\n  -H 'Authorization: Bearer $CRON_SECRET'`,
        content: (
          <>
            curl -X POST {syn.s(`'${url}'`)} \{"\n  "}
            -H {syn.s("'Authorization: Bearer $CRON_SECRET'")}
          </>
        ),
      },
    ];
  }
  return requestTabs(url);
}

export const ENDPOINTS: Endpoint[] = [
  {
    id: "overview",
    method: "GET",
    path: "/overview",
    examplePath: "/overview",
    summary: "Aggregate index stats",
    description:
      "Headline totals (TVL, validators, 24h txns, chain counts) with day-over-day deltas, the spotlight chain, and the top-10 leaderboards by TVL and daily transactions.",
    tryable: true,
    response: (
      <>
        {"{\n  "}
        {syn.p('"totalChains"')}: {syn.n(415)},{"\n  "}
        {syn.p('"totalTvlUsd"')}: {syn.n(0)},{"\n  "}
        {syn.p('"totalValidators"')}: {syn.n(1284)},{"\n  "}
        {syn.p('"tvlChangePct"')}: {syn.n("null")},{"\n  "}
        {syn.p('"asOfDate"')}: {syn.s('"2026-06-05"')},{"\n  "}
        {syn.p('"topChainsByTvl"')}: [{syn.c("/* Chain[] */")}],{"\n  "}
        {syn.p('"spotlightChain"')}: {"{ "}
        {syn.c("/* Chain */")}
        {" }"}
        {"\n}"}
      </>
    ),
  },
  {
    id: "chains",
    method: "GET",
    path: "/chains",
    examplePath: "/chains?sort=tvl&limit=5",
    summary: "Paginated chain listing",
    description:
      "Every indexed L1 with its latest metrics. Supports search, VM-type filtering, sorting, and pagination.",
    tryable: true,
    params: [
      { name: "sort", type: "string", desc: "tvl · daily_txs · validators · name" },
      { name: "order", type: "string", desc: "asc · desc (default desc)" },
      { name: "vm_type", type: "string", desc: "subnet-evm · evm-custom · custom" },
      { name: "search", type: "string", desc: "name or slug match" },
      { name: "limit", type: "number", desc: "default 50, max 500" },
      { name: "offset", type: "number", desc: "pagination offset" },
    ],
    response: (
      <>
        {"{\n  "}
        {syn.p('"total"')}: {syn.n(415)},{"\n  "}
        {syn.p('"limit"')}: {syn.n(5)},{"\n  "}
        {syn.p('"offset"')}: {syn.n(0)},{"\n  "}
        {syn.p('"chains"')}: [{"\n    {\n      "}
        {syn.p('"slug"')}: {syn.s('"beam"')},{"\n      "}
        {syn.p('"evmChainId"')}: {syn.n(4337)},{"\n      "}
        {syn.p('"vmType"')}: {syn.s('"subnet-evm"')},{"\n      "}
        {syn.p('"latestMetrics"')}: {"{ "}
        {syn.p('"tvlUsd"')}: {syn.n("null")}
        {" }"}
        {"\n    }\n  ]\n}"}
      </>
    ),
  },
  {
    id: "chain-detail",
    method: "GET",
    path: "/chains/:slug",
    examplePath: "/chains/beam",
    summary: "Single chain + validators",
    description:
      "Full metadata for one chain, its latest metrics, and the per-validator set for that chain's subnet.",
    tryable: true,
    params: [{ name: ":slug", type: "path", desc: "chain slug, e.g. beam" }],
    response: (
      <>
        {"{\n  "}
        {syn.p('"chain"')}: {"{\n    "}
        {syn.p('"name"')}: {syn.s('"Beam"')},{"\n    "}
        {syn.p('"slug"')}: {syn.s('"beam"')},{"\n    "}
        {syn.p('"subnetId"')}: {syn.s('"…"')},{"\n    "}
        {syn.p('"latestMetrics"')}: {"{ "}
        {syn.c("/* … */")}
        {" },\n    "}
        {syn.p('"validators"')}: [{syn.c("/* ChainValidator[] */")}]
        {"\n  }\n}"}
      </>
    ),
  },
  {
    id: "metrics",
    method: "GET",
    path: "/chains/:slug/metrics",
    examplePath: "/chains/beam/metrics?days=30",
    summary: "Time-series metrics",
    description:
      "Daily metrics history for one chain — TVL, validator count, daily txns, block time and gas — for charting trends.",
    tryable: true,
    params: [
      { name: ":slug", type: "path", desc: "chain slug" },
      { name: "days", type: "number", desc: "lookback window, max 90" },
    ],
    response: (
      <>
        {"{\n  "}
        {syn.p('"slug"')}: {syn.s('"beam"')},{"\n  "}
        {syn.p('"metrics"')}: [{"\n    {\n      "}
        {syn.p('"date"')}: {syn.s('"2026-06-05"')},{"\n      "}
        {syn.p('"tvlUsd"')}: {syn.n("null")},{"\n      "}
        {syn.p('"validatorCount"')}: {syn.n(12)}
        {"\n    }\n  ]\n}"}
      </>
    ),
  },
  {
    id: "validators",
    method: "GET",
    path: "/validators",
    examplePath: "/validators?sort=weight&limit=5",
    summary: "Cross-chain validators",
    description:
      "Every validator across all L1s in one ranked list — by stake weight or uptime — each tagged with the chain it secures.",
    tryable: true,
    params: [
      { name: "sort", type: "string", desc: "weight · uptime" },
      { name: "order", type: "string", desc: "asc · desc" },
      { name: "limit", type: "number", desc: "default 100, max 200" },
      { name: "offset", type: "number", desc: "pagination offset" },
    ],
    response: (
      <>
        {"{\n  "}
        {syn.p('"total"')}: {syn.n(1284)},{"\n  "}
        {syn.p('"validators"')}: [{"\n    {\n      "}
        {syn.p('"nodeId"')}: {syn.s('"NodeID-…"')},{"\n      "}
        {syn.p('"weight"')}: {syn.n(2000000000)},{"\n      "}
        {syn.p('"chain"')}: {"{ "}
        {syn.p('"slug"')}: {syn.s('"beam"')}
        {" }"}
        {"\n    }\n  ]\n}"}
      </>
    ),
  },
  {
    id: "ingest",
    method: "POST",
    path: "/ingest",
    examplePath: "/ingest",
    summary: "Trigger ingestion",
    description:
      "Runs the full discovery + metrics pipeline. Protected — requires a bearer token. Intended for the scheduled cron job, not public clients.",
    tryable: false,
    params: [
      { name: "Authorization", type: "header", desc: "Bearer <CRON_SECRET>" },
    ],
    response: (
      <>
        {"{\n  "}
        {syn.p('"status"')}: {syn.s('"started"')},{"\n  "}
        {syn.p('"jobId"')}: {syn.n(42)}
        {"\n}"}
      </>
    ),
  },
  {
    id: "health",
    method: "GET",
    path: "/health",
    examplePath: "/health",
    summary: "Health check",
    description: "Liveness probe. Returns ok plus a timestamp.",
    tryable: true,
    rootMounted: true,
    response: (
      <>
        {"{ "}
        {syn.p('"status"')}: {syn.s('"ok"')}
        {" }"}
      </>
    ),
  },
];
