// Red rounded-square mark with a mountain glyph (Avalanche motif).
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md bg-avax-red"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 4 L20 19 H4 Z M12 11 L8.5 19 H15.5 Z"
          fill="white"
          fillRule="evenodd"
        />
      </svg>
    </span>
  );
}
