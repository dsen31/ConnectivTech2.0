import { createClient } from "@supabase/supabase-js";
import { decodeTrackingToken } from "@/lib/email/tracking";
import type { Database } from "@/lib/supabase/types";

const SUCCESS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Unsubscribed</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
    .card{background:#fff;border-radius:12px;padding:40px 32px;max-width:400px;width:100%;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06)}
    h1{font-size:18px;font-weight:600;margin-bottom:8px}
    p{font-size:14px;color:#6b7280;line-height:1.6}
  </style>
</head>
<body>
  <div class="card">
    <h1>You've been unsubscribed</h1>
    <p>You won't receive any more emails from this campaign.</p>
  </div>
</body>
</html>`;

const ERROR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Invalid link</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
    .card{background:#fff;border-radius:12px;padding:40px 32px;max-width:400px;width:100%;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08)}
    h1{font-size:18px;font-weight:600;margin-bottom:8px}
    p{font-size:14px;color:#6b7280;line-height:1.6}
  </style>
</head>
<body>
  <div class="card">
    <h1>Invalid link</h1>
    <p>This unsubscribe link is invalid or has already been used.</p>
  </div>
</body>
</html>`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const data = decodeTrackingToken(token);

  if (!data) {
    return new Response(ERROR_HTML, {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  await supabase
    .from("campaign_leads")
    .update({ status: "unsubscribed" })
    .eq("id", data.cl);

  await supabase.from("email_events").insert({
    campaign_lead_id: data.cl,
    lead_id: data.l,
    step_id: data.s,
    event_type: "unsubscribed",
  });

  return new Response(SUCCESS_HTML, {
    headers: { "Content-Type": "text/html" },
  });
}
