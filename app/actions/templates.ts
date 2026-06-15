"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";

type TemplateInsert = Database["public"]["Tables"]["email_templates"]["Insert"];
type TemplateUpdate = Database["public"]["Tables"]["email_templates"]["Update"];

export async function getTemplates() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("use_case")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getTemplate(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createTemplate(data: TemplateInsert) {
  const supabase = await createClient();
  const { data: template, error } = await supabase
    .from("email_templates")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/templates");
  return template;
}

export async function updateTemplate(id: string, updates: TemplateUpdate) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/templates");
  revalidatePath(`/templates/${id}`);
  return data;
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/templates");
}
