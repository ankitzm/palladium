// Loading and error states for the overview. Skeletons mirror the real layout
// (band → spotlight → leaderboard) so the page doesn't jump on hydration, and
// the error state offers a retry instead of a blank screen.

function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-elevated ${className}`} />;
}

export function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the Avalanche L1 index…</span>

      <div className="py-7">
        <Block className="h-3 w-44" />
        <Block className="mt-4 h-9 w-80 max-w-full" />
        <Block className="mt-2 h-9 w-64 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-px border-y border-border bg-border md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-background px-5 py-4">
            <Block className="h-7 w-24" />
            <Block className="mt-2.5 h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Block className="h-3 w-28" />
        <Block className="mt-3 h-40 w-full rounded-[12px]" />
      </div>

      <div className="mt-7">
        <Block className="h-4 w-24" />
        <div className="mt-3 flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Block key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function OverviewError({
  onRetry,
  retrying,
}: {
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 py-24 text-center"
    >
      <div className="text-[15px] font-medium">Couldn&apos;t load the index</div>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted">
        The API didn&apos;t respond. Check your connection, then try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-1 inline-flex items-center gap-1.5 rounded-sm border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-line transition-colors hover:bg-elevated disabled:opacity-60"
      >
        {retrying ? "Retrying…" : "Try again"}
      </button>
    </div>
  );
}
