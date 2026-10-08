import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/** Only for narrowly scoped public handlers; it bypasses Row Level Security. */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
