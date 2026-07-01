-- Replace "15-minute" with "30-minute" in all email template bodies.
UPDATE email_templates
SET body_text = REPLACE(body_text, '15-minute', '30-minute')
WHERE body_text LIKE '%15-minute%';
