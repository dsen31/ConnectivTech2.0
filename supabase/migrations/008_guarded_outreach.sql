-- Apply only after explicit deployment approval. All new data is server-only.
create table public.outreach_control (
 id boolean primary key default true check(id), paused boolean not null default true,
 daily_cap integer not null default 10 check(daily_cap between 1 and 30),
 last_attempt_at timestamptz, dns jsonb, dns_checked_at timestamptz
);
insert into public.outreach_control(id) values(true);
create table public.outreach_account (
 id boolean primary key default true check(id), email text not null,
 refresh_token text not null
);
create table public.outreach_oauth_states (
 state_hash text primary key, owner_id uuid not null references auth.users(id),
 verifier text not null, expires_at timestamptz not null
);
create table public.outreach_suppressions (
 email text primary key check(email=lower(trim(email))), reason text not null,
 created_at timestamptz not null default now()
);
create table public.outreach_queue (
 id uuid primary key default gen_random_uuid(),
 campaign_lead_id uuid not null references campaign_leads(id) on delete cascade,
 lead_id uuid not null references leads(id) on delete cascade,
 step_id uuid not null references campaign_steps(id) on delete cascade,
 recipient text not null, sender text not null, subject text not null, body text not null,
 status text not null default 'pending' check(status in ('pending','approved','sending','sent','uncertain','suppressed','cancelled')),
 approved_by uuid references auth.users(id), approved_at timestamptz, compliance_note text,
 created_at timestamptz not null default now(), attempted_at timestamptz,
 gmail_id text, thread_id text, error text,
 unique(campaign_lead_id,step_id)
);
create index on public.outreach_queue(status,created_at);
create index on public.outreach_queue(attempted_at);
do $$ declare t text; begin
 foreach t in array array['outreach_control','outreach_account','outreach_oauth_states','outreach_suppressions','outreach_queue'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

-- Serializes global caps across workers. A reservation counts even if its
-- provider outcome is unknown; never retry an ambiguous send automatically.
create function public.outreach_claim() returns setof public.outreach_queue
language plpgsql security definer set search_path=public as $$
declare c outreach_control; q outreach_queue;
begin
 select * into c from outreach_control where id=true for update;
 if not found then return; end if;
 if c.paused or c.dns_checked_at is null or c.dns_checked_at < now()-interval '1 hour'
 or coalesce((c.dns->>'ok')::boolean,false)=false
 or c.last_attempt_at > now()-interval '10 minutes'
 or extract(isodow from now() at time zone 'America/New_York') > 5
 or extract(hour from now() at time zone 'America/New_York') not between 9 and 16 then return; end if;
 if (select count(*) from outreach_queue where attempted_at > now()-interval '24 hours') >= c.daily_cap then return; end if;
 update outreach_queue set status='suppressed' where status in ('pending','approved') and (
 exists(select 1 from outreach_suppressions s where s.email=lower(recipient)) or
 exists(select 1 from leads l where l.id=lead_id and l.status in ('unsubscribed','bounced')));
 select oq.* into q from outreach_queue oq
 join campaign_leads cl on cl.id=oq.campaign_lead_id
 join campaigns ca on ca.id=cl.campaign_id
 join campaign_steps cs on cs.id=oq.step_id
 join leads l on l.id=oq.lead_id
 where oq.status='approved' and oq.approved_by is not null
 and cl.status='active' and ca.status='active' and cs.step_number=cl.current_step
 and (cl.next_send_at is null or cl.next_send_at<=now())
 and lower(l.email)=oq.recipient and l.status not in ('bounced','unsubscribed')
 and not exists(select 1 from email_events e where e.lead_id=oq.lead_id and e.event_type in ('replied','unsubscribed','bounced'))
 order by oq.created_at limit 1 for update of oq skip locked;
 if q.id is null then return; end if;
 update outreach_control set last_attempt_at=now() where id=true;
 return query update outreach_queue set status='sending',attempted_at=now() where id=q.id returning *;
end $$;
revoke all on function public.outreach_claim() from public,anon,authenticated;
grant execute on function public.outreach_claim() to service_role;

create function public.outreach_suppress(address text, why text) returns void
language plpgsql security definer set search_path=public as $$
begin
 insert into outreach_suppressions(email,reason) values(lower(trim(address)),why) on conflict(email) do nothing;
 update outreach_queue set status='suppressed' where lower(recipient)=lower(trim(address)) and status in ('pending','approved');
 update campaign_leads set status=case when why='unsubscribed' then 'unsubscribed' else 'replied' end,next_send_at=null
 where lead_id in(select id from leads where lower(email)=lower(trim(address)));
 if why in ('unsubscribed','bounced') then update leads set status=why where lower(email)=lower(trim(address)); end if;
end $$;
revoke all on function public.outreach_suppress(text,text) from public,anon,authenticated;
grant execute on function public.outreach_suppress(text,text) to service_role;

-- Finish provider success and campaign progress in one transaction.
create function public.outreach_finish(queue_id uuid, message_id text, gmail_thread text) returns void
language plpgsql security definer set search_path=public as $$
declare q outreach_queue; next_step campaign_steps;
begin
 select * into q from outreach_queue where id=queue_id for update;
 if q.status <> 'sending' then raise exception 'Invalid queue state'; end if;
 update outreach_queue set status='sent',gmail_id=message_id,thread_id=gmail_thread where id=q.id;
 insert into email_events(campaign_lead_id,lead_id,step_id,event_type,metadata)
 values(q.campaign_lead_id,q.lead_id,q.step_id,'sent',jsonb_build_object('gmail_id',message_id));
 select ns.* into next_step from campaign_steps ns join campaign_steps cs on ns.campaign_id=cs.campaign_id and ns.step_number=cs.step_number+1 where cs.id=q.step_id;
 if next_step.id is null then
 update campaign_leads set status='completed',next_send_at=null where id=q.campaign_lead_id and status='active';
 else
 update campaign_leads set current_step=next_step.step_number,next_send_at=now()+make_interval(days=>greatest(next_step.delay_days,1)) where id=q.campaign_lead_id and status='active';
 end if;
 insert into pipeline_entries(lead_id,stage) values(q.lead_id,'contacted') on conflict(lead_id) do nothing;
end $$;
revoke all on function public.outreach_finish(uuid,text,text) from public,anon,authenticated;
grant execute on function public.outreach_finish(uuid,text,text) to service_role;

-- Disable legacy cron jobs; do not create an enabled sending schedule here.
do $$ declare j record; begin
 if exists(select 1 from pg_namespace where nspname='cron') then
 for j in execute $q$select jobid from cron.job where jobname in ('send-scheduled-emails-hourly','check-replies-hourly')$q$ loop
 perform cron.unschedule(j.jobid);
 end loop;
 end if;
end $$;

-- Preserve prior stops across campaign deletion and reimport.
insert into outreach_suppressions(email,reason)
select distinct lower(trim(l.email)), 'historical_stop' from leads l
where l.status in ('unsubscribed','bounced') or exists(
 select 1 from email_events e where e.lead_id=l.id and e.event_type in ('replied','unsubscribed','bounced')
) or exists(select 1 from campaign_leads cl where cl.lead_id=l.id and cl.status in ('replied','unsubscribed'))
on conflict(email) do nothing;


-- Preserve manual CRM stops even if the lead is later deleted or reimported.
create function public.outreach_preserve_lead_stop() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.status in ('unsubscribed','bounced') then
 insert into outreach_suppressions(email,reason) values(lower(trim(new.email)),new.status) on conflict(email) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.outreach_preserve_lead_stop() from public,anon,authenticated;
create trigger outreach_lead_stop after insert or update of status,email on leads
for each row execute function public.outreach_preserve_lead_stop();
