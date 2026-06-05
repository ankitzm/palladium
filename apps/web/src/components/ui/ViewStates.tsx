// Generic loading / error / empty states for the data-table views (chains,
// validators). Skeletons mirror a table layout so the page doesn't jump on
// hydration; the error state offers a retry instead of a blank screen. Kept
// presentational and route-agnostic so any list view can reuse it.

function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-elevated ${className}`} />;
}

export function TableSkeleton({
  rows = 10,
  withBand = false,
}: {
  rows?: number;
  withBand?: boolean;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {withBand && (
        <div className="mb-6 grid grid-cols-2 gap-px border-y border-border bg-border md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-background px-5 py-4">
              <Block className="h-7 w-24" />
              <Block className="mt-2.5 h-3 w-16" />
            </div>
          ))}
        </div>
      )}
      <Block className="h-9 w-full" />
      <div className="mt-3 flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Block key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ViewError({
  title = "Couldn’t load this data",
  message = "The API didn’t respond. It may not be deployed yet, or your connection dropped. Try again.",
  onRetry,
  retrying,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-surface py-20 text-center"
    >
      <div className="text-[15px] font-medium">{title}</div>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-1 inline-flex items-center gap-1.5 rounded-sm border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-line transition-colors hover:bg-elevated disabled:opacity-60"
        >
          {retrying ? "Retrying…" : "Try again"}
        </button>
      )}
    </div>
  );
}

export function ViewEmpty({
  title = "Nothing here yet",
  message,
  children,
}: {
  title?: string;
  message?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface py-16 text-center">
      <div className="text-[14px] font-medium">{title}</div>
      {message && (
        <p className="max-w-sm text-[13px] leading-relaxed text-muted">{message}</p>
      )}
      {children}
    </div>
  );
}
