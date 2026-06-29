import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID")!;
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET")!;
const GMAIL_REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN")!;

// ── Gmail OAuth2 ──────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail token refresh ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

// ── Gmail inbox fetch ─────────────────────────────────────────────────────────

function extractEmail(from: string): string | null {
  const bracketed = from.match(/<([^>]+@[^>]+)>/);
  if (bracketed) return bracketed[1].toLowerCase();
  const bare = from.match(/([^\s<>"]+@[^\s<>"]+)/);
  return bare ? bare[1].toLowerCase() : null;
}

async function fetchRecentSenders(accessToken: string): Promise<Set<string>> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Overlap with hourly runs; in:inbox filters out sent/drafts
  const searchRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in%3Ainbox+newer_than%3A25h&maxResults=500",
    { headers }
  );
  if (!searchRes.ok) {
    const body = await searchRes.text();
    throw new Error(`Gmail search ${searchRes.status}: ${body}`);
  }
  const searchData = await searchRes.json();
  const messages: Array<{ id: string }> = searchData.messages ?? [];

  if (messages.length === 0) return new Set();

  const senders = new Set<string>();
  const BATCH = 20;

  for (let i = 0; i < messages.length; i += BATCH) {
    const batch = messages.slice(i, i + BATCH);
    const froms = await Promise.all(
      batch.map(async ({ id }) => {
        const r = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From`,
          { headers }
        );
        if (!r.ok) return null;
        const d = await r.json();
        const h = (d.payload?.headers as Array<{ name: string; value: string }> | undefined)
          ?.find((x) => x.name.toLowerCase() === "from");
        return h?.value ?? null;
      })
    );
    for (const from of froms) {
      if (!from) continue;
      const email = extractEmail(from);
      if (email) senders.add(email);
    }
  }

  return senders;
}

// ── Reply detection ───────────────────────────────────────────────────────────

async function checkReplies() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const accessToken = await getAccessToken();
  const senders = await fetchRecentSenders(accessToken);
  console.log(`Unique inbox senders in last 25h: ${senders.size}`);

  if (senders.size === 0) return { checked: 0, updated: 0 };

  // Pull all active enrollments with lead email
  const { data: enrollments, error } = await supabase
    .from("campaign_leads")
    .select("id, lead_id, campaign_id, current_step, leads(email)")
    .eq("status", "active");

  if (error) throw new Error(error.message);
  if (!enrollments?.length) return { checked: 0, updated: 0 };

  let updated = 0;

  for (const enrollment of enrollments) {
    // deno-lint-ignore no-explicit-any
    const lead = (enrollment as any).leads as { email: string } | null;
    if (!lead?.email) continue;
    if (!senders.has(lead.email.toLowerCase())) continue;

    // Resolve step_id from the most recent sent event for this enrollment
    const { data: lastSent } = await supabase
      .from("email_events")
      .select("step_id")
      .eq("campaign_lead_id", enrollment.id)
      .eq("event_type", "sent")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let stepId: string | null = lastSent?.step_id ?? null;

    if (!stepId) {
      // Fallback: current_step was already advanced after send, so last sent = current_step - 1
      const stepNum = Math.max(1, enrollment.current_step - 1);
      const { data: stepRow } = await supabase
        .from("campaign_steps")
        .select("id")
        .eq("campaign_id", enrollment.campaign_id)
        .eq("step_number", stepNum)
        .maybeSingle();
      stepId = stepRow?.id ?? null;
    }

    if (!stepId) {
      console.warn(`No step_id for enrollment ${enrollment.id} — skipping event log`);
      // Still mark replied even without an event row? No — keep data consistent.
      continue;
    }

    await Promise.all([
      supabase
        .from("campaign_leads")
        .update({ status: "replied" })
        .eq("id", enrollment.id),
      supabase.from("email_events").insert({
        campaign_lead_id: enrollment.id,
        lead_id: enrollment.lead_id,
        step_id: stepId,
        event_type: "replied",
      }),
      supabase
        .from("pipeline_entries")
        .upsert({ lead_id: enrollment.lead_id, stage: "replied" }, { onConflict: "lead_id" }),
    ]);

    updated++;
    console.log(`Replied: ${lead.email} (enrollment ${enrollment.id})`);
  }

  console.log(`Done — checked: ${enrollments.length}, replied: ${updated}`);
  return { checked: enrollments.length, updated };
}

// ── Entry point ───────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    const result = await checkReplies();
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
