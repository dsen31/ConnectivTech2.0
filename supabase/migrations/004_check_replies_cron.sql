-- Run this in the Supabase SQL editor after deploying the check-replies edge function.
--
-- Prerequisites (same as 003): pg_cron and pg_net extensions must be enabled.
--
-- Replace the placeholder before running:
--   YOUR_SERVICE_ROLE_KEY → Project Settings → API → service_role key

SELECT cron.schedule(
  'check-replies-hourly',
  '30 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://ebwtcbfupujwmgmrnzwp.supabase.co/functions/v1/check-replies',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- To verify both jobs are scheduled:
-- SELECT * FROM cron.job;

-- To remove this job if needed:
-- SELECT cron.unschedule('check-replies-hourly');
