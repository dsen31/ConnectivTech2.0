# Guarded Gmail outreach: setup and release checklist

Implementation is on `feat/guarded-gmail-outreach`. Nothing in this change purchases domains, edits DNS, configures production secrets, enables cron, or sends mail during tests. `OUTREACH_SEND_ENABLED=false` and the database pause flag are independent gates.

## Required owner setup (not performed)

1. Select and purchase a separate sending domain only after your explicit approval. The application refuses `actoradvisory.com` and all its subdomains. A separate domain reduces direct authentication/reputation coupling but does not guarantee inbox placement or protect shared brand links from reputation effects.
2. Provision a licensed Google Workspace mailbox on that domain. The Gmail profile must exactly match `OUTREACH_SENDER_EMAIL`; aliases and delegated service accounts are not supported. Keep your business mailbox separate.
3. After DNS approval, configure Google Workspace MX, a single TXT SPF record `v=spf1 include:_spf.google.com ~all`, Google-generated 2048-bit RSA DKIM at the configured selector, and a single DMARC TXT policy at `_dmarc`. Start with a monitored `p=none` policy and move to enforcement only after reviewing legitimate traffic. Never overwrite an existing SPF record or invent a DKIM public key. This app intentionally rejects complex/multi-provider SPF profiles pending a separate audit.
4. Create a Google Cloud project, enable Gmail API, configure an OAuth consent screen for your organization where eligible, and create a Web OAuth client. Register exactly `https://YOUR_APP_HOST/api/outreach/oauth/callback`. Request only `gmail.send` and `gmail.readonly`. External applications using restricted Gmail scopes may require Google verification/security assessment; Workspace administrators may also need to permit access. Do not assume a personal or internal app exemption without checking your actual configuration.
5. Fill the server-only values in `.env.example` using the hosting secret manager. Generate a random 32-byte base64 encryption key, plus independent random unsubscribe and worker secrets of at least 32 bytes. Never prefix these with `NEXT_PUBLIC_`, commit them, or paste them in chat. Keep the unsubscribe key stable so existing links keep working. Rotating the encryption key requires reconnecting Gmail or a controlled re-encryption migration. Configure a truthful sender name and valid physical postal address.
6. Use an isolated staging database with migrations 001–008 and an owner registered in both `APP_OWNER_EMAILS` and `app_owners`. Migration 008 adds server-only tables, defaults to paused, and retires the named legacy cron jobs. Verify all actual legacy cron job names in the database and disable any additional send jobs before migration. Replace/delete already deployed legacy edge functions: source changes alone do not disable functions currently running in production.
7. Connect the dedicated mailbox from Outreach safety, then check DNS. The dashboard never returns tokens to the browser. Google access tokens stay in memory; refresh tokens are AES-256-GCM encrypted in a service-role-only table. Use HTTPS, encrypted backups, and restricted service-role access.
8. Prepare campaign messages and review each exact recipient, subject, body, postal address, and opt-out link. Record recipient source and the applicable eligibility/consent rationale. Manual approval is not a legal determination; recipient jurisdiction and consent requirements still need review. Bulk imports do not authorize sending.
9. Only after explicit approval: deploy to staging, authorize a controlled test to an owned inbox, inspect Authentication-Results for SPF/DKIM/DMARC alignment and signing, test replies/bounces/unsubscribe, then separately approve production deployment and sending. Keep sending disabled until this acceptance is complete.

## Scheduling after explicit deployment and sending approval

The worker is `POST /api/outreach/worker` with `Authorization: Bearer <OUTREACH_WORKER_SECRET>`. Configure a server-side scheduler to call it every 10 minutes; do not put the secret in a URL. No enabled schedule is included. A Node runtime supporting a 300-second request is configured. The worker processes at most one message per invocation. Default: 10 attempts per rolling 24 hours, maximum 30, minimum 10 minutes apart, Monday–Friday 09:00–17:00 America/New_York. The database serializes reservations across workers. Failed/uncertain attempts consume budget. Settings controls the same cap used by the worker.

The process must have HTTPS egress to Google and DNS resolution. The server-only Supabase service role is required. Public clients have no grants on outreach tables or RPCs. OAuth state is owner-bound, cookie-bound, single use and expires after 10 minutes. Periodically delete expired `outreach_oauth_states` records using a restricted maintenance job.

## Suppression and uncertainty

Before every send, all available inbound mailbox pages are scanned, including spam/trash. Any inbound sender is suppressed across campaigns, including automated replies. RFC delivery reports suppress Final-Recipient/Original-Recipient addresses. Unclassifiable bounces or a mailbox backlog above 1,000 messages pause sending for review; this conservative first version suits a dedicated low-volume mailbox. Do not delete inbound messages to bypass safety checks. Inbound messages deleted permanently before scanning cannot be detected. Replies from a different address may require manually blocking the original recipient.

Suppression is independent of lead records and survives deletion/reimport. Signed unsubscribe POSTs are idempotent and support one-click unsubscribe. GET only shows a confirmation form to avoid link-scanner opt-outs. Old unsigned unsubscribe URLs are rejected; before production rollout assess any previously sent mail and provide a safe compatibility plan if old links are still in use. Replies remain an opt-out channel.

Provider sends cannot share a transaction with Postgres. Unknown outcomes become `uncertain`, automatically pause sending, and are never retried. A crash leaves a reservation that is marked uncertain after five minutes. Reconcile using Gmail Sent and the deterministic Message-ID `<QUEUE_ID@SENDING_DOMAIN>`. Have an operator record the actual outcome in a reviewed database transaction; never reset an uncertain item to approved blindly. Resume refuses unresolved reservations. Emergency pause cannot recall a request already handed to Gmail.

A follow-up step is prepared manually after the previous send advances the enrollment. Every follow-up requires fresh approval. Open-dependent sequences are preserved as conditions, but new messages deliberately omit open/click tracking; use reply-based steps for new campaigns. A/B selection and AI personalization are omitted from this safe sending path so approved content cannot change afterward. The legacy signature/test-email controls do not affect queued messages; direct test email is disabled.

## Validation

Run `npm ci --ignore-scripts`, `npm test`, `npx tsc --noEmit`, and `npm run lint`. Tests use synthetic data and an embedded PostgreSQL engine, not a live account. CI contains no deploy step and no secrets. Live OAuth, actual DNS, Gmail sends, production Supabase migrations, and hosting integration require the staged acceptance above.

## References

- Google OAuth server flow: https://developers.google.com/workspace/gmail/api/auth/web-server
- Gmail scope classifications: https://developers.google.com/workspace/gmail/api/auth/scopes
- Google sender requirements: https://support.google.com/mail/answer/81126
