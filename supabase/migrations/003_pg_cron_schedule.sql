-- Run this in the Supabase SQL editor after deploying the edge function.
--
-- Prerequisites (enable via Supabase Dashboard → Database → Extensions):
--   • pg_cron
--   • pg_net
--
-- Replace the two placeholders before running:
--   YOUR_PROJECT_REF  → found in Project Settings → General (e.g. ebwtcbfupujwmgmrnzwp)
--   YOUR_SERVICE_ROLE_KEY → found in Project Settings → API → service_role key

SELECT cron.schedule(
  'send-scheduled-emails-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://ebwtcbfupujwmgmrnzwp.supabase.co/functions/v1/send-scheduled-emails',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- To verify the job was created:
-- SELECT * FROM cron.job;

-- To remove the job if needed:
-- SELECT cron.unschedule('send-scheduled-emails-hourly');
