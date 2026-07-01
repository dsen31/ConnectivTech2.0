import { notFound } from "next/navigation";
import { getCampaign, getEnrollments, getLeadsNotInCampaign, getCampaignAbStats } from "@/app/actions/campaigns";
import { getTemplates } from "@/app/actions/templates";
import { getTags } from "@/app/actions/tags";
import { CampaignDetailView } from "@/components/campaigns/CampaignDetailView";
import type { CampaignWithSteps, EnrollmentWithLead, LeadWithTags } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [campaign, enrollments, availableLeads, templates, allTags, abStats] = await Promise.all([
    getCampaign(id).catch(() => null),
    getEnrollments(id),
    getLeadsNotInCampaign(id),
    getTemplates(),
    getTags(),
    getCampaignAbStats(id),
  ]);

  if (!campaign) notFound();

  return (
    <CampaignDetailView
      campaign={campaign as unknown as CampaignWithSteps}
      enrollments={enrollments as unknown as EnrollmentWithLead[]}
      availableLeads={availableLeads as unknown as LeadWithTags[]}
      allTags={allTags}
      templates={templates}
      abStats={abStats}
    />
  );
}
