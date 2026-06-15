"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";
import type { LeadWithTags, CampaignEnrollment } from "@/types";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export async function getLeads(): Promise<LeadWithTags[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*, lead_tags(tags(*)), campaign_leads(id)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LeadWithTags[];
}

export async function getLead(id: string): Promise<LeadWithTags> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*, lead_tags(tags(*))")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as LeadWithTags;
}

export async function getLeadEnrollments(leadId: string): Promise<CampaignEnrollment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_leads")
    .select("*, campaigns(id, name, use_case)")
    .eq("lead_id", leadId)
    .order("enrolled_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CampaignEnrollment[];
}

export async function updateLead(id: string, updates: LeadUpdate) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return data;
}

export async function deleteLead(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/leads");
}

export async function bulkImportLeads(
  leads: LeadInsert[]
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const supabase = await createClient();

  const emails = leads.map((l) => l.email).filter(Boolean);
  const { data: existing } = await supabase
    .from("leads")
    .select("email")
    .in("email", emails);

  const existingSet = new Set(existing?.map((r) => r.email) ?? []);
  const newLeads = leads.filter((l) => !existingSet.has(l.email));
  const skipped = leads.length - newLeads.length;

  if (newLeads.length === 0) {
    return { imported: 0, skipped, errors: [] };
  }

  // Insert in chunks of 100 to stay well within limits
  const errors: string[] = [];
  let imported = 0;
  const CHUNK = 100;

  for (let i = 0; i < newLeads.length; i += CHUNK) {
    const chunk = newLeads.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("leads")
      .insert(chunk)
      .select("id");
    if (error) {
      errors.push(error.message);
    } else {
      imported += data?.length ?? 0;
    }
  }

  revalidatePath("/leads");
  return { imported, skipped, errors };
}

export async function addTagToLead(leadId: string, tagId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_tags")
    .insert({ lead_id: leadId, tag_id: tagId });
  // Ignore unique-violation (already tagged)
  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

export async function removeTagFromLead(leadId: string, tagId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_tags")
    .delete()
    .eq("lead_id", leadId)
    .eq("tag_id", tagId);
  if (error) throw new Error(error.message);
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

type PipelineStage = "new" | "contacted" | "replied" | "call_booked" | "introduced" | "closed_won" | "closed_lost";

export async function updateLeadPipelineStage(leadId: string, stage: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pipeline_entries")
    .upsert({ lead_id: leadId, stage: stage as PipelineStage }, { onConflict: "lead_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}
