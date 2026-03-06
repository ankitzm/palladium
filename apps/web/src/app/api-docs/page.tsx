const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

function Endpoint({
  method,
  path,
  description,
  params,
}: {
  method: string;
  path: string;
  description: string;
  params?: { name: string; type: string; desc: string }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400">
          {method}
        </span>
        <code className="text-sm font-mono text-foreground">{path}</code>
      </div>
      <p className="text-sm text-muted">{description}</p>
      {params && params.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted uppercase">Parameters</p>
          {params.map((p) => (
            <div key={p.name} className="flex gap-2 text-xs">
              <code className="text-avax-red">{p.name}</code>
              <span className="text-muted">({p.type})</span>
              <span className="text-foreground">{p.desc}</span>
            </div>
          ))}
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-muted uppercase mb-1">
          Example
        </p>
        <pre className="text-xs font-mono text-muted bg-background rounded p-2 overflow-x-auto">
          curl {API_BASE}
          {path.replace(/:(\w+)/g, "dfk-chain").replace(/\?.*/, "")}
        </pre>
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">API Documentation</h1>
        <p className="text-sm text-muted mt-1">
          Read-only REST API. All endpoints return JSON. No authentication required.
        </p>
        <p className="text-sm text-muted mt-1">
          Base URL:{" "}
          <code className="text-avax-red font-mono">{API_BASE}</code>
        </p>
      </div>

      <div className="space-y-4">
        <Endpoint
          method="GET"
          path="/api/overview"
          description="Aggregate statistics: total chains, subnets, EVM count, TVL, and top chains leaderboards."
        />

        <Endpoint
          method="GET"
          path="/api/chains"
          description="List all enabled chains with their latest metrics. Supports filtering, sorting, and pagination."
          params={[
            { name: "sort", type: "string", desc: "name | tvl | validators | daily_txs" },
            { name: "order", type: "string", desc: "asc | desc" },
            { name: "vm_type", type: "string", desc: "subnet-evm | evm-custom | custom" },
            { name: "category", type: "string", desc: "gaming | defi | infra" },
            { name: "search", type: "string", desc: "Search by name" },
            { name: "limit", type: "number", desc: "Default 50" },
            { name: "offset", type: "number", desc: "Default 0" },
          ]}
        />

        <Endpoint
          method="GET"
          path="/api/chains/:slug"
          description="Get a single chain by slug with full metadata and latest metrics."
        />

        <Endpoint
          method="GET"
          path="/api/chains/:slug/metrics?days=30"
          description="Time-series metrics for a chain over the specified number of days."
          params={[
            { name: "days", type: "number", desc: "Number of days of history (default 30)" },
          ]}
        />
      </div>
    </div>
  );
}
