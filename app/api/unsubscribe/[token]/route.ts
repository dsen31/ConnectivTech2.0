import { unsubscribeEmail } from '@/lib/outreach/security';
import { checked, outreachDb } from '@/lib/outreach/db';
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!unsubscribeEmail((await params).token)) return new Response('Invalid link', { status: 400 });
  return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Unsubscribe</title><h1>Stop all outreach</h1><form method="post"><button>Unsubscribe from all campaigns</button></form></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const email = unsubscribeEmail((await params).token);
  if (!email) return new Response('Invalid link', { status: 400 });
  try {
    checked(await outreachDb().rpc('outreach_suppress', { address: email, why: 'unsubscribed' }));
    return new Response('You are unsubscribed from all outreach campaigns.', { headers: { 'Cache-Control': 'no-store' } });
  } catch { return new Response('Unable to save. Please retry or reply to the sender.', { status: 503 }); }
}
