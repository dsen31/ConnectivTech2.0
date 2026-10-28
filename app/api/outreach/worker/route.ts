import { equal } from '@/lib/outreach/security';
import { runWorker } from '@/lib/outreach/worker';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function POST(request: Request) {
  const token = process.env.OUTREACH_WORKER_SECRET;
  if (!token || token.length < 32 || !equal(request.headers.get('authorization') ?? '', `Bearer ${token}`)) return new Response('Unauthorized', { status: 401 });
  return Response.json(await runWorker(), { headers: { 'Cache-Control': 'no-store' } });
}
