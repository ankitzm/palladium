import type { Chain } from "@/types";
import { chainIdLabel } from "@/lib/format";
import { CopyButton } from "@/components/ui/CopyButton";

function Field({
  label,
  value,
  copy,
  href,
}: {
  label: string;
  value: string;
  copy?: string;
  href?: string;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] text-faint">{label}</div>
      <div className="flex items-center gap-2 rounded-sm bg-surface-2 px-2.5 py-2 font-mono text-xs text-line">
        <span className="flex-1 truncate">{value}</span>
        {copy && <CopyButton text={copy} />}
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-dim hover:text-foreground">
            ↗
          </a>
        )}
      </div>
    </div>
  );
}

export function NetworkParams({ chain }: { chain: Chain }) {
  if (!chain.rpcUrl && chain.evmChainId == null) {
    return (
      <div className="rounded-md border border-border bg-surface p-3.5">
        <div className="mb-2 text-[13px] text-line">Network parameters</div>
        <p className="text-xs text-faint">
          No RPC or EVM chain ID published for this L1 yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface p-3.5">
      <div className="mb-3 text-[13px] text-line">Network parameters</div>
      <div className="flex flex-col gap-2.5">
        {chain.rpcUrl && (
          <Field label="RPC URL" value={chain.rpcUrl} copy={chain.rpcUrl} />
        )}
        <div className="flex gap-2.5">
          <div className="flex-1">
            <Field label="Chain ID" value={chainIdLabel(chain.evmChainId)} />
          </div>
          <div className="flex-1">
            <Field label="Symbol" value={chain.tokenSymbol ?? "—"} />
          </div>
        </div>
        {chain.explorerUrl && (
          <Field label="Block explorer" value={chain.explorerUrl} href={chain.explorerUrl} />
        )}
      </div>
    </div>
  );
}
