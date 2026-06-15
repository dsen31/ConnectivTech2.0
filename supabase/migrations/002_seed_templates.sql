-- ============================================================
-- ConnectivTech Sales Platform — Email Sequence Seeds
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql
-- 5 sequences × 3 emails = 15 templates
-- ============================================================

-- Idempotent: delete existing seed templates before re-seeding
delete from email_templates where is_seed = true;

insert into email_templates (name, use_case, subject, body_text, tokens_used, is_seed) values

-- ============================================================
-- SEQUENCE 1: TELECOM SAVINGS
-- "Are you overpaying for telecom?"
-- ============================================================

(
  'Telecom — Step 1: Quick question about your bill',
  'telecom',
  'Quick question about {{company_name}}''s telecom costs',
  'Hi {{first_name}},

I''ll keep this short.

Most companies your size are overpaying their telecom bills by 20–40% — and they don''t know it because vendors rely on contracts rolling over without a second look.

I work with a firm called ConnectivTech. We do a free telecom audit for businesses like {{company_name}} — no commitment, no sales pitch. We find the savings, show you the numbers, and you decide what to do next.

Takes about 15 minutes to figure out if it''s even worth looking at.

Are you the right person to chat with, or should I reach out to someone else on your team?

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'sender_name'],
  true
),

(
  'Telecom — Step 2: Most companies overpay by 20–40%',
  'telecom',
  'Re: {{company_name}} telecom costs',
  'Hi {{first_name}},

Wanted to follow up on my last note.

The average business we audit is leaving $2,400 or more per employee on the table every year in telecom and software overcharges. For {{company_name}}, that adds up fast.

The audit is free and takes about an hour of your team''s time. We''ve never done one where we didn''t find something worth fixing.

Would a 15-minute call this week or next make sense — just to see if there''s anything worth digging into?

{{sender_name}}

P.S. If you''re not the right person for this, I''d appreciate a quick point in the right direction.',
  ARRAY['first_name', 'company_name', 'sender_name'],
  true
),

(
  'Telecom — Step 3: Break-up',
  'telecom',
  'Closing the loop on this',
  'Hi {{first_name}},

Not trying to be a pest — just wanted to send one last note before I move on.

If the timing isn''t right or telecom costs aren''t a priority right now, totally understand. If you ever want a second set of eyes on your bills, we''re easy to reach.

Wishing {{company_name}} a great rest of the year.

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'sender_name'],
  true
),

-- ============================================================
-- SEQUENCE 2: VENDOR VETTING
-- "Who's vetting your vendors?"
-- ============================================================

(
  'Vendor Vetting — Step 1: How do you evaluate new tech vendors?',
  'vendor-vetting',
  'How does {{company_name}} evaluate new tech vendors?',
  'Hi {{first_name}},

Quick question — when {{company_name}} is evaluating a new software or technology vendor, what does that process look like?

Most companies either take the vendor''s word for it, or spend weeks researching on their own. Neither is great.

I work with ConnectivTech. We''ve already done 5+ hours of vetting on hundreds of vendors across cybersecurity, software, telecom, HR, and more. When a business comes to us with a need, we match them to the right pre-vetted partner — no guesswork, no cost to you.

Worth a 15-minute conversation to see if we can be useful to {{company_name}}?

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'sender_name'],
  true
),

(
  'Vendor Vetting — Step 2: The risk hiding in your vendor stack',
  'vendor-vetting',
  'The risk hiding in your vendor stack',
  'Hi {{first_name}},

Circling back on my last message.

Here''s something we see often: a company signs with a vendor, everything looks fine on paper, and six months later they''re dealing with poor service, surprise fees, or a product that doesn''t deliver. The vendor relationship wasn''t properly vetted upfront.

We built ConnectivTech specifically to fix this. Businesses should have access to someone who''s already done the due diligence — without paying a consulting fee for it.

Is there a technology decision {{company_name}} is working through right now? Happy to be a quick sounding board, no strings attached.

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'sender_name'],
  true
),

(
  'Vendor Vetting — Step 3: Break-up',
  'vendor-vetting',
  'Last note from me',
  'Hi {{first_name}},

This is my last reach-out for now.

If there''s ever a technology decision you want a second opinion on, or a vendor you want vetted before signing — we''re here. No agenda, no fee on your side.

Take care.

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'sender_name'],
  true
),

-- ============================================================
-- SEQUENCE 3: FRACTIONAL CTO
-- "Do you have a technology strategy?"
-- ============================================================

(
  'Fractional CTO — Step 1: Does your company have a technology strategy?',
  'fractional-cto',
  'Does {{company_name}} have a technology strategy?',
  'Hi {{first_name}},

This might sound like a strange question — but if I asked you today what {{company_name}}''s technology strategy is, would you have a clear answer?

Most growing companies don''t. Tech decisions get made reactively: a problem comes up, someone recommends a tool, you buy it. That pattern gets expensive fast.

ConnectivTech provides Fractional CTO and technology advisory services to companies that want to get ahead of this. We help build a strategy, evaluate what you already have, and make sure your technology is supporting growth instead of slowing it down.

Would a quick 15-minute call be worth your time to see if this fits where {{company_name}} is right now?

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'sender_name'],
  true
),

(
  'Fractional CTO — Step 2: What a technology strategy actually looks like',
  'fractional-cto',
  'What a technology strategy actually looks like',
  'Hi {{first_name}},

Wanted to follow up with something concrete.

A technology strategy doesn''t mean a 50-page document. For most companies, it''s really just three questions: What tools do we have and are we actually using them? What do we need in the next 12 months to support growth? And who owns technology decisions when something breaks?

That last one is where most {{industry}} businesses struggle. Without someone accountable, decisions get made by whoever yells loudest — and costs creep up quietly.

Is {{company_name}} at a stage where a part-time technology partner would make sense? I''d be happy to share what this looks like for other companies in {{industry}}.

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'industry', 'sender_name'],
  true
),

(
  'Fractional CTO — Step 3: Break-up',
  'fractional-cto',
  'One last thought for {{company_name}}',
  'Hi {{first_name}},

Last one from me, I promise.

If {{company_name}} ever hits a point where technology feels more like a headache than an advantage — a vendor problem, a compliance issue, or just needing someone to help make sense of your options — that''s exactly when we''re most useful.

Best of luck with everything this year.

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'sender_name'],
  true
),

-- ============================================================
-- SEQUENCE 4: COMPLIANCE
-- "Is your business compliance-ready?"
-- ============================================================

(
  'Compliance — Step 1: A quick question about your security posture',
  'compliance',
  'A quick question about {{company_name}}''s security posture',
  'Hi {{first_name}},

I''ll be direct: is cybersecurity compliance on {{company_name}}''s radar this year?

I ask because the requirements have gotten a lot more specific — CMMC, NIST, SOC 2, and others — and a lot of companies in {{industry}} are realizing they need to act before a contract or a client forces their hand.

ConnectivTech helps businesses understand exactly where they stand, then connects them with the right vetted partners to close the gaps. No fluff, no overselling — just an honest look at the risk.

Worth 15 minutes to see where {{company_name}} is at?

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'industry', 'sender_name'],
  true
),

(
  'Compliance — Step 2: The gap most businesses discover too late',
  'compliance',
  'The compliance gap most companies discover too late',
  'Hi {{first_name}},

Following up on my last note.

Here''s what we see repeatedly: a company finds out they''re not compliant when a government contract falls through, after a breach, or when a client''s vendor audit flags them. By then, the cost to get compliant is much higher than it would have been six months earlier.

The good news is a compliance gap assessment doesn''t take long — and knowing where you stand costs nothing upfront.

Would a 15-minute call this week make sense? I can walk you through what the assessment looks like before you decide anything.

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'sender_name'],
  true
),

(
  'Compliance — Step 3: Break-up',
  'compliance',
  'Leaving the door open',
  'Hi {{first_name}},

I won''t keep following up after this.

If compliance isn''t a priority right now, I understand completely. But if {{company_name}} ever has a government contract on the table, a client requiring SOC 2, or just wants to know where your security gaps are — feel free to reach out.

We''ll be here.

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'sender_name'],
  true
),

-- ============================================================
-- SEQUENCE 5: IT AUDIT / SAVINGS
-- "Your IT costs are leaking money"
-- ============================================================

(
  'IT Audit — Step 1: Are you getting what you''re paying for on IT?',
  'it-audit',
  'Are you getting what you''re paying for on IT?',
  'Hi {{first_name}},

A lot of companies in {{industry}} are spending more on IT than they realize — and getting less than they think.

I''m talking about software licenses nobody''s using, vendor contracts with auto-renewals nobody approved, and hardware that should''ve been replaced two years ago. It adds up.

ConnectivTech does a free IT and software cost audit for businesses like {{company_name}}. We find where the money''s going, flag what''s not delivering value, and help you decide what to do about it.

The average audit we run saves businesses $2,400 or more per employee annually. Worth a 15-minute conversation to see if there''s anything worth finding?

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'industry', 'sender_name'],
  true
),

(
  'IT Audit — Step 2: What we typically find',
  'it-audit',
  'What we typically find in an IT audit',
  'Hi {{first_name}},

Following up quickly.

The three things that come up most in audits we run:

1. Software subscriptions that haven''t been used in 6+ months but keep auto-renewing
2. Telecom and internet contracts that were competitive three years ago and aren''t anymore
3. Vendor overlaps — two tools doing the same job, both being paid for

None of this is unique to one industry or one company size. It just happens when there''s no one actively watching the spend.

If {{company_name}} has 50+ employees, there''s almost certainly something to find. Is it worth 15 minutes to look?

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'sender_name'],
  true
),

(
  'IT Audit — Step 3: Break-up',
  'it-audit',
  'Last ask — then I''ll leave you alone',
  'Hi {{first_name}},

Last note from me.

If this doesn''t land right now, no worries at all. If {{company_name}} ever wants a fresh set of eyes on IT costs or vendor contracts — you know where to find us.

Thanks for your time.

{{sender_name}}',
  ARRAY['first_name', 'company_name', 'sender_name'],
  true
);
