"use server";

import { createClient } from "@/lib/supabase/server";
import type { PipelineEntryWithLead } from "@/types";

export async function getPipelineLeads(): Promise<PipelineEntryWithLead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipeline_entries")
    .select(
      "*, leads(id, first_name, last_name, email, company_name, industry, job_title, status)"
    )
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PipelineEntryWithLead[];
}
