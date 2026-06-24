"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DEFAULT_SIGNATURE } from "@/lib/email/defaults";

export async function getEmailSignature(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "email_signature")
    .single();
  return data?.value ?? DEFAULT_SIGNATURE;
}

export async function updateEmailSignature(value: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "email_signature", value }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function getDailySendLimit(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "daily_send_limit")
    .single();
  return parseInt(data?.value ?? "30", 10);
}

export async function updateDailySendLimit(value: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "daily_send_limit", value: String(value) }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}
