# KAIRA AFRICA — FULL ENGINEERING CONTINUATION HANDOVER

Date: 3 November 2026
Project: Kaira Africa
Maintainer: Royal FinTech Company
Repository: RoyalFinTech/Kaira-Africa

This is the current continuation record for the next engineering chat. Read this together with ENGINEERING_SOURCE_OF_TRUTH.md and FEATURE_AUDIT.md. Those documents preserve the phased roadmap and feature-by-feature QA detail. Historical notes are dated snapshots; use the newer baseline below.

## A. Current baseline and connected resources

- GitHub main: 07c7f63a3b9e1df1c01d38da2487d6a07b784aaa.
- PR #172 merged as c71a2fdbe6129ee895212bf98539098b7c7dfc1f: Kaira logo on public team invitation page, invitee phone/PIN continuation correction, expiry/resend roster consistency and migration 0024 removing the joined_at default.
- PR #173 merged as 07c7f63a3b9e1df1c01d38da2487d6a07b784aaa: responsive mobile header, dashboard welcome/quick actions and calculator metric/discount/tax layouts.
- Both PRs passed workspace and Backend CI, including frontend build, API tests, fresh migration checks, health smoke and production Docker build.
- Render frontend service srv-db257gjbc2fs73f9nsj0: https://kaira-africa-frontend.onrender.com/
- Render API service srv-da6fnem7bikc738ekde0: https://kaira-africa-api.onrender.com/
- Render admin static service srv-dbg86rmk1f9s73bkkev0.
- Render workspace tea-d9usq87lk1mc73eia2f0.
- Supabase project ref gofoibbvxnhqzqwrpcbx, region eu-west-1.
- All three Render services were verified Live on main 07c7f63.
- Production Supabase checkpoint before referral work: Drizzle migration ledger count 25/max ID 25 (through migration 0024); public.businesses count 2; businesses RLS enabled; anon/authenticated have no direct SELECT or INSERT grants on public.businesses. No production business records were changed during referral development.

## B. Open work — PR #174 business-to-business referral links

PR: https://github.com/RoyalFinTech/Kaira-Africa/pull/174
Branch: feat/business-referral-links
Head at this handover: 4a9172820054f63342907cce2dd394d6d29cb082
State: OPEN, NOT MERGED, NOT DEPLOYED.
Earlier required CI runs 41712804649 (Work Management Build Checks) and 41712804625 (Backend CI) were for a PR revision before the static-route correction. They are superseded. Re-check the latest runs for the exact current PR head before using any result; add the /referrals static-entry build to acceptance.

### Required referral behavior

This is a separate business-to-business referral system, not team invitation:
- A business owner shares the unique referral link belonging to that business.
- A recipient creates their own independent Kaira Africa business workspace.
- The recipient does not become a team member, gain access to the referring business, or share customer, team, sales, ledger, inventory, savings or investment records.
- The link is permanent and unique per business.
- Add the referral count to the page.
- Future referral bonuses or paid feature unlocks are a future roadmap policy. Do not invent percentages, points, reward thresholds, payout terms or active entitlements. Page must be honest that rewards are not active yet.

### Implementation currently in PR #174

- Drizzle businesses schema adds referralCode and nullable referredByBusinessId self-reference.
- Migration 0025_business_referrals.sql adds/backfills KAI- plus 16 uppercase hexadecimal characters, enforces NOT NULL, adds unique referral-code index and referred-by index/FK.
- No new public referral table. No anon/authenticated grants or weaker RLS.
- API generates code server-side with crypto random bytes; normal business profile schema omits code/referral attribution so users cannot edit them through business profile update.
- Owner-only GET /api/businesses/me/referral returns business name, stable code and count of attributed businesses.
- New-business creation accepts an optional x-kaira-referral-code header, validates the code and resolves the referring business inside the same transaction as business creation. Self-referral is blocked.
- App captures first valid ?ref=... code in sessionStorage and passes it only when an authenticated user creates a new business workspace.
- Onboarding has an explicit “Continue without the referral link” path if an incoming code is invalid/unrecognized.
- Sidebar/hamburger adds an owner-only “Refer a Business” item under GROWTH. Route is /referrals. The explicit Render static SPA entry generator also includes /referrals for direct loads and browser refresh.
- Page uses actual KairaLogo, green/gold brand system, permanent link, copy action, prefilled WhatsApp share, business count and a clear statement that it is for independent businesses and not team access.
- No reward engine, payouts, commissions, paid feature entitlements or automatic bonuses.

### PR #174 acceptance and merge gates

1. Poll latest Work Management Build Checks and Backend CI. If failure, inspect failing steps/logs and fix the branch. Require latest-head workspace typecheck/build and Backend CI including API tests/fresh DB migration validation/health/Docker build.
2. Review exact changed files and full PR diff. There should be 12 intended files. The OpenAPI spec should remain about 47 KB / 1,933 lines and contain exactly one /businesses, one /businesses/me, one /businesses/me/referral, one BusinessReferralSummary. Earlier accidentally duplicated OpenAPI diff was corrected in f5d9563; preserve the focused version.
3. Verify schema insert/update types do not allow client mutation of referral code or referrer; inspect all business insert call sites to ensure they always generate a code.
4. Test endpoint authorization conceptually and through automated tests: owner 200, manager/staff 403, anonymous 401.
5. Check malformed/unknown code, self-referral, new business creation, existing user business conflict and session storage behavior. Referrals must never grant membership.
6. Only merge after all exact-head CI workflows are green and current PR head is reconfirmed.
7. After merge, confirm main SHA and all three Render deployment SHAs/statuses. Inspect API logs for “Migrations applied successfully”.
8. Verify Supabase Drizzle ledger now count 26/max ID 26; referral_code NOT NULL; distinct code backfill exists for each existing business; unique index and referred-by FK/index present; RLS enabled; anon/authenticated privileges remain absent.
9. Do not show, print or log actual production referral codes. A safe read-only verification can query counts, distinctness and null count, not the code values.
10. Do not create a new business or alter production referral counts. Full end-to-end attribution requires isolated staging and two controlled test business identities.

## C. Completed recent work already in main

### Team invitations
- PR #171 implemented secure invitations and was merged before #172.
- Team invitations use a separate invitation record and opaque high-entropy token hash; the link alone is not sufficient—invitee must authenticate with the target Gambian phone.
- Invite permission is manager or staff; owner/admin cannot be granted from an invite. Job title remains separate from Kaira access role.
- Create/resend/revoke/expire and one-time acceptance exist in code. Resend rotates the token; email uses configured Nodemailer when available; WhatsApp is manual share because no authorized WhatsApp Business sender is configured.
- PR #172 added KairaLogo, fixed PIN continuation so invitee’s invited phone takes priority over older remembered phone, synchronizes expired invite/roster state, restores on resend, and adds migration 0024 to permanently remove joined_at default.
- Migrations 0023/0024 are verified in production; team_invitation RLS and lack of direct generic privileges checked.
- Remaining: controlled acceptance tests (new OTP, existing PIN, correct/wrong phone, expiry, revoke, resend rotation, one-time acceptance, conflicting/existing business, cross-business denial), SMS/SMTP delivery test with controlled recipients and physical device visual testing.

### Mobile layout
- PR #173 removed duplicate header menu, made header compact, welcome section and dashboard quick actions wrap, calculator metrics stack on narrow view, large values and discount/tax controls wrap.
- PR #173 is live across API, frontend and admin Render services.
- Actual physical viewport screenshots / interactions at 320, 360, 390, 430, tablet and desktop remain NOT VERIFIED.
- Old mobile PR #169 and #170 were closed as superseded.

### Currency, inventory and PWA
- CurrencyPicker uses built-in SVG flags for GMD, NGN, USD, EUR and GBP.
- Inventory private bucket inventory-images is JPEG-only, max 204800 bytes. Current production inventory product count and image object count were both zero at last check; don't claim real authenticated photo flow tested.
- PWA has service worker, manifest and install prompt. Mobile prompt appears near bottom above nav; desktop prompt is at right edge only when browser supports beforeinstallprompt. Test Android Chrome, iOS Safari Add to Home Screen, desktop supported browsers, dismissal/standalone detection and service worker on real devices.
- Returning-user PIN is memory-only, not stored. Carrier consistency was rechecked in current main: both PinLoginPage and PhoneAuthPage list Africell, QCell, Comium and Gamtel; Gamtel uses its seven-digit format without a network prefix. The earlier Gamcel label mismatch is already resolved. Preserve this list and do not change live PIN data.

## D. Full outstanding product scope — preserve and work through it

### Core business features
- Dashboard: verify KPIs, currencies, periods, empty/error states and all links.
- Team/permissions: verify owner/admin/manager/staff roles, team CRUD, business isolation and secure invitation acceptance.
- Customers/CRM: complete real authenticated CRUD/search, optional DOB/marital status where appropriate, notes/followups/responses, camera/upload/remove customer photo, editing, export/print and tenant isolation.
- Transactions: test real creation/status/payment/currency/reference and report correctness.
- Daily Ledger/Sales/Expenses/Debts: GMD/NGN/USD separated per currency; linked sale atomically records ledger entry, decreases inventory and writes movement; same-currency debt payment only; test overpayment/exact payoff/insufficient stock/currency mismatch/date boundaries/print/CSV.
- Inventory: product/photo upload/camera, compression max 200 KB JPEG, private signed URL, replace/reload/remove, currency flags, product photo printing.
- Investments: business type selection (online/offline/Other custom), amounts/expected amount, costs/profit plan, daily sales/analysis, CRUD/date/currency, print/CSV.
- Savings: goal vs unassigned pools, per currency separation, source/location, withdrawal rules, progress, print/PDF, concurrency and persistence.
- Receipt branding: real private logo upload/reload/print; verify actual PDF/print with authenticated user.
- Billing: currently not a verified subscription/payment system; no fake paywall/countdowns. Need real plan catalogue/payment state before entitlements.

### Work Management / remote work
- Tasks: personal and team-assigned, status, priority, deadlines, history, in-app notification and push.
- Projects: real task linking, goals/dates/status.
- Meetings/Minutes: agenda, attendees, minutes, decisions/action items and export/print; manual transcription first; AI transcription remains unimplemented until actual consent/privacy/audio/provider/retention pipeline exists.
- Calendar: tasks and meetings, IANA business timezone selection, Banjul/Lagos/London/New York/DST tests; standalone and recurring events/external calendar sync remain planned.
- Notes & Documents: written note search/category/pin/edit/delete/print exists in code; file attachments are not implemented.
- Reminders: in-app reminders and email outbox exist in code; real SMTP not verified and PWA web push/VAPID subscriptions remain not implemented.
- Time tracking: start/stop task-linked sessions exists in code; authenticated tests pending; online/away/offline presence, heartbeat/idle, manager reports, timesheet approvals/edit/export remain planned. No covert keystroke/screen monitoring.
- Team Chat & Announcements: business-scoped chat/pagination exists in code; replies/moderation/tenant isolation tests remain.
- Proposals & Quotations: not implemented; line items, tax/currency/discount, statuses, PDF/print, safe conversion.
- Freelancer & Remote Work Copilot (formerly Visual Assistant): text-only draft helper, no database persistence/no automatic write; desired client briefs → proposal/milestones/tasks/estimates/progress updates and safe confirm-before-write flow.
- Automation: no real trigger/action model; plan auditable triggers, permissions, retries and user approval, no fake switches.

### AI / account / branding / support
- AI Reports/Insights: audit rule-based/model-generated, OPENAI configuration and privacy, source provenance.
- AI meeting transcription: unimplemented.
- Tutorials: verify searchable written lessons against actual UI and route links; never fabricate video links.
- Appearance: verify light/dark/system persistence, OS mode, contrast.
- Profile: avatar/photo/remove/default, privacy and print.
- Paid plan/white-label: define Starter/Pro/Max subscription state, verified payment, grace/expiry/usage limits, custom-brand entitlements and automatic fallback to Kaira Africa branding after entitlement expiry. Keep branding consistent in print/email/push/in-app.
- PWA install and responsive nav/device testing.
- Legal/privacy pages and clear capability disclosures.

## E. Engineering rules

- Senior software/database/security/QA/release discipline; repository is source of truth.
- Branch-first; PR and both required CI workflows green before merge; confirm PR expected head SHA and deployment SHA.
- No reset --hard, clean -fd, force-push, branch/repository delete or destructive blind operations.
- Never claim deploy success from merge alone; verify Render service deploy status and exact SHA plus migration logs/DB checks.
- No fake production business/user/team/customer/financial/inventory/invitation test records. Use isolated staging and consenting test identities.
- No production PIN mutation; no secrets, tokens, PII or real referral codes in logs or handovers.
- Keep Supabase RLS/least privilege; never grant anon/authenticated business table privileges to make feature work.
- CI, deployment, authenticated E2E and physical device visual QA are separate statuses.
- Update ENGINEERING_SOURCE_OF_TRUTH.md, FEATURE_AUDIT.md and this continuation file on major changes.

## F. Next chat prompt

You are continuing the development, production verification, security and QA of Kaira Africa, maintained by Royal FinTech Company. Act as senior full-stack engineer, database engineer, security engineer, QA engineer and release engineer. Do not start over and do not ask the user to repeat known project details.

First read:
1. docs/engineering/2026-11-03-KAIRA-AFRICA-CONTINUATION-HANDOVER.md
2. docs/engineering/ENGINEERING_SOURCE_OF_TRUTH.md
3. docs/engineering/FEATURE_AUDIT.md

Then verify current GitHub main, open PRs, exact Render deployments and Supabase migration/security state through the connected tools.

Repo: RoyalFinTech/Kaira-Africa.
Production frontend: https://kaira-africa-frontend.onrender.com/
Production API: https://kaira-africa-api.onrender.com/
Render workspace: tea-d9usq87lk1mc73eia2f0.
Supabase project ref: gofoibbvxnhqzqwrpcbx.
Main baseline at the time of handover: 07c7f63a3b9e1df1c01d38da2487d6a07b784aaa.
Referral PR #174: feat/business-referral-links, current expected head f5d9563b0cb9ec9b5ab7012d8487b74a8dd1854d; recheck before acting.

Start by finishing PR #174:
- poll its latest Work Management Build Checks and Backend CI and ensure both pass on the exact current head;
- inspect the focused PR diff, schema, migration, business creation repository, API roles and onboarding flow;
- merge only when both workflows pass and PR head is unchanged;
- verify all three Render services deploy the new main SHA and API logs show migration success;
- verify Drizzle migration 0025 recorded, expected ledger 26/max ID 26, backfilled unique codes, indexes/FK, RLS and no generic anon/authenticated grants;
- do not expose codes or create production test businesses.

Then proceed through the complete remaining feature roadmap in this handover and FEATURE_AUDIT.md, closing the highest-priority correctness/security/financial/mobile gaps. Preserve the clear separation between team invitations and business referrals; no referral bonuses, payouts or paid feature unlocks are active. Do not treat untested pages as complete.

Use branch-first PRs, green CI and exact deploy verification. Avoid destructive Git operations, avoid production test data, never alter existing PINs, and keep the engineering handover and audit current. Be honest about anything that cannot be physically or interactively tested.

End of prompt.

### Direct static route correction (2026-11-03)

The static-site build uses an explicit SPA entry list; adding a Wouter route alone is not sufficient for a reliable direct URL or page refresh. Commit 4a9172820054f63342907cce2dd394d6d29cb082 adds referrals to artifacts/kaira-africa/scripts/generate-spa-routes.mjs. Verify the next frontend build log reports one additional SPA route entry and test /referrals refresh after deployment. This commit supersedes all earlier PR #174 CI runs.
