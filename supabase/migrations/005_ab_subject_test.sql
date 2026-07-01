-- Add subject_b to campaign_steps for A/B subject line testing.
-- Variant A = email_templates.subject (existing), Variant B = this field.
ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS subject_b text;
