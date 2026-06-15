"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { USE_CASE_LABELS, CAMPAIGN_STATUS_STYLES } from "@/types";

const USE_CASE_COLORS: Record<string, string> = {
  telecom: "bg-blue-50 text-blue-700 border-blue-200",
  "vendor-vetting": "bg-violet-50 text-violet-700 border-violet-200",
  "fractional-cto": "bg-indigo-50 text-indigo-700 border-indigo-200",
  compliance: "bg-red-50 text-red-700 border-red-200",
  "it-audit": "bg-orange-50 text-orange-700 border-orange-200",
};

interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    use_case: string;
    status: "draft" | "active" | "paused" | "completed";
    description: string | null;
    created_at: string;
    campaign_steps: { id: string }[];
    campaign_leads: { id: string; status: string }[];
  };
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const stepCount = campaign.campaign_steps.length;
  const enrolledCount = campaign.campaign_leads.length;
  const activeCount = campaign.campaign_leads.filter((l) => l.status === "active").length;
  const repliedCount = campaign.campaign_leads.filter((l) => l.status === "replied").length;

  return (
    <Link href={`/campaigns/${campaign.id}`} className="block group">
      <Card className="h-full transition-colors hover:border-primary/50 cursor-pointer">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-xs font-medium border px-2 py-0.5 rounded-full",
                  USE_CASE_COLORS[campaign.use_case] ?? "bg-muted text-muted-foreground border-border"
                )}
              >
                {USE_CASE_LABELS[campaign.use_case] ?? campaign.use_case}
              </span>
              <span
                className={cn(
                  "text-xs font-medium border px-2 py-0.5 rounded-full capitalize",
                  CAMPAIGN_STATUS_STYLES[campaign.status] ?? "bg-muted text-muted-foreground border-border"
                )}
              >
                {campaign.status}
              </span>
            </div>
          </div>
          <p className="font-semibold text-sm mt-2 leading-snug">{campaign.name}</p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {campaign.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{campaign.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span>{stepCount} step{stepCount !== 1 ? "s" : ""}</span>
            <span className="text-border">·</span>
            <span>{enrolledCount} enrolled</span>
            {activeCount > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-green-600">{activeCount} active</span>
              </>
            )}
            {repliedCount > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-blue-600">{repliedCount} replied</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
