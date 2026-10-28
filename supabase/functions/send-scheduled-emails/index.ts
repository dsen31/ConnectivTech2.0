// Retired: all sending is handled by the guarded Next.js worker.
Deno.serve(() => new Response('Legacy sender disabled', { status: 410 }));
