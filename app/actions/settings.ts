"use server";

import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth/owner";
import { revalidatePath } from "next/cache";
import { checked, outreachDb } from "@/lib/outreach/db";
import { DEFAULT_SIGNATURE } from "@/lib/email/defaults";

export async function getEmailSignature(): Promise<string> {
  await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "email_signature")
    .single();
  return data?.value ?? DEFAULT_SIGNATURE;
}

export async function updateEmailSignature(value: string) {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "email_signature", value }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function getDailySendLimit(): Promise<number> {
  await requireOwner();
  const result = await outreachDb().from('outreach_control').select('daily_cap').eq('id', true).single();
  return checked(result).daily_cap;
}
export async function updateDailySendLimit(value: number) {
  await requireOwner();
  if (!Number.isInteger(value) || value < 1 || value > 30) throw new Error('Daily cap must be between 1 and 30');
  checked(await outreachDb().from('outreach_control').update({ daily_cap: value }).eq('id', true));
  revalidatePath('/settings');
  revalidatePath('/outreach');
}
