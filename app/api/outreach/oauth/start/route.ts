import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'node:crypto';
import { requireOwner } from '@/lib/auth/owner';
import { oauthClient, scopes } from '@/lib/outreach/google';
import { checked, outreachDb } from '@/lib/outreach/db';
import { encrypt } from '@/lib/outreach/security';

export async function GET() {
  const owner = await requireOwner();
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  checked(await outreachDb().from('outreach_oauth_states').insert({ state_hash: createHash('sha256').update(state).digest('hex'), owner_id: owner.id, verifier: encrypt(verifier), expires_at: new Date(Date.now() + 600000).toISOString() }));
  (await cookies()).set('outreach_oauth', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/api/outreach/oauth' });
  const url = oauthClient().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: scopes, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' as never });
  return Response.redirect(url);
}
