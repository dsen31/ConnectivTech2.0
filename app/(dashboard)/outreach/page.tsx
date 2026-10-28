import Link from 'next/link';
import { requireOwner } from '@/lib/auth/owner';
import { checked, outreachDb } from '@/lib/outreach/db';
import { approveMessage, cancelMessage, disconnectGmail, pauseOutreach, refreshDns, resumeOutreach, suppressAddress } from '@/app/actions/outreach';
import type { QueueRow } from '@/lib/outreach/worker';
export const dynamic = 'force-dynamic';
export default async function OutreachPage() {
  await requireOwner();
  const db = outreachDb();
  const [controlResult, accountResult, queueResult, suppressionResult] = await Promise.all([
    db.from('outreach_control').select('*').eq('id', true).single(),
    db.from('outreach_account').select('email').eq('id', true).maybeSingle(),
    db.from('outreach_queue').select('id,recipient,sender,subject,body,status,created_at').order('created_at', { ascending: false }).limit(100),
    db.from('outreach_suppressions').select('email', { count:'exact', head:true }),
  ]);
  if (controlResult.error) return <div><h1>Outreach setup required</h1><p>Apply migration 008 to your staging environment and configure the server settings. Production changes require approval.</p></div>;
  const control = checked(controlResult), account = checked(accountResult);
  const queue = checked(queueResult) as QueueRow[];
  checked(suppressionResult);
  const button = 'rounded border px-3 py-2 text-sm';
  return <div className="max-w-3xl space-y-6">
    <h1 className="text-2xl font-semibold">Outreach safety & approval</h1>
    <p>Sending: <strong>{process.env.OUTREACH_SEND_ENABLED !== 'true' ? 'Disabled by configuration' : control.paused ? 'Paused' : 'Enabled'}</strong>. {control.daily_cap} attempts per rolling 24 hours; at least 10 minutes apart; weekdays 9am–5pm New York time.</p>
    <div className="flex flex-wrap gap-3"><form action={pauseOutreach}><button className="rounded bg-red-700 text-white px-4 py-2">Emergency pause</button></form><form action={resumeOutreach}><button className={button}>Resume approved messages</button></form></div>
    <p className="text-sm">Pause stops new sends. An email already handed to Gmail cannot be recalled. Unknown send outcomes require review in Gmail Sent before resuming.</p>
    <section className="border rounded p-4 space-y-3"><h2 className="font-semibold">Dedicated Gmail mailbox</h2><p>{account?.email ?? 'Not connected'}</p><Link className={button} href="/api/outreach/oauth/start">Connect Google Workspace</Link><form action={disconnectGmail}><button className={button}>Disconnect and pause</button></form><p className="text-sm">Disconnect removes the stored token. Revoke the application in your Google Account to remove Google consent too.</p></section>
    <section className="border rounded p-4 space-y-3"><h2 className="font-semibold">DNS readiness</h2><p>Last checked: {control.dns_checked_at ?? 'Never'}</p><ul>{['spf','dkim','dmarc'].map(key => <li key={key}>{key.toUpperCase()}: {control.dns?.[key] ? 'Pass' : 'Not verified'}</li>)}</ul><p className="text-sm">Checks the configured Google-only SPF, RSA DKIM public key, and DMARC policy. Verify actual DKIM signing and alignment in a separately authorized test before enabling outreach. DNS checks cannot guarantee inbox placement.</p><form action={refreshDns}><button className={button}>Check DNS</button></form></section>
    <section className="border rounded p-4 space-y-3"><h2 className="font-semibold">Suppression</h2><p>{suppressionResult.count ?? 0} addresses blocked across all campaigns.</p><form action={suppressAddress} className="flex gap-2"><input className="border rounded p-2" type="email" name="email" placeholder="Address to block" required/><button className={button}>Block address</button></form></section>
    <h2 className="text-xl font-semibold">Review messages</h2><p>Use “Prepare for review” in an active campaign. Approval covers the exact text below. No automatic personalization, tracking pixels, or link rewriting is applied.</p>
    {queue.length === 0 && <p>No messages queued.</p>}
    {queue.map(row => <article className="border rounded p-4 space-y-3" key={row.id}><p><strong>{row.recipient}</strong> — {row.status}</p><p>From: {row.sender}</p><h3 className="font-semibold">{row.subject}</h3><pre className="whitespace-pre-wrap font-sans text-sm break-words">{row.body}</pre>{row.status === 'pending' && <form action={approveMessage} className="space-y-3"><input type="hidden" name="id" value={row.id}/><label className="block">Recipient source and reason this outreach is permitted<textarea className="border rounded p-2 w-full" name="compliance_note" minLength={20} maxLength={2000} required/></label><label className="block"><input type="checkbox" name="confirmed" required/> I reviewed the exact message, recipient eligibility, truthful identity and subject, postal address, and opt-out. I have checked applicable consent requirements.</label><button className={button}>Approve this message</button></form>}{['pending','approved'].includes(row.status) && <form action={cancelMessage}><input type="hidden" name="id" value={row.id}/><button className={button}>Cancel</button></form>}</article>)}
    <p className="text-sm">Showing the latest 100 messages. Retain suppression records when deleting lead records.</p>
  </div>;
}
