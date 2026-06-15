"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getTags() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createTag(name: string, color: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({ name: name.trim(), color })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/leads");
  return data;
}

export async function updateTag(id: string, name: string, color: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .update({ name: name.trim(), color })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/leads");
  return data;
}

export async function deleteTag(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/leads");
}
