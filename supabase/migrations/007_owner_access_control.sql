-- Owner-only access for ConnectivTech CRM data.
-- Create the owner in Supabase Auth, then run the INSERT at the end once.

create table if not exists public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_owners enable row level security;

create or replace function public.is_app_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_owners where user_id = auth.uid());
$$;

revoke all on function public.is_app_owner() from public;
grant execute on function public.is_app_owner() to authenticated;

drop policy if exists "owners can read their owner record" on public.app_owners;
create policy "owners can read their owner record" on public.app_owners for select to authenticated using (user_id = auth.uid());

do $$
declare table_name text;
begin
  foreach table_name in array array['leads', 'tags', 'lead_tags', 'email_templates', 'campaigns', 'campaign_steps', 'campaign_leads', 'email_events', 'pipeline_entries', 'ab_tests', 'settings']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "owners manage data" on public.%I', table_name);
    execute format('create policy "owners manage data" on public.%I for all to authenticated using (public.is_app_owner()) with check (public.is_app_owner())', table_name);
  end loop;
end $$;

-- insert into public.app_owners (user_id)
-- select id from auth.users where lower(email) = lower('YOUR_OWNER_EMAIL');
