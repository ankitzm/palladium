"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChainMetrics } from "@/lib/api";

type MetricKey = "tvlUsd" | "estimatedDailyTxs" | "validatorCount";

const TABS: { key: MetricKey; label: string; format: (v: number) => string }[] =
  [
    {
      key: "tvlUsd",
      label: "TVL",
      format: (v) =>
        v >= 1e6
          ? `$${(v / 1e6).toFixed(1)}M`
          : v >= 1e3
            ? `$${(v / 1e3).toFixed(0)}K`
            : `$${v}`,
    },
    {
      key: "estimatedDailyTxs",
      label: "Daily Txs",
      format: (v) =>
        v >= 1e6
          ? `${(v / 1e6).toFixed(1)}M`
          : v >= 1e3
            ? `${(v / 1e3).toFixed(1)}K`
            : String(v),
    },
    {
      key: "validatorCount",
      label: "Validators",
      format: (v) => String(v),
    },
  ];

export function MetricsChart({ metrics }: { metrics: ChainMetrics[] }) {
  const [activeTab, setActiveTab] = useState<MetricKey>("tvlUsd");
  const tab = TABS.find((t) => t.key === activeTab)!;

  const hasData = metrics.some((m) => m[activeTab] != null && m[activeTab]! > 0);

  const data = metrics.map((m) => ({
    date: m.date,
    value: m[activeTab] ?? 0,
  }));

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === t.key
                ? "bg-avax-red text-white"
                : "text-muted hover:text-foreground hover:bg-card-hover"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted">
          No {tab.label.toLowerCase()} data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e84142" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#e84142" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#888899" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#888899" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={tab.format}
              width={60}
            />
            <Tooltip
              contentStyle={{
                background: "#111118",
                border: "1px solid #222233",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#888899" }}
              formatter={(value: number) => [tab.format(value), tab.label]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#e84142"
              strokeWidth={2}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
