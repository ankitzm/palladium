import type { ChainMetrics } from "@/types";

// A metric a chart/delta can plot. "dailyTxs" is virtual: actual coalesced to
// estimated.
export type SeriesKey = "tvlUsd" | "dailyTxs" | "validatorCount";

export function metricValue(m: ChainMetrics, key: SeriesKey): number | null {
  if (key === "dailyTxs") return m.actualDailyTxs ?? m.estimatedDailyTxs ?? null;
  return m[key];
}

// Day-over-day percentage change from a date-desc metrics array (metrics[0] is
// latest). Returns null when there aren't two comparable, non-null, non-zero
// baseline points — callers render "—".
export function pctChange(
  metrics: ChainMetrics[] | undefined | null,
  key: SeriesKey,
): number | null {
  if (!metrics || metrics.length < 2) return null;
  const latest = metricValue(metrics[0], key);
  const prev = metricValue(metrics[1], key);
  if (latest == null || prev == null || prev === 0) return null;
  return ((latest - prev) / prev) * 100;
}

// today's UTC date as YYYY-MM-DD.
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// True when the most recent metrics date is older than today (UTC) — i.e. the
// daily ingestion hasn't run yet, so headline numbers are from a prior day.
export function isStale(metricsDate: string | null | undefined): boolean {
  if (!metricsDate) return false;
  return metricsDate.slice(0, 10) < todayUtc();
}

// Maps a date-desc metrics array into ascending {date, value} points for a chart,
// dropping null values.
export function seriesFor(
  metrics: ChainMetrics[],
  key: SeriesKey,
): { date: string; value: number }[] {
  return metrics
    .map((m) => ({ date: m.date, value: metricValue(m, key) }))
    .filter((p): p is { date: string; value: number } => p.value != null)
    .reverse();
}
