import type { Chain } from "@/types";
import { CodeBlock, type CodeTab } from "@/components/ui/CodeBlock";
import { syn } from "@/components/ui/syntax";

// Renders ready-to-paste viem + wagmi chain definitions. Only meaningful for EVM
// chains with an RPC; the caller gates on that.
export function ConnectSnippet({ chain }: { chain: Chain }) {
  if (chain.rpcUrl == null || chain.evmChainId == null) return null;

  const varName = chain.slug.replace(/-/g, "_");
  const sym = chain.tokenSymbol ?? "TOKEN";
  const id = chain.evmChainId;
  const name = chain.name;
  const rpc = chain.rpcUrl;

  const viemRaw = `import { defineChain } from 'viem'

export const ${varName} = defineChain({
  id: ${id},
  name: '${name}',
  nativeCurrency: { symbol: '${sym}', decimals: 18 },
  rpcUrls: { default: { http: ['${rpc}'] } }
})`;

  const wagmiRaw = `import { http, createConfig } from 'wagmi'
import { defineChain } from 'viem'

export const ${varName} = defineChain({
  id: ${id},
  name: '${name}',
  nativeCurrency: { symbol: '${sym}', decimals: 18 },
  rpcUrls: { default: { http: ['${rpc}'] } }
})

export const config = createConfig({
  chains: [${varName}],
  transports: { [${varName}.id]: http() },
})`;

  const viemContent = (
    <>
      {syn.k("import")} {"{ defineChain } "}
      {syn.k("from")} {syn.s("'viem'")}
      {"\n\n"}
      {syn.k("export const")} {varName} = {syn.p("defineChain")}({"{"}
      {"\n  "}
      {syn.p("id")}: {syn.n(id)},{"\n  "}
      {syn.p("name")}: {syn.s(`'${name}'`)},{"\n  "}
      {syn.p("nativeCurrency")}: {"{ "}
      {syn.p("symbol")}: {syn.s(`'${sym}'`)}, {syn.p("decimals")}: {syn.n(18)} {"}"},
      {"\n  "}
      {syn.p("rpcUrls")}: {"{ "}
      {syn.p("default")}: {"{ "}
      {syn.p("http")}: [{syn.s(`'${rpc}'`)}] {"} }"}
      {"\n})"}
    </>
  );

  const wagmiContent = (
    <>
      {syn.k("import")} {"{ http, createConfig } "}
      {syn.k("from")} {syn.s("'wagmi'")}
      {"\n"}
      {syn.k("import")} {"{ defineChain } "}
      {syn.k("from")} {syn.s("'viem'")}
      {"\n\n"}
      {syn.k("export const")} {varName} = {syn.p("defineChain")}({"{"}
      {"\n  "}
      {syn.p("id")}: {syn.n(id)}, {syn.p("name")}: {syn.s(`'${name}'`)},
      {"\n  "}
      {syn.p("nativeCurrency")}: {"{ "}
      {syn.p("symbol")}: {syn.s(`'${sym}'`)}, {syn.p("decimals")}: {syn.n(18)} {"}"},
      {"\n  "}
      {syn.p("rpcUrls")}: {"{ "}
      {syn.p("default")}: {"{ "}
      {syn.p("http")}: [{syn.s(`'${rpc}'`)}] {"} }"}
      {"\n})"}
      {"\n\n"}
      {syn.k("export const")} config = {syn.p("createConfig")}({"{"}
      {"\n  "}
      {syn.p("chains")}: [{varName}],
      {"\n  "}
      {syn.p("transports")}: {"{ "}[{varName}.{syn.p("id")}]: {syn.p("http")}() {"}"},
      {"\n})"}
    </>
  );

  const tabs: CodeTab[] = [
    { label: "viem", raw: viemRaw, content: viemContent },
    { label: "wagmi", raw: wagmiRaw, content: wagmiContent },
  ];

  return <CodeBlock tabs={tabs} />;
}
