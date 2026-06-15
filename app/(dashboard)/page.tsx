import Link from "next/link";
import { Users, Mail, FileText, Kanban, TrendingUp, UserPlus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDashboardData } from "@/app/actions/dashboard";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from "@/types";
import type { PipelineStage } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

const STAGE_BAR_COLORS: Record<PipelineStage, string> = {
  new: "bg-zinc-400",
  contacted: "bg-blue-500",
  replied: "bg-indigo-500",
  call_booked: "bg-violet-500",
  introduced: "bg-purple-500",
  closed_won: "bg-green-500",
  closed_lost: "bg-red-400",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { stats, stageCounts, recentEnrollments, recentLeads } =
    await getDashboardData();

  // Merge activity feed
  type ActivityItem = {
    id: string;
    type: "enrolled" | "lead_added";
    timestamp: string;
    primary: string;
    secondary: string | null;
    href: string;
  };

  const activity: ActivityItem[] = [
    ...recentEnrollments.map((e) => ({
      id: `enroll-${e.id}`,
      type: "enrolled" as const,
      timestamp: e.enrolled_at,
      primary: `${e.leads?.first_name ?? ""} ${e.leads?.last_name ?? ""}`.trim() || "Lead",
      secondary: e.campaigns?.name ?? null,
      href: e.lead_id ? `/leads/${e.lead_id}` : "/leads",
    })),
    ...recentLeads.map((l) => ({
      id: `lead-${l.id}`,
      type: "lead_added" as const,
      timestamp: l.created_at,
      primary: `${l.first_name} ${l.last_name}`,
      secondary: l.company_name,
      href: `/leads/${l.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  // Pipeline bar scale
  const maxStageCount = Math.max(...Object.values(stageCounts), 1);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ConnectivTech outbound sales overview
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <Link href="/leads">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Leads
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalLeads === 0
                  ? "Import your first contacts"
                  : "in your database"}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Active Campaigns */}
        <Link href="/campaigns">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Campaigns
              </CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalCampaigns === 0
                  ? "No campaigns yet"
                  : stats.activeCampaigns === 0
                  ? `${stats.totalCampaigns} draft${stats.totalCampaigns !== 1 ? "s" : ""}`
                  : `${stats.totalCampaigns} total`}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Templates */}
        <Link href="/templates">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Templates
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.templates}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.templates === 0
                  ? "Run seed migration"
                  : "email templates"}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Pipeline */}
        <Link href="/pipeline">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Pipeline
              </CardTitle>
              <Kanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inPipeline}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.inPipeline === 0
                  ? "Enroll leads to populate"
                  : `${stageCounts.closed_won} closed won`}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Pipeline overview ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Pipeline Overview</CardTitle>
            </div>
            <Link
              href="/pipeline"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "no-underline h-7 text-xs text-muted-foreground"
              )}
            >
              View board
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {PIPELINE_STAGES.map((stage) => {
              const count = stageCounts[stage];
              const barPct = Math.round((count / maxStageCount) * 100);
              const isWon = stage === "closed_won";
              const isLost = stage === "closed_lost";
              return (
                <Link key={stage} href="/pipeline" className="block group">
                  <div className="rounded-lg border bg-card p-3 text-center hover:border-primary/30 transition-colors">
                    <div
                      className={cn(
                        "text-xl font-bold tabular-nums",
                        isWon && count > 0 && "text-green-600",
                        isLost && count > 0 && "text-red-500"
                      )}
                    >
                      {count}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                      {PIPELINE_STAGE_LABELS[stage]}
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          STAGE_BAR_COLORS[stage]
                        )}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Recent activity ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No activity yet.</p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/leads/import"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline")}
                >
                  Import leads
                </Link>
                <Link
                  href="/campaigns/new"
                  className={cn(buttonVariants({ size: "sm" }), "no-underline")}
                >
                  Create campaign
                </Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-0 divide-y">
              {activity.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 py-3 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors no-underline"
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        item.type === "enrolled"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-zinc-100 text-zinc-600"
                      )}
                    >
                      {item.type === "enrolled" ? (
                        <Mail className="h-3.5 w-3.5" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.primary}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.type === "enrolled"
                          ? `Enrolled in ${item.secondary ?? "campaign"}`
                          : item.secondary ?? "Added to contacts"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {relativeTime(item.timestamp)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
