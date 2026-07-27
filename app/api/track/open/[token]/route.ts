import { createClient } from "@supabase/supabase-js";
import { decodeTrackingToken } from "@/lib/email/tracking";
import type { Database } from "@/lib/supabase/types";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const data = decodeTrackingToken(token);

  if (data) {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Dedup: only record the first open per lead per step. Without this,
    // every repeat pixel fetch (mail client prefetching, re-opening the
    // email, security scanners re-scanning links) counts as a new "open",
    // inflating open rates well past what real readers account for.
    const { count: existingOpens } = await supabase
      .from("email_events")
      .select("id", { count: "exact", head: true })
      .eq("campaign_lead_id", data.cl)
      .eq("step_id", data.s)
      .eq("event_type", "opened");

    if (!existingOpens) {
      await supabase.from("email_events").insert({
        campaign_lead_id: data.cl,
        lead_id: data.l,
        step_id: data.s,
        event_type: "opened",
      });
    }
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
