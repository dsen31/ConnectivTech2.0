"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const DEFAULT_SIGNATURE =
  "Dustin Senor\naCTOr Advisory\ndustin@actoradvisory.com\nactoradvisory.com";

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
