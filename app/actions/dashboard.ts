"use server";

import { createClient } from "@/lib/supabase/server";
import type { PipelineStage } from "@/types";
import { PIPELINE_STAGES } from "@/types";

export type DashboardEnrollment = {
  id: string;
  enrolled_at: string;
  lead_id: string;
  leads: { id: string; first_name: string; last_name: string; company_name: string | null } | null;
  campaigns: { id: string; name: string } | null;
};

export type DashboardLead = {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  created_at: string;
};

export async function getDashboardData() {
  const supabase = await createClient();

  const [
    { count: totalLeads },
    { count: activeCampaigns },
    { count: totalCampaigns },
    { count: templates },
    { data: pipelineRows },
    { data: recentEnrollments },
    { data: recentLeads },
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("campaigns").select("*", { count: "exact", head: true }),
    supabase.from("email_templates").select("*", { count: "exact", head: true }),
    supabase.from("pipeline_entries").select("stage"),
    supabase
      .from("campaign_leads")
      .select(
        "id, enrolled_at, lead_id, leads(id, first_name, last_name, company_name), campaigns(id, name)"
      )
      .order("enrolled_at", { ascending: false })
      .limit(8),
    supabase
      .from("leads")
      .select("id, first_name, last_name, company_name, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const stageCounts = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = pipelineRows?.filter((r) => r.stage === stage).length ?? 0;
      return acc;
    },
    {} as Record<PipelineStage, number>
  );

  return {
    stats: {
      totalLeads: totalLeads ?? 0,
      activeCampaigns: activeCampaigns ?? 0,
      totalCampaigns: totalCampaigns ?? 0,
      templates: templates ?? 0,
      inPipeline: pipelineRows?.length ?? 0,
    },
    stageCounts,
    recentEnrollments: (recentEnrollments ?? []) as unknown as DashboardEnrollment[],
    recentLeads: (recentLeads ?? []) as unknown as DashboardLead[],
  };
}
