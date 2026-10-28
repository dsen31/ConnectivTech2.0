import 'server-only';
import { checked, outreachDb } from './db';
import { gmailClient } from './google';
import { senderConfig, secret, unsubscribeToken } from './security';
import { checkDns } from './dns';

export type QueueRow = { id: string; campaign_lead_id: string; lead_id: string; step_id: string; recipient: string; sender: string; subject: string; body: string; status: string; thread_id: string | null; created_at: string };

// Scan the entire mailbox result, not only INBOX (replies may be archived).
// A failed page, malformed DSN, or excess backlog blocks sending.
export async function syncSuppression() {
  const db = outreachDb(), gmail = await gmailClient();
  const { email } = senderConfig();
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const list = await gmail.users.messages.list({ userId: 'me', q: '-in:sent -in:drafts', includeSpamTrash: true, maxResults: 100, pageToken });
    for (const item of list.data.messages ?? []) {
      const { data: message } = await gmail.users.messages.get({ userId: 'me', id: item.id!, format: 'full' });
      const headers = message.payload?.headers ?? [];
      const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value?.toLowerCase() ?? '';
      const address = from.match(/<([^<>\s]+@[^<>\s]+)>/)?.[1] ?? from.trim();
      if (address === email) continue;
      const flatten = (part: typeof message.payload): string => {
        if (!part) return '';
        return (part.body?.data ? Buffer.from(part.body.data, 'base64url').toString('utf8') : '') + '\n' + (part.parts ?? []).map(flatten).join('\n');
      };
      const body = flatten(message.payload);
      const isBounce = /mailer-daemon|postmaster/i.test(from) || message.payload?.mimeType === 'multipart/report';
      if (isBounce) {
        const recipients = [...body.matchAll(/(?:Final-Recipient|Original-Recipient):\s*rfc822;\s*([^\s<>;]+)/gi)].map(m => m[1].toLowerCase());
        if (!recipients.length) throw new Error('Unclassified delivery report: review mailbox before sending');
        for (const recipient of recipients) checked(await db.rpc('outreach_suppress', { address: recipient, why: 'bounced' }));
      } else if (/^[^\s<>@]+@[^\s<>@]+$/.test(address)) {
        // Any inbound contact stops outreach to that address, including an
        // automatic reply. No AI classification is required to stop sending.
        checked(await db.rpc('outreach_suppress', { address, why: 'replied' }));
      }
    }
    pageToken = list.data.nextPageToken ?? undefined;
    if (++pages >= 10 && pageToken) throw new Error('Mailbox backlog requires review');
  } while (pageToken);
  return gmail;
}

export async function runWorker() {
  if (process.env.OUTREACH_SEND_ENABLED !== 'true') return { status: 'disabled' };
  const db = outreachDb();
  const control = checked(await db.from('outreach_control').select('*').eq('id', true).single());
  if (control.paused) return { status: 'paused' };
  // A crashed sending reservation needs reconciliation in Gmail, never retry.
  const stale = checked(await db.from('outreach_queue').select('id').eq('status', 'sending').lt('attempted_at', new Date(Date.now() - 300000).toISOString()));
  if (stale.length) {
    checked(await db.from('outreach_control').update({ paused: true }).eq('id', true));
    checked(await db.from('outreach_queue').update({ status: 'uncertain', error: 'Reconcile Gmail Sent before taking action' }).in('id', stale.map(r => r.id)));
    return { status: 'reconciliation_required' };
  }
  let claimed: QueueRow | undefined;
  try {
    const dns = await checkDns();
    checked(await db.from('outreach_control').update({ dns, dns_checked_at: dns.checkedAt }).eq('id', true));
    if (!dns.ok) return { status: 'dns_blocked' };
    const gmail = await syncSuppression();
    const rows = checked(await db.rpc('outreach_claim')) as QueueRow[];
    claimed = rows[0];
    if (!claimed) return { status: 'nothing_eligible' };
    const { email, origin, domain } = senderConfig();
    if (claimed.sender !== email || /[\r\n]/.test(claimed.subject) || !/^[^\s<>@]+@[^\s<>@]+$/.test(claimed.recipient)) throw new Error('Invalid approved message');
    // Last database read immediately before the provider call. A pause cannot
    // recall a provider request that is already in flight.
    const current = checked(await db.from('outreach_control').select('paused').eq('id', true).single());
    const suppressed = checked(await db.from('outreach_suppressions').select('email').eq('email', claimed.recipient));
    const enrollment = checked(await db.from('campaign_leads').select('status,campaigns(status),leads(email,status)').eq('id', claimed.campaign_lead_id).single());
    const campaign = enrollment.campaigns as unknown as { status: string };
    const lead = enrollment.leads as unknown as { email: string; status: string };
    if (current.paused || suppressed.length || enrollment.status !== 'active' || campaign.status !== 'active' || lead.email.trim().toLowerCase() !== claimed.recipient || ['unsubscribed','bounced'].includes(lead.status)) {
      checked(await db.from('outreach_queue').update({ status: 'cancelled' }).eq('id', claimed.id));
      return { status: 'cancelled' };
    }
    const unsub = `${origin}/api/unsubscribe/${unsubscribeToken(claimed.recipient)}`;
    const raw = [
      `From: ${email}`, `To: ${claimed.recipient}`,
      `Subject: =?UTF-8?B?${Buffer.from(claimed.subject).toString('base64')}?=`,
      `Message-ID: <${claimed.id}@${domain}>`, 'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64',
      `List-Unsubscribe: <${unsub}>`, 'List-Unsubscribe-Post: List-Unsubscribe=One-Click',
      '', Buffer.from(claimed.body).toString('base64').match(/.{1,76}/g)!.join('\r\n'),
    ].join('\r\n');
    const result = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: Buffer.from(raw).toString('base64url') } }, { retry: false, timeout: 20000 });
    if (!result.data.id || !result.data.threadId) throw new Error('Unknown provider outcome');
    checked(await db.rpc('outreach_finish', { queue_id: claimed.id, message_id: result.data.id, gmail_thread: result.data.threadId }));
    return { status: 'sent' };
  } catch {
    checked(await db.from('outreach_control').update({ paused: true }).eq('id', true));
    if (claimed) checked(await db.from('outreach_queue').update({ status: 'uncertain', error: 'Review Gmail Sent; automatic retry disabled' }).eq('id', claimed.id).eq('status', 'sending'));
    // Do not log provider errors: they can contain OAuth credentials or mail.
    return { status: 'paused_after_error' };
  }
}

export function footer(recipient: string) {
  const { origin } = senderConfig();
  return `\n\n${secret('OUTREACH_SENDER_NAME')}\n${secret('OUTREACH_POSTAL_ADDRESS')}\nBusiness outreach. To opt out, reply or unsubscribe:\n${origin}/api/unsubscribe/${unsubscribeToken(recipient)}`;
}
