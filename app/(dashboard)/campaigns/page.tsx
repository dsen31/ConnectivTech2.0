import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCampaigns } from "@/app/actions/campaigns";
import { CampaignCard } from "@/components/campaigns/CampaignCard";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className={cn(buttonVariants({ size: "sm" }), "no-underline")}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Campaign
        </Link>
      </div>

      {/* Campaign grid */}
      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No campaigns yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Create your first outbound campaign with an email sequence.
          </p>
          <Link
            href="/campaigns/new"
            className={cn(buttonVariants({ size: "sm" }), "no-underline")}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              campaign={campaign as unknown as any}
            />
          ))}
        </div>
      )}
    </div>
  );
}
