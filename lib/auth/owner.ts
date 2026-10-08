import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function allowedEmails() {
  return (process.env.APP_OWNER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email: string | null | undefined) {
  return Boolean(email && allowedEmails().includes(email.toLowerCase()));
}

export async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/login?error=unauthorized");
  return user;
}
