// Retired: mailbox suppression is checked by the guarded worker before sending.
Deno.serve(() => new Response('Legacy reply checker disabled', { status: 410 }));
