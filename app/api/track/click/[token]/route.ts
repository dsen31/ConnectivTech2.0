import { createAdminClient } from "@/lib/supabase/admin";
import { decodeTrackingToken } from "@/lib/email/tracking";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const data = decodeTrackingToken(token);

  if (!data?.u) {
    return new Response("Invalid link", { status: 400 });
  }

  const supabase = createAdminClient();
  await supabase.from("email_events").insert({
    campaign_lead_id: data.cl,
    lead_id: data.l,
    step_id: data.s,
    event_type: "clicked",
    metadata: { url: data.u },
  });

  return Response.redirect(data.u, 302);
}
