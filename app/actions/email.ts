"use server";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { resolveTokens } from "@/lib/tokens";
import { encodeTrackingToken, type TrackingData } from "@/lib/email/tracking";
import { revalidatePath } from "next/cache";
import type { Lead, EmailTemplate } from "@/lib/supabase/types";

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
  trackBase: TrackingData
): string {
  const escaped = bodyText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  let content = bodyHtml ?? `<div style="white-space:pre-line">${escaped}</div>`;
  content = wrapLinks(content, trackBase);
  const pixel = `<img src="${APP_URL}/api/track/open/${openToken}" width="1" height="1" style="display:none;border:0" alt="" />`;
  return `<!DOCTYPE html><html><body><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px 0">${content}${pixel}</div></body></html>`;
}

export async function sendCampaignStep(campaignId: string): Promise<{
  sent: number;
  skipped: number;
  errors: number;
}> {
  const supabase = await createClient();

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

  const results = { sent: 0, skipped: 0, errors: 0 };

  for (const enrollment of enrollments ?? []) {
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
    const subject = resolveTokens(template.subject, lead, extras);
    const bodyText = resolveTokens(template.body_text, lead, extras);
    const bodyHtml = template.body_html ? resolveTokens(template.body_html, lead, extras) : null;

    const trackBase: TrackingData = { cl: enrollment.id, s: step.id, l: lead.id };
    const openToken = encodeTrackingToken(trackBase);
    const html = buildHtml(bodyText, bodyHtml, openToken, trackBase);

    try {
      await resend.emails.send({
        from: FROM,
        to: lead.email,
        subject,
        html,
        text: bodyText,
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
      });

      if ((count ?? 0) === 0) {
        await supabase
          .from("pipeline_entries")
          .upsert({ lead_id: lead.id, stage: "contacted" }, { onConflict: "lead_id" });
      }

      const nextStep = enrollment.current_step + 1;
      const hasNext = (steps ?? []).some((s) => s.step_number === nextStep);
      if (hasNext) {
        await supabase
          .from("campaign_leads")
          .update({ current_step: nextStep })
          .eq("id", enrollment.id);
      } else {
        await supabase
          .from("campaign_leads")
          .update({ status: "completed" })
          .eq("id", enrollment.id);
      }

      results.sent++;
    } catch {
      results.errors++;
    }
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/pipeline");
  revalidatePath("/leads");

  return results;
}
