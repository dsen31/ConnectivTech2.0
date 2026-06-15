-- ============================================================
-- ConnectivTech Sales Platform — Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- LEADS
-- ============================================================
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  last_name     text not null,
  email         text not null unique,
  company_name  text,
  job_title     text,
  industry      text,
  company_size  text check (company_size in ('1-10','11-50','51-200','201-500','500+')),
  website       text,
  linkedin_url  text,
  phone         text,
  pain_points   text[],
  status        text not null default 'new'
                  check (status in ('new','active','unsubscribed','bounced')),
  source        text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TAGS
-- ============================================================
create table if not exists tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  color      text not null default '#6366f1',
  created_at timestamptz not null default now()
);

create table if not exists lead_tags (
  lead_id uuid not null references leads(id) on delete cascade,
  tag_id  uuid not null references tags(id) on delete cascade,
  primary key (lead_id, tag_id)
);

-- ============================================================
-- EMAIL TEMPLATES
-- ============================================================
create table if not exists email_templates (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  use_case     text not null
                 check (use_case in (
                   'telecom','vendor-vetting','fractional-cto',
                   'compliance','it-audit'
                 )),
  subject      text not null,
  body_text    text not null,
  body_html    text,
  tokens_used  text[],
  is_seed      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
create table if not exists campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  use_case    text not null,
  description text,
  status      text not null default 'draft'
                check (status in ('draft','active','paused','completed')),
  from_name   text,
  from_email  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists campaign_steps (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references campaigns(id) on delete cascade,
  step_number    integer not null,
  template_id    uuid not null references email_templates(id),
  delay_days     integer not null default 0,
  send_condition text not null default 'always'
                   check (send_condition in ('always','not_replied','not_opened','opened')),
  created_at     timestamptz not null default now(),
  unique (campaign_id, step_number)
);

-- ============================================================
-- CAMPAIGN ENROLLMENTS
-- ============================================================
create table if not exists campaign_leads (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  lead_id      uuid not null references leads(id) on delete cascade,
  current_step integer not null default 1,
  status       text not null default 'active'
                 check (status in ('active','completed','paused','replied','unsubscribed')),
  enrolled_at  timestamptz not null default now(),
  next_send_at timestamptz,
  unique (campaign_id, lead_id)
);

-- ============================================================
-- EMAIL EVENTS (Phase 2 data — schema ready now)
-- ============================================================
create table if not exists email_events (
  id                uuid primary key default gen_random_uuid(),
  campaign_lead_id  uuid not null references campaign_leads(id) on delete cascade,
  lead_id           uuid not null references leads(id) on delete cascade,
  step_id           uuid not null references campaign_steps(id) on delete cascade,
  event_type        text not null
                      check (event_type in (
                        'sent','opened','clicked','replied','bounced','unsubscribed'
                      )),
  metadata          jsonb,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- PIPELINE
-- ============================================================
create table if not exists pipeline_entries (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leads(id) on delete cascade unique,
  stage      text not null default 'new'
               check (stage in (
                 'new','contacted','replied','call_booked',
                 'introduced','closed_won','closed_lost'
               )),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- A/B TESTS (Phase 2 logic — schema ready now)
-- ============================================================
create table if not exists ab_tests (
  id                    uuid primary key default gen_random_uuid(),
  step_id               uuid not null references campaign_steps(id) on delete cascade,
  variant_a_template_id uuid not null references email_templates(id),
  variant_b_template_id uuid not null references email_templates(id),
  split_pct             integer not null default 50
                          check (split_pct between 1 and 99),
  winner_template_id    uuid references email_templates(id),
  status                text not null default 'running'
                          check (status in ('running','concluded')),
  created_at            timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

create trigger email_templates_updated_at
  before update on email_templates
  for each row execute function set_updated_at();

create trigger campaigns_updated_at
  before update on campaigns
  for each row execute function set_updated_at();

create trigger pipeline_entries_updated_at
  before update on pipeline_entries
  for each row execute function set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists leads_email_idx      on leads(email);
create index if not exists leads_status_idx     on leads(status);
create index if not exists leads_industry_idx   on leads(industry);
create index if not exists cl_campaign_idx      on campaign_leads(campaign_id);
create index if not exists cl_lead_idx          on campaign_leads(lead_id);
create index if not exists cl_status_idx        on campaign_leads(status);
create index if not exists ee_lead_idx          on email_events(lead_id);
create index if not exists ee_type_idx          on email_events(event_type);
create index if not exists pipeline_stage_idx   on pipeline_entries(stage);
