"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";
import type { CampaignAbStats, StepAbStats } from "@/types";

type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];
type CampaignUpdate = Database["public"]["Tables"]["campaigns"]["Update"];
type CampaignStepUpdate = Database["public"]["Tables"]["campaign_steps"]["Update"];

export async function getCampaigns() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, campaign_steps(id), campaign_leads(id, status)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCampaign(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      *,
      campaign_steps(
        *,
        email_templates(id, name, subject, use_case)
      )
    `)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  // Sort steps client-side to avoid TS issues with referencedTable option
  if (data && Array.isArray((data as Record<string, unknown>).campaign_steps)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any).campaign_steps.sort(
      (a: { step_number: number }, b: { step_number: number }) => a.step_number - b.step_number
    );
  }
  return data;
}

export async function createCampaign(formData: CampaignInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert(formData)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/campaigns");
  return data;
}

export async function updateCampaign(id: string, updates: CampaignUpdate) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  return data;
}

export async function deleteCampaign(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/campaigns");
}

// ── Campaign Steps ────────────────────────────────────────────────────────────

export async function addCampaignStep(
  campaignId: string,
  templateId: string,
  delayDays: number,
  sendCondition: "always" | "not_replied" | "not_opened" | "opened"
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("campaign_steps")
    .select("step_number")
    .eq("campaign_id", campaignId)
    .order("step_number", { ascending: false })
    .limit(1);

  const nextStep = (existing?.[0]?.step_number ?? 0) + 1;

  const { data, error } = await supabase
    .from("campaign_steps")
    .insert({
      campaign_id: campaignId,
      step_number: nextStep,
      template_id: templateId,
      delay_days: delayDays,
      send_condition: sendCondition,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/campaigns/${campaignId}`);
  return data;
}

export async function updateCampaignStep(id: string, updates: CampaignStepUpdate) {
  const supabase = await createClient();
  const { data: step } = await supabase
    .from("campaign_steps")
    .select("campaign_id")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("campaign_steps")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (step?.campaign_id) revalidatePath(`/campaigns/${step.campaign_id}`);
  return data;
}

export async function deleteCampaignStep(id: string) {
  const supabase = await createClient();
  const { data: step } = await supabase
    .from("campaign_steps")
    .select("campaign_id, step_number")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("campaign_steps").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (step) {
    // Renumber steps after the deleted one
    const { data: remaining } = await supabase
      .from("campaign_steps")
      .select("id, step_number")
      .eq("campaign_id", step.campaign_id)
      .gt("step_number", step.step_number)
      .order("step_number");

    if (remaining) {
      for (const s of remaining) {
        await supabase
          .from("campaign_steps")
          .update({ step_number: s.step_number - 1 })
          .eq("id", s.id);
      }
    }
    revalidatePath(`/campaigns/${step.campaign_id}`);
  }
}

export async function moveCampaignStep(stepId: string, direction: "up" | "down") {
  const supabase = await createClient();

  const { data: step } = await supabase
    .from("campaign_steps")
    .select("campaign_id, step_number")
    .eq("id", stepId)
    .single();

  if (!step) return;

  const targetNumber = direction === "up" ? step.step_number - 1 : step.step_number + 1;

  const { data: sibling } = await supabase
    .from("campaign_steps")
    .select("id")
    .eq("campaign_id", step.campaign_id)
    .eq("step_number", targetNumber)
    .single();

  if (!sibling) return;

  // Swap via temp to avoid unique constraint
  await supabase.from("campaign_steps").update({ step_number: 9999 }).eq("id", stepId);
  await supabase.from("campaign_steps").update({ step_number: step.step_number }).eq("id", sibling.id);
  await supabase.from("campaign_steps").update({ step_number: targetNumber }).eq("id", stepId);

  revalidatePath(`/campaigns/${step.campaign_id}`);
}

// ── A/B stats ────────────────────────────────────────────────────────────────

export async function getCampaignAbStats(campaignId: string): Promise<CampaignAbStats> {
  const supabase = await createClient();

  const { data: abSteps } = await supabase
    .from("campaign_steps")
    .select("id")
    .eq("campaign_id", campaignId)
    .not("subject_b", "is", null);

  if (!abSteps?.length) return {};

  const stepIds = abSteps.map((s) => s.id);

  const { data: events } = await supabase
    .from("email_events")
    .select("campaign_lead_id, step_id, event_type, metadata")
    .in("step_id", stepIds)
    .in("event_type", ["sent", "opened", "replied"]);

  const result: CampaignAbStats = {};

  for (const step of abSteps) {
    const stepEvents = (events ?? []).filter((e) => e.step_id === step.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentA = stepEvents.filter((e) => e.event_type === "sent" && (e.metadata as any)?.variant === "A");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentB = stepEvents.filter((e) => e.event_type === "sent" && (e.metadata as any)?.variant === "B");

    const aLeadIds = new Set(sentA.map((e) => e.campaign_lead_id));
    const bLeadIds = new Set(sentB.map((e) => e.campaign_lead_id));

    const opens = stepEvents.filter((e) => e.event_type === "opened");
    const replies = stepEvents.filter((e) => e.event_type === "replied");

    const stats: StepAbStats = {
      a: {
        sends: sentA.length,
        opens: opens.filter((e) => aLeadIds.has(e.campaign_lead_id)).length,
        replies: replies.filter((e) => aLeadIds.has(e.campaign_lead_id)).length,
      },
      b: {
        sends: sentB.length,
        opens: opens.filter((e) => bLeadIds.has(e.campaign_lead_id)).length,
        replies: replies.filter((e) => bLeadIds.has(e.campaign_lead_id)).length,
      },
    };
    result[step.id] = stats;
  }

  return result;
}

// ── Enrollments ───────────────────────────────────────────────────────────────

export async function getEnrollments(campaignId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_leads")
    .select("*, leads(id, first_name, last_name, email, company_name)")
    .eq("campaign_id", campaignId)
    .order("enrolled_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getLeadsNotInCampaign(campaignId: string) {
  const supabase = await createClient();

  const { data: enrolled } = await supabase
    .from("campaign_leads")
    .select("lead_id")
    .eq("campaign_id", campaignId);

  const enrolledIds = enrolled?.map((e) => e.lead_id) ?? [];

  const { data: allLeads, error } = await supabase
    .from("leads")
    .select("*, lead_tags(tags(*)), campaign_leads(id)")
    .not("status", "in", "(unsubscribed,bounced)")
    .order("first_name");

  if (error) throw new Error(error.message);

  if (enrolledIds.length === 0) return allLeads ?? [];
  const enrolledSet = new Set(enrolledIds);
  return (allLeads ?? []).filter((l) => !enrolledSet.has(l.id));
}

export async function bulkEnrollLeads(campaignId: string, leadIds: string[]) {
  if (leadIds.length === 0) return { enrolled: 0, skipped: 0 };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("campaign_leads")
    .select("lead_id")
    .eq("campaign_id", campaignId)
    .in("lead_id", leadIds);

  const existingSet = new Set(existing?.map((e) => e.lead_id) ?? []);
  const newIds = leadIds.filter((id) => !existingSet.has(id));

  if (newIds.length === 0) return { enrolled: 0, skipped: leadIds.length };

  const { data, error } = await supabase
    .from("campaign_leads")
    .insert(
      newIds.map((leadId) => ({
        campaign_id: campaignId,
        lead_id: leadId,
        current_step: 1,
        status: "active" as const,
      }))
    )
    .select("id");

  if (error) throw new Error(error.message);

  for (const leadId of newIds) {
    await supabase
      .from("pipeline_entries")
      .upsert({ lead_id: leadId, stage: "new" as const }, { onConflict: "lead_id" });
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/pipeline");
  revalidatePath("/leads");

  return { enrolled: data?.length ?? 0, skipped: existingSet.size };
}

export async function bulkUnenrollLeads(campaignId: string, ids: string[]) {
  if (ids.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("campaign_leads").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function unenrollLead(campaignLeadId: string) {
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("campaign_leads")
    .select("campaign_id")
    .eq("id", campaignLeadId)
    .single();

  const { error } = await supabase.from("campaign_leads").delete().eq("id", campaignLeadId);
  if (error) throw new Error(error.message);
  if (entry?.campaign_id) revalidatePath(`/campaigns/${entry.campaign_id}`);
}

export async function updateEnrollmentStatus(
  id: string,
  status: "active" | "completed" | "paused" | "replied" | "unsubscribed"
) {
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("campaign_leads")
    .select("campaign_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("campaign_leads").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  if (entry?.campaign_id) revalidatePath(`/campaigns/${entry.campaign_id}`);
}
