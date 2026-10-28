import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { google } from 'googleapis';
import { requireOwner } from '@/lib/auth/owner';
import { oauthClient, scopes } from '@/lib/outreach/google';
import { checked, outreachDb } from '@/lib/outreach/db';
import { decrypt, encrypt, equal, senderConfig } from '@/lib/outreach/security';

export async function GET(request: Request) {
  const owner = await requireOwner();
  const jar = await cookies();
  const url = new URL(request.url), state = url.searchParams.get('state') ?? '';
  const expected = jar.get('outreach_oauth')?.value ?? '';
  jar.delete('outreach_oauth');
  try {
    if (!state || !expected || !equal(state, expected) || !url.searchParams.get('code')) throw new Error('Invalid OAuth state');
    const db = outreachDb();
    const rows = checked(await db.from('outreach_oauth_states').delete().eq('state_hash', createHash('sha256').update(state).digest('hex')).eq('owner_id', owner.id).gt('expires_at', new Date().toISOString()).select());
    if (rows.length !== 1) throw new Error('Expired or reused OAuth state');
    const auth = oauthClient();
    const { tokens } = await auth.getToken({ code: url.searchParams.get('code')!, codeVerifier: decrypt(rows[0].verifier) });
    auth.setCredentials(tokens);
    if (!tokens.refresh_token || !scopes.every(scope => tokens.scope?.split(' ').includes(scope))) throw new Error('Required consent missing');
    const { data } = await google.gmail({ version: 'v1', auth }).users.getProfile({ userId: 'me' });
    if (data.emailAddress?.toLowerCase() !== senderConfig().email) throw new Error('Wrong mailbox');
    checked(await db.from('outreach_control').update({ paused: true }).eq('id', true));
    checked(await db.from('outreach_account').upsert({ id: true, email: senderConfig().email, refresh_token: encrypt(tokens.refresh_token) }));
    return Response.redirect(`${senderConfig().origin}/outreach`);
  } catch {
    return new Response('Gmail connection failed. Check the configured mailbox and consent, then retry from Outreach.', { status: 400 });
  }
}
