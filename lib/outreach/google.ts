import 'server-only';
import { google } from 'googleapis';
import { checked, outreachDb } from './db';
import { decrypt, encrypt, secret, senderConfig } from './security';

export const scopes = ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'];
export function oauthClient() {
  return new google.auth.OAuth2(secret('GOOGLE_CLIENT_ID'), secret('GOOGLE_CLIENT_SECRET'), `${senderConfig().origin}/api/outreach/oauth/callback`);
}
export async function gmailClient() {
  const db = outreachDb();
  const row = checked(await db.from('outreach_account').select('*').eq('id', true).single());
  if (!row || row.email !== senderConfig().email) throw new Error('Connect the configured sending mailbox');
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: decrypt(row.refresh_token) });
  // Access tokens stay only in server memory. Persist refresh-token rotation.
  const token = await auth.getAccessToken();
  if (!token.token) throw new Error('Reconnect Gmail');
  if (auth.credentials.refresh_token && auth.credentials.refresh_token !== decrypt(row.refresh_token)) {
    checked(await db.from('outreach_account').update({ refresh_token: encrypt(auth.credentials.refresh_token) }).eq('id', true));
  }
  return google.gmail({ version: 'v1', auth });
}
