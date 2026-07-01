import Link from "next/link";
import { getAnalyticsData } from "@/app/actions/analytics";
import { AnalyticsChartsLoader } from "@/components/analytics/AnalyticsChartsLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CampaignMetrics } from "@/app/actions/analytics";

function pct(n: number, d: number): string {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : "—";
}

export default async function AnalyticsPage() {
  const { campaignMetrics, dailyData, totals } = await getAnalyticsData();

  const summaryStats = [
    { label: "Total Sent", value: totals.sent.toLocaleString(), color: "text-blue-600" },
    { label: "Open Rate", value: pct(totals.opened, totals.sent), color: "text-violet-600" },
    { label: "Reply Rate", value: pct(totals.replied, totals.sent), color: "text-green-600" },
    { label: "Click Rate", value: pct(totals.clicked, totals.sent), color: "text-orange-500" },
    { label: "Unsub Rate", value: pct(totals.unsubscribed, totals.sent), color: "text-red-500" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Email campaign performance</p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryStats.map(({ label, value, color }) => (
          <Card key={label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className={cn("text-2xl font-bold tabular-nums", color)}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 30-day chart */}
      <AnalyticsChartsLoader data={dailyData} />

      {/* Per-campaign table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Performance by Campaign</CardTitle>
            <Link
              href="/campaigns"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "no-underline h-7 text-xs text-muted-foreground"
              )}
            >
              Manage campaigns
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {campaignMetrics.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No email data yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Send your first campaign to start seeing metrics here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">
                      Campaign
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground">
                      Sent
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground">
                      Open Rate
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground">
                      Reply Rate
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground">
                      Click Rate
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground">
                      Unsub Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaignMetrics.map((m: CampaignMetrics) => (
                    <tr
                      key={m.campaign_id}
                      className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/campaigns/${m.campaign_id}`}
                          className="hover:underline"
                        >
                          {m.campaign_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {m.sent.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {pct(m.opened, m.sent)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-green-600">
                        {pct(m.replied, m.sent)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-orange-500">
                        {pct(m.clicked, m.sent)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-red-500">
                        {pct(m.unsubscribed, m.sent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
