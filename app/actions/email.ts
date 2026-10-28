"use server";
import { requireOwner } from '@/lib/auth/owner';
import { checked, outreachDb } from '@/lib/outreach/db';
import { senderConfig } from '@/lib/outreach/security';
import { footer } from '@/lib/outreach/worker';
import { resolveTokens } from '@/lib/tokens';
import { revalidatePath } from 'next/cache';

export async function sendCampaignStep(campaignId: string) {
  await requireOwner();
  const db = outreachDb();
  const { email } = senderConfig();
  const campaign = checked(await db.from('campaigns').select('*').eq('id', campaignId).single());
  if (campaign.status !== 'active') throw new Error('Activate the campaign before preparing messages');
  const steps = checked(await db.from('campaign_steps').select('*,email_templates(*)').eq('campaign_id', campaignId));
  const enrollments = checked(await db.from('campaign_leads').select('*,leads(*)').eq('campaign_id', campaignId).eq('status', 'active'));
  let queued = 0, skipped = 0;
  for (const enrollment of enrollments) {
    const lead = enrollment.leads;
    const step = steps.find(s => s.step_number === enrollment.current_step);
    const template = step?.email_templates;
    if (!lead || !template || ['unsubscribed','bounced'].includes(lead.status) || (enrollment.next_send_at && Date.parse(enrollment.next_send_at) > Date.now())) { skipped++; continue; }
    const recipient = lead.email.trim().toLowerCase();
    if (!/^[^\s<>@]+@[^\s<>@]+$/.test(recipient)) throw new Error('Invalid recipient');
    const suppressions = checked(await db.from('outreach_suppressions').select('email').eq('email', recipient));
    const events = checked(await db.from('email_events').select('event_type').eq('lead_id', lead.id));
    const types = new Set(events.map(e => e.event_type));
    if (suppressions.length || ['replied','bounced','unsubscribed'].some(t => types.has(t)) || (step.send_condition === 'opened' && !types.has('opened')) || (step.send_condition === 'not_opened' && types.has('opened'))) { skipped++; continue; }
    const subject = resolveTokens(template.subject, lead);
    const body = resolveTokens(template.body_text, lead) + footer(recipient);
    if (!subject.trim() || /[\r\n]/.test(subject) || subject.length > 200 || /\{\{/.test(subject + body)) throw new Error('Resolve template fields and use a valid subject');
    const inserted = checked(await db.from('outreach_queue').upsert({ campaign_lead_id: enrollment.id, lead_id: lead.id, step_id: step.id, recipient, sender: email, subject, body }, { onConflict: 'campaign_lead_id,step_id', ignoreDuplicates: true }).select('id'));
    queued += inserted.length;
  }
  revalidatePath('/outreach');
  return { queued, skipped };
}

export async function sendTestEmail(_email: string): Promise<void> {
  await requireOwner();
  void _email;
  throw new Error('Direct test sending is disabled. Prepare and approve messages in Outreach.');
}
