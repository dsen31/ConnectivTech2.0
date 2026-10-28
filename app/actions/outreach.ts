"use server";
import { requireOwner } from '@/lib/auth/owner';
import { checked, outreachDb } from '@/lib/outreach/db';
import { checkDns } from '@/lib/outreach/dns';
import { gmailClient } from '@/lib/outreach/google';
import { senderConfig } from '@/lib/outreach/security';
import { revalidatePath } from 'next/cache';

export async function refreshDns() {
  await requireOwner();
  const dns = await checkDns();
  checked(await outreachDb().from('outreach_control').update({ dns, dns_checked_at: dns.checkedAt }).eq('id', true));
  revalidatePath('/outreach');
}
export async function pauseOutreach() {
  await requireOwner();
  checked(await outreachDb().from('outreach_control').update({ paused: true }).eq('id', true));
  revalidatePath('/outreach');
}
export async function resumeOutreach() {
  await requireOwner();
  if (process.env.OUTREACH_SEND_ENABLED !== 'true') throw new Error('Sending is disabled in deployment configuration');
  if (!(await checkDns()).ok) throw new Error('DNS checks must pass');
  await gmailClient();
  const db = outreachDb();
  const unresolved = checked(await db.from('outreach_queue').select('id').in('status', ['sending','uncertain']));
  if (unresolved.length) throw new Error('Reconcile uncertain sends before resuming');
  checked(await db.from('outreach_control').update({ paused: false }).eq('id', true));
  revalidatePath('/outreach');
}
export async function approveMessage(form: FormData) {
  const owner = await requireOwner();
  const note = String(form.get('compliance_note') ?? '').trim();
  if (form.get('confirmed') !== 'on' || note.length < 20 || note.length > 2000) throw new Error('Confirm recipient eligibility and record your rationale');
  const db = outreachDb();
  const row = checked(await db.from('outreach_queue').select('*').eq('id', String(form.get('id'))).single());
  if (row.sender !== senderConfig().email) throw new Error('Sender configuration changed; cancel this message');
  checked(await db.from('outreach_queue').update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: owner.id, compliance_note: note }).eq('id', row.id).eq('status', 'pending'));
  revalidatePath('/outreach');
}
export async function cancelMessage(form: FormData) {
  await requireOwner();
  checked(await outreachDb().from('outreach_queue').update({ status: 'cancelled' }).eq('id', String(form.get('id'))).in('status',['pending','approved']));
  revalidatePath('/outreach');
}
export async function suppressAddress(form: FormData) {
  await requireOwner();
  const email = String(form.get('email')).trim().toLowerCase();
  if (!/^[^\s<>@]+@[^\s<>@]+$/.test(email)) throw new Error('Invalid address');
  checked(await outreachDb().rpc('outreach_suppress', { address: email, why: 'manual' }));
  revalidatePath('/outreach');
}
export async function disconnectGmail() {
  await requireOwner();
  const db = outreachDb();
  checked(await db.from('outreach_control').update({ paused: true }).eq('id', true));
  checked(await db.from('outreach_account').delete().eq('id', true));
  checked(await db.from('outreach_oauth_states').delete().gt('expires_at', '1970-01-01'));
  revalidatePath('/outreach');
}
