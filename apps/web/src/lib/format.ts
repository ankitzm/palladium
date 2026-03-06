export function formatUsd(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}

export function formatCompact(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

export function vmTypeBadge(vmType: string): { label: string; color: string } {
  switch (vmType) {
    case "subnet-evm":
      return { label: "SubnetEVM", color: "bg-blue-500/20 text-blue-400" };
    case "evm-custom":
      return { label: "EVM", color: "bg-purple-500/20 text-purple-400" };
    default:
      return { label: "Custom", color: "bg-zinc-500/20 text-zinc-400" };
  }
}

export function categoryBadge(
  category: string | null,
): { label: string; color: string } | null {
  if (!category) return null;
  const map: Record<string, string> = {
    gaming: "bg-green-500/20 text-green-400",
    defi: "bg-yellow-500/20 text-yellow-400",
    infra: "bg-cyan-500/20 text-cyan-400",
    nft: "bg-pink-500/20 text-pink-400",
  };
  return {
    label: category.charAt(0).toUpperCase() + category.slice(1),
    color: map[category] || "bg-zinc-500/20 text-zinc-400",
  };
}
