import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('migration enforces access, manual approval, pause, caps, suppression and atomic completion', async () => {
 const db=new PGlite();
 await db.exec(`
 create role anon; create role authenticated; create role service_role;
 create schema auth; create table auth.users(id uuid primary key);
 create table leads(id uuid primary key,email text,status text);
 create table campaigns(id uuid primary key,status text);
 create table campaign_leads(id uuid primary key,lead_id uuid,campaign_id uuid,current_step int,status text,next_send_at timestamptz);
 create table campaign_steps(id uuid primary key,campaign_id uuid,step_number int,delay_days int);
 create table email_events(id uuid default gen_random_uuid(),campaign_lead_id uuid,lead_id uuid,step_id uuid,event_type text,metadata jsonb);
 create table pipeline_entries(lead_id uuid unique,stage text);
 `);
 const migration=readFileSync('supabase/migrations/008_guarded_outreach.sql','utf8');
 await db.exec(migration);
 const rows=async(sql:string)=>(await db.query(sql)).rows;
 assert.equal((await rows("select has_table_privilege('authenticated','outreach_account','select') as allowed") as {allowed:boolean}[])[0].allowed,false);
 assert.equal((await rows("select has_function_privilege('authenticated','outreach_claim()','execute') as allowed") as {allowed:boolean}[])[0].allowed,false);
 // Freeze business-hours predicate for reproducible local tests; all locking,
 // cap, approval and suppression SQL is the real migrated function.
 const claim=migration.slice(migration.indexOf('create function public.outreach_claim()'),migration.indexOf('revoke all on function public.outreach_claim()'))
 .replace('create function','create or replace function')
 .replace("extract(isodow from now() at time zone 'America/New_York') > 5",'false')
 .replace("extract(hour from now() at time zone 'America/New_York') not between 9 and 16",'false');
 await db.exec(claim);
 await db.exec(`
 insert into auth.users values('00000000-0000-0000-0000-000000000001');
 insert into leads values('00000000-0000-0000-0000-000000000002','lead@example.com','active');
 insert into campaigns values('00000000-0000-0000-0000-000000000003','active');
 insert into campaign_leads values('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003',1,'active',null);
 insert into campaign_steps values('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000003',1,0);
 insert into outreach_queue(id,campaign_lead_id,lead_id,step_id,recipient,sender,subject,body) values('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','lead@example.com','sender@separate.example','Hello','Body');
 `);
 assert.equal((await rows('select * from outreach_claim()')).length,0);
 await db.exec(`update outreach_control set paused=false,dns='{"ok":true}',dns_checked_at=now();`);
 assert.equal((await rows('select * from outreach_claim()')).length,0,'pending requires approval');
 await db.exec(`update outreach_queue set status='approved',approved_by='00000000-0000-0000-0000-000000000001'; update outreach_control set paused=true;`);
 assert.equal((await rows('select * from outreach_claim()')).length,0,'pause blocks');
 await db.exec(`update outreach_control set paused=false,dns_checked_at=now()-interval '2 hours';`);
 assert.equal((await rows('select * from outreach_claim()')).length,0,'stale DNS blocks');
 await db.exec(`update outreach_control set dns_checked_at=now();`);
 assert.equal((await rows('select * from outreach_claim()')).length,1);
 assert.equal((await rows('select * from outreach_claim()')).length,0,'no duplicate claim');
 await db.exec(`select outreach_finish('00000000-0000-0000-0000-000000000006','gmail-1','thread-1');`);
 assert.equal((await rows("select * from email_events where event_type='sent'")).length,1);
 assert.equal((await rows("select * from campaign_leads where status='completed'")).length,1);
 await assert.rejects(()=>db.exec(`select outreach_finish('00000000-0000-0000-0000-000000000006','gmail-1','thread-1');`));
 await db.exec(`update campaign_leads set status='active'; update outreach_queue set status='approved'; update outreach_control set last_attempt_at=null,daily_cap=1;`);
 assert.equal((await rows('select * from outreach_claim()')).length,0,'rolling cap counts reserved attempts');
 await db.exec(`update outreach_control set daily_cap=10; select outreach_suppress('LEAD@example.com','unsubscribed');`);
 assert.equal((await rows("select * from outreach_queue where status='suppressed'")).length,1);
 assert.equal((await rows("select * from leads where status='unsubscribed'")).length,1);
 assert.equal((await rows('select * from outreach_claim()')).length,0);
 await db.exec(`select outreach_suppress('lead@example.com','unsubscribed');`);
 assert.equal((await rows('select * from outreach_suppressions')).length,1,'idempotent opt-out');
 await db.exec(`update leads set email='manual@example.com',status='bounced';`);
 assert.equal((await rows("select * from outreach_suppressions where email='manual@example.com'")).length,1,'manual CRM stops persist');
 await db.exec('delete from outreach_control');
 assert.equal((await rows('select * from outreach_claim()')).length,0,'missing control fails closed');
 await db.close();
});
