import { createClient } from "@supabase/supabase-js";
import { decodeTrackingToken } from "@/lib/email/tracking";
import type { Database } from "@/lib/supabase/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const data = decodeTrackingToken(token);

  if (!data?.u) {
    return new Response("Invalid link", { status: 400 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  await supabase.from("email_events").insert({
    campaign_lead_id: data.cl,
    lead_id: data.l,
    step_id: data.s,
    event_type: "clicked",
    metadata: { url: data.u },
  });

  return Response.redirect(data.u, 302);
}
