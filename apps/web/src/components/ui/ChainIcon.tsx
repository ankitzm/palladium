export function ChainIcon({
  name,
  featured,
  size = 20,
}: {
  name: string;
  featured?: boolean;
  size?: number;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded font-medium ${
        featured ? "bg-avax-red text-white" : "bg-chip text-avax-red-text"
      }`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
