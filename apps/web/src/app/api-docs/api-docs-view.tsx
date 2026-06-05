"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { CopyButton } from "@/components/ui/CopyButton";
import { ENDPOINTS, tabsFor, urlFor, type Endpoint } from "./endpoints";

export function ApiDocsView() {
  const [activeId, setActiveId] = useState(ENDPOINTS[1].id); // default: /chains
  const active = ENDPOINTS.find((e) => e.id === activeId) ?? ENDPOINTS[0];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-medium">
          API <span className="font-normal text-muted">reference</span>
        </h1>
        <span className="rounded bg-pos-soft px-2.5 py-1 text-[11px] text-pos-text">
          v1 · public · no key
        </span>
      </div>

      <div className="grid gap-0 md:grid-cols-[210px_1fr]">
        <aside className="border-b border-border pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-3">
          <div className="mb-2 text-[11px] tracking-wide text-faint">ENDPOINTS</div>
          <div className="flex flex-wrap gap-1 md:flex-col">
            {ENDPOINTS.map((e) => {
              const isActive = e.id === active.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setActiveId(e.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-left font-mono text-[11px] transition-colors ${
                    isActive
                      ? "bg-avax-red-soft text-avax-red-text"
                      : "text-muted hover:bg-elevated hover:text-foreground"
                  }`}
                >
                  <span
                    className={
                      e.method === "GET" ? "text-pos-text" : "text-avax-red-text"
                    }
                  >
                    {e.method}
                  </span>
                  <span className="truncate">{e.path}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <EndpointDetail key={active.id} endpoint={active} />
      </div>
    </div>
  );
}

function EndpointDetail({ endpoint }: { endpoint: Endpoint }) {
  return (
    <main className="min-w-0 pt-4 md:pl-5 md:pt-0">
      <div className="mb-2 flex items-center gap-2.5">
        <span
          className={`rounded px-2 py-0.5 font-mono text-[11px] ${
            endpoint.method === "GET"
              ? "bg-pos-soft text-pos-text"
              : "bg-avax-red-soft text-avax-red-text"
          }`}
        >
          {endpoint.method}
        </span>
        <span className="font-mono text-base">
          {endpoint.rootMounted ? endpoint.path : `/api${endpoint.path}`}
        </span>
      </div>
      <p className="mb-4 max-w-xl text-[13px] leading-relaxed text-muted">
        {endpoint.description}
      </p>

      {endpoint.params && endpoint.params.length > 0 && (
        <>
          <div className="mb-2 text-xs text-line">Parameters</div>
          <div className="mb-5 overflow-hidden rounded-md border border-border">
            <div className="grid grid-cols-[1fr_0.7fr_1.6fr] bg-code px-3 py-2 font-mono text-[11px] text-faint">
              <span>param</span>
              <span>type</span>
              <span>description</span>
            </div>
            {endpoint.params.map((p) => (
              <div
                key={p.name}
                className="grid grid-cols-[1fr_0.7fr_1.6fr] border-t border-row-line px-3 py-2 font-mono text-[11px]"
              >
                <span className="text-[#7fb6ff]">{p.name}</span>
                <span className="text-muted">{p.type}</span>
                <span className="text-line">{p.desc}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mb-1.5 text-xs text-line">Request</div>
      <div className="mb-5">
        <CodeBlock tabs={tabsFor(endpoint)} />
      </div>

      <ResponsePanel endpoint={endpoint} />
    </main>
  );
}

type TryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; code: number; ms: number; body: string }
  | { status: "error"; message: string };

function ResponsePanel({ endpoint }: { endpoint: Endpoint }) {
  const [tried, setTried] = useState<TryState>({ status: "idle" });

  async function run() {
    setTried({ status: "loading" });
    const start = performance.now();
    try {
      const res = await fetch(urlFor(endpoint), {
        headers: { Accept: "application/json" },
      });
      const ms = Math.round(performance.now() - start);
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* non-JSON body — show raw */
      }
      // Cap very large payloads so the panel stays readable.
      const capped =
        pretty.length > 6000 ? `${pretty.slice(0, 6000)}\n… (truncated)` : pretty;
      setTried({ status: "ok", code: res.status, ms, body: capped });
    } catch (err) {
      setTried({
        status: "error",
        message:
          err instanceof Error
            ? `${err.message} — the API may be offline or unreachable from the browser.`
            : "Request failed.",
      });
    }
  }

  const live = tried.status === "ok" || tried.status === "error";

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-line">Response</span>
        {tried.status === "ok" ? (
          <>
            <span
              className={`font-mono text-[11px] ${
                tried.code < 400 ? "text-pos-text" : "text-avax-red-text"
              }`}
            >
              {tried.code} {tried.code < 400 ? "OK" : ""}
            </span>
            <span className="font-mono text-[11px] text-faint">{tried.ms}ms · live</span>
          </>
        ) : tried.status === "error" ? (
          <span className="font-mono text-[11px] text-avax-red-text">request failed</span>
        ) : (
          <>
            <span className="font-mono text-[11px] text-pos-text">200 OK</span>
            <span className="font-mono text-[11px] text-faint">example schema</span>
          </>
        )}

        {endpoint.tryable && (
          <button
            type="button"
            onClick={run}
            disabled={tried.status === "loading"}
            className="ml-auto inline-flex items-center gap-1.5 rounded-sm border border-border-strong bg-surface px-2.5 py-1 font-mono text-[11px] text-line transition-colors hover:bg-elevated disabled:opacity-60"
          >
            {tried.status === "loading"
              ? "running…"
              : live
                ? "↻ run again"
                : "▸ try it live"}
          </button>
        )}
      </div>

      {tried.status === "error" ? (
        <div className="rounded-md border border-avax-red-soft bg-code p-3 font-mono text-[11.5px] leading-[1.7] text-avax-red-text">
          {tried.message}
        </div>
      ) : tried.status === "ok" ? (
        <div className="overflow-hidden rounded-md border border-border bg-code">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[11px] text-faint">
            <span className="font-mono">live response</span>
            <CopyButton text={tried.body} label="⧉ copy" />
          </div>
          <pre className="max-h-[420px] overflow-auto p-3 font-mono text-[11.5px] leading-[1.7] text-line">
            {tried.body}
          </pre>
        </div>
      ) : (
        <CodeBlock>{endpoint.response}</CodeBlock>
      )}

      {!endpoint.tryable && (
        <p className="mt-2 font-mono text-[11px] text-faint">
          Protected endpoint — requires a bearer token, so it can’t be called from
          the browser.
        </p>
      )}
    </div>
  );
}
