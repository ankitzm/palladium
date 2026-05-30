import { CodeBlock, type CodeTab } from "@/components/ui/CodeBlock";
import { syn } from "@/components/ui/syntax";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
const CHAINS_URL = `${API_BASE}/api/chains?sort=tvl&vm_type=subnet-evm&limit=50`;

const ENDPOINTS = [
  { method: "GET" as const, path: "/overview" },
  { method: "GET" as const, path: "/chains", active: true },
  { method: "GET" as const, path: "/chains/:slug" },
  { method: "GET" as const, path: "/:slug/metrics" },
  { method: "POST" as const, path: "/ingest" },
  { method: "GET" as const, path: "/health" },
];

const PARAMS = [
  ["sort", "string", "tvl · txns · validators"],
  ["vm_type", "string", "subnet-evm · evm-custom"],
  ["search", "string", "name or slug match"],
  ["limit", "number", "default 50, max 100"],
];

const REQUEST_TABS: CodeTab[] = [
  {
    label: "cURL",
    raw: `curl '${CHAINS_URL}'`,
    content: (
      <>
        {syn.c("# sorted by TVL, subnet-evm only")}
        {"\n"}curl {syn.s(`'${CHAINS_URL}'`)}
      </>
    ),
  },
  {
    label: "fetch",
    raw: `const res = await fetch('${CHAINS_URL}')\nconst { chains } = await res.json()`,
    content: (
      <>
        {syn.k("const")} res = {syn.k("await")} {syn.p("fetch")}({syn.s(`'${CHAINS_URL}'`)})
        {"\n"}
        {syn.k("const")} {"{ chains } "}= {syn.k("await")} res.{syn.p("json")}()
      </>
    ),
  },
  {
    label: "wagmi",
    raw: `import { useQuery } from '@tanstack/react-query'\n\nuseQuery({\n  queryKey: ['chains'],\n  queryFn: () => fetch('${CHAINS_URL}').then(r => r.json()),\n})`,
    content: (
      <>
        {syn.k("import")} {"{ useQuery } "}
        {syn.k("from")} {syn.s("'@tanstack/react-query'")}
        {"\n\n"}
        {syn.p("useQuery")}({"{"}
        {"\n  "}
        {syn.p("queryKey")}: [{syn.s("'chains'")}],
        {"\n  "}
        {syn.p("queryFn")}: () {"=>"} {syn.p("fetch")}({syn.s(`'${CHAINS_URL}'`)}).{syn.p("then")}(r {"=>"} r.{syn.p("json")}()),
        {"\n})"}
      </>
    ),
  },
];

export default function ApiDocsPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-medium">API <span className="text-muted font-normal">reference</span></h1>
        <span className="rounded bg-pos-soft px-2.5 py-1 text-[11px] text-pos-text">v1 · public · no key</span>
      </div>

      <div className="grid gap-0 md:grid-cols-[190px_1fr]">
        <aside className="border-b border-border pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-3">
          <div className="mb-2 text-[11px] tracking-wide text-faint">ENDPOINTS</div>
          <div className="flex flex-wrap gap-1 md:flex-col">
            {ENDPOINTS.map((e) => (
              <span
                key={e.path}
                className={`flex items-center gap-2 rounded-md px-2.5 py-2 font-mono text-[11px] ${
                  e.active ? "bg-avax-red-soft text-avax-red-text" : "text-muted"
                }`}
              >
                <span className={e.method === "GET" ? "text-pos-text" : "text-avax-red-text"}>{e.method}</span>
                {e.path}
              </span>
            ))}
          </div>
        </aside>

        <main className="pt-4 md:pl-5 md:pt-0">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="rounded bg-pos-soft px-2 py-0.5 font-mono text-[11px] text-pos-text">GET</span>
            <span className="font-mono text-base">/api/chains</span>
          </div>
          <p className="mb-4 max-w-xl text-[13px] leading-relaxed text-muted">
            Paginated listing of every indexed L1 with current metrics. Supports filtering and sorting.
          </p>

          <div className="mb-2 text-xs text-line">Query parameters</div>
          <div className="mb-5 overflow-hidden rounded-md border border-border">
            <div className="grid grid-cols-[1fr_0.7fr_1.6fr] bg-code px-3 py-2 font-mono text-[11px] text-faint">
              <span>param</span><span>type</span><span>description</span>
            </div>
            {PARAMS.map(([p, t, d]) => (
              <div key={p} className="grid grid-cols-[1fr_0.7fr_1.6fr] border-t border-row-line px-3 py-2 font-mono text-[11px]">
                <span className="text-[#7fb6ff]">{p}</span>
                <span className="text-muted">{t}</span>
                <span className="text-line">{d}</span>
              </div>
            ))}
          </div>

          <div className="mb-1.5 text-xs text-line">Request</div>
          <div className="mb-5">
            <CodeBlock tabs={REQUEST_TABS} />
          </div>

          <div className="mb-1.5 flex items-center gap-2 text-xs">
            <span className="text-line">Response</span>
            <span className="font-mono text-[11px] text-pos-text">200 OK</span>
            <span className="font-mono text-[11px] text-faint">application/json</span>
          </div>
          <CodeBlock>
            {"{\n  "}
            {syn.p('"total"')}: {syn.n(384)},{"\n  "}
            {syn.p('"limit"')}: {syn.n(50)},{"\n  "}
            {syn.p('"chains"')}: [{"\n    {\n      "}
            {syn.p('"slug"')}: {syn.s('"beam"')},{"\n      "}
            {syn.p('"evmChainId"')}: {syn.n(4337)},{"\n      "}
            {syn.p('"vmType"')}: {syn.s('"subnet-evm"')},{"\n      "}
            {syn.p('"tvlUsd"')}: {syn.n(198000000)},{"\n      "}
            {syn.p('"rpcUrl"')}: {syn.s('"https://build.onbeam.com/rpc"')}
            {"\n    }\n  ]\n}"}
          </CodeBlock>
        </main>
      </div>
    </div>
  );
}
