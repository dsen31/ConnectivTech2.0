"use server";

import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { resolveTokens } from "@/lib/tokens";
import { encodeTrackingToken, type TrackingData } from "@/lib/email/tracking";
import { revalidatePath } from "next/cache";
import type { Lead, EmailTemplate } from "@/lib/supabase/types";
import { getEmailSignature } from "@/app/actions/settings";

const PERSONALIZATION_SYSTEM_PROMPT =
  "You are helping personalize cold outreach emails for Dustin Senor at aCTOr Advisory, a technology advisory and AI training firm. Personalize the email for the specific lead without changing the core message or CTA. Keep it under 100 words. Sound human, not AI. No em dashes. Do not include any closing, sign-off, or signature in the body — those are appended separately. Return only a JSON object with keys 'subject' and 'body'.";

// Removes trailing sign-offs the AI sometimes appends (e.g. "Best,\nDustin")
// despite being told not to, so the explicit signature block isn't duplicated.
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
  lead: Lead
): Promise<{ subject: string; body: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { subject, body: bodyText };

  try {
    const client = new Anthropic({ apiKey });
    const userMessage = `Lead info:\n- Name: ${lead.first_name} ${lead.last_name}\n- Company: ${lead.company_name ?? "unknown"}\n- Job title: ${lead.job_title ?? "unknown"}\n- Industry: ${lead.industry ?? "unknown"}\n\nEmail to personalize:\nSubject: ${subject}\n\nBody:\n${bodyText}`;
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: PERSONALIZATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text) as { subject?: string; body?: string };
    if (parsed.subject && parsed.body) {
      return { subject: parsed.subject, body: stripTrailingSignoff(parsed.body) };
    }
  } catch {
    // fall through to original
  }

  return { subject, body: bodyText };
}

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const FROM = "Dustin <dustin@actoradvisory.com>";

function wrapLinks(html: string, base: TrackingData): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_match, url: string) => {
    const token = encodeTrackingToken({ ...base, u: url });
    return `href="${APP_URL}/api/track/click/${token}"`;
  });
}

function buildHtml(
  bodyText: string,
  bodyHtml: string | null,
  openToken: string,
  trackBase: TrackingData,
  unsubUrl: string,
  signature: string
): string {
  const escaped = bodyText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  let content = bodyHtml ?? `<div style="white-space:pre-line">${escaped}</div>`;
  content = wrapLinks(content, trackBase);
  const escapedSig = signature
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const sigBlock = `<div style="margin-top:24px;font-size:13px;color:#374151;white-space:pre-line">${escapedSig}</div>`;
  const footer = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center"><a href="${unsubUrl}" style="color:#9ca3af;font-size:11px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">Unsubscribe</a></div>`;
  const pixel = `<img src="${APP_URL}/api/track/open/${openToken}" width="1" height="1" style="display:none;border:0" alt="" />`;
  return `<!DOCTYPE html><html><body><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px 0">${content}${sigBlock}${footer}${pixel}</div></body></html>`;
}

export async function sendCampaignStep(campaignId: string): Promise<{
  sent: number;
  skipped: number;
  errors: number;
  limitReached: boolean;
  weekendBlocked: boolean;
}> {
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(new Date());
  if (dayName === "Sat" || dayName === "Sun") {
    return { sent: 0, skipped: 0, errors: 0, limitReached: false, weekendBlocked: true };
  }

  const supabase = await createClient();

  const { data: limitData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "daily_send_limit")
    .single();
  const dailyLimit = parseInt(limitData?.value ?? "30", 10);

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const { count: sentToday } = await supabase
    .from("email_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "sent")
    .gte("created_at", todayUtc.toISOString());

  if ((sentToday ?? 0) >= dailyLimit) {
    return { sent: 0, skipped: 0, errors: 0, limitReached: true, weekendBlocked: false };
  }

  let remaining = dailyLimit - (sentToday ?? 0);

  const { data: steps, error: stepsErr } = await supabase
    .from("campaign_steps")
    .select("*, email_templates(*)")
    .eq("campaign_id", campaignId)
    .order("step_number");
  if (stepsErr) throw new Error(stepsErr.message);

  const { data: enrollments, error: enrollErr } = await supabase
    .from("campaign_leads")
    .select("id, lead_id, current_step, leads(*)")
    .eq("campaign_id", campaignId)
    .eq("status", "active");
  if (enrollErr) throw new Error(enrollErr.message);

  const signature = await getEmailSignature();

  // Precompute A/B winners for any steps that have subject_b set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stepsWithAb = (steps ?? []).filter((s) => (s as any).subject_b);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aSent = sent.filter((e) => (e.metadata as any)?.variant === "A");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const results = { sent: 0, skipped: 0, errors: 0, limitReached: false, weekendBlocked: false };

  for (const enrollment of enrollments ?? []) {
    if (remaining <= 0) {
      results.limitReached = true;
      break;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = enrollment as any;
    const lead = raw.leads as Lead | null;
    const step = (steps ?? []).find((s) => s.step_number === enrollment.current_step);

    if (!step || !lead?.email) {
      results.skipped++;
      continue;
    }

    const template = (step as unknown as { email_templates: EmailTemplate | null }).email_templates;
    if (!template) {
      results.skipped++;
      continue;
    }

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
      if (skip) {
        results.skipped++;
        continue;
      }
    }

    const extras = { sender_name: "Dustin" };
    const resolvedSubject = resolveTokens(template.subject, lead, extras);
    const resolvedBody = resolveTokens(template.body_text, lead, extras);
    const bodyHtml = template.body_html ? resolveTokens(template.body_html, lead, extras) : null;

    // A/B subject selection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stepSubjectB = (step as any).subject_b as string | null;
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

    const trackBase: TrackingData = { cl: enrollment.id, s: step.id, l: lead.id };
    const openToken = encodeTrackingToken(trackBase);
    const unsubUrl = `${APP_URL}/api/unsubscribe/${encodeTrackingToken(trackBase)}`;
    const html = buildHtml(bodyText, bodyHtml, openToken, trackBase, unsubUrl, signature);
    const text = `${bodyText}\n\n${signature}\n\n---\nTo unsubscribe: ${unsubUrl}`;

    try {
      await resend.emails.send({
        from: FROM,
        to: lead.email,
        replyTo: ["dustin@actoradvisory.com"],
        subject,
        html,
        text,
      });

      const { count } = await supabase
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

      if ((count ?? 0) === 0) {
        await supabase
          .from("pipeline_entries")
          .upsert({ lead_id: lead.id, stage: "contacted" }, { onConflict: "lead_id" });
      }

      const nextStep = enrollment.current_step + 1;
      const nextStepData = (steps ?? []).find((s) => s.step_number === nextStep);
      if (nextStepData) {
        const nextSendAt = new Date(
          Date.now() + nextStepData.delay_days * 24 * 60 * 60 * 1000
        ).toISOString();
        await supabase
          .from("campaign_leads")
          .update({ current_step: nextStep, next_send_at: nextSendAt })
          .eq("id", enrollment.id);
      } else {
        await supabase
          .from("campaign_leads")
          .update({ status: "completed", next_send_at: null })
          .eq("id", enrollment.id);
      }

      results.sent++;
      remaining--;
    } catch {
      results.errors++;
    }
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/pipeline");
  revalidatePath("/leads");

  return results;
}
