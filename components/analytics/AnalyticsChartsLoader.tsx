"use client";

import dynamic from "next/dynamic";
import type { DailyData } from "@/app/actions/analytics";

const AnalyticsCharts = dynamic(
  () => import("./AnalyticsCharts").then((m) => m.AnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border bg-card">
        <div className="px-6 py-4 border-b">
          <p className="text-sm font-medium">Activity — Last 30 Days</p>
        </div>
        <div className="flex h-52 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading chart…</p>
        </div>
      </div>
    ),
  }
);

export function AnalyticsChartsLoader({ data }: { data: DailyData[] }) {
  return <AnalyticsCharts data={data} />;
}
