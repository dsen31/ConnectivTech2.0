import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.actoradvisory.com";
const FROM = "Dustin <dustin@actoradvisory.com>";
const REPLY_TO = "dustin@actoradvisory.com";
const DEFAULT_SIGNATURE =
  "Dustin Senor\naCTOr Advisory\ndustin@actoradvisory.com\nactoradvisory.com";

const PERSONALIZATION_SYSTEM_PROMPT =
  "You are helping personalize cold outreach emails for Dustin Senor at aCTOr Advisory, a technology advisory and AI training firm. Personalize the email for the specific lead without changing the core message or CTA. Keep it under 100 words. Sound human, not AI. No em dashes. Do not include any closing, sign-off, or signature in the body — those are appended separately. Return only a JSON object with keys 'subject' and 'body'.";

function stripTrailingSignoff(body: string): string {
  const signoff = /^(best|regards|thanks|thank you|sincerely|cheers|warm regards|kind regards|dustin|dustin senor)[,.]?\s*$/i;
  const lines = body.split("\n");
  while (lines.length > 0 && (lines[lines.length - 1].trim() === "" || signoff.test(lines[lines.length - 1].trim()))) {
    lines.pop();
  }
  return lines.join("\n").trimEnd();
}

async function personalizeEmail(
  subject: string,
  bodyText: string,
  lead: Record<string, string | null>
): Promise<{ subject: string; body: string }> {
  if (!ANTHROPIC_API_KEY) return { subject, body: bodyText };

  try {
    const userMessage = `Lead info:\n- Name: ${lead.first_name ?? ""} ${lead.last_name ?? ""}\n- Company: ${lead.company_name ?? "unknown"}\n- Job title: ${lead.job_title ?? "unknown"}\n- Industry: ${lead.industry ?? "unknown"}\n\nEmail to personalize:\nSubject: ${subject}\n\nBody:\n${bodyText}`;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: PERSONALIZATION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!res.ok) return { subject, body: bodyText };
    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as { subject?: string; body?: string };
    if (parsed.subject && parsed.body) {
      return { subject: parsed.subject, body: stripTrailingSignoff(parsed.body) };
    }
  } catch {
    // fall through to original
  }

  return { subject, body: bodyText };
}

// ── Helpers (mirrors lib/email/tracking.ts + lib/tokens.ts) ──────────────────

function encodeTrackingToken(data: Record<string, string>): string {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function resolveTokens(
  text: string,
  lead: Record<string, string | null>,
  extras: Record<string, string> = {}
): string {
  const map: Record<string, string> = {
    "{{first_name}}": lead.first_name ?? "",
    "{{last_name}}": lead.last_name ?? "",
    "{{company_name}}": lead.company_name ?? "",
    "{{industry}}": lead.industry ?? "",
    "{{job_title}}": lead.job_title ?? "",
    "{{company_size}}": lead.company_size ?? "",
    "{{sender_name}}": extras.sender_name ?? "",
    "{{calendar_link}}": extras.calendar_link ?? "[calendar link]",
  };
  return text.replace(/\{\{[a-z_]+\}\}/g, (m) => map[m] ?? m);
}

function wrapLinks(
  html: string,
  base: Record<string, string>
): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_m, url: string) => {
    const token = encodeTrackingToken({ ...base, u: url });
    return `href="${APP_URL}/api/track/click/${token}"`;
  });
}

function buildHtml(
  bodyText: string,
  bodyHtml: string | null,
  openToken: string,
  trackBase: Record<string, string>,
  unsubUrl: string,
  signature: string
): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let content = bodyHtml ?? `<div style="white-space:pre-line">${esc(bodyText)}</div>`;
  content = wrapLinks(content, trackBase);
  const sigBlock = `<div style="margin-top:24px;font-size:13px;color:#374151;white-space:pre-line">${esc(signature)}</div>`;
  const footer = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center"><a href="${unsubUrl}" style="color:#9ca3af;font-size:11px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">Unsubscribe</a></div>`;
  const pixel = `<img src="${APP_URL}/api/track/open/${openToken}" width="1" height="1" style="display:none;border:0" alt="" />`;
  return `<!DOCTYPE html><html><body><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px 0">${content}${sigBlock}${footer}${pixel}</div></body></html>`;
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, reply_to: REPLY_TO, subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isWeekendEastern(): boolean {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(new Date());
  return day === "Sat" || day === "Sun";
}

// ── Main send logic ───────────────────────────────────────────────────────────

async function processScheduledEmails() {
  if (isWeekendEastern()) {
    console.log("Weekend in US Eastern time — skipping scheduled sends");
    return { sent: 0, skipped: 0, errors: 0, limitReached: false };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch settings in parallel
  const [sigRow, limitRow] = await Promise.all([
    supabase.from("settings").select("value").eq("key", "email_signature").single(),
    supabase.from("settings").select("value").eq("key", "daily_send_limit").single(),
  ]);
  const signature = sigRow.data?.value ?? DEFAULT_SIGNATURE;
  const dailyLimit = parseInt(limitRow.data?.value ?? "30", 10);

  // Count today's sends (midnight UTC)
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const { count: sentToday } = await supabase
    .from("email_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "sent")
    .gte("created_at", todayUtc.toISOString());

  let remaining = dailyLimit - (sentToday ?? 0);
  console.log(`Daily limit: ${dailyLimit}, sent today: ${sentToday ?? 0}, remaining: ${remaining}`);

  if (remaining <= 0) {
    console.log("Daily send limit already reached — exiting");
    return { sent: 0, skipped: 0, errors: 0, limitReached: true };
  }

  // Query due enrollments
  const now = new Date().toISOString();
  const { data: dueEnrollments, error: dueErr } = await supabase
    .from("campaign_leads")
    .select("id, campaign_id, lead_id, current_step, leads(*)")
    .eq("status", "active")
    .not("next_send_at", "is", null)
    .lte("next_send_at", now);

  if (dueErr) throw new Error(dueErr.message);

  if (!dueEnrollments?.length) {
    console.log("No due enrollments");
    return { sent: 0, skipped: 0, errors: 0, limitReached: false };
  }

  console.log(`Found ${dueEnrollments.length} due enrollment(s)`);

  // Group by campaign_id
  const byCampaign = new Map<string, typeof dueEnrollments>();
  for (const e of dueEnrollments) {
    const arr = byCampaign.get(e.campaign_id) ?? [];
    arr.push(e);
    byCampaign.set(e.campaign_id, arr);
  }

  const results = { sent: 0, skipped: 0, errors: 0, limitReached: false };

  for (const [campaignId, enrollments] of byCampaign) {
    if (remaining <= 0) {
      results.limitReached = true;
      break;
    }

    const { data: steps } = await supabase
      .from("campaign_steps")
      .select("*, email_templates(*)")
      .eq("campaign_id", campaignId)
      .order("step_number");

    if (!steps?.length) {
      results.skipped += enrollments.length;
      continue;
    }

    // Precompute A/B winners for steps with subject_b
    const stepsWithAb = steps.filter((s) => s.subject_b);
    const abWinners = new Map<string, "A" | "B" | null>();

    if (stepsWithAb.length > 0) {
      const abStepIds = stepsWithAb.map((s) => s.id);
      const [{ data: abSent }, { data: abOpened }] = await Promise.all([
        supabase
          .from("email_events")
          .select("campaign_lead_id, step_id, metadata")
          .in("step_id", abStepIds)
          .eq("event_type", "sent"),
        supabase
          .from("email_events")
          .select("campaign_lead_id, step_id")
          .in("step_id", abStepIds)
          .eq("event_type", "opened"),
      ]);

      for (const s of stepsWithAb) {
        const sent = (abSent ?? []).filter((e) => e.step_id === s.id);
        // deno-lint-ignore no-explicit-any
        const aSent = sent.filter((e) => (e.metadata as any)?.variant === "A");
        // deno-lint-ignore no-explicit-any
        const bSent = sent.filter((e) => (e.metadata as any)?.variant === "B");

        if (aSent.length < 20 || bSent.length < 20) { abWinners.set(s.id, null); continue; }

        const openSet = new Set(
          (abOpened ?? []).filter((e) => e.step_id === s.id).map((e) => e.campaign_lead_id)
        );
        const aRate = aSent.filter((e) => openSet.has(e.campaign_lead_id)).length / aSent.length;
        const bRate = bSent.filter((e) => openSet.has(e.campaign_lead_id)).length / bSent.length;
        abWinners.set(s.id, Math.abs(aRate - bRate) >= 0.10 ? (aRate > bRate ? "A" : "B") : null);
      }
    }

    for (const enrollment of enrollments) {
      if (remaining <= 0) {
        results.limitReached = true;
        break;
      }

      // deno-lint-ignore no-explicit-any
      const lead = (enrollment as any).leads as Record<string, string | null> | null;
      if (!lead?.email) { results.skipped++; continue; }

      const step = steps.find((s) => s.step_number === enrollment.current_step);
      if (!step) { results.skipped++; continue; }

      // deno-lint-ignore no-explicit-any
      const template = (step as any).email_templates as Record<string, string | null> | null;
      if (!template) { results.skipped++; continue; }

      // Check send_condition against prior events
      if (step.send_condition !== "always") {
        const { data: priorEvents } = await supabase
          .from("email_events")
          .select("event_type")
          .eq("campaign_lead_id", enrollment.id);
        const types = new Set(priorEvents?.map((e) => e.event_type) ?? []);
        let skip = false;
        if (step.send_condition === "not_replied" && types.has("replied")) skip = true;
        if (step.send_condition === "not_opened" && types.has("opened")) skip = true;
        if (step.send_condition === "opened" && !types.has("opened")) skip = true;
        if (skip) { results.skipped++; continue; }
      }

      const extras = { sender_name: "Dustin" };
      const resolvedSubject = resolveTokens(template.subject ?? "", lead, extras);
      const resolvedBody = resolveTokens(template.body_text ?? "", lead, extras);
      const bodyHtml = template.body_html
        ? resolveTokens(template.body_html, lead, extras)
        : null;

      // A/B subject selection
      const stepSubjectB = step.subject_b as string | null;
      let abVariant: "A" | "B" | null = null;
      let subjectForSend = resolvedSubject;

      if (stepSubjectB) {
        const winner = abWinners.get(step.id) ?? null;
        abVariant = winner ?? (Math.random() < 0.5 ? "A" : "B");
        if (abVariant === "B") {
          subjectForSend = resolveTokens(stepSubjectB, lead, extras);
        }
      }

      const personalized = await personalizeEmail(subjectForSend, resolvedBody, lead);
      const subject = personalized.subject;
      const bodyText = personalized.body;

      const trackBase = { cl: enrollment.id, s: step.id, l: lead.id as string };
      const openToken = encodeTrackingToken(trackBase);
      const unsubUrl = `${APP_URL}/api/unsubscribe/${encodeTrackingToken(trackBase)}`;
      const html = buildHtml(bodyText, bodyHtml, openToken, trackBase, unsubUrl, signature);
      const text = `${bodyText}\n\n${signature}\n\n---\nTo unsubscribe: ${unsubUrl}`;

      try {
        await sendViaResend(lead.email as string, subject, html, text);

        // Log sent event
        const { count: priorSentCount } = await supabase
          .from("email_events")
          .select("id", { count: "exact", head: true })
          .eq("campaign_lead_id", enrollment.id)
          .eq("event_type", "sent");

        await supabase.from("email_events").insert({
          campaign_lead_id: enrollment.id,
          lead_id: lead.id,
          step_id: step.id,
          event_type: "sent",
          ...(abVariant ? { metadata: { variant: abVariant } } : {}),
        });

        // Move to contacted on first send
        if ((priorSentCount ?? 0) === 0) {
          await supabase
            .from("pipeline_entries")
            .upsert({ lead_id: lead.id, stage: "contacted" }, { onConflict: "lead_id" });
        }

        // Advance step + set next_send_at
        const nextStepNum = enrollment.current_step + 1;
        const nextStepData = steps.find((s) => s.step_number === nextStepNum);
        if (nextStepData) {
          const nextSendAt = new Date(
            Date.now() + nextStepData.delay_days * 24 * 60 * 60 * 1000
          ).toISOString();
          await supabase
            .from("campaign_leads")
            .update({ current_step: nextStepNum, next_send_at: nextSendAt })
            .eq("id", enrollment.id);
        } else {
          await supabase
            .from("campaign_leads")
            .update({ status: "completed", next_send_at: null })
            .eq("id", enrollment.id);
        }

        results.sent++;
        remaining--;
        console.log(`Sent to ${lead.email} (campaign ${campaignId}, step ${enrollment.current_step})`);
      } catch (err) {
        results.errors++;
        console.error(`Failed for ${lead.email}:`, err);
      }
    }
  }

  console.log(`Done — sent: ${results.sent}, skipped: ${results.skipped}, errors: ${results.errors}, limitReached: ${results.limitReached}`);
  return results;
}

// ── Entry point ───────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    const result = await processScheduledEmails();
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
